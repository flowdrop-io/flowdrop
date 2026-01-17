<!--
  InputCollector Component
  
  Auto-generates input forms from workflow input nodes.
  Supports various field types and pre-fills with defaults.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';
	import type { PlaygroundInputField } from '../../types/playground.js';
	import { inputFields, hasChatInput } from '../../stores/playgroundStore.js';

	/**
	 * Component props
	 */
	interface Props {
		/** Whether the inputs panel is expanded */
		isExpanded?: boolean;
		/** Callback when expansion state changes */
		onToggle?: (expanded: boolean) => void;
		/** Current input values */
		values?: Record<string, unknown>;
		/** Callback when values change */
		onValuesChange?: (values: Record<string, unknown>) => void;
	}

	let {
		isExpanded = $bindable(true),
		onToggle,
		values = $bindable({}),
		onValuesChange
	}: Props = $props();

	/** Flag to track if we've initialized default values */
	let hasInitializedDefaults = false;

	/**
	 * Initialize values from field defaults (runs once when fields are available)
	 */
	$effect(() => {
		// Only initialize once when we have input fields and haven't initialized yet
		if ($inputFields.length > 0 && !hasInitializedDefaults) {
			hasInitializedDefaults = true;

			// Only set values if there are actual defaults to set
			const initialValues: Record<string, unknown> = {};
			let hasDefaults = false;

			$inputFields.forEach((field) => {
				if (field.defaultValue !== undefined) {
					initialValues[`${field.nodeId}:${field.fieldId}`] = field.defaultValue;
					hasDefaults = true;
				}
			});

			if (hasDefaults) {
				values = initialValues;
				onValuesChange?.(values);
			}
		}
	});

	/**
	 * Toggle expansion
	 */
	function toggleExpanded(): void {
		isExpanded = !isExpanded;
		onToggle?.(isExpanded);
	}

	/**
	 * Update a field value
	 */
	function updateValue(field: PlaygroundInputField, value: unknown): void {
		const key = `${field.nodeId}:${field.fieldId}`;
		values = { ...values, [key]: value };
		onValuesChange?.(values);
	}

	/**
	 * Get the current value for a field
	 */
	function getValue(field: PlaygroundInputField): unknown {
		const key = `${field.nodeId}:${field.fieldId}`;
		return values[key] ?? field.defaultValue ?? '';
	}

	/**
	 * Get input type from field schema
	 */
	function getInputType(field: PlaygroundInputField): string {
		if (field.schema?.format === 'multiline') {
			return 'textarea';
		}
		switch (field.type) {
			case 'number':
			case 'integer':
				return 'number';
			case 'boolean':
				return 'checkbox';
			default:
				return 'text';
		}
	}

	/**
	 * Check if field has enum options
	 */
	function hasEnumOptions(field: PlaygroundInputField): boolean {
		return Array.isArray(field.schema?.enum) && field.schema.enum.length > 0;
	}

	/**
	 * Reset all values to defaults
	 */
	function resetToDefaults(): void {
		const defaultValues: Record<string, unknown> = {};
		$inputFields.forEach((field) => {
			if (field.defaultValue !== undefined) {
				defaultValues[`${field.nodeId}:${field.fieldId}`] = field.defaultValue;
			}
		});
		values = defaultValues;
		onValuesChange?.(values);
	}
</script>

{#if $inputFields.length > 0}
	<div class="input-collector" class:input-collector--expanded={isExpanded}>
		<!-- Header -->
		<button
			type="button"
			class="input-collector__header"
			onclick={toggleExpanded}
			aria-expanded={isExpanded}
		>
			<div class="input-collector__title">
				<Icon icon="mdi:form-textbox" />
				<span>Workflow Inputs</span>
				<span class="input-collector__count">{$inputFields.length}</span>
			</div>
			<Icon
				icon="mdi:chevron-down"
				class="input-collector__chevron {isExpanded ? 'input-collector__chevron--expanded' : ''}"
			/>
		</button>

		<!-- Content -->
		{#if isExpanded}
			<div class="input-collector__content" transition:slide={{ duration: 200 }}>
				{#if $hasChatInput}
					<div class="input-collector__hint">
						<Icon icon="mdi:information-outline" />
						<span>Chat input will be collected from the message field below</span>
					</div>
				{/if}

				<div class="input-collector__fields">
					{#each $inputFields as field (field.nodeId + ':' + field.fieldId)}
						<div class="input-collector__field">
							<label class="input-collector__label" for="input-{field.nodeId}-{field.fieldId}">
								{field.label}
								{#if field.required}
									<span class="input-collector__required">*</span>
								{/if}
							</label>

							{#if hasEnumOptions(field)}
								<!-- Select for enum fields -->
								<select
									id="input-{field.nodeId}-{field.fieldId}"
									class="input-collector__select"
									value={getValue(field)}
									onchange={(e) => updateValue(field, e.currentTarget.value)}
								>
									<option value="">Select {field.label}</option>
									{#each field.schema?.enum ?? [] as option}
										<option value={String(option)}>{option}</option>
									{/each}
								</select>
							{:else if getInputType(field) === 'textarea'}
								<!-- Textarea for multiline -->
								<textarea
									id="input-{field.nodeId}-{field.fieldId}"
									class="input-collector__textarea"
									placeholder={field.schema?.description ?? `Enter ${field.label}`}
									value={String(getValue(field) ?? '')}
									oninput={(e) => updateValue(field, e.currentTarget.value)}
									rows="3"
								></textarea>
							{:else if getInputType(field) === 'checkbox'}
								<!-- Checkbox for boolean -->
								<label class="input-collector__checkbox-wrapper">
									<input
										id="input-{field.nodeId}-{field.fieldId}"
										type="checkbox"
										class="input-collector__checkbox"
										checked={Boolean(getValue(field))}
										onchange={(e) => updateValue(field, e.currentTarget.checked)}
									/>
									<span class="input-collector__checkbox-label">
										{field.schema?.description ?? 'Enable'}
									</span>
								</label>
							{:else if getInputType(field) === 'number'}
								<!-- Number input -->
								<input
									id="input-{field.nodeId}-{field.fieldId}"
									type="number"
									class="input-collector__input"
									placeholder={field.schema?.description ?? `Enter ${field.label}`}
									value={Number(getValue(field) ?? 0)}
									min={field.schema?.minimum}
									max={field.schema?.maximum}
									oninput={(e) => updateValue(field, parseFloat(e.currentTarget.value) || 0)}
								/>
							{:else}
								<!-- Text input (default) -->
								<input
									id="input-{field.nodeId}-{field.fieldId}"
									type="text"
									class="input-collector__input"
									placeholder={field.schema?.description ?? `Enter ${field.label}`}
									value={String(getValue(field) ?? '')}
									oninput={(e) => updateValue(field, e.currentTarget.value)}
								/>
							{/if}

							{#if field.schema?.description && getInputType(field) !== 'checkbox'}
								<p class="input-collector__description">{field.schema.description}</p>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Actions -->
				<div class="input-collector__actions">
					<button
						type="button"
						class="input-collector__reset"
						onclick={resetToDefaults}
						title="Reset to default values"
					>
						<Icon icon="mdi:refresh" />
						Reset to Defaults
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.input-collector {
		border-bottom: 1px solid #e2e8f0;
		background-color: #ffffff;
	}

	/* Header */
	.input-collector__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: background-color 0.2s ease-in-out;
	}

	.input-collector__header:hover {
		background-color: #f8fafc;
	}

	.input-collector__title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #1e293b;
	}

	.input-collector__count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.375rem;
		border-radius: 0.625rem;
		font-size: 0.6875rem;
		font-weight: 600;
		background-color: #dbeafe;
		color: #2563eb;
	}

	:global(.input-collector__chevron) {
		transition: transform 0.2s ease-in-out;
		color: #94a3b8;
	}

	:global(.input-collector__chevron--expanded) {
		transform: rotate(180deg);
	}

	/* Content */
	.input-collector__content {
		padding: 0 1rem 1rem;
	}

	.input-collector__hint {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		margin-bottom: 1rem;
		background-color: #dbeafe;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		color: #1d4ed8;
	}

	/* Fields */
	.input-collector__fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.input-collector__field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.input-collector__label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: #374151;
	}

	.input-collector__required {
		color: #dc2626;
	}

	.input-collector__input,
	.input-collector__select,
	.input-collector__textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-family: inherit;
		color: #1e293b;
		background-color: #ffffff;
		transition:
			border-color 0.2s ease-in-out,
			box-shadow 0.2s ease-in-out;
	}

	.input-collector__input:focus,
	.input-collector__select:focus,
	.input-collector__textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.input-collector__input::placeholder,
	.input-collector__textarea::placeholder {
		color: #94a3b8;
	}

	.input-collector__textarea {
		resize: vertical;
		min-height: 80px;
	}

	.input-collector__select {
		cursor: pointer;
	}

	.input-collector__checkbox-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.input-collector__checkbox {
		width: 1rem;
		height: 1rem;
		accent-color: #3b82f6;
		cursor: pointer;
	}

	.input-collector__checkbox-label {
		font-size: 0.875rem;
		color: #64748b;
	}

	.input-collector__description {
		font-size: 0.75rem;
		color: #94a3b8;
		margin: 0;
	}

	/* Actions */
	.input-collector__actions {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #f1f5f9;
	}

	.input-collector__reset {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.375rem;
		background: #ffffff;
		font-size: 0.8125rem;
		color: #64748b;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.input-collector__reset:hover {
		background-color: #f8fafc;
		color: #1e293b;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.input-collector__content {
			padding: 0 0.75rem 0.75rem;
		}
	}
</style>
