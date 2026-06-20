/**
 * Playground Store
 *
 * Svelte 5 rune-based state for managing playground state including sessions,
 * messages, and execution status.
 *
 * The reactive state lives in the {@link PlaygroundStore} class — one per
 * FlowDrop instance, created by `createFlowDropInstance()` and resolved in
 * components via `getInstance().playground`.
 *
 * @module stores/playgroundStore
 */

import type {
  PlaygroundSession,
  PlaygroundMessage,
  PlaygroundInputField,
  PlaygroundSessionStatus,
  PlaygroundMessagesApiResponse,
  PlaygroundExecution
} from '../types/playground.js';
import { isChatInputNode } from '../types/playground.js';
import type { Workflow, WorkflowNode } from '../types/index.js';
import { logger } from '../utils/logger.js';

// =========================================================================
// Helper Functions (pure, instance-independent)
// =========================================================================

/**
 * Sort messages chronologically by sequenceNumber
 *
 * All messages (user, assistant, log) have incrementing sequenceNumbers (1, 2, 3, ...).
 * This provides a simple, reliable sort order for displaying messages.
 *
 * Sort order:
 * 1. Primary: sequenceNumber (incrementing for all messages)
 * 2. Secondary: timestamp (fallback for messages without sequenceNumber)
 * 3. Tertiary: id as final tiebreaker
 *
 * @param messageList - Array of messages to sort
 * @returns Sorted array of messages
 */
function sortMessagesChronologically(messageList: PlaygroundMessage[]): PlaygroundMessage[] {
  return [...messageList].sort((a, b) => {
    // Primary: Sort by sequenceNumber
    const seqA = a.sequenceNumber ?? 0;
    const seqB = b.sequenceNumber ?? 0;
    if (seqA !== seqB) {
      return seqA - seqB;
    }

    // Secondary: Sort by timestamp for messages without sequenceNumber
    const timestampCompare = a.timestamp.localeCompare(b.timestamp);
    if (timestampCompare !== 0) {
      return timestampCompare;
    }

    // Tertiary: Sort by ID as final tiebreaker
    return a.id.localeCompare(b.id);
  });
}

/**
 * Whether a message was produced by a nested sub-flow (vs the main pipeline).
 * `parentPipelineId` is the authoritative signal — non-null means a parent run
 * triggered this one. Legacy runs that predate the field carry no nesting info,
 * so they're treated as main runs (by design — we don't reclassify history).
 */
function isSubflowMessage(msg: PlaygroundMessage): boolean {
  return msg.parentPipelineId != null;
}

/**
 * Playground mutation actions for a {@link PlaygroundStore}.
 *
 * Bound facade — safe to detach (`onclick={fd.playground.actions.toggleShowLogs}`)
 * because every entry is bound to its store in the constructor.
 */
export interface PlaygroundStoreActions {
  setWorkflow: (workflow: Workflow | null) => void;
  setCurrentSession: (session: PlaygroundSession | null) => void;
  updateSessionStatus: (status: PlaygroundSessionStatus) => void;
  setSessions: (sessionList: PlaygroundSession[]) => void;
  addSession: (session: PlaygroundSession) => void;
  removeSession: (sessionId: string) => void;
  setMessages: (messageList: PlaygroundMessage[]) => void;
  addMessage: (message: PlaygroundMessage) => void;
  addMessages: (newMessages: PlaygroundMessage[]) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (errorMessage: string | null) => void;
  updateLastPollSequenceNumber: (seq: number) => void;
  reset: () => void;
  switchSession: (sessionId: string) => void;
  pinExecution: (executionId: string | null) => void;
  setShowLogs: (value: boolean) => void;
  toggleShowLogs: () => void;
}

// =========================================================================
// PlaygroundStore (per-instance reactive state)
// =========================================================================

/**
 * Per-instance playground state: sessions, messages, executions, and the
 * polling/refresh machinery around them.
 */
export class PlaygroundStore {
  /** Currently active playground session */
  #currentSession = $state<PlaygroundSession | null>(null);

  /** List of all sessions for the current workflow */
  #sessions = $state<PlaygroundSession[]>([]);

  /** Messages in the current session */
  #messages = $state<PlaygroundMessage[]>([]);

  /**
   * Whether older messages exist before the oldest one currently loaded.
   * Drives the scroll-up "load older" affordance. Reset whenever the message
   * set is replaced (session switch / clear).
   */
  #hasOlder = $state<boolean>(false);

  /** Whether we are currently loading data */
  #isLoading = $state<boolean>(false);

  /** Current error message, if any */
  #error = $state<string | null>(null);

  /** Current workflow being tested */
  #currentWorkflow = $state<Workflow | null>(null);

  /** Last polling cursor for incremental message fetching */
  #lastPollSequenceNumber = $state<number | null>(null);

  /** Execution ID explicitly pinned by the user (null = follow latest) */
  #pinnedExecutionId = $state<string | null>(null);

  /** Incremented on every message batch that should trigger a pipeline re-fetch */
  #pipelineRefreshTrigger = $state(0);

  /** Whether log messages are visible in the execution console */
  #showLogs = $state<boolean>(true);

  /**
   * The main pipeline runs — the single source of truth for "what's selectable".
   * Sub-flow runs are tracked for classification but excluded here: selecting one
   * can't show its own graph (the panel renders the main pipeline regardless), so
   * listing them would be dead UI. Feeds both the run-switcher and "latest".
   */
  #selectableExecutions = $derived(
    (this.#currentSession?.executions ?? []).filter((e) => !e.isSubflow)
  );

  /**
   * Latest execution ID: the most recent main run, so the sidebar keeps the main
   * pipeline in focus and never auto-follows a sub-flow. Null when no main run is
   * known yet — better an empty panel for a poll than the wrong graph.
   */
  #latestExecutionId = $derived(this.#selectableExecutions.at(-1)?.id ?? null);

  /** Active execution: pinned if set, otherwise latest */
  #activeExecutionId = $derived(this.#pinnedExecutionId ?? this.#latestExecutionId);

  // Derived from server status — never manually set.
  // Exception: updateSessionStatus('running') in handleSendMessage is an
  // acknowledged optimistic write, overwritten by the next server response.
  #isExecuting = $derived(this.#currentSession?.status === 'running');

  /** Cleanups for active subscribeToSessionStatus effect roots. */
  readonly #statusSubscriptions = new Set<() => void>();

  /** Bound mutation facade — see {@link PlaygroundStoreActions}. */
  readonly actions: PlaygroundStoreActions;

  constructor() {
    this.actions = Object.freeze({
      setWorkflow: this.setWorkflow.bind(this),
      setCurrentSession: this.setCurrentSession.bind(this),
      updateSessionStatus: this.updateSessionStatus.bind(this),
      setSessions: this.setSessions.bind(this),
      addSession: this.addSession.bind(this),
      removeSession: this.removeSession.bind(this),
      setMessages: this.setMessages.bind(this),
      addMessage: this.addMessage.bind(this),
      addMessages: this.addMessages.bind(this),
      clearMessages: this.clearMessages.bind(this),
      setLoading: this.setLoading.bind(this),
      setError: this.setError.bind(this),
      updateLastPollSequenceNumber: this.updateLastPollSequenceNumber.bind(this),
      reset: this.reset.bind(this),
      switchSession: this.switchSession.bind(this),
      pinExecution: this.pinExecution.bind(this),
      setShowLogs: this.setShowLogs.bind(this),
      toggleShowLogs: this.toggleShowLogs.bind(this)
    });
  }

  // -----------------------------------------------------------------------
  // Reactive getters
  // -----------------------------------------------------------------------

  /** The current session. */
  get currentSession(): PlaygroundSession | null {
    return this.#currentSession;
  }

  /** All sessions. */
  get sessions(): PlaygroundSession[] {
    return this.#sessions;
  }

  /** All messages (chronological). */
  get messages(): PlaygroundMessage[] {
    return this.#messages;
  }

  /** Executing state (derived from server status). */
  get isExecuting(): boolean {
    return this.#isExecuting;
  }

  /** Loading state. */
  get isLoading(): boolean {
    return this.#isLoading;
  }

  /** Error state. */
  get error(): string | null {
    return this.#error;
  }

  /** The current workflow. */
  get currentWorkflow(): Workflow | null {
    return this.#currentWorkflow;
  }

  /** The last poll sequence number cursor. */
  get lastPollSequenceNumber(): number | null {
    return this.#lastPollSequenceNumber;
  }

  /** Current session status. */
  get sessionStatus(): PlaygroundSessionStatus {
    return this.#currentSession?.status ?? 'idle';
  }

  /**
   * Whether the user can currently send a message.
   * False when executing, when awaiting input, or when no session exists.
   */
  get canSendMessage(): boolean {
    const status = this.#currentSession?.status ?? 'idle';
    return this.#currentSession !== null && !this.#isExecuting && status !== 'awaiting_input';
  }

  /** Message count. */
  get messageCount(): number {
    return this.#messages.length;
  }

  /** Chat messages (excludes log messages). */
  get chatMessages(): PlaygroundMessage[] {
    return this.#messages.filter((m) => m.role !== 'log');
  }

  /** Log messages only. */
  get logMessages(): PlaygroundMessage[] {
    return this.#messages.filter((m) => m.role === 'log');
  }

  /** The latest message, or null. */
  get latestMessage(): PlaygroundMessage | null {
    return this.#messages.length > 0 ? this.#messages[this.#messages.length - 1] : null;
  }

  /**
   * Input fields from workflow input nodes.
   *
   * Analyzes the workflow to extract input nodes and their configuration
   * schemas for auto-generating input forms.
   */
  get inputFields(): PlaygroundInputField[] {
    const workflow = this.#currentWorkflow;
    if (!workflow) {
      return [];
    }

    const fields: PlaygroundInputField[] = [];

    // Find input nodes in the workflow
    workflow.nodes.forEach((node: WorkflowNode) => {
      const category = node.data.metadata?.category;
      const nodeTypeId = node.data.metadata?.node_type_id ?? node.type;

      // Check if this is an input-type node
      // The category can be "inputs" (standard) or variations like "input"
      const categoryStr = String(category || '');
      const isInputCategory = categoryStr === 'inputs' || categoryStr === 'input';
      if (isInputCategory || isChatInputNode(nodeTypeId)) {
        // Get output ports that provide data
        const outputs = node.data.metadata?.outputs ?? [];

        outputs.forEach((output) => {
          if (output.type === 'output') {
            // Create a field for each output
            const field: PlaygroundInputField = {
              nodeId: node.id,
              fieldId: output.id,
              label: node.data.label || output.name || nodeTypeId,
              type: output.dataType || 'string',
              defaultValue: node.data.config?.[output.id],
              required: output.required ?? false
            };

            // Check for schema in configSchema
            const configSchema = node.data.metadata?.configSchema;
            if (configSchema?.properties?.[output.id]) {
              field.schema = configSchema.properties[output.id];
            }

            fields.push(field);
          }
        });

        // If no outputs defined, create a default field based on node config
        if (outputs.length === 0) {
          const configSchema = node.data.metadata?.configSchema;
          if (configSchema?.properties) {
            Object.entries(configSchema.properties).forEach(([key, schema]) => {
              const field: PlaygroundInputField = {
                nodeId: node.id,
                fieldId: key,
                label: schema.title || key,
                type: schema.type || 'string',
                defaultValue: node.data.config?.[key] ?? schema.default,
                required: configSchema.required?.includes(key) ?? false,
                schema
              };
              fields.push(field);
            });
          }
        }
      }
    });

    return fields;
  }

  /** Whether the workflow has a chat input. */
  get hasChatInput(): boolean {
    const fields = this.inputFields;
    return fields.some((field) => isChatInputNode(field.nodeId) || field.type === 'string');
  }

  /** Session count. */
  get sessionCount(): number {
    return this.#sessions.length;
  }

  /** Execution ID explicitly pinned by the user (null = follow latest). */
  get pinnedExecutionId(): string | null {
    return this.#pinnedExecutionId;
  }

  /** Latest main-run execution ID. */
  get latestExecutionId(): string | null {
    return this.#latestExecutionId;
  }

  /** Active execution: pinned if set, otherwise latest. */
  get activeExecutionId(): string | null {
    return this.#activeExecutionId;
  }

  /**
   * Main pipeline runs for the run-switcher. Excludes sub-flow runs, which can't
   * render their own graph and so aren't user-selectable.
   */
  get selectableExecutions(): PlaygroundExecution[] {
    return this.#selectableExecutions;
  }

  /**
   * Counter that increments whenever new messages arrive and the pipeline display
   * should re-fetch — i.e. when following latest or pinned to the latest execution.
   * Pass to PipelinePanel's refreshTrigger prop.
   */
  get pipelineRefreshTrigger(): number {
    return this.#pipelineRefreshTrigger;
  }

  /** Whether log messages should be shown in the execution console. */
  get showLogs(): boolean {
    return this.#showLogs;
  }

  /** The current session ID, or null. */
  get currentSessionId(): string | null {
    return this.#currentSession?.id ?? null;
  }

  /** Whether older messages exist before the oldest one currently loaded. */
  get hasOlder(): boolean {
    return this.#hasOlder;
  }

  /**
   * The sequence number of the latest message, used to seed incremental polling.
   */
  get latestSequenceNumber(): number | null {
    for (let i = this.#messages.length - 1; i >= 0; i--) {
      if (this.#messages[i].sequenceNumber !== undefined) {
        return this.#messages[i].sequenceNumber!;
      }
    }
    return null;
  }

  /**
   * The sequence number of the oldest loaded message, used as the cursor
   * for backward "load older" pagination.
   */
  get oldestSequenceNumber(): number | null {
    for (let i = 0; i < this.#messages.length; i++) {
      if (this.#messages[i].sequenceNumber !== undefined) {
        return this.#messages[i].sequenceNumber!;
      }
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Syncs the current session's executions list from incoming messages.
   *
   * Each message's `executionId` identifies the run that produced it, and
   * `parentPipelineId` says whether that run is the main pipeline or a nested
   * sub-flow (see {@link isSubflowMessage}). A run's classification is fixed by
   * its first sighting — every message from a run reports the same parent — so we
   * only act on executionIds we haven't seen before. Sub-flows are tracked but
   * hidden from the run-switcher; a new *main* run clears the pin so the panel
   * auto-follows it, while sub-flow runs never take focus.
   *
   * Executions are appended in arrival order; new runs land at the tail, which is
   * why "latest" reads the last main run.
   */
  #syncExecutionsFromMessages(messages: PlaygroundMessage[]): void {
    if (!this.#currentSession) return;

    const executions = [...(this.#currentSession.executions ?? [])];
    const seenIds = new Set(executions.map((e) => e.id));
    let added = false;
    let gainedMainRun = false;

    for (const msg of messages) {
      if (!msg.executionId || seenIds.has(msg.executionId)) continue;
      seenIds.add(msg.executionId);
      const isSubflow = isSubflowMessage(msg);
      executions.push({
        id: msg.executionId,
        startedAt: msg.timestamp,
        status: 'running',
        isSubflow
      });
      added = true;
      if (!isSubflow) gainedMainRun = true;
    }

    if (!added) return;
    this.#currentSession = { ...this.#currentSession, executions };

    // Auto-follow the new main run by dropping any manual pin.
    if (gainedMainRun) this.#pinnedExecutionId = null;
  }

  // -----------------------------------------------------------------------
  // Mutation actions
  // -----------------------------------------------------------------------

  /** Set the current workflow. */
  setWorkflow(workflow: Workflow | null): void {
    this.#currentWorkflow = workflow;
  }

  /** Set the current session. */
  setCurrentSession(session: PlaygroundSession | null): void {
    this.#pinnedExecutionId = null;
    this.#currentSession = session;
    if (session) {
      // Update session in the list
      this.#sessions = this.#sessions.map((s) => (s.id === session.id ? session : s));
    }
  }

  /** Update session status. */
  updateSessionStatus(status: PlaygroundSessionStatus): void {
    if (this.#currentSession) {
      this.#currentSession = {
        ...this.#currentSession,
        status,
        updatedAt: new Date().toISOString()
      };
    }

    // When the session reaches a terminal state, the whole run is finished —
    // including any sub-flow executions, which may sit anywhere in the list
    // (not just the tail), so mark every still-running execution terminal.
    // 'idle' means the run finished normally (server returns 'idle' post-completion,
    // not 'completed'), so map it to 'completed' for the execution entries.
    const terminalExecutionStatus =
      status === 'failed'
        ? 'failed'
        : status === 'completed' || status === 'idle'
          ? 'completed'
          : null;
    if (terminalExecutionStatus && this.#currentSession?.executions?.length) {
      const hasRunning = this.#currentSession.executions.some((e) => e.status === 'running');
      if (hasRunning) {
        this.#currentSession = {
          ...this.#currentSession,
          executions: this.#currentSession.executions.map((e) =>
            e.status === 'running' ? { ...e, status: terminalExecutionStatus } : e
          )
        };
      }
    }

    // Also update in sessions list
    const session = this.#currentSession;
    if (session) {
      this.#sessions = this.#sessions.map((s) => (s.id === session.id ? { ...s, status } : s));
    }
  }

  /** Set the sessions list. */
  setSessions(sessionList: PlaygroundSession[]): void {
    this.#sessions = sessionList;
  }

  /** Add a new session to the list. */
  addSession(session: PlaygroundSession): void {
    this.#sessions = [session, ...this.#sessions];
  }

  /** Remove a session from the list. */
  removeSession(sessionId: string): void {
    this.#sessions = this.#sessions.filter((s) => s.id !== sessionId);

    // Clear current session if it was removed
    if (this.#currentSession?.id === sessionId) {
      this.#currentSession = null;
      this.#messages = [];
    }
  }

  /**
   * Set messages for the current session.
   * Messages are automatically sorted chronologically.
   */
  setMessages(messageList: PlaygroundMessage[]): void {
    this.#messages = sortMessagesChronologically(messageList);
  }

  /**
   * Add a message to the current session.
   * Uses binary search insertion for O(log n) instead of full sort.
   */
  addMessage(message: PlaygroundMessage): void {
    if (this.#messages.some((m) => m.id === message.id)) return;
    const seq = message.sequenceNumber ?? 0;
    let lo = 0,
      hi = this.#messages.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.#messages[mid].sequenceNumber ?? 0) <= seq) lo = mid + 1;
      else hi = mid;
    }
    this.#messages = [...this.#messages.slice(0, lo), message, ...this.#messages.slice(lo)];
  }

  /**
   * Add multiple messages to the current session.
   * Messages are deduplicated and automatically sorted chronologically.
   */
  addMessages(newMessages: PlaygroundMessage[]): void {
    if (newMessages.length === 0) return;

    // Deduplicate against existing messages AND within the incoming batch itself.
    // The latter matters when the backend returns the same page twice (e.g. broken
    // offset pagination), which would otherwise create duplicate IDs in #messages
    // and trigger Svelte's each_key_duplicate error.
    const existingIds = new Set(this.#messages.map((m) => m.id));
    const seenInBatch = new Set<string>();
    const uniqueNewMessages = newMessages.filter((m) => {
      if (existingIds.has(m.id) || seenInBatch.has(m.id)) return false;
      seenInBatch.add(m.id);
      return true;
    });
    this.#messages = sortMessagesChronologically([...this.#messages, ...uniqueNewMessages]);
    this.#syncExecutionsFromMessages(uniqueNewMessages);
  }

  /** Clear all messages. */
  clearMessages(): void {
    this.#messages = [];
    this.#lastPollSequenceNumber = null;
    this.#hasOlder = false;
  }

  /** Set the loading state. */
  setLoading(loading: boolean): void {
    this.#isLoading = loading;
  }

  /** Set an error message (or null to clear). */
  setError(errorMessage: string | null): void {
    this.#error = errorMessage;
  }

  /** Update the last poll cursor. */
  updateLastPollSequenceNumber(seq: number): void {
    this.#lastPollSequenceNumber = seq;
  }

  /** Reset all playground state. */
  reset(): void {
    this.#currentSession = null;
    this.#sessions = [];
    this.#messages = [];
    this.#isLoading = false;
    this.#error = null;
    this.#currentWorkflow = null;
    this.#lastPollSequenceNumber = null;
    this.#pipelineRefreshTrigger = 0;
  }

  /** Switch to a different session. */
  switchSession(sessionId: string): void {
    this.#pinnedExecutionId = null;
    const session = this.#sessions.find((s) => s.id === sessionId);
    if (session) {
      this.#currentSession = session;
      this.#messages = [];
      this.#lastPollSequenceNumber = null;
    }
  }

  /** Pin an execution (null = follow latest). */
  pinExecution(executionId: string | null): void {
    this.#pinnedExecutionId = executionId;
  }

  /** Set log message visibility. */
  setShowLogs(value: boolean): void {
    this.#showLogs = value;
  }

  /** Toggle log message visibility. */
  toggleShowLogs(): void {
    this.#showLogs = !this.#showLogs;
  }

  // -----------------------------------------------------------------------
  // Server response application & utilities
  // -----------------------------------------------------------------------

  /**
   * Apply a server response to the store. All message and status updates from
   * the server flow through here — polling callback, manual fetches, interrupt
   * resolution. Nothing updates messages or session status except this function.
   *
   * Pass `sessionId` (the session the response was fetched for) so a response
   * that resolves after the user switched sessions is dropped instead of writing
   * the old session's status/messages onto the new current session. Pass `null`
   * to deliberately opt out of the guard (non-session-scoped callers only) — the
   * argument is required so every new caller has to make that choice explicitly.
   */
  applyServerResponse(response: PlaygroundMessagesApiResponse, sessionId: string | null): void {
    if (sessionId !== null && this.#currentSession?.id !== sessionId) return;
    if (response.data && response.data.length > 0) {
      this.addMessages(response.data);
      // Refresh the pipeline panel when following latest or pinned to the latest
      // run. Skip when pinned to an older run — a historical view that won't change.
      if (this.#pinnedExecutionId === null || this.#pinnedExecutionId === this.#latestExecutionId) {
        this.#pipelineRefreshTrigger++;
      }
    }
    if (response.sessionStatus) {
      this.updateSessionStatus(response.sessionStatus);
    }
  }

  /** Check if a specific session is selected. */
  isSessionSelected(sessionId: string): boolean {
    return this.#currentSession?.id === sessionId;
  }

  /**
   * Set whether older messages remain to be loaded, derived from a
   * backward-pagination response.
   */
  setHasOlder(hasOlder: boolean): void {
    this.#hasOlder = hasOlder;
  }

  /**
   * Subscribe to session status changes using $effect.root.
   * This is designed for use in non-component contexts (e.g., mount.ts).
   *
   * The effect root is tracked by the store and also disposed by
   * {@link dispose} (via the owning instance's `destroy()`), so a forgotten
   * unsubscribe can't outlive the instance.
   *
   * @param callback - Called when session status changes
   * @returns Cleanup function to stop the subscription
   */
  subscribeToSessionStatus(
    callback: (status: PlaygroundSessionStatus, previousStatus: PlaygroundSessionStatus) => void
  ): () => void {
    let previousStatus = this.sessionStatus;
    const cleanup = $effect.root(() => {
      $effect(() => {
        const status = this.sessionStatus;
        if (status !== previousStatus) {
          callback(status, previousStatus);
          previousStatus = status;
        }
      });
    });
    const tracked = () => {
      this.#statusSubscriptions.delete(tracked);
      cleanup();
    };
    this.#statusSubscriptions.add(tracked);
    return tracked;
  }

  /**
   * Dispose all active session-status effect roots.
   * Called by the owning instance's destroy(); safe to call repeatedly.
   */
  dispose(): void {
    for (const cleanup of [...this.#statusSubscriptions]) {
      cleanup();
    }
  }

  /**
   * Refresh messages for the current session.
   *
   * This function is useful after interrupt resolution when polling
   * has stopped but new messages may exist on the server.
   *
   * @param fetchMessages - Async function to fetch messages from the API
   * @returns Promise that resolves when messages are refreshed
   */
  async refreshSessionMessages(
    fetchMessages: (sessionId: string) => Promise<PlaygroundMessagesApiResponse>
  ): Promise<void> {
    const session = this.#currentSession;
    if (!session) return;

    try {
      const response = await fetchMessages(session.id);
      this.applyServerResponse(response, session.id);
    } catch (err) {
      logger.error('[playgroundStore] Failed to refresh messages:', err);
    }
  }
}
