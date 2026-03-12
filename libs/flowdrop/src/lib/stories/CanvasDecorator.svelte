<!--
  CanvasDecorator: Renders child components inside an empty SvelteFlow canvas,
  matching how overlay components (e.g. CanvasBanner) appear in the workflow editor.
-->
<script lang="ts">
  import { SvelteFlow, Controls } from "@xyflow/svelte";
  import type { ColorMode } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();

  // Watch the data-theme attribute set by Storybook's addon-themes
  let colorMode = $state<ColorMode>(
    (document.documentElement.getAttribute("data-theme") as ColorMode) ||
      "light",
  );

  $effect(() => {
    const observer = new MutationObserver(() => {
      colorMode =
        (document.documentElement.getAttribute("data-theme") as ColorMode) ||
        "light";
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  });
</script>

<div class="canvas-decorator-wrapper">
  <SvelteFlow nodes={[]} edges={[]} {colorMode}>
    <Controls />
    {@render children()}
  </SvelteFlow>
</div>

<style>
  .canvas-decorator-wrapper {
    width: 800px;
    height: 400px;
    position: relative;
  }

  /* Fix: SvelteFlow's scoped styles use non-prefixed --background-color-default
	   which doesn't update with colorMode="dark". Map the --xy- themed value. */
  .canvas-decorator-wrapper :global(.svelte-flow.dark) {
    --background-color-default: var(--xy-background-color-default);
  }
</style>
