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
export type PlaygroundSessionStatus =
  | 'idle'
  | 'running'
  | 'awaiting_input'
  | 'completed'
  | 'failed';

/**
 * Statuses that stop polling by default.
 * Only truly-dormant sessions stop polling — completed/failed/awaiting_input
 * sessions on async servers can still generate messages after the status change,
 * so polling continues until the session is explicitly idle.
 */
export const DEFAULT_STOP_POLLING_STATUSES: PlaygroundSessionStatus[] = ['idle'];

/**
 * Statuses that are considered terminal by default (clears isExecuting)
 */
export const DEFAULT_TERMINAL_STATUSES: PlaygroundSessionStatus[] = [
  'idle',
  'completed',
  'failed',
  'awaiting_input'
];

/**
 * Default implementation for determining if polling should stop.
 * Consumers can override this via PlaygroundConfig.shouldStopPolling.
 *
 * @param status - The current session status
 * @returns True if polling should stop
 */
export function defaultShouldStopPolling(status: PlaygroundSessionStatus): boolean {
  return (DEFAULT_STOP_POLLING_STATUSES as string[]).includes(status);
}

/**
 * Default implementation for determining if a status is terminal (clears isExecuting).
 * Consumers can override this via PlaygroundConfig.isTerminalStatus.
 *
 * @param status - The current session status
 * @returns True if the status is terminal
 */
export function defaultIsTerminalStatus(status: PlaygroundSessionStatus): boolean {
  return (DEFAULT_TERMINAL_STATUSES as string[]).includes(status);
}

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
 * A single pipeline execution associated with a playground session
 */
export interface PlaygroundExecution {
  id: string;
  startedAt: string;
  status: 'running' | 'completed' | 'failed';
  /**
   * Client-derived flag: true when this run is a nested sub-flow rather than a
   * main pipeline run. Inferred from its messages' `parentPipelineId` (with a
   * `hierarchy` depth ≥ 2 fallback for legacy runs predating that field). Used
   * to keep the sidebar on the main pipeline and hide sub-flows from the
   * run-switcher. Not part of the wire contract — the server never sets this.
   */
  isSubflow?: boolean;
}

/**
 * One run a session started, as the session runs endpoint reports it.
 *
 * `workflowVersion` is an opaque string: equal means no node config, edge,
 * interface port or third-party setting changed between two runs. `null`
 * means unknown (older run, or a run the session did not start) and is never
 * treated as stale.
 */
export interface SessionRun {
  /** Pipeline id (the execution id of the run's messages) */
  id: string;
  startedAt: string | null;
  completedAt: string | null;
  /** Pipeline status, or `unknown` when the pipeline is gone */
  status: string;
  workflowVersion: string | null;
  /** The person's message that started the run (cut by the server) */
  message: string | null;
  /** The named inputs the turn started with, bounded by the server */
  inputs: Record<string, unknown>;
  /** Whether anything in `inputs` was cut */
  inputsTruncated: boolean;
}

/** The session runs endpoint's `data`: the runs, oldest first, and the current version. */
export interface SessionRunsResult {
  /** The session's workflow as it is now; `null` when the workflow is gone */
  workflowVersion: string | null;
  runs: SessionRun[];
}

/** Response of `GET /sessions/{id}/runs`. */
export type SessionRunsResponse = PlaygroundApiResponse<SessionRunsResult>;

/**
 * Where a "Saved, new version" divider sits in the conversation feed.
 *  - `before-run`: above the first message of a run (reconstructed from the
 *    runs endpoint, where consecutive runs' versions differ);
 *  - `after-message`: below a message (added when the workflow is saved while
 *    a conversation is open);
 *  - `end`: below the last message (the workflow changed since the last run).
 */
export type VersionDividerAnchor =
  | { kind: 'before-run'; runId: string }
  | { kind: 'after-message'; messageId: string }
  | { kind: 'end' };

/** A divider in the conversation feed marking a new workflow version. */
export interface VersionDivider {
  id: string;
  anchor: VersionDividerAnchor;
}

/**
 * Third-party settings on a session, keyed by the module that owns them: the
 * wire shape of the server's session third-party settings. The Playground
 * reads its own key (see {@link PLAYGROUND_SESSION_MARK}).
 */
export type SessionThirdPartySettings = Record<string, Record<string, unknown>>;

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
  /**
   * Main pipeline runs triggered within this session, ordered oldest-first.
   * Sub-flow (nested) runs are excluded — they're surfaced only on individual
   * messages via `parentPipelineId`. The run-switcher relies on this being
   * main-runs-only; runs added from messages are classified client-side.
   */
  executions?: PlaygroundExecution[];
  /** Custom session metadata */
  metadata?: Record<string, unknown>;
  /**
   * Third-party settings the modules that created or used the session keep on
   * it. A server that exposes them sends the key on every session (an empty
   * map for a session nobody stamped); a server that does not leaves it out,
   * which is how the client tells "unmarked" from "cannot tell".
   */
  thirdPartySettings?: SessionThirdPartySettings;
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
  /** Subsystem that produced this message (e.g. 'pipeline', 'job', 'queue', 'cron') */
  source?: string;
  /** Allow additional properties */
  [key: string]: unknown;
}

/**
 * A node on the contextual tree the server attaches to a message
 * (e.g. workflow > sub-workflow > iteration). Display-only — this is not a
 * navigation breadcrumb; `href` is intentionally not part of the schema.
 */
export interface MessageHierarchyItem {
  /** Stable identifier (for keying) */
  id: string;
  /** Display label */
  label: string;
  /** Optional iconify icon id (e.g. 'mdi:graph') */
  icon?: string;
}

/**
 * Semantic color hooks for a tag. Map to design tokens in the theme.
 */
export type MessageTagColor = 'muted' | 'primary' | 'success' | 'warning' | 'error' | 'info';

/**
 * Visual emphasis for a tag.
 */
export type MessageTagVariant = 'solid' | 'outline' | 'subtle';

/**
 * A server-emitted classification chip rendered alongside a message.
 * Tags are unordered and replace any UI-side defaults.
 */
export interface MessageTag {
  /** Stable identifier (for keying) */
  id: string;
  /** Display label */
  label: string;
  /** Optional iconify icon id */
  icon?: string;
  /** Semantic color hook; defaults to 'muted' if omitted */
  color?: MessageTagColor;
  /** Visual style; defaults to 'subtle' if omitted */
  variant?: MessageTagVariant;
  /** Free-form classifier the server may use for future grouping/filtering */
  type?: string;
}

/**
 * Rendering hint the server may set to choose a layout regardless of role.
 *
 * - `default`: no hint; same as omitting the field (role-based default below)
 * - `bubble`: chat bubble shape (default for user/assistant)
 * - `log`: dense one-liner (default for log role)
 * - `notice`: compact centered notice (default for system role with
 *   compactSystemMessages enabled)
 * - `card`: vertical layout — breadcrumb (top), body (middle), tags (bottom)
 * - `hidden`: not rendered by default. **Hidden is not private**: the row
 *   still reaches the browser with the rest of the session. It hides noise,
 *   never secrets.
 *
 * When omitted (or `default`), the client falls back to the role-based
 * default above.
 */
export type PlaygroundMessageDisplay = 'default' | 'bubble' | 'log' | 'notice' | 'card' | 'hidden';

/**
 * The layout a message resolves to: never `default` (that is resolved to a
 * role-based layout first).
 */
export type ResolvedMessageDisplay = Exclude<PlaygroundMessageDisplay, 'default'>;

/**
 * Which component posted a session message — the third axis beside `role`
 * (who spoke, conversationally) and `display` (how to render it).
 *
 * - `user`: a person typed it.
 * - `workflow`: the workflow produced it (a reply).
 * - `engine`: the run machinery wrote it (trigger rows, failures, recovery,
 *   reporting rows).
 * - `playground`: a console observer wrote it for its own viewers.
 * - `interrupt`: the interrupt system posted a question into the session.
 *
 * Servers that predate the field omit it; treat that as unknown.
 */
export type PlaygroundMessageOrigin = 'user' | 'workflow' | 'engine' | 'playground' | 'interrupt';

/**
 * Resolve the effective layout for a message. Server-supplied `display` wins
 * (except `default`, which means "no hint"); otherwise we fall back to a
 * role-based default. Pure function so the dispatcher and tests can share it.
 */
export function resolveMessageDisplay(
  message: Pick<PlaygroundMessage, 'role' | 'display'>,
  options: { compactSystemMessages?: boolean } = {}
): ResolvedMessageDisplay {
  if (message.display && message.display !== 'default') return message.display;
  if (message.role === 'system' && options.compactSystemMessages !== false) return 'notice';
  if (message.role === 'log') return 'log';
  return 'bubble';
}

/**
 * Whether a message carries the `hidden` display hint. Hidden rows are kept
 * in the store (they still arrive and advance polling cursors) but are not
 * rendered. This only hides noise — it is never a security boundary.
 */
export function isHiddenMessage(message: Pick<PlaygroundMessage, 'display'>): boolean {
  return message.display === 'hidden';
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
  /** Incrementing sequence number for chronological ordering. All message roles receive unique incrementing numbers (1, 2, 3, ...). Primary sort key. */
  sequenceNumber?: number;
  /** Parent message ID (for assistant responses linked to user messages) */
  parentMessageId?: string;
  /** Pipeline/execution ID that generated this message */
  executionId?: string | null;
  /**
   * Execution ID of the parent pipeline when this message came from a nested
   * sub-flow; `null`/absent for top-level (main pipeline) messages. Authoritative
   * nesting signal (unlike the display-only `hierarchy`) — used to keep the main
   * pipeline in focus and hide sub-flow runs from the run-switcher.
   */
  parentPipelineId?: string | null;
  /**
   * Execution ID of the top-level pipeline this message ultimately belongs to.
   * Equals `executionId` for main-pipeline messages; for sub-flow messages it
   * points to the main run that triggered the sub-flow.
   */
  rootPipelineId?: string | null;
  /** Associated node ID (for log/assistant messages) */
  nodeId?: string | null;
  /**
   * Ordered hierarchy path (e.g. workflow > sub-workflow > iteration).
   * Rendered as a chevron-separated trail. Server-controlled — no
   * client-side derivation.
   */
  hierarchy?: MessageHierarchyItem[];
  /**
   * Server-emitted classification chips rendered with the message.
   * Replace any client-side defaults entirely (no merge).
   */
  tags?: MessageTag[];
  /**
   * Layout hint. When omitted, the client picks a default from the role:
   * - log → 'log', system (when compactSystemMessages) → 'notice',
   *   user/assistant → 'bubble'.
   * `hidden` rows are not rendered (noise, not secrecy).
   */
  display?: PlaygroundMessageDisplay;
  /**
   * Which component posted the message. Always present on current servers;
   * absent from older ones (treat as unknown — no origin badge).
   */
  origin?: PlaygroundMessageOrigin;
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
  /**
   * The person's message. Optional: a workflow whose interface declares no
   * `message` turn port runs on `inputs` alone, and its server refuses
   * `content` with a 400.
   */
  content?: string;
  /** Named inputs, keyed by interface entry id (the server's port `name`). */
  inputs?: Record<string, unknown>;
}

/**
 * What the `sessions.turn` endpoint answers with (`data` of a 202). A
 * snapshot at return time: the user's row, the assistant rows and the status
 * changes arrive through the messages poll like any other turn.
 */
export interface PlaygroundTurnResult {
  /** The session's id. */
  sessionId: string;
  /** The id of the user's message row (the turn's id). */
  userMessageId: string;
  /** The pipeline running the turn; `null` until it exists (async paths). */
  pipelineId: string | null;
  /** `queued`, `running`, `completed`, `awaiting_input`, `paused` or `failed`. */
  status: string;
  /** Assistant rows written during the turn (filled only when the server waited). */
  assistantMessageIds?: string[];
  finalAssistantMessageId?: string | null;
  finalAssistantMessage?: string | null;
  /** Further keys from newer servers pass through untouched. */
  [key: string]: unknown;
}

/**
 * What a turn request returned, by door: the legacy `playground.sendMessage`
 * answers with the user's message row, `sessions.turn` with a
 * {@link PlaygroundTurnResult}.
 */
export type PlaygroundTurnResponse =
  | { kind: 'message'; message: PlaygroundMessage }
  | { kind: 'turn'; result: PlaygroundTurnResult };

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
  /**
   * Number of messages to fetch per page (default: 50).
   * The initial load fetches the most recent page; scrolling up loads
   * older pages of this size on demand.
   */
  messagePageSize?: number;
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
   *
   * When the workflow interface declares turn ports, the interface decides:
   * the chat box shows only for a workflow with a `message` port, and this
   * option can still hide it (false) but not add it to a workflow without
   * one, whose server refuses message content. A workflow whose interface
   * declares no turn port follows this option as before.
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
   * Ignored for a workflow whose interface declares turn ports but no
   * `message` port: Run sends its form inputs and no message.
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
   * Width of the sidebar in CSS units (default: "280px")
   * Accepts any valid CSS width value, e.g. "300px", "20rem".
   */
  sidebarWidth?: string;
  /**
   * Whether to show the sidebar with session list (default: true)
   * When false, the sidebar is hidden, creating a minimal chat widget experience.
   * Use with initialSessionId to load a pre-created session directly.
   */
  showSidebar?: boolean;
  /**
   * Whether to show the ControlPanel header bar (default: true)
   * When false, hides the entire header row: session label, session chip
   * (with its New Session / session list popover) and the toolbar actions
   * (Pipeline / Refresh / Logs). Use for a minimal, locked-down playground.
   */
  showSessionHeader?: boolean;
  /**
   * Whether to show the "New Session" entry in the session chip popover
   * (default: true). When false, users cannot create additional sessions
   * from the UI — useful for single-session playground embeds.
   * No effect when showSessionHeader is false.
   */
  showNewSessionButton?: boolean;
  /**
   * Whether to show the session chip selector and its session list (default:
   * true). When false, the chip dropdown is hidden entirely — users cannot
   * switch sessions or see other sessions. Useful for locking a playground
   * embed to a single session. No effect when showSessionHeader is false.
   */
  showSessionList?: boolean;

  /**
   * Determines if polling should stop for a given session status.
   * Override to customize which statuses pause polling.
   * @default defaultShouldStopPolling (stops only on idle)
   */
  shouldStopPolling?: (status: PlaygroundSessionStatus) => boolean;

  /**
   * Determines if a session status is terminal (clears isExecuting).
   * Override to customize which statuses end the executing state.
   * @default defaultIsTerminalStatus (terminal on idle, completed, failed, awaiting_input)
   */
  isTerminalStatus?: (status: PlaygroundSessionStatus) => boolean;
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
  /** Whether more recent messages remain after this page (forward pagination via `since`) */
  hasMore?: boolean;
  /** Whether older messages exist before the first message in this page (backward pagination via `latest`/`before`) */
  hasOlder?: boolean;
  /** Current session status */
  sessionStatus?: PlaygroundSessionStatus;
}
