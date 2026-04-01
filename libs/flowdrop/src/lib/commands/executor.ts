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
  GetConfigResultData,
  InfoResultData,
} from "./types.js";
import type { WorkflowNode } from "../types/index.js";
import { generateNodeId } from "../utils/nodeIds.js";
import { extractConfigDefaults } from "../utils/nodeIds.js";
import { computeAutoPosition } from "./positioner.js";
import { extractPortId } from "../utils/handleIds.js";

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
 * Convert a namespaced type ID to a short type ID.
 * "agentspec.llm_node" → "llm_node"
 * "llm_node" → "llm_node" (no namespace, unchanged)
 */
export function toShortTypeId(typeId: string): string {
  const dotIndex = typeId.indexOf(".");
  if (dotIndex !== -1) {
    return typeId.substring(dotIndex + 1);
  }
  return typeId;
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

function executeRenameNode(
  command: Extract<Command, { type: "rename_node" }>,
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

  context.dispatch.updateNode(node.id, {
    data: { ...node.data, label: command.label },
  });

  return {
    ok: true,
    message: `Renamed ${toShortId(node.id)} to "${command.label}"`,
  };
}

/**
 * Parse a raw value string into the appropriate JS type.
 * Priority: quoted string (preserved) > JSON > number > boolean > raw string
 */
function parseConfigValue(raw: string): unknown {
  // Quoted string — preserve as string (strip quotes)
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }

  // Try JSON (arrays, objects, null)
  if (raw.startsWith("[") || raw.startsWith("{") || raw === "null") {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through
    }
  }

  // Number
  if (raw !== "" && !isNaN(Number(raw))) {
    return Number(raw);
  }

  // Boolean
  if (raw === "true") return true;
  if (raw === "false") return false;

  // Raw string
  return raw;
}

function executeSetConfig(
  command: Extract<Command, { type: "set_config" }>,
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

  const parsedValue = parseConfigValue(command.value);
  const updatedConfig = { ...node.data.config, [command.key]: parsedValue };

  context.dispatch.updateNode(node.id, {
    data: { ...node.data, config: updatedConfig },
  });

  return {
    ok: true,
    message: `Set ${toShortId(node.id)}:${command.key} = ${JSON.stringify(parsedValue)}`,
  };
}

function executeGetConfig(
  command: Extract<Command, { type: "get_config" }>,
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

  const config = node.data.config as Record<string, unknown> | undefined;
  if (!config || !(command.key in config)) {
    return {
      ok: false,
      error: `Config key not found: ${command.key} on ${toShortId(node.id)}`,
      code: "CONFIG_KEY_NOT_FOUND",
    };
  }

  const resultData: GetConfigResultData = {
    nodeId: toShortId(node.id),
    key: command.key,
    value: config[command.key],
  };

  return {
    ok: true,
    message: `${toShortId(node.id)}:${command.key} = ${JSON.stringify(config[command.key])}`,
    data: resultData,
  };
}

function executeInfo(
  command: Extract<Command, { type: "info" }>,
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

  const metadata = node.data.metadata;
  const shortId = toShortId(node.id);

  const inputs = (metadata?.inputs ?? []).map((p) => ({
    portId: p.id,
    name: p.name,
    dataType: p.dataType,
  }));

  const outputs = (metadata?.outputs ?? []).map((p) => ({
    portId: p.id,
    name: p.name,
    dataType: p.dataType,
  }));

  // Build connected edges info
  const connectedEdges: InfoResultData["connectedEdges"] = [];
  for (const edge of workflow.edges) {
    if (edge.source === node.id) {
      connectedEdges.push({
        edgeId: edge.id,
        direction: "outgoing",
        remoteNodeId: toShortId(edge.target),
        remotePort: extractPortId(edge.targetHandle) ?? "",
        localPort: extractPortId(edge.sourceHandle) ?? "",
      });
    } else if (edge.target === node.id) {
      connectedEdges.push({
        edgeId: edge.id,
        direction: "incoming",
        remoteNodeId: toShortId(edge.source),
        remotePort: extractPortId(edge.sourceHandle) ?? "",
        localPort: extractPortId(edge.targetHandle) ?? "",
      });
    }
  }

  const resultData: InfoResultData = {
    nodeId: shortId,
    label: node.data.label ?? metadata?.name ?? "",
    type: metadata?.id ? toShortTypeId(metadata.id) : "",
    position: node.position,
    config: (node.data.config as Record<string, unknown>) ?? {},
    inputs,
    outputs,
    connectedEdges,
  };

  return {
    ok: true,
    message: `Info for ${shortId}`,
    data: resultData,
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
    case "rename_node":
      return executeRenameNode(command, context);
    case "set_config":
      return executeSetConfig(command, context);
    case "get_config":
      return executeGetConfig(command, context);
    case "info":
      return executeInfo(command, context);
    default:
      return {
        ok: false,
        error: `Command not yet implemented: ${command.type}`,
        code: "UNKNOWN_COMMAND",
      };
  }
}
