<!--
  @component
  **Exported for host apps; the editor does not render it.** A ready-made chat panel; the editor's Test mode uses `DockedPlayground` instead.
  It shows the message feed above a text box with send and stop buttons. The user sees it only where a host app mounts it from the public API.

  **Use it for** a simple chat-style agent conversation in a host app that does not use the editor.
  **Not for** a read-only view of a run; use `MessageStream` for that.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import MessageStream from './MessageStream.svelte';
  import ChatInput from './ChatInput.svelte';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** Show a time on each message. Default: true. */
    showTimestamps?: boolean;
    /** Keep the feed scrolled to the newest message. Default: true. */
    autoScroll?: boolean;
    /** Text shown in the empty input box. Default: the built-in message. */
    placeholder?: string;
    /** Called with the text when the user sends a message. */
    onSendMessage?: (content: string) => void;
    /** Called when the user presses Stop during a run. */
    onStopExecution?: () => void;
    /** Show log messages in the feed. Default: false. */
    showLogsInline?: boolean;
    /** Render message text as Markdown. Default: true. */
    enableMarkdown?: boolean;
    /** Called after the user answers a question the flow asked mid-run. */
    onInterruptResolved?: () => void;
    /** Render a "New session" CTA in the welcome state */
    onCreateSession?: () => void;
    /** Text to put in the input box before the user types. Default: none. */
    predefinedMessage?: string;
    /** Show system messages in a smaller, quieter style. Default: true. */
    compactSystemMessages?: boolean;
  }

  let {
    showTimestamps = true,
    autoScroll = true,
    placeholder,
    onSendMessage,
    onStopExecution,
    showLogsInline = false,
    enableMarkdown = true,
    onInterruptResolved,
    onCreateSession,
    predefinedMessage,
    compactSystemMessages = true
  }: Props = $props();

  const states = $derived(m().playground.states);
</script>

<div class="chat-panel">
  <MessageStream
    {showTimestamps}
    {autoScroll}
    {enableMarkdown}
    allowLogs={showLogsInline}
    {compactSystemMessages}
    {onInterruptResolved}
    welcome={welcomeState}
    emptySession={emptyChatState}
  />

  <ChatInput {placeholder} {predefinedMessage} {onSendMessage} {onStopExecution} />
</div>

{#snippet welcomeIcon()}
  <div class="chat-panel__welcome-icon">
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 16L24 8L40 16V32L24 40L8 32V16Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <path d="M8 16L24 24L40 16" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <path d="M24 24V40" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <path d="M16 12L32 20" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <path d="M16 36L32 28" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
    </svg>
  </div>
{/snippet}

{#snippet welcomeCopy()}
  <h2 class="chat-panel__welcome-title">{states.newSessionTitle}</h2>
  <p class="chat-panel__welcome-text">{states.newSessionText}</p>
{/snippet}

{#snippet welcomeState()}
  <div class="chat-panel__welcome">
    {@render welcomeIcon()}
    {@render welcomeCopy()}
    {#if onCreateSession}
      <button type="button" class="chat-panel__create-session-btn" onclick={onCreateSession}>
        <Icon icon="mdi:plus" />
        New session
      </button>
    {/if}
  </div>
{/snippet}

{#snippet emptyChatState()}
  <div class="chat-panel__welcome">
    {@render welcomeIcon()}
    {@render welcomeCopy()}
  </div>
{/snippet}

<style>
  .chat-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background-color: var(--fd-background);
  }

  .chat-panel__welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: var(--fd-space-4xl);
  }

  .chat-panel__welcome-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    margin-bottom: var(--fd-space-3xl);
    color: var(--fd-foreground);
  }

  .chat-panel__welcome-icon svg {
    width: 100%;
    height: 100%;
  }

  .chat-panel__welcome-title {
    font-size: var(--fd-text-2xl);
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0 0 var(--fd-space-xs) 0;
  }

  .chat-panel__welcome-text {
    font-size: var(--fd-text-base);
    color: var(--fd-muted-foreground);
    margin: 0;
  }

  .chat-panel__create-session-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin-top: var(--fd-space-2xl);
    padding: var(--fd-space-sm) var(--fd-space-xl);
    border: none;
    border-radius: var(--fd-radius-md);
    background: var(--fd-primary);
    color: var(--fd-primary-foreground);
    font-size: var(--fd-text-base);
    font-weight: 500;
    cursor: pointer;
    transition: opacity var(--fd-transition-fast);
  }

  .chat-panel__create-session-btn:hover {
    opacity: 0.9;
  }
</style>
