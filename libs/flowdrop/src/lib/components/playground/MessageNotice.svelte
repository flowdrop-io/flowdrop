<!--
  MessageNotice — compact centered inline notice for system messages.
  No role="status" — the parent <div role="log"> already announces additions.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { PlaygroundMessage } from '../../types/playground.js';
  import HierarchyTrail from './HierarchyTrail.svelte';
  import MessageTagStrip from './MessageTagStrip.svelte';
  import { formatTimestamp, getLogLevelIcon } from './messageDisplay.js';

  interface Props {
    message: PlaygroundMessage;
    showTimestamp?: boolean;
    isLast?: boolean;
  }

  let { message, showTimestamp = true, isLast = false }: Props = $props();

  const level = $derived(message.metadata?.level);
  const hierarchy = $derived(message.hierarchy ?? []);
  const tags = $derived(message.tags ?? []);
</script>

<div
  class="system-notice"
  class:system-notice--last={isLast}
  class:system-notice--warning={level === 'warning'}
  class:system-notice--error={level === 'error'}
  class:system-notice--debug={level === 'debug'}
>
  <Icon icon={getLogLevelIcon(level)} class="system-notice__icon" aria-hidden="true" />
  {#if message.metadata?.source}
    <span class="system-notice__source">{message.metadata.source}</span>
  {/if}
  <HierarchyTrail items={hierarchy} />
  <span class="system-notice__text">{message.content}</span>
  <MessageTagStrip {tags} />
  {#if showTimestamp}
    <time
      class="system-notice__timestamp"
      datetime={message.timestamp}
      aria-label="sent at {formatTimestamp(message.timestamp)}"
      >{formatTimestamp(message.timestamp)}</time
    >
  {/if}
</div>

<style>
  .system-notice {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-3xs) var(--fd-space-md);
    margin: var(--fd-space-3xs) 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    text-align: center;
    min-width: 0;
  }

  .system-notice--last {
    margin-bottom: var(--fd-space-md);
  }

  .system-notice :global(.system-notice__icon) {
    flex-shrink: 0;
    font-size: var(--fd-text-sm);
    color: var(--fd-border-strong);
  }

  .system-notice__source {
    flex-shrink: 0;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fd-muted-foreground);
    background-color: var(--fd-muted);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    padding: 0 0.25rem;
    line-height: 1.4;
  }

  .system-notice__text {
    min-width: 0;
    overflow-wrap: anywhere;
    line-height: var(--fd-leading-tight);
  }

  .system-notice--warning,
  .system-notice--warning :global(.system-notice__icon) {
    color: var(--fd-warning);
  }

  .system-notice--error,
  .system-notice--error :global(.system-notice__icon) {
    color: var(--fd-error);
  }

  .system-notice--debug {
    color: var(--fd-border-strong);
    opacity: 0.6;
  }

  .system-notice__timestamp {
    flex-shrink: 0;
    font-size: 0.625rem;
    color: var(--fd-border-strong);
    font-family: var(--fd-font-mono);
  }

  @media (max-width: 640px) {
    .system-notice__timestamp {
      display: none;
    }
  }
</style>
