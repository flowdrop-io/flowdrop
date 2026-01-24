<!--
  Tool Node Component
  A specialized node for tools with metadata port
  Styled with BEM syntax
-->

<script lang="ts">
	import { Position, Handle } from '@xyflow/svelte';
	import Icon from '@iconify/svelte';
	import { getDataTypeColor, getColorVariants } from '$lib/utils/colors';
	import type { NodeMetadata } from '../../types/index.js';

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
			"Tool"
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
			"A configurable tool for agents"
	);

	let toolVersion = $derived(
		(props.data.metadata?.version as string) ||
			(props.data.config?.toolVersion as string) ||
			'1.0.0'
	);

	// Generate color variants for theming (light tint for background, border tint for borders)
	let colorVariants = $derived(getColorVariants(toolColor));

	// Build inline style string for CSS custom properties
	// This allows per-node color overrides while defaulting to global CSS variables
	let nodeStyle = $derived(
		[
			`--flowdrop-tool-node-color: ${colorVariants.base}`,
			`--flowdrop-tool-node-color-light: ${colorVariants.light}`,
			`--flowdrop-tool-node-color-border: ${colorVariants.border}`
		].join('; ')
	);

	// Check for tool interface ports in metadata
	let hasToolInputPort = $derived(
		props.data.metadata?.inputs?.some((port) => port.dataType === 'tool') || false
	);
	let hasToolOutputPort = $derived(
		props.data.metadata?.outputs?.some((port) => port.dataType === 'tool') || false
	);

	// Get the actual tool ports for proper handle generation
	let toolInputPort = $derived(
		props.data.metadata?.inputs?.find((port) => port.dataType === 'tool')
	);
	let toolOutputPort = $derived(
		props.data.metadata?.outputs?.find((port) => port.dataType === 'tool')
	);

	// Handle configuration sidebar - using global ConfigSidebar
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

	// Handle double-click to open config
	function handleDoubleClick(): void {
		openConfigSidebar();
	}

	// Handle click events
	function handleClick(): void {
		// Node selection is handled by Svelte Flow
	}

	// Handle keyboard events for accessibility
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleDoubleClick();
		}
	}
</script>

<!-- Tool Input Handle (optional) -->
{#if hasToolInputPort && toolInputPort}
	<Handle
		type="target"
		position={Position.Left}
		id={`${props.data.nodeId}-input-${toolInputPort.id}`}
		style="background-color: {getDataTypeColor('tool')}; border-color: '#ffffff';"
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
			<!-- Tool Icon -->
			<div class="flowdrop-tool-node__icon-container">
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

			<!-- Tool Badge -->
			<div class="flowdrop-tool-node__badge">TOOL</div>
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

<!-- Tool Output Handle (optional) -->
{#if hasToolOutputPort && toolOutputPort}
	<Handle
		type="source"
		position={Position.Right}
		id={`${props.data.nodeId}-output-${toolOutputPort.id}`}
		style="background-color: {getDataTypeColor('tool')}; border-color: '#ffffff';"
	/>
{/if}

<style>
	.flowdrop-tool-node {
		position: relative;
		background-color: #ffffff;
		border: 2px solid #e5e7eb;
		border-radius: 0.75rem;
		width: 18rem;
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		overflow: visible;
		z-index: 10;
	}

	.flowdrop-tool-node:hover {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	.flowdrop-tool-node--selected {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		border: 2px solid var(--flowdrop-tool-node-color);
	}

	.flowdrop-tool-node--processing {
		opacity: 0.7;
	}

	.flowdrop-tool-node--error {
		border-color: #ef4444 !important;
		background-color: #fef2f2 !important;
	}

	.flowdrop-tool-node__header {
		padding: 1rem;
		background-color: var(--flowdrop-tool-node-color-light);
		border-radius: 0.75rem;
		border: 1px solid var(--flowdrop-tool-node-color-border);
	}

	.flowdrop-tool-node__header-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.flowdrop-tool-node__icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.5rem;
		flex-shrink: 0;
		background-color: var(--flowdrop-tool-node-color);
	}

	.flowdrop-tool-node__info {
		flex: 1;
		min-width: 0;
	}

	.flowdrop-tool-node__title {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
		line-height: 1.4;
	}

	.flowdrop-tool-node__version {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		margin-top: 0.125rem;
	}

	.flowdrop-tool-node__badge {
		background-color: var(--flowdrop-tool-node-color);
		color: white;
		font-size: 0.625rem;
		font-weight: 700;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		letter-spacing: 0.05em;
	}

	.flowdrop-tool-node__description {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0;
		line-height: 1.3;
	}

	:global(.flowdrop-tool-node__icon) {
		color: white;
		font-size: 1.25rem;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
	}

	.flowdrop-tool-node__processing {
		position: absolute;
		top: 4px;
		right: 4px;
	}

	.flowdrop-tool-node__spinner {
		width: 12px;
		height: 12px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-top: 1px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.flowdrop-tool-node__error {
		position: absolute;
		top: 4px;
		right: 4px;
		color: #ef4444;
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

	.flowdrop-tool-node:hover .flowdrop-tool-node__config-btn {
		opacity: 1;
	}

	.flowdrop-tool-node__config-btn:hover {
		background-color: #f9fafb;
		border-color: #d1d5db;
		color: #374151;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Handle styles - special metadata port styling */
	:global(.svelte-flow__node-tool .svelte-flow__handle) {
		width: 16px !important;
		height: 16px !important;
		border: 2px solid #ffffff !important;
		border-radius: 50% !important;
		transition: all 0.2s ease-in-out !important;
		cursor: pointer !important;
		z-index: 20 !important;
		pointer-events: auto !important;
	}

	:global(.svelte-flow__node-tool .svelte-flow__handle-right) {
		right: -6px !important;
	}

	/* Metadata port hover effects */
	:global(.svelte-flow__node-tool .svelte-flow__handle:hover) {
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--flowdrop-tool-node-color) 30%, transparent) !important;
	}

	:global(.svelte-flow__node-tool .svelte-flow__handle:focus) {
		outline: 2px solid var(--flowdrop-tool-node-color) !important;
		outline-offset: 2px !important;
	}
</style>
