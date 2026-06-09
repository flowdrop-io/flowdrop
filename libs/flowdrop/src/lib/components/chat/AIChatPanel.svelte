<script lang="ts">
  import type { ChatHistoryMessage, ChatRequest, CommandPreviewItem } from '../../types/chat.js';
  import type { NodeMetadata } from '../../types/index.js';
  import type { UIAction } from '../../commands/types.js';
  import type { EndpointConfig } from '../../config/endpoints.js';
  import { chatService } from '../../services/chatService.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { getBehaviorSettings } from '../../stores/settingsStore.svelte.js';
  import { extractCommands } from '../../chat/responseParser.js';
  import { isMutatingCommand } from '../../chat/commandClassifier.js';
  import { parseCommand } from '../../commands/parser.js';
  import { executeCommand } from '../../commands/index.js';
  import { createStoreCommandContext } from '../../commands/storeIntegration.svelte.js';
  import {
    buildRetryFeedback,
    type BatchOutcome,
    type ParseFailure
  } from '../../chat/batchFeedback.js';
  import CommandPreview from './CommandPreview.svelte';
  import MarkdownDisplay from '../MarkdownDisplay.svelte';
  import { tick } from 'svelte';
  import Icon from '@iconify/svelte';
  import { m } from '$lib/messages/index.js';

  // =========================================================================
  // Internal Display Message Type
  // =========================================================================

  interface DisplayMessage {
    role: 'user' | 'assistant';
    content: string;
    /** Set on auto-retry messages — renders as a muted notice, not a user bubble */
    retryAttempt?: number;
    /** Mutating commands awaiting approval */
    commandPreview?: CommandPreviewItem[];
    /** Results from auto-executed read-only commands */
    readOnlyResults?: string[];
  }

  interface Props {
    nodeTypes: NodeMetadata[];
    workflowId?: string;
    onUIAction?: (action: UIAction) => void;
    endpointConfig?: EndpointConfig | null;
  }

  let { nodeTypes, workflowId, onUIAction, endpointConfig }: Props = $props();

  const fd = getInstance();

  // Hoist the chat branch — read in placeholder, header, three welcome states,
  // auto-retry banner, and the send button aria-label.
  const t = $derived(m().chat);

  // =========================================================================
  // State
  // =========================================================================

  const MAX_AUTO_RETRIES = 3;

  let displayMessages: DisplayMessage[] = $state([]);
  let inputValue: string = $state('');
  let isLoading: boolean = $state(false);
  let inputElement: HTMLTextAreaElement | undefined = $state();
  let messagesElement: HTMLDivElement | undefined = $state();
  let autoRetryCount = 0;

  // =========================================================================
  // Derived State
  // =========================================================================

  const isDisabled = $derived(!workflowId);
  const isChatConfigured = $derived(endpointConfig?.endpoints?.chat !== undefined);
  const canSend = $derived(
    inputValue.trim().length > 0 && !isLoading && !isDisabled && isChatConfigured
  );

  // =========================================================================
  // Auto-scroll
  // =========================================================================

  $effect(() => {
    // Read scroll-relevant state so the effect re-runs when messages change
    const _deps = [displayMessages.length, isLoading];
    tick().then(() => {
      if (messagesElement) {
        messagesElement.scrollTop = messagesElement.scrollHeight;
      }
    });
  });

  // =========================================================================
  // Helpers
  // =========================================================================

  /** Build conversation history from display messages for API requests */
  function getHistory(): ChatHistoryMessage[] {
    return displayMessages.map((m) => ({ role: m.role, content: m.content }));
  }

  function getWorkflowState(): unknown {
    const workflow = fd.workflow.current;
    if (!workflow) return null;
    return {
      nodes: workflow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data,
        position: n.position
      })),
      edges: workflow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle
      }))
    };
  }

  function getCommandContext() {
    return createStoreCommandContext(nodeTypes, onUIAction, fd);
  }

  // =========================================================================
  // Command Execution
  // =========================================================================

  /**
   * Process an LLM response: extract commands, auto-execute read-only ones,
   * and queue mutating ones for approval via CommandPreview.
   */
  function processResponse(responseContent: string): DisplayMessage {
    const { explanation, commands } = extractCommands(responseContent);

    // No commands — pure chat message
    if (commands.length === 0) {
      return { role: 'assistant', content: explanation || responseContent };
    }

    const context = getCommandContext();
    const readOnlyResults: string[] = [];
    const mutatingCommands: CommandPreviewItem[] = [];

    for (const raw of commands) {
      const parsed = parseCommand(raw);
      if (!parsed.ok) {
        // Treat parse errors as mutating (show in preview as error)
        mutatingCommands.push({ raw, status: 'error', result: parsed.error });
        continue;
      }

      if (!isMutatingCommand(parsed.command.type)) {
        // Auto-execute read-only commands
        if (context) {
          const result = executeCommand(parsed.command, context);
          if (result.ok) {
            readOnlyResults.push(`> ${raw}\n${result.message}`);
          } else {
            readOnlyResults.push(`> ${raw}\nError: ${result.error}`);
          }
        } else {
          readOnlyResults.push(`> ${raw}\nError: No workflow loaded`);
        }
      } else {
        mutatingCommands.push({ raw, status: 'pending' });
      }
    }

    const msg: DisplayMessage = {
      role: 'assistant',
      content: explanation || responseContent
    };

    if (readOnlyResults.length > 0) {
      msg.readOnlyResults = readOnlyResults;
    }
    if (mutatingCommands.length > 0) {
      msg.commandPreview = mutatingCommands;
    }

    return msg;
  }

  /**
   * Execute the parseable commands in a batch one by one with progressive UI
   * feedback.
   *
   * Commands that failed to parse are *isolated* — they stay marked as errors
   * and are skipped, but they no longer abort the whole batch, so the healthy
   * subset still applies (matching the long-standing "applied to a certain
   * extent" expectation). After execution, if anything failed to parse or
   * execute and auto-retry is enabled, specific feedback is sent back so the
   * assistant can resend corrected commands.
   */
  async function handleApproveCommands(messageIndex: number) {
    const msg = displayMessages[messageIndex];
    if (!msg?.commandPreview) return;

    const context = getCommandContext();
    if (!context) {
      for (const cmd of msg.commandPreview) {
        if (cmd.status === 'pending') {
          cmd.status = 'error';
          cmd.result = 'No workflow loaded';
        }
      }
      appendErrorToHistory('Command execution failed: No workflow loaded');
      return;
    }

    // Commands that failed to parse (in processResponse) are isolated, not run.
    // Capture their raw text + reason so we can feed specific corrections back.
    const parseErrors: ParseFailure[] = msg.commandPreview
      .filter((c) => c.status === 'error')
      .map((c) => ({ raw: c.raw, error: c.result ?? 'Parse error' }));

    // Re-parse the pending (parseable) commands, preserving order.
    const pendingItems = msg.commandPreview.filter((c) => c.status === 'pending');
    const parsedCommands: {
      item: CommandPreviewItem;
      command: import('../../commands/types.js').Command;
    }[] = [];

    for (const item of pendingItems) {
      const parsed = parseCommand(item.raw);
      if (!parsed.ok) {
        // Re-parse disagreed with processResponse — isolate it like a parse error.
        item.status = 'error';
        item.result = parsed.error;
        parseErrors.push({ raw: item.raw, error: parsed.error });
        continue;
      }
      parsedCommands.push({ item, command: parsed.command });
    }

    const totalCount = parsedCommands.length;

    // Nothing parseable to run — feed the parse errors straight back so the
    // assistant can resend a corrected batch.
    if (totalCount === 0) {
      await resolveBatchOutcome({
        completedCount: 0,
        executionError: undefined,
        rolledBack: false,
        parseErrors
      });
      return;
    }

    // Execute the healthy subset one by one inside a single transaction.
    // A 100ms pause between commands lets the canvas visibly update at each step.
    context.dispatch.startTransaction(
      totalCount === 1 ? 'batch: 1 command' : `batch: ${totalCount} commands`
    );

    let completedCount = 0;
    let executionError: string | undefined;

    try {
      for (let i = 0; i < parsedCommands.length; i++) {
        const { item, command } = parsedCommands[i];
        item.status = 'executing';

        const result = executeCommand(command, context);

        if (!result.ok) {
          item.status = 'error';
          item.result = result.error;
          executionError = result.error;
          context.dispatch.cancelTransaction();
          break;
        }

        item.status = 'success';
        item.result = result.message;
        completedCount++;

        // Pause between commands so canvas updates are visibly distinct
        if (i < parsedCommands.length - 1) {
          await new Promise<void>((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (err) {
      context.dispatch.cancelTransaction();
      for (const { item } of parsedCommands) {
        if (item.status === 'executing') item.status = 'pending';
      }
      appendErrorToHistory(
        `Unexpected execution error: ${err instanceof Error ? err.message : String(err)}`
      );
      return;
    }

    if (executionError !== undefined) {
      // An executed command failed — the whole batch is rolled back (atomic,
      // long-standing behaviour). Retry feedback covers both the execution
      // failure and any parse-skipped commands.
      await resolveBatchOutcome({
        completedCount,
        executionError,
        rolledBack: true,
        parseErrors
      });
      return;
    }

    // Every parseable command applied — commit so the subset persists.
    context.dispatch.commitTransaction();

    // If some commands couldn't be parsed, ask the assistant to resend them.
    if (parseErrors.length > 0) {
      await resolveBatchOutcome({
        completedCount,
        executionError: undefined,
        rolledBack: false,
        parseErrors
      });
    }
  }

  /**
   * After a batch finishes with failures (parse and/or execution), either
   * auto-retry with specific feedback so the assistant can self-correct, or —
   * when auto-retry is off/exhausted — surface the same summary in the log.
   */
  async function resolveBatchOutcome(outcome: BatchOutcome) {
    const feedback = buildRetryFeedback(outcome);
    const canRetry =
      getBehaviorSettings().chatAutoRetry && !!workflowId && autoRetryCount < MAX_AUTO_RETRIES;

    if (canRetry) {
      autoRetryCount++;
      await sendMessageInternal(feedback, autoRetryCount);
    } else {
      appendErrorToHistory(feedback);
    }
  }

  /** Dismiss a command preview without executing — CommandPreview shows its own cancelled state */
  function handleCancelCommands(_messageIndex: number) {
    // Intentionally empty: CommandPreview owns the "Dismissed" display via resolvedAction state
  }

  /** Append an error message to conversation history so the LLM can self-correct */
  function appendErrorToHistory(errorMessage: string) {
    displayMessages.push({
      role: 'assistant',
      content: `Error: ${errorMessage}`
    });
  }

  // =========================================================================
  // Message Handling
  // =========================================================================

  /** Core send logic — shared by manual sends and auto-retry */
  async function sendMessageInternal(text: string, retryAttempt?: number) {
    if (!text || isLoading || !workflowId) return;

    displayMessages.push({ role: 'user', content: text, retryAttempt });
    isLoading = true;

    try {
      const history = getHistory();
      const request: ChatRequest = {
        message: text,
        workflowState: getWorkflowState(),
        history: history.slice(0, -1) // all except current message
      };

      const response = await chatService.sendMessage(
        fd.api.config,
        workflowId,
        request,
        fd.api.authProvider
      );
      const displayMsg = processResponse(response.content);
      displayMessages.push(displayMsg);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      displayMessages.push({
        role: 'assistant',
        content: `Error: ${errorMessage}`
      });
    } finally {
      isLoading = false;
      tick().then(() => inputElement?.focus());
    }
  }

  async function sendMessage() {
    const text = inputValue.trim();
    if (!text || isLoading || !workflowId) return;
    inputValue = '';
    autoRetryCount = 0;
    await sendMessageInternal(text);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="ai-chat-panel" role="region" aria-label={t.aiAssistant}>
  {#if !isChatConfigured}
    <!-- No backend configured -->
    <div class="ai-chat-panel__notice">
      <Icon icon="mdi:robot-off-outline" />
      <span>{t.requiresBackend}</span>
    </div>
  {:else if isDisabled}
    <!-- No workflow loaded -->
    <div class="ai-chat-panel__notice">
      <Icon icon="mdi:chat-sleep-outline" />
      <span>{t.loadWorkflow}</span>
    </div>
  {:else}
    <!-- Messages area -->
    <div class="ai-chat-panel__messages" bind:this={messagesElement} role="log" aria-live="polite">
      {#if displayMessages.length === 0}
        <div class="ai-chat-panel__empty">
          <Icon icon="mdi:chat-outline" />
          <span>{t.helpBuild}</span>
        </div>
      {/if}
      <!-- Append-only chat log without stable IDs — index is the identity -->
      {#each displayMessages as message, msgIndex (msgIndex)}
        {#if message.retryAttempt !== undefined}
          <div
            class="ai-chat-panel__retry-notice"
            class:ai-chat-panel__retry-notice--active={isLoading &&
              msgIndex === displayMessages.length - 1}
          >
            <Icon icon="mdi:autorenew" />
            <span>{t.autoRetry({ attempt: message.retryAttempt, max: MAX_AUTO_RETRIES })}</span>
          </div>
        {:else}
          <div class="ai-chat-panel__bubble ai-chat-panel__bubble--{message.role}">
            {#if message.role === 'user'}
              <div class="ai-chat-panel__bubble-content">{message.content}</div>
            {:else}
              <div class="ai-chat-panel__bubble-content">
                <MarkdownDisplay content={message.content} />
              </div>
            {/if}
            {#if message.readOnlyResults && message.readOnlyResults.length > 0}
              <div class="ai-chat-panel__readonly-results">
                {#each message.readOnlyResults as result, i (i)}
                  <pre class="ai-chat-panel__readonly-result">{result}</pre>
                {/each}
              </div>
            {/if}
            {#if message.commandPreview && message.commandPreview.length > 0}
              <div class="ai-chat-panel__command-preview">
                <CommandPreview
                  commands={message.commandPreview}
                  onApprove={() => handleApproveCommands(msgIndex)}
                  onCancel={() => handleCancelCommands(msgIndex)}
                />
              </div>
            {/if}
          </div>
        {/if}
      {/each}
      {#if isLoading}
        <div class="ai-chat-panel__bubble ai-chat-panel__bubble--assistant">
          <div class="ai-chat-panel__thinking">
            <span class="ai-chat-panel__dot"></span>
            <span class="ai-chat-panel__dot"></span>
            <span class="ai-chat-panel__dot"></span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Input area -->
    <div class="ai-chat-panel__input-area">
      <textarea
        bind:this={inputElement}
        bind:value={inputValue}
        onkeydown={handleKeydown}
        class="ai-chat-panel__input"
        placeholder={t.placeholder}
        rows="1"
        disabled={isLoading}
      ></textarea>
      <button
        class="ai-chat-panel__send"
        onclick={sendMessage}
        disabled={!canSend}
        aria-label={t.send}
      >
        <Icon icon="mdi:send" />
      </button>
    </div>
  {/if}
</div>

<style>
  .ai-chat-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--fd-background);
    color: var(--fd-foreground);
    overflow: hidden;
  }

  /* Notice / disabled states */
  .ai-chat-panel__notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-sm);
    height: 100%;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    text-align: center;
    padding: var(--fd-space-md);
  }

  .ai-chat-panel__notice :global(svg) {
    font-size: 2rem;
    opacity: 0.5;
  }

  /* Messages area */
  .ai-chat-panel__messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--fd-space-sm);
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    scrollbar-width: thin;
    scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
  }

  .ai-chat-panel__messages::-webkit-scrollbar {
    width: 8px;
  }

  .ai-chat-panel__messages::-webkit-scrollbar-track {
    background: var(--fd-scrollbar-track);
  }

  .ai-chat-panel__messages::-webkit-scrollbar-thumb {
    background: var(--fd-scrollbar-thumb);
    border-radius: 4px;
  }

  .ai-chat-panel__messages::-webkit-scrollbar-thumb:hover {
    background: var(--fd-scrollbar-thumb-hover);
  }

  /* Empty state */
  .ai-chat-panel__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-xs);
    height: 100%;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    opacity: 0.6;
  }

  .ai-chat-panel__empty :global(svg) {
    font-size: 1.5rem;
  }

  /* Auto-retry notice */
  .ai-chat-panel__retry-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-xs);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    opacity: 0.7;
    padding: var(--fd-space-3xs) 0;
    animation: fadeIn 0.15s ease-out;
  }

  .ai-chat-panel__retry-notice--active :global(svg) {
    animation: spin 1s linear infinite;
  }

  /* Message bubbles */
  .ai-chat-panel__bubble {
    max-width: 80%;
    animation: fadeIn 0.15s ease-out;
  }

  .ai-chat-panel__bubble--user {
    align-self: flex-end;
  }

  .ai-chat-panel__bubble--assistant {
    align-self: flex-start;
  }

  .ai-chat-panel__bubble-content {
    padding: var(--fd-space-xs) var(--fd-space-sm);
    border-radius: var(--fd-radius-md);
    font-size: var(--fd-text-sm);
    line-height: 1.5;
    word-break: break-word;
  }

  .ai-chat-panel__bubble--user .ai-chat-panel__bubble-content {
    background: var(--fd-primary);
    color: var(--fd-primary-foreground);
    border-bottom-right-radius: var(--fd-radius-xs);
    white-space: pre-wrap;
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content {
    background: var(--fd-muted);
    color: var(--fd-foreground);
    border-bottom-left-radius: var(--fd-radius-xs);
  }

  /* Markdown typography inside assistant bubbles */
  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(.markdown-display) {
    font-size: inherit;
    line-height: inherit;
    color: inherit;
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(p) {
    margin: 0 0 0.5em;
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(p:last-child),
  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(ul:last-child),
  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(ol:last-child) {
    margin-bottom: 0;
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(ul),
  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(ol) {
    margin: 0 0 0.5em;
    padding-left: 1.25em;
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(li) {
    margin-bottom: 0.2em;
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(code) {
    font-family: var(--fd-font-mono);
    font-size: 0.875em;
    background: var(--fd-background);
    padding: 0.1em 0.3em;
    border-radius: var(--fd-radius-xs);
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(pre) {
    background: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    padding: var(--fd-space-xs) var(--fd-space-sm);
    overflow-x: auto;
    margin: 0.5em 0;
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(pre code) {
    background: none;
    padding: 0;
    font-size: var(--fd-text-xs);
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(strong) {
    font-weight: 600;
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content :global(em) {
    font-style: italic;
  }

  /* Read-only command results */
  .ai-chat-panel__readonly-results {
    margin-top: var(--fd-space-xs);
  }

  .ai-chat-panel__readonly-result {
    margin: 0;
    padding: var(--fd-space-xs) var(--fd-space-sm);
    background: var(--fd-card);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--fd-foreground);
  }

  .ai-chat-panel__readonly-result + .ai-chat-panel__readonly-result {
    margin-top: var(--fd-space-3xs);
  }

  /* Command preview block */
  .ai-chat-panel__command-preview {
    margin-top: var(--fd-space-xs);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Thinking indicator */
  .ai-chat-panel__thinking {
    display: flex;
    gap: 4px;
    padding: var(--fd-space-xs) var(--fd-space-sm);
    background: var(--fd-muted);
    border-radius: var(--fd-radius-md);
    border-bottom-left-radius: var(--fd-radius-xs);
  }

  .ai-chat-panel__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--fd-muted-foreground);
    animation: bounce 1.4s ease-in-out infinite;
  }

  .ai-chat-panel__dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .ai-chat-panel__dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes bounce {
    0%,
    60%,
    100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-4px);
    }
  }

  /* Input area */
  .ai-chat-panel__input-area {
    display: flex;
    align-items: flex-end;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs) var(--fd-space-sm);
    border-top: 1px solid var(--fd-border);
    background: var(--fd-background);
  }

  .ai-chat-panel__input {
    flex: 1;
    resize: none;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    padding: var(--fd-space-xs) var(--fd-space-sm);
    font-family: var(--fd-font-sans, inherit);
    font-size: var(--fd-text-sm);
    line-height: 1.4;
    color: var(--fd-foreground);
    background: var(--fd-card);
    outline: none;
    max-height: 80px;
    overflow-y: auto;
  }

  .ai-chat-panel__input:focus {
    border-color: var(--fd-primary);
  }

  .ai-chat-panel__input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ai-chat-panel__input::placeholder {
    color: var(--fd-muted-foreground);
  }

  .ai-chat-panel__send {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--fd-radius-md);
    background: var(--fd-primary);
    color: var(--fd-primary-foreground);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color var(--fd-transition-fast),
      opacity var(--fd-transition-fast);
  }

  .ai-chat-panel__send:hover:not(:disabled) {
    background: var(--fd-primary-hover);
  }

  .ai-chat-panel__send:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
