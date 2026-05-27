/**
 * Playground Store
 *
 * Svelte 5 rune-based state for managing playground state including sessions,
 * messages, and execution status.
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
// Core State
// =========================================================================

/**
 * Currently active playground session
 */
let _currentSession = $state<PlaygroundSession | null>(null);

/**
 * List of all sessions for the current workflow
 */
let _sessions = $state<PlaygroundSession[]>([]);

/**
 * Messages in the current session
 */
let _messages = $state<PlaygroundMessage[]>([]);

/**
 * Whether older messages exist before the oldest one currently loaded.
 * Drives the scroll-up "load older" affordance. Reset whenever the message
 * set is replaced (session switch / clear).
 */
let _hasOlder = $state<boolean>(false);

/**
 * Whether we are currently loading data
 */
let _isLoading = $state<boolean>(false);

/**
 * Current error message, if any
 */
let _error = $state<string | null>(null);

/**
 * Current workflow being tested
 */
let _currentWorkflow = $state<Workflow | null>(null);

/**
 * Last polling timestamp for incremental message fetching
 */
let _lastPollSequenceNumber = $state<number | null>(null);

/** Execution ID explicitly pinned by the user (null = follow latest) */
let _pinnedExecutionId = $state<string | null>(null);

/** Incremented on every message batch that should trigger a pipeline re-fetch */
let _pipelineRefreshTrigger = $state(0);

/** Whether log messages are visible in the execution console */
let _showLogs = $state<boolean>(true);

/**
 * The main pipeline runs — the single source of truth for "what's selectable".
 * Sub-flow runs are tracked for classification but excluded here: selecting one
 * can't show its own graph (the panel renders the main pipeline regardless), so
 * listing them would be dead UI. Feeds both the run-switcher and "latest".
 */
const _selectableExecutions = $derived(
  (_currentSession?.executions ?? []).filter((e) => !e.isSubflow)
);

/**
 * Latest execution ID: the most recent main run, so the sidebar keeps the main
 * pipeline in focus and never auto-follows a sub-flow. Null when no main run is
 * known yet — better an empty panel for a poll than the wrong graph.
 */
const _latestExecutionId = $derived(_selectableExecutions.at(-1)?.id ?? null);

/** Active execution: pinned if set, otherwise latest */
const _activeExecutionId = $derived(_pinnedExecutionId ?? _latestExecutionId);

// Derived from server status — never manually set.
// Exception: updateSessionStatus('running') in handleSendMessage is an
// acknowledged optimistic write, overwritten by the next server response.
const _isExecuting = $derived(_currentSession?.status === 'running');

// =========================================================================
// Getter Functions (for reactive access in components)
// =========================================================================

/**
 * Get the current session
 */
export function getCurrentSession(): PlaygroundSession | null {
  return _currentSession;
}

/**
 * Get all sessions
 */
export function getSessions(): PlaygroundSession[] {
  return _sessions;
}

/**
 * Get all messages
 */
export function getMessages(): PlaygroundMessage[] {
  return _messages;
}

/**
 * Get executing state
 */
export function getIsExecuting(): boolean {
  return _isExecuting;
}

/**
 * Get loading state
 */
export function getIsLoading(): boolean {
  return _isLoading;
}

/**
 * Get error state
 */
export function getError(): string | null {
  return _error;
}

/**
 * Get the current workflow
 */
export function getCurrentWorkflow(): Workflow | null {
  return _currentWorkflow;
}

/**
 * Get the last poll sequence number cursor
 */
export function getLastPollSequenceNumber(): number | null {
  return _lastPollSequenceNumber;
}

// =========================================================================
// Derived Getters
// =========================================================================

/**
 * Get current session status
 */
export function getSessionStatus(): PlaygroundSessionStatus {
  return _currentSession?.status ?? 'idle';
}

/**
 * Whether the user can currently send a message.
 * False when executing, when awaiting input, or when no session exists.
 */
export function getCanSendMessage(): boolean {
  const status = _currentSession?.status ?? 'idle';
  return _currentSession !== null && !_isExecuting && status !== 'awaiting_input';
}

/**
 * Get message count
 */
export function getMessageCount(): number {
  return _messages.length;
}

/**
 * Get chat messages (excludes log messages)
 */
export function getChatMessages(): PlaygroundMessage[] {
  return _messages.filter((m) => m.role !== 'log');
}

/**
 * Get log messages only
 */
export function getLogMessages(): PlaygroundMessage[] {
  return _messages.filter((m) => m.role === 'log');
}

/**
 * Get the latest message
 */
export function getLatestMessage(): PlaygroundMessage | null {
  return _messages.length > 0 ? _messages[_messages.length - 1] : null;
}

/**
 * Get input fields from workflow input nodes
 *
 * Analyzes the workflow to extract input nodes and their configuration
 * schemas for auto-generating input forms.
 */
export function getInputFields(): PlaygroundInputField[] {
  const workflow = _currentWorkflow;
  if (!workflow) {
    return [];
  }

  const fields: PlaygroundInputField[] = [];

  // Find input nodes in the workflow
  workflow.nodes.forEach((node: WorkflowNode) => {
    const category = node.data.metadata?.category;
    const nodeTypeId = node.data.metadata?.id ?? node.type;

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

/**
 * Check if workflow has a chat input
 */
export function getHasChatInput(): boolean {
  const fields = getInputFields();
  return fields.some((field) => isChatInputNode(field.nodeId) || field.type === 'string');
}

/**
 * Get session count
 */
export function getSessionCount(): number {
  return _sessions.length;
}

export function getPinnedExecutionId(): string | null {
  return _pinnedExecutionId;
}

export function getLatestExecutionId(): string | null {
  return _latestExecutionId;
}

export function getActiveExecutionId(): string | null {
  return _activeExecutionId;
}

/**
 * Main pipeline runs for the run-switcher. Excludes sub-flow runs, which can't
 * render their own graph and so aren't user-selectable.
 */
export function getSelectableExecutions(): PlaygroundExecution[] {
  return _selectableExecutions;
}

/**
 * Counter that increments whenever new messages arrive and the pipeline display
 * should re-fetch — i.e. when following latest or pinned to the latest execution.
 * Pass to PipelinePanel's refreshTrigger prop.
 */
export function getPipelineRefreshTrigger(): number {
  return _pipelineRefreshTrigger;
}

/**
 * Whether log messages should be shown in the execution console
 */
export function getShowLogs(): boolean {
  return _showLogs;
}

// =========================================================================
// Helper Functions
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
function syncExecutionsFromMessages(messages: PlaygroundMessage[]): void {
  if (!_currentSession) return;

  const executions = [...(_currentSession.executions ?? [])];
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
  _currentSession = { ..._currentSession, executions };

  // Auto-follow the new main run by dropping any manual pin.
  if (gainedMainRun) _pinnedExecutionId = null;
}

// =========================================================================
// Actions
// =========================================================================

/**
 * Playground store actions for modifying state
 */
export const playgroundActions = {
  /**
   * Set the current workflow
   *
   * @param workflow - The workflow to test
   */
  setWorkflow: (workflow: Workflow | null): void => {
    _currentWorkflow = workflow;
  },

  /**
   * Set the current session
   *
   * @param session - The session to set as active
   */
  setCurrentSession: (session: PlaygroundSession | null): void => {
    _pinnedExecutionId = null;
    _currentSession = session;
    if (session) {
      // Update session in the list
      _sessions = _sessions.map((s) => (s.id === session.id ? session : s));
    }
  },

  /**
   * Update session status
   *
   * @param status - The new status
   */
  updateSessionStatus: (status: PlaygroundSessionStatus): void => {
    if (_currentSession) {
      _currentSession = {
        ..._currentSession,
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
    if (terminalExecutionStatus && _currentSession?.executions?.length) {
      const hasRunning = _currentSession.executions.some((e) => e.status === 'running');
      if (hasRunning) {
        _currentSession = {
          ..._currentSession,
          executions: _currentSession.executions.map((e) =>
            e.status === 'running' ? { ...e, status: terminalExecutionStatus } : e
          )
        };
      }
    }

    // Also update in sessions list
    const session = _currentSession;
    if (session) {
      _sessions = _sessions.map((s) => (s.id === session.id ? { ...s, status } : s));
    }
  },

  /**
   * Set the sessions list
   *
   * @param sessionList - Array of sessions
   */
  setSessions: (sessionList: PlaygroundSession[]): void => {
    _sessions = sessionList;
  },

  /**
   * Add a new session to the list
   *
   * @param session - The session to add
   */
  addSession: (session: PlaygroundSession): void => {
    _sessions = [session, ..._sessions];
  },

  /**
   * Remove a session from the list
   *
   * @param sessionId - The session ID to remove
   */
  removeSession: (sessionId: string): void => {
    _sessions = _sessions.filter((s) => s.id !== sessionId);

    // Clear current session if it was removed
    if (_currentSession?.id === sessionId) {
      _currentSession = null;
      _messages = [];
    }
  },

  /**
   * Set messages for the current session
   * Messages are automatically sorted chronologically
   *
   * @param messageList - Array of messages
   */
  setMessages: (messageList: PlaygroundMessage[]): void => {
    _messages = sortMessagesChronologically(messageList);
  },

  /**
   * Add a message to the current session
   * Uses binary search insertion for O(log n) instead of full sort.
   *
   * @param message - The message to add
   */
  addMessage: (message: PlaygroundMessage): void => {
    if (_messages.some((m) => m.id === message.id)) return;
    const seq = message.sequenceNumber ?? 0;
    let lo = 0,
      hi = _messages.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((_messages[mid].sequenceNumber ?? 0) <= seq) lo = mid + 1;
      else hi = mid;
    }
    _messages = [..._messages.slice(0, lo), message, ..._messages.slice(lo)];
  },

  /**
   * Add multiple messages to the current session
   * Messages are deduplicated and automatically sorted chronologically
   *
   * @param newMessages - Array of messages to add
   */
  addMessages: (newMessages: PlaygroundMessage[]): void => {
    if (newMessages.length === 0) return;

    // Deduplicate against existing messages AND within the incoming batch itself.
    // The latter matters when the backend returns the same page twice (e.g. broken
    // offset pagination), which would otherwise create duplicate IDs in _messages
    // and trigger Svelte's each_key_duplicate error.
    const existingIds = new Set(_messages.map((m) => m.id));
    const seenInBatch = new Set<string>();
    const uniqueNewMessages = newMessages.filter((m) => {
      if (existingIds.has(m.id) || seenInBatch.has(m.id)) return false;
      seenInBatch.add(m.id);
      return true;
    });
    _messages = sortMessagesChronologically([..._messages, ...uniqueNewMessages]);
    syncExecutionsFromMessages(uniqueNewMessages);
  },

  /**
   * Clear all messages
   */
  clearMessages: (): void => {
    _messages = [];
    _lastPollSequenceNumber = null;
    _hasOlder = false;
  },

  /**
   * Set the loading state
   *
   * @param loading - Whether loading is in progress
   */
  setLoading: (loading: boolean): void => {
    _isLoading = loading;
  },

  /**
   * Set an error message
   *
   * @param errorMessage - The error message or null to clear
   */
  setError: (errorMessage: string | null): void => {
    _error = errorMessage;
  },

  /**
   * Update the last poll timestamp
   *
   * @param timestamp - ISO 8601 timestamp
   */
  updateLastPollSequenceNumber: (seq: number): void => {
    _lastPollSequenceNumber = seq;
  },

  /**
   * Reset all playground state
   */
  reset: (): void => {
    _currentSession = null;
    _sessions = [];
    _messages = [];
    _isLoading = false;
    _error = null;
    _currentWorkflow = null;
    _lastPollSequenceNumber = null;
    _pipelineRefreshTrigger = 0;
  },

  /**
   * Switch to a different session
   *
   * @param sessionId - The session ID to switch to
   */
  switchSession: (sessionId: string): void => {
    _pinnedExecutionId = null;
    const session = _sessions.find((s) => s.id === sessionId);
    if (session) {
      _currentSession = session;
      _messages = [];
      _lastPollSequenceNumber = null;
    }
  },

  pinExecution(executionId: string | null): void {
    _pinnedExecutionId = executionId;
  },

  setShowLogs(value: boolean): void {
    _showLogs = value;
  },

  toggleShowLogs(): void {
    _showLogs = !_showLogs;
  }
};

// =========================================================================
// Server Response Application
// =========================================================================

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
export function applyServerResponse(
  response: PlaygroundMessagesApiResponse,
  sessionId: string | null
): void {
  if (sessionId !== null && _currentSession?.id !== sessionId) return;
  if (response.data && response.data.length > 0) {
    playgroundActions.addMessages(response.data);
    // Refresh the pipeline panel when following latest or pinned to the latest
    // run. Skip when pinned to an older run — a historical view that won't change.
    if (_pinnedExecutionId === null || _pinnedExecutionId === _latestExecutionId) {
      _pipelineRefreshTrigger++;
    }
  }
  if (response.sessionStatus) {
    playgroundActions.updateSessionStatus(response.sessionStatus);
  }
}

// =========================================================================
// Utilities
// =========================================================================

/**
 * Get the current session ID
 *
 * @returns The current session ID or null
 */
export function getCurrentSessionId(): string | null {
  return _currentSession?.id ?? null;
}

/**
 * Check if a specific session is selected
 *
 * @param sessionId - The session ID to check
 * @returns True if the session is currently selected
 */
export function isSessionSelected(sessionId: string): boolean {
  return _currentSession?.id === sessionId;
}

/**
 * Get all messages as a snapshot
 *
 * @returns Array of all messages
 */
export function getMessagesSnapshot(): PlaygroundMessage[] {
  return _messages;
}

/**
 * Get the sequence number of the latest message, used to seed incremental polling.
 *
 * @returns Sequence number of the last message, or null
 */
export function getLatestSequenceNumber(): number | null {
  for (let i = _messages.length - 1; i >= 0; i--) {
    if (_messages[i].sequenceNumber !== undefined) {
      return _messages[i].sequenceNumber!;
    }
  }
  return null;
}

/**
 * Get the sequence number of the oldest loaded message, used as the cursor
 * for backward "load older" pagination.
 *
 * @returns Sequence number of the first message, or null
 */
export function getOldestSequenceNumber(): number | null {
  for (let i = 0; i < _messages.length; i++) {
    if (_messages[i].sequenceNumber !== undefined) {
      return _messages[i].sequenceNumber!;
    }
  }
  return null;
}

/**
 * Whether older messages exist before the oldest one currently loaded.
 */
export function getHasOlder(): boolean {
  return _hasOlder;
}

/**
 * Set whether older messages remain to be loaded, derived from a
 * backward-pagination response.
 */
export function setHasOlder(hasOlder: boolean): void {
  _hasOlder = hasOlder;
}

/**
 * Subscribe to session status changes using $effect.root.
 * This is designed for use in non-component contexts (e.g., mount.ts).
 *
 * @param callback - Called when session status changes
 * @returns Cleanup function to stop the subscription
 */
export function subscribeToSessionStatus(
  callback: (status: PlaygroundSessionStatus, previousStatus: PlaygroundSessionStatus) => void
): () => void {
  let previousStatus = getSessionStatus();
  const cleanup = $effect.root(() => {
    $effect(() => {
      const status = getSessionStatus();
      if (status !== previousStatus) {
        callback(status, previousStatus);
        previousStatus = status;
      }
    });
  });
  return cleanup;
}

/**
 * Refresh messages for the current session
 *
 * This function is useful after interrupt resolution when polling
 * has stopped but new messages may exist on the server.
 *
 * @param fetchMessages - Async function to fetch messages from the API
 * @returns Promise that resolves when messages are refreshed
 */
export async function refreshSessionMessages(
  fetchMessages: (sessionId: string) => Promise<PlaygroundMessagesApiResponse>
): Promise<void> {
  const session = _currentSession;
  if (!session) return;

  try {
    const response = await fetchMessages(session.id);
    applyServerResponse(response, session.id);
  } catch (err) {
    logger.error('[playgroundStore] Failed to refresh messages:', err);
  }
}
