<!--
  Universal Node Component
  Renders any node type with automatic status overlay injection.
  This component can replace individual node components in SvelteFlow.

  Uses the node component registry to resolve which component to render,
  enabling custom node types to be registered and used dynamically.
-->

<script lang="ts">
	import type { WorkflowNode } from '../types/index.js';
	import { nodeComponentRegistry } from '../registry/nodeComponentRegistry.js';
	import { resolveBuiltinAlias } from '../registry/builtinNodes.js';
	import NodeStatusOverlay from './NodeStatusOverlay.svelte';
	import { shouldShowNodeStatus } from '../utils/nodeWrapper.js';
	import { resolveComponentName } from '../utils/nodeTypes.js';

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

	/**
	 * Determine which node component to render based on node type.
	 * Priority: config.nodeType > metadata.type
	 * Explicitly track config.nodeType to ensure reactivity.
	 */
	let configNodeType = $derived(data.config?.nodeType as string | undefined);

	/**
	 * Resolve the component name from metadata and config.
	 * This handles the logic of choosing between config.nodeType and metadata.type.
	 */
	let resolvedComponentName = $derived(
		data.metadata ? resolveComponentName(data.metadata, configNodeType) : 'workflowNode'
	);

	/**
	 * Get the node component from the registry.
	 */
	let nodeComponent = $derived(getNodeComponent(resolvedComponentName));

	/**
	 * Get execution info for status overlay
	 */
	let executionInfo = $derived(data.executionInfo);

	/**
	 * Determine if status overlay should be shown.
	 * Hide for note nodes as they have their own styling.
	 */
	let shouldShowStatus = $derived(
		shouldShowNodeStatus(executionInfo) && resolvedComponentName !== 'note'
	);

	/**
	 * Get the node component for the given type from the registry.
	 *
	 * @param nodeType - The node type identifier
	 * @returns The Svelte component to render
	 */
	function getNodeComponent(nodeType: string) {
		// Resolve any aliases (e.g., "default" -> "workflowNode")
		const resolvedType = resolveBuiltinAlias(nodeType);

		// Get component from registry (defaults to workflowNode if not found)
		const component = nodeComponentRegistry.getComponent(resolvedType);
		if (component) {
			return component;
		}

		// Return the default component from registry
		return nodeComponentRegistry.getComponent('workflowNode');
	}

	/**
	 * Get optimal status position for this node type.
	 * Uses registry if available, otherwise falls back to defaults.
	 */
	function getStatusPosition(): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' {
		// Try registry first
		const position = nodeComponentRegistry.getStatusPosition(resolvedComponentName);
		if (position) {
			return position;
		}

		// Fallback based on node type
		switch (resolvedComponentName) {
			case 'tool':
				return 'top-left';
			case 'note':
				return 'bottom-right';
			case 'simple':
			case 'square':
			default:
				return 'top-right';
		}
	}

	/**
	 * Get optimal status size for this node type.
	 * Uses registry if available, otherwise falls back to defaults.
	 */
	function getStatusSize(): 'sm' | 'md' | 'lg' {
		// Try registry first
		const size = nodeComponentRegistry.getStatusSize(resolvedComponentName);
		if (size) {
			return size;
		}

		// Fallback based on node type
		switch (resolvedComponentName) {
			case 'tool':
			case 'note':
			case 'square':
				return 'sm';
			case 'simple':
			default:
				return 'md';
		}
	}
</script>

<div class="universal-node">
	<!-- Render the node component dynamically (Svelte 5 dynamic component syntax) -->
	{#if nodeComponent}
		<!-- svelte-ignore binding_property_non_reactive — Svelte 5 dynamic component limitation; reactivity maintained via $derived -->
		{@const NodeComponent = nodeComponent}
		<NodeComponent {data} {selected} />
	{/if}

	<!-- Status overlay - only show if there's meaningful status information -->
	{#if shouldShowStatus}
		<NodeStatusOverlay
			nodeId={data.nodeId ?? 'unknown'}
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
