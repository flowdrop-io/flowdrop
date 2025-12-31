<!--
  FormField Component
  Factory component that renders the appropriate field based on schema type
  
  Features:
  - Automatically selects the correct field component based on schema
  - Wraps fields with FormFieldWrapper for consistent layout
  - Supports all current field types (string, number, boolean, select, checkbox group)
  - Extensible architecture for future complex types (array, object)
  
  Type Resolution Order:
  1. format: 'hidden' -> skip rendering (return nothing)
  2. enum with multiple: true -> FormCheckboxGroup
  3. enum -> FormSelect
  4. format: 'multiline' -> FormTextarea
  5. type: 'string' -> FormTextField
  6. type: 'number' or 'integer' -> FormNumberField
  7. type: 'boolean' -> FormToggle
  8. type: 'select' or has options -> FormSelect
  9. fallback -> FormTextField
-->

<script lang="ts">
	import FormFieldWrapper from "./FormFieldWrapper.svelte";
	import FormTextField from "./FormTextField.svelte";
	import FormTextarea from "./FormTextarea.svelte";
	import FormNumberField from "./FormNumberField.svelte";
	import FormToggle from "./FormToggle.svelte";
	import FormSelect from "./FormSelect.svelte";
	import FormCheckboxGroup from "./FormCheckboxGroup.svelte";
	import type { FieldSchema, FieldOption } from "./types.js";

	interface Props {
		/** Unique key/id for the field */
		fieldKey: string;
		/** Field schema definition */
		schema: FieldSchema;
		/** Current field value */
		value: unknown;
		/** Whether the field is required */
		required?: boolean;
		/** Animation delay index for staggered animations */
		animationIndex?: number;
		/** Callback when the field value changes */
		onChange: (value: unknown) => void;
	}

	let {
		fieldKey,
		schema,
		value,
		required = false,
		animationIndex = 0,
		onChange
	}: Props = $props();

	/**
	 * Computed description ID for ARIA association
	 */
	const descriptionId = $derived(schema.description && schema.title ? `${fieldKey}-description` : undefined);

	/**
	 * Animation delay based on index
	 */
	const animationDelay = $derived(animationIndex * 30);

	/**
	 * Field label - prefer title, fall back to description, then key
	 */
	const fieldLabel = $derived(String(schema.title ?? schema.description ?? fieldKey));

	/**
	 * Determine the field type to render
	 */
	const fieldType = $derived.by(() => {
		// Hidden fields should not be rendered
		if (schema.format === "hidden") {
			return "hidden";
		}

		// Enum with multiple selection -> checkbox group
		if (schema.enum && schema.multiple) {
			return "checkbox-group";
		}

		// Enum with single selection -> select
		if (schema.enum) {
			return "select-enum";
		}

		// Multiline string -> textarea
		if (schema.type === "string" && schema.format === "multiline") {
			return "textarea";
		}

		// String -> text field
		if (schema.type === "string") {
			return "text";
		}

		// Number or integer -> number field
		if (schema.type === "number" || schema.type === "integer") {
			return "number";
		}

		// Boolean -> toggle
		if (schema.type === "boolean") {
			return "toggle";
		}

		// Select type or has options -> select
		if (schema.type === "select" || schema.options) {
			return "select-options";
		}

		// Future: Array type support
		if (schema.type === "array") {
			return "array";
		}

		// Future: Object type support
		if (schema.type === "object") {
			return "object";
		}

		// Fallback to text
		return "text";
	});

	/**
	 * Get enum options as string array for select/checkbox components
	 */
	const enumOptions = $derived.by((): string[] => {
		if (!schema.enum) return [];
		return schema.enum.map((opt) => String(opt));
	});

	/**
	 * Get select options for select-options type
	 */
	const selectOptions = $derived.by((): FieldOption[] => {
		if (!schema.options) return [];
		return schema.options as FieldOption[];
	});

	/**
	 * Get current value as the appropriate type
	 */
	const stringValue = $derived(String(value ?? ""));
	const numberValue = $derived(value as number | string);
	const booleanValue = $derived(Boolean(value ?? schema.default ?? false));
	const arrayValue = $derived.by((): string[] => {
		if (Array.isArray(value)) {
			return value.map((v) => String(v));
		}
		return [];
	});
</script>

{#if fieldType !== "hidden"}
	<FormFieldWrapper
		id={fieldKey}
		label={fieldLabel}
		{required}
		description={schema.title ? schema.description : undefined}
		{animationDelay}
	>
		{#if fieldType === "checkbox-group"}
			<FormCheckboxGroup
				id={fieldKey}
				value={arrayValue}
				options={enumOptions}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === "select-enum"}
			<FormSelect
				id={fieldKey}
				value={stringValue}
				options={enumOptions}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === "textarea"}
			<FormTextarea
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? ""}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === "text"}
			<FormTextField
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? ""}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === "number"}
			<FormNumberField
				id={fieldKey}
				value={numberValue}
				placeholder={schema.placeholder ?? ""}
				min={schema.minimum}
				max={schema.maximum}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === "toggle"}
			<FormToggle
				id={fieldKey}
				value={booleanValue}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === "select-options"}
			<FormSelect
				id={fieldKey}
				value={stringValue}
				options={selectOptions}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === "array"}
			<!-- Future: Array field component -->
			<div class="form-field__unsupported">
				<p>Array fields are not yet supported. Coming soon!</p>
			</div>
		{:else if fieldType === "object"}
			<!-- Future: Object field component -->
			<div class="form-field__unsupported">
				<p>Object fields are not yet supported. Coming soon!</p>
			</div>
		{:else}
			<!-- Fallback to text input -->
			<FormTextField
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? ""}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{/if}
	</FormFieldWrapper>
{/if}

<style>
	.form-field__unsupported {
		padding: 0.75rem;
		background-color: var(--color-ref-amber-50, #fffbeb);
		border: 1px solid var(--color-ref-amber-200, #fde68a);
		border-radius: 0.5rem;
		color: var(--color-ref-amber-800, #92400e);
		font-size: 0.8125rem;
	}

	.form-field__unsupported p {
		margin: 0;
	}
</style>

