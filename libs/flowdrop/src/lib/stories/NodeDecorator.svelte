<!--
  NodeDecorator: Wraps node components in a SvelteFlow context
  so that @xyflow/svelte Handle components and store access work properly.
-->
<script lang="ts">
	import { SvelteFlow } from "@xyflow/svelte";
	import type { Snippet } from "svelte";
	import "@xyflow/svelte/dist/style.css";

	let { children }: { children: Snippet } = $props();
</script>

<div class="node-decorator-wrapper">
	<SvelteFlow nodes={[]} edges={[]} fitView>
		<div class="node-decorator-content">
			{@render children()}
		</div>
	</SvelteFlow>
</div>

<style>
	.node-decorator-wrapper {
		width: 600px;
		height: 400px;
		position: relative;
	}

	.node-decorator-content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
	}
</style>
