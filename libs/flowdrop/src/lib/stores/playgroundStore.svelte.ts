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

/** Latest execution ID derived from current session's executions list */
const _latestExecutionId = $derived(
  _currentSession?.executions?.at(-1)?.id ?? null
);

/** Active execution: pinned if set, otherwise latest */
const _activeExecutionId = $derived(
  _pinnedExecutionId ?? _latestExecutionId
);

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
 * Syncs the current session's executions list from incoming messages.
 * When a message has a new executionId not yet tracked, adds it as a new execution entry.
 */
function syncExecutionsFromMessages(messages: PlaygroundMessage[]): void {
  if (!_currentSession) return;

  const existingIds = new Set((_currentSession.executions ?? []).map((e) => e.id));
  const newExecutions: PlaygroundExecution[] = [];

  for (const msg of messages) {
    if (msg.executionId && !existingIds.has(msg.executionId)) {
      existingIds.add(msg.executionId);
      newExecutions.push({
        id: msg.executionId,
        startedAt: msg.timestamp,
        status: 'running'
      });
    }
  }

  if (newExecutions.length > 0) {
    _currentSession = {
      ..._currentSession,
      executions: [...(_currentSession.executions ?? []), ...newExecutions]
    };
  }
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

    // Update the latest execution status when the session reaches a terminal state.
    // Only the last execution can be running at any time (sessions are single-pipeline),
    // so we only need to check and update the tail entry.
    if ((status === 'completed' || status === 'failed') && _currentSession?.executions?.length) {
      const execs = [..._currentSession.executions];
      const last = execs[execs.length - 1];
      if (last.status === 'running') {
        execs[execs.length - 1] = { ...last, status };
        _currentSession = { ..._currentSession, executions: execs };
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

    // Deduplicate by message ID
    const existingIds = new Set(_messages.map((m) => m.id));
    const uniqueNewMessages = newMessages.filter((m) => !existingIds.has(m.id));
    // Sort the combined messages chronologically
    _messages = sortMessagesChronologically([..._messages, ...uniqueNewMessages]);
    syncExecutionsFromMessages(newMessages);
  },

  /**
   * Clear all messages
   */
  clearMessages: (): void => {
    _messages = [];
    _lastPollSequenceNumber = null;
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
  }
};

// =========================================================================
// Server Response Application
// =========================================================================

/**
 * Apply a server response to the store. All message and status updates from
 * the server flow through here — polling callback, manual fetches, interrupt
 * resolution. Nothing updates messages or session status except this function.
 */
export function applyServerResponse(response: PlaygroundMessagesApiResponse): void {
  if (response.data && response.data.length > 0) {
    playgroundActions.addMessages(response.data);
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
    applyServerResponse(response);
  } catch (err) {
    logger.error('[playgroundStore] Failed to refresh messages:', err);
  }
}
