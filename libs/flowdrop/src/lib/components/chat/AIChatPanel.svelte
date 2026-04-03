<script lang="ts">
  import type {
    ChatHistoryMessage,
    ChatRequest,
    CommandPreviewItem,
  } from "../../types/chat.js";
  import type { NodeMetadata } from "../../types/index.js";
  import type { UIAction } from "../../commands/types.js";
  import type { EndpointConfig } from "../../config/endpoints.js";
  import { chatService } from "../../services/chatService.js";
  import { getWorkflowStore } from "../../stores/workflowStore.svelte.js";
  import { extractCommands } from "../../chat/responseParser.js";
  import { isMutatingCommand } from "../../chat/commandClassifier.js";
  import { parseCommand } from "../../commands/parser.js";
  import { executeCommand, executeBatch } from "../../commands/index.js";
  import { createStoreCommandContext } from "../../commands/storeIntegration.svelte.js";
  import CommandPreview from "./CommandPreview.svelte";
  import { tick } from "svelte";
  import Icon from "@iconify/svelte";

  // =========================================================================
  // Internal Display Message Type
  // =========================================================================

  interface DisplayMessage {
    role: "user" | "assistant";
    content: string;
    /** Mutating commands awaiting approval */
    commandPreview?: CommandPreviewItem[];
    /** Results from auto-executed read-only commands */
    readOnlyResults?: string[];
  }

  interface Props {
    nodeTypes: NodeMetadata[];
    workflowId?: string;
    onUIAction?: (action: UIAction) => void;
    placeholder?: string;
    endpointConfig?: EndpointConfig | null;
  }

  let { nodeTypes, workflowId, onUIAction, placeholder, endpointConfig }: Props = $props();

  // =========================================================================
  // State
  // =========================================================================

  let displayMessages: DisplayMessage[] = $state([]);
  let inputValue: string = $state("");
  let isLoading: boolean = $state(false);
  let inputElement: HTMLTextAreaElement | undefined = $state();
  let messagesElement: HTMLDivElement | undefined = $state();

  // =========================================================================
  // Derived State
  // =========================================================================

  const isDisabled = $derived(!workflowId);
  const isChatConfigured = $derived(
    endpointConfig?.endpoints?.chat !== undefined,
  );
  const canSend = $derived(
    inputValue.trim().length > 0 &&
      !isLoading &&
      !isDisabled &&
      isChatConfigured,
  );

  // =========================================================================
  // Auto-scroll
  // =========================================================================

  $effect(() => {
    const _count = displayMessages.length;
    const _loading = isLoading;
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
    const workflow = getWorkflowStore();
    if (!workflow) return null;
    return {
      nodes: workflow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data,
        position: n.position,
      })),
      edges: workflow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
      })),
    };
  }

  function getCommandContext() {
    return createStoreCommandContext(nodeTypes, onUIAction);
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
      return { role: "assistant", content: explanation || responseContent };
    }

    const context = getCommandContext();
    const readOnlyResults: string[] = [];
    const mutatingCommands: CommandPreviewItem[] = [];

    for (const raw of commands) {
      const parsed = parseCommand(raw);
      if (!parsed.ok) {
        // Treat parse errors as mutating (show in preview as error)
        mutatingCommands.push({ raw, status: "error", result: parsed.error });
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
        mutatingCommands.push({ raw, status: "pending" });
      }
    }

    const msg: DisplayMessage = {
      role: "assistant",
      content: explanation || responseContent,
    };

    if (readOnlyResults.length > 0) {
      msg.readOnlyResults = readOnlyResults;
    }
    if (mutatingCommands.length > 0) {
      msg.commandPreview = mutatingCommands;
    }

    return msg;
  }

  /** Execute all pending mutating commands in a CommandPreview via executeBatch */
  function handleApproveCommands(messageIndex: number) {
    const msg = displayMessages[messageIndex];
    if (!msg?.commandPreview) return;

    const context = getCommandContext();
    if (!context) {
      // Mark all as error
      for (const cmd of msg.commandPreview) {
        if (cmd.status === "pending") {
          cmd.status = "error";
          cmd.result = "No workflow loaded";
        }
      }
      appendErrorToHistory("Command execution failed: No workflow loaded");
      return;
    }

    // Parse all pending commands
    const pendingItems = msg.commandPreview.filter(
      (c) => c.status === "pending",
    );
    const parsedCommands: { item: CommandPreviewItem; command: unknown }[] = [];

    for (const item of pendingItems) {
      item.status = "executing";
      const parsed = parseCommand(item.raw);
      if (!parsed.ok) {
        item.status = "error";
        item.result = parsed.error;
        // Revert other executing items back to pending
        for (const other of pendingItems) {
          if (other.status === "executing") other.status = "pending";
        }
        appendErrorToHistory(
          `Command parse error for "${item.raw}": ${parsed.error}`,
        );
        return;
      }
      parsedCommands.push({ item, command: parsed.command });
    }

    // Execute atomically via executeBatch
    const commands = parsedCommands.map(
      (p) => p.command,
    ) as import("../../commands/types.js").Command[];
    const batchResult = executeBatch(commands, context);

    // Update status for each command
    for (let i = 0; i < parsedCommands.length; i++) {
      const { item } = parsedCommands[i];
      const result = batchResult.results[i];
      if (result) {
        if (result.ok) {
          item.status = "success";
          item.result = result.message;
        } else {
          item.status = "error";
          item.result = result.error;
        }
      } else {
        // Commands after the failed one weren't executed
        item.status = "pending";
      }
    }

    if (!batchResult.ok) {
      appendErrorToHistory(
        `Command execution failed at command ${batchResult.completedCount + 1}/${batchResult.totalCount}: ${batchResult.error}`,
      );
    }
  }

  /** Dismiss a command preview without executing */
  function handleCancelCommands(messageIndex: number) {
    const msg = displayMessages[messageIndex];
    if (!msg?.commandPreview) return;
    // Remove the command preview entirely
    msg.commandPreview = undefined;
  }

  /** Append an error message to conversation history so the LLM can self-correct */
  function appendErrorToHistory(errorMessage: string) {
    displayMessages.push({
      role: "assistant",
      content: `Error: ${errorMessage}`,
    });
  }

  // =========================================================================
  // Message Handling
  // =========================================================================

  async function sendMessage() {
    const text = inputValue.trim();
    if (!text || isLoading || !workflowId) return;

    // Add user message
    displayMessages.push({ role: "user", content: text });
    inputValue = "";
    isLoading = true;

    try {
      const history = getHistory();
      const request: ChatRequest = {
        message: text,
        workflowState: getWorkflowState(),
        history: history.slice(0, -1), // all except current message (already sent as `message`)
      };

      const response = await chatService.sendMessage(workflowId, request);

      // Process response: extract commands, auto-execute read-only, queue mutating
      const displayMsg = processResponse(response.content);
      displayMessages.push(displayMsg);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      displayMessages.push({
        role: "assistant",
        content: `Error: ${errorMessage}`,
      });
    } finally {
      isLoading = false;
      tick().then(() => inputElement?.focus());
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="ai-chat-panel" role="region" aria-label="AI Chat">
  {#if !isChatConfigured}
    <!-- No backend configured -->
    <div class="ai-chat-panel__notice">
      <Icon icon="mdi:robot-off-outline" />
      <span>AI Chat requires backend configuration</span>
    </div>
  {:else if isDisabled}
    <!-- No workflow loaded -->
    <div class="ai-chat-panel__notice">
      <Icon icon="mdi:chat-sleep-outline" />
      <span>Load a workflow to start chatting</span>
    </div>
  {:else}
    <!-- Messages area -->
    <div
      class="ai-chat-panel__messages"
      bind:this={messagesElement}
      role="log"
      aria-live="polite"
    >
      {#if displayMessages.length === 0}
        <div class="ai-chat-panel__empty">
          <Icon icon="mdi:chat-outline" />
          <span>Ask the AI to help build your workflow</span>
        </div>
      {/if}
      {#each displayMessages as message, msgIndex}
        <div class="ai-chat-panel__bubble ai-chat-panel__bubble--{message.role}">
          <div class="ai-chat-panel__bubble-content">{message.content}</div>
          {#if message.readOnlyResults && message.readOnlyResults.length > 0}
            <div class="ai-chat-panel__readonly-results">
              {#each message.readOnlyResults as result}
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
        placeholder={placeholder ?? "Describe what you want to build..."}
        rows="1"
        disabled={isLoading}
      ></textarea>
      <button
        class="ai-chat-panel__send"
        onclick={sendMessage}
        disabled={!canSend}
        aria-label="Send message"
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
    white-space: pre-wrap;
    word-break: break-word;
  }

  .ai-chat-panel__bubble--user .ai-chat-panel__bubble-content {
    background: var(--fd-primary);
    color: var(--fd-primary-foreground);
    border-bottom-right-radius: var(--fd-radius-xs);
  }

  .ai-chat-panel__bubble--assistant .ai-chat-panel__bubble-content {
    background: var(--fd-muted);
    color: var(--fd-foreground);
    border-bottom-left-radius: var(--fd-radius-xs);
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
