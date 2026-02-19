/**
 * Form Field Component Registry
 *
 * Provides a registry system for form field components that enables:
 * - Tree-shaking: Heavy components (code editor, markdown) are only bundled when registered
 * - Dynamic field types: Users can add custom field renderers
 * - Lazy loading: Components can be registered at runtime
 *
 * Extends BaseRegistry for shared mechanics (subscribe, onClear, etc.).
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
import { BaseRegistry } from '../registry/BaseRegistry.js';

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
 * Framework-agnostic matcher registration (no Svelte dependency).
 * Contains the matching logic and priority without the component.
 */
export interface FieldMatcherRegistration {
	/** Function to determine if this registration should handle a given schema */
	matcher: FieldMatcher;
	/** Priority for matching (higher = checked first) */
	priority: number;
}

/**
 * Full registration entry for a field component.
 * Extends FieldMatcherRegistration with the Svelte component needed for rendering.
 */
export interface FieldComponentRegistration extends FieldMatcherRegistration {
	/** The Svelte component to render */
	component: FieldComponent;
}

/**
 * Class-based field component registry.
 * Extends BaseRegistry with priority-based field resolution.
 */
class FieldComponentRegistry extends BaseRegistry<string, FieldComponentRegistration> {
	/** Cached ordered keys by priority (highest first), invalidated on mutation */
	private orderedKeys: string[] | null = null;

	/**
	 * Register a field component.
	 * Silently overwrites existing registrations (preserves legacy behavior).
	 *
	 * @param type - Unique identifier for this field type
	 * @param registration - The field component registration
	 */
	register(type: string, registration: FieldComponentRegistration): void {
		this.items.set(type, registration);
		this.orderedKeys = null;
		this.notifyListeners();
	}

	/**
	 * Override unregister to invalidate the priority cache.
	 */
	override unregister(key: string): boolean {
		const result = super.unregister(key);
		if (result) {
			this.orderedKeys = null;
		}
		return result;
	}

	/**
	 * Override clear to invalidate the priority cache.
	 */
	override clear(): void {
		super.clear();
		this.orderedKeys = null;
	}

	/**
	 * Resolve which component should render a given field schema.
	 * Checks registered matchers in priority order (highest first).
	 *
	 * @param schema - The field schema to resolve
	 * @returns The matching registration or null if no match
	 */
	resolveFieldComponent(schema: FieldSchema): FieldComponentRegistration | null {
		const keys = this.getOrderedKeys();

		for (const key of keys) {
			const registration = this.items.get(key);
			if (registration && registration.matcher(schema)) {
				return registration;
			}
		}

		return null;
	}

	/**
	 * Get keys ordered by priority (cached).
	 */
	private getOrderedKeys(): string[] {
		if (this.orderedKeys === null) {
			this.orderedKeys = Array.from(this.items.entries())
				.sort((a, b) => b[1].priority - a[1].priority)
				.map(([key]) => key);
		}
		return this.orderedKeys;
	}
}

/** Singleton instance of the field component registry */
export const fieldComponentRegistry = new FieldComponentRegistry();

// ============================================================================
// Backward-compatible function exports
// These delegate to the singleton and preserve the existing public API.
// ============================================================================

/**
 * Register a field component for a specific field type.
 *
 * @deprecated Use `fieldComponentRegistry.register()` instead.
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
	fieldComponentRegistry.register(type, { component, matcher, priority });
}

/**
 * Unregister a field component.
 *
 * @deprecated Use `fieldComponentRegistry.unregister()` instead.
 *
 * @param type - The field type to unregister
 * @returns true if the component was registered and removed
 */
export function unregisterFieldComponent(type: string): boolean {
	return fieldComponentRegistry.unregister(type);
}

/**
 * Get all registered field types.
 *
 * @deprecated Use `fieldComponentRegistry.getKeys()` instead.
 *
 * @returns Array of registered field type identifiers
 */
export function getRegisteredFieldTypes(): string[] {
	return fieldComponentRegistry.getKeys();
}

/**
 * Check if a field type is registered.
 *
 * @deprecated Use `fieldComponentRegistry.has()` instead.
 *
 * @param type - Field type to check
 * @returns true if the type is registered
 */
export function isFieldTypeRegistered(type: string): boolean {
	return fieldComponentRegistry.has(type);
}

/**
 * Resolve which component should render a given field schema.
 * Checks registered matchers in priority order.
 *
 * @deprecated Use `fieldComponentRegistry.resolveFieldComponent()` instead.
 *
 * @param schema - The field schema to resolve
 * @returns The matching registration or null if no match
 */
export function resolveFieldComponent(schema: FieldSchema): FieldComponentRegistration | null {
	return fieldComponentRegistry.resolveFieldComponent(schema);
}

/**
 * Clear all registered field components.
 * Useful for testing or reset scenarios.
 *
 * @deprecated Use `fieldComponentRegistry.clear()` instead.
 */
export function clearFieldRegistry(): void {
	fieldComponentRegistry.clear();
}

/**
 * Get the registry size.
 *
 * @deprecated Use `fieldComponentRegistry.size` instead.
 *
 * @returns Number of registered field components
 */
export function getFieldRegistrySize(): number {
	return fieldComponentRegistry.size;
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
