<!--
  ChoicePrompt Component
  
  Renders a selection prompt for choice-type interrupts.
  Supports single selection (radio buttons) and multiple selection (checkboxes).
  Shows the selected options when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { ChoiceConfig, InterruptChoice } from '../../types/interrupt.js';

	/**
	 * Component props
	 */
	interface Props {
		/** Choice configuration from the interrupt */
		config: ChoiceConfig;
		/** Whether this interrupt has been resolved */
		isResolved: boolean;
		/** The resolved value(s) if resolved */
		resolvedValue?: string | string[];
		/** Whether the form is currently submitting */
		isSubmitting: boolean;
		/** Error message if submission failed */
		error?: string;
		/** Username of the person who resolved the interrupt */
		resolvedByUserName?: string;
		/** Callback when user submits selection */
		onSubmit: (value: string | string[]) => void;
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

	/** Local state for selected values */
	let selectedValues = $state<Set<string>>(new Set());

	/** Whether multiple selection is enabled */
	const isMultiple = $derived(config.multiple ?? false);

	/** Minimum selections required */
	const minSelections = $derived(config.minSelections ?? (isMultiple ? 0 : 1));

	/** Maximum selections allowed */
	const maxSelections = $derived(config.maxSelections ?? (isMultiple ? config.options.length : 1));

	/** Check if submit is valid */
	const isValidSelection = $derived(
		selectedValues.size >= minSelections && selectedValues.size <= maxSelections
	);

	/** Check if an option was selected in resolved state */
	function isOptionResolved(option: InterruptChoice): boolean {
		if (!isResolved || resolvedValue === undefined) return false;
		if (Array.isArray(resolvedValue)) {
			return resolvedValue.includes(option.value);
		}
		return resolvedValue === option.value;
	}

	/**
	 * Handle option selection/deselection
	 */
	function handleOptionChange(option: InterruptChoice, checked: boolean): void {
		if (isResolved || isSubmitting) return;

		const newSelected = new Set(selectedValues);

		if (isMultiple) {
			if (checked) {
				// Check max selections
				if (newSelected.size < maxSelections) {
					newSelected.add(option.value);
				}
			} else {
				newSelected.delete(option.value);
			}
		} else {
			// Single selection - clear and set
			newSelected.clear();
			if (checked) {
				newSelected.add(option.value);
			}
		}

		selectedValues = newSelected;
	}

	/**
	 * Handle form submission
	 */
	function handleSubmit(): void {
		if (!isValidSelection || isResolved || isSubmitting) return;

		const values = Array.from(selectedValues);
		if (isMultiple) {
			onSubmit(values);
		} else {
			onSubmit(values[0] ?? '');
		}
	}
</script>

<div
	class="choice-prompt"
	class:choice-prompt--resolved={isResolved}
	class:choice-prompt--submitting={isSubmitting}
>
	<!-- Message -->
	<p class="choice-prompt__message">{config.message}</p>

	<!-- Error message -->
	{#if error}
		<div class="choice-prompt__error">
			<Icon icon="mdi:alert-circle" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Options -->
	<div class="choice-prompt__options" role={isMultiple ? 'group' : 'radiogroup'}>
		{#each config.options as option (option.value)}
			{@const isChecked = isResolved ? isOptionResolved(option) : selectedValues.has(option.value)}
			<label
				class="choice-prompt__option"
				class:choice-prompt__option--selected={isChecked}
				class:choice-prompt__option--resolved={isResolved && isChecked}
			>
				<input
					type={isMultiple ? 'checkbox' : 'radio'}
					name="choice-option"
					value={option.value}
					checked={isChecked}
					disabled={isResolved || isSubmitting}
					onchange={(e) => handleOptionChange(option, (e.target as HTMLInputElement).checked)}
					class="choice-prompt__input"
				/>
				<span class="choice-prompt__checkmark">
					{#if isChecked}
						<Icon icon={isMultiple ? 'mdi:checkbox-marked' : 'mdi:radiobox-marked'} />
					{:else}
						<Icon icon={isMultiple ? 'mdi:checkbox-blank-outline' : 'mdi:radiobox-blank'} />
					{/if}
				</span>
				<span class="choice-prompt__option-content">
					<span class="choice-prompt__option-label">{option.label}</span>
					{#if option.description}
						<span class="choice-prompt__option-description">{option.description}</span>
					{/if}
				</span>
			</label>
		{/each}
	</div>

	<!-- Selection info for multiple -->
	{#if isMultiple && !isResolved}
		<div class="choice-prompt__info">
			<span>
				{selectedValues.size} of {config.options.length} selected
				{#if minSelections > 0}
					(min: {minSelections})
				{/if}
				{#if maxSelections < config.options.length}
					(max: {maxSelections})
				{/if}
			</span>
		</div>
	{/if}

	<!-- Submit button (only for explicit submission) -->
	{#if !isResolved}
		<div class="choice-prompt__actions">
			<button
				type="button"
				class="choice-prompt__submit"
				onclick={handleSubmit}
				disabled={!isValidSelection || isSubmitting}
			>
				{#if isSubmitting}
					<span class="choice-prompt__spinner"></span>
				{:else}
					<Icon icon="mdi:check" />
				{/if}
				<span>Submit</span>
			</button>
		</div>
	{/if}

	<!-- Resolved indicator -->
	{#if isResolved}
		<div class="choice-prompt__resolved-badge">
			<Icon icon="mdi:check-circle" />
			<span>
				{resolvedByUserName ? `Response submitted by ${resolvedByUserName}` : 'Response submitted'}
			</span>
		</div>
	{/if}
</div>

<style>
	/* Uses design tokens from base.css/tokens.css */
	.choice-prompt {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-md);
	}

	.choice-prompt--resolved {
		opacity: 0.85;
	}

	.choice-prompt--submitting {
		pointer-events: none;
	}

	.choice-prompt__message {
		margin: 0;
		font-size: var(--fd-interrupt-font-message);
		line-height: var(--fd-interrupt-line-height);
		color: var(--fd-foreground);
	}

	.choice-prompt__error {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2xs);
		padding: var(--fd-space-xs) var(--fd-space-md);
		background-color: var(--fd-error-muted);
		border-radius: var(--fd-radius-md);
		color: var(--fd-error);
		font-size: var(--fd-interrupt-font-error);
	}

	.choice-prompt__options {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-xs);
	}

	.choice-prompt__option {
		display: flex;
		align-items: flex-start;
		gap: var(--fd-space-md);
		padding: var(--fd-space-md) var(--fd-space-xl);
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
	}

	.choice-prompt__option:hover:not(.choice-prompt--resolved .choice-prompt__option) {
		background-color: var(--fd-subtle);
		border-color: var(--fd-border-strong);
	}

	.choice-prompt__option--selected {
		background-color: var(--fd-primary-muted);
		border-color: var(--fd-interrupt-completed-border);
	}

	.choice-prompt__option--selected:hover:not(.choice-prompt--resolved .choice-prompt__option) {
		background-color: var(--fd-primary-muted);
	}

	/* Resolved option - neutral blue theme */
	.choice-prompt__option--resolved {
		background-color: var(--fd-primary-muted);
		border-color: var(--fd-interrupt-completed-border);
		cursor: default;
	}

	.choice-prompt--resolved .choice-prompt__option:not(.choice-prompt__option--resolved) {
		opacity: var(--fd-interrupt-not-selected-opacity);
		cursor: default;
	}

	.choice-prompt__input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.choice-prompt__checkmark {
		flex-shrink: 0;
		font-size: 1.25rem;
		color: var(--fd-muted-foreground);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.choice-prompt__option--selected .choice-prompt__checkmark {
		color: var(--fd-interrupt-completed-border);
	}

	.choice-prompt__option--resolved .choice-prompt__checkmark {
		color: var(--fd-interrupt-completed-border);
	}

	.choice-prompt__option-content {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.choice-prompt__option-label {
		font-size: var(--fd-text-sm);
		font-weight: 500;
		color: var(--fd-foreground);
	}

	.choice-prompt__option-description {
		font-size: var(--fd-interrupt-font-error);
		color: var(--fd-muted-foreground);
		line-height: var(--fd-leading-tight);
	}

	.choice-prompt__info {
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
		padding-left: var(--fd-space-3xs);
	}

	.choice-prompt__actions {
		display: flex;
		gap: var(--fd-space-md);
		margin-top: var(--fd-space-3xs);
	}

	.choice-prompt__submit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--fd-space-xs);
		padding: var(--fd-space-sm) var(--fd-space-2xl);
		border-radius: var(--fd-radius-lg);
		font-size: var(--fd-text-sm);
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		border: none;
		min-height: var(--fd-interrupt-btn-min-height);
		background: var(--fd-interrupt-btn-primary-bg);
		color: var(--fd-primary-foreground);
		box-shadow: 0 1px 3px var(--fd-interrupt-btn-primary-shadow);
	}

	.choice-prompt__submit:hover:not(:disabled) {
		background: var(--fd-interrupt-btn-primary-bg-hover);
		box-shadow: 0 4px 12px var(--fd-interrupt-btn-primary-shadow);
		transform: translateY(-1px);
	}

	.choice-prompt__submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.choice-prompt__spinner {
		width: var(--fd-interrupt-spinner-size);
		height: var(--fd-interrupt-spinner-size);
		border: 2px solid var(--fd-border);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: choice-spin 0.6s linear infinite;
	}

	@keyframes choice-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Resolved badge - neutral blue theme */
	.choice-prompt__resolved-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--fd-space-2xs);
		padding: var(--fd-space-2xs) var(--fd-space-md);
		background-color: var(--fd-interrupt-badge-completed-bg);
		border-radius: var(--fd-radius-full);
		color: var(--fd-interrupt-badge-completed-text);
		font-size: var(--fd-text-xs);
		font-weight: 500;
		align-self: flex-start;
	}
</style>
