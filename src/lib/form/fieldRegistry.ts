/**
 * Form Field Component Registry
 *
 * Provides a registry system for form field components that enables:
 * - Tree-shaking: Heavy components (code editor, markdown) are only bundled when registered
 * - Dynamic field types: Users can add custom field renderers
 * - Lazy loading: Components can be registered at runtime
 *
 * @module form/fieldRegistry
 *
 * @example Basic usage with light fields only (no codemirror):
 * ```typescript
 * import { SchemaForm } from "@d34dman/flowdrop/form";
 * // Uses only basic fields - small bundle size
 * ```
 *
 * @example Adding code editor support:
 * ```typescript
 * import { SchemaForm, registerFieldComponent } from "@d34dman/flowdrop/form";
 * import { FormCodeEditor, codeEditorFieldMatcher } from "@d34dman/flowdrop/form/code";
 *
 * registerFieldComponent("code-editor", FormCodeEditor, codeEditorFieldMatcher);
 * ```
 */

import type { Component } from 'svelte';
import type { FieldSchema } from '../components/form/types.js';

/**
 * Base field component props that all registered field components should accept.
 * Components may have additional specific props.
 */
export interface FieldComponentProps {
	/** Field identifier */
	id: string;
	/** Current field value */
	value: unknown;
	/** Placeholder text */
	placeholder?: string;
	/** Whether field is required */
	required?: boolean;
	/** ARIA description ID */
	ariaDescribedBy?: string;
	/** Change callback */
	onChange: (value: unknown) => void;
	/** Additional schema-derived props */
	[key: string]: unknown;
}

/**
 * Function type for determining if a field schema should use a specific component
 */
export type FieldMatcher = (schema: FieldSchema) => boolean;

/**
 * Generic component type that accepts any props
 * This is needed because different field components have different prop requirements
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldComponent = Component<any, any, any>;

/**
 * Registration entry for a field component
 */
export interface FieldComponentRegistration {
	/** The Svelte component to render */
	component: FieldComponent;
	/** Function to determine if this component should handle a given schema */
	matcher: FieldMatcher;
	/** Priority for matching (higher = checked first) */
	priority: number;
}

/**
 * Field component registry
 * Stores registered field components with their matchers
 */
const fieldRegistry = new Map<string, FieldComponentRegistration>();

/**
 * Ordered list of field type keys by priority (highest first)
 * Cached and invalidated when registry changes
 */
let orderedKeys: string[] | null = null;

/**
 * Register a field component for a specific field type
 *
 * @param type - Unique identifier for this field type
 * @param component - Svelte component to render for matching fields
 * @param matcher - Function to determine if a schema matches this type
 * @param priority - Priority for matching (default: 0, higher = checked first)
 *
 * @example
 * ```typescript
 * registerFieldComponent(
 *   "code-editor",
 *   FormCodeEditor,
 *   (schema) => schema.format === "json" || schema.format === "code",
 *   100 // High priority to override default
 * );
 * ```
 */
export function registerFieldComponent(
	type: string,
	component: FieldComponent,
	matcher: FieldMatcher,
	priority: number = 0
): void {
	fieldRegistry.set(type, { component, matcher, priority });
	orderedKeys = null; // Invalidate cache
}

/**
 * Unregister a field component
 *
 * @param type - The field type to unregister
 * @returns true if the component was registered and removed
 */
export function unregisterFieldComponent(type: string): boolean {
	const removed = fieldRegistry.delete(type);
	if (removed) {
		orderedKeys = null; // Invalidate cache
	}
	return removed;
}

/**
 * Get all registered field types
 *
 * @returns Array of registered field type identifiers
 */
export function getRegisteredFieldTypes(): string[] {
	return Array.from(fieldRegistry.keys());
}

/**
 * Check if a field type is registered
 *
 * @param type - Field type to check
 * @returns true if the type is registered
 */
export function isFieldTypeRegistered(type: string): boolean {
	return fieldRegistry.has(type);
}

/**
 * Get ordered keys by priority (cached)
 */
function getOrderedKeys(): string[] {
	if (orderedKeys === null) {
		orderedKeys = Array.from(fieldRegistry.entries())
			.sort((a, b) => b[1].priority - a[1].priority)
			.map(([key]) => key);
	}
	return orderedKeys;
}

/**
 * Resolve which component should render a given field schema
 * Checks registered matchers in priority order
 *
 * @param schema - The field schema to resolve
 * @returns The matching registration or null if no match
 */
export function resolveFieldComponent(schema: FieldSchema): FieldComponentRegistration | null {
	const keys = getOrderedKeys();

	for (const key of keys) {
		const registration = fieldRegistry.get(key);
		if (registration && registration.matcher(schema)) {
			return registration;
		}
	}

	return null;
}

/**
 * Clear all registered field components
 * Useful for testing or reset scenarios
 */
export function clearFieldRegistry(): void {
	fieldRegistry.clear();
	orderedKeys = null;
}

/**
 * Get the registry size
 * @returns Number of registered field components
 */
export function getFieldRegistrySize(): number {
	return fieldRegistry.size;
}

// ============================================================================
// Built-in Field Matchers (for light fields)
// These are always available and used by the base FormField component
// ============================================================================

/**
 * Matcher for hidden fields (should not render)
 */
export const hiddenFieldMatcher: FieldMatcher = (schema) => schema.format === 'hidden';

/**
 * Matcher for checkbox group fields (enum with multiple)
 */
export const checkboxGroupMatcher: FieldMatcher = (schema) =>
	Boolean(schema.enum && schema.multiple);

/**
 * Matcher for enum select fields
 */
export const enumSelectMatcher: FieldMatcher = (schema) => Boolean(schema.enum && !schema.multiple);

/**
 * Matcher for multiline textarea fields
 */
export const textareaMatcher: FieldMatcher = (schema) =>
	schema.type === 'string' && schema.format === 'multiline';

/**
 * Matcher for range slider fields
 */
export const rangeMatcher: FieldMatcher = (schema) =>
	(schema.type === 'number' || schema.type === 'integer') && schema.format === 'range';

/**
 * Matcher for string text fields
 */
export const textFieldMatcher: FieldMatcher = (schema) =>
	schema.type === 'string' && !schema.format;

/**
 * Matcher for number fields
 */
export const numberFieldMatcher: FieldMatcher = (schema) =>
	(schema.type === 'number' || schema.type === 'integer') && schema.format !== 'range';

/**
 * Matcher for boolean toggle fields
 */
export const toggleMatcher: FieldMatcher = (schema) => schema.type === 'boolean';

/**
 * Matcher for select fields with labeled options
 * Supports both standard JSON Schema oneOf pattern and legacy options property
 *
 * Standard JSON Schema approach (preferred):
 * ```json
 * { "type": "string", "oneOf": [{ "const": "a", "title": "Option A" }] }
 * ```
 *
 * Legacy approach (deprecated):
 * ```json
 * { "type": "string", "options": [{ "value": "a", "label": "Option A" }] }
 * ```
 */
export const selectOptionsMatcher: FieldMatcher = (schema) =>
	Boolean(schema.oneOf && schema.oneOf.length > 0) || Boolean(schema.options);

/**
 * Matcher for array fields
 */
export const arrayMatcher: FieldMatcher = (schema) =>
	schema.type === 'array' && Boolean(schema.items);

/**
 * Matcher for autocomplete fields
 * Matches when format is "autocomplete" and autocomplete config with URL is provided
 */
export const autocompleteMatcher: FieldMatcher = (schema) =>
	schema.format === 'autocomplete' && Boolean(schema.autocomplete?.url);
