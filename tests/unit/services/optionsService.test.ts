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
import { createTestNode } from '../../utils/index.js';
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
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => mockData,
					text: async () => JSON.stringify(mockData)
				} as Response)
			);

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
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => mockData,
					text: async () => JSON.stringify(mockData)
				} as Response)
			);

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

		it('should handle wrapped response format with options key', async () => {
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
					json: async () => mockData,
					text: async () => JSON.stringify(mockData)
				} as Response)
			);

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			const result = await fetchFieldOptions(endpoint, node);

			expect(result.success).toBe(true);
			expect(result.options).toHaveLength(2);
			expect(result.options).toEqual([
				{ value: 'a', label: 'A' },
				{ value: 'b', label: 'B' }
			]);
		});

		it('should handle wrapped response format with data key', async () => {
			const mockData = {
				data: [
					{ value: 'x', label: 'X' },
					{ value: 'y', label: 'Y' }
				]
			};
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => mockData,
					text: async () => JSON.stringify(mockData)
				} as Response)
			);

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			const result = await fetchFieldOptions(endpoint, node);

			expect(result.success).toBe(true);
			expect(result.options).toHaveLength(2);
		});

		it('should return error on fetch failure', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					status: 404,
					statusText: 'Not Found',
					text: async () => 'Not found',
					json: async () => ({ error: 'Not found' })
				} as Response)
			);

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			const result = await fetchFieldOptions(endpoint, node);

			expect(result.success).toBe(false);
			expect(result.error).toContain('404');
		});

		it('should cache results', async () => {
			const mockData = [{ value: 'cached', label: 'Cached' }];
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => mockData,
					text: async () => JSON.stringify(mockData)
				} as Response)
			);

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			// First call
			await fetchFieldOptions(endpoint, node);
			// Second call
			const result = await fetchFieldOptions(endpoint, node);

			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(result.fromCache).toBe(true);
		});

		it('should use label as value when label is undefined', async () => {
			const mockData = [{ value: 'only-value' }];
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => mockData,
					text: async () => JSON.stringify(mockData)
				} as Response)
			);

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			const result = await fetchFieldOptions(endpoint, node);

			expect(result.success).toBe(true);
			expect(result.options).toEqual([{ value: 'only-value', label: 'only-value' }]);
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

		it('should return false when schema has no properties', () => {
			const schema: ConfigSchema = {
				type: 'object'
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
				[
					'api_key',
					[
						{ value: 'KEY_1', label: 'Key 1' },
						{ value: 'KEY_2', label: 'Key 2' }
					]
				]
			]);

			const result = mergeOptionsIntoSchema(schema, options);

			expect(result.properties?.api_key?.options).toEqual([
				{ value: 'KEY_1', label: 'Key 1' },
				{ value: 'KEY_2', label: 'Key 2' }
			]);
			// Original enum should be unchanged
			expect(result.properties?.model?.enum).toEqual(['gpt-4', 'gpt-3.5']);
		});

		it('should return original schema when no options to merge', () => {
			const schema: ConfigSchema = {
				type: 'object',
				properties: {
					field1: { type: 'string' }
				}
			};

			const options = new Map<string, { value: string; label: string }[]>();

			const result = mergeOptionsIntoSchema(schema, options);

			expect(result).toBe(schema);
		});

		it('should return original schema when no properties', () => {
			const schema: ConfigSchema = {
				type: 'object'
			};

			const options = new Map([['field1', [{ value: 'a', label: 'A' }]]]);

			const result = mergeOptionsIntoSchema(schema, options);

			expect(result).toBe(schema);
		});
	});

	describe('fetchAllFieldOptions', () => {
		it('should fetch options for all fields in parallel', async () => {
			global.fetch = vi.fn((url: string) => {
				if (url.includes('secrets')) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: async () => [{ value: 'secret1', label: 'Secret 1' }],
						text: async () => JSON.stringify([{ value: 'secret1', label: 'Secret 1' }])
					} as Response);
				}
				if (url.includes('models')) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: async () => [{ value: 'gpt-4', label: 'GPT-4' }],
						text: async () => JSON.stringify([{ value: 'gpt-4', label: 'GPT-4' }])
					} as Response);
				}
				return Promise.resolve({
					ok: false,
					status: 404,
					statusText: 'Not Found',
					text: async () => 'Not found'
				} as Response);
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
					return Promise.resolve({
						ok: true,
						status: 200,
						json: async () => [{ value: 'secret1', label: 'Secret 1' }],
						text: async () => JSON.stringify([{ value: 'secret1', label: 'Secret 1' }])
					} as Response);
				}
				return Promise.resolve({
					ok: false,
					status: 500,
					statusText: 'Server Error',
					text: async () => 'Server error'
				} as Response);
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

		it('should return empty maps when schema has no properties', async () => {
			const schema: ConfigSchema = {
				type: 'object'
			};
			const node = createTestNode();

			const result = await fetchAllFieldOptions(schema, node);

			expect(result.options.size).toBe(0);
			expect(result.errors.size).toBe(0);
		});
	});

	describe('clearOptionsCache', () => {
		it('should clear all cache when no pattern provided', async () => {
			const mockData = [{ value: 'test', label: 'Test' }];
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => mockData,
					text: async () => JSON.stringify(mockData)
				} as Response)
			);

			const endpoint: OptionsEndpoint = { url: '/api/options' };
			const node = createTestNode();

			// Populate cache
			await fetchFieldOptions(endpoint, node);
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Clear cache
			clearOptionsCache();

			// Should fetch again
			await fetchFieldOptions(endpoint, node);
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});
	});
});
