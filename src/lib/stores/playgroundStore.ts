/**
 * Playground Store
 *
 * Svelte stores for managing playground state including sessions,
 * messages, and execution status.
 *
 * @module stores/playgroundStore
 */

import { writable, derived, get } from 'svelte/store';
import type {
	PlaygroundSession,
	PlaygroundMessage,
	PlaygroundInputField,
	PlaygroundSessionStatus
} from '../types/playground.js';
import { isChatInputNode } from '../types/playground.js';
import type { Workflow, WorkflowNode } from '../types/index.js';

// =========================================================================
// Core Stores
// =========================================================================

/**
 * Currently active playground session
 */
export const currentSession = writable<PlaygroundSession | null>(null);

/**
 * List of all sessions for the current workflow
 */
export const sessions = writable<PlaygroundSession[]>([]);

/**
 * Messages in the current session
 */
export const messages = writable<PlaygroundMessage[]>([]);

/**
 * Whether an execution is currently running
 */
export const isExecuting = writable<boolean>(false);

/**
 * Whether we are currently loading data
 */
export const isLoading = writable<boolean>(false);

/**
 * Current error message, if any
 */
export const error = writable<string | null>(null);

/**
 * Current workflow being tested
 */
export const currentWorkflow = writable<Workflow | null>(null);

/**
 * Last polling timestamp for incremental message fetching
 */
export const lastPollTimestamp = writable<string | null>(null);

// =========================================================================
// Derived Stores
// =========================================================================

/**
 * Derived store for current session status
 */
export const sessionStatus = derived(
	currentSession,
	($session): PlaygroundSessionStatus => $session?.status ?? 'idle'
);

/**
 * Derived store for message count
 */
export const messageCount = derived(messages, ($messages) => $messages.length);

/**
 * Derived store for chat messages (excludes log messages)
 */
export const chatMessages = derived(messages, ($messages) =>
	$messages.filter((m) => m.role !== 'log')
);

/**
 * Derived store for log messages only
 */
export const logMessages = derived(messages, ($messages) =>
	$messages.filter((m) => m.role === 'log')
);

/**
 * Derived store for the latest message
 */
export const latestMessage = derived(messages, ($messages) =>
	$messages.length > 0 ? $messages[$messages.length - 1] : null
);

/**
 * Derived store for input fields from workflow input nodes
 *
 * Analyzes the workflow to extract input nodes and their configuration
 * schemas for auto-generating input forms.
 */
export const inputFields = derived(currentWorkflow, ($workflow): PlaygroundInputField[] => {
	if (!$workflow) {
		return [];
	}

	const fields: PlaygroundInputField[] = [];

	// Find input nodes in the workflow
	$workflow.nodes.forEach((node: WorkflowNode) => {
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
});

/**
 * Derived store for detecting if workflow has a chat input
 */
export const hasChatInput = derived(inputFields, ($fields) =>
	$fields.some((field) => isChatInputNode(field.nodeId) || field.type === 'string')
);

/**
 * Derived store for session count
 */
export const sessionCount = derived(sessions, ($sessions) => $sessions.length);

// =========================================================================
// Helper Functions
// =========================================================================

/**
 * Sort messages chronologically using sequenceNumber and parentMessageId
 *
 * Sorting strategy:
 * 1. User messages have sequenceNumber > 0 (1, 2, 3, ...)
 * 2. Assistant/system responses have sequenceNumber = 0 and reference parentMessageId
 * 3. Responses should appear after their parent message
 *
 * Sort order:
 * 1. Primary: Parent group (user messages and their responses together)
 * 2. Secondary: User message first (sequenceNumber > 0), then responses (sequenceNumber = 0)
 * 3. Tertiary: timestamp for responses within the same parent group
 * 4. Quaternary: id as final tiebreaker
 *
 * @param messageList - Array of messages to sort
 * @returns Sorted array of messages
 */
function sortMessagesChronologically(messageList: PlaygroundMessage[]): PlaygroundMessage[] {
	// Build a map of message ID to sequenceNumber for parent lookups
	const messageMap = new Map<string, PlaygroundMessage>();
	messageList.forEach((msg) => messageMap.set(msg.id, msg));

	/**
	 * Get the effective sequence number for sorting
	 * - For user messages (sequenceNumber > 0): use their sequenceNumber
	 * - For responses (sequenceNumber = 0 or undefined): use parent's sequenceNumber
	 */
	function getEffectiveSequence(msg: PlaygroundMessage): number {
		// If message has its own sequenceNumber > 0, use it
		if (msg.sequenceNumber !== undefined && msg.sequenceNumber > 0) {
			return msg.sequenceNumber;
		}
		// For responses, look up parent's sequenceNumber
		if (msg.parentMessageId) {
			const parent = messageMap.get(msg.parentMessageId);
			if (parent?.sequenceNumber !== undefined && parent.sequenceNumber > 0) {
				return parent.sequenceNumber;
			}
		}
		// Fallback: use 0 (will be sorted by timestamp)
		return 0;
	}

	return [...messageList].sort((a, b) => {
		const seqA = getEffectiveSequence(a);
		const seqB = getEffectiveSequence(b);

		// Primary: Sort by effective sequence number (conversation turn)
		if (seqA !== seqB) {
			return seqA - seqB;
		}

		// Secondary: Within same conversation turn, user message (seq > 0) comes first
		const isUserA = (a.sequenceNumber ?? 0) > 0;
		const isUserB = (b.sequenceNumber ?? 0) > 0;
		if (isUserA !== isUserB) {
			return isUserA ? -1 : 1;
		}

		// Tertiary: Sort by timestamp
		const timestampCompare = a.timestamp.localeCompare(b.timestamp);
		if (timestampCompare !== 0) {
			return timestampCompare;
		}

		// Quaternary: Sort by ID as final tiebreaker
		return a.id.localeCompare(b.id);
	});
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
		currentWorkflow.set(workflow);
	},

	/**
	 * Set the current session
	 *
	 * @param session - The session to set as active
	 */
	setCurrentSession: (session: PlaygroundSession | null): void => {
		currentSession.set(session);
		if (session) {
			// Update session in the list
			sessions.update(($sessions) => $sessions.map((s) => (s.id === session.id ? session : s)));
		}
	},

	/**
	 * Update session status
	 *
	 * @param status - The new status
	 */
	updateSessionStatus: (status: PlaygroundSessionStatus): void => {
		currentSession.update(($session) => {
			if (!$session) return null;
			return { ...$session, status, updatedAt: new Date().toISOString() };
		});

		// Also update in sessions list
		const session = get(currentSession);
		if (session) {
			sessions.update(($sessions) =>
				$sessions.map((s) => (s.id === session.id ? { ...s, status } : s))
			);
		}
	},

	/**
	 * Set the sessions list
	 *
	 * @param sessionList - Array of sessions
	 */
	setSessions: (sessionList: PlaygroundSession[]): void => {
		sessions.set(sessionList);
	},

	/**
	 * Add a new session to the list
	 *
	 * @param session - The session to add
	 */
	addSession: (session: PlaygroundSession): void => {
		sessions.update(($sessions) => [session, ...$sessions]);
	},

	/**
	 * Remove a session from the list
	 *
	 * @param sessionId - The session ID to remove
	 */
	removeSession: (sessionId: string): void => {
		sessions.update(($sessions) => $sessions.filter((s) => s.id !== sessionId));

		// Clear current session if it was removed
		const current = get(currentSession);
		if (current?.id === sessionId) {
			currentSession.set(null);
			messages.set([]);
		}
	},

	/**
	 * Set messages for the current session
	 * Messages are automatically sorted chronologically
	 *
	 * @param messageList - Array of messages
	 */
	setMessages: (messageList: PlaygroundMessage[]): void => {
		messages.set(sortMessagesChronologically(messageList));
	},

	/**
	 * Add a message to the current session
	 * Messages are automatically sorted chronologically after adding
	 *
	 * @param message - The message to add
	 */
	addMessage: (message: PlaygroundMessage): void => {
		messages.update(($messages) => sortMessagesChronologically([...$messages, message]));
	},

	/**
	 * Add multiple messages to the current session
	 * Messages are deduplicated and automatically sorted chronologically
	 *
	 * @param newMessages - Array of messages to add
	 */
	addMessages: (newMessages: PlaygroundMessage[]): void => {
		if (newMessages.length === 0) return;

		messages.update(($messages) => {
			// Deduplicate by message ID
			const existingIds = new Set($messages.map((m) => m.id));
			const uniqueNewMessages = newMessages.filter((m) => !existingIds.has(m.id));
			// Sort the combined messages chronologically
			return sortMessagesChronologically([...$messages, ...uniqueNewMessages]);
		});
	},

	/**
	 * Clear all messages
	 */
	clearMessages: (): void => {
		messages.set([]);
		lastPollTimestamp.set(null);
	},

	/**
	 * Set the executing state
	 *
	 * @param executing - Whether execution is in progress
	 */
	setExecuting: (executing: boolean): void => {
		isExecuting.set(executing);
	},

	/**
	 * Set the loading state
	 *
	 * @param loading - Whether loading is in progress
	 */
	setLoading: (loading: boolean): void => {
		isLoading.set(loading);
	},

	/**
	 * Set an error message
	 *
	 * @param errorMessage - The error message or null to clear
	 */
	setError: (errorMessage: string | null): void => {
		error.set(errorMessage);
	},

	/**
	 * Update the last poll timestamp
	 *
	 * @param timestamp - ISO 8601 timestamp
	 */
	updateLastPollTimestamp: (timestamp: string): void => {
		lastPollTimestamp.set(timestamp);
	},

	/**
	 * Reset all playground state
	 */
	reset: (): void => {
		currentSession.set(null);
		sessions.set([]);
		messages.set([]);
		isExecuting.set(false);
		isLoading.set(false);
		error.set(null);
		currentWorkflow.set(null);
		lastPollTimestamp.set(null);
	},

	/**
	 * Switch to a different session
	 *
	 * @param sessionId - The session ID to switch to
	 */
	switchSession: (sessionId: string): void => {
		const sessionList = get(sessions);
		const session = sessionList.find((s) => s.id === sessionId);
		if (session) {
			currentSession.set(session);
			messages.set([]);
			lastPollTimestamp.set(null);
		}
	}
};

// =========================================================================
// Utilities
// =========================================================================

/**
 * Get the current session ID
 *
 * @returns The current session ID or null
 */
export function getCurrentSessionId(): string | null {
	return get(currentSession)?.id ?? null;
}

/**
 * Check if a specific session is selected
 *
 * @param sessionId - The session ID to check
 * @returns True if the session is currently selected
 */
export function isSessionSelected(sessionId: string): boolean {
	return get(currentSession)?.id === sessionId;
}

/**
 * Get all messages as a snapshot
 *
 * @returns Array of all messages
 */
export function getMessagesSnapshot(): PlaygroundMessage[] {
	return get(messages);
}

/**
 * Get the latest message timestamp for polling
 *
 * @returns ISO 8601 timestamp of the latest message, or null
 */
export function getLatestMessageTimestamp(): string | null {
	const msgs = get(messages);
	if (msgs.length === 0) return null;
	return msgs[msgs.length - 1].timestamp;
}
