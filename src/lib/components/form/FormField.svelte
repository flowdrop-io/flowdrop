<!--
  FormField Component
  Factory component that renders the appropriate field based on schema type
  
  Features:
  - Automatically selects the correct field component based on schema
  - Wraps fields with FormFieldWrapper for consistent layout
  - Supports all current field types (string, number, boolean, select, checkbox group, range, json, markdown, template)
  - Extensible architecture for future complex types (array, object)
  
  Type Resolution Order:
  1. format: 'hidden' -> skip rendering (return nothing)
  2. format: 'json' or 'code' -> FormCodeEditor (CodeMirror JSON editor)
  3. format: 'markdown' -> FormMarkdownEditor (SimpleMDE Markdown editor)
  4. format: 'template' -> FormTemplateEditor (CodeMirror with Twig/Liquid syntax)
  5. enum with multiple: true -> FormCheckboxGroup
  6. enum -> FormSelect
  7. format: 'multiline' -> FormTextarea
  8. format: 'range' (number/integer) -> FormRangeField
  9. type: 'string' -> FormTextField
  10. type: 'number' or 'integer' -> FormNumberField
  11. type: 'boolean' -> FormToggle
  12. type: 'select' or has options -> FormSelect
  13. type: 'object' (without format) -> FormCodeEditor (for JSON objects)
  14. fallback -> FormTextField
-->

<script lang="ts">
	import FormFieldWrapper from './FormFieldWrapper.svelte';
	import FormTextField from './FormTextField.svelte';
	import FormTextarea from './FormTextarea.svelte';
	import FormNumberField from './FormNumberField.svelte';
	import FormRangeField from './FormRangeField.svelte';
	import FormToggle from './FormToggle.svelte';
	import FormSelect from './FormSelect.svelte';
	import FormCheckboxGroup from './FormCheckboxGroup.svelte';
	import FormArray from './FormArray.svelte';
	import FormCodeEditor from './FormCodeEditor.svelte';
	import FormMarkdownEditor from './FormMarkdownEditor.svelte';
	import FormTemplateEditor from './FormTemplateEditor.svelte';
	import type { FieldSchema, FieldOption } from './types.js';

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

	let { fieldKey, schema, value, required = false, animationIndex = 0, onChange }: Props = $props();

	/**
	 * Computed description ID for ARIA association
	 */
	const descriptionId = $derived(
		schema.description && schema.title ? `${fieldKey}-description` : undefined
	);

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
		if (schema.format === 'hidden') {
			return 'hidden';
		}

		// JSON/code editor for format: "json" or "code"
		if (schema.format === 'json' || schema.format === 'code') {
			return 'code-editor';
		}

		// Markdown editor for format: "markdown"
		if (schema.format === 'markdown') {
			return 'markdown-editor';
		}

		// Template editor for format: "template" (Twig/Liquid syntax)
		if (schema.format === 'template') {
			return 'template-editor';
		}

		// Enum with multiple selection -> checkbox group
		if (schema.enum && schema.multiple) {
			return 'checkbox-group';
		}

		// Enum with single selection -> select
		if (schema.enum) {
			return 'select-enum';
		}

		// Multiline string -> textarea
		if (schema.type === 'string' && schema.format === 'multiline') {
			return 'textarea';
		}

		// Range slider for number/integer with format: "range"
		if ((schema.type === 'number' || schema.type === 'integer') && schema.format === 'range') {
			return 'range';
		}

		// String -> text field
		if (schema.type === 'string') {
			return 'text';
		}

		// Number or integer -> number field
		if (schema.type === 'number' || schema.type === 'integer') {
			return 'number';
		}

		// Boolean -> toggle
		if (schema.type === 'boolean') {
			return 'toggle';
		}

		// Select type or has options -> select
		if (schema.type === 'select' || schema.options) {
			return 'select-options';
		}

		// Future: Array type support
		if (schema.type === 'array') {
			return 'array';
		}

		// Object type without specific format -> CodeMirror JSON editor
		if (schema.type === 'object') {
			return 'code-editor';
		}

		// Fallback to text
		return 'text';
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
	const stringValue = $derived(String(value ?? ''));
	const numberValue = $derived(value as number | string);
	const booleanValue = $derived(Boolean(value ?? schema.default ?? false));
	const arrayValue = $derived.by((): string[] => {
		if (Array.isArray(value)) {
			return value.map((v) => String(v));
		}
		return [];
	});
	const arrayItems = $derived.by((): unknown[] => {
		if (Array.isArray(value)) {
			return value;
		}
		return [];
	});
</script>

{#if fieldType !== 'hidden'}
	<FormFieldWrapper
		id={fieldKey}
		label={fieldLabel}
		{required}
		description={schema.title ? schema.description : undefined}
		{animationDelay}
	>
		{#if fieldType === 'checkbox-group'}
			<FormCheckboxGroup
				id={fieldKey}
				value={arrayValue}
				options={enumOptions}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'select-enum'}
			<FormSelect
				id={fieldKey}
				value={stringValue}
				options={enumOptions}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'textarea'}
			<FormTextarea
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? ''}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'text'}
			<FormTextField
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? ''}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'number'}
			<FormNumberField
				id={fieldKey}
				value={numberValue}
				placeholder={schema.placeholder ?? ''}
				min={schema.minimum}
				max={schema.maximum}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'range'}
			<FormRangeField
				id={fieldKey}
				value={numberValue}
				min={schema.minimum}
				max={schema.maximum}
				step={schema.step}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'toggle'}
			<FormToggle
				id={fieldKey}
				value={booleanValue}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'select-options'}
			<FormSelect
				id={fieldKey}
				value={stringValue}
				options={selectOptions}
				{required}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'array' && schema.items}
			<FormArray
				id={fieldKey}
				value={arrayItems}
				itemSchema={schema.items}
				minItems={schema.minItems}
				maxItems={schema.maxItems}
				addLabel={`Add ${schema.items.title ?? 'Item'}`}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'code-editor'}
			<FormCodeEditor
				id={fieldKey}
				{value}
				placeholder={schema.placeholder ?? '{}'}
				{required}
				height={(schema.height as string | undefined) ?? '200px'}
				darkTheme={(schema.darkTheme as boolean | undefined) ?? false}
				autoFormat={(schema.autoFormat as boolean | undefined) ?? true}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'markdown-editor'}
			<FormMarkdownEditor
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? 'Write your markdown here...'}
				{required}
				height={(schema.height as string | undefined) ?? '300px'}
				showToolbar={(schema.showToolbar as boolean | undefined) ?? true}
				showStatusBar={(schema.showStatusBar as boolean | undefined) ?? true}
				spellChecker={(schema.spellChecker as boolean | undefined) ?? false}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'template-editor'}
			<FormTemplateEditor
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ??
					'Enter your template here...\nUse {{ variable }} for dynamic values.'}
				{required}
				height={(schema.height as string | undefined) ?? '250px'}
				darkTheme={(schema.darkTheme as boolean | undefined) ?? false}
				variableHints={(schema.variableHints as string[] | undefined) ?? []}
				placeholderExample={(schema.placeholderExample as string | undefined) ??
					'Hello {{ name }}, your order #{{ order_id }} is ready!'}
				ariaDescribedBy={descriptionId}
				onChange={(val) => onChange(val)}
			/>
		{:else}
			<!-- Fallback to text input -->
			<FormTextField
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? ''}
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
