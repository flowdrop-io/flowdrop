import { describe, it, expect } from 'vitest';
import {
  measure,
  score,
  better,
  formatMetrics,
  conflictCards
} from '../../../src/lib/layout/measure.js';
import { DEFAULT_LAYOUT_OPTIONS, type LayoutGraph } from '../../../src/lib/layout/types.js';
import { demoCard, demoWire, rightToLeft, tangled } from './fixtures.js';

const curve = DEFAULT_LAYOUT_OPTIONS;
const lane = { ...DEFAULT_LAYOUT_OPTIONS, loopbacks: 'lane' as const };

const crossingPairs = (graph: LayoutGraph, options = curve) =>
  measure(graph, options)
    .crossings.map(({ a, b }) => [a, b].sort().join(' x '))
    .sort();

describe('measure: the design examples', () => {
  it('right to left: straight 0/9, backward 8, crossings 12, no overlap, spacing ok', () => {
    const m = measure(rightToLeft(), curve);
    expect(formatMetrics(m)).toBe(
      'straight 0/9 · backward 8 · crossings 12 · overlaps 0 · spacing ok'
    );
    expect(m.unresolved).toEqual([]);
  });

  it('right to left: the same 12 crossings as the demo', () => {
    expect(crossingPairs(rightToLeft())).toContain(
      'parse.customer>invoice.customer x price.total>invoice.total'
    );
    expect(crossingPairs(rightToLeft())).toEqual(crossingPairs(rightToLeft(), lane));
  });

  it('tangled: straight 0/6, crossings 3 with the loopback curved, 2 with a lane', () => {
    expect(measure(tangled(), curve)).toMatchObject({
      straight: 0,
      total: 6,
      backward: 0,
      overlaps: 1
    });
    expect(crossingPairs(tangled())).toEqual([
      'classify.label>compose.label x lookup.contact>compose.contact',
      'form.email>lookup.email x form.message>classify.text',
      'loop.item>send.to x send.sent>loop.loop_back'
    ]);
    expect(crossingPairs(tangled(), lane)).toHaveLength(2);
  });

  it('tangled: classify and lookup overlap', () => {
    const m = measure(tangled(), curve);
    expect(m.conflicts).toContainEqual({ card: 'classify', with: 'lookup', kind: 'overlap' });
  });

  it('a free caption is an obstacle: 20px above compose is a spacing break (D8)', () => {
    const m = measure(tangled(), curve);
    expect(m.conflicts).toContainEqual({ card: 'compose', with: 'cap1', kind: 'spacing' });
    expect(m.spacing).toBe(1);
    expect(conflictCards(m)).toEqual(new Set(['classify', 'lookup', 'compose', 'cap1']));
  });
});

describe('measure: rules', () => {
  const two = (b: { x: number; y: number }, kindB: 'card' | 'note' = 'card'): LayoutGraph => ({
    cards: [
      demoCard({ id: 'a', x: 0, y: 0, inputs: ['in'], outputs: ['out'] }),
      { ...demoCard({ id: 'b', ...b, inputs: ['in'], outputs: ['out'] }), kind: kindB }
    ],
    wires: []
  });

  it('side by side needs gap x', () => {
    expect(measure(two({ x: 240 + 100, y: 0 }), curve).spacing).toBe(1);
    expect(measure(two({ x: 240 + 120, y: 0 }), curve).spacing).toBe(0);
  });

  it('stacked needs gap y (card height 120)', () => {
    expect(measure(two({ x: 0, y: 120 + 20 }), curve).spacing).toBe(1);
    expect(measure(two({ x: 0, y: 120 + 40 }), curve).spacing).toBe(0);
  });

  it('diagonal neighbours need neither gap', () => {
    expect(measure(two({ x: 260, y: 140 }), curve)).toMatchObject({ spacing: 0, overlaps: 0 });
  });

  it('the gaps are options', () => {
    expect(measure(two({ x: 340, y: 0 }), { ...curve, gapX: 100 }).spacing).toBe(0);
    expect(measure(two({ x: 0, y: 140 }), { ...curve, gapY: 20 }).spacing).toBe(0);
  });

  it('two annotations are never checked against each other', () => {
    const g = two({ x: 0, y: 0 }, 'note');
    g.cards[0].kind = 'caption';
    expect(measure(g, curve)).toMatchObject({ spacing: 0, overlaps: 0 });
  });

  it('a level wire running right to left is backward, not straight', () => {
    const g: LayoutGraph = {
      cards: [
        demoCard({ id: 'a', x: 400, y: 0, inputs: [], outputs: ['out'] }),
        demoCard({ id: 'b', x: 0, y: 0, inputs: ['in'], outputs: [] })
      ],
      wires: [demoWire('a', 'out', 'b', 'in')]
    };
    expect(measure(g, curve)).toMatchObject({ straight: 0, backward: 1, total: 1 });
  });

  it('wires out of one port or into one port never cross each other', () => {
    const g: LayoutGraph = {
      cards: [
        demoCard({ id: 'a', x: 0, y: 200, inputs: [], outputs: ['out'] }),
        demoCard({ id: 'b', x: 400, y: 0, inputs: ['in'], outputs: [] }),
        demoCard({ id: 'c', x: 400, y: 400, inputs: ['in'], outputs: [] })
      ],
      wires: [demoWire('a', 'out', 'b', 'in'), demoWire('a', 'out', 'c', 'in')]
    };
    expect(measure(g, curve).crossings).toEqual([]);
  });

  it('a wire whose port is unknown is left out and reported', () => {
    const g: LayoutGraph = {
      cards: [demoCard({ id: 'a', x: 0, y: 0, inputs: [], outputs: ['out'] })],
      wires: [demoWire('a', 'out', 'gone', 'in')]
    };
    expect(measure(g, curve)).toMatchObject({ total: 0, unresolved: ['a.out>gone.in'] });
  });
});

describe('score', () => {
  it('ranks overlaps and spacing above straight wires (D1)', () => {
    expect(better([0, 0, 0, 9, 400], [1, -5, 0, 0, 0])).toBe(true);
  });

  it('ranks straight wires above backward wires, crossings and movement', () => {
    expect(better([0, -3, 2, 5, 300], [0, -2, 0, 0, 0])).toBe(true);
  });

  it('a tie is not better', () => {
    expect(better([0, -1, 0, 0, 20], [0, -1, 0, 0, 20])).toBe(false);
  });

  it('pixels moved breaks a tie', () => {
    const m = measure(rightToLeft(), curve);
    expect(better(score(m, 20), score(m, 40))).toBe(true);
    expect(score(m)).toEqual([0, -0, 8, 12, 0]);
  });
});
