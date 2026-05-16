<!--
  ChatInput Component

  The textarea + Run/Send/Stop button. Reusable input primitive shared by
  ChatPanel (conversational) and ControlPanel (orchestration controls).

  Reads execution state from playgroundStore. Owns its own input string and
  textarea ref; emits sent content via onSendMessage.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import { tick } from 'svelte';
  import { hasEnableRunFlag } from '../../types/playground.js';
  import {
    getMessages,
    getIsExecuting,
    getCanSendMessage,
    getCurrentSession
  } from '../../stores/playgroundStore.svelte.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    placeholder?: string;
    /** Show the textarea (default: true). When false, only the Run button is shown. */
    showTextarea?: boolean;
    /** Show the Run button when textarea is hidden (default: true) */
    showRunButton?: boolean;
    /** Message sent when Run is clicked with textarea hidden */
    predefinedMessage?: string;
    onSendMessage?: (content: string) => void;
    onStopExecution?: () => void;
  }

  let {
    placeholder,
    showTextarea = true,
    showRunButton = true,
    predefinedMessage,
    onSendMessage,
    onStopExecution
  }: Props = $props();

  const actions = $derived(m().playground.actions);
  const chat = $derived(m().playground.chat);
  const states = $derived(m().playground.states);

  const resolvedPlaceholder = $derived(placeholder ?? chat.placeholder);
  const resolvedPredefinedMessage = $derived(predefinedMessage ?? chat.predefinedRun);

  const noInputsAvailable = $derived(!showTextarea && !showRunButton);

  /**
   * Tracks whether the Run button is enabled. Starts as true; becomes false
   * after Run is clicked; re-enabled when the backend sends a message with
   * enableRun: true metadata.
   */
  let runEnabled = $state(true);

  let inputValue = $state('');
  let inputField: HTMLTextAreaElement | undefined;

  /** Track processed message IDs to avoid rescanning on every update */
  const processedEnableRunIds = new Set<string>();

  $effect(() => {
    for (const message of getMessages()) {
      if (processedEnableRunIds.has(message.id)) continue;
      processedEnableRunIds.add(message.id);
      if (hasEnableRunFlag(message.metadata)) {
        runEnabled = true;
      }
    }
  });

  /** Reset runEnabled when the active session changes. */
  $effect(() => {
    const id = getCurrentSession()?.id;
    if (id) {
      runEnabled = true;
      processedEnableRunIds.clear();
    }
  });

  let wasExecuting = false;

  /** Auto-focus input when execution completes */
  $effect(() => {
    const nowExecuting = getIsExecuting();
    if (wasExecuting && !nowExecuting && inputField) {
      tick().then(() => inputField?.focus());
    }
    wasExecuting = nowExecuting;
  });

  function handleSend(): void {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || !getCanSendMessage()) return;

    onSendMessage?.(trimmedValue);
    inputValue = '';

    if (inputField) {
      inputField.style.height = 'auto';
    }

    tick().then(() => {
      inputField?.focus();
    });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleStop(): void {
    onStopExecution?.();
  }

  function handleRun(): void {
    if (getIsExecuting() || !runEnabled) return;
    runEnabled = false;
    onSendMessage?.(resolvedPredefinedMessage);
  }

  function handleInput(): void {
    if (inputField) {
      inputField.style.height = 'auto';
      inputField.style.height = `${Math.min(inputField.scrollHeight, 120)}px`;
    }
  }
</script>

<div class="chat-input">
  {#if noInputsAvailable}
    <div class="chat-input__no-inputs">
      <Icon icon="mdi:information-outline" />
      <span>{states.viewOnlyHelp}</span>
    </div>
  {:else}
    <div class="chat-input__container" class:chat-input__container--run-only={!showTextarea}>
      {#if showTextarea}
        <div class="chat-input__wrapper">
          <textarea
            bind:this={inputField}
            bind:value={inputValue}
            class="chat-input__textarea"
            placeholder={resolvedPlaceholder}
            rows="1"
            disabled={getIsExecuting() || !getCurrentSession()}
            onkeydown={handleKeydown}
            oninput={handleInput}
          ></textarea>
        </div>
      {/if}

      {#if getIsExecuting()}
        <button
          type="button"
          class="chat-input__stop-btn"
          onclick={handleStop}
          title={actions.stopTitle}
          aria-label={actions.stopTitle}
        >
          <Icon icon="mdi:stop" />
          {actions.stop}
        </button>
      {:else if showTextarea}
        <button
          type="button"
          class="chat-input__send-btn"
          onclick={handleSend}
          disabled={!inputValue.trim() || !getCanSendMessage()}
          title={actions.sendTitle}
          aria-label={actions.sendTitle}
        >
          {actions.send}
        </button>
      {:else if showRunButton}
        {@const runLabel = runEnabled ? actions.runTitle : actions.runWaitingTitle}
        <button
          type="button"
          class="chat-input__run-btn"
          onclick={handleRun}
          disabled={!runEnabled}
          title={runLabel}
          aria-label={runLabel}
        >
          <Icon icon="mdi:play" />
          {actions.run}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .chat-input {
    flex-shrink: 0;
    padding: var(--fd-space-xl) var(--fd-space-3xl) var(--fd-space-3xl);
    background-color: var(--fd-background);
    border-top: 1px solid var(--fd-border-muted);
  }

  .chat-input__container {
    display: flex;
    align-items: flex-end;
    gap: var(--fd-space-md);
    max-width: 760px;
    margin: 0 auto;
  }

  .chat-input__container--run-only {
    justify-content: flex-end;
  }

  .chat-input__wrapper {
    flex: 1;
    display: flex;
    align-items: flex-end;
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-xl);
    padding: var(--fd-space-sm) var(--fd-space-md);
    transition:
      border-color var(--fd-transition-fast),
      box-shadow var(--fd-transition-fast);
  }

  .chat-input__wrapper:focus-within {
    border-color: var(--fd-primary);
    box-shadow: 0 0 0 3px var(--fd-primary-muted);
  }

  .chat-input__textarea {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
    font-size: var(--fd-text-base);
    line-height: var(--fd-leading-normal);
    max-height: 120px;
    background: transparent;
    color: var(--fd-foreground);
  }

  .chat-input__textarea::placeholder {
    color: var(--fd-muted-foreground);
  }

  .chat-input__textarea:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .chat-input__send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--fd-space-sm) var(--fd-space-2xl);
    border: none;
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-foreground);
    color: var(--fd-background);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    flex-shrink: 0;
  }

  .chat-input__send-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .chat-input__send-btn:disabled {
    background-color: var(--fd-foreground);
    color: var(--fd-background);
    opacity: 0.3;
    cursor: not-allowed;
  }

  .chat-input__stop-btn {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-sm) var(--fd-space-xl);
    border: none;
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-error);
    color: var(--fd-error-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
    flex-shrink: 0;
  }

  .chat-input__stop-btn:hover {
    background-color: var(--fd-error-hover);
  }

  .chat-input__run-btn {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-sm) var(--fd-space-2xl);
    border: none;
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-success);
    color: var(--fd-success-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    flex-shrink: 0;
  }

  .chat-input__run-btn:hover:not(:disabled) {
    background-color: var(--fd-success-hover);
  }

  .chat-input__run-btn:disabled {
    background-color: var(--fd-border);
    color: var(--fd-muted-foreground);
    cursor: not-allowed;
  }

  .chat-input__no-inputs {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-xl);
    background-color: var(--fd-muted);
    border-radius: var(--fd-radius-lg);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    max-width: 760px;
    margin: 0 auto;
  }

  @media (max-width: 640px) {
    .chat-input {
      padding: var(--fd-space-md) var(--fd-space-xl) var(--fd-space-xl);
    }

    .chat-input__container {
      gap: var(--fd-space-xs);
    }

    .chat-input__send-btn,
    .chat-input__stop-btn,
    .chat-input__run-btn {
      padding: var(--fd-space-xs) var(--fd-space-xl);
    }
  }
</style>
