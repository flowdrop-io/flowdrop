<!--
  MessageCard — vertical card layout: hierarchy (top) · body (middle) · tags (bottom).
  Picks up shared markdown typography via <MessageMarkdown>.
-->

<script lang="ts">
  import type { PlaygroundMessage } from '../../types/playground.js';
  import HierarchyTrail from './HierarchyTrail.svelte';
  import MessageTagStrip from './MessageTagStrip.svelte';
  import MessageMarkdown from './MessageMarkdown.svelte';
  import { formatTimestamp, getRoleLabel } from './messageDisplay.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    message: PlaygroundMessage;
    showTimestamp?: boolean;
    isLast?: boolean;
    enableMarkdown?: boolean;
  }

  let { message, showTimestamp = true, isLast = false, enableMarkdown = true }: Props = $props();

  const level = $derived(message.metadata?.level);
  const hierarchy = $derived(message.hierarchy ?? []);
  const tags = $derived(message.tags ?? []);
  const roleLabel = $derived(getRoleLabel(message, m().playground.roles));
  // Logs render as plain text; everything else respects enableMarkdown.
  const markdown = $derived(enableMarkdown && message.role !== 'log');
</script>

<article
  class="message-card"
  class:message-card--last={isLast}
  class:message-card--error={level === 'error'}
  class:message-card--warning={level === 'warning'}
  aria-label={roleLabel}
>
  {#if hierarchy.length > 0 || showTimestamp}
    <header class="message-card__header">
      <HierarchyTrail items={hierarchy} />
      {#if showTimestamp}
        <time
          class="message-card__timestamp"
          datetime={message.timestamp}
          aria-label="sent at {formatTimestamp(message.timestamp)}"
          >{formatTimestamp(message.timestamp)}</time
        >
      {/if}
    </header>
  {/if}
  <MessageMarkdown content={message.content} enableMarkdown={markdown} />
  <MessageTagStrip {tags} />
</article>

<style>
  .message-card {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    margin: var(--fd-space-3xs) var(--fd-space-xl);
    padding: var(--fd-space-sm) var(--fd-space-md);
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-card);
    border: 1px solid var(--fd-border);
    color: var(--fd-card-foreground);
    font-size: var(--fd-text-sm);
    line-height: var(--fd-leading-normal);
    /* fd-fade-in + reduced-motion guard live in MessageStream.svelte */
    animation: fd-fade-in 0.18s ease-out;
  }

  .message-card--last {
    margin-bottom: var(--fd-space-xl);
  }

  .message-card--error {
    border-color: var(--fd-error);
    background-color: color-mix(in srgb, var(--fd-error) 6%, var(--fd-card));
  }

  .message-card--warning {
    border-color: var(--fd-warning);
    background-color: color-mix(in srgb, var(--fd-warning) 6%, var(--fd-card));
  }

  .message-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fd-space-sm);
    min-width: 0;
  }

  .message-card__timestamp {
    flex-shrink: 0;
    font-size: 0.625rem;
    font-family: var(--fd-font-mono);
    color: var(--fd-muted-foreground);
  }

  @media (max-width: 640px) {
    .message-card {
      margin: var(--fd-space-3xs) var(--fd-space-md);
      padding: var(--fd-space-xs) var(--fd-space-sm);
    }
  }
</style>
