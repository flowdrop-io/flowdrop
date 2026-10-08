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
  import OriginBadge from './OriginBadge.svelte';
  import MessageMarkdown from './MessageMarkdown.svelte';
  import {
    formatClock,
    formatDuration,
    formatTimestamp,
    getEmptyTurnLabel,
    getRoleIcon,
    getRoleLabel
  } from './messageDisplay.js';
  import { m } from '$lib/messages/index.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { resolveMessageNodeLink } from '../../utils/messageNodeLink.js';

  interface Props {
    message: PlaygroundMessage;
    showTimestamp?: boolean;
    isLast?: boolean;
    enableMarkdown?: boolean;
  }

  let { message, showTimestamp = true, isLast = false, enableMarkdown = true }: Props = $props();

  const fd = getInstance();

  // The node this message came from, when it is on the canvas now and the
  // editor can show it: the label becomes a link. Anywhere else (a deleted
  // node, a sub-workflow's node, the standalone Playground) it stays plain.
  const linkedNodeId = $derived(
    fd.highlight.canReveal ? resolveMessageNodeLink(message, fd.workflow.current?.nodes) : null
  );
  const nodeLabel = $derived(message.metadata?.nodeLabel ?? message.nodeId ?? '');
  // The node open or hovered on the canvas lights the messages it produced.
  const fromHighlighted = $derived(
    !!message.nodeId && fd.highlight.messageNodeId === message.nodeId
  );

  const hierarchy = $derived(message.hierarchy ?? []);
  const tags = $derived(message.tags ?? []);
  const roleLabel = $derived(getRoleLabel(message, m().playground.roles));
  // A Run without a typed message: say what it was rather than show an empty bubble.
  const emptyTurnLabel = $derived(getEmptyTurnLabel(message, m().playground.emptyTurn));
  const hasFooter = $derived(
    message.metadata?.duration !== undefined || !!message.nodeId || tags.length > 0
  );
  const isUser = $derived(message.role === 'user');
</script>

<article
  class="message-bubble"
  class:message-bubble--user={message.role === 'user'}
  class:message-bubble--assistant={message.role === 'assistant'}
  class:message-bubble--system={message.role === 'system'}
  class:message-bubble--last={isLast}
  class:message-bubble--from-highlighted={fromHighlighted}
  aria-label="{roleLabel} message"
>
  <div class="message-bubble__avatar" aria-hidden="true">
    <Icon icon={getRoleIcon(message.role)} />
  </div>

  <div class="message-bubble__column">
    <div class="message-bubble__content">
      <div class="message-bubble__header">
        <span class="message-bubble__role">{roleLabel}</span>
        <OriginBadge {message} />
        {#if showTimestamp}
          <time
            class="message-bubble__timestamp"
            datetime={message.timestamp}
            aria-label="sent at {formatTimestamp(message.timestamp)}"
            >{formatTimestamp(message.timestamp)}</time
          >
        {/if}
      </div>

      {#if hierarchy.length > 0}
        <div class="message-bubble__hierarchy">
          <HierarchyTrail items={hierarchy} />
        </div>
      {/if}

      {#if emptyTurnLabel}
        <p class="message-bubble__empty-turn" data-testid="message-empty-turn">{emptyTurnLabel}</p>
      {:else}
        <MessageMarkdown content={message.content} {enableMarkdown} />
      {/if}

      {#if hasFooter || (showTimestamp && !isUser)}
        <div class="message-bubble__footer" class:message-bubble__footer--time-only={!hasFooter}>
          {#if message.nodeId}
            {#if linkedNodeId}
              <button
                type="button"
                class="message-bubble__node message-bubble__node--link"
                data-testid="message-node-link"
                data-node-id={linkedNodeId}
                title={m().playground.messageTooltips.showNodeLastRun({ label: nodeLabel })}
                onclick={() => fd.highlight.reveal(linkedNodeId)}
                onmouseenter={() => fd.highlight.hoverLink(linkedNodeId)}
                onmouseleave={() => fd.highlight.hoverLink(null)}
                onfocus={() => fd.highlight.hoverLink(linkedNodeId)}
                onblur={() => fd.highlight.hoverLink(null)}
              >
                <Icon icon="mdi:vector-square" class="message-bubble__extra" aria-hidden="true" />
                <span class="message-bubble__extra">via&#32;</span>{nodeLabel}
              </button>
            {:else}
              <span
                class="message-bubble__node"
                title={m().playground.messageTooltips.nodeId({ id: message.nodeId })}
              >
                <Icon icon="mdi:vector-square" class="message-bubble__extra" aria-hidden="true" />
                <span class="message-bubble__extra">via&#32;</span>{nodeLabel}
              </span>
            {/if}
          {/if}
          {#if message.metadata?.duration !== undefined}
            <span
              class="message-bubble__duration message-bubble__extra"
              title={m().playground.messageTooltips.executionDuration}
              aria-label="execution duration {formatDuration(message.metadata.duration)}"
            >
              <Icon icon="mdi:timer-outline" aria-hidden="true" />
              {formatDuration(message.metadata.duration)}
            </span>
          {/if}
          <MessageTagStrip {tags} />
          {#if showTimestamp}
            <time
              class="message-bubble__meta-time"
              class:message-bubble__meta-time--after={!!message.nodeId}
              datetime={message.timestamp}>{formatClock(message.timestamp)}</time
            >
          {/if}
        </div>
      {/if}
    </div>

    <!-- Your own message: the time shows when you point at it, under the bubble. -->
    {#if isUser && showTimestamp}
      <div class="message-bubble__user-meta">
        <time datetime={message.timestamp}>{formatClock(message.timestamp)}</time>
      </div>
    {/if}
  </div>
</article>

<style>
  /*
    Message anatomy. Every `--fd-msg-*` token below is unset unless the theme asks
    for the document layout (display.messages: 'document'); the value after the comma
    is the look a bubble has always had. The AI Assistant reads the same tokens.
  */
  .message-bubble {
    display: flex;
    gap: var(--fd-space-sm);
    padding: 2px var(--fd-msg-gutter, var(--fd-space-xl));
    margin-bottom: var(--fd-msg-gap, 2px);
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
    display: var(--fd-msg-avatar-display, flex);
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

  /* The bubble and what hangs under it (your message's time). */
  .message-bubble__column {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    max-width: var(--fd-msg-reply-max, 78%);
    /* Fill the row when a reply takes the whole width. */
    flex: 0 1 auto;
  }

  .message-bubble--user .message-bubble__column {
    align-items: flex-end;
    max-width: var(--fd-msg-user-max, 78%);
  }

  .message-bubble--system .message-bubble__column {
    max-width: 88%;
  }

  .message-bubble__content {
    min-width: 0;
    max-width: 100%;
    padding: var(--fd-msg-reply-pad, var(--fd-space-sm) var(--fd-space-md));
    border-radius: var(--fd-radius-2xl);
    font-size: var(--fd-msg-text-size, inherit);
    line-height: var(--fd-msg-text-leading, inherit);
  }

  .message-bubble--user .message-bubble__content {
    padding: var(--fd-msg-user-pad, var(--fd-space-sm) var(--fd-space-md));
    background-color: var(--fd-msg-user-bg, var(--fd-primary));
    color: var(--fd-msg-user-fg, var(--fd-primary-foreground));
    border-radius: var(--fd-msg-user-radius, var(--fd-radius-2xl));
    border-bottom-right-radius: var(--fd-msg-tail-radius, var(--fd-radius-sm));
  }

  .message-bubble__empty-turn {
    margin: 0;
    font-style: italic;
    opacity: 0.85;
  }

  .message-bubble--assistant .message-bubble__content {
    background-color: var(--fd-msg-reply-bg, var(--fd-card));
    border: var(--fd-msg-reply-border-width, 1px) solid var(--fd-border);
    color: var(--fd-card-foreground);
    box-shadow: var(
      --fd-msg-reply-shadow,
      0 1px 3px 0 oklch(0% 0 0 / 0.06),
      0 1px 2px -1px oklch(0% 0 0 / 0.04)
    );
    border-radius: var(--fd-msg-reply-radius, var(--fd-radius-2xl));
    border-bottom-left-radius: var(--fd-msg-reply-tail-radius, var(--fd-radius-sm));
  }

  .message-bubble--system .message-bubble__content {
    background-color: var(--fd-muted);
    border: 1px solid var(--fd-border);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    padding: var(--fd-space-sm) var(--fd-space-md);
  }

  .message-bubble__header {
    display: var(--fd-msg-header-display, flex);
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
    gap: var(--fd-msg-footer-gap, var(--fd-space-md));
    margin-top: var(--fd-msg-footer-top, var(--fd-space-xs));
    padding-top: var(--fd-msg-footer-pad-top, var(--fd-space-3xs));
    border-top: var(--fd-msg-footer-border-width, 1px) solid var(--fd-border);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  /* A footer with nothing but the time is the document layout's meta line. */
  .message-bubble__footer--time-only {
    display: var(--fd-msg-meta-display, none);
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

  /* Default only: the "via" prefix, the node icon and the duration. */
  .message-bubble__extra,
  .message-bubble__node :global(.message-bubble__extra) {
    display: var(--fd-msg-footer-extras-display, inline-flex);
  }

  .message-bubble__meta-time {
    display: var(--fd-msg-meta-time-display, none);
  }

  .message-bubble__meta-time--after::before {
    content: '·';
    margin-inline-end: var(--fd-msg-footer-gap, var(--fd-space-md));
  }

  /* Your message's time: on hover or focus, under the bubble, one line. */
  .message-bubble__user-meta {
    display: var(--fd-msg-meta-display, none);
    /* Out of flow: it sits in the gap under the bubble and moves nothing. */
    position: relative;
    height: 0;
    align-self: stretch;
    text-align: end;
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
    opacity: 0;
    transition: opacity var(--fd-transition-fast);
  }

  .message-bubble__user-meta time {
    position: absolute;
    inset: 2px 0 auto auto;
    white-space: nowrap;
  }

  .message-bubble:hover .message-bubble__user-meta,
  .message-bubble:focus-within .message-bubble__user-meta {
    opacity: 1;
  }

  /* The node label as a link: a jump on request, never automatic. */
  .message-bubble__node--link {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--fd-msg-link-color, var(--fd-primary));
    text-decoration: var(--fd-msg-link-decoration, underline);
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .message-bubble__node--link:hover {
    text-decoration: underline;
  }

  .message-bubble--user .message-bubble__node--link {
    color: inherit;
  }

  /* Lit while the node it came from is hovered or open on the canvas. */
  .message-bubble--from-highlighted .message-bubble__content {
    box-shadow: 0 0 0 2px var(--fd-primary);
  }

  @media (max-width: 640px) {
    .message-bubble {
      padding: 2px var(--fd-space-md);
      gap: var(--fd-space-xs);
    }

    .message-bubble__content {
      padding: var(--fd-msg-reply-pad, var(--fd-space-xs) var(--fd-space-sm));
    }

    .message-bubble--user .message-bubble__content {
      padding: var(--fd-msg-user-pad, var(--fd-space-xs) var(--fd-space-sm));
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
