<!--
  Port Coordinate Tracker Component
  Bridge component that exposes SvelteFlow's getInternalNode to the parent.
  Must be rendered inside SvelteFlowProvider context.

  Uses the same pattern as EdgeRefresher - a renderless component that hooks
  into the SvelteFlow context.
-->

<script lang="ts">
	import { useSvelteFlow, type InternalNode } from '@xyflow/svelte';
	import type { WorkflowNode as WorkflowNodeType } from '../types/index.js';
	import {
		rebuildAllPortCoordinates,
		updateNodePortCoordinates
	} from '../stores/portCoordinateStore.js';

	interface Props {
		/** Node to update coordinates for (e.g., during drag). Set to null when not dragging. */
		nodeToUpdate: WorkflowNodeType | null;
		/** Set to trigger a full rebuild of all port coordinates */
		rebuildTrigger: number;
		/** All workflow nodes - used for full rebuild */
		nodes: WorkflowNodeType[];
	}

	let { nodeToUpdate, rebuildTrigger, nodes }: Props = $props();

	const { getInternalNode } = useSvelteFlow();

	// Cast the getInternalNode function for our use
	const getInternal = getInternalNode as (id: string) => InternalNode | undefined;

	/**
	 * Rebuild all port coordinates when rebuildTrigger changes.
	 * Debounced to batch rapid position updates (e.g., animated auto-layout,
	 * magnetic child nodes following a parent drag).
	 */
	$effect(() => {
		const _trigger = rebuildTrigger;
		if (_trigger > 0) {
			const timeout = setTimeout(() => {
				rebuildAllPortCoordinates(nodes, getInternal);
			}, 150);
			return () => clearTimeout(timeout);
		}
	});

	/**
	 * Update a single node's coordinates when nodeToUpdate changes.
	 * This is used during drag for efficient per-node updates.
	 */
	$effect(() => {
		if (nodeToUpdate) {
			updateNodePortCoordinates(nodeToUpdate, getInternal);
		}
	});
</script>
