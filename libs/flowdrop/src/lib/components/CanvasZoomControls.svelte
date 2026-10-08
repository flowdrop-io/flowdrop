<!--
  CanvasZoomControls

  The canvas's zoom / fit / lock buttons with a read-only count of what is on the
  canvas ("6 nodes") beside them. The count replaced the editor's status bar; the
  full "6 nodes · 6 connections" is its title and accessible name. A cycle warning,
  also formerly in the status bar, appears next to the count when the graph loops.

  Must render inside <SvelteFlow>: xyflow's Controls reads the flow store.
-->
<script lang="ts">
  import { Controls } from '@xyflow/svelte';
  import { getMessages } from '$lib/messages/index.js';

  interface Props {
    /** Number of nodes on the canvas. */
    nodeCount: number;
    /** Number of connections (edges) on the canvas. */
    edgeCount: number;
    /** Whether the graph contains a cycle. */
    hasCycles?: boolean;
  }

  let { nodeCount, edgeCount, hasCycles = false }: Props = $props();

  const getMsgs = getMessages();
  const msg = $derived(getMsgs().canvasStatus);
  const summary = $derived(msg.summary({ nodes: nodeCount, edges: edgeCount }));
</script>

<Controls orientation="horizontal">
  {#snippet after()}
    <!-- aria-live announces count changes and cycle warnings -->
    <div class="fd-zoom-status" aria-live="polite" aria-atomic="true">
      <span class="fd-zoom-status__count" title={summary} aria-label={summary}>
        {msg.nodeCount({ n: nodeCount })}
      </span>
      {#if hasCycles}
        <span class="fd-zoom-status__cycles" title={msg.cyclesTitle}>{msg.cycles}</span>
      {/if}
    </div>
  {/snippet}
</Controls>

<style>
  .fd-zoom-status {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: 0 var(--fd-space-sm);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    white-space: nowrap;
  }

  .fd-zoom-status__cycles {
    font-weight: 500;
    color: var(--fd-error);
  }
</style>
