<!--
  NodePreview: Renders a single node on a SvelteFlow canvas.
  Mirrors the Storybook NodeDecorator pattern for use in documentation.
-->
<script lang="ts">
	import { SvelteFlow } from '@xyflow/svelte';
	import type { Node, ColorMode } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { UniversalNode, registerBuiltinNodes } from '@flowdrop/flowdrop/editor';
	import '@flowdrop/flowdrop/styles';

	let {
		data,
		theme = 'dark'
	}: {
		data: Record<string, unknown>;
		theme?: string;
	} = $props();

	registerBuiltinNodes();

	const nodeTypes = { universalNode: UniversalNode };

	let nodes = $derived<Node[]>([
		{
			id: 'preview-node',
			type: 'universalNode',
			position: { x: 0, y: 0 },
			selected: false,
			data
		}
	]);

	let colorMode = $derived<ColorMode>(theme === 'light' ? 'light' : 'dark');
</script>

<div class="node-preview-canvas">
	<SvelteFlow
		{nodes}
		edges={[]}
		{nodeTypes}
		fitView
		fitViewOptions={{ maxZoom: 0.85, padding: 0.3 }}
		{colorMode}
		nodesDraggable={false}
		nodesConnectable={false}
		elementsSelectable={false}
		panOnDrag={false}
		zoomOnScroll={false}
		zoomOnPinch={false}
		zoomOnDoubleClick={false}
		preventScrolling={false}
	/>
</div>

<style>
	.node-preview-canvas {
		width: 100%;
		height: 100%;
		position: relative;
	}

	/* Map themed CSS variable for dark mode background */
	.node-preview-canvas :global(.svelte-flow.dark) {
		--background-color-default: var(--xy-background-color-default);
	}

	/* Hide attribution and controls */
	.node-preview-canvas :global(.svelte-flow__attribution) {
		display: none;
	}
</style>
