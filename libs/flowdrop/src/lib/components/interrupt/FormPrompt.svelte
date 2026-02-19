<!--
  FormPrompt Component
  
  Renders a JSON Schema-based form for form-type interrupts.
  Wraps the existing SchemaForm component for consistent form handling.
  Shows the submitted form data when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import SchemaForm from '../SchemaForm.svelte';
	import type { FormConfig } from '../../types/interrupt.js';

	/**
	 * Component props
	 */
	interface Props {
		/** Form configuration from the interrupt */
		config: FormConfig;
		/** Whether this interrupt has been resolved */
		isResolved: boolean;
		/** The resolved form values if resolved */
		resolvedValue?: Record<string, unknown>;
		/** Whether the form is currently submitting */
		isSubmitting: boolean;
		/** Error message if submission failed */
		error?: string;
		/** Username of the person who resolved the interrupt */
		resolvedByUserName?: string;
		/** Callback when user submits form */
		onSubmit: (value: Record<string, unknown>) => void;
	}

	let {
		config,
		isResolved,
		resolvedValue,
		isSubmitting,
		error,
		resolvedByUserName,
		onSubmit
	}: Props = $props();

	/** Local state for form values */
	let formValues = $state<Record<string, unknown>>(config.defaultValues ?? {});

	/** Display values - either resolved or current form values */
	const displayValues = $derived(isResolved ? (resolvedValue ?? {}) : formValues);

	/**
	 * Handle form value changes
	 */
	function handleChange(values: Record<string, unknown>): void {
		if (isResolved || isSubmitting) return;
		formValues = values;
	}

	/**
	 * Handle form submission
	 */
	function handleSave(values: Record<string, unknown>): void {
		if (isResolved || isSubmitting) return;
		onSubmit(values);
	}

	/**
	 * Format resolved value for display
	 */
	function formatResolvedValue(value: unknown): string {
		if (value === null || value === undefined) return '—';
		if (typeof value === 'boolean') return value ? 'Yes' : 'No';
		if (typeof value === 'object') return JSON.stringify(value, null, 2);
		return String(value);
	}
</script>

<div
	class="form-prompt"
	class:form-prompt--resolved={isResolved}
	class:form-prompt--submitting={isSubmitting}
>
	<!-- Message -->
	<p class="form-prompt__message">{config.message}</p>

	<!-- Error message -->
	{#if error}
		<div class="form-prompt__error">
			<Icon icon="mdi:alert-circle" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Form -->
	{#if !isResolved}
		<div class="form-prompt__form-wrapper">
			<SchemaForm
				schema={config.schema}
				values={formValues}
				onChange={handleChange}
				onSave={handleSave}
				showActions={true}
				saveLabel="Submit"
				cancelLabel=""
				loading={isSubmitting}
				disabled={isResolved}
			/>
		</div>
	{:else}
		<!-- Resolved state: Show submitted values as read-only -->
		<div class="form-prompt__resolved-values">
			<h4 class="form-prompt__resolved-title">Submitted Values</h4>
			<div class="form-prompt__values-list">
				{#each Object.entries(config.schema.properties ?? {}) as [key, field]}
					{@const value = displayValues[key]}
					{@const fieldTitle = ((field as Record<string, unknown>).title as string) ?? key}
					<div class="form-prompt__value-item">
						<span class="form-prompt__value-label">{fieldTitle}</span>
						<span class="form-prompt__value-content">
							{formatResolvedValue(value)}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Resolved indicator -->
	{#if isResolved}
		<div class="form-prompt__resolved-badge">
			<Icon icon="mdi:check-circle" />
			<span>
				{resolvedByUserName ? `Response submitted by ${resolvedByUserName}` : 'Response submitted'}
			</span>
		</div>
	{/if}
</div>

<style>
	/* Uses design tokens from base.css/tokens.css */
	.form-prompt {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.form-prompt--resolved {
		opacity: 0.85;
	}

	.form-prompt--submitting {
		pointer-events: none;
	}

	.form-prompt__message {
		margin: 0;
		font-size: 0.9375rem;
		line-height: 1.5;
		color: var(--fd-foreground);
	}

	.form-prompt__error {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-error-muted);
		border-radius: var(--fd-radius-md);
		color: var(--fd-error);
		font-size: 0.8125rem;
	}

	.form-prompt__form-wrapper {
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		padding: 1rem;
	}

	/* Resolved values - neutral blue theme */
	.form-prompt__resolved-values {
		background-color: var(--fd-primary-muted);
		border: 1px solid var(--fd-interrupt-completed-border);
		border-radius: var(--fd-radius-lg);
		padding: 1rem;
	}

	.form-prompt__resolved-title {
		margin: 0 0 0.75rem 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--fd-interrupt-badge-completed-text);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.form-prompt__values-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-prompt__value-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.form-prompt__value-label {
		font-size: var(--fd-text-xs);
		font-weight: 500;
		color: var(--fd-muted-foreground);
	}

	.form-prompt__value-content {
		font-size: var(--fd-text-sm);
		color: var(--fd-foreground);
		word-break: break-word;
		white-space: pre-wrap;
	}

	/* Resolved badge - neutral blue theme */
	.form-prompt__resolved-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background-color: var(--fd-interrupt-badge-completed-bg);
		border-radius: 9999px;
		color: var(--fd-interrupt-badge-completed-text);
		font-size: 0.75rem;
		font-weight: 500;
		align-self: flex-start;
	}
</style>
