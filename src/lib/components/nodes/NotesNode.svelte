<script lang="ts">
	import type { ConfigValues, NodeMetadata } from "../../types/index.js";
	import Icon from "@iconify/svelte";
	import MarkdownDisplay from "../MarkdownDisplay.svelte";

	/**
	 * NotesNode component props
	 * Displays a styled note with markdown content
	 */
	const props = $props<{
		data: {
			label: string;
			config: ConfigValues;
			metadata: NodeMetadata;
			nodeId?: string;
			onConfigOpen?: (node: {
				id: string;
				type: string;
				data: { label: string; config: ConfigValues; metadata: NodeMetadata };
			}) => void;
		};
		selected?: boolean;
		isProcessing?: boolean;
		isError?: boolean;
	}>();

	/** Note content derived from config */
	const noteContent = $derived(
		(props.data.config?.content as string) || "Add your notes here..."
	);

	/** Note type derived from config */
	const noteType = $derived(
		(props.data.config?.noteType as string) || "info"
	);

	/** Note type configuration with styling for each type */
	const noteTypes = {
		info: {
			name: "Info",
			bgColor: "bg-blue-50",
			borderColor: "border-blue-200",
			textColor: "text-blue-800",
			iconColor: "text-blue-500",
			icon: "mdi:information"
		},
		warning: {
			name: "Warning",
			bgColor: "bg-yellow-50",
			borderColor: "border-yellow-200",
			textColor: "text-yellow-800",
			iconColor: "text-yellow-500",
			icon: "mdi:alert"
		},
		success: {
			name: "Success",
			bgColor: "bg-green-50",
			borderColor: "border-green-200",
			textColor: "text-green-800",
			iconColor: "text-green-500",
			icon: "mdi:check-circle"
		},
		error: {
			name: "Error",
			bgColor: "bg-red-50",
			borderColor: "border-red-200",
			textColor: "text-red-800",
			iconColor: "text-red-500",
			icon: "mdi:close-circle"
		},
		note: {
			name: "Note",
			bgColor: "bg-gray-50",
			borderColor: "border-gray-200",
			textColor: "text-gray-800",
			iconColor: "text-gray-500",
			icon: "mdi:note-text"
		}
	};

	/** Current note type configuration based on selected type */
	const currentType = $derived(
		noteTypes[noteType as keyof typeof noteTypes] || noteTypes.info
	);

	/**
	 * Opens the configuration sidebar for editing note properties
	 */
	function openConfigSidebar(): void {
		if (props.data.onConfigOpen) {
			const nodeForConfig = {
				id: props.data.nodeId || "unknown",
				type: "note",
				data: props.data
			};
			props.data.onConfigOpen(nodeForConfig);
		}
	}

	/**
	 * Handles double-click to open config sidebar
	 */
	function handleDoubleClick(): void {
		openConfigSidebar();
	}

	/**
	 * Handles keyboard events for accessibility
	 * @param event - The keyboard event
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleDoubleClick();
		}
	}
</script>

<div
	class="flowdrop-notes-node {currentType.bgColor}"
	class:flowdrop-notes-node--selected={props.selected}
	class:flowdrop-notes-node--processing={props.isProcessing}
	class:flowdrop-notes-node--error={props.isError}
	ondblclick={handleDoubleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
>
	<!-- Display Mode -->
	<div class="flowdrop-notes-node__content {currentType.borderColor} {currentType.textColor}">
		<!-- Header with icon and type -->
		<div class="flowdrop-notes-node__header">
			<div class="flowdrop-notes-node__header-left">
				<Icon icon={currentType.icon} class="flowdrop-notes-node__icon {currentType.iconColor}" />
				<span class="flowdrop-notes-node__type">{currentType.name}</span>
			</div>
		</div>

		<!-- Rendered markdown content -->
		<div class="flowdrop-notes-node__body">
			<MarkdownDisplay content={noteContent} className="flowdrop-notes-node__markdown" />
		</div>

		<!-- Processing indicator -->
		{#if props.isProcessing}
			<div class="flowdrop-notes-node__processing">
				<div class="flowdrop-notes-node__spinner"></div>
				<span>Processing...</span>
			</div>
		{/if}

		<!-- Error indicator -->
		{#if props.isError}
			<div class="flowdrop-notes-node__error">
				<Icon icon="mdi:alert-circle" class="flowdrop-notes-node__error-icon" />
				<span>Error occurred</span>
			</div>
		{/if}
	</div>

	<!-- Config button -->
	<button
		class="flowdrop-notes-node__config-btn"
		onclick={openConfigSidebar}
		title="Configure note"
	>
		<Icon icon="mdi:cog" />
	</button>
</div>

<style>
	.flowdrop-notes-node {
		min-width: var(--notes-node-min-width);
		max-width: var(--notes-node-max-width);
		width: var(--notes-node-width);
		border-radius: var(--notes-node-border-radius);
		border: 1px solid;
		background: var(--notes-node-background);
		backdrop-filter: var(--notes-node-backdrop-filter);
		box-shadow: var(--notes-node-box-shadow);
		transition: var(--notes-node-transition);
		overflow: hidden;
		z-index: 5;
	}

	/* Background color overrides for different note types */
	.flowdrop-notes-node.bg-blue-50 {
		background-color: var(--notes-node-info-bg);
		border-color: var(--notes-node-info-border);
	}

	.flowdrop-notes-node.bg-yellow-50 {
		background-color: var(--notes-node-warning-bg);
		border-color: var(--notes-node-warning-border);
	}

	.flowdrop-notes-node.bg-green-50 {
		background-color: var(--notes-node-success-bg);
		border-color: var(--notes-node-success-border);
	}

	.flowdrop-notes-node.bg-red-50 {
		background-color: var(--notes-node-error-bg);
		border-color: var(--notes-node-error-border);
	}

	.flowdrop-notes-node.bg-gray-50 {
		background-color: var(--notes-node-note-bg);
		border-color: var(--notes-node-note-border);
	}

	.flowdrop-notes-node:hover {
		box-shadow: var(--notes-node-hover-box-shadow);
		transform: translateY(-1px);
	}

	.flowdrop-notes-node--selected {
		box-shadow: var(--notes-node-selected-box-shadow);
	}

	.flowdrop-notes-node--processing {
		opacity: 0.7;
	}

	.flowdrop-notes-node--error {
		border-color: #ef4444 !important;
	}

	/* Display Mode Styles */
	.flowdrop-notes-node__content {
		padding: var(--notes-node-padding);
		border-radius: var(--notes-node-border-radius);
		border: 1px solid;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.flowdrop-notes-node__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		flex-shrink: 0;
	}

	.flowdrop-notes-node__header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.flowdrop-notes-node__icon {
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
	}

	.flowdrop-notes-node__type {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.flowdrop-notes-node__body {
		margin-bottom: 0.5rem;
		flex: 1;
		overflow-y: auto;
	}

	.flowdrop-notes-node__processing {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.flowdrop-notes-node__spinner {
		width: 0.75rem;
		height: 0.75rem;
		border: 1px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.flowdrop-notes-node__error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #ef4444;
	}

	.flowdrop-notes-node__error-icon {
		width: 0.75rem;
		height: 0.75rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.flowdrop-notes-node__config-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		width: 1.5rem;
		height: 1.5rem;
		background-color: rgba(255, 255, 255, 0.9);
		border: 1px solid #e5e7eb;
		border-radius: 0.25rem;
		color: #6b7280;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: all 0.2s ease-in-out;
		backdrop-filter: blur(4px);
		z-index: 15;
		font-size: 0.875rem;
	}

	.flowdrop-notes-node:hover .flowdrop-notes-node__config-btn {
		opacity: 1;
	}

	.flowdrop-notes-node__config-btn:hover {
		background-color: #f9fafb;
		border-color: #d1d5db;
		color: #374151;
	}

	/* Responsive design */
	@media (max-width: 640px) {
		.flowdrop-notes-node {
			min-width: 200px;
			max-width: 350px;
		}

		.flowdrop-notes-node__content {
			padding: 0.75rem;
		}
	}
</style>
