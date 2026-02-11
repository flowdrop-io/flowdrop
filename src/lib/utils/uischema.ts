/**
 * UISchema Utilities
 *
 * Functions for resolving JSON Pointer scope strings to property keys,
 * and for generating default UISchema from a ConfigSchema.
 */

import type { ConfigSchema } from '$lib/types/index.js';
import type {
	UISchemaElement,
	UISchemaControl,
	UISchemaVerticalLayout
} from '$lib/types/uischema.js';

/**
 * Resolve a JSON Pointer scope string to a property key.
 *
 * Supports the JSON Forms scope format: #/properties/<fieldName>
 *
 * @param scope - JSON Pointer string (e.g., "#/properties/temperature")
 * @returns The property key (e.g., "temperature"), or null if invalid
 *
 * @example
 * ```typescript
 * resolveScopeToKey("#/properties/temperature") // => "temperature"
 * resolveScopeToKey("#/properties/nested/deep")  // => null (only single-level supported)
 * resolveScopeToKey("invalid")                   // => null
 * ```
 */
export function resolveScopeToKey(scope: string): string | null {
	const prefix = '#/properties/';
	if (!scope.startsWith(prefix)) {
		return null;
	}
	const key = scope.slice(prefix.length);
	// Only support single-level property references (no nested paths)
	if (key.includes('/') || key.length === 0) {
		return null;
	}
	return key;
}

/**
 * Build a scope string from a property key.
 * Inverse of resolveScopeToKey.
 *
 * @param key - Property key (e.g., "temperature")
 * @returns JSON Pointer scope string (e.g., "#/properties/temperature")
 */
export function keyToScope(key: string): string {
	return `#/properties/${key}`;
}

/**
 * Generate a default UISchema from a ConfigSchema.
 * Creates a flat VerticalLayout with one Control per property,
 * preserving the property iteration order.
 *
 * This is a convenience utility for programmatically building UISchema.
 *
 * @param schema - The ConfigSchema to generate a UISchema from
 * @returns A VerticalLayout UISchema element
 */
export function generateDefaultUISchema(schema: ConfigSchema): UISchemaVerticalLayout {
	const elements: UISchemaControl[] = Object.keys(schema.properties).map((key) => ({
		type: 'Control' as const,
		scope: keyToScope(key)
	}));

	return {
		type: 'VerticalLayout',
		elements
	};
}

/**
 * Collect all property keys referenced by Controls in a UISchema tree.
 * Useful for detecting properties that are NOT in the UISchema
 * (e.g., to warn about unreferenced fields during development).
 *
 * @param element - Root UISchema element
 * @returns Set of property keys referenced by Controls
 */
export function collectReferencedKeys(element: UISchemaElement): Set<string> {
	const keys = new Set<string>();

	function walk(el: UISchemaElement): void {
		if (el.type === 'Control') {
			const key = resolveScopeToKey(el.scope);
			if (key) keys.add(key);
		} else if (el.type === 'VerticalLayout' || el.type === 'Group') {
			for (const child of el.elements) {
				walk(child);
			}
		}
	}

	walk(element);
	return keys;
}
