<!--
  LogRow — dense terminal-style entry for log messages.
  Width-based reshaping is driven by `@container fd-message-stream` rules
  declared in MessageStream.svelte (the file that also sets the container).
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
  }

  let { message, showTimestamp = true }: Props = $props();

  const level = $derived(message.metadata?.level);
  const hierarchy = $derived(message.hierarchy ?? []);
  const tags = $derived(message.tags ?? []);
</script>

<div
  class="log-row"
  class:log-row--error={level === 'error'}
  class:log-row--warning={level === 'warning'}
  class:log-row--debug={level === 'debug'}
  aria-label="{level ?? 'info'} log{message.metadata?.nodeLabel
    ? ` from ${message.metadata.nodeLabel}`
    : ''}"
>
  <div class="log-row__level" aria-hidden="true">
    <Icon icon={getLogLevelIcon(level)} />
  </div>
  <div class="log-row__body">
    {#if message.metadata?.source}
      <span class="log-row__source">{message.metadata.source}</span>
    {/if}
    <HierarchyTrail items={hierarchy} />
    {#if message.metadata?.nodeLabel ?? message.nodeId}
      <span class="log-row__node">{message.metadata?.nodeLabel ?? message.nodeId}</span>
    {/if}
    <span class="log-row__text">{message.content}</span>
  </div>
  {#if tags.length > 0}
    <span class="log-row__tags">
      <MessageTagStrip {tags} />
    </span>
  {/if}
  {#if showTimestamp}
    <time
      class="log-row__timestamp"
      datetime={message.timestamp}
      aria-label="sent at {formatTimestamp(message.timestamp)}"
    >{formatTimestamp(message.timestamp)}</time>
  {/if}
</div>

<style>
  .log-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--fd-space-sm);
    padding: 0.1875rem var(--fd-space-xl);
    border-left: 2px solid var(--fd-info);
    margin: 1px 0;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    line-height: var(--fd-leading-normal);
    background-color: transparent;
    min-width: 0;
  }

  .log-row:hover {
    background-color: var(--fd-muted);
  }

  .log-row--error {
    border-left-color: var(--fd-error);
    color: var(--fd-error);
  }

  .log-row--warning {
    border-left-color: var(--fd-warning);
    color: var(--fd-warning);
  }

  .log-row--debug {
    border-left-color: var(--fd-border-strong);
    color: var(--fd-border-strong);
  }

  .log-row__level {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    font-size: var(--fd-text-sm);
    opacity: 0.7;
  }

  .log-row--error .log-row__level,
  .log-row--warning .log-row__level {
    opacity: 1;
  }

  .log-row__body {
    flex: 1 1 12rem;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--fd-space-sm);
    overflow: hidden;
  }

  .log-row__source {
    flex-shrink: 0;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fd-muted-foreground);
    opacity: 0.6;
    background-color: var(--fd-muted);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    padding: 0 0.25rem;
    line-height: 1.4;
  }

  .log-row__node {
    flex-shrink: 0;
    font-weight: 600;
    color: var(--fd-foreground);
    opacity: 0.5;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .log-row__text {
    flex: 1;
    min-width: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .log-row__timestamp {
    flex-shrink: 0;
    font-size: 0.625rem;
    color: var(--fd-border-strong);
    opacity: 0.8;
  }

  /* Wrapper around the tag strip. Owns its grid-area in the @container
     queries (see MessageStream.svelte) without those rules reaching into
     MessageTagStrip's scope. inline-flex so the strip lays out naturally
     in the default wide layout. */
  .log-row__tags {
    display: inline-flex;
    min-width: 0;
  }

  @media (max-width: 640px) {
    .log-row {
      padding: 0.1875rem var(--fd-space-md);
    }

    .log-row__source,
    .log-row__node {
      font-size: 0.55rem;
    }
  }
</style>
