/**
 * Form Components Module
 *
 * Modular form components for dynamic form rendering based on JSON Schema.
 * Designed for extensibility to support complex types like arrays and objects.
 *
 * @module form
 *
 * @example
 * ```svelte
 * <script>
 *   import { FormField } from "$lib/components/form";
 *   import type { FieldSchema } from "$lib/components/form";
 *
 *   const schema: FieldSchema = {
 *     type: "string",
 *     title: "Name",
 *     description: "Enter your name"
 *   };
 *
 *   let value = $state("");
 * </script>
 *
 * <FormField
 *   fieldKey="name"
 *   {schema}
 *   {value}
 *   onChange={(v) => value = v}
 * />
 * ```
 */

// Types
export type {
	FieldType,
	FieldFormat,
	FieldOption,
	OneOfItem,
	BaseFieldProps,
	TextFieldProps,
	TextareaFieldProps,
	NumberFieldProps,
	ToggleFieldProps,
	RangeFieldProps,
	SelectFieldProps,
	CheckboxGroupFieldProps,
	ArrayFieldProps,
	CodeEditorFieldProps,
	MarkdownEditorFieldProps,
	TemplateEditorFieldProps,
	AutocompleteFieldProps,
	FieldSchema,
	FormFieldFactoryProps,
	FormFieldWrapperProps,
	SchemaFormProps,
	AutocompleteConfig
} from './types.js';

export {
	isFieldOptionArray,
	isOneOfArray,
	oneOfToOptions,
	normalizeOptions,
	getSchemaOptions
} from './types.js';

// Main factory component
export { default as FormField } from './FormField.svelte';

// Wrapper component
export { default as FormFieldWrapper } from './FormFieldWrapper.svelte';

// Individual field components
export { default as FormTextField } from './FormTextField.svelte';
export { default as FormTextarea } from './FormTextarea.svelte';
export { default as FormNumberField } from './FormNumberField.svelte';
export { default as FormRangeField } from './FormRangeField.svelte';
export { default as FormToggle } from './FormToggle.svelte';
export { default as FormSelect } from './FormSelect.svelte';
export { default as FormCheckboxGroup } from './FormCheckboxGroup.svelte';
export { default as FormArray } from './FormArray.svelte';
export { default as FormCodeEditor } from './FormCodeEditor.svelte';
export { default as FormMarkdownEditor } from './FormMarkdownEditor.svelte';
export { default as FormTemplateEditor } from './FormTemplateEditor.svelte';
export { default as FormAutocomplete } from './FormAutocomplete.svelte';

// UISchema rendering components
export { default as FormFieldset } from './FormFieldset.svelte';
export { default as FormUISchemaRenderer } from './FormUISchemaRenderer.svelte';

// Template autocomplete utilities
export { createTemplateAutocomplete } from './templateAutocomplete.js';
