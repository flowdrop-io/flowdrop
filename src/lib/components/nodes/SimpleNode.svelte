<!--
  Simple Node Component
  A simple node with optional input and output ports
  Styled with BEM syntax
  
  UI Extensions Support:
  - hideUnconnectedHandles: Hides trigger ports that are not connected to reduce visual clutter
-->

<script lang="ts">
	import { Position, Handle } from '@xyflow/svelte';
	import type { ConfigValues, NodeMetadata, NodeExtensions } from '../../types/index.js';
	import Icon from '@iconify/svelte';
	import { getDataTypeColor } from '$lib/utils/colors.js';
	import { connectedHandles } from '../../stores/workflowStore.js';

	const props = $props<{
		data: {
			label: string;
			config: ConfigValues;
			metadata: NodeMetadata;
			nodeId?: string;
			extensions?: NodeExtensions;
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
	 * Get the hideUnconnectedHandles setting from extensions
	 * Merges node type defaults with instance overrides
	 */
	const hideUnconnectedHandles = $derived(() => {
		const typeDefault = props.data.metadata?.extensions?.ui?.hideUnconnectedHandles ?? false;
		const instanceOverride = props.data.extensions?.ui?.hideUnconnectedHandles;
		return instanceOverride ?? typeDefault;
	});

	// Removed local config state - now using global ConfigSidebar

	// Prioritize metadata icon over config icon for simple nodes (metadata is the node definition)
	let nodeIcon = $derived(
		(props.data.metadata?.icon as string) || (props.data.config?.icon as string) || 'mdi:square'
	);
	let nodeColor = $derived(
		(props.data.metadata?.color as string) || (props.data.config?.color as string) || '#6366f1'
	);

	/**
	 * Instance-specific title override from config.
	 * Falls back to the original label if not set.
	 * This allows users to customize the node title per-instance via config.
	 */
	const displayTitle = $derived((props.data.config?.instanceTitle as string) || props.data.label);

	/**
	 * Instance-specific description override from config.
	 * Falls back to the metadata description if not set.
	 * This allows users to customize the node description per-instance via config.
	 */
	const displayDescription = $derived(
		(props.data.config?.instanceDescription as string) ||
			props.data.metadata?.description ||
			'A configurable simple node'
	);

	// Handle configuration sidebar - now using global ConfigSidebar
	function openConfigSidebar(): void {
		if (props.data.onConfigOpen) {
			// Create a WorkflowNodeType-like object for the global ConfigSidebar
			const nodeForConfig = {
				id: props.data.nodeId || 'unknown',
				type: 'simple',
				data: props.data
			};
			props.data.onConfigOpen(nodeForConfig);
		}
	}

	// Handle double-click to open config
	function handleDoubleClick(): void {
		openConfigSidebar();
	}

	// Handle single click - only handle selection, no config opening
	function handleClick(): void {
		// Node selection is handled by Svelte Flow
	}

	// Handle keyboard events
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleDoubleClick();
		}
	}

	/**
	 * Check if a port is connected
	 * @param portId - The port ID to check
	 * @param type - Whether this is an 'input' or 'output' port
	 * @returns true if the port is connected
	 */
	function isPortConnected(portId: string, type: 'input' | 'output'): boolean {
		const handleId = `${props.data.nodeId}-${type}-${portId}`;
		return $connectedHandles.has(handleId);
	}

	/**
	 * Check if a trigger port should be visible
	 * Always shows if hideUnconnectedHandles is disabled or if port is connected
	 */
	function shouldShowTriggerPort(portId: string, type: 'input' | 'output'): boolean {
		if (!hideUnconnectedHandles()) {
			return true;
		}
		return isPortConnected(portId, type);
	}

	// Get first input/output ports for simple node representation
	// Special handling for trigger ports - they should always be shown if present
	let triggerInputPort = $derived(
		props.data.metadata?.inputs?.find((port) => port.dataType === 'trigger')
	);
	let triggerOutputPort = $derived(
		props.data.metadata?.outputs?.find((port) => port.dataType === 'trigger')
	);

	// Get first non-trigger ports for data connections
	let firstConnectedDataInputPort = $derived(
		props.data.metadata?.inputs?.find(
			(port) => port.dataType !== 'trigger' && isPortConnected(port.id, 'input')
		)
	);

	let firstDataInputPort = $derived(
		props.data.metadata?.inputs?.find((port) => port.dataType !== 'trigger')
	);

	let firstConnectedDataOutputPort = $derived(
		props.data.metadata?.outputs?.find(
			(port) => port.dataType !== 'trigger' && isPortConnected(port.id, 'output')
		)
	);
	let firstDataOutputPort = $derived(
		props.data.metadata?.outputs?.find((port) => port.dataType !== 'trigger')
	);

	let inputPorts = $derived.by(() => {
		return [
			...(firstConnectedDataInputPort
				? [firstConnectedDataInputPort]
				: firstDataInputPort
					? [firstDataInputPort]
					: []),
			...(triggerInputPort && shouldShowTriggerPort(triggerInputPort.id, 'input')
				? [triggerInputPort]
				: [])
		];
	});
	let outputPorts = $derived.by(() => {
		return [
			...(firstConnectedDataOutputPort
				? [firstConnectedDataOutputPort]
				: firstDataOutputPort
					? [firstDataOutputPort]
					: []),
			...(triggerOutputPort && shouldShowTriggerPort(triggerOutputPort.id, 'output')
				? [triggerOutputPort]
				: [])
		];
	});
</script>

<!-- Input Handles -->
{#each inputPorts as port, index}
	<!-- Data Input - positioned at top-left if both types exist, otherwise center -->
	<Handle
		type="target"
		position={Position.Left}
		style="background-color: {getDataTypeColor(
			port.dataType
		)}; border-color: var(--fd-handle-border); top: {inputPorts.length > 1
			? index === 0
				? '25%'
				: '75%'
			: '50%'}; z-index: 30;"
		id={`${props.data.nodeId}-input-${port.id}`}
	/>
{/each}

<!-- Simple Node -->
<div
	class="flowdrop-simple-node flowdrop-simple-node--normal"
	class:flowdrop-simple-node--selected={props.selected}
	class:flowdrop-simple-node--processing={props.isProcessing}
	class:flowdrop-simple-node--error={props.isError}
	onclick={handleClick}
	ondblclick={handleDoubleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
>
	<div class="flowdrop-simple-node__header">
		<div class="flowdrop-simple-node__header-content">
			<!-- Node Icon with Squircle Background -->
			<div class="flowdrop-simple-node__icon-wrapper" style="--_icon-color: {nodeColor}">
				<Icon icon={nodeIcon} class="flowdrop-simple-node__icon" />
			</div>

			<!-- Node Title -->
			<h3 class="flowdrop-simple-node__title">
				{displayTitle}
			</h3>
		</div>

		<!-- Node Description -->
		<p class="flowdrop-simple-node__description">
			{displayDescription}
		</p>
	</div>

	<!-- Processing indicator -->
	{#if props.isProcessing}
		<div class="flowdrop-simple-node__processing">
			<div class="flowdrop-simple-node__spinner"></div>
		</div>
	{/if}

	<!-- Error indicator -->
	{#if props.isError}
		<div class="flowdrop-simple-node__error">
			<Icon icon="mdi:alert-circle" class="flowdrop-simple-node__error-icon" />
		</div>
	{/if}

	<!-- Config button -->
	<button
		class="flowdrop-simple-node__config-btn"
		onclick={openConfigSidebar}
		title="Configure node"
	>
		<Icon icon="mdi:cog" />
	</button>
</div>

<!-- Output Handles -->
{#each outputPorts as port, index}
	<!-- Data Output - positioned at top-right if both types exist, otherwise center -->
	<Handle
		type="source"
		position={Position.Right}
		style="background-color: {getDataTypeColor(
			port.dataType
		)}; border-color: var(--fd-handle-border); top: {outputPorts.length > 1
			? index === 0
				? '25%'
				: '75%'
			: '50%'}; z-index: 30;"
		id={`${props.data.nodeId}-output-${port.id}`}
	/>
{/each}

<!-- ConfigSidebar removed - now using global ConfigSidebar in WorkflowEditor -->

<style>
	.flowdrop-simple-node {
		position: relative;
		background-color: var(--fd-card);
		border: 1.5px solid var(--fd-node-border);
		border-radius: var(--fd-radius-xl);
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: all var(--fd-transition-fast);
		box-shadow: var(--fd-shadow-md);
		overflow: visible; /* Changed from hidden to visible to allow handles to be properly accessible */
		z-index: 10;
		color: var(--fd-foreground);
	}

	/* Normal layout (default) */
	.flowdrop-simple-node--normal {
		width: 18rem;
	}

	.flowdrop-simple-node:hover {
		box-shadow: var(--fd-shadow-lg);
		border-color: var(--fd-node-border-hover);
	}

	.flowdrop-simple-node--selected {
		box-shadow: 0 0 0 2px var(--fd-primary-muted), var(--fd-shadow-lg);
		border-color: var(--fd-primary);
	}

	.flowdrop-simple-node--selected:hover {
		box-shadow: 0 0 0 2px var(--fd-primary-muted), var(--fd-shadow-lg);
		border-color: var(--fd-primary);
	}

	.flowdrop-simple-node:focus-visible {
		outline: 2px solid var(--fd-ring);
		outline-offset: 2px;
	}

	.flowdrop-simple-node--processing {
		opacity: 0.7;
	}

	.flowdrop-simple-node--error {
		border-color: var(--fd-error) !important;
		background-color: var(--fd-error-muted) !important;
	}

	.flowdrop-simple-node__header {
		padding: var(--fd-space-4);
		background: var(--fd-header);
		border-radius: var(--fd-radius-xl);
	}

	.flowdrop-simple-node__header-content {
		display: flex;
		align-items: center;
		gap: var(--fd-space-3);
	}

	/* Squircle icon wrapper - Apple-style rounded square background */
	.flowdrop-simple-node__icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--_icon-color) 15%, transparent);
		flex-shrink: 0;
		transition: all var(--fd-transition-normal);
	}

	.flowdrop-simple-node:hover .flowdrop-simple-node__icon-wrapper {
		background: color-mix(in srgb, var(--_icon-color) 22%, transparent);
		transform: scale(1.05);
	}

	.flowdrop-simple-node__title {
		font-size: var(--fd-text-sm);
		font-weight: 500;
		color: var(--fd-foreground);
		margin: 0;
		flex: 1;
		min-width: 0;
		line-height: 1.4;
	}

	.flowdrop-simple-node__description {
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
		margin: var(--fd-space-1) 0 0 0;
		line-height: 1.3;
	}

	.flowdrop-simple-node__icon-wrapper :global(.flowdrop-simple-node__icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--fd-node-icon);
	}

	/* Label styling removed - now using header title */

	.flowdrop-simple-node__processing {
		position: absolute;
		top: 4px;
		right: 4px;
	}

	.flowdrop-simple-node__spinner {
		width: 12px;
		height: 12px;
		border: 1px solid color-mix(in srgb, var(--fd-foreground) 30%, transparent);
		border-top: 1px solid var(--fd-foreground);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.flowdrop-simple-node__error {
		position: absolute;
		top: 4px;
		right: 4px;
		color: var(--fd-error);
	}

	:global(.flowdrop-simple-node__error-icon) {
		width: 12px;
		height: 12px;
	}

	.flowdrop-simple-node__config-btn {
		position: absolute;
		top: var(--fd-space-2);
		right: var(--fd-space-2);
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

	.flowdrop-simple-node:hover .flowdrop-simple-node__config-btn {
		opacity: 1;
	}

	.flowdrop-simple-node__config-btn:hover {
		background-color: var(--fd-muted);
		border-color: var(--fd-border-strong);
		color: var(--fd-foreground);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Handle styles - matching WorkflowNode exactly */
	:global(.svelte-flow__node-simple .svelte-flow__handle) {
		width: 18px !important;
		height: 18px !important;
		border-radius: 50% !important;
		transition: all var(--fd-transition-normal) !important;
		cursor: pointer !important;
		z-index: 20 !important;
		pointer-events: auto !important;
	}

	:global(.svelte-flow__node-simple .svelte-flow__handle-left) {
		left: -6px !important;
	}

	:global(.svelte-flow__node-simple .svelte-flow__handle-right) {
		right: -6px !important;
	}

	:global(.svelte-flow__node-simple .svelte-flow__handle:focus) {
		outline: 2px solid var(--fd-ring) !important;
		outline-offset: 2px !important;
	}
</style>
