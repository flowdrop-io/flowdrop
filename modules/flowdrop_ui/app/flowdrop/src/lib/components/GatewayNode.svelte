<!--
  Gateway Node Component
  Visual representation of gateway/branch nodes with branching flow indicators
  Shows active branches, conditions, and execution paths
  Styled with BEM syntax
-->

<script lang="ts">
	import { Position, Handle } from '@xyflow/svelte';
	import type { WorkflowNode } from '../types/index.js';
	import Icon from '@iconify/svelte';
	import { getStatusColor, getStatusIcon, getStatusLabel } from '../utils/nodeStatus.js';
	import { getDataTypeColorToken } from '../utils/colors.js';

	// Define branch interface for better typing
	interface Branch {
		name: string;
		condition?: {
			operator: string;
			value: string;
			caseSensitive?: boolean;
		};
	}

	let {
		data,
		selected = false
	}: {
		data: WorkflowNode['data'] & {
			nodeId?: string;
			onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
		};
		selected?: boolean;
	} = $props();

	let isHandleInteraction = $state(false);

	// Gateway-specific data
	// Parse branches from CSV format: "value1:branch1,value2:branch2"
	let branches = $derived.by(() => {
		const branchesConfig = data.config?.branches || '';
		if (!branchesConfig || typeof branchesConfig !== 'string') {
			return [];
		}
		
		const branchList = [];
		const pairs = branchesConfig.split(',');
		
		for (const pair of pairs) {
			const trimmed = pair.trim();
			if (!trimmed) continue;
			
			const [value, branchName] = trimmed.split(':').map(s => s.trim());
			if (value && branchName) {
				branchList.push({ value, name: branchName });
			}
		}
		
		return branchList;
	});
	
	let defaultBranch = $derived(data.config?.defaultBranch || '');
	let activeBranches = $derived((data.executionInfo as any)?.output?.active_branches || []);

	// Debug logging for branches
	$effect(() => {
		console.log('🔍 Gateway Node Debug:', {
			nodeId: data.nodeId,
			branches: branches,
			branchesLength: branches.length,
			branchesType: typeof branches,
			branchesIsArray: Array.isArray(branches),
			defaultBranch,
			config: data.config
		});
	});

	// Node styling
	let nodeIcon = $derived(data.metadata?.icon || 'mdi:source-branch');
	let nodeColor = $derived(data.metadata?.color || '#10b981');
	let nodeLabel = $derived(data.label || 'Gateway');

	// Execution status
	let executionInfo = $derived(data.executionInfo);
	let isExecuting = $derived(executionInfo?.status === 'running');
	let hasError = $derived(
		(executionInfo?.status as string) === 'error' || (executionInfo?.status as string) === 'failed'
	);
	let isCompleted = $derived(executionInfo?.status === 'completed');

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
		if (data.onConfigOpen) {
			data.onConfigOpen({
				id: data.nodeId || '',
				type: 'gateway',
				data: data
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
	 * Get branch status for visual indication
	 */
	function getBranchStatus(branchName: string): 'active' | 'inactive' | 'default' {
		if (activeBranches.includes(branchName)) {
			return 'active';
		}
		if (branchName === defaultBranch) {
			return 'default';
		}
		return 'inactive';
	}


	/**
	 * Format branch condition for display
	 */
</script>

<div
	class="workflow-node workflow-node--gateway"
	class:workflow-node--selected={selected}
	class:workflow-node--executing={isExecuting}
	class:workflow-node--error={hasError}
	class:workflow-node--completed={isCompleted}
	onclick={handleNodeClick}
	ondblclick={handleNodeDoubleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
	style="--node-color: {nodeColor};"
>
	<!-- Input Handle -->
	<Handle
		type="target"
		position={Position.Left}
		class="workflow-node__handle workflow-node__handle--input"
		style="background-color: {getDataTypeColorToken('mixed')};"
	/>

	<!-- Node Content -->
	<div class="workflow-node__content">
		<!-- Header -->
		<div class="workflow-node__header">
			<div class="workflow-node__icon">
				<Icon icon="mdi:source-branch" />
			</div>
			<div class="workflow-node__title">
				<h3 class="workflow-node__label">{nodeLabel}</h3>
				<p class="workflow-node__type">Gateway</p>
			</div>
		</div>

		<!-- Branches Section -->
		{#if branches.length > 0}
			<div class="workflow-node__branches">
				<div class="workflow-node__branches-header">
					<Icon icon="mdi:source-branch" />
					<span>Branches ({branches.length})</span>
				</div>

				<div class="workflow-node__branches-list">
					{#each branches as branch, index}
						{@const branchStatus = getBranchStatus(branch.name)}
						<div
							class="workflow-node__branch"
							class:workflow-node__branch--active={branchStatus === 'active'}
							class:workflow-node__branch--default={branchStatus === 'default'}
							class:workflow-node__branch--inactive={branchStatus === 'inactive'}
						>
							<div class="workflow-node__branch-header">
								<Icon
									icon={branchStatus === 'active'
										? 'mdi:check-circle'
										: branchStatus === 'default'
											? 'mdi:circle-outline'
											: 'mdi:circle-outline'}
									class="workflow-node__branch-icon"
								/>
								<span class="workflow-node__branch-name">{branch.name}</span>
								{#if branchStatus === 'default'}
									<span class="workflow-node__branch-default">(default)</span>
								{/if}
							</div>

							<div class="workflow-node__branch-condition">
								Value: "{branch.value}"
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="workflow-node__no-branches">
				<Icon icon="mdi:alert-circle-outline" />
				<span>No branches configured</span>
			</div>
		{/if}

		<!-- Execution Status -->
		{#if executionInfo}
			<div class="workflow-node__execution">
				<div class="workflow-node__execution-status">
					<Icon
						icon={getStatusIcon(executionInfo.status)}
						class="workflow-node__status-icon"
						style="color: {getStatusColor(executionInfo.status)};"
					/>
					<span class="workflow-node__status-label">
						{getStatusLabel(executionInfo.status)}
					</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Output Handles for each branch -->
	{#each branches as branch, index}
		{@const isActive = activeBranches.includes(branch.name)}
		<Handle
			type="source"
			position={Position.Right}
			id="branch-{branch.name}"
			class="workflow-node__handle workflow-node__handle--output workflow-node__handle--branch {isActive
				? 'workflow-node__handle--active'
				: ''}"
			style="
				top: {20 + index * 40}px;
				background-color: {isActive ? nodeColor : '#e5e7eb'};
			"
		>
			<div class="workflow-node__handle-label">
				{branch.name}
			</div>
		</Handle>
	{/each}

	<!-- Default branch handle if configured -->
	{#if defaultBranch && !branches.some((b) => b.name === defaultBranch)}
		<Handle
			type="source"
			position={Position.Right}
			id="branch-{defaultBranch}"
			class="workflow-node__handle workflow-node__handle--output workflow-node__handle--default"
			style="
				top: {20 + branches.length * 40}px;
				background-color: {nodeColor};
			"
		>
			<div class="workflow-node__handle-label">
				{defaultBranch} (default)
			</div>
		</Handle>
	{/if}
</div>

<style>
	.workflow-node--gateway {
		min-width: 280px;
		max-width: 400px;
		background: white;
		border: 2px solid var(--node-color, #10b981);
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
		position: relative;
	}

	.workflow-node--gateway:hover {
		box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.workflow-node--gateway.workflow-node--selected {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.workflow-node--gateway.workflow-node--executing {
		border-color: #f59e0b;
		animation: pulse 2s infinite;
	}

	.workflow-node--gateway.workflow-node--error {
		border-color: #ef4444;
	}

	.workflow-node--gateway.workflow-node--completed {
		border-color: #10b981;
	}

	.workflow-node__content {
		padding: 16px;
	}

	.workflow-node__header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.workflow-node__icon {
		font-size: 1.5rem;
		color: var(--node-color, #10b981);
	}

	.workflow-node__title {
		flex: 1;
	}

	.workflow-node__label {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: #1f2937;
	}

	.workflow-node__type {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.workflow-node__branches {
		margin-bottom: 16px;
	}

	.workflow-node__branches-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 12px;
	}

	.workflow-node__branches-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.workflow-node__branch {
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid #e5e7eb;
		background: #f9fafb;
		transition: all 0.2s ease;
	}

	.workflow-node__branch--active {
		border-color: var(--node-color, #10b981);
		background: rgba(16, 185, 129, 0.1);
	}

	.workflow-node__branch--default {
		border-color: #6b7280;
		background: #f3f4f6;
	}

	.workflow-node__branch-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.workflow-node__branch-name {
		font-weight: 500;
		font-size: 0.875rem;
		color: #374151;
	}

	.workflow-node__branch-default {
		font-size: 0.75rem;
		color: #6b7280;
		font-style: italic;
	}

	.workflow-node__branch-condition {
		font-size: 0.75rem;
		color: #6b7280;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		background: rgba(0, 0, 0, 0.05);
		padding: 2px 6px;
		border-radius: 3px;
		margin-top: 4px;
	}

	.workflow-node__no-branches {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px;
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 6px;
		color: #92400e;
		font-size: 0.875rem;
	}

	.workflow-node__execution {
		border-top: 1px solid #e5e7eb;
		padding-top: 12px;
	}

	.workflow-node__execution-status {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.workflow-node__status-label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.workflow-node__handle-label {
		position: absolute;
		right: -8px;
		top: 50%;
		transform: translateY(-50%);
		background: white;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		color: #374151;
		white-space: nowrap;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}
</style>
