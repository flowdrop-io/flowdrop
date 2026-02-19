/**
 * Playground Types
 *
 * TypeScript types for the Playground feature, enabling interactive
 * workflow testing with chat interface and session management.
 *
 * @module types/playground
 */

import type { ConfigProperty } from './index.js';

/**
 * Status of a playground session
 */
export type PlaygroundSessionStatus = 'idle' | 'running' | 'completed' | 'failed';

/**
 * Role of a message sender in the playground
 *
 * - `user`: Message from the user
 * - `assistant`: Response from the workflow/AI
 * - `system`: System notifications
 * - `log`: Execution log entries
 */
export type PlaygroundMessageRole = 'user' | 'assistant' | 'system' | 'log';

/**
 * Log level for log-type messages
 */
export type PlaygroundMessageLevel = 'info' | 'warning' | 'error' | 'debug';

/**
 * Status of a playground message
 */
export type PlaygroundMessageStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Playground session representing a test conversation
 *
 * Sessions maintain conversation history and allow interactive testing
 * of workflows in an isolated environment.
 *
 * @example
 * ```typescript
 * const session: PlaygroundSession = {
 *   id: "sess-123",
 *   workflowId: "wf-456",
 *   name: "Test Session 1",
 *   status: "idle",
 *   createdAt: "2024-01-20T10:00:00Z",
 *   updatedAt: "2024-01-20T10:30:00Z"
 * };
 * ```
 */
export interface PlaygroundSession {
	/** Session unique identifier */
	id: string;
	/** Associated workflow ID */
	workflowId: string;
	/** Session display name */
	name: string;
	/** Current session status */
	status: PlaygroundSessionStatus;
	/** Session creation timestamp (ISO 8601) */
	createdAt: string;
	/** Last activity timestamp (ISO 8601) */
	updatedAt: string;
	/** Custom session metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Message metadata containing additional context
 */
export interface PlaygroundMessageMetadata {
	/** Log level for log-type messages */
	level?: PlaygroundMessageLevel;
	/** Execution duration in milliseconds */
	duration?: number;
	/** Human-readable node label */
	nodeLabel?: string;
	/** Node output data */
	outputs?: Record<string, unknown>;
	/** User's display name for user-role messages (from backend) */
	userName?: string;
	/** Allow additional properties */
	[key: string]: unknown;
}

/**
 * Message in a playground session
 *
 * Messages can be user inputs, assistant responses, system notifications,
 * or execution logs. Each message is timestamped and can be associated
 * with a specific workflow node.
 *
 * @example
 * ```typescript
 * const message: PlaygroundMessage = {
 *   id: "msg-123",
 *   sessionId: "sess-456",
 *   role: "assistant",
 *   content: "I've analyzed your data and found 3 patterns.",
 *   timestamp: "2024-01-20T10:30:00Z",
 *   nodeId: "node-ai-analyzer",
 *   metadata: { duration: 2500, nodeLabel: "AI Analyzer" }
 * };
 * ```
 */
export interface PlaygroundMessage {
	/** Message unique identifier */
	id: string;
	/** Parent session ID */
	sessionId: string;
	/** Role of the message sender */
	role: PlaygroundMessageRole;
	/** Message content */
	content: string;
	/** Message timestamp (ISO 8601) */
	timestamp: string;
	/** Message status */
	status?: PlaygroundMessageStatus;
	/**
	 * Sequence number for ordering messages
	 * - User messages: incrementing numbers (1, 2, 3, ...)
	 * - Assistant/system responses: 0 (sorted after parent via parentMessageId)
	 */
	sequenceNumber?: number;
	/** Parent message ID (for assistant responses linked to user messages) */
	parentMessageId?: string;
	/** Associated node ID (for log/assistant messages) */
	nodeId?: string | null;
	/** Additional message metadata */
	metadata?: PlaygroundMessageMetadata;
}

/**
 * Input field derived from workflow input nodes
 *
 * Used to auto-generate input forms in the playground based on
 * the workflow's input nodes' configSchema.
 *
 * @example
 * ```typescript
 * const inputField: PlaygroundInputField = {
 *   nodeId: "node-text-input",
 *   fieldId: "user_message",
 *   label: "User Message",
 *   type: "string",
 *   defaultValue: "Hello!",
 *   required: true,
 *   schema: { type: "string", format: "multiline" }
 * };
 * ```
 */
export interface PlaygroundInputField {
	/** Source node ID */
	nodeId: string;
	/** Field identifier */
	fieldId: string;
	/** Display label */
	label: string;
	/** Field data type */
	type: string;
	/** Default value from node config */
	defaultValue?: unknown;
	/** Whether the field is required */
	required: boolean;
	/** JSON Schema for the field */
	schema?: ConfigProperty;
}

/**
 * Request payload for sending a message to the playground
 */
export interface PlaygroundMessageRequest {
	/** Message content (typically user input) */
	content: string;
	/** Additional input values for workflow nodes */
	inputs?: Record<string, unknown>;
}

/**
 * Response from the messages endpoint with polling support
 */
export interface PlaygroundMessagesResult {
	/** Array of messages */
	messages: PlaygroundMessage[];
	/** Whether there are more messages to fetch */
	hasMore: boolean;
	/** Current session status (useful for polling) */
	sessionStatus: PlaygroundSessionStatus;
}

/**
 * Configuration for the Playground component
 */
export interface PlaygroundConfig {
	/** Polling interval in milliseconds (default: 1500) */
	pollingInterval?: number;
	/** Maximum number of messages to display (default: 500) */
	maxMessages?: number;
	/** Auto-scroll to bottom on new messages (default: true) */
	autoScroll?: boolean;
	/** Show timestamps on messages (default: true) */
	showTimestamps?: boolean;
	/** Show log messages inline or in collapsible section (default: "collapsible") */
	logDisplayMode?: 'inline' | 'collapsible';
	/** Enable markdown rendering in messages (default: true) */
	enableMarkdown?: boolean;
	/**
	 * Whether to show the chat text input (default: true)
	 * When false, only the "Run" button is displayed for workflow execution.
	 */
	showChatInput?: boolean;
	/**
	 * Whether to show the "Run" button (default: true)
	 * When false, the Run button is hidden. If both showChatInput and showRunButton
	 * are false, a helpful message is displayed to the user.
	 */
	showRunButton?: boolean;
	/**
	 * Predefined message to send when "Run" button is clicked (default: "Run workflow")
	 * Used when showChatInput is false to provide a default message for workflow execution.
	 */
	predefinedMessage?: string;
	/**
	 * Automatically run the workflow once when the playground loads (default: false)
	 * When true, the workflow will execute immediately using the predefinedMessage.
	 * This is useful for scenarios where the workflow should start without user interaction.
	 * Note: Only runs once per session - subsequent runs require clicking the Run button.
	 */
	autoRun?: boolean;
	/**
	 * Whether to show the sidebar with session list (default: true)
	 * When false, the sidebar is hidden, creating a minimal chat widget experience.
	 * Use with initialSessionId to load a pre-created session directly.
	 */
	showSidebar?: boolean;
	/**
	 * Whether to show the session header bar (default: true)
	 * When false, the header with session name and close button is hidden.
	 * Typically used together with showSidebar: false for minimal UI.
	 */
	showSessionHeader?: boolean;
}

/**
 * Metadata field to control Run button state from backend.
 * When a message contains this field set to true, the Run button becomes enabled.
 *
 * @example
 * ```typescript
 * // Backend sends a message with this metadata to re-enable Run button:
 * const message: PlaygroundMessage = {
 *   id: "msg-123",
 *   sessionId: "sess-456",
 *   role: "system",
 *   content: "Workflow completed. Ready for next run.",
 *   timestamp: new Date().toISOString(),
 *   metadata: {
 *     enableRun: true
 *   }
 * };
 * ```
 */
export const ENABLE_RUN_METADATA_KEY = 'enableRun';

/**
 * Check if a message metadata contains the enableRun flag
 *
 * @param metadata - The message metadata to check
 * @returns True if the metadata signals to enable the Run button
 */
export function hasEnableRunFlag(metadata: PlaygroundMessageMetadata | undefined): boolean {
	return metadata?.[ENABLE_RUN_METADATA_KEY] === true;
}

/**
 * Display mode for the Playground component
 */
export type PlaygroundMode = 'embedded' | 'standalone' | 'modal';

/**
 * Chat input detection patterns for identifying chat nodes in workflows
 */
export const CHAT_INPUT_PATTERNS = [
	'chat_input',
	'text_input',
	'user_input',
	'message_input',
	'prompt_input'
] as const;

/**
 * Check if a node type is a chat input node
 *
 * @param nodeTypeId - The node type identifier
 * @returns True if the node is a chat input type
 */
export function isChatInputNode(nodeTypeId: string): boolean {
	const normalizedId = nodeTypeId.toLowerCase();
	return CHAT_INPUT_PATTERNS.some((pattern) => normalizedId.includes(pattern));
}

/**
 * API response wrapper for playground endpoints
 */
export interface PlaygroundApiResponse<T> {
	/** Whether the request was successful */
	success: boolean;
	/** Response data */
	data?: T;
	/** Error message if unsuccessful */
	error?: string;
	/** Human-readable message */
	message?: string;
}

/**
 * Type alias for session list response
 */
export type PlaygroundSessionsResponse = PlaygroundApiResponse<PlaygroundSession[]>;

/**
 * Type alias for single session response
 */
export type PlaygroundSessionResponse = PlaygroundApiResponse<PlaygroundSession>;

/**
 * Type alias for message response
 */
export type PlaygroundMessageResponse = PlaygroundApiResponse<PlaygroundMessage>;

/**
 * Type alias for messages list response with polling metadata
 */
export interface PlaygroundMessagesApiResponse extends PlaygroundApiResponse<PlaygroundMessage[]> {
	/** Whether there are more messages to fetch */
	hasMore?: boolean;
	/** Current session status */
	sessionStatus?: PlaygroundSessionStatus;
}
