<!--
  @component
  An empty canvas for components that draw their own controls into it.

  `CanvasDecorator` adds xyflow's default zoom buttons, which would double the ones
  `CanvasZoomControls` draws. This frame is the same SvelteFlow without them, so the component under
  test is the only control on the canvas. It follows the light/dark switch like the other decorators.
-->
<script lang="ts">
  import { SvelteFlow, Background } from '@xyflow/svelte';
  import type { ColorMode } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import type { Snippet } from 'svelte';

  let { children, height = '400px' }: { children: Snippet; height?: string } = $props();

  let colorMode = $state<ColorMode>(
    (document.documentElement.getAttribute('data-theme') as ColorMode) || 'light'
  );

  $effect(() => {
    const observer = new MutationObserver(() => {
      colorMode = (document.documentElement.getAttribute('data-theme') as ColorMode) || 'light';
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  });
</script>

<div class="flow-frame" style:height>
  <SvelteFlow nodes={[]} edges={[]} {colorMode}>
    <Background
      bgColor="var(--fd-canvas-bg)"
      gap={20}
      patternColor="var(--fd-grid-pattern-color)"
    />
    {@render children()}
  </SvelteFlow>
</div>

<style>
  .flow-frame {
    width: 800px;
    position: relative;
  }
</style>
