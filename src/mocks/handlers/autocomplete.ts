/**
 * MSW handlers for Autocomplete API endpoints
 *
 * Provides mock endpoints for testing autocomplete form fields with various
 * data types: users, tags, categories, products, and locations.
 *
 * Endpoints:
 * - GET /api/flowdrop/autocomplete/users - Search users
 * - GET /api/flowdrop/autocomplete/tags - Search tags
 * - GET /api/flowdrop/autocomplete/categories - Search categories
 * - GET /api/flowdrop/autocomplete/products - Search products
 * - GET /api/flowdrop/autocomplete/locations - Search locations
 */

import { http, HttpResponse, delay } from 'msw';
import {
	searchUsers,
	searchTags,
	searchCategories,
	searchProducts,
	searchLocations,
	type MockUser,
	type MockTag,
	type MockCategory,
	type MockProduct,
	type MockLocation
} from '../data/autocomplete.js';

/** Base API path for flowdrop endpoints */
const API_BASE = '/api/flowdrop';

/** Simulated network delay range in ms */
const MIN_DELAY = 100;
const MAX_DELAY = 300;

/**
 * Get random delay between min and max
 */
function getRandomDelay(): number {
	return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

/**
 * Format users for autocomplete response
 * Uses 'name' as label and 'id' as value
 */
function formatUsersResponse(
	users: MockUser[]
): Array<{ label: string; value: string; email: string; department?: string }> {
	return users.map((user) => ({
		label: user.name,
		value: user.id,
		email: user.email,
		department: user.department
	}));
}

/**
 * Format tags for autocomplete response
 * Uses 'name' as label and 'id' as value
 */
function formatTagsResponse(
	tags: MockTag[]
): Array<{ label: string; value: string; color?: string; count?: number }> {
	return tags.map((tag) => ({
		label: tag.name,
		value: tag.id,
		color: tag.color,
		count: tag.count
	}));
}

/**
 * Format categories for autocomplete response
 * Uses 'label' as label and 'id' as value
 */
function formatCategoriesResponse(
	categories: MockCategory[]
): Array<{ label: string; value: string; description?: string }> {
	return categories.map((cat) => ({
		label: cat.label,
		value: cat.id,
		description: cat.description
	}));
}

/**
 * Format products for autocomplete response
 * Uses 'title' as label and 'sku' as value
 */
function formatProductsResponse(
	products: MockProduct[]
): Array<{ label: string; value: string; price: number; inStock?: boolean }> {
	return products.map((product) => ({
		label: product.title,
		value: product.sku,
		price: product.price,
		inStock: product.inStock
	}));
}

/**
 * Format locations for autocomplete response
 * Uses 'city, country' as label and 'code' as value
 */
function formatLocationsResponse(
	locations: MockLocation[]
): Array<{ label: string; value: string; timezone?: string }> {
	return locations.map((loc) => ({
		label: `${loc.city}, ${loc.country}`,
		value: loc.code,
		timezone: loc.timezone
	}));
}

/**
 * GET /api/flowdrop/autocomplete/users
 * Search users for autocomplete
 *
 * Query params:
 * - q: Search query (optional)
 * - limit: Max results (default: 10)
 *
 * Response format: Array of { label: string, value: string, email: string, department?: string }
 */
export const getUsersAutocompleteHandler = http.get(
	`${API_BASE}/autocomplete/users`,
	async ({ request }) => {
		await delay(getRandomDelay());

		const url = new URL(request.url);
		const query = url.searchParams.get('q') || '';
		const limit = parseInt(url.searchParams.get('limit') || '10');

		const users = searchUsers(query);
		const limitedUsers = users.slice(0, limit);

		return HttpResponse.json(formatUsersResponse(limitedUsers));
	}
);

/**
 * GET /api/flowdrop/autocomplete/tags
 * Search tags for autocomplete
 *
 * Query params:
 * - q: Search query (optional)
 * - limit: Max results (default: 10)
 *
 * Response format: Array of { label: string, value: string, color?: string, count?: number }
 */
export const getTagsAutocompleteHandler = http.get(
	`${API_BASE}/autocomplete/tags`,
	async ({ request }) => {
		await delay(getRandomDelay());

		const url = new URL(request.url);
		const query = url.searchParams.get('q') || '';
		const limit = parseInt(url.searchParams.get('limit') || '10');

		const tags = searchTags(query);
		const limitedTags = tags.slice(0, limit);

		return HttpResponse.json(formatTagsResponse(limitedTags));
	}
);

/**
 * GET /api/flowdrop/autocomplete/categories
 * Search categories for autocomplete
 *
 * Query params:
 * - q: Search query (optional)
 * - limit: Max results (default: 10)
 *
 * Response format: Array of { label: string, value: string, description?: string }
 */
export const getCategoriesAutocompleteHandler = http.get(
	`${API_BASE}/autocomplete/categories`,
	async ({ request }) => {
		await delay(getRandomDelay());

		const url = new URL(request.url);
		const query = url.searchParams.get('q') || '';
		const limit = parseInt(url.searchParams.get('limit') || '10');

		const categories = searchCategories(query);
		const limitedCategories = categories.slice(0, limit);

		return HttpResponse.json(formatCategoriesResponse(limitedCategories));
	}
);

/**
 * GET /api/flowdrop/autocomplete/products
 * Search products for autocomplete
 *
 * Query params:
 * - q: Search query (optional)
 * - limit: Max results (default: 10)
 *
 * Response format: Array of { label: string, value: string, price: number, inStock?: boolean }
 */
export const getProductsAutocompleteHandler = http.get(
	`${API_BASE}/autocomplete/products`,
	async ({ request }) => {
		await delay(getRandomDelay());

		const url = new URL(request.url);
		const query = url.searchParams.get('q') || '';
		const limit = parseInt(url.searchParams.get('limit') || '10');

		const products = searchProducts(query);
		const limitedProducts = products.slice(0, limit);

		return HttpResponse.json(formatProductsResponse(limitedProducts));
	}
);

/**
 * GET /api/flowdrop/autocomplete/locations
 * Search locations for autocomplete
 *
 * Query params:
 * - q: Search query (optional)
 * - limit: Max results (default: 10)
 *
 * Response format: Array of { label: string, value: string, timezone?: string }
 */
export const getLocationsAutocompleteHandler = http.get(
	`${API_BASE}/autocomplete/locations`,
	async ({ request }) => {
		await delay(getRandomDelay());

		const url = new URL(request.url);
		const query = url.searchParams.get('q') || '';
		const limit = parseInt(url.searchParams.get('limit') || '10');

		const locations = searchLocations(query);
		const limitedLocations = locations.slice(0, limit);

		return HttpResponse.json(formatLocationsResponse(limitedLocations));
	}
);

/**
 * Generic autocomplete handler for custom endpoints
 * Allows testing with different data formats
 *
 * GET /api/flowdrop/autocomplete/generic
 *
 * Query params:
 * - q: Search query
 * - type: Data type (users, tags, categories, products, locations)
 * - labelField: Field to use as label (optional)
 * - valueField: Field to use as value (optional)
 */
export const getGenericAutocompleteHandler = http.get(
	`${API_BASE}/autocomplete/generic`,
	async ({ request }) => {
		await delay(getRandomDelay());

		const url = new URL(request.url);
		const query = url.searchParams.get('q') || '';
		const type = url.searchParams.get('type') || 'users';
		const limit = parseInt(url.searchParams.get('limit') || '10');

		let results: Array<{ label: string; value: string }> = [];

		switch (type) {
			case 'users':
				results = formatUsersResponse(searchUsers(query).slice(0, limit));
				break;
			case 'tags':
				results = formatTagsResponse(searchTags(query).slice(0, limit));
				break;
			case 'categories':
				results = formatCategoriesResponse(searchCategories(query).slice(0, limit));
				break;
			case 'products':
				results = formatProductsResponse(searchProducts(query).slice(0, limit));
				break;
			case 'locations':
				results = formatLocationsResponse(searchLocations(query).slice(0, limit));
				break;
			default:
				results = formatUsersResponse(searchUsers(query).slice(0, limit));
		}

		return HttpResponse.json(results);
	}
);

/**
 * Error simulation handler for testing error states
 *
 * GET /api/flowdrop/autocomplete/error
 *
 * Always returns a 500 error
 */
export const getAutocompleteErrorHandler = http.get(`${API_BASE}/autocomplete/error`, async () => {
	await delay(getRandomDelay());

	return HttpResponse.json(
		{ error: 'Internal server error', message: 'Failed to fetch autocomplete suggestions' },
		{ status: 500 }
	);
});

/**
 * Slow response handler for testing loading states
 *
 * GET /api/flowdrop/autocomplete/slow
 *
 * Delays response by 2 seconds
 */
export const getAutocompleteSlowHandler = http.get(
	`${API_BASE}/autocomplete/slow`,
	async ({ request }) => {
		// Simulate slow network
		await delay(2000);

		const url = new URL(request.url);
		const query = url.searchParams.get('q') || '';

		const users = searchUsers(query).slice(0, 5);
		return HttpResponse.json(formatUsersResponse(users));
	}
);

/**
 * Export all autocomplete handlers
 */
export const autocompleteHandlers = [
	getUsersAutocompleteHandler,
	getTagsAutocompleteHandler,
	getCategoriesAutocompleteHandler,
	getProductsAutocompleteHandler,
	getLocationsAutocompleteHandler,
	getGenericAutocompleteHandler,
	getAutocompleteErrorHandler,
	getAutocompleteSlowHandler
];
