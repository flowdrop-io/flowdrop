<!--
  MessageTagChip Component

  Renders a single server-emitted MessageTag as a compact chip. Semantic
  color comes from tag.color, visual emphasis from tag.variant. Used by
  MessageBubble and InterruptBubble.

  Styling: a single base rule reads from CSS custom properties; one rule
  per color sets --chip-c, one rule per variant sets bg/fg/border in terms
  of --chip-c. Adding a color is one line.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { MessageTag } from '../../types/playground.js';

  interface Props {
    tag: MessageTag;
  }

  let { tag }: Props = $props();

  const color = $derived(tag.color ?? 'muted');
  const variant = $derived(tag.variant ?? 'subtle');
</script>

<span
  class="message-tag-chip"
  data-color={color}
  data-variant={variant}
  aria-label={tag.type ? `${tag.type}: ${tag.label}` : undefined}
>
  {#if tag.icon}
    <Icon icon={tag.icon} class="message-tag-chip__icon" aria-hidden="true" />
  {/if}
  <span class="message-tag-chip__label">{tag.label}</span>
</span>

<style>
  .message-tag-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: 0 var(--fd-space-3xs);
    border-radius: var(--fd-radius-sm);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    line-height: 1.4;
    white-space: nowrap;
    min-width: 0;
    max-width: 100%;
    background-color: var(--chip-bg);
    color: var(--chip-fg);
    border: 1px solid var(--chip-border, transparent);
  }

  .message-tag-chip__label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .message-tag-chip :global(.message-tag-chip__icon) {
    flex-shrink: 0;
    font-size: 0.875em;
    opacity: 0.8;
  }

  /* Color hooks — one line per color. To add a color, add a row here. */
  .message-tag-chip[data-color='muted'] {
    --chip-c: var(--fd-muted-foreground);
    --chip-c-on: var(--fd-background);
  }
  .message-tag-chip[data-color='primary'] {
    --chip-c: var(--fd-primary);
    --chip-c-on: var(--fd-primary-foreground);
  }
  .message-tag-chip[data-color='success'] {
    --chip-c: var(--fd-success, oklch(55% 0.15 145));
    --chip-c-on: white;
  }
  .message-tag-chip[data-color='warning'] {
    --chip-c: var(--fd-warning);
    --chip-c-on: var(--fd-background);
  }
  .message-tag-chip[data-color='error'] {
    --chip-c: var(--fd-error);
    --chip-c-on: white;
  }
  .message-tag-chip[data-color='info'] {
    --chip-c: var(--fd-info);
    --chip-c-on: var(--fd-background);
  }

  /* Variants — derive bg/fg/border from --chip-c. */
  .message-tag-chip[data-variant='subtle'] {
    --chip-bg: color-mix(in srgb, var(--chip-c) 14%, transparent);
    --chip-fg: var(--chip-c);
  }
  .message-tag-chip[data-variant='subtle'][data-color='muted'] {
    /* Muted is the only color we render against the design's --fd-muted
       surface for legibility; the color-mix path would lose contrast. */
    --chip-bg: var(--fd-muted);
    --chip-fg: var(--fd-muted-foreground);
  }
  .message-tag-chip[data-variant='solid'] {
    --chip-bg: var(--chip-c);
    --chip-fg: var(--chip-c-on);
  }
  .message-tag-chip[data-variant='outline'] {
    --chip-bg: transparent;
    --chip-fg: var(--chip-c);
    --chip-border: var(--chip-c);
  }
  .message-tag-chip[data-variant='outline'][data-color='muted'] {
    --chip-border: var(--fd-border);
  }
</style>
