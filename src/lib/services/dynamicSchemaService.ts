/**
 * Dynamic Schema Service
 * Handles fetching configuration schemas from REST endpoints at runtime.
 * Used for nodes where the config schema cannot be determined at workflow load time.
 *
 * @module services/dynamicSchemaService
 */

import type {
	ConfigSchema,
	DynamicSchemaEndpoint,
	ExternalEditLink,
	ConfigEditOptions,
	WorkflowNode
} from '../types/index.js';
import { getEndpointConfig } from './api.js';
import { resolveTemplate, buildNodeContext, type NodeContext } from '../utils/templateResolver.js';

/**
 * Result of a dynamic schema fetch operation
 */
export interface DynamicSchemaResult {
	/** Whether the fetch was successful */
	success: boolean;
	/** The fetched config schema (if successful) */
	schema?: ConfigSchema;
	/** Error message (if failed) */
	error?: string;
	/** Whether the schema was loaded from cache */
	fromCache?: boolean;
}

/**
 * Cache entry for storing fetched schemas
 */
interface SchemaCacheEntry {
	/** The cached schema */
	schema: ConfigSchema;
	/** Timestamp when the schema was cached */
	cachedAt: number;
	/** Cache key used */
	cacheKey: string;
}

/**
 * Schema cache with TTL support
 * Key format: `{nodeTypeId}:{instanceId}` or `{nodeTypeId}` for type-level caching
 */
const schemaCache = new Map<string, SchemaCacheEntry>();

/**
 * Default cache TTL in milliseconds (5 minutes)
 */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Generates a cache key for a schema based on the node context and endpoint configuration.
 *
 * @param endpoint - The dynamic schema endpoint configuration
 * @param context - The node context
 * @returns A unique cache key string
 */
function generateCacheKey(endpoint: DynamicSchemaEndpoint, context: NodeContext): string {
	const url = resolveTemplate(endpoint.url, endpoint.parameterMapping, context);
	return `schema:${url}`;
}

/**
 * Checks if a cached schema is still valid (not expired).
 *
 * @param entry - The cache entry to check
 * @param ttl - Time-to-live in milliseconds
 * @returns True if the cache entry is still valid
 */
function isCacheValid(entry: SchemaCacheEntry, ttl: number = DEFAULT_CACHE_TTL): boolean {
	return Date.now() - entry.cachedAt < ttl;
}

/**
 * Fetches a dynamic configuration schema from a REST endpoint.
 *
 * @param endpoint - The dynamic schema endpoint configuration
 * @param node - The workflow node instance
 * @param workflowId - Optional workflow ID for context
 * @returns A promise that resolves to the schema result
 *
 * @example
 * ```typescript
 * const endpoint: DynamicSchemaEndpoint = {
 *   url: "/api/nodes/{nodeTypeId}/schema",
 *   method: "GET",
 *   parameterMapping: { nodeTypeId: "metadata.id" }
 * };
 *
 * const result = await fetchDynamicSchema(endpoint, node);
 * if (result.success && result.schema) {
 *   // Use the fetched schema
 * }
 * ```
 */
export async function fetchDynamicSchema(
	endpoint: DynamicSchemaEndpoint,
	node: WorkflowNode,
	workflowId?: string
): Promise<DynamicSchemaResult> {
	// Build the context from the node
	const context = buildNodeContext(node, workflowId);

	// Generate cache key
	const cacheKey = generateCacheKey(endpoint, context);

	// Check cache first (if caching is enabled)
	if (endpoint.cacheSchema !== false) {
		const cached = schemaCache.get(cacheKey);
		if (cached && isCacheValid(cached)) {
			return {
				success: true,
				schema: cached.schema,
				fromCache: true
			};
		}
	}

	// Resolve the URL with template variables
	let url = resolveTemplate(endpoint.url, endpoint.parameterMapping, context);

	// If URL is relative, try to prepend base URL from endpoint config
	if (url.startsWith('/')) {
		const currentConfig = getEndpointConfig();
		if (currentConfig?.baseUrl) {
			// Remove trailing slash from base URL and leading slash from relative URL
			const baseUrl = currentConfig.baseUrl.replace(/\/$/, '');
			url = `${baseUrl}${url}`;
		}
	}

	// Prepare request options
	const method = endpoint.method ?? 'GET';
	const timeout = endpoint.timeout ?? 10000;

	const headers: Record<string, string> = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		...endpoint.headers
	};

	// Add auth headers from endpoint config if available
	const currentConfig = getEndpointConfig();
	if (currentConfig?.auth) {
		if (currentConfig.auth.type === 'bearer' && currentConfig.auth.token) {
			headers['Authorization'] = `Bearer ${currentConfig.auth.token}`;
		} else if (currentConfig.auth.type === 'api_key' && currentConfig.auth.apiKey) {
			headers['X-API-Key'] = currentConfig.auth.apiKey;
		} else if (currentConfig.auth.type === 'custom' && currentConfig.auth.headers) {
			Object.assign(headers, currentConfig.auth.headers);
		}
	}

	// Prepare fetch options
	const fetchOptions: RequestInit = {
		method,
		headers,
		signal: AbortSignal.timeout(timeout)
	};

	// Add body for non-GET requests
	if (method !== 'GET' && endpoint.body) {
		// Resolve any template variables in the body
		const resolvedBody: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(endpoint.body)) {
			if (typeof value === 'string') {
				resolvedBody[key] = resolveTemplate(value, endpoint.parameterMapping, context);
			} else {
				resolvedBody[key] = value;
			}
		}
		fetchOptions.body = JSON.stringify(resolvedBody);
	}

	try {
		const response = await fetch(url, fetchOptions);

		if (!response.ok) {
			const errorText = await response.text();
			return {
				success: false,
				error: `HTTP ${response.status}: ${errorText || response.statusText}`
			};
		}

		const data = await response.json();

		// The response could be:
		// 1. Direct ConfigSchema object
		// 2. Wrapped in { data: ConfigSchema } or { schema: ConfigSchema }
		// 3. Wrapped in { success: true, data: ConfigSchema }
		let schema: ConfigSchema | undefined;

		if (data.type === 'object' && data.properties) {
			// Direct ConfigSchema
			schema = data as ConfigSchema;
		} else if (data.data?.type === 'object' && data.data?.properties) {
			// Wrapped in { data: ... }
			schema = data.data as ConfigSchema;
		} else if (data.schema?.type === 'object' && data.schema?.properties) {
			// Wrapped in { schema: ... }
			schema = data.schema as ConfigSchema;
		} else if (data.success && data.data?.type === 'object') {
			// Wrapped in { success: true, data: ... }
			schema = data.data as ConfigSchema;
		}

		if (!schema) {
			return {
				success: false,
				error: 'Invalid schema format received from endpoint'
			};
		}

		// Cache the schema (if caching is enabled)
		if (endpoint.cacheSchema !== false) {
			schemaCache.set(cacheKey, {
				schema,
				cachedAt: Date.now(),
				cacheKey
			});
		}

		return {
			success: true,
			schema,
			fromCache: false
		};
	} catch (error) {
		// Handle specific error types
		if (error instanceof Error) {
			if (error.name === 'AbortError' || error.name === 'TimeoutError') {
				return {
					success: false,
					error: `Request timed out after ${timeout}ms`
				};
			}
			return {
				success: false,
				error: error.message
			};
		}
		return {
			success: false,
			error: 'Unknown error occurred while fetching schema'
		};
	}
}

/**
 * Resolves an external edit link URL with template variables.
 *
 * @param link - The external edit link configuration
 * @param node - The workflow node instance
 * @param workflowId - Optional workflow ID for context
 * @param callbackUrl - Optional callback URL to append
 * @returns The resolved URL string
 *
 * @example
 * ```typescript
 * const link: ExternalEditLink = {
 *   url: "https://admin.example.com/nodes/{nodeTypeId}/edit/{instanceId}",
 *   parameterMapping: { nodeTypeId: "metadata.id", instanceId: "id" }
 * };
 *
 * const url = resolveExternalEditUrl(link, node, workflowId);
 * // Returns "https://admin.example.com/nodes/llm-node/edit/node-1"
 * ```
 */
export function resolveExternalEditUrl(
	link: ExternalEditLink,
	node: WorkflowNode,
	workflowId?: string,
	callbackUrl?: string
): string {
	// Build the context from the node
	const context = buildNodeContext(node, workflowId);

	// Resolve the URL with template variables
	let url = resolveTemplate(link.url, link.parameterMapping, context);

	// Append callback URL if configured
	if (callbackUrl && link.callbackUrlParam) {
		const separator = url.includes('?') ? '&' : '?';
		url = `${url}${separator}${link.callbackUrlParam}=${encodeURIComponent(callbackUrl)}`;
	}

	return url;
}

/**
 * Gets the effective config edit options for a node.
 * Merges node type defaults with instance-level overrides.
 *
 * @param node - The workflow node instance
 * @returns The merged config edit options, or undefined if not configured
 */
export function getEffectiveConfigEditOptions(node: WorkflowNode): ConfigEditOptions | undefined {
	const typeConfig = node.data.metadata?.configEdit;
	const instanceConfig = node.data.extensions?.configEdit as ConfigEditOptions | undefined;

	// If neither is defined, return undefined
	if (!typeConfig && !instanceConfig) {
		return undefined;
	}

	// If only one is defined, return it
	if (!typeConfig) {
		return instanceConfig;
	}
	if (!instanceConfig) {
		return typeConfig;
	}

	// Merge both configurations (instance overrides type)
	return {
		...typeConfig,
		...instanceConfig,
		// Deep merge external edit link
		externalEditLink:
			(instanceConfig.externalEditLink ?? typeConfig.externalEditLink)
				? {
						...typeConfig.externalEditLink,
						...instanceConfig.externalEditLink
					}
				: undefined,
		// Deep merge dynamic schema
		dynamicSchema:
			(instanceConfig.dynamicSchema ?? typeConfig.dynamicSchema)
				? {
						...typeConfig.dynamicSchema,
						...instanceConfig.dynamicSchema
					}
				: undefined
	};
}

/**
 * Clears the schema cache.
 * Can optionally clear only entries matching a specific pattern.
 *
 * @param pattern - Optional pattern to match cache keys (e.g., node type ID)
 */
export function clearSchemaCache(pattern?: string): void {
	if (!pattern) {
		schemaCache.clear();
		return;
	}

	// Clear matching entries
	for (const key of schemaCache.keys()) {
		if (key.includes(pattern)) {
			schemaCache.delete(key);
		}
	}
}

/**
 * Invalidates a specific schema cache entry for a node.
 *
 * @param node - The workflow node to invalidate cache for
 * @param endpoint - The dynamic schema endpoint configuration
 */
export function invalidateSchemaCache(node: WorkflowNode, endpoint: DynamicSchemaEndpoint): void {
	const context = buildNodeContext(node);
	const cacheKey = generateCacheKey(endpoint, context);
	schemaCache.delete(cacheKey);
}

/**
 * Checks if a node has config edit options configured.
 *
 * @param node - The workflow node to check
 * @returns True if the node has config edit options configured
 */
export function hasConfigEditOptions(node: WorkflowNode): boolean {
	return getEffectiveConfigEditOptions(node) !== undefined;
}

/**
 * Determines if external edit should be shown for a node.
 *
 * @param node - The workflow node to check
 * @returns True if external edit link should be shown
 */
export function shouldShowExternalEdit(node: WorkflowNode): boolean {
	const config = getEffectiveConfigEditOptions(node);
	if (!config) return false;

	// Show external edit if configured and not preferring dynamic schema
	if (config.externalEditLink) {
		if (config.dynamicSchema && config.preferDynamicSchema) {
			return false; // Prefer dynamic schema, so don't show external by default
		}
		return true;
	}

	return false;
}

/**
 * Determines if dynamic schema should be used for a node.
 *
 * @param node - The workflow node to check
 * @returns True if dynamic schema should be fetched
 */
export function shouldUseDynamicSchema(node: WorkflowNode): boolean {
	const config = getEffectiveConfigEditOptions(node);
	if (!config) return false;

	// Use dynamic schema if configured
	if (config.dynamicSchema) {
		return true;
	}

	return false;
}
