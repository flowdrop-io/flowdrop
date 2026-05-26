<!--
  MessageStream Component

  Renders the playground message feed with interrupt UI inline. No input area.
  This is the shared primitive used by ChatPanel (conversational) and
  ExecutionConsole (workflow runtime surface).

  The empty/welcome state is delegated to consumers via the `welcome` and
  `emptySession` snippets so each wrapper renders context-appropriate copy.
-->

<script lang="ts">
  import { tick, untrack, type Snippet } from 'svelte';
  import MessageBubble from './MessageBubble.svelte';
  import { InterruptBubble } from '../interrupt/index.js';
  import type { PlaygroundMessage } from '../../types/playground.js';
  import {
    isInterruptMetadata,
    extractInterruptMetadata,
    metadataToInterrupt
  } from '../../types/interrupt.js';
  import {
    getMessages,
    getChatMessages,
    getIsExecuting,
    getCurrentSession,
    getShowLogs,
    getHasOlder
  } from '../../stores/playgroundStore.svelte.js';
  import {
    getInterruptsMap,
    interruptActions,
    getInterruptByMessageId
  } from '../../stores/interruptStore.svelte.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** Whether to show timestamps on messages */
    showTimestamps?: boolean;
    /** Whether to auto-scroll to bottom on new messages */
    autoScroll?: boolean;
    /** Whether to enable markdown rendering in messages */
    enableMarkdown?: boolean;
    /**
     * Whether this surface is permitted to show log messages.
     * When true, the store's showLogs toggle takes effect.
     * When false (default), only chat messages are ever shown regardless of the toggle.
     * Set to true on execution surfaces (e.g. ExecutionConsole); leave false on pure chat surfaces.
     */
    allowLogs?: boolean;
    /** Render system messages in compact inline form */
    compactSystemMessages?: boolean;
    /** Called when an interrupt is resolved */
    onInterruptResolved?: () => void;
    /**
     * Called when the user scrolls near the top, to load older messages.
     * When omitted, scroll-up paging is disabled (e.g. view-only surfaces).
     */
    onLoadOlder?: () => void | Promise<void>;
    /** Custom render for the no-session welcome state */
    welcome?: Snippet;
    /** Custom render for the empty-session state */
    emptySession?: Snippet;
  }

  let {
    showTimestamps = true,
    autoScroll = true,
    enableMarkdown = true,
    allowLogs = false,
    compactSystemMessages = true,
    onInterruptResolved,
    onLoadOlder,
    welcome,
    emptySession
  }: Props = $props();

  const states = $derived(m().playground.states);

  /** Reference to the messages container for scrolling */
  let messagesContainer = $state<HTMLDivElement | undefined>();

  const displayMessages = $derived(allowLogs && getShowLogs() ? getMessages() : getChatMessages());

  let previousMessageCount = 0;
  let userScrolledUp = false;
  let isLoadingOlder = $state(false);
  let topSentinel = $state<HTMLDivElement | undefined>();

  function handleScroll() {
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    userScrolledUp = scrollHeight - scrollTop - clientHeight > 50;
  }

  // Load older messages when the top sentinel scrolls into view. An observer is
  // self-throttling and keeps layout reads off the scroll path; rootMargin
  // pre-fetches the next page slightly before the user reaches the very top.
  $effect(() => {
    if (!topSentinel || !messagesContainer || !onLoadOlder) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadOlder();
      },
      { root: messagesContainer, rootMargin: '300px 0px 0px 0px' }
    );
    observer.observe(topSentinel);
    return () => observer.disconnect();
  });

  /**
   * Fetch the previous page and keep the viewport pinned to the message the
   * user is reading. We anchor on a real DOM node (the first rendered message)
   * and compensate scrollTop by however far it moved — robust against the
   * loading spinner (which is out of flow) and any late reflow above it.
   * A scroll during the in-flight fetch is intentionally overridden so the
   * prepend doesn't shift the reading position.
   */
  async function loadOlder() {
    if (!onLoadOlder || !messagesContainer || isLoadingOlder || !getHasOlder()) return;

    const anchor = topSentinel?.nextElementSibling as HTMLElement | null;
    const anchorTopBefore = anchor?.getBoundingClientRect().top ?? 0;

    isLoadingOlder = true;
    try {
      await onLoadOlder();
      await tick();
      if (messagesContainer && anchor) {
        const shift = anchor.getBoundingClientRect().top - anchorTopBefore;
        messagesContainer.scrollTop += shift;
      }
    } finally {
      isLoadingOlder = false;
    }
  }

  function isFormFocused(): boolean {
    if (!messagesContainer) return false;
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const isFormControl =
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.tagName === 'BUTTON' ||
      activeElement.getAttribute('contenteditable') === 'true';
    return isFormControl && messagesContainer.contains(activeElement);
  }

  function isInterruptMessage(message: PlaygroundMessage): boolean {
    return isInterruptMetadata(message.metadata as Record<string, unknown> | undefined);
  }

  /**
   * Sync interrupt messages into the interrupt store. Runs in an effect to
   * avoid Svelte 5's state_unsafe_mutation error during render.
   */
  $effect(() => {
    const interruptMessages = displayMessages.filter(isInterruptMessage);

    for (const message of interruptMessages) {
      const existing = getInterruptByMessageId(message.id);
      if (!existing) {
        const metadata = extractInterruptMetadata(
          message.metadata as Record<string, unknown> | undefined
        );
        if (metadata) {
          const interrupt = metadataToInterrupt(metadata, message.id, message.content);
          interruptActions.addInterrupt(interrupt);

          if (message.status === 'completed') {
            interruptActions.resolveInterrupt(interrupt.id, metadata.response_value);
          }
        }
      }
    }
  });

  const interruptsByMessageId = $derived(
    new Map(
      Array.from(getInterruptsMap().values())
        .filter((i) => i.messageId)
        .map((i) => [i.messageId, i])
    )
  );

  function getInterruptForMessage(message: PlaygroundMessage) {
    return interruptsByMessageId.get(message.id);
  }

  const showWelcome = $derived(!getCurrentSession() && displayMessages.length === 0);
  const showEmptyChat = $derived(getCurrentSession() !== null && displayMessages.length === 0);

  // Reset scroll-tracking when session changes
  $effect(() => {
    if (getCurrentSession()) {
      userScrolledUp = false;
    }
  });

  $effect(() => {
    const currentCount = displayMessages.length;

    if (!autoScroll || !messagesContainer) {
      untrack(() => {
        previousMessageCount = currentCount;
      });
      return;
    }

    const hasNewMessage = currentCount > previousMessageCount;
    untrack(() => {
      previousMessageCount = currentCount;
    });

    // Don't chase the bottom while a backward page is landing — loadOlder owns
    // scroll position during a prepend and anchors it to the message in view.
    if (!hasNewMessage || userScrolledUp || isFormFocused() || isLoadingOlder) return;

    tick().then(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  });
</script>

<div
  class="message-stream"
  role="log"
  aria-label={m().playground.controlPanel.messageStreamLabel}
  bind:this={messagesContainer}
  onscroll={handleScroll}
>
  {#if showWelcome}
    {#if welcome}
      {@render welcome()}
    {/if}
  {:else if showEmptyChat}
    {#if emptySession}
      {@render emptySession()}
    {/if}
  {:else}
    <div bind:this={topSentinel} class="message-stream__sentinel" aria-hidden="true"></div>
    {#if isLoadingOlder}
      <div class="message-stream__loading-older" aria-hidden="true">
        <span class="message-stream__loading-older-spinner"></span>
      </div>
    {/if}
    {#each displayMessages as message, index (message.id)}
      {#if isInterruptMessage(message)}
        {@const interrupt = getInterruptForMessage(message)}
        {#if interrupt}
          <InterruptBubble
            {interrupt}
            showTimestamp={showTimestamps}
            onResolved={onInterruptResolved}
            hierarchy={message.hierarchy}
            tags={message.tags}
          />
        {/if}
      {:else}
        <MessageBubble
          {message}
          showTimestamp={showTimestamps}
          isLast={index === displayMessages.length - 1}
          {enableMarkdown}
          {compactSystemMessages}
        />
      {/if}
    {/each}

    {#if getIsExecuting()}
      <div class="message-stream__typing">
        <div class="message-stream__typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="message-stream__typing-text">{states.processing}</span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .message-stream {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--fd-space-3xl);

    /* Establish a containment context so message rows can adapt to the
       stream's actual width (not the viewport's). The matching @container
       queries (for .log-row) live below in the same <style> block, so
       renaming the container only requires editing this file. */
    container-type: inline-size;
    container-name: fd-message-stream;
  }

  /* Zero-height marker the IntersectionObserver watches to trigger
     backward pagination as it nears the top of the scroll area. */
  .message-stream__sentinel {
    height: 0;
  }

  /* Shared fade-in for newly-appended message rows. `-global-` so
     ChatBubble.svelte / MessageCard.svelte can reference it without
     redeclaring. Honour reduced-motion in the same place. */
  @keyframes -global-fd-fade-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.message-bubble),
    :global(.message-card) {
      animation: none;
    }
  }

  /* Container-query reshaping for log rows. Lives next to the
     container-name declaration so the coupling is local — selectors are
     :global because .log-row is a sibling component's class.

       Tier 1 (≤720px): two rows — level/body, then tags/timestamp.
       Tier 2 (≤480px): collapse further; body forces internal line break. */
  @container fd-message-stream (max-width: 720px) {
    :global(.log-row) {
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-areas:
        'level body      body'
        '.     tags      timestamp';
      align-items: baseline;
      row-gap: var(--fd-space-2xs);
      column-gap: var(--fd-space-sm);
    }
    :global(.log-row__level) {
      grid-area: level;
    }
    :global(.log-row__body) {
      grid-area: body;
      min-width: 0;
    }
    :global(.log-row__tags) {
      grid-area: tags;
      justify-self: start;
    }
    :global(.log-row__timestamp) {
      grid-area: timestamp;
      justify-self: end;
    }
  }

  @container fd-message-stream (max-width: 480px) {
    :global(.log-row) {
      grid-template-columns: auto 1fr;
      grid-template-areas:
        'level body'
        '.     tags';
    }
    :global(.log-row__text) {
      flex-basis: 100%;
      min-width: 0;
    }
    :global(.log-row__timestamp) {
      display: none;
    }
    /* Drop the source + node chips: source is implied by the level
       colour, node duplicates the hierarchy trail's last entry. Keeping
       them at this width forced each chip onto its own line and made
       log rows 5–6 lines tall. */
    :global(.log-row__source),
    :global(.log-row__node) {
      display: none;
    }
    /* Reclaim horizontal room by tightening the row's own padding —
       can't shrink the stream's padding from inside its own
       container query. */
    :global(.log-row) {
      padding-left: var(--fd-space-xs);
      padding-right: var(--fd-space-xs);
    }
  }

  /* Overlay, out of flow — its presence must not shift message layout, or it
     would corrupt the scroll anchoring in loadOlder(). */
  .message-stream__loading-older {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--fd-space-sm) 0;
    pointer-events: none;
    z-index: 1;
  }

  .message-stream__loading-older-spinner {
    width: var(--fd-space-lg);
    height: var(--fd-space-lg);
    border: 2px solid var(--fd-border-strong);
    border-top-color: transparent;
    border-radius: var(--fd-radius-full);
    animation: message-stream-spin 0.8s linear infinite;
  }

  @keyframes message-stream-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .message-stream__loading-older-spinner {
      animation: none;
    }
  }

  .message-stream__typing {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-xl);
    margin-top: var(--fd-space-xs);
    background-color: var(--fd-muted);
    border-radius: var(--fd-radius-2xl);
    width: fit-content;
  }

  .message-stream__typing-indicator {
    display: flex;
    gap: var(--fd-space-3xs);
  }

  .message-stream__typing-indicator span {
    width: var(--fd-space-2xs);
    height: var(--fd-space-2xs);
    background-color: var(--fd-muted-foreground);
    border-radius: var(--fd-radius-full);
    animation: message-stream-bounce 1.4s ease-in-out infinite;
  }

  .message-stream__typing-indicator span:nth-child(1) {
    animation-delay: 0s;
  }

  .message-stream__typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .message-stream__typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes message-stream-bounce {
    0%,
    60%,
    100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-0.25rem);
    }
  }

  .message-stream__typing-text {
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
  }

  @media (max-width: 640px) {
    .message-stream {
      padding: var(--fd-space-md) 0;
    }
  }
</style>
