<!--
  CanvasDecorator: an empty canvas for components that float over it (toolbar,
  banner, context menu), set up like the editor's: zoom tier, zoom controls and
  dotted background. Pass `zoom` to open at a zoom level.
-->
<script lang="ts">
  import { SvelteFlow } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import type { Snippet } from 'svelte';
  import CanvasChrome from './CanvasChrome.svelte';
  import { useColorMode } from './colorMode.svelte.js';

  let { children, zoom = 1 }: { children: Snippet; zoom?: number } = $props();

  const color = useColorMode();
</script>

<div class="canvas-decorator-wrapper">
  <SvelteFlow
    nodes={[]}
    edges={[]}
    colorMode={color.current}
    minZoom={0.2}
    maxZoom={3}
    initialViewport={{ x: 0, y: 0, zoom }}
  >
    <CanvasChrome />
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
