/**
 * Command DSL Type System
 *
 * Defines all command types, result types, context interfaces, and utilities
 * for the FlowDrop Workflow Command DSL. Zero runtime code except buildTypeMap().
 *
 * @module commands/types
 */

import type { NodeMetadata, Workflow, WorkflowNode, WorkflowEdge } from '../types/index.js';

// ============================================================================
// Command Types (Discriminated Union)
// ============================================================================

export interface AddNodeCommand {
  type: 'add_node';
  nodeTypeId: string;
  position?: { x: number; y: number };
}

export interface DeleteNodeCommand {
  type: 'delete_node';
  nodeId: string;
}

export interface RenameNodeCommand {
  type: 'rename_node';
  nodeId: string;
  label: string;
}

export interface SetConfigCommand {
  type: 'set_config';
  nodeId: string;
  key: string;
  value: string;
  /** When true, validation errors reject the command instead of warning */
  strict?: boolean;
}

export interface GetConfigCommand {
  type: 'get_config';
  nodeId: string;
  key: string;
}

export interface ConnectCommand {
  type: 'connect';
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
}

export interface DisconnectPortsCommand {
  type: 'disconnect_ports';
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
}

export interface DisconnectNodeCommand {
  type: 'disconnect_node';
  nodeId: string;
}

export interface ListNodesCommand {
  type: 'list_nodes';
}

export interface ListEdgesCommand {
  type: 'list_edges';
}

export interface ListTypesCommand {
  type: 'list_types';
}

export interface InfoCommand {
  type: 'info';
  nodeId: string;
}

export interface UndoCommand {
  type: 'undo';
}

export interface RedoCommand {
  type: 'redo';
}

export interface ConfigOpenCommand {
  type: 'config_open';
  nodeId: string;
}

export interface SelectNodeCommand {
  type: 'select_node';
  nodeId: string;
}

export interface HelpCommand {
  type: 'help';
  command?: string;
}

export interface ClearCommand {
  type: 'clear';
}

/** Phase 2 commands */

export interface SwapNodeCommand {
  type: 'swap_node';
  nodeId: string;
  newTypeId: string;
}

export interface MoveNodeCommand {
  type: 'move_node';
  nodeId: string;
  position: { x: number; y: number };
}

export interface AutoLayoutCommand {
  type: 'auto_layout';
  direction?: 'horizontal' | 'vertical';
}

export interface BeautifyLayoutCommand {
  type: 'beautify_layout';
}

/** Canvas viewport commands */

export interface CanvasFitViewCommand {
  type: 'canvas_fit_view';
}

export interface CanvasZoomInCommand {
  type: 'canvas_zoom_in';
}

export interface CanvasZoomOutCommand {
  type: 'canvas_zoom_out';
}

export interface CanvasZoomToCommand {
  type: 'canvas_zoom_to';
  level: number;
}

export interface CanvasPanToCommand {
  type: 'canvas_pan_to';
  position: { x: number; y: number };
}

export interface CanvasResetViewCommand {
  type: 'canvas_reset_view';
}

/** Discriminated union of all commands */
export type Command =
  | AddNodeCommand
  | DeleteNodeCommand
  | RenameNodeCommand
  | SetConfigCommand
  | GetConfigCommand
  | ConnectCommand
  | DisconnectPortsCommand
  | DisconnectNodeCommand
  | ListNodesCommand
  | ListEdgesCommand
  | ListTypesCommand
  | InfoCommand
  | UndoCommand
  | RedoCommand
  | ConfigOpenCommand
  | SelectNodeCommand
  | HelpCommand
  | ClearCommand
  | SwapNodeCommand
  | MoveNodeCommand
  | AutoLayoutCommand
  | BeautifyLayoutCommand
  | CanvasFitViewCommand
  | CanvasZoomInCommand
  | CanvasZoomOutCommand
  | CanvasZoomToCommand
  | CanvasPanToCommand
  | CanvasResetViewCommand;

// ============================================================================
// Parse Result
// ============================================================================

export type ParseResult =
  | { ok: true; command: Command }
  | { ok: false; error: string; input: string };

// ============================================================================
// Command Error Codes
// ============================================================================

export type CommandErrorCode =
  | 'NODE_NOT_FOUND'
  | 'NODE_TYPE_NOT_FOUND'
  | 'PORT_NOT_FOUND'
  | 'EDGE_NOT_FOUND'
  | 'INVALID_CONNECTION'
  | 'CYCLE_DETECTED'
  | 'NO_WORKFLOW'
  | 'PARSE_ERROR'
  | 'UNKNOWN_COMMAND'
  | 'CONFIG_KEY_NOT_FOUND'
  | 'CONFIG_VALIDATION_ERROR'
  | 'UNDO_UNAVAILABLE'
  | 'REDO_UNAVAILABLE';

// ============================================================================
// Command Result Types
// ============================================================================

/** Result data for add_node — nodeId is DSL-format short ID (e.g. "llm_node.1") */
export interface AddNodeResultData {
  nodeId: string;
  type: string;
  label: string;
  position: { x: number; y: number };
}

/** Result data for list_nodes — all IDs are DSL-format short IDs */
export interface ListNodesResultData {
  nodes: Array<{
    nodeId: string;
    label: string;
    type: string;
  }>;
}

/** Result data for list_edges — all IDs are DSL-format short IDs */
export interface ListEdgesResultData {
  edges: Array<{
    edgeId: string;
    sourceNodeId: string;
    sourcePort: string;
    targetNodeId: string;
    targetPort: string;
  }>;
}

/** Result data for list_types — type IDs are short names usable with add command */
export interface ListTypesResultData {
  types: Array<{
    typeId: string;
    name: string;
    category: string;
  }>;
}

/** Result data for info command — all IDs are DSL-format short IDs */
export interface InfoResultData {
  nodeId: string;
  label: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  inputs: Array<{ portId: string; name: string; dataType: string }>;
  outputs: Array<{ portId: string; name: string; dataType: string }>;
  connectedEdges: Array<{
    edgeId: string;
    direction: 'incoming' | 'outgoing';
    remoteNodeId: string;
    remotePort: string;
    localPort: string;
  }>;
}

/** Result data for get_config command */
export interface GetConfigResultData {
  nodeId: string;
  key: string;
  value: unknown;
}

/** Result data for help command */
export interface HelpResultData {
  commands: Array<{
    name: string;
    syntax: string;
    description: string;
  }>;
}

/** Result data for set_config command — includes validation warnings */
export interface SetConfigResultData {
  nodeId: string;
  key: string;
  value: unknown;
  /** Validation warnings (non-blocking unless strict mode) */
  warnings?: Array<{
    type: 'enum' | 'type_mismatch';
    message: string;
    allowedValues?: unknown[];
    expectedType?: string;
    actualType?: string;
  }>;
}

/** Result data for swap_node command */
export interface SwapNodeResultData {
  oldNodeId: string;
  newNodeId: string;
  newType: string;
  keptEdges: number;
  droppedEdges: number;
  /** Human-readable descriptions of each dropped edge, e.g. "node.1:text → node.2:message" */
  droppedEdgeDetails: string[];
  hasDataLoss: boolean;
  configCarriedOver: string[];
  configReset: string[];
}

/** Result data types union for typed access */
export type CommandResultData =
  | AddNodeResultData
  | ListNodesResultData
  | ListEdgesResultData
  | ListTypesResultData
  | InfoResultData
  | GetConfigResultData
  | SetConfigResultData
  | HelpResultData
  | SwapNodeResultData;

/** Successful command result */
export interface CommandResultOk {
  ok: true;
  message: string;
  data?: CommandResultData;
  /** Set when a UI action was requested but emitUIAction was not provided */
  uiActionPending?: boolean;
}

/** Failed command result */
export interface CommandResultError {
  ok: false;
  error: string;
  code: CommandErrorCode;
}

/** Result of executing a command */
export type CommandResult = CommandResultOk | CommandResultError;

// ============================================================================
// Batch Result
// ============================================================================

export interface BatchResult {
  ok: boolean;
  results: CommandResult[];
  completedCount: number;
  totalCount: number;
  error?: string;
}

// ============================================================================
// UI Actions
// ============================================================================

export type UIAction =
  | { type: 'open_config'; nodeId: string }
  | { type: 'select_node'; nodeId: string }
  | { type: 'canvas_fit_view' }
  | { type: 'canvas_zoom_in' }
  | { type: 'canvas_zoom_out' }
  | { type: 'canvas_zoom_to'; level: number }
  | { type: 'canvas_pan_to'; position: { x: number; y: number } }
  | { type: 'canvas_reset_view' };

// ============================================================================
// Command Dispatch Interface
// ============================================================================

export interface CommandDispatch {
  addNode(node: WorkflowNode): void;
  removeNode(nodeId: string): void;
  updateNode(nodeId: string, updates: Partial<Pick<WorkflowNode, 'data' | 'position'>>): void;
  addEdge(edge: WorkflowEdge): void;
  removeEdge(edgeId: string): void;
  batchUpdate(updates: { nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }): void;
  undo(): boolean;
  redo(): boolean;
  startTransaction(description: string): void;
  commitTransaction(): void;
  cancelTransaction(): void;
  /** Optional callback for UI-side actions (open config panel, select node) */
  emitUIAction?: (action: UIAction) => void;
  /** Optional swap operation for swap command */
  swapNode?: (updates: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
}

// ============================================================================
// Command Context
// ============================================================================

export interface CommandContext {
  /** Returns the current workflow state (live, not snapshot) */
  getWorkflow(): Workflow | null;
  /** Available node type definitions */
  nodeTypes: NodeMetadata[];
  /** Map from short type ID (e.g. "llm_node") to full NodeMetadata */
  typeMap: Map<string, NodeMetadata>;
  /** Dispatch interface for mutating workflow state */
  dispatch: CommandDispatch;
}

// ============================================================================
// Type Map Builder
// ============================================================================

/**
 * Build a lookup map from short type IDs to NodeMetadata.
 *
 * For namespaced IDs like "agentspec.llm_node", creates entries for both:
 * - The full ID: "agentspec.llm_node"
 * - The short suffix: "llm_node"
 *
 * Short IDs take precedence only if unique. If multiple namespaces define
 * the same short ID, only the full namespaced ID is usable.
 */
export function buildTypeMap(nodeTypes: NodeMetadata[]): Map<string, NodeMetadata> {
  const map = new Map<string, NodeMetadata>();
  const shortIdCounts = new Map<string, number>();

  // First pass: register full IDs and count short ID occurrences
  for (const metadata of nodeTypes) {
    map.set(metadata.id, metadata);

    const dotIndex = metadata.id.indexOf('.');
    if (dotIndex !== -1) {
      const shortId = metadata.id.substring(dotIndex + 1);
      shortIdCounts.set(shortId, (shortIdCounts.get(shortId) ?? 0) + 1);
    }
  }

  // Second pass: register unique short IDs
  for (const metadata of nodeTypes) {
    const dotIndex = metadata.id.indexOf('.');
    if (dotIndex !== -1) {
      const shortId = metadata.id.substring(dotIndex + 1);
      if (shortIdCounts.get(shortId) === 1) {
        map.set(shortId, metadata);
      }
    }
  }

  return map;
}
