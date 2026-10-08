<!--
  RunBar — the run pill in the canvas toolbar (`CanvasToolbar` renders it).

  Shown only while the instance has a run (`fd.runs.activeRun`): there is no
  idle pill. It says where the run stands, offers Stop while the run is live and
  Open (to Test mode) when it waits for a person, and, in Edit mode, fades out
  a few seconds after the run ends. The node status badges fade with it:
  dismissing the run clears `fd.playground.nodeStatuses`.

  In Test mode (`mode="test"`) the pill shows only while the run is live (status
  and Stop; no Open, you are already there) and never dismisses the run: the
  Playground owns the run's record there.

  Node statuses are not loaded here: `App` owns that (one coalesced
  `fd.runs.requestNodeStatuses()` for Test mode and the Edit-mode run).

  Renders inline (a separator plus the pill), meant to sit inside a `Toolbar`.
-->

<script lang="ts">
  import { getInstance } from '../stores/getInstance.svelte.js';
  import { getMessages } from '../messages/context.js';
  import { TERMINAL_RUN_STATUSES } from '../stores/runController.svelte.js';
  import type { StatusPillStatus } from './primitives/StatusPill.svelte';
  import StatusPill from './primitives/StatusPill.svelte';
  import Button from './primitives/Button.svelte';
  import ToolbarSeparator from './primitives/ToolbarSeparator.svelte';

  interface Props {
    /**
     * Take the person to the run in Test mode. The Open button is shown only
     * when this is set.
     */
    onOpen?: () => void;
    /**
     * Take a failed run to the Assistant (Edit mode, run attached). The
     * "Ask the Assistant" button is shown only when this is set and the run
     * failed with a known pipeline.
     */
    onAskAssistant?: (runId: string) => void;
    /** How long a finished run's pill stays, in milliseconds. @default 4500 */
    fadeMs?: number;
    /** Editor mode the pill is shown in. @default 'edit' */
    mode?: 'edit' | 'test';
  }

  let { onOpen, onAskAssistant, fadeMs = 4500, mode = 'edit' }: Props = $props();

  const fd = getInstance();
  const getMsgs = getMessages();
  const msgs = $derived(getMsgs().runBar);

  /** The fade itself, at the end of the visible time. */
  const FADE_OUT_MS = 300;

  const run = $derived(fd.runs.activeRun);
  const status = $derived(run?.status ?? null);
  const endedAt = $derived(run?.endedAt ?? null);
  const live = $derived(status === 'running' || status === 'waiting');
  const ended = $derived(status !== null && TERMINAL_RUN_STATUSES.includes(status));

  const pillStatus = $derived<StatusPillStatus | null>(
    status === null
      ? null
      : status === 'done'
        ? 'completed'
        : status === 'stopped'
          ? 'skipped'
          : status
  );
  /** Test mode shows the pill only while the run is live. */
  const visible = $derived(mode === 'test' ? live : status !== null);

  const statusLabel = $derived(status ? msgs[status] : '');
  const announcement = $derived(status ? msgs.announce[status] : '');

  // The bar stays put while it is hovered or holds focus: a person reading it
  // or about to press Open is not made to chase it.
  let held = $state(false);
  let heldUntil = $state(0);
  let fading = $state(false);

  function hold() {
    held = true;
  }
  function release() {
    held = false;
    heldUntil = Date.now();
  }

  // Fade after the run ends, then drop the run (and with it the badges).
  $effect(() => {
    if (mode !== 'edit' || !ended || held) {
      fading = false;
      return;
    }
    const since = Math.max(endedAt ?? Date.now(), heldUntil);
    const remaining = Math.max(0, fadeMs - (Date.now() - since));
    const fadeTimer = setTimeout(() => (fading = true), Math.max(0, remaining - FADE_OUT_MS));
    const dismissTimer = setTimeout(() => fd.runs.dismissRun(), remaining);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  });
</script>

<!-- Always present, so a change of text is announced; the bar itself comes and goes. -->
<div class="flowdrop-run-bar__live" role="status" aria-live="polite" aria-atomic="true">
  {announcement}
</div>

{#if run && status && pillStatus && visible}
  <ToolbarSeparator />
  <div
    class="flowdrop-run-bar flowdrop-run-bar--{status}"
    class:flowdrop-run-bar--fading={fading}
    role="group"
    aria-label={msgs.label}
    onmouseenter={hold}
    onmouseleave={release}
    onfocusin={hold}
    onfocusout={release}
  >
    <StatusPill status={pillStatus} label={statusLabel} size="sm" />
    {#if status === 'waiting' && onOpen && mode === 'edit'}
      <Button variant="primary" size="sm" ariaLabel={msgs.openLabel} onclick={onOpen}>
        {msgs.open}
      </Button>
    {/if}
    {#if status === 'failed' && run.runId && onAskAssistant}
      {@const failedRunId = run.runId}
      <Button
        variant="primary"
        size="sm"
        data-testid="run-bar-ask-assistant"
        ariaLabel={msgs.askAssistantLabel}
        onclick={() => onAskAssistant(failedRunId)}
      >
        {msgs.askAssistant}
      </Button>
    {/if}
    {#if live}
      <Button
        variant="danger"
        size="sm"
        ariaLabel={msgs.stopLabel}
        onclick={() => void fd.runs.stopRun()}
      >
        {msgs.stop}
      </Button>
    {/if}
  </div>
{/if}

<style>
  .flowdrop-run-bar__live {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .flowdrop-run-bar {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    opacity: 1;
    transition: opacity 300ms ease;
  }
  .flowdrop-run-bar--fading {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .flowdrop-run-bar {
      transition: none;
    }
  }
</style>
