<!--
  NodeDecorator: Renders node components as real SvelteFlow nodes
  inside a canvas, matching how they appear in the workflow editor.
-->
<script lang="ts">
	import { SvelteFlow } from "@xyflow/svelte";
	import type { Node } from "@xyflow/svelte";
	import "@xyflow/svelte/dist/style.css";
	import UniversalNode from "$lib/components/UniversalNode.svelte";
	import { registerBuiltinNodes } from "$lib/registry/builtinNodes.js";

	let { data, selected = false }: { data: Record<string, unknown>; selected?: boolean } = $props();

	// Ensure built-in node components are registered
	registerBuiltinNodes();

	const nodeTypes = {
		universalNode: UniversalNode,
	};

	let nodes = $derived<Node[]>([
		{
			id: "story-node",
			type: "universalNode",
			position: { x: 0, y: 0 },
			selected,
			data,
		},
	]);
</script>

<div class="node-decorator-wrapper">
	<SvelteFlow {nodes} edges={[]} {nodeTypes} fitView>
	</SvelteFlow>
</div>

<style>
	.node-decorator-wrapper {
		width: 600px;
		height: 400px;
		position: relative;
	}
</style>
