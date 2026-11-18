/**
 * Command Parser
 *
 * Parses DSL command strings into typed Command objects using
 * regex-based pattern matching with ordered rules (first match wins).
 *
 * @module commands/parser
 */

import type {
  BeautifyNodeCommand,
  BeautifyNodeStrategy,
  Command,
  InterfaceField,
  InterfaceSide,
  ParseResult
} from './types.js';
import { consoleRefusal } from './console.js';

// ============================================================================
// Parser Rules
// ============================================================================

type ParserRule = {
  pattern: RegExp;
  parse: (match: RegExpMatchArray) => Command;
};

/** The `--gap-x <n>` / `--gap-y <n>` flags of a matched flag run (the last of a repeated flag wins). */
function gapFlags(flags: string): { gapX?: number; gapY?: number } {
  const out: { gapX?: number; gapY?: number } = {};
  for (const [, axis, value] of flags.matchAll(/--gap-([xy])\s+(-?\d+(?:\.\d+)?)/gi)) {
    out[axis.toLowerCase() === 'x' ? 'gapX' : 'gapY'] = Number(value);
  }
  return out;
}

/**
 * Count the `"""` delimiters in a string, ignoring escaped ones.
 *
 * `\"""` is the escape for a literal triple-quote inside a value (unescaped
 * when the value is parsed), so it is content, not a delimiter. Occurrences are
 * counted non-overlapping, left to right — an odd total means a value was left
 * open.
 *
 * Shared with the chat response parser, which uses the same parity rule to
 * decide where a multiline value ends.
 */
export function countTripleQuotes(input: string): number {
  let count = 0;
  let i = 0;
  while (i <= input.length - 3) {
    if (input.startsWith('"""', i)) {
      if (i === 0 || input[i - 1] !== '\\') {
        count++;
      }
      i += 3;
    } else {
      i++;
    }
  }
  return count;
}

/**
 * Parse a coordinate pair like "200,300" or "-50, 100"
 */
function parseCoords(x: string, y: string): { x: number; y: number } {
  return { x: Number(x), y: Number(y) };
}

const dir = (value: string): InterfaceSide => value.toLowerCase() as InterfaceSide;

/** The interface fields `interface set` writes, by lower-case name. */
const INTERFACE_FIELDS: Record<string, InterfaceField> = {
  name: 'name',
  description: 'description',
  datatype: 'dataType',
  required: 'required',
  default: 'default',
  examples: 'examples'
};
const FIELD_ALT = 'name|description|dataType|required|default|examples';

/** A free-text value: `"…"` is JSON-unquoted (so `""` is empty), anything else is verbatim. */
function textValue(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === 'string') return parsed;
    } catch {
      // not JSON: keep it as typed
    }
  }
  return value;
}

/** A `"""…"""` block's content, as `set` unwraps it. */
const blockValue = (raw: string): string => raw.replace(/^\n|\n$/g, '').replace(/\\"""/g, '"""');

/** An input id or `none`. */
const inputIdOrNull = (raw: string): string | null => (raw.toLowerCase() === 'none' ? null : raw);

const rules: ParserRule[] = [
  // add <type> at <x>,<y>
  {
    pattern: /^add\s+(\S+)\s+at\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/i,
    parse: (m) => ({
      type: 'add_node',
      nodeTypeId: m[1],
      position: parseCoords(m[2], m[3])
    })
  },
  // add <type>
  {
    pattern: /^add\s+(\S+)$/i,
    parse: (m) => ({
      type: 'add_node',
      nodeTypeId: m[1]
    })
  },
  // delete <nodeId>
  {
    pattern: /^delete\s+(\S+)$/i,
    parse: (m) => ({
      type: 'delete_node',
      nodeId: m[1]
    })
  },
  // rename <nodeId> <label...>
  {
    pattern: /^rename\s+(\S+)\s+(.+)$/i,
    parse: (m) => ({
      type: 'rename_node',
      nodeId: m[1],
      label: m[2].trim()
    })
  },
  // set <nodeId>:<key> """<multiline value>"""
  {
    pattern: /^set\s+(\S+?):(\S+)\s+"""([\s\S]*)"""$/,
    parse: (m) => ({
      type: 'set_config',
      nodeId: m[1],
      key: m[2],
      // trim one leading/trailing newline added by the textarea wrapper,
      // then unescape \""" → """ (escape sequence for literal triple-quotes in content)
      value: m[3].replace(/^\n|\n$/g, '').replace(/\\"""/g, '"""')
    })
  },
  // set <nodeId>:<key> <value...>
  {
    pattern: /^set\s+(\S+?):(\S+)\s+(.+)$/i,
    parse: (m) => ({
      type: 'set_config',
      nodeId: m[1],
      key: m[2],
      value: m[3]
    })
  },
  // get <nodeId>:<key>
  {
    pattern: /^get\s+(\S+?):(\S+)$/i,
    parse: (m) => ({
      type: 'get_config',
      nodeId: m[1],
      key: m[2]
    })
  },
  // get <nodeId> — every config value plus the schema
  {
    pattern: /^get\s+([^\s:]+)$/i,
    parse: (m) => ({
      type: 'get_config',
      nodeId: m[1]
    })
  },
  // info <nodeId>
  {
    pattern: /^info\s+(\S+)$/i,
    parse: (m) => ({
      type: 'info',
      nodeId: m[1]
    })
  },
  // config <nodeId>
  {
    pattern: /^config\s+(\S+)$/i,
    parse: (m) => ({
      type: 'config_open',
      nodeId: m[1]
    })
  },
  // select <nodeId>
  {
    pattern: /^select\s+(\S+)$/i,
    parse: (m) => ({
      type: 'select_node',
      nodeId: m[1]
    })
  },
  // connect <nid>:<port> to <nid>:<port>
  {
    pattern: /^connect\s+(\S+?):(\S+)\s+to\s+(\S+?):(\S+)$/i,
    parse: (m) => ({
      type: 'connect',
      sourceNodeId: m[1],
      sourcePort: m[2],
      targetNodeId: m[3],
      targetPort: m[4]
    })
  },
  // disconnect <nid>:<port> from <nid>:<port>
  {
    pattern: /^disconnect\s+(\S+?):(\S+)\s+from\s+(\S+?):(\S+)$/i,
    parse: (m) => ({
      type: 'disconnect_ports',
      sourceNodeId: m[1],
      sourcePort: m[2],
      targetNodeId: m[3],
      targetPort: m[4]
    })
  },
  // disconnect <nodeId> (disconnect all)
  {
    pattern: /^disconnect\s+(\S+)$/i,
    parse: (m) => ({
      type: 'disconnect_node',
      nodeId: m[1]
    })
  },
  // list nodes
  {
    pattern: /^list\s+nodes$/i,
    parse: () => ({ type: 'list_nodes' })
  },
  // list edges
  {
    pattern: /^list\s+edges$/i,
    parse: () => ({ type: 'list_edges' })
  },
  // list types
  {
    pattern: /^list\s+types$/i,
    parse: () => ({ type: 'list_types' })
  },
  // describe <type>
  {
    pattern: /^describe\s+(\S+)$/i,
    parse: (m) => ({ type: 'describe_type', nodeTypeId: m[1] })
  },
  // search <text...>
  {
    pattern: /^search\s+(.+)$/i,
    parse: (m) => ({ type: 'search_types', query: m[1].trim() })
  },
  // undo
  {
    pattern: /^undo$/i,
    parse: () => ({ type: 'undo' })
  },
  // redo
  {
    pattern: /^redo$/i,
    parse: () => ({ type: 'redo' })
  },
  // help <command>
  {
    pattern: /^help\s+(\S+)$/i,
    parse: (m) => ({
      type: 'help',
      command: m[1]
    })
  },
  // help
  {
    pattern: /^help$/i,
    parse: () => ({ type: 'help' })
  },
  // clear [--all]
  {
    pattern: /^clear(\s+--all)?$/i,
    parse: (m) => (m[1] ? { type: 'clear', all: true } : { type: 'clear' })
  },
  // swap <nodeId> with <type> (Phase 2)
  {
    pattern: /^swap\s+(\S+)\s+with\s+(\S+)$/i,
    parse: (m) => ({
      type: 'swap_node',
      nodeId: m[1],
      newTypeId: m[2]
    })
  },
  // move <nodeId> to <x>,<y> (Phase 2)
  {
    pattern: /^move\s+(\S+)\s+to\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/i,
    parse: (m) => ({
      type: 'move_node',
      nodeId: m[1],
      position: parseCoords(m[2], m[3])
    })
  },
  // layout node inspect <nodeId> [--gap-x <n>] [--gap-y <n>]
  {
    pattern: /^layout\s+node\s+inspect\s+(\S+)((?:\s+--gap-[xy]\s+-?\d+(?:\.\d+)?)*)$/i,
    parse: (m) => ({ type: 'inspect_node_layout', nodeId: m[1], ...gapFlags(m[2]) })
  },
  // layout node beautify <nodeId> [column|ports|align|clear|all] [--dry-run] [--gap-x <n>] [--gap-y <n>]
  // The flags come in any order after the strategy.
  {
    pattern:
      /^layout\s+node\s+beautify\s+(\S+)(?:\s+(column|ports|align|clear|all))?((?:\s+(?:--dry-run|--gap-[xy]\s+-?\d+(?:\.\d+)?))*)$/i,
    parse: (m) => {
      const command: BeautifyNodeCommand = { type: 'beautify_node', nodeId: m[1] };
      if (m[2]) command.strategy = m[2].toLowerCase() as BeautifyNodeStrategy;
      if (/--dry-run/i.test(m[3])) command.dryRun = true;
      return { ...command, ...gapFlags(m[3]) };
    }
  },
  // layout auto [--direction horizontal|vertical] (Phase 2)
  {
    pattern: /^layout\s+auto\s+--direction\s+(horizontal|vertical)$/i,
    parse: (m) => ({
      type: 'auto_layout',
      direction: m[1].toLowerCase() as 'horizontal' | 'vertical'
    })
  },
  // layout auto (Phase 2)
  {
    pattern: /^layout\s+auto$/i,
    parse: () => ({ type: 'auto_layout' })
  },
  // layout beautify [--dry-run] [--gap-x <n>] [--gap-y <n>] — the graph sweep; the flags come in
  // any order. `--sweep` is accepted and changes nothing: the sweep is the default.
  {
    pattern: /^layout\s+beautify((?:\s+(?:--sweep|--dry-run|--gap-[xy]\s+-?\d+(?:\.\d+)?))*)$/i,
    parse: (m) => ({
      type: 'beautify_layout',
      ...(/--dry-run/i.test(m[1]) ? { dryRun: true } : {}),
      ...gapFlags(m[1])
    })
  },
  // interface [list]
  {
    pattern: /^interface(?:\s+list)?$/i,
    parse: () => ({ type: 'interface_list' })
  },
  // interface expose [input|output] <nid>:<port> [as <id>]
  {
    pattern: /^interface\s+expose\s+(?:(input|output)\s+)?(\S+?):(\S+)(?:\s+as\s+(\S+))?$/i,
    parse: (m) => ({
      type: 'interface_expose',
      nodeId: m[2],
      port: m[3],
      ...(m[1] ? { side: dir(m[1]) } : {}),
      ...(m[4] ? { id: m[4] } : {})
    })
  },
  // interface add <side> <id> [<dataType>]
  {
    pattern: /^interface\s+add\s+(input|output)\s+(\S+)(?:\s+(\S+))?$/i,
    parse: (m) => ({
      type: 'interface_add',
      side: dir(m[1]),
      id: m[2],
      ...(m[3] ? { dataType: m[3] } : {})
    })
  },
  // interface remove <side> <id>
  {
    pattern: /^interface\s+remove\s+(input|output)\s+(\S+)$/i,
    parse: (m) => ({ type: 'interface_remove', side: dir(m[1]), id: m[2] })
  },
  // interface rename <side> <id> to <newId>
  {
    pattern: /^interface\s+rename\s+(input|output)\s+(\S+)\s+to\s+(\S+)$/i,
    parse: (m) => ({
      type: 'interface_rename',
      side: dir(m[1]),
      id: m[2],
      newId: m[3]
    })
  },
  // interface bind <side> <id> to <nid>:<port>
  {
    pattern: /^interface\s+bind\s+(input|output)\s+(\S+)\s+to\s+(\S+?):(\S+)$/i,
    parse: (m) => ({
      type: 'interface_bind',
      side: dir(m[1]),
      id: m[2],
      target: { nodeId: m[3], port: m[4] }
    })
  },
  // interface unbind <side> <id>
  {
    pattern: /^interface\s+unbind\s+(input|output)\s+(\S+)$/i,
    parse: (m) => ({ type: 'interface_bind', side: dir(m[1]), id: m[2], target: null })
  },
  // interface set <side> <id>:<field> """<multiline value>"""
  {
    pattern: new RegExp(
      `^interface\\s+set\\s+(input|output)\\s+(\\S+):(${FIELD_ALT})\\s+"""([\\s\\S]*)"""$`,
      'i'
    ),
    parse: (m) => ({
      type: 'interface_set',
      side: dir(m[1]),
      id: m[2],
      field: INTERFACE_FIELDS[m[3].toLowerCase()],
      value: JSON.stringify(blockValue(m[4]))
    })
  },
  // interface set <side> <id>:<field> <value...>   (`none` or "" clears an optional field)
  {
    pattern: new RegExp(
      `^interface\\s+set\\s+(input|output)\\s+(\\S+):(${FIELD_ALT})\\s+(\\S[\\s\\S]*)$`,
      'i'
    ),
    parse: (m) => ({
      type: 'interface_set',
      side: dir(m[1]),
      id: m[2],
      field: INTERFACE_FIELDS[m[3].toLowerCase()],
      value: m[4].trim()
    })
  },
  // interface pull <side> <id>
  {
    pattern: /^interface\s+pull\s+(input|output)\s+(\S+)$/i,
    parse: (m) => ({ type: 'interface_pull', side: dir(m[1]), id: m[2] })
  },
  // interface move <side> <id> to <position>
  {
    pattern: /^interface\s+move\s+(input|output)\s+(\S+)\s+to\s+(\d+)$/i,
    parse: (m) => ({
      type: 'interface_move',
      side: dir(m[1]),
      id: m[2],
      position: Number(m[3])
    })
  },
  // ports hide|show [input|output] <nid>:<port>
  {
    pattern: /^ports\s+(hide|show)\s+(?:(input|output)\s+)?(\S+?):(\S+)$/i,
    parse: (m) => ({
      type: 'ports_exposure',
      mode: m[1].toLowerCase() as 'hide' | 'show',
      nodeId: m[3],
      port: m[4],
      ...(m[2] ? { side: dir(m[2]) } : {})
    })
  },
  // ports hide|show <nid>
  {
    pattern: /^ports\s+(hide|show)\s+([^\s:]+)$/i,
    parse: (m) => ({
      type: 'ports_exposure',
      mode: m[1].toLowerCase() as 'hide' | 'show',
      nodeId: m[2]
    })
  },
  // ports move [input|output] <nid>:<port> to <position>
  {
    pattern: /^ports\s+move\s+(?:(input|output)\s+)?(\S+?):(\S+)\s+to\s+(\d+)$/i,
    parse: (m) => ({
      type: 'ports_move',
      nodeId: m[2],
      port: m[3],
      position: Number(m[4]),
      ...(m[1] ? { side: dir(m[1]) } : {})
    })
  },
  // ports <nid>
  {
    pattern: /^ports\s+(?!(?:hide|show|move)\b)([^\s:]+)$/i,
    parse: (m) => ({ type: 'ports_list', nodeId: m[1] })
  },
  // duplicate <nid>
  {
    pattern: /^duplicate\s+(\S+)$/i,
    parse: (m) => ({ type: 'duplicate_node', nodeId: m[1] })
  },
  // workflow
  {
    pattern: /^workflow$/i,
    parse: () => ({ type: 'workflow_get' })
  },
  // workflow name """<text>"""
  {
    pattern: /^workflow\s+name\s+"""([\s\S]*)"""$/i,
    parse: (m) => ({ type: 'workflow_set', field: 'name', value: blockValue(m[1]) })
  },
  // workflow name <text>
  {
    pattern: /^workflow\s+name\s+(.+)$/i,
    parse: (m) => ({ type: 'workflow_set', field: 'name', value: textValue(m[1]) })
  },
  // workflow description """<multiline>"""
  {
    pattern: /^workflow\s+description\s+"""([\s\S]*)"""$/i,
    parse: (m) => ({ type: 'workflow_set', field: 'description', value: blockValue(m[1]) })
  },
  // workflow description <text>   (`none` or "" clears it; no text is a read)
  {
    pattern: /^workflow\s+description\s+(\S[\s\S]*)$/i,
    parse: (m) => ({
      type: 'workflow_set',
      field: 'description',
      value: /^none$/i.test(m[1].trim()) ? '' : textValue(m[1])
    })
  },
  {
    pattern: /^workflow\s+description$/i,
    parse: () => ({ type: 'workflow_get' })
  },
  // workflow format <id>
  {
    pattern: /^workflow\s+format\s+(\S+)$/i,
    parse: (m) => ({ type: 'workflow_set', field: 'format', value: m[1] })
  },
  // playground [chat]
  {
    pattern: /^playground(?:\s+chat)?$/i,
    parse: () => ({ type: 'playground_get' })
  },
  // playground chat off
  {
    pattern: /^playground\s+chat\s+off$/i,
    parse: () => ({ type: 'playground_chat', edit: { kind: 'off' } })
  },
  // playground chat move_turns
  {
    pattern: /^playground\s+chat\s+move_turns$/i,
    parse: () => ({ type: 'playground_chat', edit: { kind: 'move_turns' } })
  },
  // playground chat message|session_id|message_id <input>|none
  {
    pattern: /^playground\s+chat\s+(message|session_id|message_id)\s+(\S+)$/i,
    parse: (m) => ({
      type: 'playground_chat',
      edit: {
        kind: 'input',
        key: m[1].toLowerCase() as 'message' | 'session_id' | 'message_id',
        id: inputIdOrNull(m[2])
      }
    })
  },
  // playground chat history <input>|none [limit <n>]
  {
    pattern: /^playground\s+chat\s+history\s+(\S+)(?:\s+limit\s+(\d+))?$/i,
    parse: (m) => ({
      type: 'playground_chat',
      edit: {
        kind: 'input',
        key: 'history',
        id: inputIdOrNull(m[1]),
        ...(m[2] !== undefined ? { limit: Number(m[2]) } : {})
      }
    })
  },
  // playground chat limit <n>
  {
    pattern: /^playground\s+chat\s+limit\s+(\d+)$/i,
    parse: (m) => ({ type: 'playground_chat', edit: { kind: 'limit', limit: Number(m[1]) } })
  },
  // playground chat reply add|remove <nid>:<port>
  {
    pattern: /^playground\s+chat\s+reply\s+(add|remove)\s+(\S+?):(\S+)$/i,
    parse: (m) => ({
      type: 'playground_chat',
      edit: {
        kind: 'reply',
        mode: m[1].toLowerCase() as 'add' | 'remove',
        nodeId: m[2],
        port: m[3]
      }
    })
  },
  // playground chat sub_replies on|off
  {
    pattern: /^playground\s+chat\s+sub_replies\s+(on|off)$/i,
    parse: (m) => ({
      type: 'playground_chat',
      edit: { kind: 'sub_replies', on: m[1].toLowerCase() === 'on' }
    })
  },
  // canvas fitview | canvas fit
  {
    pattern: /^canvas\s+fit(?:\s*view)?$/i,
    parse: () => ({ type: 'canvas_fit_view' })
  },
  // canvas zoom in
  {
    pattern: /^canvas\s+zoom\s+in$/i,
    parse: () => ({ type: 'canvas_zoom_in' })
  },
  // canvas zoom out
  {
    pattern: /^canvas\s+zoom\s+out$/i,
    parse: () => ({ type: 'canvas_zoom_out' })
  },
  // canvas zoom <level>
  {
    pattern: /^canvas\s+zoom\s+(\d+(?:\.\d+)?)$/i,
    parse: (m) => ({ type: 'canvas_zoom_to', level: Number(m[1]) })
  },
  // canvas pan <x>,<y>
  {
    pattern: /^canvas\s+pan\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/i,
    parse: (m) => ({
      type: 'canvas_pan_to',
      position: parseCoords(m[1], m[2])
    })
  },
  // canvas reset
  {
    pattern: /^canvas\s+reset$/i,
    parse: () => ({ type: 'canvas_reset_view' })
  }
];

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a command string into a typed Command object.
 *
 * Command verbs are case-insensitive; identifiers are case-sensitive.
 * Returns ParseResult with ok: true on success, ok: false on failure.
 */
export function parseCommand(input: string): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, error: 'Empty command', input };
  }

  // Detect an unclosed multiline """ block — common when a low-quality LLM
  // omits the closing """. Delimiters come in pairs (escaped `\"""` excluded),
  // so an odd count means a value was left open, whether it was opened on its
  // own line or inline after the key. Surface a clear error instead of falling
  // through to a generic "Invalid syntax".
  if (countTripleQuotes(trimmed) % 2 === 1) {
    return {
      ok: false,
      error: 'Unclosed """ block — no matching closing """',
      input
    };
  }

  // The editor Console's own verbs (`session`, `mode`, `runs`, `save`, `export`)
  // are not editing commands. Say so, naming the WebMCP tool where one exists,
  // so an agent that reads this error knows what to use instead.
  const consoleError = consoleRefusal(trimmed);
  if (consoleError) return { ok: false, error: consoleError, input };

  for (const rule of rules) {
    const match = trimmed.match(rule.pattern);
    if (match) {
      return { ok: true, command: rule.parse(match) };
    }
  }

  // Extract verb for better error message
  const verb = trimmed.split(/\s+/)[0].toLowerCase();
  const knownVerbs = [
    'add',
    'delete',
    'rename',
    'set',
    'get',
    'info',
    'config',
    'select',
    'connect',
    'disconnect',
    'list',
    'describe',
    'search',
    'undo',
    'redo',
    'help',
    'clear',
    'swap',
    'move',
    'layout',
    'canvas',
    'interface',
    'ports',
    'duplicate',
    'workflow',
    'playground'
  ];

  if (knownVerbs.includes(verb)) {
    return { ok: false, error: `Invalid syntax for '${verb}' command`, input };
  }

  return { ok: false, error: `Unknown command: ${verb}`, input };
}
