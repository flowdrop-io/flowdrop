/**
 * Unit Test — layout commands and undo history (issue #36)
 *
 * `layout beautify` / `layout auto` re-position every node, so the guarantee
 * that matters is: whatever they do, **one** undo puts the hand-crafted layout
 * back. These tests run the commands against a real WorkflowStore +
 * HistoryService (via createStoreCommandContext) rather than a mock dispatch,
 * because the "one step" property lives in that wiring, not in the executor.
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

const nodeTypes = [createTestNodeMetadata({ node_type_id: 'test_node', name: 'Test Node' })];

/** Deliberately messy, hand-placed positions so beautify has something to change. */
function messyWorkflow() {
  return createTestWorkflow({
    nodes: [
      createTestNode({ id: 'a', position: { x: 13, y: 217 } }),
      createTestNode({ id: 'b', position: { x: 402, y: 41 } }),
      createTestNode({ id: 'c', position: { x: 418, y: 733 } })
    ]
  });
}

function positionsOf(fd: FlowDropInstance): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  for (const n of fd.workflow.current?.nodes ?? []) {
    out[n.id] = { x: n.position.x, y: n.position.y };
  }
  return out;
}

function parse(input: string): Command {
  const parsed = parseCommand(input);
  if (!parsed.ok) throw new Error(`Parse failed: ${parsed.error}`);
  return parsed.command;
}

describe('layout commands: undo history', () => {
  let fd: FlowDropInstance;
  let context: CommandContext;

  beforeEach(() => {
    fd = createFlowDropInstance({ id: `layout-test-${Math.random().toString(36).slice(2)}` });
    fd.workflow.initialize(messyWorkflow());
    const ctx = createStoreCommandContext(nodeTypes, undefined, fd);
    if (!ctx) throw new Error('No command context');
    context = ctx;
  });

  it('layout beautify moves nodes and is undoable in a single step', () => {
    const before = positionsOf(fd);
    expect(fd.history.canUndo()).toBe(false); // only the initial state so far

    const result = executeCommand(parse('layout beautify'), context);
    expect(result.ok).toBe(true);

    // The layout actually changed (otherwise the undo assertion is vacuous).
    expect(positionsOf(fd)).not.toEqual(before);

    // Exactly one committed step was added.
    expect(fd.history.canUndo()).toBe(true);

    // ...and one undo restores the hand-crafted positions.
    expect(context.dispatch.undo()).toBe(true);
    expect(positionsOf(fd)).toEqual(before);
    expect(fd.history.canUndo()).toBe(false);

    // Redo brings the beautified layout back.
    expect(context.dispatch.redo()).toBe(true);
    expect(positionsOf(fd)).not.toEqual(before);
  });

  it('layout auto is undoable in a single step', () => {
    const before = positionsOf(fd);

    const result = executeCommand(parse('layout auto'), context);
    expect(result.ok).toBe(true);
    expect(positionsOf(fd)).not.toEqual(before);

    expect(context.dispatch.undo()).toBe(true);
    expect(positionsOf(fd)).toEqual(before);
    expect(fd.history.canUndo()).toBe(false);
  });

  it('a batch ending in layout beautify undoes as one step', () => {
    const before = positionsOf(fd);

    const result = executeBatch([parse('add test_node'), parse('layout beautify')], context);
    expect(result.ok).toBe(true);
    expect(fd.workflow.current?.nodes).toHaveLength(4);

    // One undo reverts the whole assistant batch — added node and layout alike.
    expect(context.dispatch.undo()).toBe(true);
    expect(fd.workflow.current?.nodes).toHaveLength(3);
    expect(positionsOf(fd)).toEqual(before);
    expect(fd.history.canUndo()).toBe(false);
  });

  it('beautify on an empty workflow succeeds without touching history', () => {
    fd.workflow.initialize(createTestWorkflow({ nodes: [] }));

    const result = executeCommand(parse('layout beautify'), context);
    expect(result.ok).toBe(true);
    expect(fd.history.canUndo()).toBe(false);
  });
});
