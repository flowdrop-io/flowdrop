<!--
  Workflow Node Component
  Renders individual nodes in the workflow editor with full functionality
  Uses SvelteFlow's Handle for connection ports
  Styled with BEM syntax
  
  UI Extensions Support:
  - hideUnconnectedHandles: Hides ports that are not connected to reduce visual clutter
-->

<script lang="ts">
	import { Position, Handle } from '@xyflow/svelte';
	import type { WorkflowNode, NodePort, DynamicPort } from '../../types/index.js';
	import { dynamicPortToNodePort } from '../../types/index.js';
	import Icon from '@iconify/svelte';
	import { getNodeIcon } from '../../utils/icons.js';
	import { getDataTypeColorToken, getCategoryColorToken, getPortBackgroundColor } from '../../utils/colors.js';
	import { connectedHandles } from '../../stores/workflowStore.js';

	interface Props {
		data: WorkflowNode['data'] & {
			nodeId?: string;
			onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
		};
		selected?: boolean;
	}

	let props: Props = $props();
	let isHandleInteraction = $state(false);

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
		(props.data.config?.instanceDescription as string) || props.data.metadata.description
	);

	/**
	 * Get the hideUnconnectedHandles setting from extensions
	 * Merges node type defaults with instance overrides
	 */
	const hideUnconnectedHandles = $derived(() => {
		const typeDefault = props.data.metadata?.extensions?.ui?.hideUnconnectedHandles ?? false;
		const instanceOverride = props.data.extensions?.ui?.hideUnconnectedHandles;
		return instanceOverride ?? typeDefault;
	});

	/**
	 * Dynamic inputs from config - user-defined input ports
	 * Similar to how branches work in GatewayNode
	 */
	const dynamicInputs = $derived(
		((props.data.config?.dynamicInputs as DynamicPort[]) || []).map((port) =>
			dynamicPortToNodePort(port, 'input')
		)
	);

	/**
	 * Dynamic outputs from config - user-defined output ports
	 * Similar to how branches work in GatewayNode
	 */
	const dynamicOutputs = $derived(
		((props.data.config?.dynamicOutputs as DynamicPort[]) || []).map((port) =>
			dynamicPortToNodePort(port, 'output')
		)
	);

	/**
	 * Combined input ports: static metadata inputs + dynamic config inputs
	 */
	const allInputPorts = $derived([...props.data.metadata.inputs, ...dynamicInputs]);

	/**
	 * Combined output ports: static metadata outputs + dynamic config outputs
	 */
	const allOutputPorts = $derived([...props.data.metadata.outputs, ...dynamicOutputs]);

	/**
	 * Check if a port should be visible based on connection state and settings
	 * @param port - The port to check
	 * @param type - Whether this is an 'input' or 'output' port
	 * @returns true if the port should be visible
	 */
	function isPortVisible(port: NodePort, type: 'input' | 'output'): boolean {
		// Always show if hideUnconnectedHandles is disabled
		if (!hideUnconnectedHandles()) {
			return true;
		}

		// Always show required ports
		if (port.required) {
			return true;
		}

		// Check if port is connected
		const handleId = `${props.data.nodeId}-${type}-${port.id}`;
		return $connectedHandles.has(handleId);
	}

	/**
	 * Derived list of visible input ports based on hideUnconnectedHandles setting
	 * Now includes both static and dynamic inputs
	 */
	const visibleInputPorts = $derived(allInputPorts.filter((port) => isPortVisible(port, 'input')));

	/**
	 * Derived list of visible output ports based on hideUnconnectedHandles setting
	 * Now includes both static and dynamic outputs
	 */
	const visibleOutputPorts = $derived(
		allOutputPorts.filter((port) => isPortVisible(port, 'output'))
	);

	/**
	 * Handle configuration value changes - now handled by global ConfigSidebar
	 */
	// Removed local config handling - now using global ConfigSidebar

	/**
	 * Handle node click - only handle selection, no config opening
	 */
	function handleNodeClick(): void {
		// Node selection is handled by Svelte Flow
	}

	/**
	 * Handle double-click to open config
	 */
	function handleDoubleClick(): void {
		openConfigSidebar();
	}

	/**
	 * Handle configuration sidebar - now using global ConfigSidebar
	 */
	function openConfigSidebar(): void {
		if (props.data.onConfigOpen) {
			// Create a WorkflowNodeType-like object for the global ConfigSidebar
			const nodeForConfig = {
				id: props.data.nodeId || 'unknown',
				type: 'workflowNode',
				data: props.data
			};
			props.data.onConfigOpen(nodeForConfig);
		}
	}
</script>

<!-- Node Container -->
<div
	class="flowdrop-workflow-node"
	class:flowdrop-workflow-node--selected={props.selected}
	onclick={handleNodeClick}
	ondblclick={handleDoubleClick}
	onmouseup={() => {
		isHandleInteraction = false;
	}}
	data-handle-interaction={isHandleInteraction}
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleDoubleClick();
		}
	}}
	aria-label="Workflow node: {props.data.metadata.name}"
	aria-describedby="node-description-{props.data.nodeId || 'unknown'}"
>
	<!-- Default Node Header -->
	<div class="flowdrop-workflow-node__header">
		<div class="flowdrop-flex flowdrop-gap--3 flowdrop-items--center">
			<!-- Node Icon with Squircle Background -->
			<div
				class="flowdrop-workflow-node__icon-wrapper"
				style="--_icon-color: {getCategoryColorToken(props.data.metadata.category)}"
			>
				<Icon icon={getNodeIcon(props.data.metadata.icon, props.data.metadata.category)} class="flowdrop-workflow-node__icon" />
			</div>

			<!-- Node Title - Icon and Title on same line -->
			<h3 class="flowdrop-text--sm flowdrop-font--medium flowdrop-truncate flowdrop-flex--1">
				{displayTitle}
			</h3>

			<!-- Status Indicators -->
			<div class="flowdrop-flex flowdrop-gap--2 flowdrop-items--center">
				<!-- Status indicators removed - using outer NodeStatusOverlay instead -->
			</div>
		</div>
		<!-- Node Description - on new line below -->
		<p
			class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate flowdrop-mt--1"
			id="node-description-{props.data.nodeId || 'unknown'}"
		>
			{displayDescription}
		</p>
	</div>

	<!-- Input Ports Container -->
	{#if visibleInputPorts.length > 0}
		<div class="flowdrop-workflow-node__ports">
			<div class="flowdrop-workflow-node__ports-header">
				<h5 class="flowdrop-workflow-node__ports-title">Inputs</h5>
			</div>
			<div class="flowdrop-workflow-node__ports-list">
				{#each visibleInputPorts as port (port.id)}
					<div class="flowdrop-workflow-node__port">
						<!-- Input Handle -->
						<Handle
							type="target"
							position={Position.Left}
							id={`${props.data.nodeId}-input-${port.id}`}
							class="flowdrop-workflow-node__handle"
							style="top: 50%; transform: translateY(-50%); margin-left: -32px; background-color: {getDataTypeColorToken(port.dataType)}; border-color: var(--fd-handle-border);"
							role="button"
							tabindex={0}
							aria-label="Connect to {port.name} input port"
						/>

						<!-- Port Info -->
						<div class="flowdrop-flex--1 flowdrop-min-w--0">
							<div class="flowdrop-flex flowdrop-gap--2">
								<span class="flowdrop-text--xs flowdrop-font--medium">{port.name}</span>
								<span
									class="flowdrop-badge flowdrop-badge--sm"
									style="background-color: {getPortBackgroundColor(port.dataType, 15)}; color: {getDataTypeColorToken(port.dataType)}; border: 1px solid {getPortBackgroundColor(port.dataType, 30)};"
								>
									{port.dataType}
								</span>
								{#if port.required}
									<span class="flowdrop-badge flowdrop-badge--error flowdrop-badge--sm"
										>Required</span
									>
								{/if}
							</div>
							{#if port.description}
								<p class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate">
									{port.description}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Output Ports Container -->
	{#if visibleOutputPorts.length > 0}
		<div class="flowdrop-workflow-node__ports">
			<div class="flowdrop-workflow-node__ports-header">
				<h5 class="flowdrop-workflow-node__ports-title">Outputs</h5>
			</div>
			<div class="flowdrop-workflow-node__ports-list">
				{#each visibleOutputPorts as port (port.id)}
					<div class="flowdrop-workflow-node__port">
						<!-- Port Info -->
						<div class="flowdrop-flex--1 flowdrop-min-w--0 flowdrop-text--right">
							<div class="flowdrop-flex flowdrop-gap--2 flowdrop-justify--end">
								<span class="flowdrop-text--xs flowdrop-font--medium">{port.name}</span>
								<span
									class="flowdrop-badge flowdrop-badge--sm"
									style="background-color: {getPortBackgroundColor(port.dataType, 15)}; color: {getDataTypeColorToken(port.dataType)}; border: 1px solid {getPortBackgroundColor(port.dataType, 30)};"
								>
									{port.dataType}
								</span>
							</div>
							{#if port.description}
								<p class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate">
									{port.description}
								</p>
							{/if}
						</div>

						<!-- Output Handle -->
						<Handle
							type="source"
							position={Position.Right}
							id={`${props.data.nodeId}-output-${port.id}`}
							class="flowdrop-workflow-node__handle"
							style="top: 50%; transform: translateY(-50%); margin-right: -32px; background-color: {getDataTypeColorToken(port.dataType)}; border-color: var(--fd-handle-border);"
							role="button"
							tabindex={0}
							aria-label="Connect from {port.name} output port"
						/>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Config button -->
	<button
		class="flowdrop-workflow-node__config-btn"
		onclick={openConfigSidebar}
		title="Configure node"
	>
		<Icon icon="mdi:cog" />
	</button>
</div>

<!-- ConfigSidebar removed - now using global ConfigSidebar in WorkflowEditor -->

<style>
	.flowdrop-workflow-node {
		position: relative;
		background-color: var(--fd-card);
		border: 1.5px solid var(--fd-node-border);
		border-radius: var(--fd-radius-xl);
		box-shadow: var(--fd-shadow-md);
		width: 18rem;
		z-index: 10;
		color: var(--fd-foreground);
		transition: all var(--fd-transition-fast);
	}

	.flowdrop-workflow-node:hover {
		box-shadow: var(--fd-shadow-lg);
		border-color: var(--fd-node-border-hover);
	}

	.flowdrop-workflow-node--selected {
		box-shadow: 0 0 0 2px var(--fd-primary-muted), var(--fd-shadow-lg);
		border-color: var(--fd-primary);
	}

	.flowdrop-workflow-node--selected:hover {
		box-shadow: 0 0 0 2px var(--fd-primary-muted), var(--fd-shadow-lg);
		border-color: var(--fd-primary);
	}

	.flowdrop-workflow-node:focus-visible {
		outline: 2px solid var(--fd-ring);
		outline-offset: 2px;
	}

	.flowdrop-workflow-node__header {
		padding: var(--fd-space-4);
		border-bottom: 1px solid var(--fd-border-muted);
		background: var(--fd-header);
		border-top-left-radius: var(--fd-radius-xl);
		border-top-right-radius: var(--fd-radius-xl);
	}

	/* Squircle icon wrapper - Apple-style rounded square background */
	.flowdrop-workflow-node__icon-wrapper {
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

	.flowdrop-workflow-node:hover .flowdrop-workflow-node__icon-wrapper {
		background: color-mix(in srgb, var(--_icon-color) 22%, transparent);
		transform: scale(1.05);
	}

	.flowdrop-workflow-node__icon-wrapper :global(.flowdrop-workflow-node__icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--fd-node-icon);
	}

	.flowdrop-workflow-node__header h3 {
		margin: 0;
		line-height: 1;
	}

	/* Status indicator styles removed - using outer NodeStatusOverlay instead */

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.flowdrop-workflow-node__ports {
		padding: var(--fd-space-3) var(--fd-space-4);
	}

	.flowdrop-workflow-node__ports-header {
		margin-bottom: var(--fd-space-2);
	}

	.flowdrop-workflow-node__ports-title {
		margin: 0;
		font-size: var(--fd-text-xs);
		font-weight: 600;
		color: var(--fd-foreground);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.flowdrop-workflow-node__ports-list {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-2);
	}

	.flowdrop-workflow-node__port {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2);
		padding: var(--fd-space-1) 0;
		position: relative;
	}

	.flowdrop-badge {
		padding: 0.125rem var(--fd-space-1);
		border-radius: var(--fd-radius-sm);
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.flowdrop-badge--error {
		background-color: var(--fd-error);
		color: var(--fd-error-foreground);
	}

	.flowdrop-badge--sm {
		font-size: 0.625rem;
		padding: 0.125rem var(--fd-space-1);
	}

	/* Handle styles */
	:global(.flowdrop-workflow-node__handle) {
		width: 0.75rem;
		height: 0.75rem;
		background-color: var(--fd-muted-foreground);
		border: 2px solid var(--fd-handle-border);
		border-radius: 50%;
		transition: all var(--fd-transition-normal);
		cursor: pointer;
	}

	:global(.flowdrop-workflow-node__handle:hover) {
		background-color: var(--fd-primary);
		transform: scale(1.2);
	}

	:global(.flowdrop-workflow-node__handle:focus) {
		outline: 2px solid var(--fd-ring);
		outline-offset: 2px;
	}

	/* Utility classes */
	.flowdrop-flex {
		display: flex;
	}

	.flowdrop-flex--1 {
		flex: 1;
	}

	.flowdrop-gap--2 {
		gap: var(--fd-space-2);
	}

	.flowdrop-gap--3 {
		gap: var(--fd-space-3);
	}

	.flowdrop-items--center {
		align-items: center;
	}

	.flowdrop-justify--end {
		justify-content: flex-end;
	}

	.flowdrop-min-w--0 {
		min-width: 0;
	}

	.flowdrop-text--xs {
		font-size: var(--fd-text-xs);
		line-height: 1rem;
	}

	.flowdrop-text--sm {
		font-size: var(--fd-text-sm);
		line-height: 1.25rem;
	}

	.flowdrop-text--gray {
		color: var(--fd-muted-foreground);
	}

	.flowdrop-font--medium {
		font-weight: 500;
	}

	.flowdrop-truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.flowdrop-mt--1 {
		margin-top: var(--fd-space-1);
	}

	.flowdrop-text--right {
		text-align: right;
	}

	.flowdrop-workflow-node__config-btn {
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
		backdrop-filter: var(--fd-backdrop-blur);
		z-index: 15;
		font-size: var(--fd-text-sm);
	}

	.flowdrop-workflow-node:hover .flowdrop-workflow-node__config-btn {
		opacity: 1;
	}

	.flowdrop-workflow-node__config-btn:hover {
		background-color: var(--fd-muted);
		border-color: var(--fd-border-strong);
		color: var(--fd-foreground);
	}
</style>
