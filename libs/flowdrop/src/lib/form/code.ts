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
 * import { SchemaForm } from "@flowdrop/flowdrop/form";
 * import { registerCodeEditorField, registerTemplateEditorField } from "@flowdrop/flowdrop/form/code";
 *
 * // Register code editor support into an instance's field registry
 * // (call once at app startup)
 * registerCodeEditorField(fd.fields);
 *
 * // Optionally also register template editor
 * registerTemplateEditorField(fd.fields);
 *
 * // Now SchemaForm will render code editors for format: "json", "code", or "template"
 * ```
 */

import type { FieldComponent, FieldComponentRegistry } from './fieldRegistry.js';
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
 * Register the code/JSON editor field component
 *
 * Call this function once at application startup to enable
 * code editor fields in SchemaForm. This loads CodeMirror dependencies.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * // In your app's entry point:
 * import { registerCodeEditorField } from "@flowdrop/flowdrop/form/code";
 *
 * registerCodeEditorField(fd.fields);
 * ```
 */
export function registerCodeEditorField(
  registry: FieldComponentRegistry,
  priority: number = 100
): void {
  if (registry.has('code-editor')) {
    return;
  }

  // Dynamic import to ensure proper code splitting
  import('../components/form/FormCodeEditor.svelte').then((module) => {
    // Re-check inside the async callback: two rapid synchronous calls both pass
    // the guard above before either import resolves, so guard again here.
    if (registry.has('code-editor')) {
      return;
    }
    registry.register('code-editor', {
      component: module.default,
      matcher: codeEditorFieldMatcher,
      priority
    });
  });
}

/**
 * Register the template editor field component
 *
 * Call this function once at application startup to enable
 * template editor fields (Twig/Liquid syntax) in SchemaForm.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * // In your app's entry point:
 * import { registerTemplateEditorField } from "@flowdrop/flowdrop/form/code";
 *
 * registerTemplateEditorField(fd.fields);
 * ```
 */
export function registerTemplateEditorField(
  registry: FieldComponentRegistry,
  priority: number = 100
): void {
  if (registry.has('template-editor')) {
    return;
  }

  // Dynamic import to ensure proper code splitting
  import('../components/form/FormTemplateEditor.svelte').then((module) => {
    // Re-check inside the async callback: two rapid synchronous calls both pass
    // the guard above before either import resolves, so guard again here.
    if (registry.has('template-editor')) {
      return;
    }
    registry.register('template-editor', {
      component: module.default,
      matcher: templateEditorFieldMatcher,
      priority
    });
  });
}

/**
 * Register all code-related editor fields (code + template)
 *
 * Convenience function to register both code editor types at once.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 * @param priority - Priority for field matching (default: 100)
 */
export function registerAllCodeEditors(
  registry: FieldComponentRegistry,
  priority: number = 100
): void {
  registerCodeEditorField(registry, priority);
  registerTemplateEditorField(registry, priority);
}

/**
 * Synchronously register code editor field using the imported component
 *
 * Use this when you've already imported the component and want immediate registration.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 * @param component - The pre-imported code editor component
 * @param priority - Priority for field matching (default: 100)
 *
 * @example
 * ```typescript
 * import { registerCodeEditorFieldWithComponent, FormCodeEditor } from "@flowdrop/flowdrop/form/code";
 * registerCodeEditorFieldWithComponent(fd.fields, FormCodeEditor);
 * ```
 */
export function registerCodeEditorFieldWithComponent(
  registry: FieldComponentRegistry,
  component: FieldComponent,
  priority: number = 100
): void {
  if (registry.has('code-editor')) {
    return;
  }

  registry.register('code-editor', {
    component,
    matcher: codeEditorFieldMatcher,
    priority
  });
}

/**
 * Check if code editor field is registered in the given registry.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 */
export function isCodeEditorRegistered(registry: FieldComponentRegistry): boolean {
  return registry.has('code-editor');
}

/**
 * Check if template editor field is registered in the given registry.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 */
export function isTemplateEditorRegistered(registry: FieldComponentRegistry): boolean {
  return registry.has('template-editor');
}
