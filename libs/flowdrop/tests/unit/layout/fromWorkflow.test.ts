import { describe, it, expect } from 'vitest';
import { fromWorkflow } from '../../../src/lib/layout/fromWorkflow.js';
import type { NodePort, WorkflowEdge, WorkflowNode } from '../../../src/lib/types/index.js';

const port = (id: string, type: 'input' | 'output', dataType = 'string'): NodePort => ({
  id,
  name: id,
  type,
  dataType
});

function node(
  id: string,
  {
    type = 'default',
    inputs = [] as NodePort[],
    outputs = [] as NodePort[],
    config = {} as Record<string, unknown>,
    x = 0,
    y = 0
  } = {}
): WorkflowNode {
  return {
    id,
    type: 'universalNode',
    position: { x, y },
    data: {
      label: id,
      config,
      metadata: {
        id,
        name: id,
        type,
        description: '',
        category: 'processing',
        version: '1',
        inputs,
        outputs
      }
    }
  } as unknown as WorkflowNode;
}

const edge = (source: string, sp: string, target: string, tp: string): WorkflowEdge => ({
  id: `${source}.${sp}>${target}.${tp}`,
  source,
  target,
  sourceHandle: `${source}-output-${sp}`,
  targetHandle: `${target}-input-${tp}`
});

describe('fromWorkflow', () => {
  it('falls back to the card contract: rows at 80, pitch 40, the trigger as a pin', () => {
    const g = fromWorkflow(
      [
        node('a', {
          inputs: [
            port('trigger', 'input', 'trigger'),
            port('text', 'input'),
            port('extra', 'input')
          ],
          outputs: [port('out', 'output')]
        })
      ],
      []
    );
    const [card] = g.cards;
    expect(card).toMatchObject({ kind: 'card', width: 280, height: 140 });
    expect(card.inputs).toEqual([
      { portId: 'trigger', dx: 0, dy: 40, fixed: true },
      { portId: 'text', dx: 0, dy: 80 },
      { portId: 'extra', dx: 0, dy: 120 }
    ]);
    expect(card.outputs).toEqual([{ portId: 'out', dx: 280, dy: 80 }]);
  });

  it('follows the stored port order and leaves hidden ports out', () => {
    const g = fromWorkflow(
      [
        node('a', {
          inputs: [port('one', 'input'), port('two', 'input'), port('three', 'input')],
          config: {
            ports: { inputs: [{ id: 'three' }, { id: 'one' }, { id: 'two', exposed: false }] }
          }
        })
      ],
      []
    );
    expect(g.cards[0].inputs.map((h) => h.portId)).toEqual(['three', 'one']);
  });

  it('gateway branches are outputs that never move (D4)', () => {
    const g = fromWorkflow(
      [
        node('g', {
          type: 'gateway',
          inputs: [port('value', 'input')],
          config: { branches: [{ name: 'yes' }, { name: 'no' }] }
        })
      ],
      []
    );
    expect(g.cards[0].outputs).toEqual([
      { portId: 'yes', dx: 280, dy: 80, fixed: true },
      { portId: 'no', dx: 280, dy: 120, fixed: true }
    ]);
  });

  it('reserved ports and loop_back are fixed', () => {
    const g = fromWorkflow(
      [
        node('l', {
          inputs: [port('items', 'input'), port('loop_back', 'input')],
          outputs: [port('item', 'output'), port('error', 'output')]
        })
      ],
      []
    );
    expect(g.cards[0].inputs.find((h) => h.portId === 'loop_back')?.fixed).toBe(true);
    expect(g.cards[0].outputs.find((h) => h.portId === 'error')?.fixed).toBe(true);
    expect(g.cards[0].outputs.find((h) => h.portId === 'item')?.fixed).toBeUndefined();
  });

  it('notes and captions are annotations with no handles', () => {
    const g = fromWorkflow(
      [
        { ...node('n', { type: 'note' }), measured: { width: 300, height: 160 } } as WorkflowNode,
        node('c', { type: 'default', config: { nodeType: 'caption' } })
      ],
      []
    );
    expect(g.cards[0]).toMatchObject({ kind: 'note', width: 300, height: 160, inputs: [] });
    expect(g.cards[1].kind).toBe('caption');
  });

  it('without a canvas measurement uses the card contract, not the stale size saved on the node', () => {
    // Saved workflows carry a `measured` width of 290 from an older card.
    const stale = {
      ...node('a', { inputs: [port('text', 'input')], outputs: [port('out', 'output')] }),
      measured: { width: 290, height: 500 }
    } as WorkflowNode;
    const [card] = fromWorkflow([stale], []).cards;
    expect(card.width).toBe(280);
    expect(card.height).toBe(100);
    // The handles come from the same contract: the output sits on the card's right edge.
    expect(card.outputs[0].dx).toBe(card.width);
  });

  it('the canvas measurement still wins over the contract', () => {
    const [card] = fromWorkflow([node('a', { outputs: [port('x', 'output')] })], [], {
      measured: () => ({
        width: 300,
        height: 150,
        inputs: [],
        outputs: [{ portId: 'x', dx: 300, dy: 70 }]
      })
    }).cards;
    expect(card).toMatchObject({ width: 300, height: 150 });
  });

  it('prefers the canvas measurement, sorted top to bottom', () => {
    const g = fromWorkflow(
      [node('a', { outputs: [port('x', 'output'), port('y', 'output')] })],
      [],
      {
        measured: () => ({
          width: 320,
          height: 200,
          inputs: [],
          outputs: [
            { portId: 'y', dx: 320, dy: 120 },
            { portId: 'x', dx: 320, dy: 80 }
          ]
        })
      }
    );
    expect(g.cards[0]).toMatchObject({ width: 320, height: 200 });
    expect(g.cards[0].outputs.map((h) => h.portId)).toEqual(['x', 'y']);
  });

  it('turns edges into wires and marks loopbacks', () => {
    const g = fromWorkflow([], [edge('a', 'out', 'b', 'in'), edge('b', 'out', 'a', 'loop_back')]);
    expect(g.wires).toEqual([
      {
        id: 'a.out>b.in',
        source: 'a',
        sourcePort: 'out',
        target: 'b',
        targetPort: 'in',
        loopback: false
      },
      {
        id: 'b.out>a.loop_back',
        source: 'b',
        sourcePort: 'out',
        target: 'a',
        targetPort: 'loop_back',
        loopback: true
      }
    ]);
  });
});
