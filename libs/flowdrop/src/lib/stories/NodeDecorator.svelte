<!--
  NodeDecorator: Renders node components as real SvelteFlow nodes
  inside a canvas, matching how they appear in the workflow editor.
-->
<script lang="ts">
	import { SvelteFlow, Controls } from "@xyflow/svelte";
	import type { Node, ColorMode } from "@xyflow/svelte";
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

	// Watch the data-theme attribute set by Storybook's addon-themes
	let colorMode = $state<ColorMode>(
		(document.documentElement.getAttribute("data-theme") as ColorMode) || "light",
	);

	$effect(() => {
		const observer = new MutationObserver(() => {
			colorMode =
				(document.documentElement.getAttribute("data-theme") as ColorMode) || "light";
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => observer.disconnect();
	});
</script>

<div class="node-decorator-wrapper">
	<SvelteFlow
		{nodes}
		edges={[]}
		{nodeTypes}
		fitView
		fitViewOptions={{ maxZoom: 0.85, padding: 0.2 }}
		{colorMode}
	>
		<Controls />
	</SvelteFlow>
</div>

<style>
	.node-decorator-wrapper {
		width: 800px;
		height: 400px;
		position: relative;
	}

	/* Fix: SvelteFlow's scoped styles use non-prefixed --background-color-default
	   which doesn't update with colorMode="dark". Map the --xy- themed value. */
	.node-decorator-wrapper :global(.svelte-flow.dark) {
		--background-color-default: var(--xy-background-color-default);
	}
</style>
