/**
 * Command Executor
 *
 * Executes parsed Command objects against a CommandContext,
 * dispatching mutations to the workflow store.
 *
 * @module commands/executor
 */

import type {
  Command,
  CommandContext,
  CommandResult,
  AddNodeResultData,
} from "./types.js";
import type { WorkflowNode } from "../types/index.js";
import { generateNodeId } from "../utils/nodeIds.js";
import { extractConfigDefaults } from "../utils/nodeIds.js";
import { computeAutoPosition } from "./positioner.js";

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Convert an internal namespaced node ID to a DSL short ID.
 * "agentspec.llm_node.1" → "llm_node.1"
 * "llm_node.1" → "llm_node.1" (no namespace, unchanged)
 */
export function toShortId(internalId: string): string {
  // Node IDs are <namespace>.<typeId>.<number> or <typeId>.<number>
  // The namespace is the first segment if there are 3+ dot-separated parts
  // and the last segment is a number
  const parts = internalId.split(".");
  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      // Strip the first segment (namespace)
      return parts.slice(1).join(".");
    }
  }
  return internalId;
}

/**
 * Resolve a DSL short ID (e.g. "llm_node.1") to the actual workflow node.
 * Tries direct match first, then looks for a namespaced match.
 */
export function resolveNode(
  shortId: string,
  nodes: WorkflowNode[],
): WorkflowNode | undefined {
  // Direct match
  const direct = nodes.find((n) => n.id === shortId);
  if (direct) return direct;

  // Namespaced match: node ID ends with ".<shortId>"
  return nodes.find((n) => n.id.endsWith(`.${shortId}`));
}

// ============================================================================
// Command Handlers
// ============================================================================

function executeAddNode(
  command: Extract<Command, { type: "add_node" }>,
  context: CommandContext,
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) {
    return { ok: false, error: "No workflow loaded", code: "NO_WORKFLOW" };
  }

  const metadata = context.typeMap.get(command.nodeTypeId);
  if (!metadata) {
    return {
      ok: false,
      error: `Unknown node type: ${command.nodeTypeId}`,
      code: "NODE_TYPE_NOT_FOUND",
    };
  }

  const position = command.position ?? computeAutoPosition(workflow.nodes);
  const nodeId = generateNodeId(metadata.id, workflow.nodes);
  const config = extractConfigDefaults(metadata.configSchema);

  const node: WorkflowNode = {
    id: nodeId,
    type: "universalNode",
    position,
    deletable: true,
    data: {
      label: metadata.name,
      config,
      metadata,
      nodeId,
    },
  };

  context.dispatch.addNode(node);

  const shortId = toShortId(nodeId);
  const resultData: AddNodeResultData = {
    nodeId: shortId,
    type: command.nodeTypeId,
    label: metadata.name,
    position,
  };

  return {
    ok: true,
    message: `Added ${metadata.name} as ${shortId}`,
    data: resultData,
  };
}

function executeDeleteNode(
  command: Extract<Command, { type: "delete_node" }>,
  context: CommandContext,
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) {
    return { ok: false, error: "No workflow loaded", code: "NO_WORKFLOW" };
  }

  const node = resolveNode(command.nodeId, workflow.nodes);
  if (!node) {
    return {
      ok: false,
      error: `Node not found: ${command.nodeId}`,
      code: "NODE_NOT_FOUND",
    };
  }

  context.dispatch.removeNode(node.id);

  return {
    ok: true,
    message: `Deleted node ${toShortId(node.id)}`,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Execute a parsed command against a workflow context.
 */
export function executeCommand(
  command: Command,
  context: CommandContext,
): CommandResult {
  switch (command.type) {
    case "add_node":
      return executeAddNode(command, context);
    case "delete_node":
      return executeDeleteNode(command, context);
    default:
      return {
        ok: false,
        error: `Command not yet implemented: ${command.type}`,
        code: "UNKNOWN_COMMAND",
      };
  }
}
