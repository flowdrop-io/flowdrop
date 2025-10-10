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
	import NodeStatusOverlay from './NodeStatusOverlay.svelte';
	import { shouldShowNodeStatus, getOptimalStatusPosition, getOptimalStatusSize } from '../utils/nodeWrapper.js';

	interface Props {
		data: WorkflowNode['data'] & {
			nodeId?: string;
			onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
		};
		selected?: boolean;
	}

	let props: Props = $props();

	// Determine which node component to render based on node type
	let nodeComponent = $derived(getNodeComponent(props.data.metadata?.type || 'workflowNode'));
	
	// Get execution info
	let executionInfo = $derived(props.data.executionInfo);
	let nodeType = $derived(props.data.metadata?.type || 'workflowNode');
	let shouldShowStatus = $derived(shouldShowNodeStatus(executionInfo) && nodeType !== 'note');

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
			case 'workflowNode':
			default:
				return WorkflowNodeComponent;
		}
	}

	/**
	 * Get optimal status position for this node type
	 */
	function getStatusPosition(): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' {
		return getOptimalStatusPosition(props.data.metadata?.type || 'workflowNode');
	}

	/**
	 * Get optimal status size for this node type
	 */
	function getStatusSize(): 'sm' | 'md' | 'lg' {
		return getOptimalStatusSize(props.data.metadata?.type || 'workflowNode');
	}
</script>

<div class="universal-node">
	<!-- Render the appropriate node component -->
	{#if nodeComponent === WorkflowNodeComponent}
		<WorkflowNodeComponent 
			data={props.data}
			selected={props.selected}
		/>
	{:else if nodeComponent === NotesNode}
		<NotesNode 
			data={props.data}
			selected={props.selected}
		/>
	{:else if nodeComponent === SimpleNode}
		<SimpleNode 
			data={props.data}
			selected={props.selected}
		/>
	{:else if nodeComponent === SquareNode}
		<SquareNode 
			data={props.data}
			selected={props.selected}
		/>
	{:else if nodeComponent === ToolNode}
		<ToolNode 
			data={props.data}
			selected={props.selected}
		/>
	{/if}
	
	<!-- Status overlay - only show if there's meaningful status information -->
	{#if shouldShowStatus}
		<NodeStatusOverlay
			nodeId={props.data.nodeId || 'unknown'}
			executionInfo={executionInfo}
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
