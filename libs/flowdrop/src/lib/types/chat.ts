/**
 * Chat Types for FlowDrop LLM Chat Interface
 *
 * Provides type definitions for the chat panel's communication
 * with backend LLM integrations.
 *
 * @module types/chat
 */

// =========================================================================
// Message Types
// =========================================================================

/**
 * Role for chat history messages
 */
export type ChatMessageRole = 'user' | 'assistant';

/**
 * A single message in the chat history
 */
export interface ChatHistoryMessage {
  role: ChatMessageRole;
  content: string;
}

// =========================================================================
// Request / Response
// =========================================================================

/**
 * Request payload sent to the chat endpoint
 */
export interface ChatRequest {
  /** The user's natural language message */
  message: string;
  /** Serialized current workflow state (nodes + edges) */
  workflowState: unknown;
  /** Optional conversation history for context */
  history?: ChatHistoryMessage[];
}

/**
 * Response payload from the chat endpoint
 */
export interface ChatResponse {
  /** The LLM's response content (may contain markdown and code blocks) */
  content: string;
  /** Optional conversation ID for backend session tracking */
  conversationId?: string;
}

// =========================================================================
// Command Extraction
// =========================================================================

/**
 * Result of parsing an LLM response to extract DSL commands
 */
export interface ExtractedCommands {
  /** The full explanation text (content outside code blocks) */
  explanation: string;
  /** Extracted DSL command strings */
  commands: string[];
}

// =========================================================================
// Command Preview / Execution
// =========================================================================

/**
 * Status of a single command in the preview
 *
 * `skipped` means the command was intentionally not run (e.g. a layout command
 * while `chatAllowLayoutChanges` is off) — it is not a failure and does not
 * trigger retry feedback.
 */
export type CommandExecutionStatus = 'pending' | 'executing' | 'success' | 'error' | 'skipped';

/**
 * A single command shown in the command preview UI
 */
export interface CommandPreviewItem {
  /** The raw DSL command string */
  raw: string;
  /** Current execution status */
  status: CommandExecutionStatus;
  /** Optional result or error message after execution */
  result?: string;
}
