/**
 * Unit Test - the Doctor's operation mapper
 *
 * Every operation of the vocabulary, an operation the editor does not know, and
 * atomicity: a remedy is applied whole or not at all.
 */

import { describe, it, expect } from 'vitest';
import { applyDoctorOperations } from '$lib/utils/doctorOperations.js';
import { createTestNode, createTestEdge } from '../../utils/index.js';

function fixture() {
  const a = createTestNode({
    id: 'a',
    data: {
      label: 'A',
      config: { keep: 1, legacy: true, gone: 'x' },
      metadata: { node_type_id: 'old' } as never
    }
  });
  const b = createTestNode({ id: 'b' });
  const c = createTestNode({ id: 'c' });
  const e1 = createTestEdge({ id: 'e1', source: 'a', target: 'b' });
  const e2 = createTestEdge({ id: 'e2', source: 'b', target: 'c' });
  return { nodes: [a, b, c], edges: [e1, e2] };
}

describe('applyDoctorOperations', () => {
  it('removeEdge and removeNode', () => {
    const input = fixture();
    const result = applyDoctorOperations(input, [
      { op: 'removeEdge', edgeId: 'e2' },
      { op: 'removeNode', nodeId: 'c' }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(result.edges.map((e) => e.id)).toEqual(['e1']);
    // The input is never changed.
    expect(input.nodes).toHaveLength(3);
    expect(input.edges).toHaveLength(2);
  });

  it('addNode and addEdge', () => {
    const input = fixture();
    const node = createTestNode({ id: 'd' });
    const edge = createTestEdge({ id: 'e3', source: 'c', target: 'd' });
    const result = applyDoctorOperations(input, [
      { op: 'addNode', node },
      { op: 'addEdge', edge }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.edges.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('updateNodeConfig assigns whole values and unsets keys', () => {
    const input = fixture();
    const result = applyDoctorOperations(input, [
      {
        op: 'updateNodeConfig',
        nodeId: 'a',
        patch: { added: { deep: [1, 2] }, keep: 2 },
        unset: ['legacy', 'gone']
      }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0].data.config).toEqual({ keep: 2, added: { deep: [1, 2] } });
    expect(input.nodes[0].data.config).toEqual({ keep: 1, legacy: true, gone: 'x' });
  });

  it('updateNodeData changes data keys but never config', () => {
    const result = applyDoctorOperations(fixture(), [
      {
        op: 'updateNodeData',
        nodeId: 'a',
        patch: { metadata: { node_type_id: 'calculator' }, config: { sneaky: true } },
        unset: []
      }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0].data.metadata).toEqual({ node_type_id: 'calculator' });
    expect(result.nodes[0].data.config).toEqual({ keep: 1, legacy: true, gone: 'x' });
  });

  it('updateNode changes top-level node keys but never data', () => {
    const result = applyDoctorOperations(fixture(), [
      {
        op: 'updateNode',
        nodeId: 'b',
        patch: { position: { x: 5, y: 6 }, data: { label: 'nope' } },
        unset: []
      }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[1].position).toEqual({ x: 5, y: 6 });
    expect(result.nodes[1].data.label).toBe('Test Node');
  });

  it('updateEdge assigns and unsets', () => {
    const result = applyDoctorOperations(fixture(), [
      { op: 'updateEdge', edgeId: 'e1', patch: { target: 'c' }, unset: ['targetHandle'] }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.edges[0].target).toBe('c');
    expect(result.edges[0].targetHandle).toBeUndefined();
  });

  it('setInterface and setWorkflowPayload say what they set', () => {
    const iface = { inputs: [{ id: 'x', bindings: [{ nodeId: 'a', portId: 'p' }] }], outputs: [] };
    const result = applyDoctorOperations(fixture(), [
      { op: 'setInterface', interface: iface as never },
      { op: 'setWorkflowPayload', key: 'playground', value: { chat: null } }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.touched).toEqual({ interface: true, playground: true });
    expect(result.interface).toEqual(iface);
    expect(result.playground).toEqual({ chat: null });
  });

  it('setWorkflowPayload with null removes the key (and says so)', () => {
    const result = applyDoctorOperations(fixture(), [
      { op: 'setWorkflowPayload', key: 'playground', value: null }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.touched.playground).toBe(true);
    expect(result.playground).toBeUndefined();
  });

  it('leaves the parts no operation set marked as untouched', () => {
    const result = applyDoctorOperations(fixture(), [{ op: 'removeEdge', edgeId: 'e1' }]);
    expect(result.ok && result.touched).toEqual({ interface: false, playground: false });
  });

  it('addresses an item without an id as #<index>', () => {
    const input = fixture();
    const result = applyDoctorOperations(input, [
      { op: 'removeEdge', edgeId: '#1' },
      { op: 'updateNodeConfig', nodeId: '#2', patch: { z: 1 }, unset: [] }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.edges.map((e) => e.id)).toEqual(['e1']);
    expect(result.nodes[2].data.config).toEqual({ z: 1 });
  });

  it('keeps the identity of everything it does not touch', () => {
    const input = fixture();
    const result = applyDoctorOperations(input, [
      { op: 'updateNodeConfig', nodeId: 'a', patch: { n: 1 }, unset: [] }
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0]).not.toBe(input.nodes[0]);
    expect(result.nodes[1]).toBe(input.nodes[1]);
    expect(result.edges[0]).toBe(input.edges[0]);
  });

  describe('refusals', () => {
    it('an unknown operation aborts the whole remedy, even after valid ones', () => {
      const result = applyDoctorOperations(fixture(), [
        { op: 'removeEdge', edgeId: 'e1' },
        { op: 'teleportNode', nodeId: 'a' }
      ]);
      expect(result).toMatchObject({ ok: false, reason: 'unknown-op' });
    });

    it('a malformed operation is refused', () => {
      expect(applyDoctorOperations(fixture(), [{ op: 'removeNode' }])).toMatchObject({
        ok: false,
        reason: 'bad-op'
      });
      expect(
        applyDoctorOperations(fixture(), [
          { op: 'updateNodeConfig', nodeId: 'a', patch: [], unset: [] }
        ])
      ).toMatchObject({ ok: false, reason: 'bad-op' });
    });

    it('a target the workflow does not have refuses the remedy, with nothing applied', () => {
      const input = fixture();
      const before = JSON.stringify(input);
      const result = applyDoctorOperations(input, [
        { op: 'removeEdge', edgeId: 'e1' },
        { op: 'removeNode', nodeId: 'nope' }
      ]);
      expect(result).toMatchObject({ ok: false, reason: 'missing-target' });
      expect(JSON.stringify(input)).toBe(before);
    });

    it('a workflow key the editor does not know is refused', () => {
      expect(
        applyDoctorOperations(fixture(), [{ op: 'setWorkflowPayload', key: 'billing', value: {} }])
      ).toMatchObject({ ok: false, reason: 'bad-op' });
    });

    it('a non-list answer is refused', () => {
      expect(applyDoctorOperations(fixture(), 'nope')).toMatchObject({ ok: false });
    });
  });
});
