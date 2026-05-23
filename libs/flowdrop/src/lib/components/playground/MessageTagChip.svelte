<!--
  MessageTagChip Component

  Renders a single server-emitted MessageTag as a compact chip. Semantic
  color comes from tag.color, visual emphasis from tag.variant. Used by
  MessageBubble and InterruptBubble.
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
  title={tag.id}
>
  {#if tag.icon}
    <Icon icon={tag.icon} class="message-tag-chip__icon" />
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
    max-width: 16rem;

    /* Defaults overridden by data attributes below. */
    background-color: var(--fd-muted);
    color: var(--fd-muted-foreground);
    border: 1px solid transparent;
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

  /* ─── Subtle (default) — muted background, no border ────────────── */
  .message-tag-chip[data-variant='subtle'][data-color='muted'] {
    background-color: var(--fd-muted);
    color: var(--fd-muted-foreground);
  }
  .message-tag-chip[data-variant='subtle'][data-color='primary'] {
    background-color: color-mix(in srgb, var(--fd-primary) 12%, transparent);
    color: var(--fd-primary);
  }
  .message-tag-chip[data-variant='subtle'][data-color='success'] {
    background-color: color-mix(in srgb, var(--fd-success, oklch(70% 0.15 145)) 14%, transparent);
    color: var(--fd-success, oklch(50% 0.15 145));
  }
  .message-tag-chip[data-variant='subtle'][data-color='warning'] {
    background-color: color-mix(in srgb, var(--fd-warning) 14%, transparent);
    color: var(--fd-warning);
  }
  .message-tag-chip[data-variant='subtle'][data-color='error'] {
    background-color: color-mix(in srgb, var(--fd-error) 14%, transparent);
    color: var(--fd-error);
  }
  .message-tag-chip[data-variant='subtle'][data-color='info'] {
    background-color: color-mix(in srgb, var(--fd-info) 14%, transparent);
    color: var(--fd-info);
  }

  /* ─── Solid — full background, contrast text ────────────────────── */
  .message-tag-chip[data-variant='solid'][data-color='muted'] {
    background-color: var(--fd-foreground);
    color: var(--fd-background);
  }
  .message-tag-chip[data-variant='solid'][data-color='primary'] {
    background-color: var(--fd-primary);
    color: var(--fd-primary-foreground);
  }
  .message-tag-chip[data-variant='solid'][data-color='success'] {
    background-color: var(--fd-success, oklch(55% 0.15 145));
    color: white;
  }
  .message-tag-chip[data-variant='solid'][data-color='warning'] {
    background-color: var(--fd-warning);
    color: var(--fd-background);
  }
  .message-tag-chip[data-variant='solid'][data-color='error'] {
    background-color: var(--fd-error);
    color: white;
  }
  .message-tag-chip[data-variant='solid'][data-color='info'] {
    background-color: var(--fd-info);
    color: var(--fd-background);
  }

  /* ─── Outline — transparent bg, colored border ──────────────────── */
  .message-tag-chip[data-variant='outline'] {
    background-color: transparent;
  }
  .message-tag-chip[data-variant='outline'][data-color='muted'] {
    border-color: var(--fd-border);
    color: var(--fd-muted-foreground);
  }
  .message-tag-chip[data-variant='outline'][data-color='primary'] {
    border-color: var(--fd-primary);
    color: var(--fd-primary);
  }
  .message-tag-chip[data-variant='outline'][data-color='success'] {
    border-color: var(--fd-success, oklch(55% 0.15 145));
    color: var(--fd-success, oklch(50% 0.15 145));
  }
  .message-tag-chip[data-variant='outline'][data-color='warning'] {
    border-color: var(--fd-warning);
    color: var(--fd-warning);
  }
  .message-tag-chip[data-variant='outline'][data-color='error'] {
    border-color: var(--fd-error);
    color: var(--fd-error);
  }
  .message-tag-chip[data-variant='outline'][data-color='info'] {
    border-color: var(--fd-info);
    color: var(--fd-info);
  }
</style>
