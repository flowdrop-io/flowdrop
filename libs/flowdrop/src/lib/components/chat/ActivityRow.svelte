<!--
  ActivityRow — one line of what the assistant is doing.

  A status slot, a human label, and the time it took. The slot holds a check
  when the step is done, a breathing dot while it runs (the label shimmers with
  it), and a mark when it failed or was rejected. Tool calls, notes, retries and
  "Thinking…" all use this one row. Under reduced motion the dot is still and
  the label is plain muted text.
-->
<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { ActivityStatus } from '../../chat/activity.js';

  interface Props {
    /** `retry` is a finished or running automatic retry; the rest are call statuses. */
    status: ActivityStatus | 'retry';
    /** The label, shown strong. */
    label: string;
    /** What it acted on, shown muted after the label. */
    detail?: string;
    /** The formatted duration, muted on the right. */
    duration?: string;
    /** A retry that is still going: the running look instead of the arrow. */
    active?: boolean;
  }

  let { status, label, detail = '', duration = '', active = false }: Props = $props();

  const running = $derived(status === 'running' || (status === 'retry' && active));
</script>

<div class="activity-row activity-row--{status}" class:activity-row--running={running}>
  <span class="activity-row__slot" aria-hidden="true">
    {#if running}
      <span class="activity-row__dot"></span>
    {:else if status === 'ok'}
      <Icon icon="mdi:check" class="activity-row__ok" />
    {:else if status === 'rejected'}
      <Icon icon="mdi:cancel" />
    {:else if status === 'note'}
      <Icon icon="mdi:comment-text-outline" />
    {:else if status === 'retry'}
      <Icon icon="mdi:autorenew" />
    {:else}
      <Icon icon="mdi:alert-circle-outline" />
    {/if}
  </span>
  <span class="activity-row__text" class:activity-row__text--shimmer={running}>
    <span class="activity-row__label">{label}</span>
    {#if detail}<span class="activity-row__detail">{detail}</span>{/if}
  </span>
  {#if duration}<span class="activity-row__time">{duration}</span>{/if}
</div>

<style>
  .activity-row {
    display: grid;
    grid-template-columns: var(--fd-activity-slot, 0.875rem) minmax(0, 1fr) auto;
    align-items: baseline;
    column-gap: var(--fd-space-xs);
    font-size: var(--fd-activity-text, var(--fd-text-meta));
    line-height: 1.5;
    color: var(--fd-muted-foreground);
  }

  .activity-row__slot {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    align-self: start;
    height: 1.5em;
  }

  .activity-row__slot :global(.activity-row__ok) {
    color: var(--fd-success, var(--fd-primary));
  }

  .activity-row__label {
    color: var(--fd-foreground);
    font-weight: 500;
  }

  .activity-row__detail {
    margin-left: var(--fd-space-3xs);
    overflow-wrap: anywhere;
  }

  .activity-row__time {
    font-family: var(--fd-font-mono, monospace);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .activity-row--rejected,
  .activity-row--failed {
    color: var(--fd-error);
  }

  .activity-row--rejected .activity-row__label,
  .activity-row--failed .activity-row__label {
    color: inherit;
  }

  /* A note is the model's own words alongside its calls, not a label. */
  .activity-row--note .activity-row__label {
    color: var(--fd-foreground);
    font-weight: 400;
    font-style: italic;
    white-space: pre-wrap;
  }

  /* Running: a breathing dot where the check will land, and a label with light passing through it. */
  .activity-row__dot {
    /* Centred on where the check's glyph sits, so the dot and the ✓ swap in place. */
    margin-inline: calc((1em - var(--fd-activity-dot-size, 0.4375rem)) / 2);
    width: var(--fd-activity-dot-size, 0.4375rem);
    height: var(--fd-activity-dot-size, 0.4375rem);
    border-radius: 50%;
    background: var(--fd-activity-running, var(--fd-status-running));
    animation: activity-pulse var(--fd-activity-pulse-duration, 1.2s) ease-in-out infinite;
  }

  .activity-row__text--shimmer {
    background: linear-gradient(
      90deg,
      var(--fd-muted-foreground) 0%,
      var(--fd-foreground) 45%,
      var(--fd-muted-foreground) 90%
    );
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: activity-shimmer var(--fd-activity-shimmer-duration, 1.8s) linear infinite;
  }

  .activity-row__text--shimmer .activity-row__label,
  .activity-row__text--shimmer .activity-row__detail {
    color: transparent;
  }

  @keyframes activity-pulse {
    0%,
    100% {
      transform: scale(0.55);
      opacity: 0.45;
    }
    50% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes activity-shimmer {
    to {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .activity-row__dot {
      animation: none;
    }

    .activity-row__text--shimmer {
      background: none;
      color: var(--fd-muted-foreground);
      animation: none;
    }

    .activity-row__text--shimmer .activity-row__label {
      color: var(--fd-foreground);
    }

    .activity-row__text--shimmer .activity-row__detail {
      color: var(--fd-muted-foreground);
    }
  }
</style>
