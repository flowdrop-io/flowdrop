/**
 * Integration Tests - Options Endpoint Feature
 *
 * Tests the end-to-end flow of fetching field options from a REST endpoint
 * and merging them into a config schema for form rendering.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	fetchAllFieldOptions,
	mergeOptionsIntoSchema,
	clearOptionsCache,
	hasFieldsWithOptionsEndpoint
} from '$lib/services/optionsService.js';
import { createTestNode, mockFetchResponse, mockFetchError } from '../utils/index.js';
import type { ConfigSchema } from '$lib/types/index.js';

describe('Options Endpoint Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearOptionsCache();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Full workflow: fetch options and merge into schema', () => {
		it('should fetch options and merge into schema for form rendering', async () => {
			// Mock API response with custom value/label paths
			global.fetch = vi.fn(() =>
				Promise.resolve(
					mockFetchResponse([
						{ name: 'OPENAI_KEY', label: 'OpenAI Production Key' },
						{ name: 'ANTHROPIC_KEY', label: 'Anthropic Claude Key' }
					])
				)
			);

			// Schema with optionsEndpoint using custom paths
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

			// Verify schema has fields with optionsEndpoint
			expect(hasFieldsWithOptionsEndpoint(schema)).toBe(true);

			// Fetch options
			const result = await fetchAllFieldOptions(schema, node);

			// Verify options were fetched
			expect(result.options.has('api_key')).toBe(true);
			expect(result.errors.size).toBe(0);
			expect(result.options.get('api_key')).toEqual([
				{ value: 'OPENAI_KEY', label: 'OpenAI Production Key' },
				{ value: 'ANTHROPIC_KEY', label: 'Anthropic Claude Key' }
			]);

			// Merge into schema
			const enrichedSchema = mergeOptionsIntoSchema(schema, result.options);

			// Verify merged schema has options
			expect(enrichedSchema.properties?.api_key?.options).toEqual([
				{ value: 'OPENAI_KEY', label: 'OpenAI Production Key' },
				{ value: 'ANTHROPIC_KEY', label: 'Anthropic Claude Key' }
			]);

			// Verify non-options fields are unchanged
			expect(enrichedSchema.properties?.temperature?.minimum).toBe(0);
			expect(enrichedSchema.properties?.temperature?.maximum).toBe(2);
			expect(enrichedSchema.properties?.temperature?.options).toBeUndefined();
		});

		it('should handle multiple fields with optionsEndpoint in parallel', async () => {
			global.fetch = vi.fn((url: string) => {
				if ((url as string).includes('secrets')) {
					return Promise.resolve(
						mockFetchResponse([
							{ value: 'secret1', label: 'Secret 1' },
							{ value: 'secret2', label: 'Secret 2' }
						])
					);
				}
				if ((url as string).includes('models')) {
					return Promise.resolve(
						mockFetchResponse([
							{ value: 'gpt-4', label: 'GPT-4' },
							{ value: 'gpt-3.5', label: 'GPT-3.5 Turbo' }
						])
					);
				}
				return Promise.resolve(mockFetchError('Not found', 404));
			});

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
						title: 'Model',
						optionsEndpoint: { url: '/api/models' }
					},
					static_field: {
						type: 'string',
						title: 'Static Field',
						enum: ['a', 'b', 'c']
					}
				}
			};

			const node = createTestNode();
			const result = await fetchAllFieldOptions(schema, node);

			// Both fields should have options
			expect(result.options.has('api_key')).toBe(true);
			expect(result.options.has('model')).toBe(true);
			expect(result.errors.size).toBe(0);

			// Merge and verify
			const enrichedSchema = mergeOptionsIntoSchema(schema, result.options);

			expect(enrichedSchema.properties?.api_key?.options).toHaveLength(2);
			expect(enrichedSchema.properties?.model?.options).toHaveLength(2);
			// Static enum should be preserved
			expect(enrichedSchema.properties?.static_field?.enum).toEqual(['a', 'b', 'c']);
		});
	});

	describe('Error handling and fallback', () => {
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

			// Merge returns original schema when no options fetched
			const enrichedSchema = mergeOptionsIntoSchema(schema, result.options);
			// Original enum should be preserved as fallback
			expect(enrichedSchema.properties?.api_key?.enum).toEqual(['default-key']);
		});

		it('should handle partial failures gracefully', async () => {
			global.fetch = vi.fn((url: string) => {
				if ((url as string).includes('secrets')) {
					return Promise.resolve(mockFetchResponse([{ value: 'secret1', label: 'Secret 1' }]));
				}
				// Models endpoint fails
				return Promise.resolve(mockFetchError('Server error', 500));
			});

			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					api_key: {
						type: 'string',
						optionsEndpoint: { url: '/api/secrets' }
					},
					model: {
						type: 'string',
						optionsEndpoint: { url: '/api/models' }
					}
				}
			};

			const node = createTestNode();
			const result = await fetchAllFieldOptions(schema, node);

			// api_key succeeded, model failed
			expect(result.options.has('api_key')).toBe(true);
			expect(result.errors.has('model')).toBe(true);
			expect(result.errors.get('model')).toContain('500');

			// Merge should include successful options
			const enrichedSchema = mergeOptionsIntoSchema(schema, result.options);
			expect(enrichedSchema.properties?.api_key?.options).toBeDefined();
			expect(enrichedSchema.properties?.model?.options).toBeUndefined();
		});
	});

	describe('Schema without optionsEndpoint', () => {
		it('should skip fetching when no fields have optionsEndpoint', async () => {
			global.fetch = vi.fn();

			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					name: { type: 'string', title: 'Name' },
					count: { type: 'number', title: 'Count' },
					type: {
						type: 'string',
						title: 'Type',
						enum: ['a', 'b', 'c']
					}
				}
			};

			expect(hasFieldsWithOptionsEndpoint(schema)).toBe(false);

			const node = createTestNode();
			const result = await fetchAllFieldOptions(schema, node);

			// No fetches should occur
			expect(global.fetch).not.toHaveBeenCalled();
			expect(result.options.size).toBe(0);
			expect(result.errors.size).toBe(0);

			// Merge should return original schema unchanged
			const enrichedSchema = mergeOptionsIntoSchema(schema, result.options);
			expect(enrichedSchema).toEqual(schema);
		});
	});

	describe('Caching behavior', () => {
		it('should use cached options on subsequent calls', async () => {
			const mockData = [{ value: 'cached', label: 'Cached Option' }];
			global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData)));

			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					field: {
						type: 'string',
						optionsEndpoint: { url: '/api/options' }
					}
				}
			};

			const node = createTestNode();

			// First call
			await fetchAllFieldOptions(schema, node);
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Second call should use cache
			const result = await fetchAllFieldOptions(schema, node);
			expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1

			expect(result.options.get('field')).toEqual([{ value: 'cached', label: 'Cached Option' }]);
		});

		it('should refresh after cache is cleared', async () => {
			const mockData = [{ value: 'fresh', label: 'Fresh Option' }];
			global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData)));

			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					field: {
						type: 'string',
						optionsEndpoint: { url: '/api/options' }
					}
				}
			};

			const node = createTestNode();

			// First call
			await fetchAllFieldOptions(schema, node);
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Clear cache
			clearOptionsCache();

			// Second call should fetch again
			await fetchAllFieldOptions(schema, node);
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});
	});
});
