/**
 * FlowDrop Form Full Module
 *
 * Convenience module that imports and registers all form field types,
 * including heavy editors (CodeMirror).
 *
 * This is equivalent to importing from the light form module and manually
 * registering all editor types.
 *
 * @module form/full
 *
 * @example
 * ```typescript
 * // Single import that sets up everything
 * import { SchemaForm, initializeAllFieldTypes } from "@flowdrop/flowdrop/form/full";
 *
 * // Call once at app startup, against an instance's field registry
 * initializeAllFieldTypes(fd.fields);
 *
 * // Now all field types are available
 * ```
 */

// Re-export everything from the light form module
// The "everything statically bundled" FormField variant lives here (this is the
// heavy entry), not in the light `@flowdrop/flowdrop/form`.
export { default as FormFieldFull } from '../components/form/FormField.svelte';

// Components
export {
  SchemaForm,
  FormField,
  FormFieldWrapper,
  FormTextField,
  FormTextarea,
  FormNumberField,
  FormRangeField,
  FormToggle,
  FormSelect,
  FormCheckboxGroup,
  FormArray,
  FormFieldset,
  FormUISchemaRenderer
} from './index.js';

// Types
export type {
  FieldSchema,
  FieldType,
  FieldFormat,
  FieldOption,
  OneOfItem,
  SchemaFormProps,
  BaseFieldProps,
  TextFieldProps,
  TextareaFieldProps,
  NumberFieldProps,
  ToggleFieldProps,
  RangeFieldProps,
  SelectFieldProps,
  CheckboxGroupFieldProps,
  ArrayFieldProps,
  FormFieldFactoryProps,
  FormFieldWrapperProps,
  FieldComponentProps,
  FieldMatcher,
  FieldMatcherRegistration,
  FieldComponent,
  FieldComponentRegistration
} from './index.js';

// Utility functions
export {
  isFieldOptionArray,
  isOneOfArray,
  normalizeOptions,
  oneOfToOptions,
  getSchemaOptions
} from './index.js';

// Field Registry
export {
  FieldComponentRegistry,
  hiddenFieldMatcher,
  checkboxGroupMatcher,
  enumSelectMatcher,
  textareaMatcher,
  rangeMatcher,
  textFieldMatcher,
  numberFieldMatcher,
  toggleMatcher,
  selectOptionsMatcher,
  arrayMatcher
} from './index.js';

// Import registration functions
import { registerCodeEditorField, registerTemplateEditorField } from './code.js';
import { registerMarkdownEditorField } from './markdown.js';
import type { FieldComponentRegistry } from './fieldRegistry.js';

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
 * Initialize all form field types including heavy editors
 *
 * Call this once at application startup to enable all field types in the
 * given instance's field registry. This includes:
 * - Code/JSON editor (CodeMirror)
 * - Template editor (CodeMirror with Twig/Liquid syntax)
 * - Markdown editor (CodeMirror 6)
 *
 * Registration is idempotent per registry — each `register*Field` is a no-op
 * if its field type is already present (see `FieldComponentRegistry.has`).
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 *
 * @example
 * ```typescript
 * import { initializeAllFieldTypes } from "@flowdrop/flowdrop/form/full";
 *
 * // In your app's entry point
 * initializeAllFieldTypes(fd.fields);
 * ```
 */
export function initializeAllFieldTypes(registry: FieldComponentRegistry): void {
  registerCodeEditorField(registry);
  registerTemplateEditorField(registry);
  registerMarkdownEditorField(registry);
}

/**
 * Check if all heavy field types are registered in the given registry.
 *
 * @param registry - The instance's field registry (e.g. `fd.fields`)
 */
export function areAllFieldTypesInitialized(registry: FieldComponentRegistry): boolean {
  return (
    registry.has('code-editor') &&
    registry.has('template-editor') &&
    registry.has('markdown-editor')
  );
}
