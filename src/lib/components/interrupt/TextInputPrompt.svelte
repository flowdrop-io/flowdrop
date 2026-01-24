<!--
  TextInputPrompt Component
  
  Renders a text input prompt for text-type interrupts.
  Supports single-line input and multiline textarea.
  Shows the entered text when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from "@iconify/svelte";
	import type { TextConfig } from "../../types/interrupt.js";

	/**
	 * Component props
	 */
	interface Props {
		/** Text configuration from the interrupt */
		config: TextConfig;
		/** Whether this interrupt has been resolved */
		isResolved: boolean;
		/** The resolved value if resolved */
		resolvedValue?: string;
		/** Whether the form is currently submitting */
		isSubmitting: boolean;
		/** Error message if submission failed */
		error?: string;
		/** Callback when user submits text */
		onSubmit: (value: string) => void;
	}

	let {
		config,
		isResolved,
		resolvedValue,
		isSubmitting,
		error,
		onSubmit
	}: Props = $props();

	/** Local state for input value */
	let inputValue = $state(config.defaultValue ?? "");

	/** Display value - either resolved or current input */
	const displayValue = $derived(isResolved ? (resolvedValue ?? "") : inputValue);

	/** Whether the input is multiline */
	const isMultiline = $derived(config.multiline ?? false);

	/** Character count */
	const charCount = $derived(inputValue.length);

	/** Check if input is valid */
	const isValidInput = $derived(() => {
		const len = inputValue.length;
		if (config.minLength !== undefined && len < config.minLength) return false;
		if (config.maxLength !== undefined && len > config.maxLength) return false;
		return len > 0;
	});

	/**
	 * Handle input change
	 */
	function handleInput(event: Event): void {
		if (isResolved || isSubmitting) return;
		const target = event.target as HTMLInputElement | HTMLTextAreaElement;
		inputValue = target.value;
	}

	/**
	 * Handle form submission
	 */
	function handleSubmit(): void {
		if (!isValidInput() || isResolved || isSubmitting) return;
		onSubmit(inputValue);
	}

	/**
	 * Handle Enter key for single-line input
	 */
	function handleKeyDown(event: KeyboardEvent): void {
		if (event.key === "Enter" && !isMultiline && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	}
</script>

<div
	class="text-prompt"
	class:text-prompt--resolved={isResolved}
	class:text-prompt--submitting={isSubmitting}
>
	<!-- Message -->
	<p class="text-prompt__message">{config.message}</p>

	<!-- Error message -->
	{#if error}
		<div class="text-prompt__error">
			<Icon icon="mdi:alert-circle" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Input field -->
	<div class="text-prompt__input-wrapper">
		{#if isMultiline}
			<textarea
				class="text-prompt__textarea"
				class:text-prompt__textarea--resolved={isResolved}
				value={displayValue}
				placeholder={config.placeholder ?? "Enter your response..."}
				disabled={isResolved || isSubmitting}
				oninput={handleInput} 
				onkeydown={handleKeyDown}
				rows={4}
				minlength={config.minLength}
				maxlength={config.maxLength}
			></textarea>
		{:else}
			<input
				type="text"
				class="text-prompt__input"
				class:text-prompt__input--resolved={isResolved}
				value={displayValue}
				placeholder={config.placeholder ?? "Enter your response..."}
				disabled={isResolved || isSubmitting}
				oninput={handleInput}
				onkeydown={handleKeyDown}
				minlength={config.minLength}
				maxlength={config.maxLength}
			/>
		{/if}
	</div>

	<!-- Character count -->
	{#if !isResolved && (config.minLength !== undefined || config.maxLength !== undefined)}
		<div class="text-prompt__char-count">
			<span class:text-prompt__char-count--warning={config.maxLength !== undefined && charCount > config.maxLength * 0.9}>
				{charCount}
				{#if config.maxLength !== undefined}
					/ {config.maxLength}
				{/if}
				{#if config.minLength !== undefined}
					(min: {config.minLength})
				{/if}
			</span>
		</div>
	{/if}

	<!-- Submit button -->
	{#if !isResolved}
		<div class="text-prompt__actions">
			<button
				type="button"
				class="text-prompt__submit"
				onclick={handleSubmit}
				disabled={!isValidInput() || isSubmitting}
			>
				{#if isSubmitting}
					<span class="text-prompt__spinner"></span>
				{:else}
					<Icon icon="mdi:send" />
				{/if}
				<span>Submit</span>
			</button>
		</div>
	{/if}

	<!-- Resolved indicator -->
	{#if isResolved}
		<div class="text-prompt__resolved-badge">
			<Icon icon="mdi:check-circle" />
			<span>Response submitted</span>
		</div>
	{/if}
</div>

<style>
	.text-prompt {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.text-prompt--resolved {
		opacity: 0.85;
	}

	.text-prompt--submitting {
		pointer-events: none;
	}

	.text-prompt__message {
		margin: 0;
		font-size: 0.9375rem;
		line-height: 1.5;
		color: #1f2937;
	}

	.text-prompt__error {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		background-color: #fef2f2;
		border-radius: 0.375rem;
		color: #dc2626;
		font-size: 0.8125rem;
	}

	.text-prompt__input-wrapper {
		display: flex;
		flex-direction: column;
	}

	.text-prompt__input,
	.text-prompt__textarea {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.9375rem;
		font-family: inherit;
		line-height: 1.5;
		color: #1f2937;
		background-color: #ffffff;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		outline: none;
		transition: all 0.15s ease;
	}

	.text-prompt__input::placeholder,
	.text-prompt__textarea::placeholder {
		color: #9ca3af;
	}

	.text-prompt__input:focus,
	.text-prompt__textarea:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.text-prompt__input:disabled,
	.text-prompt__textarea:disabled {
		background-color: #f9fafb;
		cursor: not-allowed;
	}

	.text-prompt__input--resolved,
	.text-prompt__textarea--resolved {
		background-color: #ecfdf5;
		border-color: #10b981;
	}

	.text-prompt__textarea {
		resize: vertical;
		min-height: 100px;
	}

	.text-prompt__char-count {
		font-size: 0.75rem;
		color: #6b7280;
		text-align: right;
		padding-right: 0.25rem;
	}

	.text-prompt__char-count--warning {
		color: #f59e0b;
	}

	.text-prompt__actions {
		display: flex;
		gap: 0.75rem;
	}

	.text-prompt__submit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		border: none;
		min-height: 2.5rem;
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		color: #ffffff;
		box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
	}

	.text-prompt__submit:hover:not(:disabled) {
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
		transform: translateY(-1px);
	}

	.text-prompt__submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.text-prompt__spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: text-spin 0.6s linear infinite;
	}

	@keyframes text-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.text-prompt__resolved-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background-color: #ecfdf5;
		border-radius: 9999px;
		color: #059669;
		font-size: 0.75rem;
		font-weight: 500;
		align-self: flex-start;
	}
</style>
