<!--
  Gateway Node Component
  Visual representation of gateway/branch nodes with branching flow indicators
  Shows active branches and execution paths
  Styled with BEM syntax following WorkflowNode pattern
  
  UI Extensions Support:
  - hideUnconnectedHandles: Hides ports that are not connected to reduce visual clutter
-->

<script lang="ts">
	import { Position, Handle } from '@xyflow/svelte';
	import type { WorkflowNode, NodePort, Branch } from '../../types/index.js';
	import Icon from '@iconify/svelte';
	import { getNodeIcon } from '../../utils/icons.js';
	import { getDataTypeColorToken, getCategoryColorToken } from '../../utils/colors.js';
	import { connectedHandles } from '../../stores/workflowStore.js';

	interface Props {
		data: WorkflowNode['data'] & {
			nodeId?: string;
			onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
		};
		selected?: boolean;
	}

	let props: Props = $props();

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
	 */
	const visibleInputPorts = $derived(
		props.data.metadata.inputs.filter((port) => isPortVisible(port, 'input'))
	);

	/**
	 * Check if a branch output should be visible based on connection state
	 * @param branchName - The branch name to check
	 * @returns true if the branch should be visible
	 */
	function isBranchVisible(branchName: string): boolean {
		// Always show if hideUnconnectedHandles is disabled
		if (!hideUnconnectedHandles()) {
			return true;
		}

		// Check if branch output is connected
		const handleId = `${props.data.nodeId}-output-${branchName}`;
		return $connectedHandles.has(handleId);
	}

	// Gateway-specific data - branches are calculated at runtime from config
	let branches = $derived((props.data.config?.branches as Branch[]) || []);
	let activeBranches = $derived((props.data.executionInfo as any)?.output?.active_branches || []);

	/**
	 * Derived list of visible branches based on hideUnconnectedHandles setting
	 */
	const visibleBranches = $derived(branches.filter((branch) => isBranchVisible(branch.name)));

	/**
	 * Handle node click - only handle selection, no config opening
	 */
	function handleNodeClick(): void {
		// Node selection is handled by Svelte Flow
	}

	/**
	 * Handle double-click to open config
	 */
	function handleNodeDoubleClick(): void {
		if (props.data.onConfigOpen) {
			props.data.onConfigOpen({
				id: props.data.nodeId || '',
				type: 'gateway',
				data: props.data
			});
		}
	}

	/**
	 * Handle keyboard events for accessibility
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleNodeClick();
		}
	}

	/**
	 * Check if a branch is active
	 */
	function isBranchActive(branchName: string): boolean {
		return activeBranches.includes(branchName);
	}
</script>

<!-- Node Container -->
<div
	class="flowdrop-workflow-node flowdrop-workflow-node--gateway"
	class:flowdrop-workflow-node--selected={props.selected}
	onclick={handleNodeClick}
	ondblclick={handleNodeDoubleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
	aria-label="Gateway node: {props.data.metadata.name}"
	aria-describedby="node-description-{props.data.nodeId || 'unknown'}"
>
	<!-- Node Header -->
	<div class="flowdrop-workflow-node__header">
		<div class="flowdrop-flex flowdrop-gap--3 flowdrop-items--center">
			<!-- Node Icon -->
			<div
				class="flowdrop-workflow-node__icon"
				style="background-color: {getCategoryColorToken(props.data.metadata.category)}"
			>
				<Icon icon={getNodeIcon(props.data.metadata.icon, props.data.metadata.category)} />
			</div>

			<!-- Node Title -->
			<h3 class="flowdrop-text--sm flowdrop-font--medium flowdrop-truncate flowdrop-flex--1">
				{props.data.label}
			</h3>
		</div>
		<!-- Node Description -->
		<p
			class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate flowdrop-mt--1"
			id="node-description-{props.data.nodeId || 'unknown'}"
		>
			{props.data.metadata.description}
		</p>
	</div>

	<!-- Input Ports Container (filtered based on hideUnconnectedHandles) -->
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
							style="top: 50%; transform: translateY(-50%); margin-left: -32px; background-color: {getDataTypeColorToken(
								port.dataType
							)}; border-color: '#ffffff';"
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
									style="background-color: {getDataTypeColorToken(port.dataType)}; color: #fff;"
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

	<!-- Branches Section (Output Ports) - filtered based on hideUnconnectedHandles -->
	{#if visibleBranches.length > 0}
		<div class="flowdrop-workflow-node__ports">
			<div class="flowdrop-workflow-node__ports-header">
				<h5 class="flowdrop-workflow-node__ports-title">
					<Icon icon="mdi:source-branch" />
					<span>Branches ({visibleBranches.length})</span>
				</h5>
			</div>
			<div class="flowdrop-workflow-node__ports-list">
				{#each visibleBranches as branch (branch.name)}
					{@const isActive = isBranchActive(branch.name)}
					<div class="flowdrop-workflow-node__port">
						<!-- Port Info -->
						<div class="flowdrop-flex--1 flowdrop-min-w--0 flowdrop-text--right">
							<div
								class="flowdrop-flex flowdrop-gap--2 flowdrop-justify--end flowdrop-items--center"
							>
								{#if isActive}
									<span style="color: {getDataTypeColorToken('trigger')};">
										<Icon icon="mdi:check-circle" />
									</span>
								{/if}
								<span
									class="flowdrop-text--xs flowdrop-font--medium"
									class:flowdrop-text--active={isActive}
								>
									{branch.label || branch.name}
								</span>
								<span
									class="flowdrop-badge flowdrop-badge--sm"
									style="background-color: {getDataTypeColorToken('trigger')}; color: #fff;"
								>
									trigger
								</span>
							</div>
						</div>

						<!-- Output Handle - Generated from branch name -->
						<Handle
							type="source"
							position={Position.Right}
							id={`${props.data.nodeId}-output-${branch.name}`}
							class={`flowdrop-workflow-node__handle ${isActive ? 'flowdrop-workflow-node__handle--active' : ''}`}
							style="top: 50%; transform: translateY(-50%); margin-right: -32px; background-color: {isActive
								? getDataTypeColorToken('trigger')
								: getDataTypeColorToken('trigger')}; border-color: '#ffffff';"
							role="button"
							tabindex={0}
							aria-label="Connect from {branch.name} branch"
						/>
					</div>
				{/each}
			</div>
		</div>
	{:else if branches.length === 0}
		<!-- No branches configured at all -->
		<div class="flowdrop-workflow-node__ports">
			<div class="workflow-node__no-branches">
				<Icon icon="mdi:alert-circle-outline" />
				<span>No branches configured</span>
			</div>
		</div>
	{/if}
	<!-- Note: When all branches are hidden due to hideUnconnectedHandles, we don't show anything -->

	<!-- Config button -->
	<button
		class="flowdrop-workflow-node__config-btn"
		onclick={handleNodeDoubleClick}
		title="Configure node"
	>
		<Icon icon="mdi:cog" />
	</button>
</div>

<style>
	.flowdrop-workflow-node {
		position: relative;
		background-color: #ffffff;
		border: 2px solid #e5e7eb;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		width: 18rem;
		z-index: 10;
	}

	.flowdrop-workflow-node--gateway {
		min-width: 18rem;
	}

	.flowdrop-workflow-node--selected {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		border: 2px solid #3b82f6;
	}

	.flowdrop-workflow-node__header {
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
		background-color: #f9fafb;
		border-top-left-radius: 0.75rem;
		border-top-right-radius: 0.75rem;
	}

	.flowdrop-workflow-node__icon {
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.flowdrop-workflow-node__header h3 {
		margin: 0;
		line-height: 1;
	}

	.flowdrop-workflow-node__ports {
		padding: 0.75rem 1rem;
	}

	.flowdrop-workflow-node__ports-header {
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.flowdrop-workflow-node__ports-title {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.flowdrop-workflow-node__ports-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.flowdrop-workflow-node__port {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		position: relative;
	}

	.flowdrop-badge {
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.flowdrop-badge--error {
		background-color: #ef4444;
		color: #ffffff;
	}

	.flowdrop-badge--sm {
		font-size: 0.625rem;
		padding: 0.125rem 0.25rem;
	}

	.workflow-node__no-branches {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 0.5rem;
		color: #92400e;
		font-size: 0.875rem;
	}

	/* Handle styles */
	:global(.flowdrop-workflow-node__handle) {
		width: 0.75rem;
		height: 0.75rem;
		background-color: #6b7280;
		border: 2px solid #ffffff;
		border-radius: 50%;
		transition: all 0.2s ease-in-out;
		cursor: pointer;
	}

	:global(.flowdrop-workflow-node__handle:hover) {
		background-color: #3b82f6;
		transform: scale(1.2);
	}

	:global(.flowdrop-workflow-node__handle:focus) {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	:global(.flowdrop-workflow-node__handle--active) {
		transform: scale(1.15);
		box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
	}

	/* Utility classes */
	.flowdrop-flex {
		display: flex;
	}

	.flowdrop-flex--1 {
		flex: 1;
	}

	.flowdrop-gap--2 {
		gap: 0.5rem;
	}

	.flowdrop-gap--3 {
		gap: 0.75rem;
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
		font-size: 0.75rem;
		line-height: 1rem;
	}

	.flowdrop-text--sm {
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	.flowdrop-text--gray {
		color: #6b7280;
	}

	.flowdrop-text--active {
		color: #10b981;
		font-weight: 600;
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
		margin-top: 0.25rem;
	}

	.flowdrop-text--right {
		text-align: right;
	}

	.flowdrop-workflow-node__config-btn {
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

	.flowdrop-workflow-node:hover .flowdrop-workflow-node__config-btn {
		opacity: 1;
	}

	.flowdrop-workflow-node__config-btn:hover {
		background-color: #f9fafb;
		border-color: #d1d5db;
		color: #374151;
	}
</style>
