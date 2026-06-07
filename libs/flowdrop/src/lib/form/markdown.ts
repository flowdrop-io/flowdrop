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
 * import { SchemaForm } from "@flowdrop/flowdrop/form";
 * import { registerMarkdownEditorField } from "@flowdrop/flowdrop/form/markdown";
 *
 * // Register markdown editor support (call once at app startup)
 * registerMarkdownEditorField(fd.fields);
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

import type { FieldComponent, FieldComponentRegistry } from './fieldRegistry.js';
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
 * Register the markdown editor field component
 *
 * Call this function once at application startup to enable
 * markdown editor fields in SchemaForm.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * // In your app's entry point:
 * import { registerMarkdownEditorField } from "@flowdrop/flowdrop/form/markdown";
 *
 * registerMarkdownEditorField(fd.fields);
 * ```
 */
export function registerMarkdownEditorField(
  registry: FieldComponentRegistry,
  priority: number = 100
): void {
  if (registry.has('markdown-editor')) {
    return;
  }

  // Dynamic import to ensure proper code splitting
  import('../components/form/FormMarkdownEditor.svelte').then((module) => {
    // Re-check inside the async callback: two rapid synchronous calls both pass
    // the guard above before either import resolves, so guard again here.
    if (registry.has('markdown-editor')) {
      return;
    }
    registry.register('markdown-editor', {
      component: module.default,
      matcher: markdownEditorFieldMatcher,
      priority
    });
  });
}

/**
 * Synchronously register markdown editor field using the imported component
 *
 * Use this when you've already imported the component and want immediate registration.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 * @param component - The pre-imported markdown editor component
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * import { registerMarkdownEditorFieldWithComponent, FormMarkdownEditor } from "@flowdrop/flowdrop/form/markdown";
 * registerMarkdownEditorFieldWithComponent(fd.fields, FormMarkdownEditor);
 * ```
 */
export function registerMarkdownEditorFieldWithComponent(
  registry: FieldComponentRegistry,
  component: FieldComponent,
  priority: number = 100
): void {
  if (registry.has('markdown-editor')) {
    return;
  }

  registry.register('markdown-editor', {
    component,
    matcher: markdownEditorFieldMatcher,
    priority
  });
}

/**
 * Check if markdown editor field is registered in the given registry.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 */
export function isMarkdownEditorRegistered(registry: FieldComponentRegistry): boolean {
  return registry.has('markdown-editor');
}
