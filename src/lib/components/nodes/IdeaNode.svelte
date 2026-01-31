<!--
  Idea Node Component
  A BPMN-like conceptual flow node with card design and configurable ports.
  Allows users to create and chain ideas together without committing to specific node types.
  Supports 4 connection points: left, right, top, and bottom (configurable via checkboxes).
  Styled with BEM syntax
-->

<script lang="ts">
	import { Position, Handle } from '@xyflow/svelte';
	import type { ConfigValues, NodeMetadata } from '../../types/index.js';
	import Icon from '@iconify/svelte';
	import { getDataTypeColor } from '$lib/utils/colors.js';

	/**
	 * IdeaNode component props
	 * Displays a card-style node for conceptual flow diagrams
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

	/**
	 * Instance-specific title override from config.
	 * Falls back to the original label if not set.
	 * This allows users to customize the node title per-instance via config.
	 * Note: Also supports legacy 'title' property for backward compatibility.
	 */
	const displayTitle = $derived(
		(props.data.config?.instanceTitle as string) ||
			(props.data.config?.title as string) ||
			props.data.label ||
			props.data.metadata?.name ||
			'New Idea'
	);

	/**
	 * Instance-specific description override from config.
	 * Falls back to the metadata description if not set.
	 * This allows users to customize the node description per-instance via config.
	 * Note: Also supports legacy 'description' property for backward compatibility.
	 */
	const displayDescription = $derived(
		(props.data.config?.instanceDescription as string) ||
			(props.data.config?.description as string) ||
			props.data.metadata?.description ||
			'Click to add description...'
	);

	/**
	 * Get custom icon from config or metadata, with fallback
	 */
	const ideaIcon = $derived(
		(props.data.config?.icon as string) ||
			(props.data.metadata?.icon as string) ||
			'mdi:lightbulb-outline'
	);

	/**
	 * Get accent color from config or metadata, with fallback
	 */
	const ideaColor = $derived(
		(props.data.config?.color as string) || (props.data.metadata?.color as string) || '#6366f1'
	);

	/**
	 * Port visibility configuration from config
	 * Left and Right are enabled by default, Top and Bottom are disabled by default
	 */
	const enableLeftPort = $derived((props.data.config?.enableLeftPort as boolean) ?? true);
	const enableRightPort = $derived((props.data.config?.enableRightPort as boolean) ?? true);
	const enableTopPort = $derived((props.data.config?.enableTopPort as boolean) ?? false);
	const enableBottomPort = $derived((props.data.config?.enableBottomPort as boolean) ?? false);

	/**
	 * Data type for idea flow connections
	 */
	const IDEA_DATA_TYPE = 'idea';

	/**
	 * Opens the configuration sidebar for editing idea properties
	 */
	function openConfigSidebar(): void {
		if (props.data.onConfigOpen) {
			const nodeForConfig = {
				id: props.data.nodeId || 'unknown',
				type: 'idea',
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
	 * Handle single click - selection handled by SvelteFlow
	 */
	function handleClick(): void {
		// Node selection is handled by Svelte Flow
	}

	/**
	 * Handles keyboard events for accessibility
	 * @param event - The keyboard event
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleDoubleClick();
		}
	}
</script>

<!-- Idea Node -->
<div
	class="flowdrop-idea-node"
	class:flowdrop-idea-node--selected={props.selected}
	class:flowdrop-idea-node--processing={props.isProcessing}
	class:flowdrop-idea-node--error={props.isError}
	style="--idea-accent-color: {ideaColor};"
	onclick={handleClick}
	ondblclick={handleDoubleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
	aria-label="Idea node: {displayTitle}"
>
	<!-- Left Port (Target/Input) -->
	{#if enableLeftPort}
		<Handle
			type="target"
			position={Position.Left}
			style="background-color: {getDataTypeColor(
				IDEA_DATA_TYPE
			)}; border-color: #ffffff; top: 50%; transform: translateY(-50%); z-index: 30;"
			id={`${props.data.nodeId}-input-left`}
		/>
	{/if}

	<!-- Top Port (Target/Input) -->
	{#if enableTopPort}
		<Handle
			type="target"
			position={Position.Top}
			style="background-color: {getDataTypeColor(
				IDEA_DATA_TYPE
			)}; border-color: #ffffff; left: 50%; transform: translateX(-50%); z-index: 30;"
			id={`${props.data.nodeId}-input-top`}
		/>
	{/if}

	<!-- Card Content -->
	<div class="flowdrop-idea-node__card">
		<!-- Accent Bar -->
		<div class="flowdrop-idea-node__accent-bar"></div>

		<!-- Header with icon and title -->
		<div class="flowdrop-idea-node__header">
			<div class="flowdrop-idea-node__icon-wrapper">
				<Icon icon={ideaIcon} class="flowdrop-idea-node__icon" />
			</div>
			<h3 class="flowdrop-idea-node__title">{displayTitle}</h3>
		</div>

		<!-- Description Body -->
		<div class="flowdrop-idea-node__body">
			<p class="flowdrop-idea-node__description">{displayDescription}</p>
		</div>

		<!-- Processing indicator -->
		{#if props.isProcessing}
			<div class="flowdrop-idea-node__processing">
				<div class="flowdrop-idea-node__spinner"></div>
				<span>Processing...</span>
			</div>
		{/if}

		<!-- Error indicator -->
		{#if props.isError}
			<div class="flowdrop-idea-node__error">
				<Icon icon="mdi:alert-circle" class="flowdrop-idea-node__error-icon" />
				<span>Error</span>
			</div>
		{/if}
	</div>

	<!-- Config button -->
	<button class="flowdrop-idea-node__config-btn" onclick={openConfigSidebar} title="Configure idea">
		<Icon icon="mdi:cog" />
	</button>

	<!-- Right Port (Source/Output) -->
	{#if enableRightPort}
		<Handle
			type="source"
			position={Position.Right}
			style="background-color: {getDataTypeColor(
				IDEA_DATA_TYPE
			)}; border-color: #ffffff; top: 50%; transform: translateY(-50%); z-index: 30;"
			id={`${props.data.nodeId}-output-right`}
		/>
	{/if}

	<!-- Bottom Port (Source/Output) -->
	{#if enableBottomPort}
		<Handle
			type="source"
			position={Position.Bottom}
			style="background-color: {getDataTypeColor(
				IDEA_DATA_TYPE
			)}; border-color: #ffffff; left: 50%; transform: translateX(-50%); z-index: 30;"
			id={`${props.data.nodeId}-output-bottom`}
		/>
	{/if}
</div>

<style>
	.flowdrop-idea-node {
		position: relative;
		width: 18rem;
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		z-index: 10;
		color: var(--fd-foreground);
	}

	.flowdrop-idea-node__card {
		background-color: var(--fd-background);
		border-radius: var(--fd-radius-xl);
		border: 1px solid var(--fd-border);
		box-shadow: var(--fd-shadow-md);
		overflow: hidden;
		transition: all var(--fd-transition-normal);
	}

	.flowdrop-idea-node:hover .flowdrop-idea-node__card {
		box-shadow: var(--fd-shadow-lg);
		transform: translateY(-1px);
	}

	.flowdrop-idea-node--selected .flowdrop-idea-node__card {
		border-color: var(--fd-primary);
		box-shadow:
			var(--fd-shadow-lg),
			0 0 0 3px color-mix(in srgb, var(--fd-primary) 30%, transparent);
	}

	.flowdrop-idea-node--processing .flowdrop-idea-node__card {
		opacity: 0.8;
	}

	.flowdrop-idea-node--error .flowdrop-idea-node__card {
		border-color: var(--fd-error) !important;
		background-color: var(--fd-error-muted) !important;
	}

	/* Accent bar at top of card */
	.flowdrop-idea-node__accent-bar {
		height: 4px;
		background-color: var(--idea-accent-color, var(--fd-accent));
		transition: background-color var(--fd-transition-normal);
	}

	/* Header section */
	.flowdrop-idea-node__header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: var(--fd-space-3) var(--fd-space-4) var(--fd-space-2);
	}

	.flowdrop-idea-node__icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background-color: color-mix(
			in srgb,
			var(--idea-accent-color, var(--fd-accent)) 15%,
			transparent
		);
		border-radius: var(--fd-radius-lg);
		flex-shrink: 0;
	}

	:global(.flowdrop-idea-node__icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--fd-node-icon);
	}

	.flowdrop-idea-node__title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--fd-foreground);
		margin: 0;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Body section */
	.flowdrop-idea-node__body {
		padding: 0 var(--fd-space-4) var(--fd-space-3);
	}

	.flowdrop-idea-node__description {
		font-size: 0.8125rem;
		color: var(--fd-muted-foreground);
		margin: 0;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Processing indicator */
	.flowdrop-idea-node__processing {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2);
		padding: var(--fd-space-2) var(--fd-space-4);
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
		border-top: 1px solid var(--fd-border-muted);
	}

	.flowdrop-idea-node__spinner {
		width: 0.875rem;
		height: 0.875rem;
		border: 2px solid var(--fd-border);
		border-top-color: var(--idea-accent-color, var(--fd-accent));
		border-radius: 50%;
		animation: idea-spin 1s linear infinite;
	}

	/* Error indicator */
	.flowdrop-idea-node__error {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2);
		padding: var(--fd-space-2) var(--fd-space-4);
		font-size: var(--fd-text-xs);
		color: var(--fd-error);
		border-top: 1px solid color-mix(in srgb, var(--fd-error) 30%, transparent);
		background-color: var(--fd-error-muted);
	}

	:global(.flowdrop-idea-node__error-icon) {
		width: 0.875rem;
		height: 0.875rem;
	}

	@keyframes idea-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Config button */
	.flowdrop-idea-node__config-btn {
		position: absolute;
		top: 0.625rem;
		right: 0.625rem;
		width: 1.5rem;
		height: 1.5rem;
		background-color: var(--fd-backdrop);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
		color: var(--fd-muted-foreground);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: all var(--fd-transition-normal);
		backdrop-filter: var(--fd-backdrop-blur);
		z-index: 15;
		font-size: var(--fd-text-sm);
	}

	.flowdrop-idea-node:hover .flowdrop-idea-node__config-btn {
		opacity: 1;
	}

	.flowdrop-idea-node__config-btn:hover {
		background-color: var(--fd-muted);
		border-color: var(--fd-border-strong);
		color: var(--fd-foreground);
		transform: scale(1.05);
	}

	/* Handle styles */
	:global(.flowdrop-idea-node .svelte-flow__handle) {
		width: 16px !important;
		height: 16px !important;
		border-radius: 50% !important;
		border: 2px solid #ffffff !important;
		transition: all var(--fd-transition-normal) !important;
		cursor: pointer !important;
		z-index: 20 !important;
		pointer-events: auto !important;
	}

	/* Left handle positioning */
	:global(.flowdrop-idea-node .svelte-flow__handle-left) {
		left: -8px !important;
	}

	/* Right handle positioning */
	:global(.flowdrop-idea-node .svelte-flow__handle-right) {
		right: -8px !important;
	}

	/* Top handle positioning */
	:global(.flowdrop-idea-node .svelte-flow__handle-top) {
		top: -8px !important;
	}

	/* Bottom handle positioning */
	:global(.flowdrop-idea-node .svelte-flow__handle-bottom) {
		bottom: -8px !important;
	}

	/* Handle hover effects */
	:global(.flowdrop-idea-node .svelte-flow__handle-left:hover),
	:global(.flowdrop-idea-node .svelte-flow__handle-right:hover) {
		transform: translateY(-50%) scale(1.2) !important;
	}

	:global(.flowdrop-idea-node .svelte-flow__handle-top:hover),
	:global(.flowdrop-idea-node .svelte-flow__handle-bottom:hover) {
		transform: translateX(-50%) scale(1.2) !important;
	}

	:global(.flowdrop-idea-node .svelte-flow__handle:focus) {
		outline: 2px solid var(--fd-ring) !important;
		outline-offset: 2px !important;
	}

	/* Responsive design */
	@media (max-width: 640px) {
		.flowdrop-idea-node {
			width: 16rem;
		}

		.flowdrop-idea-node__header {
			padding: 0.625rem 0.75rem 0.375rem;
		}

		.flowdrop-idea-node__body {
			padding: 0 0.75rem 0.625rem;
		}

		.flowdrop-idea-node__title {
			font-size: var(--fd-text-sm);
		}

		.flowdrop-idea-node__description {
			font-size: var(--fd-text-xs);
		}
	}
</style>
