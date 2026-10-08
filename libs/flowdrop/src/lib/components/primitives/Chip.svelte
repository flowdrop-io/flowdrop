<!--
  Chip primitive — a small label (not interactive by default).

  Tones map to the semantic muted/solid token pairs. `onremove` adds a trailing
  x IconButton with an accessible label.

  @internal Not exported from any package entry; not public API yet.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import IconButton from './IconButton.svelte';

  interface Props {
    /** Colour tone */
    tone?: 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'error';
    /** Density: `sm` (11px text) or `md` (12px text) */
    size?: 'sm' | 'md';
    /** Tooltip text */
    title?: string;
    /** When set, renders a remove (x) button that calls this */
    onremove?: () => void;
    /** Accessible label of the remove button */
    removeLabel?: string;
    /** Extra classes appended to the root */
    class?: string;
    /** Leading icon */
    icon?: Snippet;
    /** Chip text */
    children: Snippet;
  }

  let {
    tone = 'neutral',
    size = 'md',
    title,
    onremove,
    removeLabel = 'Remove',
    class: className = '',
    icon,
    children
  }: Props = $props();
</script>

<span
  class="flowdrop-ui-chip flowdrop-ui-chip--{tone} flowdrop-ui-chip--{size} {className}"
  class:flowdrop-ui-chip--removable={!!onremove}
  {title}
>
  {#if icon}
    <span class="flowdrop-ui-chip__icon" aria-hidden="true">{@render icon()}</span>
  {/if}
  <span class="flowdrop-ui-chip__label">{@render children()}</span>
  {#if onremove}
    <IconButton
      size="sm"
      variant="ghost"
      class="flowdrop-ui-chip__remove"
      ariaLabel={removeLabel}
      onclick={() => onremove?.()}
    >
      <span aria-hidden="true">&times;</span>
    </IconButton>
  {/if}
</span>

<style>
  .flowdrop-ui-chip {
    --_chip-bg: var(--fd-subtle);
    --_chip-fg: var(--fd-muted-foreground);
    --_chip-border: var(--fd-border-muted);

    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    box-sizing: border-box;
    max-width: 100%;
    border: 1px solid var(--_chip-border);
    border-radius: var(--fd-radius-full);
    background-color: var(--_chip-bg);
    color: var(--_chip-fg);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }

  .flowdrop-ui-chip--sm {
    padding: var(--fd-space-3xs) var(--fd-space-2xs);
    font-size: var(--fd-text-2xs);
  }

  .flowdrop-ui-chip--md {
    padding: var(--fd-space-3xs) var(--fd-space-xs);
    font-size: var(--fd-text-xs);
  }

  .flowdrop-ui-chip--accent {
    --_chip-bg: var(--fd-accent-muted);
    --_chip-fg: var(--fd-accent);
    --_chip-border: color-mix(in srgb, var(--fd-accent) 30%, transparent);
  }
  .flowdrop-ui-chip--info {
    --_chip-bg: var(--fd-info-muted);
    --_chip-fg: var(--fd-info);
    --_chip-border: color-mix(in srgb, var(--fd-info) 30%, transparent);
  }
  .flowdrop-ui-chip--success {
    --_chip-bg: var(--fd-success-muted);
    --_chip-fg: var(--fd-success);
    --_chip-border: color-mix(in srgb, var(--fd-success) 30%, transparent);
  }
  .flowdrop-ui-chip--warning {
    --_chip-bg: var(--fd-warning-muted);
    --_chip-fg: var(--fd-warning);
    --_chip-border: color-mix(in srgb, var(--fd-warning) 30%, transparent);
  }
  .flowdrop-ui-chip--error {
    --_chip-bg: var(--fd-error-muted);
    --_chip-fg: var(--fd-error);
    --_chip-border: color-mix(in srgb, var(--fd-error) 30%, transparent);
  }

  .flowdrop-ui-chip__icon {
    display: inline-flex;
    align-items: center;
  }

  .flowdrop-ui-chip__label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .flowdrop-ui-chip--removable {
    padding-right: var(--fd-space-3xs);
  }

  .flowdrop-ui-chip :global(.flowdrop-ui-chip__remove) {
    width: 1rem;
    height: 1rem;
    color: inherit;
    font-size: var(--fd-text-xs);
  }
</style>
