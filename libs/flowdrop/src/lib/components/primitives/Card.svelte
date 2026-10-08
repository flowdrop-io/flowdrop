<!--
  Card — a surface container with an optional header and footer row.

  `variant="attention"` is the amber "needs you" frame (interrupts): the
  waiting-status border on its soft background. It is a plain `<section>`
  (named by `ariaLabel`, which makes it a landmark-ish region) or a `<div>`
  when no label is given.

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** `attention` = the amber frame used for things waiting on the user. */
    variant?: 'default' | 'attention';
    /** Inner spacing: `sm` = 8px, `md` = 12px. */
    padding?: 'sm' | 'md';
    /** Accessible name; renders a `<section aria-label>` instead of a `<div>`. */
    ariaLabel?: string;
    /** Title / actions row above the content. */
    header?: Snippet;
    /** Row below the content (buttons, meta). */
    footer?: Snippet;
    /** Extra classes on the root. */
    class?: string;
    /** Content. */
    children?: Snippet;
  }

  let {
    variant = 'default',
    padding = 'md',
    ariaLabel,
    header,
    footer,
    class: className = '',
    children
  }: Props = $props();

  const tag = $derived(ariaLabel ? 'section' : 'div');
</script>

<svelte:element
  this={tag}
  class="flowdrop-ui-card flowdrop-ui-card--{variant} flowdrop-ui-card--{padding} {className}"
  aria-label={ariaLabel}
>
  {#if header}
    <div class="flowdrop-ui-card__header">{@render header()}</div>
  {/if}
  {#if children}
    <div class="flowdrop-ui-card__body">{@render children()}</div>
  {/if}
  {#if footer}
    <div class="flowdrop-ui-card__footer">{@render footer()}</div>
  {/if}
</svelte:element>

<style>
  .flowdrop-ui-card {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
    box-sizing: border-box;
    min-width: 0;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    font-family: var(--fd-font-sans);
  }

  .flowdrop-ui-card--sm {
    padding: var(--fd-space-sm);
  }

  .flowdrop-ui-card--md {
    padding: var(--fd-space-md);
  }

  .flowdrop-ui-card--attention {
    border-color: var(--fd-status-waiting);
    background-color: var(--fd-status-waiting-soft);
  }

  .flowdrop-ui-card__header,
  .flowdrop-ui-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fd-space-xs);
    min-width: 0;
  }

  .flowdrop-ui-card__header {
    font-size: var(--fd-text-sm);
    font-weight: 600;
  }

  .flowdrop-ui-card__footer {
    justify-content: flex-end;
  }

  .flowdrop-ui-card__body {
    min-width: 0;
    font-size: var(--fd-text-sm);
  }
</style>
