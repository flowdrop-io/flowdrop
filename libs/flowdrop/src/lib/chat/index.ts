/**
 * FlowDrop Chat Module
 *
 * Provides the LLM Chat Interface for natural language workflow building.
 * Includes components for chat UI and command preview, utilities for
 * parsing LLM responses and classifying commands, and all chat types.
 *
 * @module chat
 *
 * @example In Svelte:
 * ```svelte
 * <script>
 *   import { AIChatPanel } from "@flowdrop/flowdrop/chat";
 * </script>
 *
 * <AIChatPanel
 *   nodeTypes={nodeTypes}
 *   workflowId="wf-123"
 *   onUIAction={handleUIAction}
 * />
 * ```
 */

// ============================================================================
// Chat Components
// ============================================================================

export { default as AIChatPanel } from '../components/chat/AIChatPanel.svelte';
export { default as CommandPreview } from '../components/chat/CommandPreview.svelte';

// ============================================================================
// Chat Utilities
// ============================================================================

export { extractCommands } from './responseParser.js';
export { isMutatingCommand, isLayoutCommand } from './commandClassifier.js';
export { buildApiHistory, type ChatLogEntry } from './historyBuilder.js';

// ============================================================================
// Chat Types
// ============================================================================

export type {
  ChatMessageRole,
  ChatHistoryMessage,
  ChatRequest,
  ChatResponse,
  ExtractedCommands,
  CommandExecutionStatus,
  CommandPreviewItem
} from '../types/chat.js';
