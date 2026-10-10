<!--
  Node Status Overlay Component
  The run status of a node, drawn at screen size: a StatusPill (icon + label,
  plus a count when the node has more than one run) centred on the node's top
  edge and counter-scaled by the canvas zoom (clamp(1/zoom, 1, 2.2), growing
  upward off the node). In the map zoom tier (below 25%, `data-fd-zoom='map'` on
  the editor root) the pill gives way to a status-coloured outline around the
  node and a count badge; both are in the DOM and CSS picks one, so crossing the
  threshold re-renders nothing.

  Hover shows the count and the last error line, nothing else; durations and
  job history live in the inspector's Last run tab.

  Execution statuses map onto the five pill statuses with `toPillStatus()`
  (utils/nodeStatus.ts); a node whose status maps to nothing (idle, pending)
  draws nothing.

  `zoom` is a prop, not read from the canvas here, so the component works
  outside a SvelteFlow (stories, tests); UniversalNode passes the viewport zoom.
  Styled with BEM syntax
-->

<script lang="ts">
  import type { NodeExecutionInfo } from '../types/index.js';
  import Icon from '@iconify/svelte';
  import StatusPill, { counterScale } from './primitives/StatusPill.svelte';
  import { getStatusLabel, toPillStatus } from '../utils/nodeStatus.js';
  import { getMessages } from '../messages/context.js';
  import { m } from '$lib/messages/index.js';

  const ICONS = {
    running: 'heroicons:arrow-path',
    completed: 'heroicons:check-circle',
    waiting: 'heroicons:hand-raised',
    failed: 'heroicons:exclamation-circle',
    skipped: 'heroicons:minus-circle'
  } as const;

  interface Props {
    nodeId?: string;
    executionInfo?: NodeExecutionInfo;
    /** @deprecated No effect: the pill has one size and scales with the zoom. */
    size?: 'sm' | 'md' | 'lg';
    /** Canvas zoom factor (1 = 100%). */
    zoom?: number;
  }

  // eslint-disable-next-line svelte/no-unused-props -- `size` is a deprecated no-op kept for hosts
  let props: Props = $props();

  const zoom = $derived(props.zoom ?? 1);

  const executionInfo = $derived(props.executionInfo);
  const pillStatus = $derived(executionInfo ? toPillStatus(executionInfo.status) : null);

  // Loop iterations create several jobs per node, including a never-started
  // job swept to "skipped"; the per-job history (when known) beats the count of
  // started runs.
  const runCount = $derived(executionInfo?.jobs?.length ?? executionInfo?.executionCount ?? 0);

  const getMsgs = getMessages();
  const overlay = $derived(m().status.overlay);

  /** Hover text: count (when above 1) and the last error's first line. */
  const tooltip = $derived.by(() => {
    if (!executionInfo || !pillStatus) return '';
    const lines: string[] = [getMsgs().statusPill[pillStatus]];
    if (runCount > 1) lines.push(overlay.runs({ count: runCount }));
    const error = executionInfo.lastError?.trim().split('\n')[0];
    if (error) lines.push(error);
    return lines.join('\n');
  });
</script>

{#if executionInfo && pillStatus}
  <div
    class="node-status-overlay node-status-overlay--{pillStatus}"
    data-node-id={props.nodeId}
    data-status={pillStatus}
    data-execution-status={executionInfo.status}
    role="status"
    aria-label={overlay.ariaLabel({ status: getStatusLabel(executionInfo.status) })}
  >
    <span class="node-status-overlay__frame" aria-hidden="true"></span>
    <span class="node-status-overlay__outline" aria-hidden="true" style="--_stroke: {3 / zoom}px;"
    ></span>
    <span
      class="node-status-overlay__badge"
      title={tooltip}
      style="transform: scale({counterScale(zoom)});"
    >
      {#if runCount > 1}
        {runCount}
      {:else}
        <Icon icon={ICONS[pillStatus]} />
      {/if}
    </span>
    <span class="node-status-overlay__pill" title={tooltip}>
      <StatusPill status={pillStatus} count={runCount} {zoom} screenSize />
    </span>
  </div>
{/if}

<style>
  .node-status-overlay {
    --_status: var(--fd-status-skipped);
    --_soft: var(--fd-status-skipped-soft);
    /* Border thickening for Test mode (applied by UniversalNode); only a node that waits gets the halo. */
    --_frame: 0 0 0 var(--fd-node-status-edge) var(--_status);
    position: absolute;
    inset: 0;
    z-index: 1000;
    /* Clicks go through to the node; only the pill itself takes hover. */
    pointer-events: none;
  }

  .node-status-overlay--running {
    --_status: var(--fd-status-running);
    --_soft: var(--fd-status-running-soft);
  }
  .node-status-overlay--completed {
    --_status: var(--fd-status-completed);
    --_soft: var(--fd-status-completed-soft);
  }
  .node-status-overlay--waiting {
    --_status: var(--fd-status-waiting);
    --_soft: var(--fd-status-waiting-soft);
    --_frame:
      0 0 0 var(--fd-node-status-edge) var(--_status),
      0 0 0 calc(var(--fd-node-status-edge) + var(--fd-node-status-ring)) var(--_soft);
  }
  .node-status-overlay--failed {
    --_status: var(--fd-status-failed);
    --_soft: var(--fd-status-failed-soft);
  }

  /* Centred on the top edge at zoom 1; the pill's own transform grows it upward. */
  .node-status-overlay__pill {
    position: absolute;
    left: 50%;
    bottom: calc(100% - var(--fd-status-pill-height) / 2);
    translate: -50% 0;
    pointer-events: auto;
    display: block;
  }

  /* The pill sits on the node's border, so its tint needs an opaque backing
     (the soft tokens are translucent in dark mode). */
  .node-status-overlay__pill :global(.flowdrop-ui-status-pill) {
    background: linear-gradient(var(--_soft), var(--_soft)), var(--fd-card);
  }

  /* Carries the shadows that thicken the node's status-coloured border (and
     draw the waiting halo); UniversalNode sets them, in Test mode only. */
  .node-status-overlay__frame {
    position: absolute;
    inset: 0;
    border-radius: var(--fd-node-radius, 8px);
    pointer-events: none;
  }

  /* Map tier: the outline and count badge stand in for the pill and the frame. */
  .node-status-overlay__outline,
  .node-status-overlay__badge {
    display: none;
  }

  :global([data-fd-zoom='map']) .node-status-overlay__outline {
    display: block;
  }

  :global([data-fd-zoom='map']) .node-status-overlay__badge {
    display: grid;
  }

  :global([data-fd-zoom='map']) .node-status-overlay__pill,
  :global([data-fd-zoom='map']) .node-status-overlay__frame {
    display: none;
  }

  .node-status-overlay__outline {
    position: absolute;
    /* A 3px stroke on screen whatever the zoom (--_stroke = 3px / zoom). */
    inset: calc(var(--_stroke) * -1);
    border: var(--_stroke) solid var(--_status);
    border-radius: calc(var(--fd-node-radius, 8px) + var(--_stroke));
  }

  .node-status-overlay__badge {
    position: absolute;
    left: 50%;
    top: 0;
    translate: -50% -50%;
    transform-origin: center;
    pointer-events: auto;
    place-items: center;
    min-width: var(--fd-control-md);
    height: var(--fd-control-md);
    padding-inline: var(--fd-space-xs);
    box-sizing: border-box;
    border-radius: var(--fd-radius-full);
    background: var(--_status);
    color: var(--fd-background);
    font-family: var(--fd-font-sans);
    font-size: var(--fd-text-xs);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
</style>
