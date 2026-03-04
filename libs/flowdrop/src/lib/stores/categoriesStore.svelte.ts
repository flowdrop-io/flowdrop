/**
 * Categories Store for FlowDrop (Svelte 5 Runes)
 *
 * Manages category definitions with merged defaults and API-provided overrides.
 * Exposes lookup helpers for icon, color, and label resolution.
 */

import type { CategoryDefinition, NodeCategory } from '../types/index.js';
import { DEFAULT_CATEGORIES } from '../config/defaultCategories.js';

/**
 * Internal reactive state holding the category definitions.
 * Initialized with defaults, updated when API data is fetched.
 */
let categoriesState = $state<CategoryDefinition[]>([...DEFAULT_CATEGORIES]);

/**
 * Derived lookup map: category name → CategoryDefinition
 */
let categoryMap = $derived(
	(() => {
		const map = new Map<string, CategoryDefinition>();
		for (const cat of categoriesState) {
			map.set(cat.name, cat);
		}
		return map;
	})()
);

/**
 * Get all category definitions, sorted by weight.
 */
export function getCategories(): CategoryDefinition[] {
	return [...categoriesState].sort((a, b) => (a.weight ?? 999) - (b.weight ?? 999));
}

/**
 * Initialize categories with API data, merging with defaults.
 * API categories override defaults by name; custom categories are appended.
 */
export function initializeCategories(apiCategories: CategoryDefinition[]): void {
	const defaultMap = new Map<string, CategoryDefinition>();
	for (const cat of DEFAULT_CATEGORIES) {
		defaultMap.set(cat.name, cat);
	}

	// API categories override defaults by name
	for (const cat of apiCategories) {
		defaultMap.set(cat.name, {
			...defaultMap.get(cat.name),
			...cat
		});
	}

	categoriesState = Array.from(defaultMap.values());
}

/**
 * Get the display label for a category.
 */
export function getCategoryLabel(category: NodeCategory): string {
	const def = categoryMap.get(category);
	if (def?.label) return def.label;

	// Auto-generate: capitalize each word
	return category
		.split(/[\s_-]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Get the icon for a category.
 */
export function getCategoryIcon(category: NodeCategory): string {
	return categoryMap.get(category)?.icon ?? 'mdi:folder';
}

/**
 * Get the color token for a category.
 */
export function getCategoryColor(category: NodeCategory): string {
	return categoryMap.get(category)?.color ?? 'var(--fd-node-slate)';
}

/**
 * Get the full category definition, or undefined if not found.
 */
export function getCategoryDefinition(category: NodeCategory): CategoryDefinition | undefined {
	return categoryMap.get(category);
}
