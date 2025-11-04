<!--
  ConfigForm Component
  Generates configuration forms from JSON Schema and manages user values
  Separates schema (form structure) from values (user input)
-->

<script lang="ts">
	import type { ConfigSchema, ConfigProperty, ConfigValues } from '../types/index.js';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		schema: ConfigSchema;
		values: ConfigValues;
		disabled?: boolean;
	}

	let props: Props = $props();
	let dispatch = createEventDispatcher<{
		change: { values: ConfigValues };
		validate: { isValid: boolean; errors: string[] };
	}>();

	// Local copy of values for editing
	let localValues = $state<ConfigValues>({ ...props.values });

	// Validation errors
	let validationErrors = $state<Record<string, string>>({});

	/**
	 * Validate a single field against its schema
	 */
	function validateField(
		fieldName: string,
		value: unknown,
		property: ConfigProperty
	): string | null {
		// Check if schema exists
		if (!props.schema) {
			return null;
		}

		// Required field validation
		if (
			props.schema.required?.includes(fieldName) &&
			(value === null || value === undefined || value === '')
		) {
			return `${property.title || fieldName} is required`;
		}

		// Type validation
		if (value !== null && value !== undefined) {
			switch (property.type) {
				case 'string':
					if (typeof value !== 'string') {
						return `${property.title || fieldName} must be a string`;
					}
					if (property.minLength && value.length < property.minLength) {
						return `${property.title || fieldName} must be at least ${property.minLength} characters`;
					}
					if (property.maxLength && value.length > property.maxLength) {
						return `${property.title || fieldName} must be at most ${property.maxLength} characters`;
					}
					if (property.pattern && !new RegExp(property.pattern).test(value)) {
						return `${property.title || fieldName} format is invalid`;
					}
					break;

				case 'number':
					if (typeof value !== 'number') {
						return `${property.title || fieldName} must be a number`;
					}
					if (property.minimum !== undefined && value < property.minimum) {
						return `${property.title || fieldName} must be at least ${property.minimum}`;
					}
					if (property.maximum !== undefined && value > property.maximum) {
						return `${property.title || fieldName} must be at most ${property.maximum}`;
					}
					break;

				case 'boolean':
					if (typeof value !== 'boolean') {
						return `${property.title || fieldName} must be a boolean`;
					}
					break;

				case 'array':
					if (!Array.isArray(value)) {
						return `${property.title || fieldName} must be an array`;
					}
					break;
			}
		}

		return null;
	}

	/**
	 * Validate all fields
	 */
	function validateForm(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];
		const newValidationErrors: Record<string, string> = {};

		// Check if schema and properties exist
		if (!props.schema || !props.schema.properties || typeof props.schema.properties !== 'object') {
			console.warn('ConfigForm: Invalid schema or properties:', {
				schema: props.schema,
				properties: props.schema?.properties
			});
			return { isValid: true, errors: [] };
		}

		Object.entries(props.schema.properties).forEach(([fieldName, property]) => {
			const value = localValues[fieldName];
			const error = validateField(fieldName, value, property);

			if (error) {
				errors.push(error);
				newValidationErrors[fieldName] = error;
			}
		});

		validationErrors = newValidationErrors;

		const isValid = errors.length === 0;
		dispatch('validate', { isValid, errors });

		return { isValid, errors };
	}

	/**
	 * Handle field value change
	 * Preserves hidden field values from the original configuration
	 */
	function handleFieldChange(fieldName: string, value: unknown): void {
		localValues[fieldName] = value;

		// Validate the changed field
		if (props.schema && props.schema.properties && props.schema.properties[fieldName]) {
			const property = props.schema.properties[fieldName];
			const error = validateField(fieldName, value, property);

			if (error) {
				validationErrors[fieldName] = error;
			} else {
				delete validationErrors[fieldName];
			}
		}

		// Merge hidden field values from original props to ensure they're preserved
		const hiddenFieldValues: ConfigValues = {};
		if (props.schema?.properties) {
			Object.entries(props.schema.properties).forEach(([key, property]) => {
				if (property.format === 'hidden' && key in props.values) {
					hiddenFieldValues[key] = props.values[key];
				}
			});
		}

		// Emit change event with hidden fields preserved
		dispatch('change', { values: { ...localValues, ...hiddenFieldValues } });

		// Validate entire form
		validateForm();
	}

	/**
	 * Get default value for a field
	 */
	function getDefaultValue(property: ConfigProperty): unknown {
		if (property.default !== undefined) {
			return property.default;
		}

		switch (property.type) {
			case 'string':
				// If enum with multiple selection, default to empty array
				if (property.enum && property.multiple) {
					return [];
				}
				return '';
			case 'number':
				return 0;
			case 'boolean':
				return false;
			case 'array':
				return [];
			case 'object':
				return {};
			default:
				return null;
		}
	}

	// Sync local values with props and initialize with defaults
	$effect(() => {
		// Update local values when props change
		localValues = { ...props.values };

		if (props.schema) {
			Object.entries(props.schema.properties).forEach(([fieldName, property]) => {
				if (localValues[fieldName] === undefined) {
					localValues[fieldName] = getDefaultValue(property);
				}
			});

			// Validate on initialization
			validateForm();
		}
	});
</script>

<div class="flowdrop-config-form">
	{#if props.schema && props.schema.properties && typeof props.schema.properties === 'object'}
		<form class="flowdrop-form" onsubmit={(e) => e.preventDefault()}>
			{#each Object.entries(props.schema.properties) as [fieldName, property] (fieldName)}
				{#if property.format === 'hidden'}
					<!-- Hidden field to preserve value -->
					<input
						type="hidden"
						id={fieldName}
						value={typeof (localValues[fieldName] ?? property.default) === 'object'
							? JSON.stringify(localValues[fieldName] ?? property.default ?? {})
							: (localValues[fieldName] ?? property.default ?? '')}
					/>
				{:else}
					<div class="flowdrop-form-field">
						<label class="flowdrop-form-label" for={fieldName}>
							{property.title || fieldName}
							{#if props.schema.required?.includes(fieldName)}
								<span class="flowdrop-form-required">*</span>
							{/if}
						</label>

						{#if property.type === 'string'}
							{#if property.enum && property.multiple}
								<!-- Checkboxes for enum with multiple selection -->
								<div class="flowdrop-form-checkbox-group">
									{#each property.enum as option (option)}
										<label class="flowdrop-form-checkbox">
											<input
												type="checkbox"
												class="flowdrop-form-checkbox__input"
												value={option}
												checked={Array.isArray(localValues[fieldName]) &&
													localValues[fieldName].includes(option)}
												disabled={props.disabled || false}
												onchange={(e) => {
													const checked = (e.target as HTMLInputElement).checked;
													const currentValues = Array.isArray(localValues[fieldName])
														? [...localValues[fieldName]]
														: [];
													if (checked) {
														if (!currentValues.includes(option)) {
															handleFieldChange(fieldName, [...currentValues, option]);
														}
													} else {
														handleFieldChange(
															fieldName,
															currentValues.filter((v) => v !== option)
														);
													}
												}}
											/>
											<span class="flowdrop-form-checkbox__label">{option}</span>
										</label>
									{/each}
								</div>
							{:else if property.enum}
								<!-- Select field for enum with single selection -->
								<select
									id={fieldName}
									class="flowdrop-form-select {validationErrors[fieldName]
										? 'flowdrop-form-select--error'
										: ''}"
									disabled={props.disabled || false}
									onchange={(e) =>
										handleFieldChange(fieldName, (e.target as HTMLSelectElement).value)}
								>
									{#each property.enum as option (option)}
										<option value={option} selected={localValues[fieldName] === option}>
											{option}
										</option>
									{/each}
								</select>
							{:else if property.format === 'multiline' || (property.maxLength && property.maxLength > 100)}
								<!-- Textarea for multiline or long text -->
								<textarea
									id={fieldName}
									class="flowdrop-form-textarea {validationErrors[fieldName]
										? 'flowdrop-form-textarea--error'
										: ''}"
									placeholder={property.description || ''}
									rows="4"
									disabled={props.disabled || false}
									onchange={(e) =>
										handleFieldChange(fieldName, (e.target as HTMLTextAreaElement).value)}
									>{localValues[fieldName] || ''}</textarea
								>
							{:else}
								<!-- Regular text input -->
								<input
									id={fieldName}
									type="text"
									class="flowdrop-form-input {validationErrors[fieldName]
										? 'flowdrop-form-input--error'
										: ''}"
									value={localValues[fieldName] || ''}
									placeholder={property.description || ''}
									disabled={props.disabled || false}
									onchange={(e) =>
										handleFieldChange(fieldName, (e.target as HTMLInputElement).value)}
								/>
							{/if}
						{:else if property.type === 'number'}
							<!-- Number input as text field -->
							<input
								id={fieldName}
								type="text"
								class="flowdrop-form-input {validationErrors[fieldName]
									? 'flowdrop-form-input--error'
									: ''}"
								value={localValues[fieldName] || ''}
								placeholder="Enter a number"
								disabled={props.disabled || false}
								oninput={(e) => {
									const value = (e.target as HTMLInputElement).value;
									const numValue = value === '' ? 0 : parseFloat(value);
									if (!isNaN(numValue)) {
										handleFieldChange(fieldName, numValue);
									}
								}}
								onblur={(e) => {
									const value = (e.target as HTMLInputElement).value;
									const numValue = value === '' ? 0 : parseFloat(value);
									if (!isNaN(numValue)) {
										handleFieldChange(fieldName, numValue);
									}
								}}
							/>
						{:else if property.type === 'boolean'}
							<!-- Checkbox -->
							<label class="flowdrop-form-checkbox">
								<input
									id={fieldName}
									type="checkbox"
									class="flowdrop-form-checkbox__input"
									checked={Boolean(localValues[fieldName])}
									disabled={props.disabled || false}
									onchange={(e) =>
										handleFieldChange(fieldName, (e.target as HTMLInputElement).checked)}
								/>
								<span class="flowdrop-form-checkbox__label">
									{property.description || ''}
								</span>
							</label>
						{:else if property.type === 'array'}
							<!-- Array input (comma-separated) -->
							<textarea
								id={fieldName}
								class="flowdrop-form-textarea {validationErrors[fieldName]
									? 'flowdrop-form-textarea--error'
									: ''}"
								placeholder="Enter values separated by commas"
								rows="3"
								disabled={props.disabled || false}
								onchange={(e) =>
									handleFieldChange(
										fieldName,
										(e.target as HTMLTextAreaElement).value
											.split(',')
											.map((v) => v.trim())
											.filter((v) => v)
									)}
								>{Array.isArray(localValues[fieldName])
									? localValues[fieldName].join(', ')
									: ''}</textarea
							>
						{:else if property.type === 'object'}
							<!-- JSON object input -->
							<textarea
								id={fieldName}
								class="flowdrop-form-textarea {validationErrors[fieldName]
									? 'flowdrop-form-textarea--error'
									: ''}"
								placeholder="Enter JSON object"
								rows="4"
								disabled={props.disabled || false}
								onchange={(e) => {
									try {
										handleFieldChange(
											fieldName,
											JSON.parse((e.target as HTMLTextAreaElement).value)
										);
									} catch {
										// Handle JSON parse error
									}
								}}
								>{typeof localValues[fieldName] === 'object'
									? JSON.stringify(localValues[fieldName], null, 2)
									: ''}</textarea
							>
						{:else}
							<!-- Default text input -->
							<input
								id={fieldName}
								type="text"
								class="flowdrop-form-input {validationErrors[fieldName]
									? 'flowdrop-form-input--error'
									: ''}"
								value={localValues[fieldName] || ''}
								placeholder={property.description || ''}
								disabled={props.disabled || false}
								onchange={(e) => handleFieldChange(fieldName, (e.target as HTMLInputElement).value)}
							/>
						{/if}

						{#if validationErrors[fieldName]}
							<div class="flowdrop-form-error">{validationErrors[fieldName]}</div>
						{/if}

						{#if property.description}
							<div class="flowdrop-form-help">{property.description}</div>
						{/if}
					</div>
				{/if}
			{/each}
		</form>
	{:else}
		<div class="flowdrop-form-empty">
			<p class="flowdrop-text--sm flowdrop-text--gray">
				No configuration schema available for this node.
			</p>
		</div>
	{/if}
</div>

<style>
	.flowdrop-config-form {
		padding: 1rem;
	}

	.flowdrop-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.flowdrop-form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.flowdrop-form-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.flowdrop-form-required {
		color: #dc2626;
		font-weight: 700;
	}

	.flowdrop-form-input,
	.flowdrop-form-textarea,
	.flowdrop-form-select {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background-color: #ffffff;
		transition: all 0.2s ease-in-out;
	}

	.flowdrop-form-input:focus,
	.flowdrop-form-textarea:focus,
	.flowdrop-form-select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.flowdrop-form-input--error,
	.flowdrop-form-textarea--error,
	.flowdrop-form-select--error {
		border-color: #dc2626;
	}

	.flowdrop-form-input--error:focus,
	.flowdrop-form-textarea--error:focus,
	.flowdrop-form-select--error:focus {
		border-color: #dc2626;
		box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
	}

	.flowdrop-form-textarea {
		resize: vertical;
		min-height: 4rem;
	}

	.flowdrop-form-checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.flowdrop-form-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.flowdrop-form-checkbox__input {
		width: 1rem;
		height: 1rem;
		accent-color: #3b82f6;
	}

	.flowdrop-form-checkbox__label {
		font-size: 0.875rem;
		color: #374151;
	}

	.flowdrop-form-error {
		font-size: 0.75rem;
		color: #dc2626;
		margin-top: 0.25rem;
	}

	.flowdrop-form-help {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.flowdrop-form-empty {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}

	.flowdrop-form-input:disabled,
	.flowdrop-form-textarea:disabled,
	.flowdrop-form-select:disabled {
		background-color: #f9fafb;
		color: #9ca3af;
		cursor: not-allowed;
	}
</style>
