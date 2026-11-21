/**
 * The pure edit helpers the editor panels and the commands share: interface
 * edits (the chat-follows rule in one place), the Playground chat edit, the
 * port exposure edits and the duplicate-node builder.
 */

import { describe, it, expect } from 'vitest';
import {
  addInterfaceEntry,
  patchInterfaceEntry,
  removeInterfaceEntry,
  renameInterfaceEntry,
  validateInterfaceId
} from '../../../src/lib/utils/interfaceTags.js';
import { editPlaygroundChat } from '../../../src/lib/utils/playgroundChat.js';
import { movePort, setPortExposed, withPorts } from '../../../src/lib/utils/portExposure.js';
import { buildDuplicateNode, cloneJson } from '../../../src/lib/utils/duplicateNode.js';
import type { NodePort, Workflow, WorkflowNode } from '../../../src/lib/types/index.js';
import { createTestNode, createTestNodeMetadata, createTestWorkflow } from '../../utils/index.js';

const entry = (id: string) => ({ id, dataType: 'string', bindings: [] });

function wfWith(inputs: string[], outputs: string[] = []): Workflow {
  return createTestWorkflow({
    interface: { inputs: inputs.map(entry), outputs: outputs.map(entry) }
  });
}

describe('interface edits report the chat edit in one place', () => {
  it('rename, remove and patch each report it, and none when another input keeps the id', () => {
    const one = wfWith(['q']);
    expect(renameInterfaceEntry(one, 'input', 'q', 'r')?.edit).toEqual({
      kind: 'rename',
      id: 'q',
      to: 'r'
    });
    expect(removeInterfaceEntry(one, 'input', 'q')?.edit).toEqual({ kind: 'remove', id: 'q' });
    expect(patchInterfaceEntry(one, 'input', 'q', { id: 'r' })?.edit).toEqual({
      kind: 'rename',
      id: 'q',
      to: 'r'
    });

    const twins = wfWith(['q', 'q']);
    expect(renameInterfaceEntry(twins, 'input', 'q', 'r')?.edit).toBeUndefined();
    expect(removeInterfaceEntry(twins, 'input', 'q')?.edit).toBeUndefined();
    expect(patchInterfaceEntry(twins, 'input', 'q', { id: 'r' })?.edit).toBeUndefined();
  });

  it('reports nothing for outputs, which the chat binding does not name', () => {
    const out = wfWith([], ['o']);
    expect(removeInterfaceEntry(out, 'output', 'o')?.edit).toBeUndefined();
    expect(renameInterfaceEntry(out, 'output', 'o', 'p')?.edit).toBeUndefined();
  });

  it('edits the entry at a given index when ids repeat', () => {
    const twins = wfWith(['q', 'q']);
    const next = patchInterfaceEntry(twins, 'input', 'q', { name: 'second' }, 1);
    expect(next?.interface.inputs?.map((e) => e.name)).toEqual([undefined, 'second']);
  });

  it('refuses an id outside the exposure alphabet, but lets an existing one be kept', () => {
    expect(validateInterfaceId('my q', 'input', undefined)).toBe('format');
    expect(addInterfaceEntry(wfWith([]), 'input', entry('my q'))).toBeNull();
    expect(validateInterfaceId('my q', 'input', wfWith(['my q']).interface, 'my q')).toBeNull();
  });
});

describe('editPlaygroundChat', () => {
  const base = (chat: unknown, extra: Partial<Workflow> = {}) =>
    createTestWorkflow({
      interface: { inputs: [entry('q'), entry('h')] },
      playground: { chat: chat as never },
      ...extra
    });

  it('applies an edit and returns the next playground', () => {
    const result = editPlaygroundChat(base(null), { kind: 'input', key: 'message', id: 'q' });
    expect(result?.playground.chat?.message).toBe('q');
    expect(result && 'interface' in result).toBe(false);
  });

  it('returns null for an edit that changes nothing', () => {
    expect(editPlaygroundChat(base(null), { kind: 'sub_replies', on: false })).toBeNull();
    expect(editPlaygroundChat(base(null), { kind: 'limit', limit: 3 })).toBeNull();
    expect(editPlaygroundChat(base(null), { kind: 'move_turns' })).toBeNull();
  });

  it('moves the deprecated turn marks along with the first edit', () => {
    const marked = createTestWorkflow({
      playground: { chat: null },
      interface: { inputs: [{ ...entry('q'), turn: 'message' }] }
    });
    const result = editPlaygroundChat(marked, { kind: 'sub_replies', on: true });
    expect(result?.interface?.inputs?.[0]).not.toHaveProperty('turn');
    expect(result?.chat.message).toBe('q');
  });
});

describe('port helpers', () => {
  const port = (id: string): NodePort => ({
    id,
    name: id,
    type: 'output',
    dataType: 'string'
  });
  const ports = [port('a'), port('b'), port('c')];

  it('setPortExposed hides one port and drops the override when shown again', () => {
    const hidden = setPortExposed(undefined, 'outputs', ports, 'b', false);
    expect(hidden).toEqual({ outputs: [{ id: 'a' }, { id: 'b', exposed: false }, { id: 'c' }] });
    expect(setPortExposed(hidden, 'outputs', ports, 'b', true)).toBeUndefined();
  });

  it('movePort reorders, and says null when nothing would move', () => {
    expect(movePort(undefined, 'outputs', ports, 'c', 0)?.ports?.outputs?.map((p) => p.id)).toEqual(
      ['c', 'a', 'b']
    );
    expect(movePort(undefined, 'outputs', ports, 'a', 0)).toBeNull();
    expect(movePort(undefined, 'outputs', ports, 'a', 3)).toBeNull();
    expect(movePort(undefined, 'outputs', ports, 'zzz', 0)).toBeNull();
  });

  it('withPorts sets or drops the config.ports key', () => {
    expect(withPorts({ k: 1, ports: { inputs: [] } }, undefined)).toEqual({ k: 1 });
    expect(withPorts({ k: 1 }, { inputs: [{ id: 'x' }] })).toEqual({
      k: 1,
      ports: { inputs: [{ id: 'x' }] }
    });
  });
});

describe('buildDuplicateNode', () => {
  const metadata = createTestNodeMetadata({ node_type_id: 'test_node', name: 'Test Node' });
  const source = createTestNode({
    id: 'test_node.1',
    position: { x: 10, y: 20 },
    data: { label: 'Mine', config: { k: { nested: 1 } }, metadata }
  }) as WorkflowNode;

  it('copies label, config and metadata without sharing any of them', () => {
    const copy = buildDuplicateNode(source, [source], 20);
    expect(copy?.id).toBe('test_node.2');
    expect(copy?.position).toEqual({ x: 50, y: 60 });
    expect(copy?.data.label).toBe('Mine');
    expect(copy?.data.config).toEqual(source.data.config);
    expect(copy?.data.config).not.toBe(source.data.config);
    expect(copy?.data.metadata).toEqual(metadata);
    expect(copy?.data.metadata).not.toBe(metadata);
  });

  it('refuses a node with no type', () => {
    const typeless = { ...source, data: { label: 'x', config: {} } } as unknown as WorkflowNode;
    expect(buildDuplicateNode(typeless, [typeless], 20)).toBeNull();
  });

  it('cloneJson survives a value structuredClone refuses', () => {
    const value = { f: () => 1, n: 2 };
    expect(cloneJson(value)).toEqual({ n: 2 });
  });
});
