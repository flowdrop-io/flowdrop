/**
 * Options Service
 *
 * Handles fetching select field options from REST endpoints at runtime.
 * Provides caching, parallel fetching, and response normalization.
 *
 * @module services/optionsService
 */

import type { FieldOption } from '../components/form/types.js';
import type {
	OptionsEndpoint,
	ConfigSchema,
	ConfigProperty,
	WorkflowNode
} from '../types/index.js';
import { resolveTemplate, buildNodeContext } from '../utils/templateResolver.js';
import { getEndpointConfig } from './api.js';

/**
 * Result of fetching options for a single field
 */
export interface OptionsResult {
	/** Whether the fetch was successful */
	success: boolean;
	/** The fetched options (if successful) */
	options?: FieldOption[];
	/** Error message (if failed) */
	error?: string;
	/** Whether the result was loaded from cache */
	fromCache?: boolean;
}

/**
 * Result of fetching options for all fields
 */
export interface AllOptionsResult {
	/** Map of field key to fetched options */
	options: Map<string, FieldOption[]>;
	/** Map of field key to error message */
	errors: Map<string, string>;
}

/**
 * Cache entry for storing fetched options
 */
interface OptionsCacheEntry {
	options: FieldOption[];
	cachedAt: number;
	cacheKey: string;
}

/** Options cache with TTL support */
const optionsCache = new Map<string, OptionsCacheEntry>();

/** Default cache TTL: 5 minutes */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/** Default request timeout: 10 seconds */
const DEFAULT_TIMEOUT = 10000;

/**
 * Checks if a cached entry is still valid
 */
function isCacheValid(entry: OptionsCacheEntry, ttl: number): boolean {
	return Date.now() - entry.cachedAt < ttl;
}

/**
 * Generates a cache key based on resolved URL
 */
function generateCacheKey(resolvedUrl: string): string {
	return `options:${resolvedUrl}`;
}

/**
 * Extracts a value from an object using a path
 */
function extractValue(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split('.');
	let current: unknown = obj;

	for (const part of parts) {
		if (current === null || current === undefined) {
			return undefined;
		}
		if (typeof current === 'object' && part in current) {
			current = (current as Record<string, unknown>)[part];
		} else {
			return undefined;
		}
	}

	return current;
}

/**
 * Normalizes API response to FieldOption array
 */
function normalizeOptions(
	data: unknown,
	valuePath: string = 'value',
	labelPath: string = 'label'
): FieldOption[] {
	// Handle wrapped response: { options: [...] } or { data: [...] }
	let items: unknown[];
	if (Array.isArray(data)) {
		items = data;
	} else if (typeof data === 'object' && data !== null) {
		const obj = data as Record<string, unknown>;
		if (Array.isArray(obj.options)) {
			items = obj.options;
		} else if (Array.isArray(obj.data)) {
			items = obj.data;
		} else {
			return [];
		}
	} else {
		return [];
	}

	return items
		.map((item) => {
			if (typeof item !== 'object' || item === null) {
				return null;
			}
			const obj = item as Record<string, unknown>;
			const value = extractValue(obj, valuePath);
			const label = extractValue(obj, labelPath);

			if (value === undefined) {
				return null;
			}

			return {
				value: String(value),
				label: String(label ?? value)
			};
		})
		.filter((opt): opt is FieldOption => opt !== null);
}

/**
 * Fetches options for a single field from a REST endpoint.
 *
 * @param endpoint - The options endpoint configuration
 * @param node - The workflow node instance
 * @param workflowId - Optional workflow ID for context
 * @returns A promise that resolves to the options result
 */
export async function fetchFieldOptions(
	endpoint: OptionsEndpoint,
	node: WorkflowNode,
	workflowId?: string
): Promise<OptionsResult> {
	const context = buildNodeContext(node, workflowId);
	const cacheTtl = endpoint.cacheTtl ?? DEFAULT_CACHE_TTL;
	const timeout = endpoint.timeout ?? DEFAULT_TIMEOUT;

	// Resolve URL with template variables
	let url = resolveTemplate(endpoint.url, endpoint.parameterMapping, context);

	// Prepend base URL for relative URLs
	if (url.startsWith('/')) {
		const currentConfig = getEndpointConfig();
		if (currentConfig?.baseUrl) {
			const baseUrl = currentConfig.baseUrl.replace(/\/$/, '');
			url = `${baseUrl}${url}`;
		}
	}

	// Check cache
	const cacheKey = generateCacheKey(url);
	const cached = optionsCache.get(cacheKey);
	if (cached && isCacheValid(cached, cacheTtl)) {
		return {
			success: true,
			options: cached.options,
			fromCache: true
		};
	}

	// Prepare request
	const method = endpoint.method ?? 'GET';
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		...endpoint.headers
	};

	// Add auth headers from endpoint config
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

	const fetchOptions: RequestInit = {
		method,
		headers,
		signal: AbortSignal.timeout(timeout)
	};

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
		const options = normalizeOptions(data, endpoint.valuePath, endpoint.labelPath);

		// Cache the result
		optionsCache.set(cacheKey, {
			options,
			cachedAt: Date.now(),
			cacheKey
		});

		return {
			success: true,
			options,
			fromCache: false
		};
	} catch (error) {
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
			error: 'Unknown error occurred while fetching options'
		};
	}
}

/**
 * Checks if a schema has any fields with optionsEndpoint configured.
 *
 * @param schema - The config schema to check
 * @returns True if any field has optionsEndpoint
 */
export function hasFieldsWithOptionsEndpoint(schema: ConfigSchema): boolean {
	if (!schema.properties) {
		return false;
	}

	return Object.values(schema.properties).some(
		(prop) => typeof prop === 'object' && prop !== null && 'optionsEndpoint' in prop
	);
}

/**
 * Fetches options for all fields with optionsEndpoint in a schema.
 * Fetches are performed in parallel for efficiency.
 *
 * @param schema - The config schema
 * @param node - The workflow node instance
 * @param workflowId - Optional workflow ID for context
 * @returns A promise with options and errors maps
 */
export async function fetchAllFieldOptions(
	schema: ConfigSchema,
	node: WorkflowNode,
	workflowId?: string
): Promise<AllOptionsResult> {
	const options = new Map<string, FieldOption[]>();
	const errors = new Map<string, string>();

	if (!schema.properties) {
		return { options, errors };
	}

	// Collect all fields with optionsEndpoint
	const fieldsToFetch: Array<{ key: string; endpoint: OptionsEndpoint }> = [];
	for (const [key, prop] of Object.entries(schema.properties)) {
		if (typeof prop === 'object' && prop !== null && 'optionsEndpoint' in prop) {
			const endpoint = prop.optionsEndpoint as OptionsEndpoint;
			if (endpoint) {
				fieldsToFetch.push({ key, endpoint });
			}
		}
	}

	// Fetch all in parallel
	const results = await Promise.all(
		fieldsToFetch.map(async ({ key, endpoint }) => {
			const result = await fetchFieldOptions(endpoint, node, workflowId);
			return { key, result };
		})
	);

	// Collect results
	for (const { key, result } of results) {
		if (result.success && result.options) {
			options.set(key, result.options);
		} else if (result.error) {
			errors.set(key, result.error);
		}
	}

	return { options, errors };
}

/**
 * Merges fetched options into a schema, returning a new schema.
 * Options are added to the `options` property of each field.
 *
 * @param schema - The original config schema
 * @param fetchedOptions - Map of field key to options
 * @returns A new schema with options merged in
 */
export function mergeOptionsIntoSchema(
	schema: ConfigSchema,
	fetchedOptions: Map<string, FieldOption[]>
): ConfigSchema {
	if (!schema.properties || fetchedOptions.size === 0) {
		return schema;
	}

	const newProperties: Record<string, ConfigProperty> = {};

	for (const [key, prop] of Object.entries(schema.properties)) {
		const options = fetchedOptions.get(key);
		if (options) {
			// Clone the property and add options
			newProperties[key] = {
				...prop,
				options
			} as ConfigProperty;
		} else {
			newProperties[key] = prop;
		}
	}

	return {
		...schema,
		properties: newProperties
	};
}

/**
 * Clears the options cache.
 *
 * @param pattern - Optional pattern to match cache keys
 */
export function clearOptionsCache(pattern?: string): void {
	if (!pattern) {
		optionsCache.clear();
		return;
	}

	for (const key of optionsCache.keys()) {
		if (key.includes(pattern)) {
			optionsCache.delete(key);
		}
	}
}

/**
 * Invalidates cache for a specific URL pattern.
 *
 * @param urlPattern - URL pattern to invalidate
 */
export function invalidateOptionsCache(urlPattern: string): void {
	clearOptionsCache(urlPattern);
}
