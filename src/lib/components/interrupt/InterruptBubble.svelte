<!--
  InterruptBubble Component
  
  Container component for rendering interrupt prompts inline in the chat flow.
  Displays the appropriate prompt component based on interrupt type.
  Handles resolve/cancel actions and state management.
  Styled with BEM syntax similar to MessageBubble.
-->

<script lang="ts">
	import Icon from "@iconify/svelte";
	import ConfirmationPrompt from "./ConfirmationPrompt.svelte";
	import ChoicePrompt from "./ChoicePrompt.svelte";
	import TextInputPrompt from "./TextInputPrompt.svelte";
	import FormPrompt from "./FormPrompt.svelte";
	import type {
		Interrupt,
		InterruptType,
		ConfirmationConfig,
		ChoiceConfig,
		TextConfig,
		FormConfig
	} from "../../types/interrupt.js";
	import { interruptActions, submittingInterrupts, interruptErrors } from "../../stores/interruptStore.js";
	import { interruptService } from "../../services/interruptService.js";

	/**
	 * Component props
	 */
	interface Props {
		/** The interrupt to display */
		interrupt: Interrupt;
		/** Whether to show the timestamp */
		showTimestamp?: boolean;
	}

	let { interrupt, showTimestamp = true }: Props = $props();

	/** Whether this interrupt is resolved or cancelled */
	const isResolved = $derived(interrupt.status === "resolved" || interrupt.status === "cancelled");

	/** Whether this interrupt is currently submitting */
	const isSubmitting = $derived($submittingInterrupts.has(interrupt.id));

	/** Error message for this interrupt */
	const error = $derived($interruptErrors.get(interrupt.id));

	/**
	 * Get the icon for the interrupt type
	 */
	function getTypeIcon(type: InterruptType): string {
		switch (type) {
			case "confirmation":
				return "mdi:help-circle";
			case "choice":
				return "mdi:format-list-bulleted";
			case "text":
				return "mdi:text-box";
			case "form":
				return "mdi:form-select";
			default:
				return "mdi:bell";
		}
	}

	/**
	 * Get the label for the interrupt type
	 */
	function getTypeLabel(type: InterruptType): string {
		switch (type) {
			case "confirmation":
				return "Confirmation Required";
			case "choice":
				return "Selection Required";
			case "text":
				return "Input Required";
			case "form":
				return "Form Required";
			default:
				return "Action Required";
		}
	}

	/**
	 * Format timestamp for display
	 */
	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		});
	}

	/**
	 * Handle resolve action
	 */
	async function handleResolve(value: unknown): Promise<void> {
		interruptActions.setSubmitting(interrupt.id, true);
		interruptActions.setError(interrupt.id, null);

		try {
			// Check if service is configured
			if (interruptService.isConfigured()) {
				await interruptService.resolveInterrupt(interrupt.id, value);
			}
			// Update local state
			interruptActions.resolveInterrupt(interrupt.id, value);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to submit response";
			interruptActions.setError(interrupt.id, errorMessage);
			console.error("[InterruptBubble] Resolve error:", err);
		} finally {
			interruptActions.setSubmitting(interrupt.id, false);
		}
	}

	/**
	 * Handle cancel action
	 */
	async function handleCancel(): Promise<void> {
		interruptActions.setSubmitting(interrupt.id, true);
		interruptActions.setError(interrupt.id, null);

		try {
			// Check if service is configured
			if (interruptService.isConfigured()) {
				await interruptService.cancelInterrupt(interrupt.id);
			}
			// Update local state
			interruptActions.cancelInterrupt(interrupt.id);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to cancel";
			interruptActions.setError(interrupt.id, errorMessage);
			console.error("[InterruptBubble] Cancel error:", err);
		} finally {
			interruptActions.setSubmitting(interrupt.id, false);
		}
	}

	// Typed config getters for each prompt type
	const confirmationConfig = $derived(interrupt.config as ConfirmationConfig);
	const choiceConfig = $derived(interrupt.config as ChoiceConfig);
	const textConfig = $derived(interrupt.config as TextConfig);
	const formConfig = $derived(interrupt.config as FormConfig);
</script>

<div
	class="interrupt-bubble"
	class:interrupt-bubble--resolved={isResolved}
	class:interrupt-bubble--submitting={isSubmitting}
>
	<!-- Avatar / Icon -->
	<div class="interrupt-bubble__avatar">
		<Icon icon="mdi:bell-ring" />
	</div>

	<!-- Content -->
	<div class="interrupt-bubble__content">
		<!-- Header -->
		<div class="interrupt-bubble__header">
			<span class="interrupt-bubble__type">
				<Icon icon={getTypeIcon(interrupt.type)} />
				{getTypeLabel(interrupt.type)}
			</span>
			{#if showTimestamp}
				<span class="interrupt-bubble__timestamp">
					{formatTimestamp(interrupt.createdAt)}
				</span>
			{/if}
		</div>

		<!-- Prompt content based on type -->
		<div class="interrupt-bubble__prompt">
			{#if interrupt.type === "confirmation"}
				<ConfirmationPrompt
					config={confirmationConfig}
					{isResolved}
					resolvedValue={interrupt.responseValue as boolean | undefined}
					{isSubmitting}
					{error}
					onConfirm={() => handleResolve(true)}
					onDecline={() => handleResolve(false)}
				/>
			{:else if interrupt.type === "choice"}
				<ChoicePrompt
					config={choiceConfig}
					{isResolved}
					resolvedValue={interrupt.responseValue as string | string[] | undefined}
					{isSubmitting}
					{error}
					onSubmit={(value) => handleResolve(value)}
				/>
			{:else if interrupt.type === "text"}
				<TextInputPrompt
					config={textConfig}
					{isResolved}
					resolvedValue={interrupt.responseValue as string | undefined}
					{isSubmitting}
					{error}
					onSubmit={(value) => handleResolve(value)}
				/>
			{:else if interrupt.type === "form"}
				<FormPrompt
					config={formConfig}
					{isResolved}
					resolvedValue={interrupt.responseValue as Record<string, unknown> | undefined}
					{isSubmitting}
					{error}
					onSubmit={(value) => handleResolve(value)}
				/>
			{/if}
		</div>

		<!-- Cancel button (if allowed and pending) -->
		{#if interrupt.allowCancel && !isResolved && interrupt.type !== "confirmation"}
			<div class="interrupt-bubble__cancel-wrapper">
				<button
					type="button"
					class="interrupt-bubble__cancel-btn"
					onclick={handleCancel}
					disabled={isSubmitting}
				>
					<Icon icon="mdi:close" />
					<span>Cancel</span>
				</button>
			</div>
		{/if}

		<!-- Node info footer -->
		{#if interrupt.nodeId}
			<div class="interrupt-bubble__footer">
				<span class="interrupt-bubble__node" title="Node ID: {interrupt.nodeId}">
					<Icon icon="mdi:graph" />
					<span>From workflow node</span>
				</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.interrupt-bubble {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		margin: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
		border: 1px solid #f59e0b;
		box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
		animation: interruptSlideIn 0.3s ease-out;
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

	.interrupt-bubble--resolved {
		background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
		border-color: #10b981;
		box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
	}

	.interrupt-bubble--submitting {
		opacity: 0.9;
	}

	/* Avatar */
	.interrupt-bubble__avatar {
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background-color: #f59e0b;
		color: #ffffff;
		font-size: 1.125rem;
	}

	.interrupt-bubble--resolved .interrupt-bubble__avatar {
		background-color: #10b981;
	}

	/* Content */
	.interrupt-bubble__content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Header */
	.interrupt-bubble__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.interrupt-bubble__type {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-weight: 600;
		font-size: 0.875rem;
		color: #92400e;
	}

	.interrupt-bubble--resolved .interrupt-bubble__type {
		color: #065f46;
	}

	.interrupt-bubble__timestamp {
		font-size: 0.6875rem;
		color: #b45309;
		font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
	}

	.interrupt-bubble--resolved .interrupt-bubble__timestamp {
		color: #047857;
	}

	/* Prompt */
	.interrupt-bubble__prompt {
		background-color: rgba(255, 255, 255, 0.85);
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid rgba(245, 158, 11, 0.2);
	}

	.interrupt-bubble--resolved .interrupt-bubble__prompt {
		border-color: rgba(16, 185, 129, 0.2);
	}

	/* Cancel button wrapper */
	.interrupt-bubble__cancel-wrapper {
		display: flex;
		justify-content: flex-end;
	}

	.interrupt-bubble__cancel-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		font-family: inherit;
		color: #6b7280;
		background-color: transparent;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.interrupt-bubble__cancel-btn:hover:not(:disabled) {
		color: #dc2626;
		border-color: #fca5a5;
		background-color: #fef2f2;
	}

	.interrupt-bubble__cancel-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Footer */
	.interrupt-bubble__footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(245, 158, 11, 0.2);
	}

	.interrupt-bubble--resolved .interrupt-bubble__footer {
		border-color: rgba(16, 185, 129, 0.2);
	}

	.interrupt-bubble__node {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		color: #92400e;
	}

	.interrupt-bubble--resolved .interrupt-bubble__node {
		color: #065f46;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.interrupt-bubble {
			margin: 0.5rem;
			padding: 0.875rem 1rem;
		}

		.interrupt-bubble__avatar {
			width: 2rem;
			height: 2rem;
			font-size: 1rem;
		}
	}
</style>
