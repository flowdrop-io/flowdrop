<!--
  StatusPill — compact run-status chip: icon + label (+ optional count).

  Colours come from the --fd-status-* tokens. Not a live region on purpose: a
  canvas can carry dozens of pills and each status change would be announced;
  the pill is plain text with an accessible name instead. Screen readers reach
  the status through the node it belongs to.

  With `screenSize`, the pill counter-scales against the canvas zoom so it stays
  readable when zoomed out (it is meant to sit centred on a node's top edge).

  @internal Not exported from any package entry; the API may still change.
-->

<script module lang="ts">
  export type StatusPillStatus = 'running' | 'completed' | 'waiting' | 'failed' | 'skipped';

  /** Largest on-screen magnification of a counter-scaled pill. */
  const MAX_SCALE = 2.2;

  /** Scale that cancels the canvas zoom, clamped to [1, MAX_SCALE]. */
  export function counterScale(z: number): number {
    if (!Number.isFinite(z) || z <= 0) return 1;
    return Math.min(MAX_SCALE, Math.max(1, 1 / z));
  }
</script>

<script lang="ts">
  import Icon from '@iconify/svelte';
  import { getMessages } from '../../messages/context.js';

  interface Props {
    /** Run status; selects colour and icon. */
    status: StatusPillStatus;
    /** Visible text. Defaults to the localized status name. */
    label?: string;
    /** Shown after the label when greater than 1 (e.g. "3 nodes failed"). */
    count?: number;
    /** `md` = 28px (control-md), `sm` = 24px (control-sm). */
    size?: 'sm' | 'md';
    /** Canvas zoom factor (1 = 100%). Only used with `screenSize`. */
    zoom?: number;
    /** Counter-scale against `zoom` so the pill keeps a readable screen size. */
    screenSize?: boolean;
    /** CSS transform-origin for the counter-scale. Default anchors the bottom centre. */
    transformOrigin?: string;
    /** Extra classes on the root. */
    class?: string;
  }

  let {
    status,
    label,
    count,
    size = 'md',
    zoom = 1,
    screenSize = false,
    transformOrigin = 'center bottom',
    class: className = ''
  }: Props = $props();

  const getMsgs = getMessages();

  const ICONS: Record<StatusPillStatus, string> = {
    running: 'heroicons:arrow-path',
    completed: 'heroicons:check-circle',
    waiting: 'heroicons:hand-raised',
    failed: 'heroicons:exclamation-circle',
    skipped: 'heroicons:minus-circle'
  };

  const text = $derived(label ?? getMsgs().statusPill[status]);
  const showCount = $derived(count !== undefined && count > 1);
  const style = $derived(
    screenSize
      ? `transform: scale(${counterScale(zoom)}); transform-origin: ${transformOrigin};`
      : undefined
  );
</script>

<span
  class="flowdrop-ui-status-pill flowdrop-ui-status-pill--{status} flowdrop-ui-status-pill--{size} {className}"
  data-status={status}
  {style}
>
  <span class="flowdrop-ui-status-pill__icon" aria-hidden="true">
    <Icon icon={ICONS[status]} />
  </span>
  <!-- Plain glyphs for themes that set --fd-status-pill-glyph-display (Graphite): no circle outlines. -->
  <svg
    class="flowdrop-ui-status-pill__glyph"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {#if status === 'completed'}
      <path d="M3.5 8.5l3 3 6-7" />
    {:else if status === 'waiting'}
      <path d="M6 4v8M10 4v8" />
    {:else if status === 'failed'}
      <path d="M4 4l8 8M12 4l-8 8" />
    {:else if status === 'running'}
      <path d="M8 2.5a5.5 5.5 0 1 0 5.5 5.5" />
    {:else}
      <path d="M4 8h8" />
    {/if}
  </svg>
  <span class="flowdrop-ui-status-pill__label">{text}</span>
  {#if showCount}
    <span class="flowdrop-ui-status-pill__count">{count}</span>
  {/if}
</span>

<style>
  .flowdrop-ui-status-pill {
    --_fg: var(--fd-status-skipped);
    --_bg: var(--fd-status-skipped-soft);

    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    height: var(--fd-status-pill-height);
    padding: var(--fd-status-pill-padding);
    border-radius: var(--fd-radius-full);
    border: var(--fd-status-pill-border-width) solid color-mix(in srgb, var(--_fg) 30%, transparent);
    background: var(--_bg);
    color: var(--_fg);
    font-family: var(--fd-font-sans);
    font-size: var(--fd-status-pill-size);
    font-weight: var(--fd-status-pill-weight);
    line-height: 1;
    white-space: nowrap;
    user-select: none;
  }

  .flowdrop-ui-status-pill--running {
    --_fg: var(--fd-status-running);
    --_bg: var(--fd-status-running-soft);
  }
  .flowdrop-ui-status-pill--completed {
    --_fg: var(--fd-status-completed);
    --_bg: var(--fd-status-completed-soft);
  }
  .flowdrop-ui-status-pill--waiting {
    --_fg: var(--fd-status-waiting);
    --_bg: var(--fd-status-waiting-soft);
  }
  .flowdrop-ui-status-pill--failed {
    --_fg: var(--fd-status-failed);
    --_bg: var(--fd-status-failed-soft);
  }
  .flowdrop-ui-status-pill--skipped {
    --_fg: var(--fd-status-skipped);
    --_bg: var(--fd-status-skipped-soft);
  }

  .flowdrop-ui-status-pill--sm {
    height: var(--fd-control-sm);
    padding-inline: var(--fd-space-2xs);
    font-size: var(--fd-text-2xs);
  }

  .flowdrop-ui-status-pill__icon {
    display: var(--fd-status-pill-icon-display);
    font-size: var(--fd-status-pill-icon-size);
  }

  .flowdrop-ui-status-pill__glyph {
    display: var(--fd-status-pill-glyph-display);
    flex: none;
    width: var(--fd-status-pill-icon-size);
    height: var(--fd-status-pill-icon-size);
  }

  .flowdrop-ui-status-pill--sm .flowdrop-ui-status-pill__icon {
    font-size: var(--fd-text-xs);
  }

  .flowdrop-ui-status-pill--running .flowdrop-ui-status-pill__icon,
  .flowdrop-ui-status-pill--running .flowdrop-ui-status-pill__glyph {
    animation: flowdrop-ui-status-pill-spin 1.2s linear infinite;
  }

  .flowdrop-ui-status-pill__count {
    /* Tokens left at `initial` fall back to the filled count chip. */
    min-width: var(--fd-status-pill-count-min, 1.25em);
    padding: var(--fd-status-pill-count-pad, 0 var(--fd-space-3xs));
    border-left: var(--fd-status-pill-count-rule, 0px) solid currentColor;
    border-radius: var(--fd-status-pill-count-radius, var(--fd-radius-full));
    background: var(--fd-status-pill-count-bg, var(--_fg));
    color: var(--fd-status-pill-count-fg, var(--fd-background));
    font-family: var(--fd-status-pill-count-font, inherit);
    opacity: var(--fd-status-pill-count-opacity, 1);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .flowdrop-ui-status-pill__count::before {
    content: var(--fd-status-pill-count-prefix, '');
  }

  @keyframes flowdrop-ui-status-pill-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .flowdrop-ui-status-pill--running .flowdrop-ui-status-pill__icon,
    .flowdrop-ui-status-pill--running .flowdrop-ui-status-pill__glyph {
      animation: none;
    }
  }
</style>
