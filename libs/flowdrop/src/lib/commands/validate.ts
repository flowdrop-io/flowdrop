/**
 * Shape check for a `Command` object handed in from outside the editor (the
 * mount API's `runCommand`). The parser only ever builds well-formed commands;
 * a host writing the object by hand, from plain JavaScript, may not, and the
 * executor trusts the shape.
 *
 * @module commands/validate
 */

import type { Command } from './types.js';

type FieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'point'
  /** A `{ nodeId, port }` object, or null. */
  | 'target'
  /** A Playground chat edit: an object with a known `kind`. */
  | 'chatEdit'
  | readonly string[];

interface FieldRules {
  required?: Record<string, FieldKind>;
  optional?: Record<string, FieldKind>;
}

const NODE_ID = { nodeId: 'string' } as const;
const GAPS = { gapX: 'number', gapY: 'number' } as const;
const PORTS = {
  sourceNodeId: 'string',
  sourcePort: 'string',
  targetNodeId: 'string',
  targetPort: 'string'
} as const;

const SIDE = ['input', 'output'] as const;
const ENTRY = { side: SIDE, id: 'string' } as const;

/** The fields of each Playground chat edit, by `kind` (`id` may also be null). */
const CHAT_EDITS: Record<
  string,
  { required?: Record<string, FieldKind | 'stringOrNull'>; optional?: Record<string, FieldKind> }
> = {
  input: {
    required: { key: ['message', 'history', 'session_id', 'message_id'], id: 'stringOrNull' },
    optional: { limit: 'number' }
  },
  limit: { required: { limit: 'number' } },
  reply: { required: { mode: ['add', 'remove'], nodeId: 'string', port: 'string' } },
  sub_replies: { required: { on: 'boolean' } },
  off: {},
  move_turns: {}
};

/** One entry per command type, so a new command cannot be added without its rules. */
const RULES: Record<Command['type'], FieldRules> = {
  add_node: { required: { nodeTypeId: 'string' }, optional: { position: 'point' } },
  delete_node: { required: NODE_ID },
  rename_node: { required: { ...NODE_ID, label: 'string' } },
  set_config: {
    required: { ...NODE_ID, key: 'string', value: 'string' },
    optional: { strict: 'boolean' }
  },
  get_config: { required: NODE_ID, optional: { key: 'string' } },
  connect: { required: PORTS },
  disconnect_ports: { required: PORTS },
  disconnect_node: { required: NODE_ID },
  list_nodes: {},
  list_edges: {},
  list_types: {},
  describe_type: { required: { nodeTypeId: 'string' } },
  search_types: { required: { query: 'string' } },
  info: { required: NODE_ID },
  undo: {},
  redo: {},
  config_open: { required: NODE_ID },
  select_node: { required: NODE_ID },
  help: { optional: { command: 'string' } },
  clear: { optional: { all: 'boolean' } },
  swap_node: { required: { ...NODE_ID, newTypeId: 'string' } },
  move_node: { required: { ...NODE_ID, position: 'point' } },
  auto_layout: { optional: { direction: ['horizontal', 'vertical'] } },
  beautify_layout: { optional: { dryRun: 'boolean', ...GAPS } },
  inspect_node_layout: { required: NODE_ID, optional: GAPS },
  beautify_node: {
    required: NODE_ID,
    optional: {
      strategy: ['column', 'ports', 'align', 'clear', 'all'],
      dryRun: 'boolean',
      ...GAPS
    }
  },
  canvas_fit_view: {},
  canvas_zoom_in: {},
  canvas_zoom_out: {},
  canvas_zoom_to: { required: { level: 'number' } },
  canvas_pan_to: { required: { position: 'point' } },
  canvas_reset_view: {},
  interface_list: {},
  interface_expose: {
    required: { ...NODE_ID, port: 'string' },
    optional: { id: 'string', side: SIDE }
  },
  interface_add: { required: ENTRY, optional: { dataType: 'string' } },
  interface_remove: { required: ENTRY },
  interface_rename: { required: { ...ENTRY, newId: 'string' } },
  interface_bind: { required: { ...ENTRY, target: 'target' } },
  interface_set: {
    required: {
      ...ENTRY,
      field: ['name', 'description', 'dataType', 'required', 'default', 'examples'],
      value: 'string'
    }
  },
  interface_pull: { required: ENTRY },
  interface_move: { required: { ...ENTRY, position: 'number' } },
  ports_list: { required: NODE_ID },
  ports_exposure: {
    required: { ...NODE_ID, mode: ['hide', 'show'] },
    optional: { port: 'string', side: SIDE }
  },
  ports_move: {
    required: { ...NODE_ID, port: 'string', position: 'number' },
    optional: { side: SIDE }
  },
  duplicate_node: { required: NODE_ID },
  workflow_get: {},
  workflow_set: { required: { field: ['name', 'description', 'format'], value: 'string' } },
  playground_get: {},
  playground_chat: { required: { edit: 'chatEdit' } }
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** What is wrong with a chat edit's fields, or null when it is well formed. */
function chatEditProblem(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'not an object';
  const edit = value as Record<string, unknown>;
  const kind = edit.kind;
  if (typeof kind !== 'string' || !Object.hasOwn(CHAT_EDITS, kind)) {
    return `unknown kind ${JSON.stringify(kind)}`;
  }
  const rules = CHAT_EDITS[kind];
  for (const [field, expected] of Object.entries(rules.required ?? {})) {
    const ok =
      expected === 'stringOrNull'
        ? edit[field] === null || typeof edit[field] === 'string'
        : matches(edit[field], expected);
    if (!ok)
      return `"${field}" must be ${expected === 'stringOrNull' ? 'a string or null' : describe(expected)}`;
  }
  for (const [field, expected] of Object.entries(rules.optional ?? {})) {
    if (edit[field] !== undefined && !matches(edit[field], expected)) {
      return `"${field}" must be ${describe(expected)} when given`;
    }
  }
  return null;
}

function matches(value: unknown, kind: FieldKind): boolean {
  if (Array.isArray(kind)) return typeof value === 'string' && kind.includes(value);
  switch (kind) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return isFiniteNumber(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'target': {
      if (value === null) return true;
      const target = value as { nodeId?: unknown; port?: unknown } | undefined;
      return (
        typeof target === 'object' &&
        typeof target.nodeId === 'string' &&
        typeof target.port === 'string'
      );
    }
    case 'chatEdit':
      return chatEditProblem(value) === null;
    case 'point': {
      const point = value as { x?: unknown; y?: unknown } | null;
      return (
        typeof point === 'object' &&
        point !== null &&
        isFiniteNumber(point.x) &&
        isFiniteNumber(point.y)
      );
    }
  }
  return false;
}

function describe(kind: FieldKind): string {
  if (Array.isArray(kind)) return `one of ${kind.map((k) => `"${k}"`).join(', ')}`;
  if (kind === 'point') return 'an { x, y } object of numbers';
  if (kind === 'target') return 'a { nodeId, port } object or null';
  if (kind === 'chatEdit')
    return 'a chat edit object (kind input, limit, reply, sub_replies, off or move_turns) with its fields';
  return `a ${kind}`;
}

/**
 * Check that `value` is a `Command` the executor can run: a known `type`, its
 * required fields present and every field it names of the right kind.
 * Returns the problem, or null when the command is well formed. Fields the
 * command does not define are ignored.
 */
export function validateCommand(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'A command is a console line or a Command object.';
  }
  const command = value as Record<string, unknown>;
  const type = command.type;
  if (typeof type !== 'string' || !Object.hasOwn(RULES, type)) {
    return `Unknown command type: ${JSON.stringify(type)}.`;
  }
  const rules = RULES[type as Command['type']];
  for (const [field, kind] of Object.entries(rules.required ?? {})) {
    if (!matches(command[field], kind)) {
      const detail = kind === 'chatEdit' ? chatEditProblem(command[field]) : null;
      return `${type}: "${field}" must be ${describe(kind)}${detail ? ` (${detail})` : ''}.`;
    }
  }
  for (const [field, kind] of Object.entries(rules.optional ?? {})) {
    if (command[field] !== undefined && !matches(command[field], kind)) {
      return `${type}: "${field}" must be ${describe(kind)} when given.`;
    }
  }
  return null;
}
