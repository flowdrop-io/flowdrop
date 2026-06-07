<!--
  ChatPanel Component

  Public conversational chat interface for the playground. Composes
  MessageStream (message + interrupt feed) and ChatInput (textarea +
  send/run/stop). Use this for chat-style agent interactions.

  For view-only execution surfaces, use the MessageStream primitive directly.
  Log visibility is managed by the playground store (fd.playground.setShowLogs).
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import MessageStream from './MessageStream.svelte';
  import ChatInput from './ChatInput.svelte';
  import { m } from '$lib/messages/index.js';

  interface Props {
    showTimestamps?: boolean;
    autoScroll?: boolean;
    placeholder?: string;
    onSendMessage?: (content: string) => void;
    onStopExecution?: () => void;
    showLogsInline?: boolean;
    enableMarkdown?: boolean;
    onInterruptResolved?: () => void;
    /** Render a "New session" CTA in the welcome state */
    onCreateSession?: () => void;
    predefinedMessage?: string;
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
