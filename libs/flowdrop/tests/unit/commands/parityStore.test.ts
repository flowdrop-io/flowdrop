/**
 * Unit Test — editor-parity commands against the real workflow store.
 *
 * The properties that live in the store wiring, not the executor: each write is
 * ONE undo step, a renamed or removed input carries the Playground chat binding
 * along (`editInterface`), the editor lock is honoured, and a node's
 * `config.ports` key is dropped when no override is left.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFlowDropInstance,
  type FlowDropInstance
} from '$lib/stores/instanceContainer.svelte.js';
import { createStoreCommandContext } from '$lib/commands/storeIntegration.svelte.js';
import { executeCommand } from '$lib/commands/executor.js';
import { executeBatch } from '$lib/commands/batch.js';
import { parseCommand } from '$lib/commands/parser.js';
import type { Command, CommandContext } from '$lib/commands/types.js';
import { createTestWorkflow, createTestNode, createTestNodeMetadata } from '../../utils/index.js';

const meta = createTestNodeMetadata({ node_type_id: 'test_node', name: 'Test Node' });
const nodeTypes = [meta];

function parse(input: string): Command {
  const parsed = parseCommand(input);
  if (!parsed.ok) throw new Error(`Parse failed: ${parsed.error}`);
  return parsed.command;
}

describe('editor-parity commands on the real store', () => {
  let fd: FlowDropInstance;
  let context: CommandContext;

  const run = (line: string) => executeCommand(parse(line), context);
  const undoSteps = () => {
    let n = 0;
    while (context.dispatch.undo()) n++;
    return n;
  };

  beforeEach(() => {
    fd = createFlowDropInstance({ id: `parity-${Math.random().toString(36).slice(2)}` });
    fd.workflow.initialize(
      createTestWorkflow({
        nodes: [
          createTestNode({ id: 'a', data: { label: 'A', config: { k: 1 }, metadata: meta } }),
          createTestNode({ id: 'b', position: { x: 300, y: 100 } })
        ],
        playground: { chat: null }
      })
    );
    const ctx = createStoreCommandContext(nodeTypes, undefined, fd);
    if (!ctx) throw new Error('no context');
    context = ctx;
  });

  it('is one undo step per interface write, and the interface comes back on undo', () => {
    expect(run('interface expose a:output as answer').ok).toBe(true);
    expect(fd.workflow.current?.interface?.outputs?.[0].id).toBe('answer');
    expect(undoSteps()).toBe(1);
    expect(fd.workflow.current?.interface?.outputs).toBeUndefined();
  });

  it('renames an input and the Playground chat binding follows, in one step', () => {
    run('interface add input q string');
    run('playground chat message q');
    expect(fd.workflow.current?.playground?.chat?.message).toBe('q');
    expect(run('interface rename input q to question').ok).toBe(true);
    expect(fd.workflow.current?.playground?.chat?.message).toBe('question');
    context.dispatch.undo();
    expect(fd.workflow.current?.playground?.chat?.message).toBe('q');
    expect(fd.workflow.current?.interface?.inputs?.[0].id).toBe('q');
  });

  it('removes an input and unbinds it from the chat', () => {
    run('interface add input q string');
    run('playground chat message q');
    run('interface remove input q');
    expect(fd.workflow.current?.interface?.inputs).toBeUndefined();
    expect(fd.workflow.current?.playground?.chat).toBeNull();
  });

  it('writes an empty interface object, not undefined, when the last entry goes', () => {
    run('interface add output o');
    run('interface remove output o');
    expect(fd.workflow.current?.interface).toEqual({ inputs: undefined, outputs: undefined });
  });

  it('hides and shows ports as one undo step each, dropping config.ports when empty', () => {
    expect(run('ports hide a:output').ok).toBe(true);
    const hidden = fd.workflow.current?.nodes.find((n) => n.id === 'a')?.data.config;
    expect(hidden?.ports).toEqual({ outputs: [{ id: 'output', exposed: false }] });
    expect(hidden?.k).toBe(1);
    expect(run('ports show a:output').ok).toBe(true);
    const shown = fd.workflow.current?.nodes.find((n) => n.id === 'a')?.data.config;
    expect('ports' in (shown ?? {})).toBe(false);
    expect(undoSteps()).toBe(2);
  });

  it('duplicates a node in one step with a fresh id and its own copy of the metadata', () => {
    const result = run('duplicate a');
    expect(result.ok).toBe(true);
    expect(fd.workflow.current?.nodes).toHaveLength(3);
    const [source, copy] = [
      fd.workflow.current?.nodes.find((n) => n.id === 'a'),
      fd.workflow.current?.nodes.find((n) => n.id !== 'a' && n.id !== 'b')
    ];
    expect(copy?.data.metadata).toEqual(source?.data.metadata);
    expect(copy?.data.metadata).not.toBe(source?.data.metadata);
    expect(copy?.data.config).not.toBe(source?.data.config);
    expect(undoSteps()).toBe(1);
    expect(fd.workflow.current?.nodes).toHaveLength(2);
  });

  it('sets the name, description and format; an empty description is stored empty', () => {
    expect(run('workflow name Renamed').ok).toBe(true);
    expect(fd.workflow.current?.name).toBe('Renamed');
    expect(run('workflow description A flow').ok).toBe(true);
    expect(fd.workflow.current?.description).toBe('A flow');
    // A bare `workflow description` reads; it never erases the text.
    expect(run('workflow description').ok).toBe(true);
    expect(fd.workflow.current?.description).toBe('A flow');
    expect(run('workflow description none').ok).toBe(true);
    expect(fd.workflow.current?.description).toBe('');
    expect(executeCommand({ type: 'workflow_set', field: 'name', value: '   ' }, context).ok).toBe(
      false
    );
    expect(fd.workflow.current?.name).toBe('Renamed');
    expect(undoSteps()).toBe(3);
  });

  it('offers the registered formats and refuses one that is not', () => {
    const formats = context.formatOptions?.() ?? [];
    // The built-in adapters register more than one format, so the happy path always runs.
    expect(formats.length).toBeGreaterThan(1);
    const read = run('workflow');
    expect(read.ok && read.message).toContain('Format:');
    expect(run(`workflow format ${formats[1]}`).ok).toBe(true);
    expect(fd.workflow.current?.metadata.format).toBe(formats[1]);
    expect(run('workflow format not-a-format').ok).toBe(false);
  });

  it('a batch of interface edits is one undo step', () => {
    const result = executeBatch(
      [
        parse('interface add input q string'),
        parse('interface bind input q to a:input'),
        parse('interface expose a:output as answer')
      ],
      context
    );
    expect(result.ok).toBe(true);
    expect(fd.workflow.current?.interface?.inputs?.[0].bindings).toHaveLength(1);
    expect(fd.workflow.current?.interface?.outputs?.[0].id).toBe('answer');
    expect(undoSteps()).toBe(1);
    expect(fd.workflow.current?.interface?.inputs).toBeUndefined();
  });

  it('refuses writes while the editor is locked and reads still run', () => {
    fd.workflow.setLocked(true);
    const locked = createStoreCommandContext(nodeTypes, undefined, fd);
    expect(locked).not.toBeNull();
    if (!locked) return;
    const before = JSON.stringify(fd.workflow.current);
    const result = executeCommand(parse('interface add input q'), locked);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('LOCKED');
    expect(JSON.stringify(fd.workflow.current)).toBe(before);
    expect(executeCommand(parse('interface list'), locked).ok).toBe(true);
  });
});
