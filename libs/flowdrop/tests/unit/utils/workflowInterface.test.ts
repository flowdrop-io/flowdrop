/**
 * Unit Tests - Workflow Interface
 *
 * Tests for resolveBinding, resolveInterface, and validateWorkflowInterface.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveBinding,
  resolveInterface,
  validateWorkflowInterface,
  validateLaunchInputs,
  rewriteInterfaceBindings
} from '$lib/utils/workflowInterface.js';
import { buildHandleId } from '$lib/utils/handleIds.js';
import type { PortMapping } from '$lib/utils/nodeSwap.js';
import type {
  NodeMetadata,
  NodePort,
  PortsConfig,
  Workflow,
  WorkflowEdge,
  WorkflowInterfaceEntry,
  WorkflowNode
} from '$lib/types/index.js';

// =========================================================================
// Fixture builders
// =========================================================================

function makePort(id: string, dataType = 'string', overrides: Partial<NodePort> = {}): NodePort {
  return { id, name: id, type: 'input', dataType, ...overrides };
}

function makeMetadata(inputs: NodePort[], outputs: NodePort[]): NodeMetadata {
  return {
    node_type_id: 'test_node',
    name: 'Test Node',
    description: 'A node for testing',
    category: 'processing',
    version: '1.0.0',
    type: 'default',
    inputs,
    outputs
  };
}

function makeNode(
  id: string,
  inputs: NodePort[],
  outputs: NodePort[],
  ports?: PortsConfig
): WorkflowNode {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      config: ports ? { ports } : {},
      metadata: makeMetadata(inputs, outputs)
    }
  };
}

function makeEdge(
  id: string,
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string
): WorkflowEdge {
  return {
    id,
    source: sourceNodeId,
    target: targetNodeId,
    sourceHandle: buildHandleId(sourceNodeId, 'output', sourcePortId),
    targetHandle: buildHandleId(targetNodeId, 'input', targetPortId)
  };
}

function makeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[] = [],
  workflowInterface?: Workflow['interface']
): Workflow {
  return {
    id: 'wf-1',
    name: 'Test Workflow',
    nodes,
    edges,
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString()
    },
    interface: workflowInterface
  };
}

function makeEntry(overrides: Partial<WorkflowInterfaceEntry> = {}): WorkflowInterfaceEntry {
  return {
    id: 'entry-1',
    dataType: 'string',
    bindings: [],
    ...overrides
  };
}

// =========================================================================
// resolveBinding
// =========================================================================

describe('resolveBinding', () => {
  const inputPort = makePort('in-1', 'string', { type: 'input' });
  const outputPort = makePort('out-1', 'number', { type: 'output' });
  const node = makeNode('node-1', [inputPort], [outputPort]);
  const workflow = makeWorkflow([node]);

  it('resolves an input port', () => {
    const result = resolveBinding(workflow, { nodeId: 'node-1', portId: 'in-1' });
    expect(result).toEqual({ node, port: inputPort, direction: 'input' });
  });

  it('resolves an output port', () => {
    const result = resolveBinding(workflow, { nodeId: 'node-1', portId: 'out-1' });
    expect(result).toEqual({ node, port: outputPort, direction: 'output' });
  });

  it('returns null when the node does not exist', () => {
    const result = resolveBinding(workflow, { nodeId: 'missing', portId: 'in-1' });
    expect(result).toBeNull();
  });

  it('returns null when the port does not exist on the node', () => {
    const result = resolveBinding(workflow, { nodeId: 'node-1', portId: 'missing' });
    expect(result).toBeNull();
  });
});

// =========================================================================
// resolveInterface
// =========================================================================

describe('resolveInterface', () => {
  it('returns [] for a workflow with no interface key', () => {
    const workflow = makeWorkflow([makeNode('node-1', [makePort('in-1')], [])]);
    expect(resolveInterface(workflow)).toEqual([]);
  });

  it('reports ok for a single, exposed, type-matching binding', () => {
    const port = makePort('in-1', 'string', { type: 'input' });
    const node = makeNode('node-1', [port], []);
    const entry = makeEntry({ bindings: [{ nodeId: 'node-1', portId: 'in-1' }] });
    const workflow = makeWorkflow([node], [], { inputs: [entry] });

    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('ok');
    expect(resolved.direction).toBe('input');
    expect(resolved.targets).toEqual([{ node, port, direction: 'input' }]);
  });

  it('reports unbound for an entry with no bindings', () => {
    const workflow = makeWorkflow([], [], { inputs: [makeEntry({ bindings: [] })] });
    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('unbound');
    expect(resolved.targets).toEqual([]);
  });

  it('reports dangling when the bound node no longer exists', () => {
    const entry = makeEntry({ bindings: [{ nodeId: 'ghost', portId: 'in-1' }] });
    const workflow = makeWorkflow([], [], { inputs: [entry] });
    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('dangling');
  });

  it('reports dangling when the bound port no longer exists on an existing node', () => {
    const node = makeNode('node-1', [makePort('in-1')], []);
    const entry = makeEntry({ bindings: [{ nodeId: 'node-1', portId: 'ghost-port' }] });
    const workflow = makeWorkflow([node], [], { inputs: [entry] });
    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('dangling');
  });

  it('reports hidden when the bound port is not canvas-exposed', () => {
    const port = makePort('in-1', 'string', { type: 'input', exposedByDefault: false });
    const node = makeNode('node-1', [port], []);
    const entry = makeEntry({ bindings: [{ nodeId: 'node-1', portId: 'in-1' }] });
    const workflow = makeWorkflow([node], [], { inputs: [entry] });
    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('hidden');
  });

  it('reports hidden when the port config explicitly un-exposes the port', () => {
    const port = makePort('in-1', 'string', { type: 'input' });
    const node = makeNode('node-1', [port], [], { inputs: [{ id: 'in-1', exposed: false }] });
    const entry = makeEntry({ bindings: [{ nodeId: 'node-1', portId: 'in-1' }] });
    const workflow = makeWorkflow([node], [], { inputs: [entry] });
    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('hidden');
  });

  it('reports type-mismatch when the entry dataType differs from the bound port', () => {
    const port = makePort('in-1', 'number', { type: 'input' });
    const node = makeNode('node-1', [port], []);
    const entry = makeEntry({
      dataType: 'string',
      bindings: [{ nodeId: 'node-1', portId: 'in-1' }]
    });
    const workflow = makeWorkflow([node], [], { inputs: [entry] });
    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('type-mismatch');
  });

  it('reports over-bound for an output entry with more than one binding', () => {
    const outA = makePort('out-a', 'string', { type: 'output' });
    const outB = makePort('out-b', 'string', { type: 'output' });
    const node = makeNode('node-1', [], [outA, outB]);
    const entry = makeEntry({
      bindings: [
        { nodeId: 'node-1', portId: 'out-a' },
        { nodeId: 'node-1', portId: 'out-b' }
      ]
    });
    const workflow = makeWorkflow([node], [], { outputs: [entry] });
    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('over-bound');
    expect(resolved.direction).toBe('output');
  });

  it('reports over-bound for an input entry with more than one binding (decision R2)', () => {
    const inA = makePort('in-a', 'string', { type: 'input' });
    const inB = makePort('in-b', 'string', { type: 'input' });
    const node = makeNode('node-1', [inA, inB], []);
    const entry = makeEntry({
      bindings: [
        { nodeId: 'node-1', portId: 'in-a' },
        { nodeId: 'node-1', portId: 'in-b' }
      ]
    });
    const workflow = makeWorkflow([node], [], { inputs: [entry] });
    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('over-bound');
    expect(resolved.direction).toBe('input');
  });

  it('resolves inputs before outputs, preserving declared order', () => {
    const node = makeNode(
      'node-1',
      [makePort('in-1', 'string')],
      [makePort('out-1', 'string', { type: 'output' })]
    );
    const inputEntry = makeEntry({
      id: 'in-entry',
      bindings: [{ nodeId: 'node-1', portId: 'in-1' }]
    });
    const outputEntry = makeEntry({
      id: 'out-entry',
      bindings: [{ nodeId: 'node-1', portId: 'out-1' }]
    });
    const workflow = makeWorkflow([node], [], {
      inputs: [inputEntry],
      outputs: [outputEntry]
    });

    const resolved = resolveInterface(workflow);
    expect(resolved.map((r) => [r.entry.id, r.direction])).toEqual([
      ['in-entry', 'input'],
      ['out-entry', 'output']
    ]);
  });

  it('gives dangling precedence over other applicable statuses', () => {
    // Two bindings (would be over-bound), but one is dangling — dangling wins.
    const port = makePort('in-1', 'string', { type: 'input' });
    const node = makeNode('node-1', [port], []);
    const entry = makeEntry({
      bindings: [
        { nodeId: 'node-1', portId: 'in-1' },
        { nodeId: 'node-1', portId: 'ghost' }
      ]
    });
    const workflow = makeWorkflow([node], [], { inputs: [entry] });
    const [resolved] = resolveInterface(workflow);
    expect(resolved.status).toBe('dangling');
  });
});

// =========================================================================
// validateWorkflowInterface
// =========================================================================

describe('validateWorkflowInterface', () => {
  it('returns [] for a workflow with no interface key', () => {
    const workflow = makeWorkflow([makeNode('node-1', [makePort('in-1')], [])]);
    expect(validateWorkflowInterface(workflow)).toEqual([]);
  });

  it('returns [] for a fully-ok interface', () => {
    const port = makePort('in-1', 'string', { type: 'input' });
    const node = makeNode('node-1', [port], []);
    const entry = makeEntry({ bindings: [{ nodeId: 'node-1', portId: 'in-1' }] });
    const workflow = makeWorkflow([node], [], { inputs: [entry] });
    expect(validateWorkflowInterface(workflow)).toEqual([]);
  });

  it('reports a duplicate id within the same direction', () => {
    const entryA = makeEntry({ id: 'dup', bindings: [] });
    const entryB = makeEntry({ id: 'dup', bindings: [] });
    const workflow = makeWorkflow([], [], { inputs: [entryA, entryB] });

    const issues = validateWorkflowInterface(workflow);
    expect(issues.some((i) => i.code === 'interface-duplicate-id' && i.entryId === 'dup')).toBe(
      true
    );
  });

  it('does not report a duplicate id across different directions', () => {
    const inputEntry = makeEntry({ id: 'shared', bindings: [] });
    const outputEntry = makeEntry({ id: 'shared', bindings: [] });
    const workflow = makeWorkflow([], [], { inputs: [inputEntry], outputs: [outputEntry] });

    const issues = validateWorkflowInterface(workflow);
    expect(issues.some((i) => i.code === 'interface-duplicate-id')).toBe(false);
  });

  it('reports an input bound to a port that already has an incoming edge', () => {
    const port = makePort('in-1', 'string', { type: 'input' });
    const upstream = makeNode('upstream', [], [makePort('out-1', 'string', { type: 'output' })]);
    const target = makeNode('node-1', [port], []);
    const edge = makeEdge('e1', 'upstream', 'out-1', 'node-1', 'in-1');
    const entry = makeEntry({ bindings: [{ nodeId: 'node-1', portId: 'in-1' }] });
    const workflow = makeWorkflow([upstream, target], [edge], { inputs: [entry] });

    const issues = validateWorkflowInterface(workflow);
    expect(
      issues.some((i) => i.code === 'interface-input-already-connected' && i.entryId === entry.id)
    ).toBe(true);
  });

  it('does not flag an output bound to a port with an outgoing edge', () => {
    const port = makePort('out-1', 'string', { type: 'output' });
    const source = makeNode('node-1', [], [port]);
    const downstream = makeNode('downstream', [makePort('in-1', 'string')], []);
    const edge = makeEdge('e1', 'node-1', 'out-1', 'downstream', 'in-1');
    const entry = makeEntry({ bindings: [{ nodeId: 'node-1', portId: 'out-1' }] });
    const workflow = makeWorkflow([source, downstream], [edge], { outputs: [entry] });

    const issues = validateWorkflowInterface(workflow);
    expect(issues.some((i) => i.code === 'interface-input-already-connected')).toBe(false);
  });

  it('reports a direction mismatch when an input entry binds to an output port', () => {
    const outputPort = makePort('out-1', 'string', { type: 'output' });
    const node = makeNode('node-1', [], [outputPort]);
    const entry = makeEntry({ bindings: [{ nodeId: 'node-1', portId: 'out-1' }] });
    const workflow = makeWorkflow([node], [], { inputs: [entry] });

    const issues = validateWorkflowInterface(workflow);
    expect(
      issues.some((i) => i.code === 'interface-direction-mismatch' && i.direction === 'input')
    ).toBe(true);
  });

  it('reports a direction mismatch when an output entry binds to an input port', () => {
    const inputPort = makePort('in-1', 'string', { type: 'input' });
    const node = makeNode('node-1', [inputPort], []);
    const entry = makeEntry({ bindings: [{ nodeId: 'node-1', portId: 'in-1' }] });
    const workflow = makeWorkflow([node], [], { outputs: [entry] });

    const issues = validateWorkflowInterface(workflow);
    expect(
      issues.some((i) => i.code === 'interface-direction-mismatch' && i.direction === 'output')
    ).toBe(true);
  });

  it('surfaces every non-ok resolveInterface status as an issue', () => {
    const danglingEntry = makeEntry({
      id: 'dangling-entry',
      bindings: [{ nodeId: 'ghost', portId: 'x' }]
    });
    const unboundEntry = makeEntry({ id: 'unbound-entry', bindings: [] });
    const hiddenPort = makePort('hidden-in', 'string', {
      type: 'input',
      exposedByDefault: false
    });
    const hiddenNode = makeNode('hidden-node', [hiddenPort], []);
    const hiddenEntry = makeEntry({
      id: 'hidden-entry',
      bindings: [{ nodeId: 'hidden-node', portId: 'hidden-in' }]
    });
    const mismatchPort = makePort('mismatch-in', 'number', { type: 'input' });
    const mismatchNode = makeNode('mismatch-node', [mismatchPort], []);
    const mismatchEntry = makeEntry({
      id: 'mismatch-entry',
      dataType: 'string',
      bindings: [{ nodeId: 'mismatch-node', portId: 'mismatch-in' }]
    });
    const overBoundA = makePort('over-a', 'string', { type: 'input' });
    const overBoundB = makePort('over-b', 'string', { type: 'input' });
    const overBoundNode = makeNode('over-node', [overBoundA, overBoundB], []);
    const overBoundEntry = makeEntry({
      id: 'over-bound-entry',
      bindings: [
        { nodeId: 'over-node', portId: 'over-a' },
        { nodeId: 'over-node', portId: 'over-b' }
      ]
    });

    const workflow = makeWorkflow([hiddenNode, mismatchNode, overBoundNode], [], {
      inputs: [danglingEntry, unboundEntry, hiddenEntry, mismatchEntry, overBoundEntry]
    });

    const issues = validateWorkflowInterface(workflow);
    const codesByEntry = new Map(issues.map((i) => [i.entryId, i.code]));
    expect(codesByEntry.get('dangling-entry')).toBe('interface-dangling');
    expect(codesByEntry.get('unbound-entry')).toBe('interface-unbound');
    expect(codesByEntry.get('hidden-entry')).toBe('interface-hidden');
    expect(codesByEntry.get('mismatch-entry')).toBe('interface-type-mismatch');
    expect(codesByEntry.get('over-bound-entry')).toBe('interface-over-bound');
  });

  it('never throws on a malformed-looking but structurally valid workflow', () => {
    const entry = makeEntry({ bindings: [{ nodeId: 'nope', portId: 'nope' }] });
    const workflow = makeWorkflow([], [], { inputs: [entry], outputs: [entry] });
    expect(() => validateWorkflowInterface(workflow)).not.toThrow();
  });
});

// =========================================================================
// rewriteInterfaceBindings
// =========================================================================

describe('rewriteInterfaceBindings', () => {
  function inputMapping(overrides: Partial<PortMapping> = {}): PortMapping {
    return {
      oldHandleId: buildHandleId('old-node', 'input', 'in-1'),
      newHandleId: buildHandleId('new-node', 'input', 'in-1'),
      oldPortId: 'in-1',
      newPortId: 'in-1',
      direction: 'input',
      ...overrides
    };
  }

  it('returns undefined unchanged when the workflow has no interface', () => {
    expect(rewriteInterfaceBindings(undefined, 'old-node', 'new-node', [])).toBeUndefined();
  });

  it('rewrites a binding whose port follows the mapping, keeping the entry id', () => {
    const entry = makeEntry({
      id: 'public-in',
      bindings: [{ nodeId: 'old-node', portId: 'in-1' }]
    });
    const mapping = inputMapping({ newPortId: 'renamed-in' });

    const result = rewriteInterfaceBindings({ inputs: [entry] }, 'old-node', 'new-node', [
      { ...mapping, newPortId: 'renamed-in' }
    ]);

    expect(result?.inputs).toEqual([
      { ...entry, bindings: [{ nodeId: 'new-node', portId: 'renamed-in' }] }
    ]);
  });

  it('leaves a binding untouched when its port was dropped by the mapping', () => {
    const entry = makeEntry({
      id: 'public-in',
      bindings: [{ nodeId: 'old-node', portId: 'in-1' }]
    });

    // No mapping at all for this port — the swap dropped it.
    const result = rewriteInterfaceBindings({ inputs: [entry] }, 'old-node', 'new-node', []);

    expect(result?.inputs).toEqual([entry]);
    // Still points at the node that's gone — resolves as dangling, not pruned.
    const resolved = resolveInterface(makeWorkflow([], [], result));
    expect(resolved[0].status).toBe('dangling');
  });

  it('leaves a binding to a different node untouched', () => {
    const entry = makeEntry({ bindings: [{ nodeId: 'unrelated-node', portId: 'in-1' }] });
    const result = rewriteInterfaceBindings({ inputs: [entry] }, 'old-node', 'new-node', [
      inputMapping()
    ]);
    expect(result?.inputs).toEqual([entry]);
  });

  it('matches an output entry only against output-direction mappings', () => {
    const entry = makeEntry({
      id: 'public-out',
      bindings: [{ nodeId: 'old-node', portId: 'shared-id' }]
    });
    // An input mapping sharing the same portId must not apply to an output entry.
    const inputSideMapping = inputMapping({ oldPortId: 'shared-id', newPortId: 'wrong' });
    const outputSideMapping: PortMapping = {
      oldHandleId: buildHandleId('old-node', 'output', 'shared-id'),
      newHandleId: buildHandleId('new-node', 'output', 'right'),
      oldPortId: 'shared-id',
      newPortId: 'right',
      direction: 'output'
    };

    const result = rewriteInterfaceBindings({ outputs: [entry] }, 'old-node', 'new-node', [
      inputSideMapping,
      outputSideMapping
    ]);

    expect(result?.outputs).toEqual([
      { ...entry, bindings: [{ nodeId: 'new-node', portId: 'right' }] }
    ]);
  });

  it('preserves every other entry field untouched', () => {
    const entry = makeEntry({
      id: 'public-in',
      name: 'Display Name',
      description: 'Some description',
      required: true,
      defaultValue: 'x',
      meta: { 'fd.reserved': true, arbitrary: 'passthrough' },
      bindings: [{ nodeId: 'old-node', portId: 'in-1' }]
    });

    const result = rewriteInterfaceBindings({ inputs: [entry] }, 'old-node', 'new-node', [
      inputMapping()
    ]);

    expect(result?.inputs?.[0]).toMatchObject({
      id: 'public-in',
      name: 'Display Name',
      description: 'Some description',
      required: true,
      defaultValue: 'x',
      meta: { 'fd.reserved': true, arbitrary: 'passthrough' }
    });
  });
});

// =========================================================================
// validateLaunchInputs
// =========================================================================

describe('validateLaunchInputs', () => {
  const iface = {
    inputs: [
      { id: 'text', dataType: 'string', required: true, bindings: [] },
      { id: 'limit', dataType: 'number', defaultValue: 10, required: true, bindings: [] },
      { id: 'verbose', dataType: 'boolean', bindings: [] }
    ]
  };

  it('returns no issues without a declared interface — the server stays the authority', () => {
    expect(validateLaunchInputs(undefined, { anything: 1 })).toEqual([]);
  });

  it('accepts a complete, known input set', () => {
    expect(validateLaunchInputs(iface, { text: 'hi', verbose: false })).toEqual([]);
  });

  it('refuses an unknown key, naming the accepted set', () => {
    const issues = validateLaunchInputs(iface, { text: 'hi', bogus: 1 });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ key: 'bogus', code: 'unknown-key' });
    expect(issues[0].message).toContain('text, limit, verbose');
  });

  it('refuses a missing required input', () => {
    const issues = validateLaunchInputs(iface, {});
    expect(issues).toEqual([expect.objectContaining({ key: 'text', code: 'missing-required' })]);
  });

  it('treats an explicit undefined as missing', () => {
    const issues = validateLaunchInputs(iface, { text: undefined });
    expect(issues.map((issue) => issue.code)).toEqual(['missing-required']);
  });

  it('lets a defaultValue satisfy a required input', () => {
    // "limit" is required but carries a default — omitting it is fine.
    expect(validateLaunchInputs(iface, { text: 'hi' })).toEqual([]);
  });

  it('says so when the workflow declares no inputs at all', () => {
    const issues = validateLaunchInputs({ inputs: [] }, { stray: 1 });
    expect(issues[0].message).toContain('declares no inputs');
  });
});
