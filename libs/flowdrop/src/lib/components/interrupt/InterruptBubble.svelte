<!--
  InterruptBubble Component
  
  Container component for rendering interrupt prompts inline in the chat flow.
  Displays the appropriate prompt component based on interrupt type.
  Handles resolve/cancel actions using state machine for safe transitions.
  Styled with BEM syntax similar to MessageBubble.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import ConfirmationPrompt from './ConfirmationPrompt.svelte';
	import ChoicePrompt from './ChoicePrompt.svelte';
	import TextInputPrompt from './TextInputPrompt.svelte';
	import FormPrompt from './FormPrompt.svelte';
	import ReviewPrompt from './ReviewPrompt.svelte';
	import type {
		Interrupt,
		InterruptType,
		ConfirmationConfig,
		ChoiceConfig,
		TextConfig,
		FormConfig,
		ReviewConfig,
		ReviewResolution
	} from '../../types/interrupt.js';
	import {
		isTerminalState,
		isSubmitting as checkIsSubmitting,
		getErrorMessage,
		getResolvedValue
	} from '../../types/interruptState.js';
	import {
		interrupts,
		interruptActions,
		type InterruptWithState
	} from '../../stores/interruptStore.js';
	import { interruptService } from '../../services/interruptService.js';

	/**
	 * Component props
	 */
	interface Props {
		/** The interrupt to display (initial data, used for ID lookup) */
		interrupt: Interrupt | InterruptWithState;
		/** Whether to show the timestamp */
		showTimestamp?: boolean;
		/** Callback to refresh messages after interrupt resolution */
		onResolved?: () => void;
	}

	let { interrupt: initialInterrupt, showTimestamp = true, onResolved }: Props = $props();

	/**
	 * Get the current interrupt state from the store.
	 * This ensures we react to store updates (like status changes).
	 */
	const currentInterrupt = $derived(
		$interrupts.get(initialInterrupt.id) ?? addMachineState(initialInterrupt)
	);

	/**
	 * Helper to ensure interrupt has machine state
	 */
	function addMachineState(interrupt: Interrupt | InterruptWithState): InterruptWithState {
		if ('machineState' in interrupt) {
			return interrupt;
		}
		return {
			...interrupt,
			machineState: { status: 'idle' }
		};
	}

	/** Whether this interrupt is in a terminal state (resolved or cancelled) */
	const isResolved = $derived(isTerminalState(currentInterrupt.machineState));

	/** Whether this interrupt is currently submitting */
	const isSubmitting = $derived(checkIsSubmitting(currentInterrupt.machineState));

	/** Error message for this interrupt */
	const error = $derived(getErrorMessage(currentInterrupt.machineState));

	/** Resolved value for display */
	const resolvedValue = $derived(getResolvedValue(currentInterrupt.machineState));

	/**
	 * Get the icon for the interrupt type
	 */
	function getTypeIcon(type: InterruptType): string {
		switch (type) {
			case 'confirmation':
				return 'mdi:help-circle';
			case 'choice':
				return 'mdi:format-list-bulleted';
			case 'text':
				return 'mdi:text-box';
			case 'form':
				return 'mdi:form-select';
			case 'review':
				return 'mdi:file-compare';
			default:
				return 'mdi:bell';
		}
	}

	/**
	 * Get the label for the interrupt type
	 */
	function getTypeLabel(type: InterruptType): string {
		switch (type) {
			case 'confirmation':
				return 'Confirmation Required';
			case 'choice':
				return 'Selection Required';
			case 'text':
				return 'Input Required';
			case 'form':
				return 'Form Required';
			case 'review':
				return 'Review Required';
			default:
				return 'Action Required';
		}
	}

	/** Get resolved label for the header when resolved */
	function getResolvedLabel(type: InterruptType): string {
		switch (type) {
			case 'confirmation':
				return 'Confirmation Submitted';
			case 'choice':
				return 'Selection Made';
			case 'text':
				return 'Input Submitted';
			case 'form':
				return 'Form Submitted';
			case 'review':
				return 'Review Submitted';
			default:
				return 'Response Submitted';
		}
	}

	/**
	 * Format timestamp for display
	 */
	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	/**
	 * Handle resolve action using state machine
	 */
	async function handleResolve(value: unknown): Promise<void> {
		// Start the submission - state machine validates this transition
		const startResult = interruptActions.startSubmit(currentInterrupt.id, value);
		if (!startResult.valid) {
			console.warn('[InterruptBubble] Cannot submit:', startResult.error);
			return;
		}

		try {
			// Call API if service is configured
			if (interruptService.isConfigured()) {
				await interruptService.resolveInterrupt(currentInterrupt.id, value);
			}

			// Mark as successful - transitions to resolved state
			interruptActions.submitSuccess(currentInterrupt.id);

			// Notify parent to refresh messages
			onResolved?.();
		} catch (err) {
			// Mark as failed - transitions to error state (can retry)
			const errorMessage = err instanceof Error ? err.message : 'Failed to submit response';
			interruptActions.submitFailure(currentInterrupt.id, errorMessage);
			console.error('[InterruptBubble] Resolve error:', err);
		}
	}

	/**
	 * Handle cancel action using state machine
	 */
	async function handleCancel(): Promise<void> {
		// Start the cancel - state machine validates this transition
		const startResult = interruptActions.startCancel(currentInterrupt.id);
		if (!startResult.valid) {
			console.warn('[InterruptBubble] Cannot cancel:', startResult.error);
			return;
		}

		try {
			// Call API if service is configured
			if (interruptService.isConfigured()) {
				await interruptService.cancelInterrupt(currentInterrupt.id);
			}

			// Mark as successful - transitions to cancelled state
			interruptActions.submitSuccess(currentInterrupt.id);

			// Notify parent to refresh messages
			onResolved?.();
		} catch (err) {
			// Mark as failed - transitions to error state (can retry)
			const errorMessage = err instanceof Error ? err.message : 'Failed to cancel';
			interruptActions.submitFailure(currentInterrupt.id, errorMessage);
			console.error('[InterruptBubble] Cancel error:', err);
		}
	}

	/**
	 * Handle retry after error
	 */
	function handleRetry(): void {
		interruptActions.retry(currentInterrupt.id);
	}

	// Typed config getters for each prompt type
	const confirmationConfig = $derived(currentInterrupt.config as ConfirmationConfig);
	const choiceConfig = $derived(currentInterrupt.config as ChoiceConfig);
	const textConfig = $derived(currentInterrupt.config as TextConfig);
	const formConfig = $derived(currentInterrupt.config as FormConfig);
	const reviewConfig = $derived(currentInterrupt.config as ReviewConfig);

	// Determine the actual resolved value to pass to prompt components
	const displayResolvedValue = $derived(resolvedValue ?? currentInterrupt.responseValue);

	/**
	 * Extract the username of who resolved the interrupt from metadata.
	 * This is provided by the backend when the interrupt is resolved.
	 */
	const resolvedByUserName = $derived(
		typeof currentInterrupt.metadata?.resolvedByUserName === 'string'
			? currentInterrupt.metadata.resolvedByUserName
			: undefined
	);
</script>

<div
	class="interrupt-bubble"
	class:interrupt-bubble--completed={currentInterrupt.machineState.status === 'resolved'}
	class:interrupt-bubble--cancelled={currentInterrupt.machineState.status === 'cancelled'}
	class:interrupt-bubble--submitting={isSubmitting}
	class:interrupt-bubble--error={currentInterrupt.machineState.status === 'error'}
>
	<!-- Header -->
	<div class="interrupt-bubble__header">
		<span class="interrupt-bubble__type">
			<Icon icon={getTypeIcon(currentInterrupt.type)} />
			{#if isResolved}
				{currentInterrupt.machineState.status === 'cancelled'
					? 'Cancelled'
					: getResolvedLabel(currentInterrupt.type)}
			{:else if currentInterrupt.machineState.status === 'error'}
				Error - Click to Retry
			{:else}
				{getTypeLabel(currentInterrupt.type)}
			{/if}
		</span>
		{#if showTimestamp}
			<span class="interrupt-bubble__timestamp">
				{formatTimestamp(currentInterrupt.resolvedAt ?? currentInterrupt.createdAt)}
			</span>
		{/if}
	</div>

	<!-- Error message with retry button -->
	{#if currentInterrupt.machineState.status === 'error'}
		<div class="interrupt-bubble__error">
			<Icon icon="mdi:alert-circle" />
			<span>{error}</span>
			<button type="button" class="interrupt-bubble__retry-btn" onclick={handleRetry}>
				<Icon icon="mdi:refresh" />
				Retry
			</button>
		</div>
	{/if}

	<!-- Prompt content based on type -->
	<div class="interrupt-bubble__body">
		{#if currentInterrupt.type === 'confirmation'}
			<ConfirmationPrompt
				config={confirmationConfig}
				{isResolved}
				resolvedValue={displayResolvedValue as boolean | undefined}
				{isSubmitting}
				{error}
				{resolvedByUserName}
				onConfirm={() => handleResolve(true)}
				onDecline={() => handleResolve(false)}
			/>
		{:else if currentInterrupt.type === 'choice'}
			<ChoicePrompt
				config={choiceConfig}
				{isResolved}
				resolvedValue={displayResolvedValue as string | string[] | undefined}
				{isSubmitting}
				{error}
				{resolvedByUserName}
				onSubmit={(value) => handleResolve(value)}
			/>
		{:else if currentInterrupt.type === 'text'}
			<TextInputPrompt
				config={textConfig}
				{isResolved}
				resolvedValue={displayResolvedValue as string | undefined}
				{isSubmitting}
				{error}
				{resolvedByUserName}
				onSubmit={(value) => handleResolve(value)}
			/>
		{:else if currentInterrupt.type === 'form'}
			<FormPrompt
				config={formConfig}
				{isResolved}
				resolvedValue={displayResolvedValue as Record<string, unknown> | undefined}
				{isSubmitting}
				{error}
				{resolvedByUserName}
				onSubmit={(value) => handleResolve(value)}
			/>
		{:else if currentInterrupt.type === 'review'}
			<ReviewPrompt
				config={reviewConfig}
				{isResolved}
				resolvedValue={displayResolvedValue as ReviewResolution | undefined}
				{isSubmitting}
				{error}
				{resolvedByUserName}
				onSubmit={(value) => handleResolve(value)}
			/>
		{/if}
	</div>

	<!-- Footer -->
	{#if currentInterrupt.nodeId || (currentInterrupt.allowCancel && !isResolved && currentInterrupt.type !== 'confirmation')}
		<div class="interrupt-bubble__footer">
			{#if currentInterrupt.nodeId}
				<span class="interrupt-bubble__node" title="Node ID: {currentInterrupt.nodeId}">
					<Icon icon="mdi:graph" />
					<span>From workflow node</span>
				</span>
			{/if}
			{#if currentInterrupt.allowCancel && !isResolved && currentInterrupt.type !== 'confirmation'}
				<button
					type="button"
					class="interrupt-bubble__cancel-btn"
					onclick={handleCancel}
					disabled={isSubmitting}
				>
					<Icon icon="mdi:close" />
					<span>Cancel</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Uses design tokens from base.css: --fd-interrupt-* */
	.interrupt-bubble {
		display: flex;
		flex-direction: column;
		margin: var(--fd-space-md) var(--fd-space-xl);
		border-radius: var(--fd-radius-xl);
		background-color: var(--fd-interrupt-prompt-bg);
		border: 1px solid var(--fd-interrupt-prompt-border-pending);
		box-shadow: 0 2px 8px var(--fd-interrupt-pending-shadow);
		animation: interruptSlideIn 0.3s ease-out;
		overflow: hidden;
	}

	@keyframes interruptSlideIn {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* State border colors */
	.interrupt-bubble--completed {
		border-color: var(--fd-interrupt-prompt-border-completed);
		box-shadow: 0 2px 8px var(--fd-interrupt-completed-shadow);
	}

	.interrupt-bubble--cancelled {
		border-color: var(--fd-interrupt-prompt-border-cancelled);
		box-shadow: 0 2px 8px var(--fd-interrupt-cancelled-shadow);
	}

	.interrupt-bubble--error {
		border-color: var(--fd-interrupt-prompt-border-error);
		box-shadow: 0 2px 8px var(--fd-interrupt-error-shadow);
	}

	.interrupt-bubble--submitting {
		opacity: 0.9;
	}

	/* Header */
	.interrupt-bubble__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--fd-space-xs);
		padding: var(--fd-space-md) var(--fd-space-xl);
		background: var(--fd-interrupt-pending-bg);
		border-bottom: 1px solid var(--fd-interrupt-prompt-border-pending);
	}

	.interrupt-bubble--completed .interrupt-bubble__header {
		background: var(--fd-interrupt-completed-bg);
		border-bottom-color: var(--fd-interrupt-prompt-border-completed);
	}

	.interrupt-bubble--cancelled .interrupt-bubble__header {
		background: var(--fd-interrupt-cancelled-bg);
		border-bottom-color: var(--fd-interrupt-prompt-border-cancelled);
	}

	.interrupt-bubble--error .interrupt-bubble__header {
		background: var(--fd-interrupt-error-bg);
		border-bottom-color: var(--fd-interrupt-prompt-border-error);
	}

	.interrupt-bubble__type {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2xs);
		font-weight: 600;
		font-size: var(--fd-text-sm);
		color: var(--fd-interrupt-pending-text);
	}

	.interrupt-bubble--completed .interrupt-bubble__type {
		color: var(--fd-interrupt-completed-text);
	}

	.interrupt-bubble--cancelled .interrupt-bubble__type {
		color: var(--fd-interrupt-cancelled-text);
	}

	.interrupt-bubble--error .interrupt-bubble__type {
		color: var(--fd-interrupt-error-text);
	}

	.interrupt-bubble__timestamp {
		font-size: var(--fd-text-2xs);
		color: var(--fd-interrupt-pending-text-light);
		font-family: var(--fd-font-mono);
	}

	.interrupt-bubble--completed .interrupt-bubble__timestamp {
		color: var(--fd-interrupt-completed-text-light);
	}

	.interrupt-bubble--cancelled .interrupt-bubble__timestamp {
		color: var(--fd-interrupt-cancelled-text-light);
	}

	.interrupt-bubble--error .interrupt-bubble__timestamp {
		color: var(--fd-interrupt-error-text-light);
	}

	/* Error message */
	.interrupt-bubble__error {
		display: flex;
		align-items: center;
		gap: var(--fd-space-xs);
		margin: var(--fd-space-md) var(--fd-space-xl) 0;
		padding: var(--fd-space-xs) var(--fd-space-md);
		background-color: var(--fd-error-muted);
		border-radius: var(--fd-radius-md);
		color: var(--fd-interrupt-error-text);
		font-size: var(--fd-interrupt-font-error);
	}

	.interrupt-bubble__retry-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--fd-space-3xs);
		margin-left: auto;
		padding: var(--fd-space-3xs) var(--fd-space-xs);
		font-size: var(--fd-text-xs);
		font-weight: 500;
		font-family: inherit;
		color: var(--fd-error-foreground);
		background-color: var(--fd-interrupt-error-avatar);
		border: none;
		border-radius: var(--fd-radius-sm);
		cursor: pointer;
		transition: background-color var(--fd-transition-fast);
	}

	.interrupt-bubble__retry-btn:hover {
		background-color: var(--fd-error-hover);
	}

	/* Body - prompt content area, full width */
	.interrupt-bubble__body {
		padding: var(--fd-space-xl);
	}

	.interrupt-bubble--cancelled .interrupt-bubble__body {
		opacity: 0.75;
	}

	/* Desaturate body content in error state to reduce visual noise from green/red colors */
	.interrupt-bubble--error .interrupt-bubble__body {
		filter: saturate(0.2);
		opacity: 0.7;
	}

	/* Footer */
	.interrupt-bubble__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--fd-space-xs);
		padding: var(--fd-space-md) var(--fd-space-xl);
		background: var(--fd-interrupt-pending-bg);
		border-top: 1px solid var(--fd-interrupt-prompt-border-pending);
	}

	.interrupt-bubble--completed .interrupt-bubble__footer {
		background: var(--fd-interrupt-completed-bg);
		border-top-color: var(--fd-interrupt-prompt-border-completed);
	}

	.interrupt-bubble--cancelled .interrupt-bubble__footer {
		background: var(--fd-interrupt-cancelled-bg);
		border-top-color: var(--fd-interrupt-prompt-border-cancelled);
	}

	.interrupt-bubble--error .interrupt-bubble__footer {
		background: var(--fd-interrupt-error-bg);
		border-top-color: var(--fd-interrupt-prompt-border-error);
	}

	.interrupt-bubble__node {
		display: flex;
		align-items: center;
		gap: var(--fd-space-3xs);
		font-size: var(--fd-text-2xs);
		color: var(--fd-muted-foreground);
	}

	.interrupt-bubble__cancel-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--fd-space-2xs);
		margin-left: auto;
		padding: var(--fd-space-2xs) var(--fd-space-md);
		font-size: var(--fd-text-xs);
		font-weight: 500;
		font-family: inherit;
		color: var(--fd-muted-foreground);
		background-color: transparent;
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
	}

	.interrupt-bubble__cancel-btn:hover:not(:disabled) {
		color: var(--fd-error);
		border-color: var(--fd-error);
		background-color: var(--fd-error-muted);
	}

	.interrupt-bubble__cancel-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.interrupt-bubble {
			margin: var(--fd-space-xs);
		}

		.interrupt-bubble__header,
		.interrupt-bubble__body,
		.interrupt-bubble__footer {
			padding-left: var(--fd-space-lg);
			padding-right: var(--fd-space-lg);
		}
	}
</style>
