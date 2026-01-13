/**
 * FlowDrop Form Module
 *
 * Provides SchemaForm and form field components for building dynamic forms
 * from JSON Schema definitions. This is the "light" version that includes
 * only basic field types (text, number, select, checkbox, etc.).
 *
 * For code editor support (CodeMirror), import from "@d34dman/flowdrop/form/code"
 * For markdown editor support (EasyMDE), import from "@d34dman/flowdrop/form/markdown"
 *
 * @module form
 *
 * @example Basic usage (small bundle - ~20KB):
 * ```typescript
 * import { SchemaForm } from "@d34dman/flowdrop/form";
 *
 * const schema = {
 *   type: "object",
 *   properties: {
 *     name: { type: "string", title: "Name" },
 *     age: { type: "number", title: "Age" }
 *   }
 * };
 * ```
 *
 * @example With code editor support (adds ~300KB):
 * ```typescript
 * import { SchemaForm } from "@d34dman/flowdrop/form";
 * import { registerCodeEditorField } from "@d34dman/flowdrop/form/code";
 *
 * // Register code editor support before using
 * registerCodeEditorField();
 *
 * const schema = {
 *   type: "object",
 *   properties: {
 *     config: { type: "object", format: "json", title: "Configuration" }
 *   }
 * };
 * ```
 */

// ============================================================================
// Main Components
// ============================================================================

export { default as SchemaForm } from "../components/SchemaForm.svelte";

// ============================================================================
// Form Field Components (Light - no heavy dependencies)
// ============================================================================

// Use the light version of FormField that uses the registry for heavy editors
export { default as FormField } from "../components/form/FormFieldLight.svelte";

// Also export the original (full) version for users who want everything
export { default as FormFieldFull } from "../components/form/FormField.svelte";
export { default as FormFieldWrapper } from "../components/form/FormFieldWrapper.svelte";
export { default as FormTextField } from "../components/form/FormTextField.svelte";
export { default as FormTextarea } from "../components/form/FormTextarea.svelte";
export { default as FormNumberField } from "../components/form/FormNumberField.svelte";
export { default as FormRangeField } from "../components/form/FormRangeField.svelte";
export { default as FormToggle } from "../components/form/FormToggle.svelte";
export { default as FormSelect } from "../components/form/FormSelect.svelte";
export { default as FormCheckboxGroup } from "../components/form/FormCheckboxGroup.svelte";
export { default as FormArray } from "../components/form/FormArray.svelte";

// ============================================================================
// Types
// ============================================================================

export type {
	FieldSchema,
	FieldType,
	FieldFormat,
	FieldOption,
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
	FormFieldWrapperProps
} from "../components/form/types.js";

export {
	isFieldOptionArray,
	normalizeOptions
} from "../components/form/types.js";

// ============================================================================
// Field Registry (for dynamic field registration)
// ============================================================================

export {
	registerFieldComponent,
	unregisterFieldComponent,
	resolveFieldComponent,
	getRegisteredFieldTypes,
	isFieldTypeRegistered,
	clearFieldRegistry,
	getFieldRegistrySize,
	// Built-in matchers for custom components
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
} from "./fieldRegistry.js";

export type {
	FieldComponentProps,
	FieldMatcher,
	FieldComponent,
	FieldComponentRegistration
} from "./fieldRegistry.js";
