<!--
  ChatBubble — avatar + bubble layout for user/assistant/system messages.
  Markdown typography comes from MessageMarkdown; user-bubble overrides
  (primary-bg) are scoped here.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { PlaygroundMessage } from '../../types/playground.js';
  import HierarchyTrail from './HierarchyTrail.svelte';
  import MessageTagStrip from './MessageTagStrip.svelte';
  import MessageMarkdown from './MessageMarkdown.svelte';
  import {
    formatDuration,
    formatTimestamp,
    getRoleIcon,
    getRoleLabel
  } from './messageDisplay.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    message: PlaygroundMessage;
    showTimestamp?: boolean;
    isLast?: boolean;
    enableMarkdown?: boolean;
  }

  let { message, showTimestamp = true, isLast = false, enableMarkdown = true }: Props = $props();

  const hierarchy = $derived(message.hierarchy ?? []);
  const tags = $derived(message.tags ?? []);
  const roleLabel = $derived(getRoleLabel(message, m().playground.roles));
  const hasFooter = $derived(
    message.metadata?.duration !== undefined || !!message.nodeId || tags.length > 0
  );
</script>

<article
  class="message-bubble"
  class:message-bubble--user={message.role === 'user'}
  class:message-bubble--assistant={message.role === 'assistant'}
  class:message-bubble--system={message.role === 'system'}
  class:message-bubble--last={isLast}
  aria-label="{roleLabel} message"
>
  <div class="message-bubble__avatar" aria-hidden="true">
    <Icon icon={getRoleIcon(message.role)} />
  </div>

  <div class="message-bubble__content">
    <div class="message-bubble__header">
      <span class="message-bubble__role">{roleLabel}</span>
      {#if showTimestamp}
        <time
          class="message-bubble__timestamp"
          datetime={message.timestamp}
          aria-label="sent at {formatTimestamp(message.timestamp)}"
        >{formatTimestamp(message.timestamp)}</time>
      {/if}
    </div>

    {#if hierarchy.length > 0}
      <div class="message-bubble__hierarchy">
        <HierarchyTrail items={hierarchy} />
      </div>
    {/if}

    <MessageMarkdown content={message.content} {enableMarkdown} />

    {#if hasFooter}
      <div class="message-bubble__footer">
        {#if message.nodeId}
          <span
            class="message-bubble__node"
            title={m().playground.messageTooltips.nodeId({ id: message.nodeId })}
          >
            <Icon icon="mdi:vector-square" aria-hidden="true" />
            via {message.metadata?.nodeLabel ?? message.nodeId}
          </span>
        {/if}
        {#if message.metadata?.duration !== undefined}
          <span
            class="message-bubble__duration"
            title={m().playground.messageTooltips.executionDuration}
            aria-label="execution duration {formatDuration(message.metadata.duration)}"
          >
            <Icon icon="mdi:timer-outline" aria-hidden="true" />
            {formatDuration(message.metadata.duration)}
          </span>
        {/if}
        <MessageTagStrip {tags} />
      </div>
    {/if}
  </div>
</article>

<style>
  .message-bubble {
    display: flex;
    gap: var(--fd-space-sm);
    padding: 2px var(--fd-space-xl);
    margin-bottom: 2px;
    align-items: flex-end;
    /* fd-fade-in + reduced-motion guard live in MessageStream.svelte */
    animation: fd-fade-in 0.18s ease-out;
  }

  .message-bubble--user {
    flex-direction: row-reverse;
  }

  .message-bubble--last {
    margin-bottom: var(--fd-space-xl);
  }

  .message-bubble__avatar {
    flex-shrink: 0;
    width: 1.875rem;
    height: 1.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--fd-radius-full);
    font-size: 1rem;
  }

  .message-bubble--user .message-bubble__avatar {
    background-color: var(--fd-primary);
    color: var(--fd-primary-foreground);
  }

  .message-bubble--assistant .message-bubble__avatar {
    background-color: var(--fd-secondary);
    color: var(--fd-secondary-foreground);
    border: 1px solid var(--fd-border);
  }

  .message-bubble--system .message-bubble__avatar {
    background-color: var(--fd-muted);
    color: var(--fd-muted-foreground);
  }

  .message-bubble__content {
    min-width: 0;
    max-width: 78%;
    padding: var(--fd-space-sm) var(--fd-space-md);
    border-radius: var(--fd-radius-2xl);
  }

  .message-bubble--user .message-bubble__content {
    background-color: var(--fd-primary);
    color: var(--fd-primary-foreground);
    border-bottom-right-radius: var(--fd-radius-sm);
  }

  .message-bubble--assistant .message-bubble__content {
    background-color: var(--fd-card);
    border: 1px solid var(--fd-border);
    color: var(--fd-card-foreground);
    box-shadow: 0 1px 3px 0 oklch(0% 0 0 / 0.06), 0 1px 2px -1px oklch(0% 0 0 / 0.04);
    border-bottom-left-radius: var(--fd-radius-sm);
  }

  .message-bubble--system .message-bubble__content {
    background-color: var(--fd-muted);
    border: 1px solid var(--fd-border);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    max-width: 88%;
  }

  .message-bubble__header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin-bottom: var(--fd-space-3xs);
  }

  .message-bubble--user .message-bubble__header {
    flex-direction: row-reverse;
  }

  .message-bubble__role {
    font-weight: 600;
    font-size: var(--fd-text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .message-bubble--user .message-bubble__role {
    color: var(--fd-primary-foreground);
    opacity: 0.75;
  }

  .message-bubble--assistant .message-bubble__role,
  .message-bubble--system .message-bubble__role {
    color: var(--fd-muted-foreground);
  }

  .message-bubble__timestamp {
    font-size: 0.6875rem;
    font-family: var(--fd-font-mono);
    opacity: 0.55;
  }

  .message-bubble--user .message-bubble__timestamp {
    color: var(--fd-primary-foreground);
  }

  .message-bubble--assistant .message-bubble__timestamp {
    color: var(--fd-muted-foreground);
  }

  .message-bubble__hierarchy {
    margin: var(--fd-space-3xs) 0 var(--fd-space-xs);
  }

  /* Override markdown styling on the primary-bg user bubble */
  .message-bubble--user :global(.message-markdown code) {
    background-color: color-mix(in srgb, var(--fd-primary-foreground) 18%, transparent);
    color: var(--fd-primary-foreground);
  }

  .message-bubble--user :global(.message-markdown pre) {
    background-color: rgb(0 0 0 / 0.25);
    color: var(--fd-primary-foreground);
  }

  .message-bubble--user :global(.message-markdown a) {
    color: var(--fd-primary-foreground);
    text-decoration: underline;
    opacity: 0.85;
  }

  .message-bubble--user :global(.message-markdown blockquote) {
    border-left-color: color-mix(in srgb, var(--fd-primary-foreground) 40%, transparent);
    color: var(--fd-primary-foreground);
    opacity: 0.8;
  }

  .message-bubble__footer {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--fd-space-md);
    margin-top: var(--fd-space-xs);
    padding-top: var(--fd-space-3xs);
    border-top: 1px solid var(--fd-border);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .message-bubble--user .message-bubble__footer {
    justify-content: flex-end;
    border-top-color: color-mix(in srgb, var(--fd-primary-foreground) 20%, transparent);
    color: var(--fd-primary-foreground);
    opacity: 0.75;
  }

  .message-bubble__node,
  .message-bubble__duration {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
  }

  @media (max-width: 640px) {
    .message-bubble {
      padding: 2px var(--fd-space-md);
      gap: var(--fd-space-xs);
    }

    .message-bubble__content {
      max-width: calc(100% - 2.5rem);
      padding: var(--fd-space-xs) var(--fd-space-sm);
    }

    .message-bubble__avatar {
      width: 1.625rem;
      height: 1.625rem;
      font-size: var(--fd-text-sm);
    }

    .message-bubble__footer {
      gap: var(--fd-space-xs);
      font-size: var(--fd-text-2xs);
    }
  }
</style>
