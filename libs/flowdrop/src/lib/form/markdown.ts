/**
 * FlowDrop Form Markdown Editor Module
 *
 * Adds CodeMirror 6-based markdown editor support to SchemaForm.
 * Uses @codemirror/lang-markdown for syntax highlighting and marked for preview.
 *
 * @module form/markdown
 *
 * @example
 * ```typescript
 * import { SchemaForm } from "@d34dman/flowdrop/form";
 * import { registerMarkdownEditorField } from "@d34dman/flowdrop/form/markdown";
 *
 * // Register markdown editor support (call once at app startup)
 * registerMarkdownEditorField();
 *
 * // Now SchemaForm will render markdown editors for format: "markdown"
 * const schema = {
 *   type: "object",
 *   properties: {
 *     content: { type: "string", format: "markdown", title: "Content" }
 *   }
 * };
 * ```
 */

import { fieldComponentRegistry } from './fieldRegistry.js';
import type { FieldComponent } from './fieldRegistry.js';
import type { FieldSchema } from '../components/form/types.js';

// Re-export the component for direct usage if needed
export { default as FormMarkdownEditor } from '../components/form/FormMarkdownEditor.svelte';

// Re-export types for markdown editor props
export type { MarkdownEditorFieldProps } from '../components/form/types.js';

/**
 * Matcher for markdown editor fields
 * Matches: format "markdown"
 */
export function markdownEditorFieldMatcher(schema: FieldSchema): boolean {
	return schema.format === 'markdown';
}

/**
 * Track if markdown editor is registered
 */
let markdownEditorRegistered = false;

// Sync registration flag with registry.clear() for test isolation
fieldComponentRegistry.onClear(() => {
	markdownEditorRegistered = false;
});

/**
 * Register the markdown editor field component
 *
 * Call this function once at application startup to enable
 * markdown editor fields in SchemaForm.
 *
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * // In your app's entry point:
 * import { registerMarkdownEditorField } from "@d34dman/flowdrop/form/markdown";
 *
 * registerMarkdownEditorField();
 * ```
 */
export function registerMarkdownEditorField(priority: number = 100): void {
	if (markdownEditorRegistered) {
		return;
	}

	// Dynamic import to ensure proper code splitting
	import('../components/form/FormMarkdownEditor.svelte').then((module) => {
		fieldComponentRegistry.register('markdown-editor', {
			component: module.default,
			matcher: markdownEditorFieldMatcher,
			priority
		});
		markdownEditorRegistered = true;
	});
}

/**
 * Synchronously register markdown editor field using the imported component
 *
 * Use this when you've already imported the component and want immediate registration.
 *
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * import { registerMarkdownEditorFieldWithComponent, FormMarkdownEditor } from "@d34dman/flowdrop/form/markdown";
 * registerMarkdownEditorFieldWithComponent(FormMarkdownEditor);
 * ```
 */
export function registerMarkdownEditorFieldWithComponent(
	component: FieldComponent,
	priority: number = 100
): void {
	if (markdownEditorRegistered) {
		return;
	}

	fieldComponentRegistry.register('markdown-editor', {
		component,
		matcher: markdownEditorFieldMatcher,
		priority
	});
	markdownEditorRegistered = true;
}

/**
 * Check if markdown editor field is registered
 */
export function isMarkdownEditorRegistered(): boolean {
	return markdownEditorRegistered;
}
