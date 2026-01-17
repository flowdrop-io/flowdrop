/**
 * FlowDrop Form Full Module
 *
 * Convenience module that imports and registers all form field types,
 * including heavy editors (CodeMirror, EasyMDE).
 *
 * This is equivalent to importing from the light form module and manually
 * registering all editor types.
 *
 * @module form/full
 *
 * @example
 * ```typescript
 * // Single import that sets up everything
 * import { SchemaForm, initializeAllFieldTypes } from "@d34dman/flowdrop/form/full";
 *
 * // Call once at app startup
 * initializeAllFieldTypes();
 *
 * // Now all field types are available
 * ```
 */

// Re-export everything from the light form module
export * from './index.js';

// Import registration functions
import { registerCodeEditorField, registerTemplateEditorField } from './code.js';
import { registerMarkdownEditorField } from './markdown.js';

// Re-export heavy editor components for direct access
export { FormCodeEditor, FormTemplateEditor } from './code.js';
export { FormMarkdownEditor } from './markdown.js';

// Re-export registration functions
export {
	registerCodeEditorField,
	registerTemplateEditorField,
	registerAllCodeEditors,
	isCodeEditorRegistered,
	isTemplateEditorRegistered,
	codeEditorFieldMatcher,
	templateEditorFieldMatcher
} from './code.js';

export {
	registerMarkdownEditorField,
	isMarkdownEditorRegistered,
	markdownEditorFieldMatcher
} from './markdown.js';

/**
 * Track if all field types have been initialized
 */
let allFieldTypesInitialized = false;

/**
 * Initialize all form field types including heavy editors
 *
 * Call this once at application startup to enable all field types.
 * This includes:
 * - Code/JSON editor (CodeMirror)
 * - Template editor (CodeMirror with Twig/Liquid syntax)
 * - Markdown editor (EasyMDE)
 *
 * @example
 * ```typescript
 * import { initializeAllFieldTypes } from "@d34dman/flowdrop/form/full";
 *
 * // In your app's entry point
 * initializeAllFieldTypes();
 * ```
 */
export function initializeAllFieldTypes(): void {
	if (allFieldTypesInitialized) {
		return;
	}

	registerCodeEditorField();
	registerTemplateEditorField();
	registerMarkdownEditorField();

	allFieldTypesInitialized = true;
}

/**
 * Check if all field types have been initialized
 */
export function areAllFieldTypesInitialized(): boolean {
	return allFieldTypesInitialized;
}

/**
 * Reset initialization state (useful for testing)
 */
export function resetFieldTypeInitialization(): void {
	allFieldTypesInitialized = false;
}
