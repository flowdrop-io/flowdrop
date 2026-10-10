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

  Renders the pill as a floating control of its own (status dot, label, Stop),
  meant to sit inside a `Toolbar`.
-->

<script lang="ts">
  import { getInstance } from '../stores/getInstance.svelte.js';
  import { getMessages } from '../messages/context.js';
  import { TERMINAL_RUN_STATUSES } from '../stores/runController.svelte.js';
  import Button from './primitives/Button.svelte';
  import type { StatusPillStatus } from './primitives/StatusPill.svelte';

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
    <span class="flowdrop-run-bar__dot" aria-hidden="true"></span>
    <span class="flowdrop-run-bar__label">{statusLabel}</span>
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
        variant="danger-ghost"
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

  /* A floating control of its own: dot, label, then the actions. */
  .flowdrop-run-bar {
    --_status: var(--fd-status-skipped);
    --_soft: var(--fd-status-skipped-soft);
    --_halo: 0 0 0 3px var(--_soft);
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    box-sizing: border-box;
    height: var(--fd-canvas-control);
    padding: 0 var(--fd-space-2xs) 0 var(--fd-space-md);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-float-border);
    border-radius: var(--fd-radius-surface);
    box-shadow: var(--fd-elevation-float);
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    opacity: 1;
    transition: opacity 300ms ease;
  }
  .flowdrop-run-bar--running {
    --_status: var(--fd-status-running);
    --_soft: var(--fd-status-running-soft);
  }
  .flowdrop-run-bar--done {
    --_status: var(--fd-status-completed);
    --_soft: var(--fd-status-completed-soft);
  }
  .flowdrop-run-bar--waiting {
    --_status: var(--fd-status-waiting);
    --_soft: var(--fd-status-waiting-soft);
  }
  .flowdrop-run-bar--failed {
    --_status: var(--fd-status-failed);
    --_soft: var(--fd-status-failed-soft);
  }
  .flowdrop-run-bar__dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: var(--fd-radius-full);
    background-color: var(--_status);
    box-shadow: var(--_halo);
  }
  .flowdrop-run-bar__label {
    white-space: nowrap;
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
