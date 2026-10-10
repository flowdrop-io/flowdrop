/**
 * Console output highlighting.
 *
 * `highlightConsoleEntry` splits one console entry into role-tagged segments
 * for the terminal surface. It is purely presentational:
 *
 * - The segments' text, joined, is always exactly `entry.text`. It never adds,
 *   drops or reorders a character, so what the panel's `innerText` shows (and
 *   what an AI agent reads from it) is the plain output.
 * - Every output shape the command layer produces is handled by a rule below.
 *   A line that fits no rule stays plain (`role: null`); nothing is guessed.
 * - Roles are semantic, not colours. The colours are `--fd-console-*` tokens.
 */

export type ConsoleRole =
  | 'prompt'
  | 'verb'
  | 'arg'
  | 'id'
  | 'header'
  | 'rule'
  | 'key'
  | 'eq'
  | 'string'
  | 'number'
  | 'punct'
  | 'error'
  | 'muted';

export interface ConsoleSegment {
  role: ConsoleRole | null;
  text: string;
}

/** The shape of a console entry this util reads (see `ConsoleOutput.svelte`). */
export interface ConsoleEntryLike {
  type: 'input' | 'success' | 'error' | 'formatted';
  text: string;
}

type Out = ConsoleSegment[];

/** Node ids are `type.N` (`data_shaper.1`); not part of a longer word or number. */
const NODE_ID = /(?<![\w.])(?!v\d+\.\d)[a-z][a-z0-9_]*\.\d+(?![\w]|\.\d)/g;
const RULE_LINE = /^-+(?: {2}-+)*$/;
/** Section headings: `Inputs:`, `Config:`, `Session (editor Console only):`, `  Outputs:`. */
const HEADING_LINE = /^(\s*)([A-Z][^:\n]*:)$/;

function push(out: Out, role: ConsoleRole | null, text: string): void {
  if (text === '') return;
  const last = out[out.length - 1];
  if (last && last.role === role) last.text += text;
  else out.push({ role, text });
}

/** Text with node ids picked out; everything else keeps `base`. */
function withIds(out: Out, text: string, base: ConsoleRole | null): void {
  let last = 0;
  for (const m of text.matchAll(NODE_ID)) {
    push(out, base, text.slice(last, m.index));
    push(out, 'id', m[0]);
    last = m.index + m[0].length;
  }
  push(out, base, text.slice(last));
}

/**
 * A JSON-ish value as the commands print it (`JSON.stringify` output, or a
 * quoted string). Unbalanced quotes and any other character fall through to
 * plain `arg` text, so the lexer is total.
 */
function valueTokens(out: Out, text: string): void {
  const re =
    /("(?:[^"\\]|\\.)*")|((?<![\w.])-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\w.]))|([{}[\],:])|([^"{}[\],:\d-]+|[\s\S])/g;
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined) push(out, 'string', m[0]);
    else if (m[2] !== undefined) push(out, 'number', m[0]);
    else if (m[3] !== undefined) push(out, 'punct', m[0]);
    else push(out, 'arg', m[0]);
  }
}

/** `> verb args`: the first word is the verb, node ids in the rest stand out. */
function inputLine(out: Out, text: string): void {
  const m = /^(\s*)(\S+)([\s\S]*)$/.exec(text);
  if (!m) {
    push(out, null, text);
    return;
  }
  push(out, null, m[1]);
  push(out, 'verb', m[2]);
  withIds(out, m[3], 'arg');
}

/** Per-table cell roles, keyed by the header's column names. */
function columnRoles(names: string[]): Array<ConsoleRole | null> | null {
  const key = names.join('|').toLowerCase();
  switch (key) {
    case 'id|label|type': // list nodes
    case 'type id|name|category': // list types, search types
      return ['id', null, 'muted'];
    case 'name|syntax|description': // help
      return ['verb', 'arg', 'muted'];
    case 'source|port||target|port': // list edges
      return ['id', null, 'punct', 'id', null];
    default:
      return null;
  }
}

/** One data row, cut at the rule's column starts so nothing is re-parsed. */
function tableRow(
  out: Out,
  line: string,
  starts: number[],
  roles: Array<ConsoleRole | null> | null
): void {
  if (!roles) {
    withIds(out, line, null);
    return;
  }
  starts.forEach((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : line.length;
    const cell = line.slice(start, end);
    const content = cell.trimEnd();
    push(out, roles[i] ?? null, content);
    push(out, null, cell.slice(content.length));
  });
}

type Section = 'config' | 'edges' | 'other';

/** A single prose line (messages, key/value blocks, port lists, edge lists). */
function proseLine(out: Out, line: string, section: Section): Section {
  if (line === '') return section;

  const heading = HEADING_LINE.exec(line);
  if (heading) {
    push(out, null, heading[1]);
    push(out, 'header', heading[2]);
    const name = heading[2].slice(0, -1);
    return name === 'Config' ? 'config' : name === 'Edges' ? 'edges' : 'other';
  }

  if (/^\s*\(none\)$/.test(line)) {
    push(out, 'muted', line);
    return section;
  }

  // `config: key = value, key = value` (get <id> with no key)
  const cfg = /^(.*?)( config: )([\s\S]*)$/.exec(line);
  if (cfg && new RegExp(`^${NODE_ID.source}$`).test(cfg[1])) {
    withIds(out, cfg[1], null);
    push(out, 'key', cfg[2]);
    configPairs(out, cfg[3]);
    return section;
  }

  // `Set id:key = value` / `id:key = value`
  const set = new RegExp(`^(Set )?(${NODE_ID.source}):(\\S+)( = )([\\s\\S]*)$`).exec(line);
  if (set) {
    push(out, null, set[1] ?? '');
    push(out, 'id', set[2]);
    push(out, 'punct', ':');
    push(out, 'key', set[3]);
    push(out, 'eq', set[4]);
    valueTokens(out, set[5]);
    return section;
  }

  // Header fields of describe / info: `Node:     id`
  const field =
    /^(Type|Name|Category|Description|Tags|Confirmation|Node|Label|Position):(\s+)(.*)$/.exec(line);
  if (field) {
    push(out, 'key', field[1] + ':');
    push(out, null, field[2]);
    const value = field[3];
    if (field[1] === 'Node' || field[1] === 'Type') push(out, 'id', value);
    else push(out, null, value);
    return section;
  }

  // Port and config-schema lines: `  portId (dataType) required — help`
  const port = /^(\s+)(\S+) (\([^)]*\))([\s\S]*)$/.exec(line);
  if (port) {
    push(out, null, port[1]);
    push(out, section === 'config' ? 'key' : 'arg', port[2]);
    push(out, null, ' ');
    push(out, 'muted', port[3]);
    const rest = port[4];
    const dash = rest.indexOf(' — ');
    if (dash < 0) push(out, null, rest);
    else {
      push(out, null, rest.slice(0, dash));
      push(out, 'muted', rest.slice(dash));
    }
    return section;
  }

  // info config values: `  key: "value"`
  if (section === 'config') {
    const kv = /^(\s+)([^\s:]+)(:)( )([\s\S]*)$/.exec(line);
    if (kv) {
      push(out, null, kv[1]);
      push(out, 'key', kv[2]);
      push(out, 'punct', kv[3]);
      push(out, null, kv[4]);
      valueTokens(out, kv[5]);
      return section;
    }
  }

  // info edges: `  remote:port -> local` / `  local -> remote:port`
  if (section === 'edges') {
    const edge = /^(\s+)(\S+) -> (\S+)$/.exec(line);
    if (edge) {
      push(out, null, edge[1]);
      edgeEnd(out, edge[2]);
      push(out, null, ' ');
      push(out, 'punct', '->');
      push(out, null, ' ');
      edgeEnd(out, edge[3]);
      return section;
    }
  }

  // `a.1:out → b.1:in`, `Deleted node a.1`, `Renamed a.1 to "x"` …
  withIds(out, line, null);
  return section;
}

function edgeEnd(out: Out, end: string): void {
  const i = end.indexOf(':');
  if (i < 0) {
    push(out, 'arg', end);
    return;
  }
  push(out, 'id', end.slice(0, i));
  push(out, 'punct', ':');
  push(out, 'arg', end.slice(i + 1));
}

/** `key = value, key = value`, values being JSON. */
function configPairs(out: Out, body: string): void {
  const re = /(\w+)( = )([\s\S]*?)(?=(?:, \w+ = )|$)/g;
  let last = 0;
  for (const m of body.matchAll(re)) {
    if (m[0] === '') continue;
    push(out, null, body.slice(last, m.index));
    push(out, 'key', m[1]);
    push(out, 'eq', m[2]);
    valueTokens(out, m[3]);
    last = m.index + m[0].length;
  }
  push(out, null, body.slice(last));
}

function blockText(out: Out, text: string): void {
  const lines = text.split('\n');
  let section: Section = 'other';
  let i = 0;
  while (i < lines.length) {
    if (i > 0) push(out, null, '\n');
    const line = lines[i];
    const next = lines[i + 1];
    if (line.trim() !== '' && next !== undefined && RULE_LINE.test(next) && !RULE_LINE.test(line)) {
      // A table: header, rule, rows up to the next blank line.
      const starts = [...next.matchAll(/-+/g)].map((m) => m.index);
      const names = starts.map((start, c) =>
        line.slice(start, c + 1 < starts.length ? starts[c + 1] : line.length).trim()
      );
      const roles = columnRoles(names);
      push(out, 'header', line);
      push(out, null, '\n');
      push(out, 'rule', next);
      i += 2;
      while (i < lines.length && lines[i] !== '') {
        push(out, null, '\n');
        tableRow(out, lines[i], starts, roles);
        i++;
      }
      section = 'other';
      continue;
    }
    section = proseLine(out, line, section);
    i++;
  }
}

/**
 * Role-tagged segments for one console entry. `segments.map(s => s.text).join('')`
 * is always `entry.text`.
 */
export function highlightConsoleEntry(entry: ConsoleEntryLike): ConsoleSegment[] {
  const text = entry.text;
  if (text === '') return [];
  const out: Out = [];
  try {
    if (entry.type === 'input') inputLine(out, text);
    else if (entry.type === 'error') push(out, 'error', text);
    else blockText(out, text);
  } catch {
    return [{ role: null, text }];
  }
  // The invariant is the contract: if a rule ever lost a character, show plain.
  if (out.map((s) => s.text).join('') !== text) return [{ role: null, text }];
  return out;
}
