<!--
  RunBar — the Edit-mode run bar at the top centre of the canvas.

  Shown only while the instance has a run (`fd.runs.activeRun`): there is no
  idle bar. It says where the run stands, offers Stop while the run is live and
  Open (to Test mode) when it waits for a person, and fades out a few seconds
  after the run ends. The node status badges fade with it: dismissing the run
  clears `fd.playground.nodeStatuses`.

  Node statuses are not loaded here: `App` owns that (one coalesced
  `fd.runs.requestNodeStatuses()` for Test mode and the Edit-mode run).
-->

<script lang="ts">
  import { getInstance } from '../stores/getInstance.svelte.js';
  import { getMessages } from '../messages/context.js';
  import { TERMINAL_RUN_STATUSES } from '../stores/runController.svelte.js';

  interface Props {
    /**
     * Take the person to the run in Test mode. The Open button is shown only
     * when this is set.
     */
    onOpen?: () => void;
    /** How long a finished run's bar stays, in milliseconds. @default 4500 */
    fadeMs?: number;
  }

  let { onOpen, fadeMs = 4500 }: Props = $props();

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
    if (!ended || held) {
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

{#if run && status}
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
    <span class="flowdrop-run-bar__status">{statusLabel}</span>
    {#if status === 'waiting' && onOpen}
      <button
        type="button"
        class="flowdrop-run-bar__pill flowdrop-run-bar__pill--primary"
        aria-label={msgs.openLabel}
        onclick={onOpen}
      >
        {msgs.open}
      </button>
    {/if}
    {#if live}
      <button
        type="button"
        class="flowdrop-run-bar__pill flowdrop-run-bar__pill--stop"
        aria-label={msgs.stopLabel}
        onclick={() => void fd.runs.stopRun()}
      >
        {msgs.stop}
      </button>
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
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    /* Above the canvas furniture, below menus and dialogs. */
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    /* Never wider than the canvas, with room either side for its corners. */
    max-width: calc(100% - 2rem);
    padding: 0.3rem 0.4rem 0.3rem 0.8rem;
    background: var(--fd-card, var(--fd-background));
    color: var(--fd-foreground);
    border: 1px solid var(--fd-border);
    border-top: 0;
    border-radius: 0 0 0.75rem 0.75rem;
    box-shadow: var(--fd-shadow-md);
    font-size: 0.75rem;
    transition: opacity 0.3s ease;
  }

  .flowdrop-run-bar--waiting {
    border-color: var(--fd-warning);
  }
  .flowdrop-run-bar--failed {
    border-color: var(--fd-error);
  }
  .flowdrop-run-bar--done {
    border-color: var(--fd-success);
  }

  .flowdrop-run-bar--fading {
    opacity: 0;
  }

  .flowdrop-run-bar__status {
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 0.6875rem;
    color: var(--fd-muted-foreground);
    white-space: nowrap;
  }

  .flowdrop-run-bar__pill {
    border: 1px solid var(--fd-border);
    border-radius: 999px;
    padding: 0.2rem 0.65rem;
    background: var(--fd-muted);
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .flowdrop-run-bar__pill:focus-visible {
    outline: 2px solid var(--fd-primary);
    outline-offset: 2px;
  }
  .flowdrop-run-bar__pill--primary {
    background: var(--fd-primary);
    border-color: var(--fd-primary);
    color: var(--fd-primary-foreground);
  }
  .flowdrop-run-bar__pill--stop {
    color: var(--fd-error);
    border-color: var(--fd-error);
  }

  @media (prefers-reduced-motion: reduce) {
    .flowdrop-run-bar {
      transition: none;
    }
  }
</style>
