/**
 * Unit Test — the graph sweep on graphs the design demos do not cover: a spacing break traded for an
 * overlap, crowded columns, graphs far off the grid, cycles without a loop_back port, and size.
 */

import { describe, it, expect } from 'vitest';
import {
  sweep,
  measure,
  score,
  better,
  columnRanks,
  DEFAULT_LAYOUT_OPTIONS as BASE_OPTIONS,
  LAYOUT_GRID
} from '$lib/layout/index.js';

/** These examples pin the design numbers of the curved loopback; lanes are covered in measure/geometry. */
const OPTIONS = { ...BASE_OPTIONS, loopbacks: 'curve' as const };
import type { LayoutCard, LayoutGraph, LayoutOptions, LayoutWire } from '$lib/layout/index.js';
import { demoCard, demoWire } from './fixtures.js';

const lane: LayoutOptions = { ...OPTIONS, loopbacks: 'lane' };

/** A seeded random graph: two inputs (one a loop_back), two outputs, tree-like wiring, loopbacks. */
function randomGraph(seed: number, n: number): LayoutGraph {
  let state = seed;
  const rnd = () => (state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const grid = (max: number) => Math.round((rnd() * max) / 20) * 20;
  const cards: LayoutCard[] = [];
  for (let i = 0; i < n; i++) {
    cards.push({
      id: `n${i}`,
      kind: 'card',
      x: grid(40 * n),
      y: grid(20 * n),
      width: 280,
      height: 120,
      inputs: [
        { portId: 'in', dx: 0, dy: 60 },
        { portId: 'loop_back', dx: 0, dy: 80 }
      ],
      outputs: [
        { portId: 'out', dx: 280, dy: 60 },
        { portId: 'alt', dx: 280, dy: 80 }
      ]
    });
  }
  const wires: LayoutWire[] = [];
  const wire = (id: string, s: string, sp: string, t: string, tp: string) =>
    wires.push({
      id,
      source: s,
      sourcePort: sp,
      target: t,
      targetPort: tp,
      loopback: tp === 'loop_back'
    });
  for (let i = 1; i < n; i++) {
    wire(`w${i}`, `n${Math.floor(rnd() * i)}`, rnd() < 0.7 ? 'out' : 'alt', `n${i}`, 'in');
    if (rnd() < 0.25) wire(`b${i}`, `n${i}`, 'out', `n${Math.floor(rnd() * i)}`, 'loop_back');
  }
  return { cards, wires };
}

describe('sweep: an overlap is worse than a spacing break', () => {
  // s feeds a column of four. c0..c2 sit a little off each other (spacing breaks); c3 sits right
  // under c2's neighbour. Moving c3 up onto c0 would straighten nothing and bury a card.
  // 280 x 120 cards with the ports mid-height, the geometry of the reviewer's repro.
  const plain = (id: string, x: number, y: number): LayoutCard => ({
    id,
    kind: 'card',
    x,
    y,
    width: 280,
    height: 120,
    inputs: [{ portId: 'in', dx: 0, dy: 60 }],
    outputs: [{ portId: 'out', dx: 280, dy: 60 }]
  });
  const start = (): LayoutGraph => {
    const cards = [plain('s', 0, 0)];
    const wires: LayoutWire[] = [];
    [
      [400, 0],
      [413, 40],
      [426, 80],
      [400, 120]
    ].forEach(([x, y], i) => {
      cards.push(plain(`c${i}`, x, y));
      wires.push(demoWire('s', 'out', `c${i}`, 'in'));
    });
    return { cards, wires };
  };

  it('never puts a card on another', () => {
    const result = sweep(start(), OPTIONS);
    expect(result.after.overlaps).toBe(0);
    const again = measure(result.graph, OPTIONS);
    expect(again.overlaps).toBe(0);
  });

  it('an overlap outranks any number of spacing breaks', () => {
    const base = measure(start(), OPTIONS);
    const overlapped = { ...base, overlaps: 1, spacing: 0 };
    const tight = { ...base, overlaps: 0, spacing: 9 };
    expect(better(score(tight), score(overlapped))).toBe(true);
    expect(better(score(overlapped), score(tight))).toBe(false);
  });
});

describe('sweep on random graphs: overlaps do not grow, and mostly go', () => {
  for (const [name, options] of [
    ['curved loopbacks', OPTIONS],
    ['return lanes', lane]
  ] as const) {
    it(`40 cards (${name})`, () => {
      for (const seed of [1, 2, 3]) {
        const graph = randomGraph(seed, 40);
        const result = sweep(graph, options);
        // The G1 guard uses the same score: whatever is accepted ranks better, overlaps first.
        if (result.accepted) {
          expect(better(score(result.after), score(result.before))).toBe(true);
        }
        expect(result.after.overlaps).toBeLessThanOrEqual(result.before.overlaps);
        expect(result.after.overlaps).toBe(0);
        expect(result.after.spacing).toBe(0);
        // The reported measure is the real one.
        expect(measure(result.graph, options).overlaps).toBe(result.after.overlaps);
      }
    });
  }

  it('a crowded column of 30 cards is spread, not left stacked', () => {
    const cards = [demoCard({ id: 's', x: 0, y: 0, inputs: [], outputs: ['out'] })];
    const wires: LayoutWire[] = [];
    for (let i = 0; i < 30; i++) {
      cards.push(demoCard({ id: `c${i}`, x: 400, y: (i % 5) * 20, inputs: ['in'], outputs: [] }));
      wires.push(demoWire('s', 'out', `c${i}`, 'in'));
    }
    const result = sweep({ cards, wires }, OPTIONS);
    expect(result.before.overlaps).toBeGreaterThan(0);
    expect(result.after).toMatchObject({ overlaps: 0, spacing: 0 });
  });
});

describe('sweep: speed', () => {
  // Generous bounds: 60 cards take well under a second; the point is that nothing is quadratic
  // in the number of loopbacks any more (lanes used to cost ten times the curved loopbacks).
  it.each([
    ['curved loopbacks', OPTIONS],
    ['return lanes', lane]
  ] as const)('60 cards, %s', (_name, options) => {
    const graph = randomGraph(1, 60);
    const t = performance.now();
    sweep(graph, options);
    expect(performance.now() - t).toBeLessThan(10_000);
  });
});

describe('sweep: the grid', () => {
  it('puts the graph back on the grid when its top-left is off it', () => {
    const start: LayoutGraph = {
      cards: [
        demoCard({ id: 's', x: 7, y: 7, inputs: [], outputs: ['out'] }),
        ...[0, 1, 2].map((i) =>
          demoCard({
            id: `c${i}`,
            x: 407 + i * 31,
            y: 7 + [0, 60, 230][i],
            inputs: ['in'],
            outputs: []
          })
        )
      ],
      wires: [0, 1, 2].map((i) => demoWire('s', 'out', `c${i}`, 'in'))
    };
    const result = sweep(start, OPTIONS);
    expect(result.accepted).toBe(true);
    for (const c of result.graph.cards) {
      expect(c.x % LAYOUT_GRID).toBe(0);
      expect(c.y % LAYOUT_GRID).toBe(0);
    }
    // The nearest grid point to the original corner (7, 7) is (0, 0).
    const xs = result.graph.cards.map((c) => c.x);
    const ys = result.graph.cards.map((c) => c.y);
    expect([Math.min(...xs), Math.min(...ys)]).toEqual([0, 0]);
  });
});

describe('columnRanks: cycles without a loop_back port', () => {
  const idle = (n: number): LayoutCard[] =>
    Array.from({ length: n }, (_, i) =>
      demoCard({ id: `n${i}`, x: 0, y: i * 200, inputs: ['in'], outputs: ['out'] })
    );

  it('a two-node cycle does not push anything to the far right', () => {
    const ranks = columnRanks({
      cards: idle(30),
      wires: [demoWire('n0', 'out', 'n1', 'in'), demoWire('n1', 'out', 'n0', 'in')]
    });
    expect(Math.max(...ranks.values())).toBeLessThanOrEqual(1);
    expect(ranks.get('n0')).toBe(0);
    expect(ranks.get('n1')).toBe(1);
  });

  it('cuts a longer cycle where the walk from the start node comes back', () => {
    const wires = [
      demoWire('n0', 'out', 'n1', 'in'),
      demoWire('n1', 'out', 'n2', 'in'),
      demoWire('n2', 'out', 'n3', 'in'),
      demoWire('n3', 'out', 'n1', 'in'),
      demoWire('n3', 'out', 'n4', 'in')
    ];
    const ranks = columnRanks({ cards: idle(5), wires });
    expect([...ranks.values()]).toEqual([0, 1, 2, 3, 4]);
  });

  it('a graph that is only a cycle still gets finite columns, and the sweep ends', () => {
    const wires = [
      demoWire('n0', 'out', 'n1', 'in'),
      demoWire('n1', 'out', 'n2', 'in'),
      demoWire('n2', 'out', 'n0', 'in')
    ];
    const graph = { cards: idle(3), wires };
    expect(Math.max(...columnRanks(graph).values())).toBeLessThanOrEqual(2);
    const result = sweep(graph, OPTIONS);
    expect(Math.max(...result.graph.cards.map((c) => c.x))).toBeLessThan(2000);
  });

  it('a 30-card sweep with a two-node cycle stays compact', () => {
    const wires: LayoutWire[] = [];
    for (let i = 1; i < 30; i++) wires.push(demoWire(`n${i - 1}`, 'out', `n${i}`, 'in'));
    wires.push(demoWire('n5', 'out', 'n4', 'in'));
    const result = sweep({ cards: idle(30), wires }, OPTIONS);
    expect(Math.max(...result.graph.cards.map((c) => c.x))).toBeLessThan(30 * 400);
  });
});
