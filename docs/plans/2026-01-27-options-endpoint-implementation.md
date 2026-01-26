# Options Endpoint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement REST endpoint support for dynamic field options, allowing select fields to fetch their options from an API at runtime.

**Architecture:** Field-level `optionsEndpoint` property on schema fields. New `optionsService.ts` handles fetching with caching. `ConfigForm.svelte` pre-fetches all options before rendering and merges them into the schema.

**Tech Stack:** TypeScript, Svelte 5 (runes), Vitest for testing

---

## Task 1: Add OptionsEndpoint Type

**Files:**
- Modify: `src/lib/types/index.ts` (after `DynamicSchemaEndpoint` interface, around line 260)

**Step 1: Add the OptionsEndpoint interface**

Add after the `DynamicSchemaEndpoint` interface (around line 260):

```typescript
/**
 * Options endpoint configuration for fetching select field options at runtime.
 * Used when field options need to be populated dynamically from a REST API.
 *
 * @example
 * ```typescript
 * const optionsEndpoint: OptionsEndpoint = {
 *   url: "/api/flowdrop/secrets",
 *   valuePath: "name",
 *   labelPath: "label",
 *   cacheTtl: 300000
 * };
 * ```
 */
export interface OptionsEndpoint {
	/**
	 * URL to fetch options from.
	 * Supports template variables: {nodeTypeId}, {instanceId}, {workflowId}
	 */
	url: string;

	/**
	 * HTTP method for the request.
	 * @default "GET"
	 */
	method?: HttpMethod;

	/**
	 * Custom headers to include in the request.
	 */
	headers?: Record<string, string>;

	/**
	 * Maps template variables to their source paths in node context.
	 * Keys are variable names, values are dot-notation paths.
	 */
	parameterMapping?: Record<string, string>;

	/**
	 * JSON path to extract the option value from each item.
	 * @default "value"
	 */
	valuePath?: string;

	/**
	 * JSON path to extract the option label from each item.
	 * @default "label"
	 */
	labelPath?: string;

	/**
	 * Cache TTL in milliseconds.
	 * @default 300000 (5 minutes)
	 */
	cacheTtl?: number;

	/**
	 * Request timeout in milliseconds.
	 * @default 10000
	 */
	timeout?: number;
}
```

**Step 2: Verify no TypeScript errors**

Run: `npm run check`
Expected: No errors related to OptionsEndpoint

**Step 3: Commit**

```bash
jj desc -m "feat(types): add OptionsEndpoint interface for dynamic field options"
```

---

## Task 2: Export OptionsEndpoint from Core

**Files:**
- Modify: `src/lib/core/index.ts` (around line 54, in the type exports)

**Step 1: Add OptionsEndpoint to exports**

Find this section (around line 52-58):

```typescript
	// Admin/Edit configuration types
	HttpMethod,
	DynamicSchemaEndpoint,
	ExternalEditLink,
	ConfigEditOptions,
```

Change to:

```typescript
	// Admin/Edit configuration types
	HttpMethod,
	DynamicSchemaEndpoint,
	ExternalEditLink,
	ConfigEditOptions,
	OptionsEndpoint,
```

**Step 2: Verify export works**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
jj desc -m "feat(core): export OptionsEndpoint type"
```

---

## Task 3: Extend FieldSchema with optionsEndpoint

**Files:**
- Modify: `src/lib/components/form/types.ts` (around line 215, in FieldSchema interface)

**Step 1: Add import for OptionsEndpoint**

At the top of the file, add:

```typescript
import type { OptionsEndpoint } from '$lib/types/index.js';
```

**Step 2: Add optionsEndpoint to FieldSchema**

Find the FieldSchema interface (starts around line 215). Add after the `[key: string]: unknown;` line (around line 257):

```typescript
	/**
	 * REST endpoint to fetch options dynamically at runtime.
	 * When specified, options are fetched from this endpoint and used
	 * instead of static `enum` or `options` values.
	 */
	optionsEndpoint?: OptionsEndpoint;
```

**Step 3: Verify no TypeScript errors**

Run: `npm run check`
Expected: No errors

**Step 4: Commit**

```bash
jj desc -m "feat(form): add optionsEndpoint property to FieldSchema"
```

---

## Task 4: Create Template Resolver Utility

**Files:**
- Create: `src/lib/utils/templateResolver.ts`
- Test: `tests/unit/utils/templateResolver.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/utils/templateResolver.test.ts`:

```typescript
/**
 * Unit Tests - Template Resolver Utility
 */

import { describe, it, expect } from 'vitest';
import {
	resolveVariablePath,
	resolveTemplate,
	buildNodeContext
} from '$lib/utils/templateResolver.js';
import { createTestNode } from '../../utils/index.js';

describe('templateResolver', () => {
	describe('resolveVariablePath', () => {
		it('should resolve top-level properties', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node', name: 'LLM' },
				config: {}
			};

			expect(resolveVariablePath(context, 'id')).toBe('node-123');
			expect(resolveVariablePath(context, 'type')).toBe('default');
		});

		it('should resolve nested properties with dot notation', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node', name: 'LLM Node' },
				config: { apiKey: 'secret-key' }
			};

			expect(resolveVariablePath(context, 'metadata.id')).toBe('llm-node');
			expect(resolveVariablePath(context, 'metadata.name')).toBe('LLM Node');
			expect(resolveVariablePath(context, 'config.apiKey')).toBe('secret-key');
		});

		it('should return undefined for non-existent paths', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node' },
				config: {}
			};

			expect(resolveVariablePath(context, 'nonexistent')).toBeUndefined();
			expect(resolveVariablePath(context, 'metadata.nonexistent')).toBeUndefined();
		});
	});

	describe('resolveTemplate', () => {
		it('should replace variables with mapped values', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node' },
				config: {}
			};
			const mapping = { nodeTypeId: 'metadata.id', instanceId: 'id' };

			const result = resolveTemplate(
				'/api/nodes/{nodeTypeId}/options/{instanceId}',
				mapping,
				context
			);

			expect(result).toBe('/api/nodes/llm-node/options/node-123');
		});

		it('should URL-encode values', () => {
			const context = {
				id: 'node with spaces',
				type: 'default',
				metadata: { id: 'special/chars' },
				config: {}
			};

			const result = resolveTemplate('/api/{id}', { id: 'id' }, context);

			expect(result).toBe('/api/node%20with%20spaces');
		});

		it('should resolve unmapped variables directly from context', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node' },
				config: {},
				workflowId: 'workflow-456'
			};

			const result = resolveTemplate('/api/{workflowId}/nodes', undefined, context);

			expect(result).toBe('/api/workflow-456/nodes');
		});
	});

	describe('buildNodeContext', () => {
		it('should build context from WorkflowNode', () => {
			const node = createTestNode({
				id: 'test-node-1',
				type: 'simple',
				data: {
					label: 'Test',
					config: { setting: 'value' },
					metadata: {
						id: 'test_node',
						name: 'Test Node',
						description: 'A test node',
						category: 'processing',
						version: '1.0.0',
						inputs: [],
						outputs: []
					}
				}
			});

			const context = buildNodeContext(node, 'workflow-123');

			expect(context.id).toBe('test-node-1');
			expect(context.type).toBe('simple');
			expect(context.metadata.id).toBe('test_node');
			expect(context.config.setting).toBe('value');
			expect(context.workflowId).toBe('workflow-123');
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/utils/templateResolver.test.ts`
Expected: FAIL - module not found

**Step 3: Create the templateResolver utility**

Create `src/lib/utils/templateResolver.ts`:

```typescript
/**
 * Template Resolver Utility
 *
 * Provides URL template resolution for dynamic endpoints.
 * Extracted from dynamicSchemaService for reuse across services.
 *
 * @module utils/templateResolver
 */

import type { WorkflowNode } from '../types/index.js';

/**
 * Context object containing all available data for resolving template variables
 */
export interface NodeContext {
	/** Node instance ID */
	id: string;
	/** Node type from xyflow */
	type: string;
	/** Node metadata (id, name, type, category, etc.) */
	metadata: WorkflowNode['data']['metadata'];
	/** Node configuration values */
	config: Record<string, unknown>;
	/** Node extensions */
	extensions?: WorkflowNode['data']['extensions'];
	/** Current workflow ID (if available) */
	workflowId?: string;
}

/**
 * Resolves a template variable path from the node context.
 * Supports dot-notation paths like "metadata.id", "config.apiKey", "id"
 *
 * @param context - The node context containing all available data
 * @param path - Dot-notation path to resolve (e.g., "metadata.id")
 * @returns The resolved value as a string, or undefined if not found
 */
export function resolveVariablePath(
	context: Record<string, unknown>,
	path: string
): string | undefined {
	const parts = path.split('.');
	let current: unknown = context;

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

	if (current === null || current === undefined) {
		return undefined;
	}
	return String(current);
}

/**
 * Replaces template variables in a URL or string with values from the node context.
 * Template variables use curly brace syntax: {variableName}
 *
 * @param template - The template string with variables
 * @param parameterMapping - Maps variable names to context paths
 * @param context - The node context containing all available data
 * @returns The resolved string with all variables replaced
 */
export function resolveTemplate(
	template: string,
	parameterMapping: Record<string, string> | undefined,
	context: NodeContext
): string {
	let resolved = template;

	// Replace each mapped variable
	if (parameterMapping) {
		for (const [variableName, contextPath] of Object.entries(parameterMapping)) {
			const value = resolveVariablePath(context, contextPath);
			if (value !== undefined) {
				const regex = new RegExp(`\\{${variableName}\\}`, 'g');
				resolved = resolved.replace(regex, encodeURIComponent(value));
			}
		}
	}

	// Also try to resolve any unmapped variables directly from context
	const remainingVariables = resolved.match(/\{([^}]+)\}/g);
	if (remainingVariables) {
		for (const variable of remainingVariables) {
			const variableName = variable.slice(1, -1);
			const value = resolveVariablePath(context, variableName);
			if (value !== undefined) {
				resolved = resolved.replace(variable, encodeURIComponent(value));
			}
		}
	}

	return resolved;
}

/**
 * Builds a NodeContext from a WorkflowNode.
 *
 * @param node - The workflow node
 * @param workflowId - Optional workflow ID
 * @returns The node context for template resolution
 */
export function buildNodeContext(node: WorkflowNode, workflowId?: string): NodeContext {
	return {
		id: node.id,
		type: node.type,
		metadata: node.data.metadata,
		config: node.data.config,
		extensions: node.data.extensions,
		workflowId
	};
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/utils/templateResolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
jj desc -m "feat(utils): add templateResolver utility for URL template resolution"
```

---

## Task 5: Create Options Service

**Files:**
- Create: `src/lib/services/optionsService.ts`
- Test: `tests/unit/services/optionsService.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/services/optionsService.test.ts`:

```typescript
/**
 * Unit Tests - Options Service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	fetchFieldOptions,
	fetchAllFieldOptions,
	hasFieldsWithOptionsEndpoint,
	mergeOptionsIntoSchema,
	clearOptionsCache
} from '$lib/services/optionsService.js';
import { createTestNode, mockFetchResponse, mockFetchError } from '../../utils/index.js';
import type { ConfigSchema, OptionsEndpoint } from '$lib/types/index.js';

describe('optionsService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearOptionsCache();
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('fetchFieldOptions', () => {
		it('should fetch and normalize options with default paths', async () => {
			const mockData = [
				{ value: 'opt1', label: 'Option 1' },
				{ value: 'opt2', label: 'Option 2' }
			];
			global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData)));

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			const result = await fetchFieldOptions(endpoint, node);

			expect(result.success).toBe(true);
			expect(result.options).toEqual([
				{ value: 'opt1', label: 'Option 1' },
				{ value: 'opt2', label: 'Option 2' }
			]);
		});

		it('should normalize options with custom valuePath and labelPath', async () => {
			const mockData = [
				{ name: 'KEY_1', description: 'First Key' },
				{ name: 'KEY_2', description: 'Second Key' }
			];
			global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData)));

			const endpoint: OptionsEndpoint = {
				url: '/api/secrets',
				valuePath: 'name',
				labelPath: 'description'
			};
			const node = createTestNode();

			const result = await fetchFieldOptions(endpoint, node);

			expect(result.success).toBe(true);
			expect(result.options).toEqual([
				{ value: 'KEY_1', label: 'First Key' },
				{ value: 'KEY_2', label: 'Second Key' }
			]);
		});

		it('should handle wrapped response format', async () => {
			const mockData = {
				options: [
					{ value: 'a', label: 'A' },
					{ value: 'b', label: 'B' }
				]
			};
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => mockData
				} as Response)
			);

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			const result = await fetchFieldOptions(endpoint, node);

			expect(result.success).toBe(true);
			expect(result.options).toHaveLength(2);
		});

		it('should return error on fetch failure', async () => {
			global.fetch = vi.fn(() => Promise.resolve(mockFetchError('Not found', 404)));

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			const result = await fetchFieldOptions(endpoint, node);

			expect(result.success).toBe(false);
			expect(result.error).toContain('404');
		});

		it('should cache results', async () => {
			const mockData = [{ value: 'cached', label: 'Cached' }];
			global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData)));

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			// First call
			await fetchFieldOptions(endpoint, node);
			// Second call
			const result = await fetchFieldOptions(endpoint, node);

			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(result.fromCache).toBe(true);
		});
	});

	describe('hasFieldsWithOptionsEndpoint', () => {
		it('should return true when schema has fields with optionsEndpoint', () => {
			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					field1: { type: 'string' },
					field2: { type: 'string', optionsEndpoint: { url: '/api/options' } }
				}
			};

			expect(hasFieldsWithOptionsEndpoint(schema)).toBe(true);
		});

		it('should return false when no fields have optionsEndpoint', () => {
			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					field1: { type: 'string' },
					field2: { type: 'string', enum: ['a', 'b'] }
				}
			};

			expect(hasFieldsWithOptionsEndpoint(schema)).toBe(false);
		});
	});

	describe('mergeOptionsIntoSchema', () => {
		it('should merge fetched options into schema fields', () => {
			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					api_key: {
						type: 'string',
						title: 'API Key',
						optionsEndpoint: { url: '/api/secrets' }
					},
					model: {
						type: 'string',
						enum: ['gpt-4', 'gpt-3.5']
					}
				}
			};

			const options = new Map([
				['api_key', [{ value: 'KEY_1', label: 'Key 1' }, { value: 'KEY_2', label: 'Key 2' }]]
			]);

			const result = mergeOptionsIntoSchema(schema, options);

			expect(result.properties?.api_key?.options).toEqual([
				{ value: 'KEY_1', label: 'Key 1' },
				{ value: 'KEY_2', label: 'Key 2' }
			]);
			// Original enum should be unchanged
			expect(result.properties?.model?.enum).toEqual(['gpt-4', 'gpt-3.5']);
		});
	});

	describe('fetchAllFieldOptions', () => {
		it('should fetch options for all fields in parallel', async () => {
			global.fetch = vi.fn((url: string) => {
				if (url.includes('secrets')) {
					return Promise.resolve(mockFetchResponse([{ value: 'secret1', label: 'Secret 1' }]));
				}
				if (url.includes('models')) {
					return Promise.resolve(mockFetchResponse([{ value: 'gpt-4', label: 'GPT-4' }]));
				}
				return Promise.resolve(mockFetchError('Not found', 404));
			});

			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					api_key: { type: 'string', optionsEndpoint: { url: '/api/secrets' } },
					model: { type: 'string', optionsEndpoint: { url: '/api/models' } }
				}
			};
			const node = createTestNode();

			const result = await fetchAllFieldOptions(schema, node);

			expect(result.options.get('api_key')).toEqual([{ value: 'secret1', label: 'Secret 1' }]);
			expect(result.options.get('model')).toEqual([{ value: 'gpt-4', label: 'GPT-4' }]);
			expect(result.errors.size).toBe(0);
		});

		it('should collect errors for failed fetches', async () => {
			global.fetch = vi.fn((url: string) => {
				if (url.includes('secrets')) {
					return Promise.resolve(mockFetchResponse([{ value: 'secret1', label: 'Secret 1' }]));
				}
				return Promise.resolve(mockFetchError('Server error', 500));
			});

			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					api_key: { type: 'string', optionsEndpoint: { url: '/api/secrets' } },
					model: { type: 'string', optionsEndpoint: { url: '/api/models' } }
				}
			};
			const node = createTestNode();

			const result = await fetchAllFieldOptions(schema, node);

			expect(result.options.get('api_key')).toBeDefined();
			expect(result.errors.get('model')).toContain('500');
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/services/optionsService.test.ts`
Expected: FAIL - module not found

**Step 3: Create the optionsService**

Create `src/lib/services/optionsService.ts`:

```typescript
/**
 * Options Service
 *
 * Handles fetching select field options from REST endpoints at runtime.
 * Provides caching, parallel fetching, and response normalization.
 *
 * @module services/optionsService
 */

import type { FieldOption } from '../components/form/types.js';
import type { OptionsEndpoint, ConfigSchema, WorkflowNode } from '../types/index.js';
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

	const newProperties: Record<string, unknown> = {};

	for (const [key, prop] of Object.entries(schema.properties)) {
		const options = fetchedOptions.get(key);
		if (options) {
			// Clone the property and add options
			newProperties[key] = {
				...(prop as object),
				options
			};
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/services/optionsService.test.ts`
Expected: PASS (or most tests pass - some may need adjustment based on actual response format)

**Step 5: Commit**

```bash
jj desc -m "feat(services): add optionsService for fetching dynamic field options"
```

---

## Task 6: Integrate Options Loading in ConfigForm

**Files:**
- Modify: `src/lib/components/ConfigForm.svelte`

**Step 1: Add imports**

At the top of the script section (around line 28), add:

```typescript
import {
	fetchAllFieldOptions,
	hasFieldsWithOptionsEndpoint,
	mergeOptionsIntoSchema
} from '$lib/services/optionsService.js';
import type { FieldOption } from '$lib/components/form/types.js';
```

**Step 2: Add state for options loading**

After the dynamic schema state (around line 74), add:

```typescript
/**
 * State for field options loading
 */
let optionsLoading = $state(false);
let optionsErrors = $state<Map<string, string>>(new Map());
let fetchedOptions = $state<Map<string, FieldOption[]>>(new Map());
```

**Step 3: Add the loadFieldOptions function**

After the `loadDynamicSchema` function (around line 190), add:

```typescript
/**
 * Load options for fields with optionsEndpoint
 */
async function loadFieldOptions(schema: ConfigSchema): Promise<void> {
	if (!node) return;

	optionsLoading = true;
	optionsErrors = new Map();

	try {
		const result = await fetchAllFieldOptions(schema, node, workflowId);
		fetchedOptions = result.options;
		optionsErrors = result.errors;
	} catch (err) {
		console.error('Failed to load field options:', err);
	} finally {
		optionsLoading = false;
	}
}
```

**Step 4: Add effect to trigger options loading**

After the dynamic schema effect (around line 230), add:

```typescript
/**
 * Load field options when schema is available
 */
$effect(() => {
	const schema = configSchema;
	if (schema && hasFieldsWithOptionsEndpoint(schema) && !optionsLoading) {
		loadFieldOptions(schema);
	}
});
```

**Step 5: Add enrichedSchema derived state**

After the `effectiveSchema` derived (if exists) or after `configSchema` derived, add:

```typescript
/**
 * Schema with fetched options merged in
 */
const enrichedSchema = $derived.by(() => {
	if (!configSchema) return configSchema;
	if (fetchedOptions.size === 0) return configSchema;
	return mergeOptionsIntoSchema(configSchema, fetchedOptions);
});
```

**Step 6: Update the SchemaForm to use enrichedSchema**

Find where `SchemaForm` is rendered (search for `<SchemaForm`). Change the schema prop from `configSchema` to `enrichedSchema`:

```svelte
<SchemaForm
	schema={enrichedSchema}
	...
/>
```

**Step 7: Add loading indicator for options**

Near the existing loading indicator (around line 384), add a condition for options loading:

```svelte
{#if dynamicSchemaLoading || optionsLoading}
	<div class="config-form__loading">
		<!-- existing loading UI -->
	</div>
{/if}
```

**Step 8: Verify no TypeScript errors**

Run: `npm run check`
Expected: No errors

**Step 9: Commit**

```bash
jj desc -m "feat(ConfigForm): integrate optionsService for dynamic field options"
```

---

## Task 7: Update dynamicSchemaService to use shared utils

**Files:**
- Modify: `src/lib/services/dynamicSchemaService.ts`

**Step 1: Add import for shared utils**

Replace the `NodeContext` interface and `resolveVariablePath`/`resolveTemplate` functions with imports:

At the top of the file, add:

```typescript
import { resolveTemplate, buildNodeContext, type NodeContext } from '../utils/templateResolver.js';
```

**Step 2: Remove duplicated code**

Remove the following from dynamicSchemaService.ts (they're now in templateResolver.ts):
- The `NodeContext` interface (lines ~21-34)
- The `resolveVariablePath` function (lines ~88-108)
- The `resolveTemplate` function (lines ~128-162)

**Step 3: Update function calls**

The `fetchDynamicSchema` function should already work since we're using the same function signatures. Update the context building to use `buildNodeContext`:

Replace:
```typescript
const context: NodeContext = {
	id: node.id,
	type: node.type,
	metadata: node.data.metadata,
	config: node.data.config,
	extensions: node.data.extensions,
	workflowId
};
```

With:
```typescript
const context = buildNodeContext(node, workflowId);
```

**Step 4: Verify tests still pass**

Run: `npm test`
Expected: All existing tests pass

**Step 5: Commit**

```bash
jj desc -m "refactor(dynamicSchemaService): use shared templateResolver utils"
```

---

## Task 8: Add OpenAPI Spec for optionsEndpoint

**Files:**
- Modify: `api/components/schemas/config.yaml`

**Step 1: Add OptionsEndpoint schema**

Add after the existing schema definitions:

```yaml
OptionsEndpoint:
  type: object
  description: Configuration for fetching select field options from a REST endpoint
  required:
    - url
  properties:
    url:
      type: string
      description: URL to fetch options from. Supports template variables {nodeTypeId}, {instanceId}, {workflowId}
      example: "/api/flowdrop/secrets"
    method:
      type: string
      enum: [GET, POST]
      default: GET
      description: HTTP method for the request
    headers:
      type: object
      additionalProperties:
        type: string
      description: Custom headers to include in the request
    parameterMapping:
      type: object
      additionalProperties:
        type: string
      description: Maps template variables to node context paths
    valuePath:
      type: string
      default: "value"
      description: JSON path to extract option value from each item
    labelPath:
      type: string
      default: "label"
      description: JSON path to extract option label from each item
    cacheTtl:
      type: integer
      default: 300000
      description: Cache TTL in milliseconds (default 5 minutes)
    timeout:
      type: integer
      default: 10000
      description: Request timeout in milliseconds
```

**Step 2: Update ConfigProperty to include optionsEndpoint**

Find the ConfigProperty schema and add:

```yaml
optionsEndpoint:
  $ref: '#/components/schemas/OptionsEndpoint'
```

**Step 3: Bundle the spec**

Run: `npm run api:bundle` (or the equivalent command)
Expected: bundled.yaml is updated

**Step 4: Commit**

```bash
jj desc -m "docs(api): add OptionsEndpoint to OpenAPI spec"
```

---

## Task 9: Final Integration Test

**Files:**
- Create: `tests/integration/optionsEndpoint.test.ts`

**Step 1: Write integration test**

Create `tests/integration/optionsEndpoint.test.ts`:

```typescript
/**
 * Integration Test - Options Endpoint Feature
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	fetchAllFieldOptions,
	mergeOptionsIntoSchema,
	clearOptionsCache
} from '$lib/services/optionsService.js';
import { createTestNode, mockFetchResponse } from '../utils/index.js';
import type { ConfigSchema } from '$lib/types/index.js';

describe('Options Endpoint Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearOptionsCache();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should fetch options and merge into schema for form rendering', async () => {
		// Mock API response
		global.fetch = vi.fn(() =>
			Promise.resolve(
				mockFetchResponse([
					{ name: 'OPENAI_KEY', label: 'OpenAI Production Key' },
					{ name: 'ANTHROPIC_KEY', label: 'Anthropic Claude Key' }
				])
			)
		);

		// Schema with optionsEndpoint
		const schema: ConfigSchema = {
			type: 'object',
			properties: {
				api_key: {
					type: 'string',
					title: 'API Key',
					optionsEndpoint: {
						url: '/api/secrets',
						valuePath: 'name',
						labelPath: 'label'
					}
				},
				temperature: {
					type: 'number',
					title: 'Temperature',
					minimum: 0,
					maximum: 2
				}
			}
		};

		const node = createTestNode();

		// Fetch options
		const result = await fetchAllFieldOptions(schema, node);
		expect(result.options.has('api_key')).toBe(true);
		expect(result.errors.size).toBe(0);

		// Merge into schema
		const enrichedSchema = mergeOptionsIntoSchema(schema, result.options);

		// Verify merged schema
		expect(enrichedSchema.properties?.api_key?.options).toEqual([
			{ value: 'OPENAI_KEY', label: 'OpenAI Production Key' },
			{ value: 'ANTHROPIC_KEY', label: 'Anthropic Claude Key' }
		]);

		// Non-options fields should be unchanged
		expect(enrichedSchema.properties?.temperature?.minimum).toBe(0);
	});

	it('should fall back gracefully on fetch error', async () => {
		global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

		const schema: ConfigSchema = {
			type: 'object',
			properties: {
				api_key: {
					type: 'string',
					title: 'API Key',
					enum: ['default-key'], // Static fallback
					optionsEndpoint: { url: '/api/secrets' }
				}
			}
		};

		const node = createTestNode();
		const result = await fetchAllFieldOptions(schema, node);

		// Should have error, no options
		expect(result.errors.has('api_key')).toBe(true);
		expect(result.options.has('api_key')).toBe(false);

		// Merge returns original schema when no options
		const enrichedSchema = mergeOptionsIntoSchema(schema, result.options);
		expect(enrichedSchema.properties?.api_key?.enum).toEqual(['default-key']);
	});
});
```

**Step 2: Run integration test**

Run: `npm test -- tests/integration/optionsEndpoint.test.ts`
Expected: PASS

**Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
jj desc -m "test: add integration tests for optionsEndpoint feature"
```

---

## Task 10: Final Verification and Squash

**Step 1: Run all checks**

```bash
npm run lint
npm run check
npm test
```

Expected: All pass

**Step 2: Update bookmark and squash commits**

```bash
jj log -r '::@'
jj squash --into <design-doc-commit> -m "feat: implement optionsEndpoint for dynamic field options (fixes #5)"
jj bookmark set feat/options-endpoint
```

**Step 3: Push to remote**

```bash
jj git push -b feat/options-endpoint
```

---

## Summary

This plan implements:

1. **Types**: `OptionsEndpoint` interface in `types/index.ts`
2. **Utilities**: `templateResolver.ts` for shared URL template resolution
3. **Service**: `optionsService.ts` for fetching, caching, and normalizing options
4. **Integration**: `ConfigForm.svelte` pre-fetches and merges options into schema
5. **Refactor**: `dynamicSchemaService.ts` uses shared utilities
6. **Docs**: OpenAPI spec updated with `OptionsEndpoint`
7. **Tests**: Unit and integration tests

Total estimated time: 2-3 hours
