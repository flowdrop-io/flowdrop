<!--
  StraightGuides Component
  A thin accent line along each wire that a dragged node has snapped straight
  (see utils/straightWires.ts). Drawn in flow coordinates inside a
  ViewportPortal, so it pans and zooms with the canvas; the stroke is divided
  by the zoom to stay about 2 screen px. Must be rendered inside <SvelteFlow>.
-->

<script lang="ts">
  import { ViewportPortal, useViewport } from '@xyflow/svelte';
  import type { StraightGuide } from '../utils/straightWires.js';

  interface Props {
    guides: readonly StraightGuide[];
  }

  let { guides }: Props = $props();

  const viewport = useViewport();
  let zoom = $derived(viewport.current.zoom || 1);
</script>

{#if guides.length > 0}
  <ViewportPortal target="front">
    {#each guides as guide (guide.wireId)}
      <div
        class="flowdrop-straight-guide"
        data-testid="straight-guide"
        style:left="{guide.x1}px"
        style:top="{guide.y}px"
        style:width="{guide.x2 - guide.x1}px"
        style:height="{2 / zoom}px"
      ></div>
    {/each}
  </ViewportPortal>
{/if}

<style>
  .flowdrop-straight-guide {
    position: absolute;
    transform: translateY(-50%);
    background: var(--fd-ring);
    pointer-events: none;
  }
</style>
