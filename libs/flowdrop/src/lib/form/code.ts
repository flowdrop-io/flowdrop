/**
 * FlowDrop Form Code Editor Module
 *
 * Adds CodeMirror-based code/JSON editor support to SchemaForm.
 * This module bundles CodeMirror dependencies (~300KB).
 *
 * @module form/code
 *
 * @example
 * ```typescript
 * import { SchemaForm } from "@d34dman/flowdrop/form";
 * import { registerCodeEditorField, registerTemplateEditorField } from "@d34dman/flowdrop/form/code";
 *
 * // Register code editor support (call once at app startup)
 * registerCodeEditorField();
 *
 * // Optionally also register template editor
 * registerTemplateEditorField();
 *
 * // Now SchemaForm will render code editors for format: "json", "code", or "template"
 * ```
 */

import { fieldComponentRegistry } from './fieldRegistry.js';
import type { FieldComponent } from './fieldRegistry.js';
import type { FieldSchema } from '../components/form/types.js';

// Re-export the components for direct usage if needed
export { default as FormCodeEditor } from '../components/form/FormCodeEditor.svelte';
export { default as FormTemplateEditor } from '../components/form/FormTemplateEditor.svelte';

// Re-export types for code editor props
export type { CodeEditorFieldProps, TemplateEditorFieldProps } from '../components/form/types.js';

/**
 * Matcher for code/JSON editor fields
 * Matches: format "json", "code", or type "object" without specific format
 */
export function codeEditorFieldMatcher(schema: FieldSchema): boolean {
	// JSON/code format
	if (schema.format === 'json' || schema.format === 'code') {
		return true;
	}

	// Object type without specific format (render as JSON editor)
	if (schema.type === 'object' && !schema.format) {
		return true;
	}

	return false;
}

/**
 * Matcher for template editor fields
 * Matches: format "template" (Twig/Liquid-style templates)
 */
export function templateEditorFieldMatcher(schema: FieldSchema): boolean {
	return schema.format === 'template';
}

/**
 * Track if code editor is registered
 */
let codeEditorRegistered = false;

/**
 * Track if template editor is registered
 */
let templateEditorRegistered = false;

// Sync registration flags with registry.clear() for test isolation
fieldComponentRegistry.onClear(() => {
	codeEditorRegistered = false;
	templateEditorRegistered = false;
});

/**
 * Register the code/JSON editor field component
 *
 * Call this function once at application startup to enable
 * code editor fields in SchemaForm. This loads CodeMirror dependencies.
 *
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * // In your app's entry point:
 * import { registerCodeEditorField } from "@d34dman/flowdrop/form/code";
 *
 * registerCodeEditorField();
 * ```
 */
export function registerCodeEditorField(priority: number = 100): void {
	if (codeEditorRegistered) {
		return;
	}

	// Dynamic import to ensure proper code splitting
	import('../components/form/FormCodeEditor.svelte').then((module) => {
		fieldComponentRegistry.register('code-editor', {
			component: module.default,
			matcher: codeEditorFieldMatcher,
			priority
		});
		codeEditorRegistered = true;
	});
}

/**
 * Register the template editor field component
 *
 * Call this function once at application startup to enable
 * template editor fields (Twig/Liquid syntax) in SchemaForm.
 *
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * // In your app's entry point:
 * import { registerTemplateEditorField } from "@d34dman/flowdrop/form/code";
 *
 * registerTemplateEditorField();
 * ```
 */
export function registerTemplateEditorField(priority: number = 100): void {
	if (templateEditorRegistered) {
		return;
	}

	// Dynamic import to ensure proper code splitting
	import('../components/form/FormTemplateEditor.svelte').then((module) => {
		fieldComponentRegistry.register('template-editor', {
			component: module.default,
			matcher: templateEditorFieldMatcher,
			priority
		});
		templateEditorRegistered = true;
	});
}

/**
 * Register all code-related editor fields (code + template)
 *
 * Convenience function to register both code editor types at once.
 *
 * @param priority - Priority for field matching (default: 100)
 */
export function registerAllCodeEditors(priority: number = 100): void {
	registerCodeEditorField(priority);
	registerTemplateEditorField(priority);
}

/**
 * Synchronously register code editor field using the imported component
 *
 * Use this when you've already imported the component and want immediate registration.
 *
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * import { registerCodeEditorFieldWithComponent, FormCodeEditor } from "@d34dman/flowdrop/form/code";
 * registerCodeEditorFieldWithComponent(FormCodeEditor);
 * ```
 */
export function registerCodeEditorFieldWithComponent(
	component: FieldComponent,
	priority: number = 100
): void {
	if (codeEditorRegistered) {
		return;
	}

	fieldComponentRegistry.register('code-editor', {
		component,
		matcher: codeEditorFieldMatcher,
		priority
	});
	codeEditorRegistered = true;
}

/**
 * Check if code editor field is registered
 */
export function isCodeEditorRegistered(): boolean {
	return codeEditorRegistered;
}

/**
 * Check if template editor field is registered
 */
export function isTemplateEditorRegistered(): boolean {
	return templateEditorRegistered;
}
