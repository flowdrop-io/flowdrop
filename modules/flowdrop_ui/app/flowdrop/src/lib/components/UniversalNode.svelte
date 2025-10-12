<!--
  Universal Node Component
  Renders any node type with automatic status overlay injection
  This component can replace individual node components in SvelteFlow
-->

<script lang="ts">
	import type { WorkflowNode } from '../types/index.js';
	import WorkflowNodeComponent from './WorkflowNode.svelte';
	import NotesNode from './NotesNode.svelte';
	import SimpleNode from './SimpleNode.svelte';
	import SquareNode from './SquareNode.svelte';
	import ToolNode from './ToolNode.svelte';
	import GatewayNode from './GatewayNode.svelte';
	import NodeStatusOverlay from './NodeStatusOverlay.svelte';
	import {
		shouldShowNodeStatus,
		getOptimalStatusPosition,
		getOptimalStatusSize
	} from '../utils/nodeWrapper.js';
	import { resolveComponentName } from '../utils/nodeTypes.js';

	interface Props {
		data: WorkflowNode['data'] & {
			nodeId?: string;
			onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
		};
		selected?: boolean;
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

	// Determine which node component to render based on node type
	// Priority: config.nodeType > metadata.type
	let resolvedComponentName = $derived(
		data.metadata
			? resolveComponentName(data.metadata, data.config?.nodeType as string | undefined)
			: 'workflowNode'
	);
	let nodeComponent = $derived(getNodeComponent(resolvedComponentName));

	// Get execution info
	let executionInfo = $derived(data.executionInfo);
	let shouldShowStatus = $derived(
		shouldShowNodeStatus(executionInfo) && resolvedComponentName !== 'note'
	);

	/**
	 * Get the appropriate node component based on type
	 */
	function getNodeComponent(nodeType: string) {
		switch (nodeType) {
			case 'note':
				return NotesNode;
			case 'simple':
				return SimpleNode;
			case 'square':
				return SquareNode;
			case 'tool':
				return ToolNode;
			case 'gateway':
				return GatewayNode;
			case 'workflowNode':
			default:
				return WorkflowNodeComponent;
		}
	}

	/**
	 * Get optimal status position for this node type
	 */
	function getStatusPosition(): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' {
		return getOptimalStatusPosition(resolvedComponentName);
	}

	/**
	 * Get optimal status size for this node type
	 */
	function getStatusSize(): 'sm' | 'md' | 'lg' {
		return getOptimalStatusSize(resolvedComponentName);
	}
</script>

<div class="universal-node">
	<!-- Render the appropriate node component -->
	{#if nodeComponent === WorkflowNodeComponent}
		<WorkflowNodeComponent {data} {selected} />
	{:else if nodeComponent === NotesNode}
		<NotesNode {data} {selected} />
	{:else if nodeComponent === SimpleNode}
		<SimpleNode {data} {selected} />
	{:else if nodeComponent === SquareNode}
		<SquareNode {data} {selected} />
	{:else if nodeComponent === ToolNode}
		<ToolNode {data} {selected} />
	{:else if nodeComponent === GatewayNode}
		<GatewayNode {data} {selected} />
	{/if}

	<!-- Status overlay - only show if there's meaningful status information -->
	{#if shouldShowStatus}
		<NodeStatusOverlay
			nodeId={data.nodeId || 'unknown'}
			{executionInfo}
			position={getStatusPosition()}
			size={getStatusSize()}
			showDetails={true}
		/>
	{/if}
</div>

<style>
	.universal-node {
		position: relative;
		display: inline-block;
	}
</style>
