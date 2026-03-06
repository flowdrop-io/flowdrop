<!--
  SchemaForm Component
  
  A standalone form generator that creates dynamic forms from JSON Schema definitions.
  Designed for external use without coupling to FlowDrop workflow nodes.
  
  Features:
  - Dynamic form generation from JSON Schema
  - Two-way binding with value updates via onChange callback
  - Optional save/cancel action buttons
  - Support for all standard JSON Schema field types
  - Accessible form controls with ARIA attributes
  
  @example
  ```svelte
  <script lang="ts">
    import { SchemaForm } from "flowdrop";
    import type { ConfigSchema } from "flowdrop";

    const schema: ConfigSchema = {
      type: "object",
      properties: {
        name: { type: "string", title: "Name", description: "Enter your name" },
        age: { type: "number", title: "Age", minimum: 0, maximum: 120 },
        active: { type: "boolean", title: "Active", default: true }
      },
      required: ["name"]
    };

    let values = $state({ name: "", age: 25, active: true });

    function handleChange(newValues: Record<string, unknown>) {
      values = newValues;
    }

    function handleSave(finalValues: Record<string, unknown>) {
      // Process saved form values
    }

    function handleCancel() {
      // Handle form cancellation
    }
  </script>

  <SchemaForm
    {schema}
    {values}
    onChange={handleChange}
    showActions={true}
    onSave={handleSave}
    onCancel={handleCancel}
  />
  ```
-->

<script lang="ts">
	import { setContext } from 'svelte';
	import Icon from '@iconify/svelte';
	import type { ConfigSchema, AuthProvider } from '$lib/types/index.js';
	import type { UISchemaElement } from '$lib/types/uischema.js';
	import { FormField } from '$lib/components/form/index.js';
	import FormUISchemaRenderer from '$lib/components/form/FormUISchemaRenderer.svelte';
	import type { FieldSchema } from '$lib/components/form/index.js';

	/**
	 * Props interface for SchemaForm component
	 */
	interface Props {
		/**
		 * JSON Schema definition for the form.
		 * Should follow JSON Schema draft-07 format with type: "object".
		 */
		schema: ConfigSchema;

		/**
		 * Optional UI Schema that controls field layout and grouping.
		 * When provided, fields render according to the UISchema tree structure.
		 * When absent, fields render in flat order from schema.properties.
		 * @see https://jsonforms.io/docs/uischema
		 */
		uiSchema?: UISchemaElement;

		/**
		 * Current form values as key-value pairs.
		 * Keys should correspond to properties defined in the schema.
		 */
		values?: Record<string, unknown>;

		/**
		 * Callback fired whenever any field value changes.
		 * Receives the complete updated values object.
		 * @param values - Updated form values
		 */
		onChange?: (values: Record<string, unknown>) => void;

		/**
		 * Whether to display Save and Cancel action buttons.
		 * @default false
		 */
		showActions?: boolean;

		/**
		 * Label for the save button.
		 * @default "Save"
		 */
		saveLabel?: string;

		/**
		 * Label for the cancel button.
		 * @default "Cancel"
		 */
		cancelLabel?: string;

		/**
		 * Callback fired when the Save button is clicked.
		 * Receives the final form values.
		 * @param values - Final form values
		 */
		onSave?: (values: Record<string, unknown>) => void;

		/**
		 * Callback fired when the Cancel button is clicked.
		 */
		onCancel?: () => void;

		/**
		 * Whether the form is in a loading state.
		 * Disables all inputs when true.
		 * @default false
		 */
		loading?: boolean;

		/**
		 * Whether the form is disabled.
		 * @default false
		 */
		disabled?: boolean;

		/**
		 * Custom CSS class for the form container.
		 */
		class?: string;

		/**
		 * Authentication provider for autocomplete fields.
		 * Used to add authentication headers when fetching suggestions from callback URLs.
		 */
		authProvider?: AuthProvider;

		/**
		 * Base URL for resolving relative autocomplete callback URLs.
		 * @default ""
		 */
		baseUrl?: string;
	}

	let {
		schema,
		uiSchema,
		values = {},
		onChange,
		showActions = false,
		saveLabel = 'Save',
		cancelLabel = 'Cancel',
		onSave,
		onCancel,
		loading = false,
		disabled = false,
		class: className = '',
		authProvider,
		baseUrl = ''
	}: Props = $props();

	// Set context for child components (e.g., FormAutocomplete)
	// Use getter functions to ensure child components always get the current prop value,
	// even if the prop changes after initial mount
	setContext<() => AuthProvider | undefined>('flowdrop:getAuthProvider', () => authProvider);
	setContext<() => string>('flowdrop:getBaseUrl', () => baseUrl);

	/**
	 * Reference to this component's form element
	 */
	let formRef: HTMLFormElement | undefined = $state();

	/**
	 * Internal reactive state for form values
	 */
	let formValues = $state<Record<string, unknown>>({});

	/**
	 * Initialize form values when schema or values change
	 * Merges default values from schema with provided values
	 */
	$effect(() => {
		if (schema?.properties) {
			const mergedValues: Record<string, unknown> = {};
			Object.entries(schema.properties).forEach(([key, field]) => {
				const fieldConfig = field as Record<string, unknown>;
				// Use provided value if available, otherwise use schema default
				mergedValues[key] = values[key] !== undefined ? values[key] : fieldConfig.default;
			});
			formValues = mergedValues;
		}
	});

	/**
	 * Check if a field is required based on schema
	 * @param key - Field key to check
	 * @returns Whether the field is required
	 */
	function isFieldRequired(key: string): boolean {
		if (!schema?.required) {
			return false;
		}
		return schema.required.includes(key);
	}

	/**
	 * Handle field value changes from FormField components
	 * Updates internal state and fires onChange callback
	 * @param key - Field key that changed
	 * @param value - New field value
	 */
	function handleFieldChange(key: string, value: unknown): void {
		formValues[key] = value;

		// Notify parent of the change
		if (onChange) {
			onChange({ ...formValues });
		}
	}

	/**
	 * Handle form submission
	 * Collects all form values and fires onSave callback
	 */
	function handleSave(): void {
		if (loading || disabled) {
			return;
		}

		// Collect all form values including hidden fields
		const updatedValues: Record<string, unknown> = { ...formValues };

		if (formRef) {
			const inputs = formRef.querySelectorAll('input, select, textarea');
			inputs.forEach((input: Element) => {
				const inputEl = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
				if (inputEl.id) {
					if (inputEl instanceof HTMLInputElement && inputEl.type === 'checkbox') {
						updatedValues[inputEl.id] = inputEl.checked;
					} else if (
						inputEl instanceof HTMLInputElement &&
						(inputEl.type === 'number' || inputEl.type === 'range')
					) {
						updatedValues[inputEl.id] = inputEl.value ? Number(inputEl.value) : inputEl.value;
					} else if (inputEl instanceof HTMLInputElement && inputEl.type === 'hidden') {
						// Parse hidden field values that might be JSON
						try {
							const parsed = JSON.parse(inputEl.value);
							updatedValues[inputEl.id] = parsed;
						} catch {
							// If not JSON, use raw value
							updatedValues[inputEl.id] = inputEl.value;
						}
					} else {
						updatedValues[inputEl.id] = inputEl.value;
					}
				}
			});
		}

		// Preserve hidden field values from original values if not collected from form
		if (values && schema?.properties) {
			Object.entries(schema.properties).forEach(
				([key, property]: [string, Record<string, unknown>]) => {
					if (property.format === 'hidden' && !(key in updatedValues) && key in values) {
						updatedValues[key] = values[key];
					}
				}
			);
		}

		if (onSave) {
			onSave(updatedValues);
		}
	}

	/**
	 * Handle cancel action
	 */
	function handleCancel(): void {
		if (onCancel) {
			onCancel();
		}
	}

	/**
	 * Convert ConfigProperty to FieldSchema for FormField component
	 * @param property - Schema property definition
	 * @returns FieldSchema compatible with FormField
	 */
	function toFieldSchema(property: Record<string, unknown>): FieldSchema {
		return property as FieldSchema;
	}
</script>

{#if schema?.properties}
	<form
		bind:this={formRef}
		class="schema-form {className}"
		class:schema-form--loading={loading}
		class:schema-form--disabled={disabled}
		onsubmit={(e) => {
			e.preventDefault();
			handleSave();
		}}
	>
		<div class="schema-form__fields">
			{#if uiSchema}
				<FormUISchemaRenderer
					element={uiSchema}
					{schema}
					values={formValues}
					requiredFields={schema.required ?? []}
					onFieldChange={handleFieldChange}
					{toFieldSchema}
				/>
			{:else}
				{#each Object.entries(schema.properties) as [key, field], index (key)}
					{@const fieldSchema = toFieldSchema(field as Record<string, unknown>)}
					{@const required = isFieldRequired(key)}

					<FormField
						fieldKey={key}
						schema={fieldSchema}
						value={formValues[key]}
						{required}
						animationIndex={index}
						onChange={(val) => handleFieldChange(key, val)}
					/>
				{/each}
			{/if}
		</div>

		{#if showActions}
			<div class="schema-form__footer">
				<button
					type="button"
					class="schema-form__button schema-form__button--secondary"
					onclick={handleCancel}
					disabled={loading}
				>
					<Icon icon="heroicons:x-mark" class="schema-form__button-icon" />
					<span>{cancelLabel}</span>
				</button>
				<button
					type="submit"
					class="schema-form__button schema-form__button--primary"
					disabled={loading || disabled}
				>
					{#if loading}
						<span class="schema-form__button-spinner"></span>
					{:else}
						<Icon icon="heroicons:check" class="schema-form__button-icon" />
					{/if}
					<span>{saveLabel}</span>
				</button>
			</div>
		{/if}
	</form>
{:else}
	<div class="schema-form__empty">
		<div class="schema-form__empty-icon">
			<Icon icon="heroicons:document-text" />
		</div>
		<p class="schema-form__empty-text">No schema properties defined.</p>
	</div>
{/if}

<style>
	/* ============================================
	   SCHEMA FORM - Container Styles
	   ============================================ */

	.schema-form {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-3xl);
	}

	.schema-form--loading,
	.schema-form--disabled {
		opacity: 0.7;
		pointer-events: none;
	}

	.schema-form__fields {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-2xl);
	}

	/* ============================================
	   FOOTER ACTIONS
	   ============================================ */

	.schema-form__footer {
		display: flex;
		gap: var(--fd-space-md);
		justify-content: flex-end;
		padding-top: var(--fd-space-xl);
		border-top: 1px solid var(--fd-border-muted);
		margin-top: var(--fd-space-xs);
	}

	.schema-form__button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--fd-space-xs);
		padding: 0.625rem var(--fd-space-xl);
		border-radius: var(--fd-radius-lg);
		font-size: var(--fd-text-sm);
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		border: 1px solid transparent;
		min-height: 2.5rem;
	}

	.schema-form__button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.schema-form__button :global(svg) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.schema-form__button--secondary {
		background-color: var(--fd-background);
		border-color: var(--fd-border);
		color: var(--fd-foreground);
		box-shadow: var(--fd-shadow-sm);
	}

	.schema-form__button--secondary:hover:not(:disabled) {
		background-color: var(--fd-muted);
		border-color: var(--fd-border-strong);
		color: var(--fd-foreground);
	}

	.schema-form__button--secondary:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.schema-form__button--primary {
		background: linear-gradient(135deg, var(--fd-primary) 0%, var(--fd-primary-hover) 100%);
		color: var(--fd-primary-foreground);
		box-shadow:
			0 1px 3px rgba(59, 130, 246, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.schema-form__button--primary:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--fd-primary-hover) 0%, var(--fd-primary-hover) 100%);
		box-shadow:
			0 4px 12px rgba(59, 130, 246, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	.schema-form__button--primary:active:not(:disabled) {
		transform: translateY(0);
	}

	.schema-form__button--primary:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.4),
			0 4px 12px rgba(59, 130, 246, 0.35);
	}

	.schema-form__button-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: schema-form-spin 0.6s linear infinite;
	}

	@keyframes schema-form-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ============================================
	   EMPTY STATE
	   ============================================ */

	.schema-form__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--fd-space-6xl) var(--fd-space-3xl);
		text-align: center;
	}

	.schema-form__empty-icon {
		width: 3rem;
		height: 3rem;
		margin-bottom: var(--fd-space-xl);
		color: var(--fd-border);
	}

	.schema-form__empty-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.schema-form__empty-text {
		margin: 0;
		font-size: var(--fd-text-sm);
		color: var(--fd-muted-foreground);
		font-style: italic;
		line-height: 1.5;
	}
</style>
