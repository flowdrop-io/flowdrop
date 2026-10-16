import { describe, it, expect } from 'vitest';
import {
  highlightConsoleEntry,
  type ConsoleEntryLike,
  type ConsoleSegment
} from '../../../src/lib/utils/consoleHighlight';

const joined = (segs: ConsoleSegment[]) => segs.map((s) => s.text).join('');
/** Role of the segment equal to `text`, else of the first segment containing it. */
const roleOf = (segs: ConsoleSegment[], text: string) =>
  (segs.find((s) => s.text === text) ?? segs.find((s) => s.text.includes(text)))?.role;
const hl = (type: ConsoleEntryLike['type'], text: string) => {
  const segs = highlightConsoleEntry({ type, text });
  expect(joined(segs)).toBe(text);
  return segs;
};

const LIST_NODES = [
  'ID                   Label             Type             ',
  '-------------------  ----------------  -----------------',
  'prompt_template.1    Prompt Template   prompt_template  ',
  'data_shaper.1        Data Shaper       data_shaper      ',
  'workflow_executor.1  Workflow Executor workflow_executor'
].join('\n');

describe('highlightConsoleEntry', () => {
  it('returns nothing for empty text', () => {
    expect(highlightConsoleEntry({ type: 'success', text: '' })).toEqual([]);
    expect(highlightConsoleEntry({ type: 'input', text: '' })).toEqual([]);
    expect(highlightConsoleEntry({ type: 'formatted', text: '' })).toEqual([]);
  });

  it('input line: verb, then args with node ids picked out', () => {
    const segs = hl('input', 'get data_shaper.1 mapping');
    expect(segs[0]).toEqual({ role: 'verb', text: 'get' });
    expect(roleOf(segs, 'data_shaper.1')).toBe('id');
    expect(roleOf(segs, ' mapping')).toBe('arg');
  });

  it('input line with only a verb', () => {
    expect(hl('input', 'help')).toEqual([{ role: 'verb', text: 'help' }]);
  });

  it('list nodes: header, rule, ids in column 1, last column muted', () => {
    const segs = hl('formatted', LIST_NODES);
    const lines = LIST_NODES.split('\n');
    expect(segs[0]).toEqual({ role: 'header', text: lines[0] });
    expect(roleOf(segs, lines[1])).toBe('rule');
    expect(roleOf(segs, 'prompt_template.1')).toBe('id');
    expect(roleOf(segs, 'data_shaper.1')).toBe('id');
    expect(roleOf(segs, 'workflow_executor.1')).toBe('id');
    // Column 3 is muted (cell text only; padding stays plain)
    expect(segs.filter((s) => s.role === 'muted').map((s) => s.text)).toEqual([
      'prompt_template',
      'data_shaper',
      'workflow_executor'
    ]);
    // The Label column is plain
    expect(segs.some((s) => s.role === null && s.text.includes('Data Shaper'))).toBe(true);
  });

  it('list nodes with non-numeric ids still marks column 1 as ids', () => {
    const text = [
      'ID           Label        Type       ',
      '-----------  -----------  -----------',
      'node-input   Text Input   text_input ',
      'node-output  Text Output  text_output'
    ].join('\n');
    const segs = hl('formatted', text);
    expect(roleOf(segs, 'node-input')).toBe('id');
    expect(roleOf(segs, 'text_output')).toBe('muted');
  });

  it('list types: type ids in column 1, category muted', () => {
    const text = [
      'Type ID      Name         Category  ',
      '-----------  -----------  ----------',
      'text_input   Text Input   inputs    ',
      'calculator   Calculator   processing'
    ].join('\n');
    const segs = hl('formatted', text);
    expect(roleOf(segs, 'text_input')).toBe('id');
    expect(roleOf(segs, 'processing')).toBe('muted');
  });

  it('list edges: ids, arrow punct, ports plain (nothing muted)', () => {
    const text = [
      'Source      Port       Target       Port ',
      '----------  -----  --  -----------  -----',
      'node-input  value  ->  node-output  value'
    ].join('\n');
    const segs = hl('formatted', text);
    expect(roleOf(segs, 'node-input')).toBe('id');
    expect(roleOf(segs, 'node-output')).toBe('id');
    expect(roleOf(segs, '->')).toBe('punct');
    expect(segs.some((s) => s.role === 'muted')).toBe(false);
  });

  it('help table: verbs, syntax, muted description; session section heading', () => {
    const text = [
      'Session (editor Console only):',
      'Name          Syntax                    Description    ',
      '------------  ------------------------  ---------------',
      'session send  session send "<message>"  Send a chat turn',
      'session stop  session stop              Stop the run    '
    ].join('\n');
    const segs = hl('formatted', text);
    expect(segs[0]).toEqual({ role: 'header', text: 'Session (editor Console only):' });
    expect(roleOf(segs, 'session send')).toBe('verb');
    expect(roleOf(segs, 'session send "<message>"')).toBe('arg');
    expect(roleOf(segs, 'Send a chat turn')).toBe('muted');
  });

  it('get <id> config line: keys, equals, strings, numbers, brackets', () => {
    const text =
      'data_shaper.1 config: mapping = {"id":"[entity_id]","n":-3.5,"ok":[1,2]}, validationMode = "soft"';
    const segs = hl('success', text);
    expect(segs[0]).toEqual({ role: 'id', text: 'data_shaper.1' });
    expect(roleOf(segs, ' config: ')).toBe('key');
    expect(roleOf(segs, 'mapping')).toBe('key');
    expect(roleOf(segs, ' = ')).toBe('eq');
    expect(roleOf(segs, '"[entity_id]"')).toBe('string');
    expect(roleOf(segs, '-3.5')).toBe('number');
    expect(roleOf(segs, '1')).toBe('number');
    expect(roleOf(segs, 'validationMode')).toBe('key');
    expect(roleOf(segs, '"soft"')).toBe('string');
    expect(segs.some((s) => s.role === 'punct' && s.text.includes('{'))).toBe(true);
  });

  it('keeps an escaped-quote string as one token and round-trips', () => {
    const text = 'prompt_template.1 config: template = "{{ label }}\\"x\\"", n = 2';
    const segs = hl('success', text);
    expect(roleOf(segs, '"{{ label }}\\"x\\""')).toBe('string');
    expect(roleOf(segs, '2')).toBe('number');
  });

  it('single key: id:key = value', () => {
    const segs = hl('success', 'messenger.1:retries = 3');
    expect(segs.map((s) => s.role)).toEqual(['id', 'punct', 'key', 'eq', 'number']);
    const set = hl('success', 'Set messenger.1:text = "hi"');
    expect(roleOf(set, '"hi"')).toBe('string');
    expect(set[0]).toEqual({ role: null, text: 'Set ' });
  });

  it('ids that are not type.N still shape config and Set lines', () => {
    const cfg = hl('success', 'node-input config: defaultValue = "hello", n = 1');
    expect(cfg[0]).toEqual({ role: 'id', text: 'node-input' });
    expect(roleOf(cfg, '"hello"')).toBe('string');
    const set = hl('success', 'Set node-input:label = "a" (warning: x)');
    expect(roleOf(set, 'node-input')).toBe('id');
    expect(roleOf(set, 'label')).toBe('key');
  });

  it('unbalanced quotes and stray characters still round-trip', () => {
    for (const text of [
      'a.1 config: x = "abc',
      'a.1 config: x = abc"',
      'a.1 config: x = {"a": "b',
      'a.1:k = "\\',
      'a.1 config: = , = ',
      'Set a.1:k = "x" (warning: nope "'
    ]) {
      hl('success', text);
    }
  });

  it('error lines are a single error segment', () => {
    const text = 'Node not found: messenger.2. Nodes in this workflow: a.1, b.1.';
    expect(hl('error', text)).toEqual([{ role: 'error', text }]);
  });

  it('prose messages pick out node ids only', () => {
    const segs = hl('success', 'Renamed data_shaper.1 to "Shaper"');
    expect(roleOf(segs, 'data_shaper.1')).toBe('id');
    expect(segs.filter((s) => s.role !== null).length).toBe(1);
    const conn = hl('success', 'Connected a.1:out → b.1:in');
    expect(conn.filter((s) => s.role === 'id').map((s) => s.text)).toEqual(['a.1', 'b.1']);
  });

  it('does not treat versions or sentence tails as ids', () => {
    const segs = hl('success', 'Version 1.2 of v2.0 and Foo.3 done');
    expect(segs).toEqual([{ role: null, text: 'Version 1.2 of v2.0 and Foo.3 done' }]);
    const tail = hl('success', 'See data_shaper.1.');
    expect(tail.map((s) => s.text)).toEqual(['See ', 'data_shaper.1', '.']);
  });

  it('info: header fields, config values, ports, edges', () => {
    const text = [
      'Node:     data_shaper.1',
      'Label:    Data Shaper',
      'Type:     data_shaper',
      'Position: (200, 200)',
      '',
      'Config:',
      '  validationMode: "soft"',
      '  retries: 3',
      '',
      'Ports:',
      '  Inputs:',
      '    value (string)',
      '',
      'Edges:',
      '  messenger.1:value -> value',
      '  value -> workflow_executor.1:in'
    ].join('\n');
    const segs = hl('formatted', text);
    expect(roleOf(segs, 'Node:')).toBe('key');
    expect(roleOf(segs, 'data_shaper.1')).toBe('id');
    expect(roleOf(segs, 'Config:')).toBe('header');
    expect(roleOf(segs, 'validationMode')).toBe('key');
    expect(roleOf(segs, '"soft"')).toBe('string');
    expect(roleOf(segs, '3')).toBe('number');
    expect(roleOf(segs, 'Inputs:')).toBe('header');
    expect(roleOf(segs, '(string)')).toBe('muted');
    expect(roleOf(segs, 'messenger.1')).toBe('id');
    expect(roleOf(segs, '->')).toBe('punct');
    expect(roleOf(segs, 'workflow_executor.1')).toBe('id');
  });

  it('describe: header fields, sections, ports, config schema, (none)', () => {
    const text = [
      'Type:        text_input',
      'Name:        Text Input',
      'Description: Accept text input from user',
      '',
      'Inputs:',
      '  (none)',
      '',
      'Outputs:',
      '  value (string) — the text',
      '',
      'Config:',
      '  defaultValue (string) required default ""',
      '  mode (string|number) one of "a", "b"'
    ].join('\n');
    const segs = hl('formatted', text);
    expect(roleOf(segs, 'text_input')).toBe('id');
    expect(roleOf(segs, 'Inputs:')).toBe('header');
    expect(roleOf(segs, '  (none)')).toBe('muted');
    expect(roleOf(segs, 'value')).toBe('arg');
    expect(roleOf(segs, ' — the text')).toBe('muted');
    expect(roleOf(segs, 'defaultValue')).toBe('key');
    expect(roleOf(segs, '(string|number)')).toBe('muted');
  });

  it('plain single-line formatted results stay plain', () => {
    for (const text of [
      'No nodes in workflow',
      'No edges in workflow',
      'No commands available',
      'No node type matches "data"'
    ]) {
      expect(hl('formatted', text)).toEqual([{ role: null, text }]);
    }
  });

  it('multi-line prose (session status) round-trips with ids only', () => {
    const text = 'Session "Test 1" (abc)\nStatus: idle\nMessages: 2\nLatest reply: Done a.1';
    const segs = hl('success', text);
    expect(roleOf(segs, 'a.1')).toBe('id');
  });

  it('a trailing blank line and CRLF-free odd tables round-trip', () => {
    hl('formatted', LIST_NODES + '\n');
    hl('formatted', '\n\n');
    hl('formatted', '---\n---\n---');
    hl('formatted', 'A  B\n-  -\nx\n\ny  z');
  });

  it('property: random strings of every entry type round-trip', () => {
    // Deterministic PRNG so a failure is reproducible.
    let seed = 0x2f6e2b1;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const alphabet = [
      'a',
      'b',
      'z',
      '_',
      '.',
      '1',
      '2',
      '-',
      ' ',
      '  ',
      '\n',
      '"',
      '\\',
      ':',
      '=',
      ',',
      '{',
      '}',
      '[',
      ']',
      '>',
      'config: ',
      ' = ',
      'Set ',
      'node.1',
      'data_shaper.1',
      '---',
      '  ',
      'ID  ',
      '—',
      '→',
      '(string)',
      'Inputs:',
      'é',
      '\t'
    ];
    const types: ConsoleEntryLike['type'][] = ['input', 'success', 'error', 'formatted'];
    for (let n = 0; n < 4000; n++) {
      const len = Math.floor(rnd() * 40);
      let text = '';
      for (let i = 0; i < len; i++) text += alphabet[Math.floor(rnd() * alphabet.length)];
      const type = types[n % types.length];
      const segs = highlightConsoleEntry({ type, text });
      expect(joined(segs)).toBe(text);
      for (const s of segs) expect(s.text).not.toBe('');
    }
  });
});
