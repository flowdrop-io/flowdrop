/**
 * Unit Tests - FormAutocomplete Component
 *
 * Tests for the autocomplete form field component that fetches suggestions
 * from a callback URL.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AutocompleteConfig } from '$lib/types/index.js';
import type { FieldOption } from '$lib/components/form/types.js';
import { buildFetchHeaders } from '$lib/utils/fetchWithAuth.js';
import { StaticAuthProvider, CallbackAuthProvider, NoAuthProvider } from '$lib/types/auth.js';

/**
 * Helper function to map API response to FieldOption array
 * This is extracted from the component for testing purposes
 * @param data - Response data from API
 * @param labelField - Field name for display label
 * @param valueField - Field name for stored value
 * @returns Array of FieldOption objects
 */
function mapResponse(
	data: unknown,
	labelField: string = 'label',
	valueField: string = 'value'
): FieldOption[] {
	if (!Array.isArray(data)) {
		console.warn('[FormAutocomplete] Response is not an array:', data);
		return [];
	}

	return data.map((item: Record<string, unknown>) => ({
		label: String(item[labelField] ?? item[valueField] ?? ''),
		value: String(item[valueField] ?? '')
	}));
}

/**
 * Helper function to build the URL for fetching suggestions
 * @param autocomplete - Autocomplete configuration
 * @param baseUrl - Base URL for relative paths
 * @param query - Search query
 * @returns Full URL with query parameter
 */
function buildUrl(autocomplete: AutocompleteConfig, baseUrl: string, query: string): string {
	const queryParam = autocomplete.queryParam ?? 'q';
	const url = autocomplete.url.startsWith('http')
		? autocomplete.url
		: `${baseUrl}${autocomplete.url}`;

	const separator = url.includes('?') ? '&' : '?';
	return `${url}${separator}${encodeURIComponent(queryParam)}=${encodeURIComponent(query)}`;
}

describe('FormAutocomplete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('mapResponse', () => {
		it('should map array of objects with default fields', () => {
			const data = [
				{ label: 'Option 1', value: 'opt1' },
				{ label: 'Option 2', value: 'opt2' }
			];

			const result = mapResponse(data);

			expect(result).toEqual([
				{ label: 'Option 1', value: 'opt1' },
				{ label: 'Option 2', value: 'opt2' }
			]);
		});

		it('should map array with custom field names', () => {
			const data = [
				{ name: 'John Doe', id: 'user-1' },
				{ name: 'Jane Smith', id: 'user-2' }
			];

			const result = mapResponse(data, 'name', 'id');

			expect(result).toEqual([
				{ label: 'John Doe', value: 'user-1' },
				{ label: 'Jane Smith', value: 'user-2' }
			]);
		});

		it('should fallback to valueField when labelField is missing', () => {
			const data = [{ id: 'item-1' }, { id: 'item-2' }];

			const result = mapResponse(data, 'name', 'id');

			expect(result).toEqual([
				{ label: 'item-1', value: 'item-1' },
				{ label: 'item-2', value: 'item-2' }
			]);
		});

		it('should return empty array for non-array data', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = mapResponse({ key: 'value' });

			expect(result).toEqual([]);
			expect(consoleSpy).toHaveBeenCalledWith('[FormAutocomplete] Response is not an array:', {
				key: 'value'
			});
		});

		it('should return empty array for null data', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = mapResponse(null);

			expect(result).toEqual([]);
		});

		it('should handle empty array', () => {
			const result = mapResponse([]);

			expect(result).toEqual([]);
		});

		it('should convert non-string values to strings', () => {
			const data = [
				{ label: 123, value: 456 },
				{ label: true, value: false }
			];

			const result = mapResponse(data);

			expect(result).toEqual([
				{ label: '123', value: '456' },
				{ label: 'true', value: 'false' }
			]);
		});
	});

	describe('buildUrl', () => {
		it('should build URL with default query parameter', () => {
			const autocomplete: AutocompleteConfig = {
				url: '/api/users/search'
			};

			const result = buildUrl(autocomplete, 'https://api.example.com', 'john');

			expect(result).toBe('https://api.example.com/api/users/search?q=john');
		});

		it('should build URL with custom query parameter', () => {
			const autocomplete: AutocompleteConfig = {
				url: '/api/users/search',
				queryParam: 'query'
			};

			const result = buildUrl(autocomplete, 'https://api.example.com', 'john');

			expect(result).toBe('https://api.example.com/api/users/search?query=john');
		});

		it('should handle absolute URLs', () => {
			const autocomplete: AutocompleteConfig = {
				url: 'https://external.api.com/search'
			};

			const result = buildUrl(autocomplete, 'https://api.example.com', 'test');

			expect(result).toBe('https://external.api.com/search?q=test');
		});

		it('should append to existing query parameters', () => {
			const autocomplete: AutocompleteConfig = {
				url: '/api/search?limit=10'
			};

			const result = buildUrl(autocomplete, 'https://api.example.com', 'test');

			expect(result).toBe('https://api.example.com/api/search?limit=10&q=test');
		});

		it('should encode query parameter names and values', () => {
			const autocomplete: AutocompleteConfig = {
				url: '/api/search',
				queryParam: 'search term'
			};

			const result = buildUrl(autocomplete, '', 'hello world');

			expect(result).toBe('/api/search?search%20term=hello%20world');
		});

		it('should handle empty base URL', () => {
			const autocomplete: AutocompleteConfig = {
				url: '/api/search'
			};

			const result = buildUrl(autocomplete, '', 'test');

			expect(result).toBe('/api/search?q=test');
		});

		it('should handle special characters in query', () => {
			const autocomplete: AutocompleteConfig = {
				url: '/api/search'
			};

			const result = buildUrl(autocomplete, '', 'test&foo=bar');

			expect(result).toBe('/api/search?q=test%26foo%3Dbar');
		});
	});

	describe('AutocompleteConfig defaults', () => {
		it('should define correct default values', () => {
			const config: AutocompleteConfig = {
				url: '/api/test'
			};

			// Verify that the interface allows minimal configuration
			expect(config.url).toBe('/api/test');
			expect(config.queryParam).toBeUndefined();
			expect(config.minChars).toBeUndefined();
			expect(config.debounceMs).toBeUndefined();
			expect(config.fetchOnFocus).toBeUndefined();
			expect(config.labelField).toBeUndefined();
			expect(config.valueField).toBeUndefined();
			expect(config.allowFreeText).toBeUndefined();
		});

		it('should allow full configuration', () => {
			const config: AutocompleteConfig = {
				url: '/api/test',
				queryParam: 'q',
				minChars: 2,
				debounceMs: 300,
				fetchOnFocus: true,
				labelField: 'name',
				valueField: 'id',
				allowFreeText: false
			};

			expect(config.queryParam).toBe('q');
			expect(config.minChars).toBe(2);
			expect(config.debounceMs).toBe(300);
			expect(config.fetchOnFocus).toBe(true);
			expect(config.labelField).toBe('name');
			expect(config.valueField).toBe('id');
			expect(config.allowFreeText).toBe(false);
		});
	});

	describe('Debouncing behavior', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should debounce multiple rapid calls', async () => {
			const mockFetch = vi.fn();
			let timer: ReturnType<typeof setTimeout> | null = null;

			// Simulate debounced fetch
			const debouncedFetch = (query: string, debounceMs: number): void => {
				if (timer) {
					clearTimeout(timer);
				}
				timer = setTimeout(() => {
					mockFetch(query);
				}, debounceMs);
			};

			// Make rapid calls
			debouncedFetch('a', 300);
			debouncedFetch('ab', 300);
			debouncedFetch('abc', 300);

			// Fast-forward less than debounce time
			vi.advanceTimersByTime(200);
			expect(mockFetch).not.toHaveBeenCalled();

			// Fast-forward past debounce time
			vi.advanceTimersByTime(150);
			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith('abc');
		});

		it('should cancel previous fetch on new input', async () => {
			const mockFetch = vi.fn();
			let timer: ReturnType<typeof setTimeout> | null = null;

			const debouncedFetch = (query: string, debounceMs: number): void => {
				if (timer) {
					clearTimeout(timer);
				}
				timer = setTimeout(() => {
					mockFetch(query);
				}, debounceMs);
			};

			// First call
			debouncedFetch('first', 300);
			vi.advanceTimersByTime(350);
			expect(mockFetch).toHaveBeenCalledWith('first');

			// Reset mock
			mockFetch.mockClear();

			// Rapid calls
			debouncedFetch('second', 300);
			vi.advanceTimersByTime(100);
			debouncedFetch('third', 300);
			vi.advanceTimersByTime(350);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith('third');
		});
	});

	describe('MinChars validation', () => {
		it('should determine if query meets minimum character requirement', () => {
			const shouldFetch = (query: string, minChars: number): boolean => {
				return query.length >= minChars || query.length === 0;
			};

			// minChars = 0 should always fetch
			expect(shouldFetch('', 0)).toBe(true);
			expect(shouldFetch('a', 0)).toBe(true);

			// minChars = 2 should only fetch when length >= 2 or empty
			expect(shouldFetch('', 2)).toBe(true);
			expect(shouldFetch('a', 2)).toBe(false);
			expect(shouldFetch('ab', 2)).toBe(true);
			expect(shouldFetch('abc', 2)).toBe(true);
		});
	});

	describe('Keyboard navigation helpers', () => {
		it('should calculate next highlighted index on ArrowDown', () => {
			const getNextIndex = (
				currentIndex: number,
				suggestionsLength: number,
				direction: 'down' | 'up'
			): number => {
				if (direction === 'down') {
					return Math.min(currentIndex + 1, suggestionsLength - 1);
				}
				return Math.max(currentIndex - 1, -1);
			};

			// ArrowDown from -1 (nothing highlighted) should go to 0
			expect(getNextIndex(-1, 5, 'down')).toBe(0);

			// ArrowDown from 0 should go to 1
			expect(getNextIndex(0, 5, 'down')).toBe(1);

			// ArrowDown at last item should stay at last item
			expect(getNextIndex(4, 5, 'down')).toBe(4);

			// ArrowUp from 0 should go to -1
			expect(getNextIndex(0, 5, 'up')).toBe(-1);

			// ArrowUp from -1 should stay at -1
			expect(getNextIndex(-1, 5, 'up')).toBe(-1);

			// ArrowUp from 3 should go to 2
			expect(getNextIndex(3, 5, 'up')).toBe(2);
		});

		it('should generate unique option IDs', () => {
			const getOptionId = (fieldId: string, index: number): string => {
				return `${fieldId}-option-${index}`;
			};

			expect(getOptionId('assignee', 0)).toBe('assignee-option-0');
			expect(getOptionId('assignee', 5)).toBe('assignee-option-5');
			expect(getOptionId('user-field', 10)).toBe('user-field-option-10');
		});
	});

	describe('Multiple selection support', () => {
		/**
		 * Helper to normalize value to array format
		 */
		function normalizeToArray(value: string | string[], multiple: boolean): string[] {
			if (multiple) {
				return Array.isArray(value) ? value : value ? [value] : [];
			}
			return value ? [String(value)] : [];
		}

		/**
		 * Helper to check if a value is selected
		 */
		function isSelected(selectedValues: string[], optionValue: string): boolean {
			return selectedValues.includes(optionValue);
		}

		/**
		 * Helper to add value to selection
		 */
		function addToSelection(currentValues: string[], newValue: string): string[] {
			if (currentValues.includes(newValue)) {
				return currentValues;
			}
			return [...currentValues, newValue];
		}

		/**
		 * Helper to remove value from selection
		 */
		function removeFromSelection(currentValues: string[], valueToRemove: string): string[] {
			return currentValues.filter((v) => v !== valueToRemove);
		}

		describe('normalizeToArray', () => {
			it('should return empty array for empty string in single mode', () => {
				expect(normalizeToArray('', false)).toEqual([]);
			});

			it('should return array with string value in single mode', () => {
				expect(normalizeToArray('user-1', false)).toEqual(['user-1']);
			});

			it('should return empty array for empty string in multiple mode', () => {
				expect(normalizeToArray('', true)).toEqual([]);
			});

			it('should return array with single string value in multiple mode', () => {
				expect(normalizeToArray('user-1', true)).toEqual(['user-1']);
			});

			it('should return array as-is in multiple mode', () => {
				expect(normalizeToArray(['user-1', 'user-2'], true)).toEqual(['user-1', 'user-2']);
			});

			it('should return empty array for empty array in multiple mode', () => {
				expect(normalizeToArray([], true)).toEqual([]);
			});
		});

		describe('isSelected', () => {
			it('should return true when value is in selected array', () => {
				const selected = ['user-1', 'user-2', 'user-3'];
				expect(isSelected(selected, 'user-2')).toBe(true);
			});

			it('should return false when value is not in selected array', () => {
				const selected = ['user-1', 'user-2'];
				expect(isSelected(selected, 'user-3')).toBe(false);
			});

			it('should return false for empty selection', () => {
				expect(isSelected([], 'user-1')).toBe(false);
			});
		});

		describe('addToSelection', () => {
			it('should add new value to selection', () => {
				const current = ['user-1', 'user-2'];
				const result = addToSelection(current, 'user-3');
				expect(result).toEqual(['user-1', 'user-2', 'user-3']);
			});

			it('should not add duplicate value', () => {
				const current = ['user-1', 'user-2'];
				const result = addToSelection(current, 'user-2');
				expect(result).toEqual(['user-1', 'user-2']);
			});

			it('should add to empty selection', () => {
				const result = addToSelection([], 'user-1');
				expect(result).toEqual(['user-1']);
			});
		});

		describe('removeFromSelection', () => {
			it('should remove value from selection', () => {
				const current = ['user-1', 'user-2', 'user-3'];
				const result = removeFromSelection(current, 'user-2');
				expect(result).toEqual(['user-1', 'user-3']);
			});

			it('should return same array if value not found', () => {
				const current = ['user-1', 'user-2'];
				const result = removeFromSelection(current, 'user-3');
				expect(result).toEqual(['user-1', 'user-2']);
			});

			it('should return empty array when removing last item', () => {
				const current = ['user-1'];
				const result = removeFromSelection(current, 'user-1');
				expect(result).toEqual([]);
			});
		});
	});

	describe('AutocompleteConfig multiple option', () => {
		it('should allow multiple option in configuration', () => {
			const config: AutocompleteConfig = {
				url: '/api/test',
				multiple: true
			};

			expect(config.multiple).toBe(true);
		});

		it('should default multiple to undefined (treated as false)', () => {
			const config: AutocompleteConfig = {
				url: '/api/test'
			};

			expect(config.multiple).toBeUndefined();
		});

		it('should allow full configuration with multiple', () => {
			const config: AutocompleteConfig = {
				url: '/api/users/search',
				queryParam: 'q',
				minChars: 2,
				debounceMs: 300,
				fetchOnFocus: true,
				labelField: 'name',
				valueField: 'id',
				allowFreeText: false,
				multiple: true
			};

			expect(config.url).toBe('/api/users/search');
			expect(config.multiple).toBe(true);
			expect(config.labelField).toBe('name');
			expect(config.valueField).toBe('id');
		});
	});

	describe('Label cache behavior', () => {
		/**
		 * Helper to get display label from cache or suggestions
		 */
		function getDisplayLabel(
			value: string,
			labelCache: Map<string, string>,
			suggestions: FieldOption[]
		): string {
			// Check cache first
			if (labelCache.has(value)) {
				return labelCache.get(value) ?? value;
			}
			// Check current suggestions
			const match = suggestions.find((s) => s.value === value);
			if (match) {
				return match.label;
			}
			// Return value as fallback
			return value;
		}

		it('should return label from cache if available', () => {
			const cache = new Map<string, string>();
			cache.set('user-1', 'John Doe');

			const result = getDisplayLabel('user-1', cache, []);
			expect(result).toBe('John Doe');
		});

		it('should return label from suggestions if not in cache', () => {
			const cache = new Map<string, string>();
			const suggestions: FieldOption[] = [{ value: 'user-1', label: 'John Doe' }];

			const result = getDisplayLabel('user-1', cache, suggestions);
			expect(result).toBe('John Doe');
		});

		it('should return value as fallback when not found', () => {
			const cache = new Map<string, string>();
			const result = getDisplayLabel('user-1', cache, []);
			expect(result).toBe('user-1');
		});

		it('should prefer cache over suggestions', () => {
			const cache = new Map<string, string>();
			cache.set('user-1', 'Cached Name');
			const suggestions: FieldOption[] = [{ value: 'user-1', label: 'Suggestion Name' }];

			const result = getDisplayLabel('user-1', cache, suggestions);
			expect(result).toBe('Cached Name');
		});
	});

	describe('buildFetchHeaders', () => {
		it('should return default headers when no auth provider is given', async () => {
			const headers = await buildFetchHeaders(undefined);

			expect(headers).toEqual({
				Accept: 'application/json',
				'Content-Type': 'application/json'
			});
		});

		it('should include bearer token from StaticAuthProvider', async () => {
			const provider = new StaticAuthProvider({
				type: 'bearer',
				token: 'my-secret-token'
			});

			const headers = await buildFetchHeaders(provider);

			expect(headers).toEqual({
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: 'Bearer my-secret-token'
			});
		});

		it('should include API key from StaticAuthProvider', async () => {
			const provider = new StaticAuthProvider({
				type: 'api_key',
				apiKey: 'my-api-key'
			});

			const headers = await buildFetchHeaders(provider);

			expect(headers).toEqual({
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'X-API-Key': 'my-api-key'
			});
		});

		it('should include custom headers from StaticAuthProvider', async () => {
			const provider = new StaticAuthProvider({
				type: 'custom',
				headers: {
					'X-Custom-Auth': 'custom-value',
					'X-Tenant-ID': 'tenant-123'
				}
			});

			const headers = await buildFetchHeaders(provider);

			expect(headers).toEqual({
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'X-Custom-Auth': 'custom-value',
				'X-Tenant-ID': 'tenant-123'
			});
		});

		it('should include bearer token from CallbackAuthProvider', async () => {
			const provider = new CallbackAuthProvider({
				getToken: async () => 'callback-token-456'
			});

			const headers = await buildFetchHeaders(provider);

			expect(headers).toEqual({
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: 'Bearer callback-token-456'
			});
		});

		it('should not add auth headers when CallbackAuthProvider returns null token', async () => {
			const provider = new CallbackAuthProvider({
				getToken: async () => null
			});

			const headers = await buildFetchHeaders(provider);

			expect(headers).toEqual({
				Accept: 'application/json',
				'Content-Type': 'application/json'
			});
		});

		it('should not add auth headers from NoAuthProvider', async () => {
			const provider = new NoAuthProvider();

			const headers = await buildFetchHeaders(provider);

			expect(headers).toEqual({
				Accept: 'application/json',
				'Content-Type': 'application/json'
			});
		});

		it('should not add auth headers when StaticAuthProvider has type none', async () => {
			const provider = new StaticAuthProvider({ type: 'none' });

			const headers = await buildFetchHeaders(provider);

			expect(headers).toEqual({
				Accept: 'application/json',
				'Content-Type': 'application/json'
			});
		});
	});
});
