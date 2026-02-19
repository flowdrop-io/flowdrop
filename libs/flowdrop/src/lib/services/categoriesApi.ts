/**
 * Categories API Service
 * Handles fetching category definitions from the backend
 */

import type { CategoryDefinition } from '../types/index.js';
import type { EndpointConfig } from '../config/endpoints.js';
import { DEFAULT_CATEGORIES } from '../config/defaultCategories.js';
import { FlowDropApiClient } from '../api/client.js';

/**
 * Fetch category definitions from API
 */
export async function fetchCategories(
	endpointConfig: EndpointConfig
): Promise<CategoryDefinition[]> {
	try {
		const client = new FlowDropApiClient(endpointConfig.baseUrl);
		const categories = await client.getCategories();

		if (!categories || !Array.isArray(categories)) {
			console.warn('Invalid categories received from API, using default');
			return DEFAULT_CATEGORIES;
		}

		return categories;
	} catch (error) {
		console.error('Error fetching categories:', error);
		return DEFAULT_CATEGORIES;
	}
}

/**
 * Validate category definitions structure
 */
export function validateCategories(categories: CategoryDefinition[]): boolean {
	if (!categories || !Array.isArray(categories)) {
		return false;
	}

	for (const category of categories) {
		if (!category.name || typeof category.name !== 'string') {
			return false;
		}
		if (!category.label || typeof category.label !== 'string') {
			return false;
		}
	}

	return true;
}
