/**
 * Command DSL Type System
 *
 * Defines all command types, result types, context interfaces, and utilities
 * for the FlowDrop Workflow Command DSL. Zero runtime code except buildTypeMap().
 *
 * @module commands/types
 */

import type { NodeMetadata, Workflow, WorkflowNode, WorkflowEdge } from '../types/index.js';
import type { PortMapping } from '../utils/nodeSwap.js';
import type { InterfaceInputEdit } from '../utils/playgroundChat.js';
import type { ResolvedInterfaceEntry } from '../utils/workflowInterface.js';
import type { ExposureBlock } from '../utils/portExposure.js';
import type { MeasuredCard } from '../layout/fromWorkflow.js';

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
  /** One key; omit to read every value together with the node's config schema. */
  key?: string;
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

/** Describe one node type — ports, config schema, defaults — before adding it. */
export interface DescribeTypeCommand {
  type: 'describe_type';
  nodeTypeId: string;
}

/** Find node types by a case-insensitive substring of id, name, description or tags. */
export interface SearchTypesCommand {
  type: 'search_types';
  query: string;
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
  /** Also remove the interface and the Playground chat settings. */
  all?: boolean;
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
  /** Report the steps and the score without applying them. */
  dryRun?: boolean;
  /** Gap between cards side by side, px. Default: the editor setting. */
  gapX?: number;
  /** Gap between stacked cards, px. Default: the editor setting. */
  gapY?: number;
}

export interface InspectNodeLayoutCommand {
  type: 'inspect_node_layout';
  nodeId: string;
  /** Gap between cards side by side, px. Default: the editor setting. */
  gapX?: number;
  /** Gap between stacked cards, px. Default: the editor setting. */
  gapY?: number;
}

/** What `beautify_node` may run; `all` is column, ports, align, clear in turn. */
export type BeautifyNodeStrategy = 'column' | 'ports' | 'align' | 'clear' | 'all';

export interface BeautifyNodeCommand {
  type: 'beautify_node';
  nodeId: string;
  /** Default `all`. */
  strategy?: BeautifyNodeStrategy;
  /** Report the proposal and its score without applying it. */
  dryRun?: boolean;
  /** Gap between cards side by side, px. Default: the editor setting. */
  gapX?: number;
  /** Gap between stacked cards, px. Default: the editor setting. */
  gapY?: number;
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

/** Interface, port visibility, duplicate, workflow settings and Playground commands */

/**
 * The side of the workflow interface (and of a node) a command names: the one
 * word for input or output, in the interface and ports commands alike.
 */
export type InterfaceSide = 'input' | 'output';

/** Read the workflow interface: every input and output with its binding and status. */
export interface InterfaceListCommand {
  type: 'interface_list';
}

/** Publish a node port on the interface. The side is the port's own side. */
export interface InterfaceExposeCommand {
  type: 'interface_expose';
  nodeId: string;
  port: string;
  /** Only needed when the node has a port of this id on both sides. */
  side?: InterfaceSide;
  /** The public id; default the one the editor's "Expose" action suggests. */
  id?: string;
}

/** Add a custom, unbound entry. */
export interface InterfaceAddCommand {
  type: 'interface_add';
  side: InterfaceSide;
  id: string;
  dataType?: string;
}

export interface InterfaceRemoveCommand {
  type: 'interface_remove';
  side: InterfaceSide;
  id: string;
}

export interface InterfaceRenameCommand {
  type: 'interface_rename';
  side: InterfaceSide;
  id: string;
  newId: string;
}

/** Bind an entry to a node port, or (`target: null`) unbind it. */
export interface InterfaceBindCommand {
  type: 'interface_bind';
  side: InterfaceSide;
  id: string;
  target: { nodeId: string; port: string } | null;
}

/** The entry fields `interface_set` writes. */
export type InterfaceField =
  | 'name'
  | 'description'
  | 'dataType'
  | 'required'
  | 'default'
  | 'examples';

export interface InterfaceSetCommand {
  type: 'interface_set';
  side: InterfaceSide;
  id: string;
  field: InterfaceField;
  /**
   * The raw token, parsed like `set_config` values. `none` or `""` clears an
   * optional field; an empty string is refused (a missing value must never
   * erase one).
   */
  value: string;
}

/** Copy name, type, description, required and default from the bound port. */
export interface InterfacePullCommand {
  type: 'interface_pull';
  side: InterfaceSide;
  id: string;
}

export interface InterfaceMoveCommand {
  type: 'interface_move';
  side: InterfaceSide;
  id: string;
  /** 1-based position within its side. */
  position: number;
}

/** Read a node's ports with their side, exposure and why one cannot be hidden. */
export interface PortsListCommand {
  type: 'ports_list';
  nodeId: string;
}

/** Hide or show ports. Without `port`: hide the unconnected ones / show every hidden one. */
export interface PortsExposureCommand {
  type: 'ports_exposure';
  nodeId: string;
  mode: 'hide' | 'show';
  port?: string;
  /** Only needed when the node has a port of this id on both sides. */
  side?: InterfaceSide;
}

export interface PortsMoveCommand {
  type: 'ports_move';
  nodeId: string;
  port: string;
  /** Only needed when the node has a port of this id on both sides. */
  side?: InterfaceSide;
  /** 1-based position within the port's side. */
  position: number;
}

export interface DuplicateNodeCommand {
  type: 'duplicate_node';
  nodeId: string;
}

export interface WorkflowGetCommand {
  type: 'workflow_get';
}

export interface WorkflowSetCommand {
  type: 'workflow_set';
  field: 'name' | 'description' | 'format';
  value: string;
}

export interface PlaygroundGetCommand {
  type: 'playground_get';
}

/** One edit of the Playground chat binding. */
export type PlaygroundChatEdit =
  | {
      kind: 'input';
      key: 'message' | 'history' | 'session_id' | 'message_id';
      /** The interface input to bind; `null` unbinds. */
      id: string | null;
      /** History only: how many past messages. */
      limit?: number;
    }
  | { kind: 'limit'; limit: number }
  | { kind: 'reply'; mode: 'add' | 'remove'; nodeId: string; port: string }
  | { kind: 'sub_replies'; on: boolean }
  | { kind: 'off' }
  | { kind: 'move_turns' };

export interface PlaygroundChatCommand {
  type: 'playground_chat';
  edit: PlaygroundChatEdit;
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
  | DescribeTypeCommand
  | SearchTypesCommand
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
  | InspectNodeLayoutCommand
  | BeautifyNodeCommand
  | CanvasFitViewCommand
  | CanvasZoomInCommand
  | CanvasZoomOutCommand
  | CanvasZoomToCommand
  | CanvasPanToCommand
  | CanvasResetViewCommand
  | InterfaceListCommand
  | InterfaceExposeCommand
  | InterfaceAddCommand
  | InterfaceRemoveCommand
  | InterfaceRenameCommand
  | InterfaceBindCommand
  | InterfaceSetCommand
  | InterfacePullCommand
  | InterfaceMoveCommand
  | PortsListCommand
  | PortsExposureCommand
  | PortsMoveCommand
  | DuplicateNodeCommand
  | WorkflowGetCommand
  | WorkflowSetCommand
  | PlaygroundGetCommand
  | PlaygroundChatCommand;

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
  /** The editor is locked (read-only): a command that would change the workflow was refused. */
  | 'LOCKED'
  /** `runCommand({ baseline: true })` on a workflow with unsaved changes: nothing was run. */
  | 'DIRTY'
  | 'PARSE_ERROR'
  /** An argument is out of range, e.g. a layout gap that is not a multiple of the grid. */
  | 'INVALID_ARGUMENT'
  /** The graph is past what the command takes on, e.g. too many nodes to tidy at once. */
  | 'TOO_LARGE'
  | 'UNKNOWN_COMMAND'
  /** The command threw instead of returning a result (a bug, not bad input): see the console. */
  | 'INTERNAL_ERROR'
  | 'CONFIG_KEY_NOT_FOUND'
  /** search_types with a blank query — use list_types for the whole catalog. */
  | 'EMPTY_QUERY'
  | 'CONFIG_VALIDATION_ERROR'
  | 'UNDO_UNAVAILABLE'
  | 'REDO_UNAVAILABLE'
  /** A Console command (`session`, `mode`, `runs`, `save`, `export`) refused: busy, not available, nothing to act on. */
  | 'CONSOLE_REFUSED'
  /** A Console command reached the backend or the editor and it failed. */
  | 'CONSOLE_FAILED'
  /** `runCommand`'s answer to a `session` line, as in 2.18. Other Console lines get `CONSOLE_REFUSED`. */
  | 'SESSION_REFUSED'
  /** @deprecated Released in 2.18.0; no longer returned. Use `CONSOLE_FAILED`. */
  | 'SESSION_FAILED';

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

/** One row of list_types / search_types — `typeId` is the short id add_node accepts. */
export interface TypeSummary {
  typeId: string;
  name: string;
  category: string;
  description?: string;
  tags?: string[];
}

/** Result data for list_types — type IDs are short names usable with add command */
export interface ListTypesResultData {
  types: TypeSummary[];
}

/** Result data for search_types — the matching rows, in catalog order */
export interface SearchTypesResultData {
  query: string;
  types: TypeSummary[];
}

/** One config key as described by describe_type / get_config */
export interface ConfigKeyDescription {
  key: string;
  /** JSON Schema type — a literal, or a list when the schema declares several. */
  type?: string | string[];
  title?: string;
  description?: string;
  /** Allowed values: the schema's `enum`, or the consts of a `oneOf`/`anyOf` of `{ const, title }`. */
  enum?: unknown[];
  /** Display titles for the allowed values, keyed by the value as a string. Only present when the schema gave titles. */
  enumTitles?: Record<string, string>;
  default?: unknown;
  required?: boolean;
}

/** One port as described by describe_type */
export interface PortDescription {
  portId: string;
  name: string;
  dataType: string;
  required?: boolean;
  description?: string;
}

/**
 * Result data for describe_type — everything an agent needs to know about a
 * node type before adding one. `confirmation`, `can` and `agent` are passed
 * through from the host's payload untouched when present.
 */
export interface DescribeTypeResultData extends TypeSummary {
  inputs: PortDescription[];
  outputs: PortDescription[];
  config: ConfigKeyDescription[];
  confirmation?: NodeMetadata['confirmation'];
  can?: NodeMetadata['can'];
  agent?: NodeMetadata['agent'];
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

/** get_config with a key: that key's value and its schema entry, if declared. */
export interface GetConfigKeyResultData {
  nodeId: string;
  key: string;
  value: unknown;
  schema?: ConfigKeyDescription;
}

/** get_config without a key: every current value and the whole config schema. */
export interface GetConfigAllResultData {
  nodeId: string;
  values: Record<string, unknown>;
  schema: ConfigKeyDescription[];
}

/** Result data for get_config — narrow on `'key' in data`. */
export type GetConfigResultData = GetConfigKeyResultData | GetConfigAllResultData;

/** Result data for help command */
export interface HelpResultData {
  commands: Array<{
    name: string;
    syntax: string;
    description: string;
  }>;
}

/** The layout score as counts: what a UI says about a tidy. */
export interface LayoutCounts {
  straight: number;
  backward: number;
  crossings: number;
  overlaps: number;
  /** Pairs of cards too close. */
  spacing: number;
  /** Wires running through a port that is not one of their ends. */
  passes: number;
}

/** Result data for `beautify_layout` and `beautify_node` (dry runs too). */
export interface LayoutResultData {
  /** True when the command changed the workflow, or (dry run) would. */
  changed: boolean;
  before: LayoutCounts;
  after: LayoutCounts;
}

/** Result data for set_config command — includes validation warnings */
export interface SetConfigResultData {
  nodeId: string;
  key: string;
  value: unknown;
  /** Validation warnings (non-blocking unless strict mode) */
  warnings?: Array<{
    type: 'enum' | 'type_mismatch' | 'unknown_key';
    message: string;
    allowedValues?: unknown[];
    expectedType?: string;
    actualType?: string;
    /** For `unknown_key`: the keys the node's config schema does declare. */
    knownKeys?: string[];
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

/** One interface entry as `interface_list` reports it. */
export interface InterfaceEntryDescription {
  id: string;
  name?: string;
  description?: string;
  dataType: string;
  required?: boolean;
  defaultValue?: unknown;
  examples?: unknown[];
  /** The deprecated chat `turn` mark, read-only here (`playground_chat` is where the binding lives). */
  turn?: string;
  limit?: number;
  bindings: Array<{ nodeId: string; port: string }>;
  status: ResolvedInterfaceEntry['status'];
}

/** Result data for interface_list */
export interface InterfaceListResultData {
  inputs: InterfaceEntryDescription[];
  outputs: InterfaceEntryDescription[];
}

/** One port as `ports_list` reports it. */
export interface PortStateDescription {
  port: string;
  name: string;
  side: InterfaceSide;
  dataType: string;
  exposed: boolean;
  /** Why an exposed port cannot be hidden. */
  hideBlock?: ExposureBlock['kind'];
}

/** Result data for ports_list */
export interface PortsListResultData {
  nodeId: string;
  ports: PortStateDescription[];
}

/** Result data for duplicate_node */
export interface DuplicateNodeResultData {
  nodeId: string;
  sourceNodeId: string;
  position: { x: number; y: number };
}

/** Result data for workflow_get */
export interface WorkflowGetResultData {
  name: string;
  description: string;
  format: string;
  /** Formats this editor registers, when it says. */
  formats?: string[];
  /** The host's custom workflow settings (read-only here). */
  config: Record<string, unknown>;
}

/** Result data for playground_get */
export interface PlaygroundGetResultData {
  /** False for a backend before FlowDrop 2.7.0: it has no Playground settings. */
  available: boolean;
  /** Where the binding in effect comes from. */
  source?: 'settings' | 'interface_turn' | 'none';
  chat?: {
    message: string | null;
    history: { input: string; limit: number } | null;
    session_id: string | null;
    message_id: string | null;
    replies: Array<{ nodeId: string; port: string }>;
    sub_workflow_replies: boolean;
  };
  issues?: string[];
}

/** Result data types union for typed access */
export type CommandResultData =
  | AddNodeResultData
  | ListNodesResultData
  | ListEdgesResultData
  | ListTypesResultData
  | SearchTypesResultData
  | DescribeTypeResultData
  | InfoResultData
  | GetConfigResultData
  | SetConfigResultData
  | HelpResultData
  | SwapNodeResultData
  | LayoutResultData
  | InterfaceListResultData
  | PortsListResultData
  | DuplicateNodeResultData
  | WorkflowGetResultData
  | PlaygroundGetResultData;

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
  batchUpdate(updates: {
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    name?: string;
    description?: string;
    metadata?: Partial<Workflow['metadata']>;
    config?: Record<string, unknown>;
    interface?: Workflow['interface'];
    playground?: Workflow['playground'];
  }): void;
  /**
   * Replace the workflow interface in one undo step. `edit` names an input id
   * that was renamed or removed, so the Playground chat binding follows it.
   * Optional, so a dispatch written for 2.18 still compiles: without it the
   * commands write the same result through `batchUpdate` (the interface and the
   * followed chat binding together).
   */
  editInterface?: (next: Workflow['interface'], edit?: InterfaceInputEdit) => void;
  undo(): boolean;
  redo(): boolean;
  startTransaction(description: string): void;
  commitTransaction(): void;
  cancelTransaction(): void;
  /** Optional callback for UI-side actions (open config panel, select node) */
  emitUIAction?: (action: UIAction) => void;
  /** Optional swap operation for swap command */
  swapNode?: (updates: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    oldNodeId?: string;
    newNodeId?: string;
    portMappings?: PortMapping[];
  }) => void;
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
  /**
   * Whether the editor is locked (read-only). Optional: without it nothing is
   * treated as locked. While true, commands that change the workflow are
   * refused with `LOCKED`; reads and view commands still run.
   */
  isLocked?(): boolean;
  /**
   * How the canvas measured a node (size, handle centres). Optional: without it
   * node layout commands use computed geometry.
   */
  measureNode?(nodeId: string): MeasuredCard | undefined;
  /** The visual type a node renders as (`note`, `caption`, `gateway`, …). */
  visualType?(node: WorkflowNode): string;
  /** The *Show descriptions* setting, which changes card heights. */
  showDescriptions?: boolean;
  /**
   * The layout gaps of the editor settings and the grid they are multiples of.
   * Optional: without it node layout commands use the library defaults on a 20 px grid.
   */
  layoutGaps?: { gapX: number; gapY: number; gridSize: number };
  /** The workflow formats this editor offers (registered and allowed by the host), for `workflow format`. */
  formatOptions?(): string[];
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
    map.set(metadata.node_type_id, metadata);

    const dotIndex = metadata.node_type_id.indexOf('.');
    if (dotIndex !== -1) {
      const shortId = metadata.node_type_id.substring(dotIndex + 1);
      shortIdCounts.set(shortId, (shortIdCounts.get(shortId) ?? 0) + 1);
    }
  }

  // Second pass: register unique short IDs
  for (const metadata of nodeTypes) {
    const dotIndex = metadata.node_type_id.indexOf('.');
    if (dotIndex !== -1) {
      const shortId = metadata.node_type_id.substring(dotIndex + 1);
      if (shortIdCounts.get(shortId) === 1) {
        map.set(shortId, metadata);
      }
    }
  }

  return map;
}
