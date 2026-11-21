/**
 * WebMCP adapter — tool descriptors.
 *
 * Maps the command union to `{verb, description, inputSchema, readOnly,
 * toCommands}` records. Transport-free: no DOM, no Svelte, nothing from the
 * runtime — so the same records can back a server-side MCP endpoint later.
 *
 * The schemas are written by hand next to the interfaces they mirror
 * (`commands/types.ts`). Each exposed command is one record in `COMMANDS`:
 * its description, its input schema, how validated arguments become the
 * command, and how the command reads back to a human in the confirm dialog.
 * The coverage test in `tests/unit/webmcp` asserts every literal of the
 * `Command` union is either exposed here or on the explicit exclusion list,
 * and that every exposed record carries all four parts, so a new DSL verb
 * cannot slip through unclassified or half-described.
 *
 * @module webmcp/descriptors
 */

import type {
  BeautifyNodeStrategy,
  Command,
  InterfaceField,
  InterfaceSide
} from '../commands/types.js';
import type { Messages } from '../messages/types.js';
import { isMutatingCommand, VIEW_COMMAND_TYPES } from '../chat/commandClassifier.js';
import {
  ToolArgumentError,
  type ToolDescriptor,
  type ToolInputSchema,
  type ToolSchemaProperty
} from './types.js';
import { validateToolArgs } from './validate.js';
import { LAYOUT_GRID } from '../layout/types.js';

export { validateToolArgs };

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
  'describe_type',
  'search_types',
  'info',
  'undo',
  'redo',
  'auto_layout',
  'beautify_layout',
  'inspect_node_layout',
  'beautify_node',
  'interface_expose',
  'interface_add',
  'interface_remove',
  'interface_rename',
  'interface_bind',
  'interface_set',
  'ports_exposure',
  'duplicate_node',
  'workflow_set'
] as const satisfies readonly Command['type'][];

/**
 * Command types folded into the single `view` tool (its `action` enum). The
 * list itself lives in the command classifier, next to `isViewCommand`, so
 * the chat panel and this adapter cannot disagree about what a view command is.
 */
export { VIEW_COMMAND_TYPES };

/**
 * The read commands folded into the single `inspect` tool (its `what`
 * argument): the interface, a node's ports, the workflow settings and the
 * Playground chat binding.
 */
export const INSPECT_COMMAND_TYPES = [
  'interface_list',
  'ports_list',
  'workflow_get',
  'playground_get'
] as const satisfies readonly Command['type'][];

/**
 * Command types reached only through tools that are not named after them:
 * `playground_chat`, as `playground_bind`, `playground_unbind` and
 * `playground_reply`. The chat's `sub_replies` switch and `move_turns`
 * migration are not offered here (the Playground settings and the Console
 * have them).
 */
export const SPLIT_COMMAND_TYPES = [
  'playground_chat'
] as const satisfies readonly Command['type'][];

/**
 * Command types deliberately not exposed.
 * - `clear` wipes the whole workflow; an agent can delete nodes one by one and
 *   each deletion is gated.
 * - `help` describes the text DSL; the tool schemas are the help.
 * - `interface_pull`, `interface_move` and `ports_move` are conveniences for a
 *   person at the Console (copy fields from a port, reorder): an agent sets
 *   the fields itself and order is cosmetic.
 */
export const EXCLUDED_COMMAND_TYPES = [
  'clear',
  'help',
  'interface_pull',
  'interface_move',
  'ports_move'
] as const satisfies readonly Command['type'][];

/**
 * Extra tool verbs that are not one command type each, in the order they are
 * registered after the single tools: `inspect` (four reads), `interface_unbind`,
 * the three `playground_*` chat tools, then `view` and `batch`.
 */
export const COMPOSITE_VERBS = [
  'inspect',
  'interface_unbind',
  'playground_bind',
  'playground_unbind',
  'playground_reply',
  'view',
  'batch'
] as const;

// ============================================================================
// Schema fragments
// ============================================================================

const NODE_ID_DESCRIPTION =
  'Node id in short form, e.g. "http_request.1" — the `nodeId` values returned by list_nodes and add_node. Full ids are accepted too.';

/**
 * The recommended call order, appended to the tools where it applies —
 * add_node, set_config, swap_node and batch, the ones that take a type or a
 * config key. For a browser agent the tool descriptions are the whole manual,
 * so the manual says how the tools fit together; saying it once per relevant
 * tool keeps the manual short.
 */
const CALL_ORDER =
  ' Call describe_type before adding or configuring a type you have not seen; group several changes in one batch; save when done.';

const portId: ToolSchemaProperty = { type: 'string' };
const bareNodeId: ToolSchemaProperty = { type: 'string' };

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
    { type: 'array' },
    { type: 'null' }
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

/** A layout gap in pixels, for the two `layout node` tools. */
const gapArg = (between: string): ToolSchemaProperty => ({
  type: 'integer',
  minimum: 0,
  multipleOf: LAYOUT_GRID,
  description: `Gap in px to keep between cards ${between}; a multiple of 20 (the layout grid, whatever the editor's grid size is). Default: the editor's layout gap setting.`
});

const sideArg: ToolSchemaProperty = { type: 'string', enum: ['input', 'output'] };

const entryIdArg: ToolSchemaProperty = { type: 'string', description: 'Entry id.' };

const INTERFACE_FIELDS = [
  'name',
  'description',
  'dataType',
  'required',
  'default',
  'examples'
] as const satisfies readonly InterfaceField[];

/** The interface entry fields that hold text, so `interface_set` takes a string for them. */
const TEXT_INTERFACE_FIELDS: ReadonlySet<string> = new Set(['name', 'description', 'dataType']);

const CHAT_FIELDS = ['message', 'history', 'session_id', 'message_id'] as const;

/** The raw `interface_set` token for a typed argument (an empty string clears the field). */
const interfaceValue = (value: unknown): string => encodeConfigValue(value);

// ============================================================================
// Argument → Command
// ============================================================================

type Args = Record<string, unknown>;
type Pos = { x: number; y: number };

/** The optional `gapX` / `gapY` arguments of the `layout node` tools, when given. */
const gapArgs = (a: Args): { gapX?: number; gapY?: number } => ({
  ...(typeof a.gapX === 'number' ? { gapX: a.gapX } : {}),
  ...(typeof a.gapY === 'number' ? { gapY: a.gapY } : {})
});

/**
 * `SetConfigCommand.value` is the DSL's raw token: the executor parses it with
 * the same rules the text DSL uses (`"…"` → string, bare `12` → number, `true`
 * → boolean, `{…}`/`[…]` → JSON). JSON-encoding every typed argument routes
 * each shape to the right rule, and keeps a string like `"true"` a string.
 */
function encodeConfigValue(value: unknown): string {
  return JSON.stringify(value);
}

type ExposedType = (typeof EXPOSED_COMMAND_TYPES)[number];

/** Everything the adapter knows about one exposed command. */
interface CommandRecord<K extends ExposedType> {
  /** What the tool does, for the agent. */
  description: string;
  /** The tool's input schema; `build` receives arguments validated against it. */
  inputSchema: ToolInputSchema;
  /** Validated arguments → the command. */
  build: (args: Args) => Extract<Command, { type: K }>;
  /** The command → one line for the person about to approve it. */
  summarize: (command: Extract<Command, { type: K }>) => string;
}

const q = (v: unknown): string => JSON.stringify(v);
const at = (p: Pos): string => `(${p.x}, ${p.y})`;

const PORT_PAIR = object(
  {
    sourceNodeId: nodeId('Node the edge starts at.'),
    sourcePort: port('Output'),
    targetNodeId: nodeId('Node the edge ends at.'),
    targetPort: port('Input')
  },
  ['sourceNodeId', 'sourcePort', 'targetNodeId', 'targetPort']
);

/** One record per exposed command, keyed by command type. */
const COMMANDS: { [K in ExposedType]: CommandRecord<K> } = {
  add_node: {
    description:
      "Add a node of the given type to the workflow. Returns the new node id; the node starts with the type's default config." +
      CALL_ORDER,
    inputSchema: object(
      {
        nodeTypeId: {
          type: 'string',
          description:
            'Node type id as returned by list_types / search_types (`typeId`), e.g. "http_request". Unknown ids fail and name near misses.'
        },
        position: {
          ...position,
          description: 'Optional canvas position; auto-placed when omitted.'
        }
      },
      ['nodeTypeId']
    ),
    build: (a) => ({
      type: 'add_node',
      nodeTypeId: a.nodeTypeId as string,
      ...(a.position ? { position: a.position as Pos } : {})
    }),
    summarize: (c) => `Add node ${c.nodeTypeId}${c.position ? ` at ${at(c.position)}` : ''}`
  },
  delete_node: {
    description: 'Delete a node and every edge attached to it.',
    inputSchema: object({ nodeId: nodeId() }, ['nodeId']),
    build: (a) => ({ type: 'delete_node', nodeId: a.nodeId as string }),
    summarize: (c) => `Delete node ${c.nodeId}`
  },
  rename_node: {
    description: 'Change the display label of a node.',
    inputSchema: object(
      { nodeId: nodeId(), label: { type: 'string', description: 'New display label.' } },
      ['nodeId', 'label']
    ),
    build: (a) => ({ type: 'rename_node', nodeId: a.nodeId as string, label: a.label as string }),
    summarize: (c) => `Rename ${c.nodeId} to ${q(c.label)}`
  },
  move_node: {
    description: 'Move a node to a canvas position.',
    inputSchema: object({ nodeId: nodeId(), position }, ['nodeId', 'position']),
    build: (a) => ({ type: 'move_node', nodeId: a.nodeId as string, position: a.position as Pos }),
    summarize: (c) => `Move ${c.nodeId} to ${at(c.position)}`
  },
  swap_node: {
    description:
      'Replace a node with one of another type, keeping compatible connections and config. Reports what was dropped.' +
      CALL_ORDER,
    inputSchema: object(
      {
        nodeId: nodeId('Node to replace.'),
        newTypeId: {
          type: 'string',
          description:
            'Replacement node type id (see list_types / describe_type). Compatible ports and config carry over.'
        }
      },
      ['nodeId', 'newTypeId']
    ),
    build: (a) => ({
      type: 'swap_node',
      nodeId: a.nodeId as string,
      newTypeId: a.newTypeId as string
    }),
    summarize: (c) => `Swap ${c.nodeId} for a ${c.newTypeId}`
  },
  set_config: {
    description:
      'Set one configuration value on a node. A value outside the enum, of the wrong type, or under a key the schema does not declare is stored with a warning that names the allowed values / keys — fatal only when strict.' +
      CALL_ORDER,
    inputSchema: object(
      {
        nodeId: nodeId(),
        key: {
          type: 'string',
          description:
            'Config key, as listed under `config` by describe_type (with type, enum and default) or get_config.'
        },
        value: configValue,
        strict: {
          type: 'boolean',
          description: 'When true, a value the schema rejects fails the call instead of warning.'
        }
      },
      ['nodeId', 'key', 'value']
    ),
    build: (a) => ({
      type: 'set_config',
      nodeId: a.nodeId as string,
      key: a.key as string,
      value: encodeConfigValue(a.value),
      ...(a.strict !== undefined ? { strict: a.strict as boolean } : {})
    }),
    summarize: (c) => `Set ${c.nodeId}.${c.key} = ${c.value}`
  },
  get_config: {
    description:
      'Read configuration from a node. With `key`: that value and its schema entry (type, enum, default). Without: every current value under `values` plus the whole config schema.',
    inputSchema: object(
      {
        nodeId: nodeId(),
        key: {
          type: 'string',
          description: 'Config key to read; omit for all values and the schema.'
        }
      },
      ['nodeId']
    ),
    build: (a) => ({
      type: 'get_config',
      nodeId: a.nodeId as string,
      ...(a.key !== undefined ? { key: a.key as string } : {})
    }),
    summarize: (c) =>
      c.key !== undefined ? `Read ${c.nodeId}.${c.key}` : `Read config of ${c.nodeId}`
  },
  connect: {
    description:
      'Connect an output port of one node to an input port of another. An unknown port fails and lists the ports on both sides; the existing edge is kept when the connection is already there.',
    inputSchema: PORT_PAIR,
    build: (a) => ({
      type: 'connect',
      sourceNodeId: a.sourceNodeId as string,
      sourcePort: a.sourcePort as string,
      targetNodeId: a.targetNodeId as string,
      targetPort: a.targetPort as string
    }),
    summarize: (c) =>
      `Connect ${c.sourceNodeId}:${c.sourcePort} → ${c.targetNodeId}:${c.targetPort}`
  },
  disconnect_ports: {
    description: 'Remove the edge between two specific ports.',
    inputSchema: PORT_PAIR,
    build: (a) => ({
      type: 'disconnect_ports',
      sourceNodeId: a.sourceNodeId as string,
      sourcePort: a.sourcePort as string,
      targetNodeId: a.targetNodeId as string,
      targetPort: a.targetPort as string
    }),
    summarize: (c) =>
      `Disconnect ${c.sourceNodeId}:${c.sourcePort} → ${c.targetNodeId}:${c.targetPort}`
  },
  disconnect_node: {
    description: 'Remove every edge attached to a node.',
    inputSchema: object({ nodeId: nodeId() }, ['nodeId']),
    build: (a) => ({ type: 'disconnect_node', nodeId: a.nodeId as string }),
    summarize: (c) => `Disconnect every edge of ${c.nodeId}`
  },
  list_nodes: {
    description: 'List the nodes in the workflow with their ids, labels and types.',
    inputSchema: EMPTY,
    build: () => ({ type: 'list_nodes' }),
    summarize: () => 'List nodes'
  },
  list_edges: {
    description: 'List the edges in the workflow with source/target node ids and ports.',
    inputSchema: EMPTY,
    build: () => ({ type: 'list_edges' }),
    summarize: () => 'List edges'
  },
  list_types: {
    description:
      'List every node type that can be added: `typeId`, name, category, description, tags. A type not in this list is unavailable in this editor. Use search_types to narrow, describe_type for ports and config.',
    inputSchema: EMPTY,
    build: () => ({ type: 'list_types' }),
    summarize: () => 'List node types'
  },
  describe_type: {
    description:
      'Describe one node type before using it: input and output ports (id, data type, required), config keys (type, enum, default, description), and — when the host publishes them — the confirmation policy (`ask` means a run pauses for a person at this node), what you may do with it (`can`) and host guidance (`agent`). Call this before add_node and set_config.',
    inputSchema: object(
      {
        nodeTypeId: {
          type: 'string',
          description:
            'Node type id (`typeId` from list_types / search_types), e.g. "http_request".'
        }
      },
      ['nodeTypeId']
    ),
    build: (a) => ({ type: 'describe_type', nodeTypeId: a.nodeTypeId as string }),
    summarize: (c) => `Describe type ${c.nodeTypeId}`
  },
  search_types: {
    description:
      'Find node types by a case-insensitive substring of their id, name, description or tags, e.g. "markdown" or "http". Returns the same rows as list_types.',
    inputSchema: object({ query: { type: 'string', description: 'Text to look for.' } }, ['query']),
    build: (a) => ({ type: 'search_types', query: a.query as string }),
    summarize: (c) => `Search types for ${q(c.query)}`
  },
  info: {
    description:
      "Describe one node instance: type, position, current config values, input and output ports, and connected edges. For the type's schema and defaults use describe_type.",
    inputSchema: object({ nodeId: nodeId() }, ['nodeId']),
    build: (a) => ({ type: 'info', nodeId: a.nodeId as string }),
    summarize: (c) => `Describe ${c.nodeId}`
  },
  undo: {
    description:
      'Undo the last change. Each tool call that changed the workflow is one undo step; a save cannot be undone.',
    inputSchema: EMPTY,
    build: () => ({ type: 'undo' }),
    summarize: () => 'Undo'
  },
  redo: {
    description: 'Redo the last undone change.',
    inputSchema: EMPTY,
    build: () => ({ type: 'redo' }),
    summarize: () => 'Redo'
  },
  auto_layout: {
    description: 'Re-arrange all nodes automatically. Moves existing nodes.',
    inputSchema: object({
      direction: {
        type: 'string',
        enum: ['horizontal', 'vertical'],
        description: 'Flow direction. Default horizontal.'
      }
    }),
    build: (a) => ({
      type: 'auto_layout',
      ...(a.direction ? { direction: a.direction as 'horizontal' | 'vertical' } : {})
    }),
    summarize: (c) => `Auto-layout (${c.direction ?? 'horizontal'})`
  },
  beautify_layout: {
    description:
      'Tidy the layout of all nodes. Moves existing nodes. Puts every node into its column, clears overlaps and tight spacing, reorders ports and straightens wires to cut crossings; prints one line per step and the score before and after, or says nothing improved. Refuses a graph of more than 120 nodes (code TOO_LARGE): tidy those one node at a time with beautify_node. Use dryRun to preview. gapX / gapY set the spacing to keep between cards for this call (default: the layout gap settings of the editor). One undo step.',
    inputSchema: object({
      dryRun: {
        type: 'boolean',
        description: 'Report the steps and the score without changing the workflow.'
      },
      gapX: gapArg('side by side'),
      gapY: gapArg('stacked')
    }),
    build: (a) => ({
      type: 'beautify_layout',
      ...(a.dryRun === true ? { dryRun: true } : {}),
      ...gapArgs(a)
    }),
    summarize: (c) => `${c.dryRun ? 'Preview tidy of' : 'Tidy'} layout`
  },
  inspect_node_layout: {
    description:
      'Report how one node sits on the canvas: for each wire, whether it is straight or off by how many pixels, plus crossings, overlaps and spacing. Changes nothing. Run it before beautify_node to see what is wrong. gapX / gapY set the spacing to judge against for this call (default: the layout gap settings of the editor).',
    inputSchema: object(
      { nodeId: nodeId(), gapX: gapArg('side by side'), gapY: gapArg('stacked') },
      ['nodeId']
    ),
    build: (a) => ({
      type: 'inspect_node_layout',
      nodeId: a.nodeId as string,
      ...gapArgs(a)
    }),
    summarize: (c) => `Inspect layout of ${c.nodeId}`
  },
  beautify_node: {
    description:
      'Tidy the layout of ONE node; no other node moves (notes and captions are never moved either, cards just keep clear of them). Strategies: column (x into its column), ports (reorder connected ports to cut crossings), align (y that straightens a wire), clear (y out of overlaps), all (those four in turn, the default). It says what changed and the score, or why nothing improved. Call inspect_node_layout first; use dryRun to preview without applying. gapX / gapY set the spacing to keep between cards for this call (default: the layout gap settings of the editor). One undo step.',
    inputSchema: object(
      {
        nodeId: nodeId(),
        strategy: {
          type: 'string',
          enum: ['column', 'ports', 'align', 'clear', 'all'],
          description: 'What to fix. Default all.'
        },
        dryRun: {
          type: 'boolean',
          description: 'Report the proposal and its score without changing the workflow.'
        },
        gapX: gapArg('side by side'),
        gapY: gapArg('stacked')
      },
      ['nodeId']
    ),
    build: (a) => ({
      type: 'beautify_node',
      nodeId: a.nodeId as string,
      ...(a.strategy ? { strategy: a.strategy as BeautifyNodeStrategy } : {}),
      ...(a.dryRun === true ? { dryRun: true } : {}),
      ...gapArgs(a)
    }),
    summarize: (c) =>
      `${c.dryRun ? 'Preview beautify of' : 'Beautify'} ${c.nodeId}${c.strategy ? ` (${c.strategy})` : ''}`
  },
  interface_expose: {
    description:
      'Publish a node port on the interface. Refuses an input with an incoming edge, a hidden port and control flow.',
    inputSchema: object(
      {
        nodeId: bareNodeId,
        port: portId,
        id: { type: 'string', description: 'Default: the port id.' },
        side: { ...sideArg, description: 'Only if the port exists on both sides.' }
      },
      ['nodeId', 'port']
    ),
    build: (a) => ({
      type: 'interface_expose',
      nodeId: a.nodeId as string,
      port: a.port as string,
      ...(a.id !== undefined ? { id: a.id as string } : {}),
      ...(a.side ? { side: a.side as InterfaceSide } : {})
    }),
    summarize: (c) => `Publish ${c.nodeId}:${c.port} on the interface${c.id ? ` as ${c.id}` : ''}`
  },
  interface_add: {
    description: 'Add an unbound interface entry (a one-word id); bind it with interface_bind.',
    inputSchema: object(
      {
        side: sideArg,
        id: { type: 'string', description: 'One word.' },
        dataType: { type: 'string' }
      },
      ['side', 'id']
    ),
    build: (a) => ({
      type: 'interface_add',
      side: a.side as InterfaceSide,
      id: a.id as string,
      ...(a.dataType !== undefined ? { dataType: a.dataType as string } : {})
    }),
    summarize: (c) => `Add interface ${c.side} ${c.id}`
  },
  interface_remove: {
    description: 'Remove an interface entry.',
    inputSchema: object({ side: sideArg, id: entryIdArg }, ['side', 'id']),
    build: (a) => ({
      type: 'interface_remove',
      side: a.side as InterfaceSide,
      id: a.id as string
    }),
    summarize: (c) => `Remove interface ${c.side} ${c.id}`
  },
  interface_rename: {
    description:
      'Rename an interface entry (breaks callers of the old id; the chat binding follows).',
    inputSchema: object(
      {
        side: sideArg,
        id: entryIdArg,
        newId: { type: 'string', description: 'One word.' }
      },
      ['side', 'id', 'newId']
    ),
    build: (a) => ({
      type: 'interface_rename',
      side: a.side as InterfaceSide,
      id: a.id as string,
      newId: a.newId as string
    }),
    summarize: (c) => `Rename interface ${c.side} ${c.id} to ${c.newId}`
  },
  interface_bind: {
    description:
      "Bind an interface entry to a node port (an empty data type takes the port's; a mismatch warns).",
    inputSchema: object(
      {
        side: sideArg,
        id: entryIdArg,
        target: {
          type: 'object',
          properties: { nodeId: bareNodeId, port: portId },
          required: ['nodeId', 'port'],
          additionalProperties: false
        }
      },
      ['side', 'id', 'target']
    ),
    build: (a) => {
      const t = a.target as { nodeId: string; port: string };
      return {
        type: 'interface_bind',
        side: a.side as InterfaceSide,
        id: a.id as string,
        target: { nodeId: t.nodeId, port: t.port }
      };
    },
    summarize: (c) =>
      c.target
        ? `Bind interface ${c.side} ${c.id} to ${c.target.nodeId}:${c.target.port}`
        : `Unbind interface ${c.side} ${c.id}`
  },
  interface_set: {
    description: 'Set one interface entry field; "" clears an optional one.',
    inputSchema: object(
      {
        side: sideArg,
        id: entryIdArg,
        field: { type: 'string', enum: INTERFACE_FIELDS },
        value: { anyOf: configValue.anyOf }
      },
      ['side', 'id', 'field', 'value']
    ),
    build: (a) => {
      // The text fields take a string only: `null` would be stored as the text
      // "null". An empty string is how an optional one is cleared.
      if (TEXT_INTERFACE_FIELDS.has(a.field as string) && typeof a.value !== 'string') {
        throw new ToolArgumentError(
          `${String(a.field)} takes a string; pass "" to clear it (null or a non-string is not accepted)`
        );
      }
      return {
        type: 'interface_set',
        side: a.side as InterfaceSide,
        id: a.id as string,
        field: a.field as InterfaceField,
        value: interfaceValue(a.value)
      };
    },
    summarize: (c) =>
      /^(none|"")$/i.test(c.value)
        ? `Clear ${c.field} of interface ${c.side} ${c.id}`
        : `Set ${c.field} of interface ${c.side} ${c.id} = ${c.value}`
  },
  ports_exposure: {
    description:
      'Hide or show a port; without `port`, all unconnected / all hidden ones. A wired, published or locked port cannot be hidden.',
    inputSchema: object(
      {
        nodeId: bareNodeId,
        mode: { type: 'string', enum: ['hide', 'show'] },
        port: { type: 'string', description: 'Omit for the whole node.' },
        side: { ...sideArg, description: 'Only if the port exists on both sides.' }
      },
      ['nodeId', 'mode']
    ),
    build: (a) => ({
      type: 'ports_exposure',
      nodeId: a.nodeId as string,
      mode: a.mode as 'hide' | 'show',
      ...(a.port !== undefined ? { port: a.port as string } : {}),
      ...(a.side ? { side: a.side as InterfaceSide } : {})
    }),
    summarize: (c) =>
      `${c.mode === 'hide' ? 'Hide' : 'Show'} ${c.port ? `port ${c.nodeId}:${c.port}` : `${c.mode === 'hide' ? 'unconnected' : 'hidden'} ports of ${c.nodeId}`}`
  },
  duplicate_node: {
    description:
      'Copy a node with its config, offset down-right; wires and interface bindings are not copied.',
    inputSchema: object({ nodeId: nodeId('Node to copy.') }, ['nodeId']),
    build: (a) => ({ type: 'duplicate_node', nodeId: a.nodeId as string }),
    summarize: (c) => `Duplicate ${c.nodeId}`
  },
  workflow_set: {
    description: 'Set the workflow name, description ("" clears it) or format.',
    inputSchema: object(
      {
        field: { type: 'string', enum: ['name', 'description', 'format'] },
        value: { type: 'string' }
      },
      ['field', 'value']
    ),
    build: (a) => ({
      type: 'workflow_set',
      field: a.field as 'name' | 'description' | 'format',
      value: a.value as string
    }),
    summarize: (c) => `Set workflow ${c.field}${c.value === '' ? ' (clear)' : ` to ${q(c.value)}`}`
  }
};

// ============================================================================
// Tools that are not one command each
// ============================================================================

interface CompositeRecord {
  description: string;
  inputSchema: ToolInputSchema;
  readOnly: boolean;
  build: (args: Args) => Command;
}

/**
 * `inspect` (four reads behind one `what`), `interface_unbind` and the
 * `playground_*` chat tools. Each has required arguments, so a missing one is
 * refused by the schema and never reads as "clear it".
 */
const COMPOSITES: Record<
  Exclude<(typeof COMPOSITE_VERBS)[number], 'view' | 'batch'>,
  CompositeRecord
> = {
  inspect: {
    description:
      'Read editor state: "interface" (entries, bindings), "ports" (of node nodeId), "workflow" (name, description, format) or "playground" (the chat binding).',
    inputSchema: object(
      {
        what: { type: 'string', enum: ['interface', 'ports', 'workflow', 'playground'] },
        nodeId: nodeId('The node, for what "ports".')
      },
      ['what']
    ),
    readOnly: true,
    build: (a) => {
      switch (a.what) {
        case 'interface':
          return { type: 'interface_list' };
        case 'workflow':
          return { type: 'workflow_get' };
        case 'playground':
          return { type: 'playground_get' };
        default:
          if (a.nodeId === undefined) {
            throw new ToolArgumentError('nodeId is required for what "ports"');
          }
          return { type: 'ports_list', nodeId: a.nodeId as string };
      }
    }
  },
  interface_unbind: {
    description: 'Unbind an interface entry from its port; the entry stays.',
    inputSchema: object({ side: sideArg, id: entryIdArg }, ['side', 'id']),
    readOnly: false,
    build: (a) => ({
      type: 'interface_bind',
      side: a.side as InterfaceSide,
      id: a.id as string,
      target: null
    })
  },
  playground_bind: {
    description:
      'Bind a chat field to an interface input; one input fills one field. history takes `limit`.',
    inputSchema: object(
      {
        field: { type: 'string', enum: CHAT_FIELDS },
        input: { type: 'string', description: 'Interface input id.' },
        limit: {
          type: 'integer',
          minimum: 1,
          description: 'History size; only with field "history".'
        }
      },
      ['field', 'input']
    ),
    readOnly: false,
    build: (a) => {
      if (a.limit !== undefined && a.field !== 'history') {
        throw new ToolArgumentError('limit applies only to field "history"');
      }
      return {
        type: 'playground_chat',
        edit: {
          kind: 'input',
          key: a.field as (typeof CHAT_FIELDS)[number],
          id: a.input as string,
          ...(typeof a.limit === 'number' ? { limit: a.limit } : {})
        }
      };
    }
  },
  playground_unbind: {
    description: 'Unbind a chat field, or with "all" switch the chat off.',
    inputSchema: object({ field: { type: 'string', enum: [...CHAT_FIELDS, 'all'] } }, ['field']),
    readOnly: false,
    build: (a) => ({
      type: 'playground_chat',
      edit:
        a.field === 'all'
          ? { kind: 'off' }
          : {
              kind: 'input',
              key: a.field as (typeof CHAT_FIELDS)[number],
              id: null
            }
    })
  },
  playground_reply: {
    description: 'Print a node output port as a chat reply (on: true) or stop (on: false).',
    inputSchema: object(
      {
        nodeId: bareNodeId,
        port: portId,
        on: { type: 'boolean' }
      },
      ['nodeId', 'port', 'on']
    ),
    readOnly: false,
    build: (a) => ({
      type: 'playground_chat',
      edit: {
        kind: 'reply',
        mode: a.on === true ? 'add' : 'remove',
        nodeId: a.nodeId as string,
        port: a.port as string
      }
    })
  }
};

/** The record for one exposed command — for tests that check its shape. */
export function commandRecord(type: ExposedType): {
  description: string;
  inputSchema: ToolInputSchema;
  build: (args: Args) => Command;
  summarize: (command: Command) => string;
} {
  return COMMANDS[type] as unknown as ReturnType<typeof commandRecord>;
}

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

const BATCH_ITEM_TYPES: readonly string[] = [
  ...EXPOSED_COMMAND_TYPES,
  ...COMPOSITE_VERBS.filter((verb) => verb !== 'batch')
];

const BATCH_SCHEMA: ToolInputSchema = object(
  {
    commands: {
      type: 'array',
      description:
        'Commands to run in order. Each item is the argument object of one tool plus a `type` naming that tool (without the prefix), e.g. {"type":"add_node","nodeTypeId":"http_request"}. Read-only items are allowed but pointless here.',
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
    const record = COMMANDS[verb as ExposedType];
    return [record.build(validateToolArgs(record.inputSchema, args))];
  }
  if (Object.hasOwn(COMPOSITES, verb)) {
    const record = COMPOSITES[verb as keyof typeof COMPOSITES];
    return [record.build(validateToolArgs(record.inputSchema, args))];
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

  const singles: ToolDescriptor[] = EXPOSED_COMMAND_TYPES.map((type) => {
    const record = COMMANDS[type];
    return {
      verb: type,
      description: record.description,
      inputSchema: record.inputSchema,
      readOnly: !isMutatingCommand(type),
      toCommands: (args) => [record.build(args)]
    };
  });

  const composites: ToolDescriptor[] = (
    Object.keys(COMPOSITES) as Array<keyof typeof COMPOSITES>
  ).map((verb) => {
    const record = COMPOSITES[verb];
    return {
      verb,
      description: record.description,
      inputSchema: record.inputSchema,
      readOnly: record.readOnly,
      toCommands: (args) => [record.build(args)]
    };
  });

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
      'Run several commands as one transaction: all succeed or none apply, one approval covers them all, and one undo reverts them all. Prefer this over many single calls when building a flow — describe the types first, batch the adds, connects and set_configs, then save.',
    inputSchema: BATCH_SCHEMA,
    readOnly: false,
    toCommands: (args) => buildBatchCommands(args, viewEnabled)
  };

  return [...singles, ...composites, ...view, batch];
}

// ============================================================================
// Human-readable summaries (for the confirm dialog)
// ============================================================================

type ViewCommandType = (typeof VIEW_COMMAND_TYPES)[number];
type ExcludedCommandType = (typeof EXCLUDED_COMMAND_TYPES)[number];
type InspectCommandType = (typeof INSPECT_COMMAND_TYPES)[number];
type SplitCommandType = (typeof SPLIT_COMMAND_TYPES)[number];

/** The chat edit as one line. */
function summarizeChatEdit(e: Extract<Command, { type: 'playground_chat' }>['edit']): string {
  switch (e.kind) {
    case 'input':
      return e.id === null
        ? `Unbind chat ${e.key}`
        : `Bind chat ${e.key} to input ${e.id}${e.limit !== undefined ? ` (limit ${e.limit})` : ''}`;
    case 'limit':
      return `Set chat history limit to ${e.limit}`;
    case 'reply':
      return `${e.mode === 'add' ? 'Add' : 'Remove'} chat reply ${e.nodeId}:${e.port}`;
    case 'sub_replies':
      return `Turn chat sub-workflow replies ${e.on ? 'on' : 'off'}`;
    case 'off':
      return 'Switch the chat off';
    case 'move_turns':
      return 'Move interface turn marks into the Playground settings';
  }
}

/**
 * Summaries for the commands that are not one tool each: the view actions
 * (folded into `view`), the reads folded into `inspect`, the chat edits behind
 * the `playground_*` tools, and the excluded verbs (Console-only or withheld),
 * which can still appear in a command list a host asks the gate about.
 */
const OTHER_SUMMARIES: {
  [K in ViewCommandType | ExcludedCommandType | InspectCommandType | SplitCommandType]: (
    command: Extract<Command, { type: K }>
  ) => string;
} = {
  interface_list: () => 'List the interface',
  ports_list: (c) => `List ports of ${c.nodeId}`,
  workflow_get: () => 'Read the workflow settings',
  playground_get: () => 'Read the Playground chat binding',
  playground_chat: (c) => summarizeChatEdit(c.edit),
  interface_pull: (c) => `Pull the fields of interface ${c.side} ${c.id} from its port`,
  interface_move: (c) => `Move interface ${c.side} ${c.id} to position ${c.position}`,
  ports_move: (c) => `Move port ${c.nodeId}:${c.port} to position ${c.position}`,
  select_node: (c) => `Select ${c.nodeId}`,
  config_open: (c) => `Open config of ${c.nodeId}`,
  canvas_fit_view: () => 'Fit view',
  canvas_zoom_in: () => 'Zoom in',
  canvas_zoom_out: () => 'Zoom out',
  canvas_zoom_to: (c) => `Zoom to ${c.level}`,
  canvas_pan_to: (c) => `Pan to ${at(c.position)}`,
  canvas_reset_view: () => 'Reset view',
  clear: () => 'Clear the workflow',
  help: () => 'Help'
};

/** One line describing a command for a human about to approve it. */
export function describeCommand(command: Command): string {
  const type = command.type;
  if (type in COMMANDS) {
    return (COMMANDS[type as ExposedType].summarize as (c: Command) => string)(command);
  }
  return (OTHER_SUMMARIES[type as keyof typeof OTHER_SUMMARIES] as (c: Command) => string)(command);
}

/**
 * One sentence saying what a list of commands does, for the approval dialog's hint and the chat transcript:
 * "3 changes — adds 2 nodes, connects 1 edge. Applied together, undone together."
 * Returns `undefined` for a single command, whose one line already says it all.
 */
export function summarizeCommands(commands: Command[], m: Messages['webmcp']): string | undefined {
  if (commands.length < 2) return undefined;
  let adds = 0;
  let deletes = 0;
  let connects = 0;
  let disconnects = 0;
  let configs = 0;
  let other = 0;
  for (const c of commands) {
    switch (c.type) {
      case 'add_node':
        adds++;
        break;
      case 'delete_node':
        deletes++;
        break;
      case 'connect':
        connects++;
        break;
      case 'disconnect_ports':
      case 'disconnect_node':
        disconnects++;
        break;
      case 'set_config':
        configs++;
        break;
      default:
        other++;
    }
  }
  const parts: string[] = [];
  if (adds) parts.push(m.summaryAdds({ count: adds }));
  if (deletes) parts.push(m.summaryDeletes({ count: deletes }));
  if (connects) parts.push(m.summaryConnects({ count: connects }));
  if (disconnects) parts.push(m.summaryDisconnects({ count: disconnects }));
  if (configs) parts.push(m.summaryConfigs({ count: configs }));
  if (other) parts.push(m.summaryOther({ count: other }));
  return m.batchSummary({ count: commands.length, parts: parts.join(', ') });
}
