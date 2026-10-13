import { describe, it, expect } from 'vitest';
import { applyProposalToNodes, buildPortsConfig } from '../../../src/lib/layout/toWorkflow.js';
import { propose, beautify } from '../../../src/lib/layout/primitives.js';
import { fromWorkflow } from '../../../src/lib/layout/fromWorkflow.js';
import { DEFAULT_LAYOUT_OPTIONS as o } from '../../../src/lib/layout/types.js';
import { tangled } from './fixtures.js';
import type { NodePort, WorkflowEdge, WorkflowNode } from '../../../src/lib/types/index.js';

const port = (id: string, type: 'input' | 'output', extra: Partial<NodePort> = {}): NodePort => ({
  id,
  name: id,
  type,
  dataType: 'string',
  ...extra
});

function node(
  id: string,
  x: number,
  y: number,
  inputs: NodePort[],
  outputs: NodePort[],
  config: Record<string, unknown> = {}
): WorkflowNode {
  return {
    id,
    type: 'universalNode',
    position: { x, y },
    data: {
      label: id,
      config,
      metadata: { id, name: id, type: 'default', inputs, outputs } as never
    }
  } as WorkflowNode;
}

const edge = (s: string, sp: string, t: string, tp: string): WorkflowEdge =>
  ({
    id: `${s}.${sp}>${t}.${tp}`,
    source: s,
    target: t,
    sourceHandle: `${s}-output-${sp}`,
    targetHandle: `${t}-input-${tp}`
  }) as WorkflowEdge;

describe('buildPortsConfig', () => {
  const ins = ['contact', 'label', 'extra'].map((id) => port(id, 'input'));

  it('stores the new order as entries', () => {
    const n = node('compose', 0, 0, ins, []);
    expect(buildPortsConfig(n, 'inputs', ['label', 'contact', 'extra'])).toEqual({
      inputs: [{ id: 'label' }, { id: 'contact' }, { id: 'extra' }]
    });
  });

  it('writes reserved ports last, whatever slot the stored order gave them (Q3)', () => {
    const n = node(
      'cmp',
      0,
      0,
      [
        port('data', 'input'),
        port('matchText', 'input'),
        port('trigger', 'input', { dataType: 'trigger' }),
        port('loop_back', 'input', { dataType: 'trigger' })
      ],
      [],
      {
        ports: {
          inputs: [{ id: 'trigger' }, { id: 'data' }, { id: 'loop_back' }, { id: 'matchText' }]
        }
      }
    );
    expect(buildPortsConfig(n, 'inputs', ['trigger', 'matchText', 'data'])).toEqual({
      inputs: [{ id: 'matchText' }, { id: 'data' }, { id: 'trigger' }, { id: 'loop_back' }]
    });
  });

  it('stores nothing when the new order is the default one', () => {
    const n = node('compose', 0, 0, ins, [], {
      ports: { inputs: [{ id: 'label' }, { id: 'contact' }, { id: 'extra' }] }
    });
    expect(buildPortsConfig(n, 'inputs', ['contact', 'label', 'extra'])).toBeUndefined();
  });

  it('a hidden port keeps its entry and its slot; the visible ones trade places', () => {
    const n = node(
      'compose',
      0,
      0,
      [port('a', 'input'), port('hid', 'input', { exposedByDefault: false }), port('b', 'input')],
      [],
      { ports: { inputs: [{ id: 'a' }, { id: 'hid', exposed: false }, { id: 'b' }] } }
    );
    expect(buildPortsConfig(n, 'inputs', ['b', 'a'])).toEqual({
      inputs: [{ id: 'b' }, { id: 'hid', exposed: false }, { id: 'a' }]
    });
  });

  it('keeps entries for ports the node does not have, and the other direction', () => {
    const n = node('compose', 0, 0, ins, [port('reply', 'output')], {
      ports: {
        inputs: [{ id: 'ghost', exposed: false }],
        outputs: [{ id: 'reply', exposed: false }]
      }
    });
    expect(buildPortsConfig(n, 'inputs', ['label', 'contact', 'extra'])).toEqual({
      inputs: [
        { id: 'label' },
        { id: 'contact' },
        { id: 'extra' },
        { id: 'ghost', exposed: false }
      ],
      outputs: [{ id: 'reply', exposed: false }]
    });
  });
});

describe('applyProposalToNodes', () => {
  // The tangled graph as a workflow, so the layout comes from the real builder.
  const nodes = [
    node('a', 0, -500, [], [port('email', 'output'), port('message', 'output')]),
    node(
      'b',
      360,
      100,
      [port('contact', 'input'), port('label', 'input')],
      [port('reply', 'output')],
      {
        ports: { outputs: [{ id: 'reply', exposed: false }] },
        title: 'kept'
      }
    ),
    node('c', 0, 500, [], [port('contact', 'output')]),
    node('d', 0, 300, [], [port('label', 'output')])
  ];
  const edges = [edge('c', 'contact', 'b', 'contact'), edge('d', 'label', 'b', 'label')];
  const demoGeometry = (id: string) => {
    const n = nodes.find((x) => x.id === id)!;
    const ins = n.data.metadata.inputs;
    const outs = n.data.metadata.outputs;
    const rows = Math.max(ins.length, outs.length, 1);
    return {
      width: 240,
      height: 80 + (rows - 1) * 40 + 40,
      inputs: ins.map((p, i) => ({ portId: p.id, dx: 0, dy: 80 + i * 40 })),
      outputs: outs.map((p, i) => ({ portId: p.id, dx: 240, dy: 80 + i * 40 }))
    };
  };
  const graph = fromWorkflow(nodes, edges, { measured: demoGeometry });

  it('a port reorder becomes the node config, with the rest of the config kept', () => {
    const p = propose(graph, 'b', 'ports', o);
    expect(p.accepted).toBe(true);
    const [update] = applyProposalToNodes(nodes, [p]);
    expect(update).toEqual({
      nodeId: 'b',
      config: {
        title: 'kept',
        ports: {
          inputs: [{ id: 'label' }, { id: 'contact' }],
          outputs: [{ id: 'reply', exposed: false }]
        }
      }
    });
    expect(update.position).toBeUndefined();
  });

  it('a move becomes a position, and the input nodes are not touched', () => {
    const before = JSON.stringify(nodes);
    const p = propose(graph, 'd', 'align', o);
    expect(p.accepted).toBe(true);
    const [update] = applyProposalToNodes(nodes, [p]);
    expect(update.nodeId).toBe('d');
    expect(update.position).toEqual(p.changes.position!.to);
    expect(update.config).toBeUndefined();
    expect(JSON.stringify(nodes)).toBe(before);
  });

  it('refused proposals give nothing, and steps of one node merge', () => {
    expect(applyProposalToNodes(nodes, [propose(graph, 'a', 'clear', o)])).toEqual([]);
    const r = beautify(tangled(), 'compose', 'all', o);
    expect(r.steps.some((s) => s.accepted)).toBe(true);
    const all = applyProposalToNodes(nodes, [
      propose(graph, 'd', 'align', o),
      propose(graph, 'b', 'ports', o)
    ]);
    expect(all.map((u) => u.nodeId)).toEqual(['d', 'b']);
  });

  it('skips a proposal for a node that is not in the list', () => {
    const p = propose(tangled(), 'compose', 'ports', o);
    expect(applyProposalToNodes(nodes, [p])).toEqual([]);
  });
});
