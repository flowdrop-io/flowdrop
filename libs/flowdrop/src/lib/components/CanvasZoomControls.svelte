<!--
  CanvasZoomControls

  The canvas's zoom / fit / lock buttons with a read-only count of what is on the
  canvas ("6 nodes") beside them. The count replaced the editor's status bar; the
  full "6 nodes · 6 connections" is its title and accessible name. A cycle warning,
  also formerly in the status bar, appears next to the count when the graph loops.

  Must render inside <SvelteFlow>: xyflow's Controls reads the flow store.
-->
<script lang="ts">
  import { Controls, useStore } from '@xyflow/svelte';
  import { CANVAS_FIT_PADDING } from '../utils/canvasFit.js';
  import { getMessages } from '$lib/messages/index.js';

  interface Props {
    /** Number of nodes on the canvas. */
    nodeCount: number;
    /** Number of connections (edges) on the canvas. */
    edgeCount: number;
    /** Whether the graph contains a cycle. */
    hasCycles?: boolean;
    /** Fit the view. Replaces xyflow's own fit, which would clip interface tags and ignore an open sheet. */
    onfit?: () => void;
  }

  let { nodeCount, edgeCount, hasCycles = false, onfit }: Props = $props();

  // Capture phase: take the fit button's click before xyflow's own handler runs.
  function takeFitClick(event: MouseEvent): void {
    if (!onfit || !(event.target as Element).closest?.('.svelte-flow__controls-fitview')) return;
    event.stopPropagation();
    onfit();
  }

  const getMsgs = getMessages();
  const msg = $derived(getMsgs().canvasStatus);
  const flowStore = useStore();
  const zoomPercent = $derived(Math.round(flowStore.viewport.zoom * 100));
  const summary = $derived(msg.summary({ nodes: nodeCount, edges: edgeCount }));
</script>

<Controls
  orientation="horizontal"
  fitViewOptions={{ padding: CANVAS_FIT_PADDING }}
  onclickcapture={takeFitClick}
>
  {#snippet after()}
    <div class="fd-zoom-status">
      <!-- Shown by themes that set --fd-zoom-percent-display; outside the live region so zooming is not announced -->
      <span class="fd-zoom-status__zoom" aria-hidden="true">{zoomPercent}% ·</span>
      <!-- aria-live announces count changes and cycle warnings -->
      <span class="fd-zoom-status__live" aria-live="polite" aria-atomic="true">
        <span class="fd-zoom-status__count" title={summary} aria-label={summary}>
          {msg.nodeCount({ n: nodeCount })}
        </span>
        {#if hasCycles}
          <span class="fd-zoom-status__cycles" title={msg.cyclesTitle}>{msg.cycles}</span>
        {/if}
      </span>
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

  .fd-zoom-status__zoom {
    display: var(--fd-zoom-percent-display, none);
    margin-right: calc(-1 * var(--fd-space-2xs));
    font-variant-numeric: tabular-nums;
  }

  .fd-zoom-status__live {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .fd-zoom-status__cycles {
    font-weight: 500;
    color: var(--fd-error);
  }
</style>
