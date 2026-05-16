<!--
  MessageStream Component

  Renders the playground message feed with interrupt UI inline. No input area.
  This is the shared primitive used by ChatPanel (conversational) and
  ExecutionConsole (workflow runtime surface).

  The empty/welcome state is delegated to consumers via the `welcome` and
  `emptySession` snippets so each wrapper renders context-appropriate copy.
-->

<script lang="ts">
  import { tick, type Snippet } from 'svelte';
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
    getShowLogs
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
    /** Initial hint to hide log messages even when getShowLogs() is true */
    showLogsInline?: boolean;
    /** Render system messages in compact inline form */
    compactSystemMessages?: boolean;
    /** Called when an interrupt is resolved */
    onInterruptResolved?: () => void;
    /** Custom render for the no-session welcome state */
    welcome?: Snippet;
    /** Custom render for the empty-session state */
    emptySession?: Snippet;
  }

  let {
    showTimestamps = true,
    autoScroll = true,
    enableMarkdown = true,
    showLogsInline = false,
    compactSystemMessages = true,
    onInterruptResolved,
    welcome,
    emptySession
  }: Props = $props();

  const states = $derived(m().playground.states);

  /** Reference to the messages container for scrolling */
  let messagesContainer = $state<HTMLDivElement>();

  /**
   * Filter messages based on the store-managed showLogs flag.
   * showLogsInline=false is a hard override (used by view-only modes that
   * never want logs surfaced inline).
   */
  const displayMessages = $derived(
    getShowLogs() && showLogsInline !== false ? getMessages() : getChatMessages()
  );

  let previousMessageCount = $state(0);
  let userScrolledUp = $state(false);

  function handleScroll() {
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    userScrolledUp = scrollHeight - scrollTop - clientHeight > 50;
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
  const showEmptyChat = $derived(getCurrentSession() && displayMessages.length === 0);

  // Reset scroll-tracking when session changes
  $effect(() => {
    if (getCurrentSession()) {
      userScrolledUp = false;
    }
  });

  $effect(() => {
    const currentCount = displayMessages.length;

    if (!autoScroll || !messagesContainer) {
      previousMessageCount = currentCount;
      return;
    }

    const hasNewMessage = currentCount > previousMessageCount;
    previousMessageCount = currentCount;

    if (!hasNewMessage || userScrolledUp || isFormFocused()) return;

    tick().then(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  });
</script>

<div class="message-stream" bind:this={messagesContainer} onscroll={handleScroll}>
  {#if showWelcome}
    {#if welcome}
      {@render welcome()}
    {/if}
  {:else if showEmptyChat}
    {#if emptySession}
      {@render emptySession()}
    {/if}
  {:else}
    {#each displayMessages as message, index (message.id)}
      {#if isInterruptMessage(message)}
        {@const interrupt = getInterruptForMessage(message)}
        {#if interrupt}
          <InterruptBubble
            {interrupt}
            showTimestamp={showTimestamps}
            onResolved={onInterruptResolved}
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
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--fd-space-3xl);
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
      padding: var(--fd-space-xl);
    }
  }
</style>
