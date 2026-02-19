<!--
  Flow Drop Zone Component
  Handles drag and drop with proper coordinate transformation
  Must be used inside SvelteFlowProvider
-->

<script lang="ts">
	import { useSvelteFlow } from '@xyflow/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		ondrop: (nodeTypeData: string, position: { x: number; y: number }) => void;
		children: Snippet;
	}

	let props: Props = $props();

	// Access SvelteFlow instance for coordinate transformation
	const { screenToFlowPosition } = useSvelteFlow();

	/**
	 * Handle drag over event
	 */
	function handleDragOver(e: DragEvent): void {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
	}

	/**
	 * Handle drop event with proper coordinate transformation
	 */
	function handleDrop(e: DragEvent): void {
		e.preventDefault();

		// Get the data from the drag event
		const nodeTypeData = e.dataTransfer?.getData('application/json');
		if (nodeTypeData) {
			// Convert screen coordinates to flow coordinates (accounts for zoom and pan)
			const position = screenToFlowPosition({
				x: e.clientX,
				y: e.clientY
			});

			// Call the parent handler with the converted position
			props.ondrop(nodeTypeData, position);
		}
	}
</script>

<div
	class="flow-drop-zone"
	role="application"
	aria-label="Workflow canvas"
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	{@render props.children()}
</div>

<style>
	.flow-drop-zone {
		width: 100%;
		height: 100%;
	}
</style>
