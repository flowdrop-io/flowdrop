/**
 * Mock data for Chat API endpoints
 *
 * Provides in-memory conversation storage and mock LLM response generation
 * for testing the AI chat feature.
 */

import type {
  ChatHistoryMessage,
  ChatMessageRole,
} from "../../lib/types/chat.js";

// ============================================================================
// Storage
// ============================================================================

/** In-memory conversation storage (workflowId → messages) */
const conversations: Map<string, ChatHistoryMessage[]> = new Map();

/** Conversation ID counter */
let conversationIdCounter = 1;

/** Track conversation IDs per workflow */
const conversationIds: Map<string, string> = new Map();

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get or create a conversation ID for a workflow
 */
function getConversationId(workflowId: string): string {
  let id = conversationIds.get(workflowId);
  if (!id) {
    id = `conv-${conversationIdCounter++}-${Date.now().toString(36)}`;
    conversationIds.set(workflowId, id);
  }
  return id;
}

/**
 * Get conversation history for a workflow
 */
export function getHistory(workflowId: string): ChatHistoryMessage[] {
  return conversations.get(workflowId) ?? [];
}

/**
 * Add a message to the conversation history
 */
export function addMessage(
  workflowId: string,
  role: ChatMessageRole,
  content: string,
): void {
  if (!conversations.has(workflowId)) {
    conversations.set(workflowId, []);
  }
  conversations.get(workflowId)!.push({ role, content });
}

/**
 * Clear conversation history for a workflow
 */
export function clearHistory(workflowId: string): void {
  conversations.delete(workflowId);
  conversationIds.delete(workflowId);
}

// ============================================================================
// Mock LLM Response Generation
// ============================================================================

/**
 * Canned responses keyed by pattern matches against the user message.
 * Each response simulates what an LLM trained on the FlowDrop DSL would return.
 */
const RESPONSE_PATTERNS: { pattern: RegExp; response: string }[] = [
  {
    pattern: /\b(list|show|what).*(node|workflow)/i,
    response: `Here's what's currently in your workflow.

\`\`\`flowdrop
list nodes
\`\`\``,
  },
  {
    pattern: /\b(list|show|what).*(edge|connection)/i,
    response: `Let me show you the current connections.

\`\`\`flowdrop
list edges
\`\`\``,
  },
  {
    pattern: /\b(list|show|what).*(type|available)/i,
    response: `Here are the available node types you can use.

\`\`\`flowdrop
list types
\`\`\``,
  },
  {
    pattern: /\bdelete\b.*\b(\w+\.\d+)\b/i,
    response: `I'll remove that node and all its connections.

\`\`\`flowdrop
delete $1
\`\`\``,
  },
  {
    pattern: /\b(clear|remove all|start over|reset)\b/i,
    response: `I'll clear the entire workflow so you can start fresh.

\`\`\`flowdrop
clear
\`\`\``,
  },
  {
    pattern: /\b(undo)\b/i,
    response: `I'll undo the last change.

\`\`\`flowdrop
undo
\`\`\``,
  },
  {
    pattern: /\b(redo)\b/i,
    response: `I'll redo the last undone change.

\`\`\`flowdrop
redo
\`\`\``,
  },
  {
    pattern: /\b(layout|arrange|organize|auto.?layout)\b/i,
    response: `I'll auto-arrange the nodes for a cleaner layout.

\`\`\`flowdrop
layout auto
canvas fitview
\`\`\``,
  },
  {
    pattern: /\badd\s+(\w+)/i,
    response: `I'll add that node to your workflow.

\`\`\`flowdrop
add $1
layout auto
canvas fitview
\`\`\``,
  },
  {
    pattern: /\bconnect\b/i,
    response: `To connect nodes, I need to know which ports to use. Let me check what's available.

\`\`\`flowdrop
list nodes
list edges
\`\`\``,
  },
  {
    pattern: /\bhelp\b/i,
    response: `Here's what I can help you with.

\`\`\`flowdrop
help
\`\`\``,
  },
];

/**
 * Default fallback response when no pattern matches
 */
const DEFAULT_RESPONSE = `I can help you build and modify workflows. Here are some things I can do:

- **Add nodes**: "Add a start_node" or "Add an llm_node"
- **Connect nodes**: "Connect node_a to node_b"
- **Configure nodes**: "Set the temperature to 0.7"
- **Query workflow**: "List all nodes" or "Show connections"
- **Layout**: "Auto-arrange the nodes"
- **Undo/Redo**: "Undo the last change"

What would you like to do?`;

/**
 * Generate a mock LLM response for the given user message.
 * Matches against canned patterns, falling back to a generic help response.
 */
export function generateMockResponse(
  userMessage: string,
  workflowId: string,
): { content: string; conversationId: string } {
  const conversationId = getConversationId(workflowId);

  // Try each pattern in order
  for (const { pattern, response } of RESPONSE_PATTERNS) {
    const match = userMessage.match(pattern);
    if (match) {
      // Replace capture group references ($1, $2, etc.)
      let content = response;
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          content = content.replace(new RegExp(`\\$${i}`, "g"), match[i]);
        }
      }
      return { content, conversationId };
    }
  }

  return { content: DEFAULT_RESPONSE, conversationId };
}
