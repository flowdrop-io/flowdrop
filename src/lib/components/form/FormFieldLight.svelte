<!--
  FormFieldLight Component
  Factory component that renders the appropriate field based on schema type.
  
  This is the "light" version that uses the field registry for heavy components
  (code editor, markdown editor, template editor) instead of static imports.
  
  Heavy components are only loaded if registered via:
  - `registerCodeEditorField()` from "@d34dman/flowdrop/form/code"
  - `registerMarkdownEditorField()` from "@d34dman/flowdrop/form/markdown"
  
  Features:
  - Automatically selects the correct field component based on schema
  - Wraps fields with FormFieldWrapper for consistent layout
  - Supports all basic field types (string, number, boolean, checkbox group, range)
  - Uses standard JSON Schema patterns (enum, oneOf) for select fields
  - Heavy editors (code, markdown, template) require explicit registration
  - Shows helpful fallback when heavy editors aren't registered
  
  Type Resolution Order:
  1. Check field registry for custom/heavy components (highest priority)
  2. format: 'hidden' -> skip rendering (return nothing)
  3. enum with multiple: true -> FormCheckboxGroup
  4. enum -> FormSelect (simple values without labels)
  5. oneOf with const/title (labeled options) -> FormSelect
  6. format: 'multiline' -> FormTextarea
  7. format: 'range' (number/integer) -> FormRangeField
  8. type: 'string' -> FormTextField
  9. type: 'number' or 'integer' -> FormNumberField
  10. type: 'boolean' -> FormToggle
  11. type: 'array' -> FormArray
  12. fallback -> FormTextField
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
	import { resolveFieldComponent } from '$lib/form/fieldRegistry.js';
	import { resolvedTheme } from '$lib/stores/settingsStore.js';
	import type { FieldSchema } from './types.js';
	import { getSchemaOptions } from './types.js';

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
	 * Check if there's a registered custom component for this schema
	 */
	const registeredComponent = $derived(resolveFieldComponent(schema));

	/**
	 * Determine the field type to render (for non-registered components)
	 */
	const fieldType = $derived.by(() => {
		// If a custom component is registered, use it
		if (registeredComponent) {
			return 'registered';
		}

		// Hidden fields should not be rendered
		if (schema.format === 'hidden') {
			return 'hidden';
		}

		// Check for heavy editor formats that need registration
		if (schema.format === 'json' || schema.format === 'code') {
			return 'code-editor-fallback';
		}

		if (schema.format === 'markdown') {
			return 'markdown-editor-fallback';
		}

		if (schema.format === 'template') {
			return 'template-editor-fallback';
		}

		// Object type without specific format would use code editor
		if (schema.type === 'object' && !schema.format) {
			return 'code-editor-fallback';
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

		// Array type
		if (schema.type === 'array') {
			return 'array';
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
	 * Get helpful message for missing editor registration
	 */
	function getEditorHint(editorType: string): string {
		switch (editorType) {
			case 'code-editor-fallback':
				return "Code editor requires: import { registerCodeEditorField } from '@d34dman/flowdrop/form/code'; registerCodeEditorField();";
			case 'markdown-editor-fallback':
				return "Markdown editor requires: import { registerMarkdownEditorField } from '@d34dman/flowdrop/form/markdown'; registerMarkdownEditorField();";
			case 'template-editor-fallback':
				return "Template editor requires: import { registerTemplateEditorField } from '@d34dman/flowdrop/form/code'; registerTemplateEditorField();";
			default:
				return 'This field type requires additional registration.';
		}
	}
</script>

{#if fieldType !== 'hidden'}
	<FormFieldWrapper
		id={fieldKey}
		label={fieldLabel}
		{required}
		description={schema.title ? schema.description : undefined}
		{animationDelay}
	>
		{#if fieldType === 'registered' && registeredComponent}
			<!-- Render registered custom component -->
			<!-- darkTheme: use schema value if explicitly set, otherwise derive from resolved theme -->
			<registeredComponent.component
				id={fieldKey}
				{value}
				placeholder={schema.placeholder ?? ''}
				{required}
				ariaDescribedBy={descriptionId}
				height={schema.height as string | undefined}
				darkTheme={schema.darkTheme ?? $resolvedTheme === 'dark'}
				autoFormat={schema.autoFormat as boolean | undefined}
				showToolbar={schema.showToolbar as boolean | undefined}
				showStatusBar={schema.showStatusBar as boolean | undefined}
				spellChecker={schema.spellChecker as boolean | undefined}
				variables={schema.variables}
				variableHints={schema.variableHints as string[] | undefined}
				placeholderExample={schema.placeholderExample as string | undefined}
				onChange={(val: unknown) => onChange(val)}
			/>
		{:else if fieldType === 'checkbox-group'}
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
		{:else if fieldType.endsWith('-fallback')}
			<!-- Fallback for unregistered heavy editors -->
			<div class="form-field-fallback">
				<div class="form-field-fallback__message">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="form-field-fallback__icon"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>Editor component not registered</span>
				</div>
				<p class="form-field-fallback__hint">
					{getEditorHint(fieldType)}
				</p>
				<!-- Provide a basic textarea fallback for editing -->
				<FormTextarea
					id={fieldKey}
					value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
					placeholder={schema.placeholder ?? 'Enter value...'}
					{required}
					ariaDescribedBy={descriptionId}
					onChange={(val) => {
						// Try to parse as JSON for object types
						if (schema.type === 'object' || schema.format === 'json') {
							try {
								onChange(JSON.parse(val));
							} catch {
								onChange(val);
							}
						} else {
							onChange(val);
						}
					}}
				/>
			</div>
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
	.form-field-fallback {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-field-fallback__message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-warning-muted);
		border: 1px solid var(--fd-warning);
		border-radius: var(--fd-radius-md);
		color: var(--fd-warning-hover);
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.form-field-fallback__icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--fd-warning);
	}

	.form-field-fallback__hint {
		margin: 0;
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-size: 0.6875rem;
		line-height: 1.5;
		color: var(--fd-muted-foreground);
		word-break: break-word;
	}
</style>
