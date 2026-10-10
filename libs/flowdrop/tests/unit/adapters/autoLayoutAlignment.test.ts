import { describe, it, expect } from 'vitest';
import { computeAutoLayout } from '../../../src/lib/adapters/agentspec/autoLayout.js';
import type { AgentSpecFlow } from '../../../src/lib/types/agentspec.js';

function flow(names: string[], edges: Array<[string, string]>, start = names[0]): AgentSpecFlow {
  return {
    component_type: 'flow',
    name: 'f',
    start_node: start,
    nodes: names.map((name) => ({ component_type: 'start_node', name })) as never,
    control_flow_connections: edges.map(([from_node, to_node], i) => ({
      name: `e${i}`,
      from_node,
      to_node
    })) as never
  };
}

const dims = (heights: Record<string, number>): Map<string, { width: number; height: number }> =>
  new Map(Object.entries(heights).map(([id, height]) => [id, { width: 280, height }]));

describe('computeAutoLayout: tops line up along chains', () => {
  it('puts every node of a chain at the same top, whatever its height', () => {
    const positions = computeAutoLayout(
      flow(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['b', 'c']
        ]
      ),
      {},
      dims({ a: 160, b: 280, c: 120 })
    );
    expect(positions.get('b')!.y).toBe(positions.get('a')!.y);
    expect(positions.get('c')!.y).toBe(positions.get('a')!.y);
  });

  it('puts every y on the 20px grid', () => {
    const positions = computeAutoLayout(
      flow(
        ['a', 'b', 'c', 'd'],
        [
          ['a', 'b'],
          ['a', 'c'],
          ['a', 'd']
        ]
      ),
      { startY: 123 },
      dims({ a: 150, b: 130, c: 170, d: 90 })
    );
    for (const { y } of positions.values()) expect(y % 20).toBe(0);
  });

  it('puts the first branch on its parent and fans the others below it without overlap', () => {
    const heights = { a: 160, b: 200, c: 140, d: 120 };
    const positions = computeAutoLayout(
      flow(
        ['a', 'b', 'c', 'd'],
        [
          ['a', 'b'],
          ['a', 'c'],
          ['a', 'd']
        ]
      ),
      {},
      dims(heights)
    );
    const a = positions.get('a')!;
    expect(positions.get('b')!.y).toBe(a.y);
    const column = ['b', 'c', 'd'].map((id) => ({
      y: positions.get(id)!.y,
      h: heights[id as keyof typeof heights]
    }));
    for (let i = 1; i < column.length; i++) {
      expect(column[i].y).toBeGreaterThanOrEqual(column[i - 1].y + column[i - 1].h);
    }
  });

  it('keeps a branch of a converging pair aligned to its first predecessor', () => {
    const positions = computeAutoLayout(
      flow(
        ['a', 'b', 'c', 'd'],
        [
          ['a', 'b'],
          ['a', 'c'],
          ['b', 'd'],
          ['c', 'd']
        ]
      ),
      {},
      dims({ a: 160, b: 160, c: 160, d: 160 })
    );
    expect(positions.get('d')!.y).toBe(positions.get('b')!.y);
  });

  it('keeps columns left to right and does not overlap a column with the next', () => {
    const positions = computeAutoLayout(
      flow(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['b', 'c']
        ]
      ),
      {},
      dims({ a: 160, b: 160, c: 160 })
    );
    expect(positions.get('a')!.x).toBeLessThan(positions.get('b')!.x);
    expect(positions.get('b')!.x).toBeLessThan(positions.get('c')!.x);
  });

  it('places nodes the flow does not reach below the aligned ones', () => {
    const positions = computeAutoLayout(
      flow(['a', 'b', 'x'], [['a', 'b']]),
      {},
      dims({ a: 160, b: 160, x: 160 })
    );
    expect(positions.get('b')!.y).toBe(positions.get('a')!.y);
    expect(positions.has('x')).toBe(true);
  });
});
