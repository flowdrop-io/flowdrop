<!--
  FormField Component
  Factory component that renders the appropriate field based on schema type
  
  Features:
  - Automatically selects the correct field component based on schema
  - Wraps fields with FormFieldWrapper for consistent layout
  - Supports all current field types (string, number, boolean, checkbox group, range, json, markdown, template, autocomplete)
  - Uses standard JSON Schema patterns (enum, oneOf) for select fields
  - Extensible architecture for future complex types (array, object)
  
  Type Resolution Order:
  1. format: 'hidden' -> skip rendering (return nothing)
  2. format: 'autocomplete' with autocomplete.url -> FormAutocomplete
  3. format: 'json' or 'code' -> FormCodeEditor (CodeMirror JSON editor)
  4. format: 'markdown' -> FormMarkdownEditor (SimpleMDE Markdown editor)
  5. format: 'template' -> FormTemplateEditor (CodeMirror with Twig/Liquid syntax)
  6. enum with multiple: true -> FormCheckboxGroup
  7. enum -> FormSelect (simple values without labels)
  8. oneOf with const/title (labeled options) -> FormSelect
  9. format: 'multiline' -> FormTextarea
  10. format: 'range' (number/integer) -> FormRangeField
  11. type: 'string' -> FormTextField
  12. type: 'number' or 'integer' -> FormNumberField
  13. type: 'boolean' -> FormToggle
  14. type: 'object' (without format) -> FormCodeEditor (for JSON objects)
  15. fallback -> FormTextField
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
	import FormAutocomplete from './FormAutocomplete.svelte';
	import type { FieldSchema } from './types.js';
	import { getSchemaOptions } from './types.js';
	import type { WorkflowNode, WorkflowEdge, AuthProvider } from '$lib/types/index.js';

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
		/** Current workflow node (optional, used for template variable API mode) */
		node?: WorkflowNode;
		/** All workflow nodes (optional, used for port-derived variables) */
		nodes?: WorkflowNode[];
		/** All workflow edges (optional, used for port-derived variables) */
		edges?: WorkflowEdge[];
		/** Workflow ID (optional, used for template variable API mode) */
		workflowId?: string;
		/** Auth provider (optional, used for API requests) */
		authProvider?: AuthProvider;
	}

	let {
		fieldKey,
		schema,
		value,
		required = false,
		animationIndex = 0,
		onChange,
		node,
		nodes,
		edges,
		workflowId,
		authProvider
	}: Props = $props();

	/**
	 * When schema.readOnly is true, disable all inputs (no editing).
	 */
	const isReadOnly = $derived(schema.readOnly === true);

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

		// Autocomplete field for format: "autocomplete" with autocomplete.url
		if (schema.format === 'autocomplete' && schema.autocomplete?.url) {
			return 'autocomplete';
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

		// oneOf with labeled options (standard JSON Schema) or legacy options -> select
		// Must be checked before basic type checks since oneOf schemas often have type: 'string'
		if ((schema.oneOf && schema.oneOf.length > 0) || schema.options) {
			return 'select-options';
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
	 * Handles both oneOf (standard) and options (legacy) patterns
	 */
	const selectOptions = $derived(getSchemaOptions(schema));

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

	/**
	 * Get autocomplete value - can be string or string[] based on multiple setting
	 */
	const autocompleteValue = $derived.by((): string | string[] => {
		if (schema.autocomplete?.multiple) {
			if (Array.isArray(value)) {
				return value.map((v) => String(v));
			}
			return value ? [String(value)] : [];
		}
		return String(value ?? '');
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
				disabled={isReadOnly}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'select-enum'}
			<FormSelect
				id={fieldKey}
				value={stringValue}
				options={enumOptions}
				{required}
				ariaDescribedBy={descriptionId}
				disabled={isReadOnly}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'textarea'}
			<FormTextarea
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? ''}
				{required}
				ariaDescribedBy={descriptionId}
				disabled={isReadOnly}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'text'}
			<FormTextField
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? ''}
				{required}
				ariaDescribedBy={descriptionId}
				disabled={isReadOnly}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'number'}
			<FormNumberField
				id={fieldKey}
				value={numberValue}
				placeholder={schema.placeholder ?? ''}
				min={schema.minimum}
				max={schema.maximum}
				step={schema.step}
				{required}
				ariaDescribedBy={descriptionId}
				disabled={isReadOnly}
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
				disabled={isReadOnly}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'toggle'}
			<FormToggle
				id={fieldKey}
				value={booleanValue}
				ariaDescribedBy={descriptionId}
				disabled={isReadOnly}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'select-options'}
			<FormSelect
				id={fieldKey}
				value={stringValue}
				options={selectOptions}
				{required}
				ariaDescribedBy={descriptionId}
				disabled={isReadOnly}
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
				disabled={isReadOnly}
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
				disabled={isReadOnly}
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
				disabled={isReadOnly}
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
				variables={schema.variables}
				placeholderExample={(schema.placeholderExample as string | undefined) ??
					'Hello {{ name }}, your order #{{ order_id }} is ready!'}
				ariaDescribedBy={descriptionId}
				disabled={isReadOnly}
				{node}
				{nodes}
				{edges}
				{workflowId}
				{authProvider}
				onChange={(val) => onChange(val)}
			/>
		{:else if fieldType === 'autocomplete' && schema.autocomplete}
			<FormAutocomplete
				id={fieldKey}
				value={autocompleteValue}
				autocomplete={schema.autocomplete}
				placeholder={schema.placeholder ?? ''}
				{required}
				ariaDescribedBy={descriptionId}
				disabled={isReadOnly}
				onChange={(val) => onChange(val)}
			/>
		{:else}
			<!-- Fallback to text input -->
			<FormTextField
				id={fieldKey}
				value={stringValue}
				placeholder={schema.placeholder ?? ''}
				ariaDescribedBy={descriptionId}
				disabled={isReadOnly}
				onChange={(val) => onChange(val)}
			/>
		{/if}
	</FormFieldWrapper>
{/if}

<style>
	/* Styles moved to individual form components */
</style>
