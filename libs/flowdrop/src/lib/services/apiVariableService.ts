/**
 * API Variable Service
 * Handles fetching template variable schemas from REST endpoints at runtime.
 * Enables dynamic variable suggestions from backend APIs for template editors.
 *
 * @module services/apiVariableService
 */

import type {
	VariableSchema,
	ApiVariablesEndpoint,
	ApiVariablesConfig,
	AuthProvider
} from '../types/index.js';
import { getEndpointConfig } from './api.js';
import { logger } from '../utils/logger.js';

/**
 * Context for variable API requests
 */
interface VariableContext {
	/** Workflow ID */
	workflowId?: string;
	/** Node instance ID */
	nodeId: string;
}

/**
 * Result of a variable schema fetch operation
 */
export interface ApiVariableResult {
	/** Whether the fetch was successful */
	success: boolean;
	/** The fetched variable schema (if successful) */
	schema?: VariableSchema;
	/** Error message (if failed) */
	error?: string;
	/** Whether the schema was loaded from cache */
	fromCache?: boolean;
}

/**
 * Cache entry for storing fetched variable schemas
 */
interface VariableCacheEntry {
	/** The cached variable schema */
	schema: VariableSchema;
	/** Timestamp when the schema was cached */
	cachedAt: number;
	/** Cache key used */
	cacheKey: string;
}

/**
 * Variable schema cache with TTL support
 * Key format: `variables:{workflowId}:{nodeId}`
 */
const variableCache = new Map<string, VariableCacheEntry>();

/**
 * Default cache TTL in milliseconds (5 minutes)
 */
export const DEFAULT_VARIABLE_CACHE_TTL = 5 * 60 * 1000;

/**
 * Replaces {workflowId} and {nodeId} placeholders in URL template.
 *
 * @param template - The URL template string
 * @param context - The variable context with workflowId and nodeId
 * @returns The resolved URL with placeholders replaced
 *
 * @example
 * ```typescript
 * const url = "/api/variables/{workflowId}/{nodeId}";
 * const context = { workflowId: "wf-123", nodeId: "node-456" };
 * resolveEndpointUrl(url, context);
 * // Returns "/api/variables/wf-123/node-456"
 * ```
 */
export function resolveEndpointUrl(template: string, context: VariableContext): string {
	let resolved = template;

	// Replace {workflowId}
	if (context.workflowId) {
		resolved = resolved.replace(/\{workflowId\}/g, encodeURIComponent(context.workflowId));
	}

	// Replace {nodeId}
	resolved = resolved.replace(/\{nodeId\}/g, encodeURIComponent(context.nodeId));

	return resolved;
}

/**
 * Generates a cache key for a variable schema based on the context.
 *
 * @param workflowId - The workflow ID (optional)
 * @param nodeId - The node instance ID
 * @returns A unique cache key string
 */
function generateVariableCacheKey(workflowId: string | undefined, nodeId: string): string {
	return `variables:${workflowId || 'unknown'}:${nodeId}`;
}

/**
 * Checks if a cached variable schema is still valid (not expired).
 *
 * @param entry - The cache entry to check
 * @param ttl - Time-to-live in milliseconds
 * @returns True if the cache entry is still valid
 */
function isCacheValid(
	entry: VariableCacheEntry,
	ttl: number = DEFAULT_VARIABLE_CACHE_TTL
): boolean {
	return Date.now() - entry.cachedAt < ttl;
}

/**
 * Resolves template variables in request body.
 * Recursively processes nested objects and arrays.
 *
 * @param body - The request body object
 * @param context - The variable context
 * @returns The body with template variables resolved
 */
function resolveBodyTemplates(
	body: Record<string, unknown>,
	context: VariableContext
): Record<string, unknown> {
	const resolved: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(body)) {
		if (typeof value === 'string') {
			// Resolve template variables in string values
			let resolvedValue = value;
			if (context.workflowId) {
				resolvedValue = resolvedValue.replace(
					/\{workflowId\}/g,
					encodeURIComponent(context.workflowId)
				);
			}
			resolvedValue = resolvedValue.replace(/\{nodeId\}/g, encodeURIComponent(context.nodeId));
			resolved[key] = resolvedValue;
		} else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			// Recursively resolve nested objects
			resolved[key] = resolveBodyTemplates(value as Record<string, unknown>, context);
		} else {
			// Pass through other values as-is
			resolved[key] = value;
		}
	}

	return resolved;
}

/**
 * Fetches variable schema from a backend API endpoint.
 *
 * @param workflowId - The workflow ID (optional)
 * @param nodeId - The node instance ID
 * @param config - The API variables configuration
 * @param authProvider - Optional auth provider for auth headers
 * @returns A promise that resolves to the variable schema result
 *
 * @example
 * ```typescript
 * const config: ApiVariablesConfig = {
 *   endpoint: {
 *     url: "/api/variables/{workflowId}/{nodeId}",
 *     method: "GET"
 *   },
 *   cacheTtl: 300000
 * };
 *
 * const result = await fetchVariableSchema("wf-123", "node-456", config);
 * if (result.success && result.schema) {
 *   // Use the fetched variable schema
 * }
 * ```
 */
export async function fetchVariableSchema(
	workflowId: string | undefined,
	nodeId: string,
	config: ApiVariablesConfig,
	authProvider?: AuthProvider
): Promise<ApiVariableResult> {
	const endpoint = config.endpoint;
	const context: VariableContext = { workflowId, nodeId };

	// Generate cache key
	const cacheKey = generateVariableCacheKey(workflowId, nodeId);

	// Check cache first (if caching is enabled)
	if (endpoint.cacheEnabled !== false) {
		const cached = variableCache.get(cacheKey);
		const ttl = config.cacheTtl ?? DEFAULT_VARIABLE_CACHE_TTL;
		if (cached && isCacheValid(cached, ttl)) {
			return {
				success: true,
				schema: cached.schema,
				fromCache: true
			};
		}
	}

	// Resolve the URL with template variables
	let url = resolveEndpointUrl(endpoint.url, context);

	// If URL is relative, prepend base URL from endpoint config
	if (url.startsWith('/')) {
		const currentConfig = getEndpointConfig();
		if (currentConfig?.baseUrl) {
			const baseUrl = currentConfig.baseUrl.replace(/\/$/, '');
			url = `${baseUrl}${url}`;
		}
	}

	// Prepare request options
	const method = endpoint.method ?? 'GET';
	const timeout = endpoint.timeout ?? 30000;

	const headers: Record<string, string> = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		...endpoint.headers
	};

	// Add auth headers from AuthProvider if available
	if (authProvider) {
		try {
			const authHeaders = await authProvider.getAuthHeaders();
			Object.assign(headers, authHeaders);
		} catch (error) {
			logger.warn('Failed to get auth headers:', error);
		}
	}

	// Add auth headers from endpoint config as fallback
	const currentConfig = getEndpointConfig();
	if (currentConfig?.auth) {
		if (currentConfig.auth.type === 'bearer' && currentConfig.auth.token) {
			headers['Authorization'] = headers['Authorization'] ?? `Bearer ${currentConfig.auth.token}`;
		} else if (currentConfig.auth.type === 'api_key' && currentConfig.auth.apiKey) {
			headers['X-API-Key'] = headers['X-API-Key'] ?? currentConfig.auth.apiKey;
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
		const resolvedBody = resolveBodyTemplates(endpoint.body, context);
		fetchOptions.body = JSON.stringify(resolvedBody);
	}

	try {
		const response = await fetch(url, fetchOptions);

		// Handle 404 as "no variables available"
		if (response.status === 404) {
			return {
				success: true,
				schema: { variables: {} },
				fromCache: false
			};
		}

		if (!response.ok) {
			// Handle authentication errors
			if (response.status === 401 || response.status === 403) {
				if (authProvider?.onUnauthorized) {
					const refreshed = await authProvider.onUnauthorized();
					if (refreshed) {
						// Retry with refreshed auth
						return fetchVariableSchema(workflowId, nodeId, config, authProvider);
					}
				}
				return {
					success: false,
					error: 'Authentication failed'
				};
			}

			const errorText = await response.text();
			return {
				success: false,
				error: `HTTP ${response.status}: ${errorText || response.statusText}`
			};
		}

		const data = await response.json();

		// The response could be:
		// 1. Direct VariableSchema: { variables: {...} }
		// 2. Wrapped in { data: { variables: {...} } }
		// 3. Wrapped in { schema: { variables: {...} } }
		// 4. Wrapped in { success: true, data: { variables: {...} } }
		let schema: VariableSchema | undefined;

		if (data.variables && typeof data.variables === 'object') {
			// Direct VariableSchema
			schema = data as VariableSchema;
		} else if (data.data?.variables && typeof data.data.variables === 'object') {
			// Wrapped in { data: ... }
			schema = data.data as VariableSchema;
		} else if (data.schema?.variables && typeof data.schema.variables === 'object') {
			// Wrapped in { schema: ... }
			schema = data.schema as VariableSchema;
		} else if (data.success && data.data?.variables) {
			// Wrapped in { success: true, data: ... }
			schema = data.data as VariableSchema;
		}

		if (!schema) {
			return {
				success: false,
				error: 'Invalid variable schema format received from endpoint'
			};
		}

		// Cache the schema (if caching is enabled)
		if (endpoint.cacheEnabled !== false) {
			variableCache.set(cacheKey, {
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
			error: 'Unknown error occurred while fetching variable schema'
		};
	}
}

/**
 * Clears the variable schema cache.
 * Can optionally clear only entries matching a specific pattern.
 *
 * @param pattern - Optional pattern to match cache keys (e.g., workflow ID or node ID)
 *
 * @example
 * ```typescript
 * // Clear all cache
 * clearVariableCache();
 *
 * // Clear cache for a specific workflow
 * clearVariableCache("wf-123");
 *
 * // Clear cache for a specific node
 * clearVariableCache("node-456");
 * ```
 */
export function clearVariableCache(pattern?: string): void {
	if (!pattern) {
		variableCache.clear();
		return;
	}

	// Clear matching entries
	for (const key of variableCache.keys()) {
		if (key.includes(pattern)) {
			variableCache.delete(key);
		}
	}
}

/**
 * Invalidates a specific variable cache entry.
 *
 * @param workflowId - The workflow ID (optional)
 * @param nodeId - The node instance ID
 */
export function invalidateVariableCache(workflowId: string | undefined, nodeId: string): void {
	const cacheKey = generateVariableCacheKey(workflowId, nodeId);
	variableCache.delete(cacheKey);
}

/**
 * Gets the current cache size (number of entries).
 *
 * @returns The number of cached variable schemas
 */
export function getVariableCacheSize(): number {
	return variableCache.size;
}

/**
 * Gets all cache keys currently stored.
 * Useful for debugging and monitoring.
 *
 * @returns Array of cache keys
 */
export function getVariableCacheKeys(): string[] {
	return Array.from(variableCache.keys());
}
