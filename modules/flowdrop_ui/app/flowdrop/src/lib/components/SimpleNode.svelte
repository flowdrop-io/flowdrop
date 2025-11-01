<!--
  Simple Node Component
  A simple node with optional input and output ports
  Styled with BEM syntax
-->

<script lang="ts">
	import { Position, Handle } from '@xyflow/svelte';
	import type { NodeConfig, NodeMetadata } from '../types/index.js';
	import Icon from '@iconify/svelte';
	import { getDataTypeColor } from '$lib/utils/colors.js';

	const props = $props<{
		data: {
			label: string;
			config: NodeConfig;
			metadata: NodeMetadata;
			nodeId?: string;
			onConfigOpen?: (node: {
				id: string;
				type: string;
				data: { label: string; config: NodeConfig; metadata: NodeMetadata };
			}) => void;
		};
		selected?: boolean;
		isProcessing?: boolean;
		isError?: boolean;
	}>();

	// Removed local config state - now using global ConfigSidebar

	// Prioritize metadata icon over config icon for simple nodes (metadata is the node definition)
	let nodeIcon = $derived(
		(props.data.metadata?.icon as string) || (props.data.config?.icon as string) || 'mdi:square'
	);
	let nodeColor = $derived(
		(props.data.metadata?.color as string) || (props.data.config?.color as string) || '#6366f1'
	);
	let nodeLayout = $derived((props.data.config?.layout as string) || 'normal');

	// Layout configurations
	const layoutConfig = {
		compact: {
			width: '80px',
			height: '80px',
			iconSize: '2rem',
			showHeader: false
		},
		normal: {
			width: '18rem',
			height: 'auto',
			iconSize: '1rem',
			showHeader: true
		}
	};

	let currentLayout = $derived(
		layoutConfig[nodeLayout as keyof typeof layoutConfig] || layoutConfig.normal
	);
	let isCompact = $derived(nodeLayout === 'compact');

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

	// Get first input/output ports for simple node representation
	// Special handling for trigger ports - they should always be shown if present
	let triggerInputPort = $derived(
		props.data.metadata?.inputs?.find((port) => port.dataType === 'trigger')
	);
	let triggerOutputPort = $derived(
		props.data.metadata?.outputs?.find((port) => port.dataType === 'trigger')
	);
	
	// Get first non-trigger ports for data connections
	let firstDataInputPort = $derived(
		props.data.metadata?.inputs?.find((port) => port.dataType !== 'trigger')
	);
	let firstDataOutputPort = $derived(
		props.data.metadata?.outputs?.find((port) => port.dataType !== 'trigger')
	);
	
	// Use trigger port if present, otherwise use first data port
	let firstInputPort = $derived(triggerInputPort || firstDataInputPort);
	let firstOutputPort = $derived(triggerOutputPort || firstDataOutputPort);
	
	let hasInput = $derived(!!firstInputPort);
	let hasOutput = $derived(!!firstOutputPort);
	
	// Check if we need to show both trigger and data ports
	let hasBothInputTypes = $derived(!!triggerInputPort && !!firstDataInputPort);
	let hasBothOutputTypes = $derived(!!triggerOutputPort && !!firstDataOutputPort);
</script>

<!-- Input Handles -->
{#if firstDataInputPort}
	<!-- Data Input - positioned at top-left if both types exist, otherwise center -->
	<Handle
		type="target"
		position={Position.Left}
		style="background-color: {getDataTypeColor(firstDataInputPort.dataType)}; border-color: '#ffffff'; top: {hasBothInputTypes ? '25%' : '50%'}; z-index: 30;"
		id={`${props.data.nodeId}-input-${firstDataInputPort.id}`}
	/>
{/if}
{#if triggerInputPort}
	<!-- Trigger Input - positioned at bottom-left -->
	<Handle
		type="target"
		position={Position.Left}
		style="background-color: {getDataTypeColor(triggerInputPort.dataType)}; border-color: '#ffffff'; top: {hasBothInputTypes ? '75%' : '50%'}; z-index: 30;"
		id={`${props.data.nodeId}-input-${triggerInputPort.id}`}
	/>
{/if}

<!-- Simple Node -->
<div
	class="flowdrop-simple-node"
	class:flowdrop-simple-node--compact={isCompact}
	class:flowdrop-simple-node--normal={!isCompact}
	class:flowdrop-simple-node--selected={props.selected}
	class:flowdrop-simple-node--processing={props.isProcessing}
	class:flowdrop-simple-node--error={props.isError}
	onclick={handleClick}
	ondblclick={handleDoubleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
>
	{#if isCompact}
		<!-- Compact Layout: Just centered icon -->
		<div class="flowdrop-simple-node__compact-content">
			<Icon
				icon={nodeIcon}
				class="flowdrop-simple-node__compact-icon"
				style="color: {nodeColor}; font-size: {currentLayout.iconSize};"
			/>
		</div>
	{:else}
		<!-- Normal Layout: Header with title and description -->
		<div class="flowdrop-simple-node__header">
			<div class="flowdrop-simple-node__header-content">
				<!-- Node Icon -->
				<div class="flowdrop-simple-node__icon-container" style="background-color: {nodeColor}">
					<Icon icon={nodeIcon} class="flowdrop-simple-node__icon" />
				</div>

				<!-- Node Title -->
				<h3 class="flowdrop-simple-node__title">
					{props.data.label}
				</h3>
			</div>

			<!-- Node Description -->
			<p class="flowdrop-simple-node__description">
				{props.data.metadata?.description || 'A configurable simple node'}
			</p>
		</div>
	{/if}

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
{#if firstDataOutputPort}
	<!-- Data Output - positioned at top-right if both types exist, otherwise center -->
	<Handle
		type="source"
		position={Position.Right}
		id={`${props.data.nodeId}-output-${firstDataOutputPort.id}`}
		style="background-color: {getDataTypeColor(firstDataOutputPort.dataType)}; border-color: '#ffffff'; top: {hasBothOutputTypes ? '25%' : '50%'}; z-index: 30;"
	/>
{/if}
{#if triggerOutputPort}
	<!-- Trigger Output - positioned at bottom-right -->
	<Handle
		type="source"
		position={Position.Right}
		id={`${props.data.nodeId}-output-${triggerOutputPort.id}`}
		style="background-color: {getDataTypeColor(triggerOutputPort.dataType)}; border-color: '#ffffff'; top: {hasBothOutputTypes ? '75%' : '50%'}; z-index: 30;"
	/>
{/if}

<!-- ConfigSidebar removed - now using global ConfigSidebar in WorkflowEditor -->

<style>
	.flowdrop-simple-node {
		position: relative;
		background-color: #ffffff;
		border: 2px solid #e5e7eb;
		border-radius: 0.75rem;
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		overflow: visible; /* Changed from hidden to visible to allow handles to be properly accessible */
		z-index: 10;
	}

	/* Normal layout (default) */
	.flowdrop-simple-node--normal {
		width: 18rem;
	}

	/* Compact layout */
	.flowdrop-simple-node--compact {
		width: 80px;
		height: 80px;
		justify-content: center;
		align-items: center;
	}

	.flowdrop-simple-node:hover {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	.flowdrop-simple-node--selected {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		border: 2px solid #3b82f6;
	}

	.flowdrop-simple-node--processing {
		opacity: 0.7;
	}

	.flowdrop-simple-node--error {
		border-color: #ef4444 !important;
		background-color: #fef2f2 !important;
	}

	.flowdrop-simple-node__header {
		padding: 1rem;
		background-color: #f9fafb;
		border-radius: 0.75rem;
	}

	.flowdrop-simple-node__header-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.flowdrop-simple-node__icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		flex-shrink: 0;
	}

	/* Compact layout styles */
	.flowdrop-simple-node__compact-content {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	:global(.flowdrop-simple-node__compact-icon) {
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
	}

	.flowdrop-simple-node__title {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
		margin: 0;
		flex: 1;
		min-width: 0;
		line-height: 1.4;
	}

	.flowdrop-simple-node__description {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0.25rem 0 0 0;
		line-height: 1.3;
	}

	/* Compact layout text constraints */
	.flowdrop-simple-node--compact .flowdrop-simple-node__title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.flowdrop-simple-node--compact .flowdrop-simple-node__description {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.flowdrop-simple-node__icon) {
		color: white;
		font-size: 1rem;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
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
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-top: 1px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.flowdrop-simple-node__error {
		position: absolute;
		top: 4px;
		right: 4px;
		color: #ef4444;
	}

	:global(.flowdrop-simple-node__error-icon) {
		width: 12px;
		height: 12px;
	}

	.flowdrop-simple-node__config-btn {
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

	.flowdrop-simple-node:hover .flowdrop-simple-node__config-btn {
		opacity: 1;
	}

	.flowdrop-simple-node__config-btn:hover {
		background-color: #f9fafb;
		border-color: #d1d5db;
		color: #374151;
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
		transition: all 0.2s ease-in-out !important;
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
		outline: 2px solid #3b82f6 !important;
		outline-offset: 2px !important;
	}
</style>
