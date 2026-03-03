<!--
  Tool Node Component
  A specialized node for tools with metadata port
  Styled with BEM syntax
-->

<script lang="ts">
	import { Position, Handle } from '@xyflow/svelte';
	import Icon from '@iconify/svelte';
	import { getDataTypeColor } from '$lib/utils/colors';
	import type { NodeMetadata, NodePort } from '../../types/index.js';

	interface ToolNodeParameter {
		name: string;
		type?: string;
		description?: string;
	}

	const props = $props<{
		data: {
			label: string;
			config: {
				icon?: string;
				color?: string;
				toolName?: string;
				toolDescription?: string;
				toolVersion?: string;
				parameters?: ToolNodeParameter[];
			};
			metadata: NodeMetadata;
			nodeId?: string;
			onConfigOpen?: (node: {
				id: string;
				type: string;
				data: { label: string; config: Record<string, unknown>; metadata: NodeMetadata };
			}) => void;
		};
		selected?: boolean;
		isProcessing?: boolean;
		isError?: boolean;
	}>();

	// Prioritize metadata over config for tool nodes (metadata is the node definition)
	let toolIcon = $derived(
		(props.data.metadata?.icon as string) || (props.data.config?.icon as string) || 'mdi:tools'
	);
	let toolColor = $derived(
		(props.data.metadata?.color as string) || (props.data.config?.color as string) || '#f59e0b'
	);

	/**
	 * Instance-specific title override from config.
	 * Falls back to metadata name, toolName config, or label if not set.
	 * This allows users to customize the tool title per-instance via config.
	 */
	const displayTitle = $derived(
		(props.data.config?.instanceTitle as string) ||
			(props.data.metadata?.name as string) ||
			(props.data.config?.toolName as string) ||
			props.data.label ||
			'Tool'
	);

	/**
	 * Instance-specific badge label override from config.
	 * Falls back to metadata badge or default 'TOOL' if not set.
	 * This allows users to customize the badge text per-instance via config.
	 */
	const displayBadge = $derived(
		(props.data.config?.instanceBadge as string) || (props.data.metadata?.badge as string) || 'TOOL'
	);

	/**
	 * Instance-specific description override from config.
	 * Falls back to metadata description or toolDescription config if not set.
	 * This allows users to customize the tool description per-instance via config.
	 */
	const displayDescription = $derived(
		(props.data.config?.instanceDescription as string) ||
			(props.data.metadata?.description as string) ||
			(props.data.config?.toolDescription as string) ||
			'A configurable tool for agents'
	);

	let toolVersion = $derived(
		(props.data.metadata?.version as string) ||
			(props.data.config?.toolVersion as string) ||
			'1.0.0'
	);

	/**
	 * Build inline style string for CSS custom properties
	 * Sets the base color, CSS handles light/dark mode tints via color-mix()
	 */
	let nodeStyle = $derived(`--fd-tool-node-color: ${toolColor}`);

	/**
	 * Configurable port dataType to expose on this tool node.
	 * Defaults to 'tool', but can be overridden via metadata.portDataType
	 * to show a different port type (e.g., 'trigger') when the node is
	 * repurposed with a custom badge.
	 */
	let portDataType = $derived((props.data.metadata?.portDataType as string) || 'tool');

	// Check for matching interface ports in metadata
	let hasToolInputPort = $derived(
		props.data.metadata?.inputs?.some((port: NodePort) => port.dataType === portDataType) || false
	);
	let hasToolOutputPort = $derived(
		props.data.metadata?.outputs?.some((port: NodePort) => port.dataType === portDataType) || false
	);

	// Get the actual matching ports for proper handle generation
	let toolInputPort = $derived(
		props.data.metadata?.inputs?.find((port: NodePort) => port.dataType === portDataType)
	);
	let toolOutputPort = $derived(
		props.data.metadata?.outputs?.find((port: NodePort) => port.dataType === portDataType)
	);

	/**
	 * Handle configuration sidebar - using global ConfigSidebar
	 */
	function openConfigSidebar(): void {
		if (props.data.onConfigOpen) {
			// Create a WorkflowNodeType-like object for the global ConfigSidebar
			const nodeForConfig = {
				id: props.data.nodeId || 'unknown',
				type: 'tool',
				data: props.data
			};
			props.data.onConfigOpen(nodeForConfig);
		}
	}

	/**
	 * Handle double-click to open config
	 */
	function handleDoubleClick(): void {
		openConfigSidebar();
	}

	/**
	 * Handle click events
	 */
	function handleClick(): void {
		// Node selection is handled by Svelte Flow
	}

	/**
	 * Handle keyboard events for accessibility
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleDoubleClick();
		}
	}
</script>

<!-- Tool Input Handle (optional): center at 40px (multiple of 10), 20px connection area -->
{#if hasToolInputPort && toolInputPort}
	<Handle
		type="target"
		position={Position.Left}
		id={`${props.data.nodeId}-input-${toolInputPort.id}`}
		style="top: 40px; transform: translateY(-50%); margin-left: -10px; --fd-handle-fill: {getDataTypeColor(
			portDataType
		)}; --fd-handle-border-color: var(--fd-handle-border);"
	/>
{/if}

<!-- Tool Node -->
<div
	class="flowdrop-tool-node"
	class:flowdrop-tool-node--selected={props.selected}
	class:flowdrop-tool-node--processing={props.isProcessing}
	class:flowdrop-tool-node--error={props.isError}
	style={nodeStyle}
	onclick={handleClick}
	ondblclick={handleDoubleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
>
	<!-- Node Header -->
	<div class="flowdrop-tool-node__header">
		<div class="flowdrop-tool-node__header-content">
			<!-- Tool Icon with Squircle Background -->
			<div class="flowdrop-tool-node__icon-wrapper">
				<Icon icon={toolIcon} class="flowdrop-tool-node__icon" />
			</div>

			<!-- Tool Info -->
			<div class="flowdrop-tool-node__info">
				<h3 class="flowdrop-tool-node__title">
					{displayTitle}
				</h3>
				<div class="flowdrop-tool-node__version">
					v{toolVersion}
				</div>
			</div>

			<!-- Tool Badge - tinted style matching icon wrappers -->
			<div class="flowdrop-tool-node__badge">{displayBadge}</div>
		</div>

		<!-- Tool Description - uses instanceDescription override if set -->
		<p class="flowdrop-tool-node__description">
			{displayDescription}
		</p>
	</div>

	<!-- Processing indicator -->
	{#if props.isProcessing}
		<div class="flowdrop-tool-node__processing">
			<div class="flowdrop-tool-node__spinner"></div>
		</div>
	{/if}

	<!-- Error indicator -->
	{#if props.isError}
		<div class="flowdrop-tool-node__error">
			<Icon icon="mdi:alert-circle" class="flowdrop-tool-node__error-icon" />
		</div>
	{/if}

	<!-- Config button -->
	<button class="flowdrop-tool-node__config-btn" onclick={openConfigSidebar} title="Configure tool">
		<Icon icon="mdi:cog" />
	</button>
</div>

<!-- Tool Output Handle (optional): center at 40px (multiple of 10), 20px connection area -->
{#if hasToolOutputPort && toolOutputPort}
	<Handle
		type="source"
		position={Position.Right}
		id={`${props.data.nodeId}-output-${toolOutputPort.id}`}
		style="top: 40px; transform: translateY(-50%); margin-right: -10px; --fd-handle-fill: {getDataTypeColor(
			portDataType
		)}; --fd-handle-border-color: var(--fd-handle-border);"
	/>
{/if}

<style>
	.flowdrop-tool-node {
		position: relative;
		background-color: var(--fd-card);
		border: 1.5px solid var(--fd-tool-node-color);
		border-radius: var(--fd-radius-xl);
		width: var(--fd-node-default-width);
		min-height: var(--fd-node-tool-min-height);
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: all var(--fd-transition-fast);
		box-shadow: var(--fd-shadow-md);
		overflow: visible;
		z-index: 10;
		color: var(--fd-foreground);
	}

	.flowdrop-tool-node:hover {
		box-shadow: var(--fd-shadow-lg);
		border-color: var(--fd-tool-node-color);
	}

	.flowdrop-tool-node--selected {
		box-shadow:
			0 0 0 2px color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent),
			var(--fd-shadow-lg);
		border-color: var(--fd-tool-node-color);
	}

	.flowdrop-tool-node--selected:hover {
		box-shadow:
			0 0 0 2px color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent),
			var(--fd-shadow-lg);
		border-color: var(--fd-tool-node-color);
	}

	.flowdrop-tool-node:focus-visible {
		outline: 2px solid var(--fd-ring);
		outline-offset: 2px;
	}

	.flowdrop-tool-node--processing {
		opacity: 0.7;
	}

	.flowdrop-tool-node--error {
		border-color: var(--fd-error) !important;
		background-color: var(--fd-error-muted) !important;
	}

	.flowdrop-tool-node__header {
		padding: 1rem;
		/* Light mode: mix tool color with white (95%) for subtle tint */
		background-color: color-mix(in srgb, var(--fd-tool-node-color) 5%, white);
		border-radius: var(--fd-radius-xl);
		border: none;
	}

	/* Dark mode header styles */
	:global([data-theme='dark']) .flowdrop-tool-node__header {
		/* Dark mode: mix tool color with dark background (15%) for subtle tint */
		background-color: color-mix(in srgb, var(--fd-tool-node-color) 15%, #1a1a1e);
		border: none;
	}

	.flowdrop-tool-node__header-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	/* Squircle icon wrapper - Apple-style rounded square background */
	.flowdrop-tool-node__icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.625rem;
		background: color-mix(
			in srgb,
			var(--fd-tool-node-color) var(--fd-node-icon-bg-opacity),
			transparent
		);
		flex-shrink: 0;
		transition: all var(--fd-transition-normal);
	}

	.flowdrop-tool-node:hover .flowdrop-tool-node__icon-wrapper {
		background: color-mix(
			in srgb,
			var(--fd-tool-node-color) var(--fd-node-icon-bg-opacity-hover),
			transparent
		);
		transform: scale(1.05);
	}

	.flowdrop-tool-node__info {
		flex: 1;
		min-width: 0;
	}

	.flowdrop-tool-node__title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--fd-foreground);
		margin: 0;
		line-height: 1.4;
	}

	.flowdrop-tool-node__version {
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
		font-weight: 500;
		margin-top: 0.125rem;
	}

	.flowdrop-tool-node__badge {
		background-color: color-mix(in srgb, var(--fd-tool-node-color) 15%, transparent);
		color: var(--fd-tool-node-color);
		border: 1px solid color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent);
		font-size: 0.625rem;
		font-weight: 700;
		padding: 0.25rem 0.5rem;
		border-radius: var(--fd-radius-sm);
		letter-spacing: 0.05em;
	}

	.flowdrop-tool-node__description {
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
		margin: 0;
		line-height: 1.3;
	}

	.flowdrop-tool-node__icon-wrapper :global(.flowdrop-tool-node__icon) {
		width: 1.5rem;
		height: 1.5rem;
		color: var(--fd-node-icon);
	}

	.flowdrop-tool-node__processing {
		position: absolute;
		top: 4px;
		right: 4px;
	}

	.flowdrop-tool-node__spinner {
		width: 12px;
		height: 12px;
		border: 1px solid color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent);
		border-top: 1px solid var(--fd-tool-node-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.flowdrop-tool-node__error {
		position: absolute;
		top: 4px;
		right: 4px;
		color: var(--fd-error);
	}

	:global(.flowdrop-tool-node__error-icon) {
		width: 12px;
		height: 12px;
	}

	.flowdrop-tool-node__config-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		width: 1.5rem;
		height: 1.5rem;
		background-color: var(--fd-backdrop);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-sm);
		color: var(--fd-muted-foreground);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: all var(--fd-transition-normal);
		backdrop-filter: blur(4px);
		z-index: 15;
		font-size: var(--fd-text-sm);
	}

	.flowdrop-tool-node:hover .flowdrop-tool-node__config-btn {
		opacity: 1;
	}

	.flowdrop-tool-node__config-btn:hover {
		background-color: var(--fd-muted);
		border-color: var(--fd-border-strong);
		color: var(--fd-foreground);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Handle: 20px/12px from base.css; position offsets, tool-specific hover/focus */
	:global(.svelte-flow__node-tool .svelte-flow__handle) {
		z-index: 20 !important;
		pointer-events: auto !important;
	}

	:global(.svelte-flow__node-tool .svelte-flow__handle-left) {
		left: -10px !important;
	}

	:global(.svelte-flow__node-tool .svelte-flow__handle-right) {
		right: -10px !important;
	}

	:global(.svelte-flow__node-tool .svelte-flow__handle:hover) {
		transform: translateY(-50%) scale(1.2) !important;
	}

	:global(.svelte-flow__node-tool .svelte-flow__handle:hover::before) {
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent) !important;
	}

	:global(.svelte-flow__node-tool .svelte-flow__handle:focus) {
		outline: 2px solid var(--fd-tool-node-color) !important;
		outline-offset: 2px !important;
	}
</style>
