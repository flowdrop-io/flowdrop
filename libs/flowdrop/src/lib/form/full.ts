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
 * // Call once at app startup
 * initializeAllFieldTypes();
 *
 * // Now all field types are available
 * ```
 */

// Re-export everything from the light form module
// Components
export {
  SchemaForm,
  FormField,
  FormFieldFull,
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
  FormUISchemaRenderer,
} from "./index.js";

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
  FieldComponentRegistration,
} from "./index.js";

// Utility functions
export {
  isFieldOptionArray,
  isOneOfArray,
  normalizeOptions,
  oneOfToOptions,
  getSchemaOptions,
} from "./index.js";

// Field Registry
export {
  fieldComponentRegistry,
  hiddenFieldMatcher,
  checkboxGroupMatcher,
  enumSelectMatcher,
  textareaMatcher,
  rangeMatcher,
  textFieldMatcher,
  numberFieldMatcher,
  toggleMatcher,
  selectOptionsMatcher,
  arrayMatcher,
} from "./index.js";

// Import registration functions
import {
  registerCodeEditorField,
  registerTemplateEditorField,
} from "./code.js";
import { registerMarkdownEditorField } from "./markdown.js";

// Re-export heavy editor components for direct access
export { FormCodeEditor, FormTemplateEditor } from "./code.js";
export { FormMarkdownEditor } from "./markdown.js";

// Re-export registration functions
export {
  registerCodeEditorField,
  registerTemplateEditorField,
  registerAllCodeEditors,
  isCodeEditorRegistered,
  isTemplateEditorRegistered,
  codeEditorFieldMatcher,
  templateEditorFieldMatcher,
} from "./code.js";

export {
  registerMarkdownEditorField,
  isMarkdownEditorRegistered,
  markdownEditorFieldMatcher,
} from "./markdown.js";

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
 * - Markdown editor (CodeMirror 6)
 *
 * @example
 * ```typescript
 * import { initializeAllFieldTypes } from "@flowdrop/flowdrop/form/full";
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
