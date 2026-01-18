<!--
  PlaygroundModal Component
  
  Modal wrapper for the Playground component.
  Provides a centered modal dialog with backdrop, similar to Langflow's implementation.
  Supports closing via backdrop click, Escape key, or close button.
-->

<script lang="ts">
	import Icon from "@iconify/svelte";
	import Playground from "./Playground.svelte";
	import type { Workflow } from "../../types/index.js";
	import type { EndpointConfig } from "../../config/endpoints.js";
	import type { PlaygroundConfig } from "../../types/playground.js";

	/**
	 * Component props
	 */
	interface Props {
		/** Whether the modal is open */
		isOpen: boolean;
		/** Target workflow ID */
		workflowId: string;
		/** Pre-loaded workflow (optional, will be fetched if not provided) */
		workflow?: Workflow;
		/** Resume a specific session */
		initialSessionId?: string;
		/** API endpoint configuration */
		endpointConfig?: EndpointConfig;
		/** Playground configuration options */
		config?: PlaygroundConfig;
		/** Callback when modal is closed */
		onClose: () => void;
	}

	let {
		isOpen,
		workflowId,
		workflow,
		initialSessionId,
		endpointConfig,
		config = {},
		onClose
	}: Props = $props();

	/**
	 * Close modal on Escape key
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === "Escape") {
			onClose();
		}
	}

	/**
	 * Close modal when clicking outside (on backdrop)
	 */
	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="playground-modal-backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="playground-modal-title"
		tabindex="-1"
	>
		<!-- Modal Container -->
		<div class="playground-modal" onclick={(e) => e.stopPropagation()}>
			<!-- Modal Header -->
			<div class="playground-modal__header">
				<div class="playground-modal__title" id="playground-modal-title">
					<Icon icon="mdi:play-circle-outline" />
					<span>Playground</span>
				</div>
				<button
					type="button"
					class="playground-modal__close-btn"
					onclick={onClose}
					aria-label="Close playground modal"
				>
					<Icon icon="mdi:close" />
				</button>
			</div>

			<!-- Modal Content -->
			<div class="playground-modal__content">
				<Playground
					{workflowId}
					{workflow}
					mode="modal"
					{initialSessionId}
					{endpointConfig}
					{config}
					{onClose}
				/>
			</div>
		</div>
	</div>
{/if}

<style>
	.playground-modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1100;
		padding: 1rem;
	}

	.playground-modal {
		background: white;
		border-radius: 0.75rem;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		width: 100%;
		max-width: 90vw;
		min-width: 800px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.playground-modal__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #e5e7eb;
		background-color: #fafbfc;
		flex-shrink: 0;
	}

	.playground-modal__title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.playground-modal__close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		background: transparent;
		border-radius: 0.375rem;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s;
	}

	.playground-modal__close-btn:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	.playground-modal__content {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 0;
	}

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.playground-modal {
			max-width: 95vw;
			min-width: 600px;
		}
	}

	@media (max-width: 768px) {
		.playground-modal {
			max-width: 100%;
			min-width: auto;
			max-height: 100vh;
			border-radius: 0;
			margin: 0;
		}

		.playground-modal-backdrop {
			padding: 0;
		}

		.playground-modal__header {
			padding: 0.875rem 1rem;
		}
	}

	@media (max-width: 640px) {
		.playground-modal {
			max-width: 100%;
			max-height: 100vh;
		}
	}
</style>
