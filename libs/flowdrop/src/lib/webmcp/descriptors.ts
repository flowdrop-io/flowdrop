/**
 * WebMCP adapter — tool descriptors.
 *
 * Maps the command union to `{verb, description, inputSchema, readOnly,
 * toCommands}` records. Transport-free: no DOM, no Svelte, nothing from the
 * runtime — so the same records can back a server-side MCP endpoint later.
 *
 * The schemas are written by hand next to the interfaces they mirror
 * (`commands/types.ts`). The coverage test in `tests/unit/webmcp` asserts every
 * literal of the `Command` union is either exposed here or on the explicit
 * exclusion list, so a new DSL verb cannot slip through unclassified.
 *
 * @module webmcp/descriptors
 */

import type { Command } from '../commands/types.js';
import { isMutatingCommand } from '../chat/commandClassifier.js';
import {
  ToolArgumentError,
  type ToolDescriptor,
  type ToolInputSchema,
  type ToolSchemaProperty
} from './types.js';

// ============================================================================
// What is exposed
// ============================================================================

/** Command types exposed as one tool each (verb === command type). */
export const EXPOSED_COMMAND_TYPES = [
  'add_node',
  'delete_node',
  'rename_node',
  'move_node',
  'swap_node',
  'set_config',
  'get_config',
  'connect',
  'disconnect_ports',
  'disconnect_node',
  'list_nodes',
  'list_edges',
  'list_types',
  'info',
  'undo',
  'redo',
  'auto_layout',
  'beautify_layout'
] as const satisfies readonly Command['type'][];

/** Command types folded into the single `view` tool (its `action` enum). */
export const VIEW_COMMAND_TYPES = [
  'select_node',
  'config_open',
  'canvas_fit_view',
  'canvas_zoom_in',
  'canvas_zoom_out',
  'canvas_zoom_to',
  'canvas_pan_to',
  'canvas_reset_view'
] as const satisfies readonly Command['type'][];

/**
 * Command types deliberately not exposed.
 * - `clear` wipes the whole workflow; an agent can delete nodes one by one and
 *   each deletion is gated.
 * - `help` describes the text DSL; the tool schemas are the help.
 */
export const EXCLUDED_COMMAND_TYPES = [
  'clear',
  'help'
] as const satisfies readonly Command['type'][];

/** Extra tool verbs that are not command types. */
export const COMPOSITE_VERBS = ['view', 'batch'] as const;

// ============================================================================
// Schema fragments
// ============================================================================

const NODE_ID_DESCRIPTION =
  'Node id in short form, e.g. "llm_node.1" — the `nodeId` values returned by list_nodes and add_node. Full ids are accepted too.';

const nodeId = (description = NODE_ID_DESCRIPTION): ToolSchemaProperty => ({
  type: 'string',
  description
});

const position: ToolSchemaProperty = {
  type: 'object',
  description: 'Canvas position in pixels.',
  properties: {
    x: { type: 'number', description: 'Horizontal position.' },
    y: { type: 'number', description: 'Vertical position.' }
  },
  required: ['x', 'y'],
  additionalProperties: false
};

const port = (which: string): ToolSchemaProperty => ({
  type: 'string',
  description: `${which} port id, as listed under inputs/outputs by the info tool.`
});

const configValue: ToolSchemaProperty = {
  description:
    'The new value. Strings are stored verbatim; numbers, booleans, arrays and objects are stored typed.',
  anyOf: [
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'object' },
    { type: 'array' }
  ]
};

const object = (
  properties: Record<string, ToolSchemaProperty>,
  required: readonly string[] = []
): ToolInputSchema => ({
  type: 'object',
  properties,
  ...(required.length > 0 ? { required } : {}),
  additionalProperties: false
});

const EMPTY = object({});

// ============================================================================
// Argument validation
// ============================================================================

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value: unknown, type: NonNullable<ToolSchemaProperty['type']>): boolean {
  switch (type) {
    case 'string':
    case 'boolean':
      return typeof value === type;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'object':
      return typeOf(value) === 'object';
    case 'array':
      return Array.isArray(value);
  }
}

function validateProperty(path: string, value: unknown, schema: ToolSchemaProperty): void {
  if (schema.anyOf) {
    if (!schema.anyOf.some((alt) => !alt.type || matchesType(value, alt.type))) {
      throw new ToolArgumentError(
        `${path}: expected one of ${schema.anyOf.map((a) => a.type).join(', ')}, got ${typeOf(value)}`
      );
    }
    return;
  }
  if (schema.type && !matchesType(value, schema.type)) {
    throw new ToolArgumentError(`${path}: expected ${schema.type}, got ${typeOf(value)}`);
  }
  if (schema.enum && !schema.enum.includes(value as string)) {
    throw new ToolArgumentError(
      `${path}: expected one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}, got ${JSON.stringify(value)}`
    );
  }
  if (schema.minimum !== undefined && (value as number) < schema.minimum) {
    throw new ToolArgumentError(`${path}: must be >= ${schema.minimum}`);
  }
  if (schema.maximum !== undefined && (value as number) > schema.maximum) {
    throw new ToolArgumentError(`${path}: must be <= ${schema.maximum}`);
  }
  if (schema.type === 'object' && schema.properties) {
    validateObject(path, value as Record<string, unknown>, schema);
  }
  if (schema.type === 'array' && schema.items) {
    (value as unknown[]).forEach((item, i) =>
      validateProperty(`${path}[${i}]`, item, schema.items!)
    );
  }
}

function validateObject(
  path: string,
  value: Record<string, unknown>,
  schema: Pick<ToolSchemaProperty, 'properties' | 'required' | 'additionalProperties'>
): void {
  const props = schema.properties ?? {};
  for (const key of schema.required ?? []) {
    if (value[key] === undefined) {
      throw new ToolArgumentError(`${path ? path + '.' : ''}${key} is required`);
    }
  }
  for (const [key, v] of Object.entries(value)) {
    if (v === undefined) continue;
    const prop = props[key];
    if (!prop) {
      if (schema.additionalProperties === false) {
        throw new ToolArgumentError(`${path ? path + '.' : ''}${key}: unknown property`);
      }
      continue;
    }
    validateProperty(`${path ? path + '.' : ''}${key}`, v, prop);
  }
}

/**
 * Validate raw tool input against a tool's schema. The runtime is supposed to
 * do this, but Chrome's validator behaviour is not something to lean on yet;
 * the check is cheap and keeps behaviour identical across runtimes.
 *
 * @throws ToolArgumentError
 */
export function validateToolArgs(schema: ToolInputSchema, input: unknown): Record<string, unknown> {
  const args = input === undefined || input === null ? {} : input;
  if (typeOf(args) !== 'object') {
    throw new ToolArgumentError(`arguments must be an object, got ${typeOf(args)}`);
  }
  validateObject('', args as Record<string, unknown>, schema);
  return args as Record<string, unknown>;
}

// ============================================================================
// Argument → Command
// ============================================================================

type Args = Record<string, unknown>;
type Pos = { x: number; y: number };

/**
 * `SetConfigCommand.value` is the DSL's raw token: the executor parses it with
 * the same rules the text DSL uses (`"…"` → string, bare `12` → number, `true`
 * → boolean, `{…}`/`[…]` → JSON). JSON-encoding every typed argument routes
 * each shape to the right rule, and keeps a string like `"true"` a string.
 */
function encodeConfigValue(value: unknown): string {
  return JSON.stringify(value);
}

/** Builders for the single-command tools, keyed by command type. */
const COMMAND_BUILDERS: {
  [K in (typeof EXPOSED_COMMAND_TYPES)[number]]: (args: Args) => Extract<Command, { type: K }>;
} = {
  add_node: (a) => ({
    type: 'add_node',
    nodeTypeId: a.nodeTypeId as string,
    ...(a.position ? { position: a.position as Pos } : {})
  }),
  delete_node: (a) => ({ type: 'delete_node', nodeId: a.nodeId as string }),
  rename_node: (a) => ({
    type: 'rename_node',
    nodeId: a.nodeId as string,
    label: a.label as string
  }),
  move_node: (a) => ({
    type: 'move_node',
    nodeId: a.nodeId as string,
    position: a.position as Pos
  }),
  swap_node: (a) => ({
    type: 'swap_node',
    nodeId: a.nodeId as string,
    newTypeId: a.newTypeId as string
  }),
  set_config: (a) => ({
    type: 'set_config',
    nodeId: a.nodeId as string,
    key: a.key as string,
    value: encodeConfigValue(a.value),
    ...(a.strict !== undefined ? { strict: a.strict as boolean } : {})
  }),
  get_config: (a) => ({ type: 'get_config', nodeId: a.nodeId as string, key: a.key as string }),
  connect: (a) => ({
    type: 'connect',
    sourceNodeId: a.sourceNodeId as string,
    sourcePort: a.sourcePort as string,
    targetNodeId: a.targetNodeId as string,
    targetPort: a.targetPort as string
  }),
  disconnect_ports: (a) => ({
    type: 'disconnect_ports',
    sourceNodeId: a.sourceNodeId as string,
    sourcePort: a.sourcePort as string,
    targetNodeId: a.targetNodeId as string,
    targetPort: a.targetPort as string
  }),
  disconnect_node: (a) => ({ type: 'disconnect_node', nodeId: a.nodeId as string }),
  list_nodes: () => ({ type: 'list_nodes' }),
  list_edges: () => ({ type: 'list_edges' }),
  list_types: () => ({ type: 'list_types' }),
  info: (a) => ({ type: 'info', nodeId: a.nodeId as string }),
  undo: () => ({ type: 'undo' }),
  redo: () => ({ type: 'redo' }),
  auto_layout: (a) => ({
    type: 'auto_layout',
    ...(a.direction ? { direction: a.direction as 'horizontal' | 'vertical' } : {})
  }),
  beautify_layout: () => ({ type: 'beautify_layout' })
};

/** Schemas for the single-command tools, keyed by command type. */
const COMMAND_SCHEMAS: Record<(typeof EXPOSED_COMMAND_TYPES)[number], ToolInputSchema> = {
  add_node: object(
    {
      nodeTypeId: {
        type: 'string',
        description:
          'Node type id as returned by list_types (`typeId`), e.g. "llm_node". Call list_types first.'
      },
      position: { ...position, description: 'Optional canvas position; auto-placed when omitted.' }
    },
    ['nodeTypeId']
  ),
  delete_node: object({ nodeId: nodeId() }, ['nodeId']),
  rename_node: object(
    { nodeId: nodeId(), label: { type: 'string', description: 'New display label.' } },
    ['nodeId', 'label']
  ),
  move_node: object({ nodeId: nodeId(), position }, ['nodeId', 'position']),
  swap_node: object(
    {
      nodeId: nodeId('Node to replace.'),
      newTypeId: {
        type: 'string',
        description:
          'Replacement node type id (see list_types). Compatible ports and config carry over.'
      }
    },
    ['nodeId', 'newTypeId']
  ),
  set_config: object(
    {
      nodeId: nodeId(),
      key: {
        type: 'string',
        description: 'Config key, as listed under `config` by the info tool.'
      },
      value: configValue,
      strict: {
        type: 'boolean',
        description: 'When true, a value the schema rejects fails the call instead of warning.'
      }
    },
    ['nodeId', 'key', 'value']
  ),
  get_config: object(
    { nodeId: nodeId(), key: { type: 'string', description: 'Config key to read.' } },
    ['nodeId', 'key']
  ),
  connect: object(
    {
      sourceNodeId: nodeId('Node the edge starts at.'),
      sourcePort: port('Output'),
      targetNodeId: nodeId('Node the edge ends at.'),
      targetPort: port('Input')
    },
    ['sourceNodeId', 'sourcePort', 'targetNodeId', 'targetPort']
  ),
  disconnect_ports: object(
    {
      sourceNodeId: nodeId('Node the edge starts at.'),
      sourcePort: port('Output'),
      targetNodeId: nodeId('Node the edge ends at.'),
      targetPort: port('Input')
    },
    ['sourceNodeId', 'sourcePort', 'targetNodeId', 'targetPort']
  ),
  disconnect_node: object({ nodeId: nodeId() }, ['nodeId']),
  list_nodes: EMPTY,
  list_edges: EMPTY,
  list_types: EMPTY,
  info: object({ nodeId: nodeId() }, ['nodeId']),
  undo: EMPTY,
  redo: EMPTY,
  auto_layout: object({
    direction: {
      type: 'string',
      enum: ['horizontal', 'vertical'],
      description: 'Flow direction. Default horizontal.'
    }
  }),
  beautify_layout: EMPTY
};

const COMMAND_DESCRIPTIONS: Record<(typeof EXPOSED_COMMAND_TYPES)[number], string> = {
  add_node: 'Add a node of the given type to the workflow. Returns the new node id.',
  delete_node: 'Delete a node and every edge attached to it.',
  rename_node: 'Change the display label of a node.',
  move_node: 'Move a node to a canvas position.',
  swap_node:
    'Replace a node with one of another type, keeping compatible connections and config. Reports what was dropped.',
  set_config:
    'Set one configuration value on a node. Validation warnings are returned, not fatal, unless strict.',
  get_config: 'Read one configuration value from a node.',
  connect:
    'Connect an output port of one node to an input port of another. Fails on type mismatch or cycle.',
  disconnect_ports: 'Remove the edge between two specific ports.',
  disconnect_node: 'Remove every edge attached to a node.',
  list_nodes: 'List the nodes in the workflow with their ids, labels and types.',
  list_edges: 'List the edges in the workflow with source/target node ids and ports.',
  list_types:
    'List the node types that can be added, with their `typeId`, name and category. Call this before add_node.',
  info: 'Describe one node: type, position, current config, input and output ports, and connected edges.',
  undo: 'Undo the last change. Each tool call that changed the workflow is one undo step.',
  redo: 'Redo the last undone change.',
  auto_layout: 'Re-arrange all nodes automatically. Moves existing nodes.',
  beautify_layout: 'Tidy the layout of all nodes. Moves existing nodes.'
};

// ============================================================================
// view + batch
// ============================================================================

const VIEW_ACTIONS = [
  'select_node',
  'open_config',
  'fit_view',
  'zoom_in',
  'zoom_out',
  'zoom_to',
  'pan_to',
  'reset_view'
] as const;

type ViewAction = (typeof VIEW_ACTIONS)[number];

const VIEW_TO_COMMAND: Record<ViewAction, (typeof VIEW_COMMAND_TYPES)[number]> = {
  select_node: 'select_node',
  open_config: 'config_open',
  fit_view: 'canvas_fit_view',
  zoom_in: 'canvas_zoom_in',
  zoom_out: 'canvas_zoom_out',
  zoom_to: 'canvas_zoom_to',
  pan_to: 'canvas_pan_to',
  reset_view: 'canvas_reset_view'
};

const VIEW_SCHEMA: ToolInputSchema = object(
  {
    action: {
      type: 'string',
      enum: VIEW_ACTIONS,
      description:
        'select_node / open_config need nodeId; zoom_to needs level; pan_to needs position; the rest take nothing else.'
    },
    nodeId: nodeId('Node for select_node and open_config.'),
    level: {
      type: 'number',
      description: 'Zoom level for zoom_to (1 = 100%).',
      minimum: 0.1,
      maximum: 4
    },
    position: { ...position, description: 'Canvas position for pan_to.' }
  },
  ['action']
);

function buildViewCommand(args: Args): Command {
  const action = args.action as ViewAction;
  const requireArg = (key: string): void => {
    if (args[key] === undefined)
      throw new ToolArgumentError(`${key} is required for action "${action}"`);
  };
  switch (action) {
    case 'select_node':
      requireArg('nodeId');
      return { type: 'select_node', nodeId: args.nodeId as string };
    case 'open_config':
      requireArg('nodeId');
      return { type: 'config_open', nodeId: args.nodeId as string };
    case 'zoom_to':
      requireArg('level');
      return { type: 'canvas_zoom_to', level: args.level as number };
    case 'pan_to':
      requireArg('position');
      return { type: 'canvas_pan_to', position: args.position as Pos };
    default:
      return { type: VIEW_TO_COMMAND[action] } as Command;
  }
}

const BATCH_ITEM_TYPES: readonly string[] = [...EXPOSED_COMMAND_TYPES, 'view'];

const BATCH_SCHEMA: ToolInputSchema = object(
  {
    commands: {
      type: 'array',
      description:
        'Commands to run in order. Each item is the argument object of one tool plus a `type` naming that tool (without the prefix), e.g. {"type":"add_node","nodeTypeId":"llm_node"}. Read-only items are allowed but pointless here.',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: BATCH_ITEM_TYPES, description: 'Tool verb.' }
        },
        required: ['type'],
        additionalProperties: true
      }
    }
  },
  ['commands']
);

/** Build the command(s) for one tool verb from validated args. */
function commandsForVerb(verb: string, args: Args, viewEnabled: boolean): Command[] {
  if (verb === 'view') {
    if (!viewEnabled) throw new ToolArgumentError('view is not available in this editor');
    return [buildViewCommand(validateToolArgs(VIEW_SCHEMA, args))];
  }
  if ((EXPOSED_COMMAND_TYPES as readonly string[]).includes(verb)) {
    const type = verb as (typeof EXPOSED_COMMAND_TYPES)[number];
    return [COMMAND_BUILDERS[type](validateToolArgs(COMMAND_SCHEMAS[type], args))];
  }
  throw new ToolArgumentError(`unknown command type "${verb}"`);
}

function buildBatchCommands(args: Args, viewEnabled: boolean): Command[] {
  const items = args.commands as Args[];
  if (items.length === 0) throw new ToolArgumentError('commands must not be empty');
  return items.flatMap((item, i) => {
    const { type, ...rest } = item;
    try {
      return commandsForVerb(type as string, rest, viewEnabled);
    } catch (err) {
      if (err instanceof ToolArgumentError) {
        throw new ToolArgumentError(`commands[${i}] (${String(type)}): ${err.message}`);
      }
      throw err;
    }
  });
}

// ============================================================================
// Public API
// ============================================================================

export interface BuildDescriptorsOptions {
  /** Register the `view` tool. Default true. */
  view?: boolean;
}

/**
 * Build the descriptor list. Pure; call it as often as you like.
 */
export function buildToolDescriptors(options: BuildDescriptorsOptions = {}): ToolDescriptor[] {
  const viewEnabled = options.view ?? true;

  const singles: ToolDescriptor[] = EXPOSED_COMMAND_TYPES.map((type) => ({
    verb: type,
    description: COMMAND_DESCRIPTIONS[type],
    inputSchema: COMMAND_SCHEMAS[type],
    readOnly: !isMutatingCommand(type),
    toCommands: (args) => [COMMAND_BUILDERS[type](args)]
  }));

  const view: ToolDescriptor[] = viewEnabled
    ? [
        {
          verb: 'view',
          description:
            'Drive the editor view: select a node, open its config panel, or move the canvas viewport (fit, zoom, pan, reset). Changes nothing in the workflow.',
          inputSchema: VIEW_SCHEMA,
          // Classified as the chat panel classifies them: not in the read-only
          // set, so they pass through the gate.
          readOnly: false,
          toCommands: (args) => [buildViewCommand(args)]
        }
      ]
    : [];

  const batch: ToolDescriptor = {
    verb: 'batch',
    description:
      'Run several commands as one transaction: all succeed or none apply, and one undo reverts them all. Prefer this over many single calls when building a flow.',
    inputSchema: BATCH_SCHEMA,
    readOnly: false,
    toCommands: (args) => buildBatchCommands(args, viewEnabled)
  };

  return [...singles, ...view, batch];
}

// ============================================================================
// Human-readable summaries (for the confirm dialog)
// ============================================================================

const q = (v: unknown): string => JSON.stringify(v);

/** One line describing a command for a human about to approve it. */
export function describeCommand(command: Command): string {
  switch (command.type) {
    case 'add_node':
      return `Add node ${command.nodeTypeId}${command.position ? ` at (${command.position.x}, ${command.position.y})` : ''}`;
    case 'delete_node':
      return `Delete node ${command.nodeId}`;
    case 'rename_node':
      return `Rename ${command.nodeId} to ${q(command.label)}`;
    case 'move_node':
      return `Move ${command.nodeId} to (${command.position.x}, ${command.position.y})`;
    case 'swap_node':
      return `Swap ${command.nodeId} for a ${command.newTypeId}`;
    case 'set_config':
      return `Set ${command.nodeId}.${command.key} = ${command.value}`;
    case 'get_config':
      return `Read ${command.nodeId}.${command.key}`;
    case 'connect':
      return `Connect ${command.sourceNodeId}:${command.sourcePort} → ${command.targetNodeId}:${command.targetPort}`;
    case 'disconnect_ports':
      return `Disconnect ${command.sourceNodeId}:${command.sourcePort} → ${command.targetNodeId}:${command.targetPort}`;
    case 'disconnect_node':
      return `Disconnect every edge of ${command.nodeId}`;
    case 'list_nodes':
      return 'List nodes';
    case 'list_edges':
      return 'List edges';
    case 'list_types':
      return 'List node types';
    case 'info':
      return `Describe ${command.nodeId}`;
    case 'undo':
      return 'Undo';
    case 'redo':
      return 'Redo';
    case 'auto_layout':
      return `Auto-layout (${command.direction ?? 'horizontal'})`;
    case 'beautify_layout':
      return 'Beautify layout';
    case 'select_node':
      return `Select ${command.nodeId}`;
    case 'config_open':
      return `Open config of ${command.nodeId}`;
    case 'canvas_fit_view':
      return 'Fit view';
    case 'canvas_zoom_in':
      return 'Zoom in';
    case 'canvas_zoom_out':
      return 'Zoom out';
    case 'canvas_zoom_to':
      return `Zoom to ${command.level}`;
    case 'canvas_pan_to':
      return `Pan to (${command.position.x}, ${command.position.y})`;
    case 'canvas_reset_view':
      return 'Reset view';
    case 'clear':
      return 'Clear the workflow';
    case 'help':
      return 'Help';
  }
}
