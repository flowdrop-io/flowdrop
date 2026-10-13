import { describe, it, expect } from 'vitest';
import {
  measure,
  score,
  better,
  formatMetrics,
  conflictCards,
  passCards,
  scoreMove
} from '../../../src/lib/layout/measure.js';
import {
  DEFAULT_LAYOUT_OPTIONS,
  type LayoutCard,
  type LayoutGraph,
  type LayoutWire
} from '../../../src/lib/layout/types.js';
import { demoCard, demoWire, jurgenDries, rightToLeft, tangled } from './fixtures.js';

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
    expect(better([0, 0, 0, 0, 9, 0, 0, 400], [0, 1, 0, -5, 0, 0, 0, 0])).toBe(true);
    expect(better([0, 0, 0, 0, 9, 0, 0, 400], [1, 0, 0, -5, 0, 0, 0, 0])).toBe(true);
  });

  it('ranks an overlap above spacing: a spacing break never buys back an overlap', () => {
    // One overlap and no spacing break is worse than three spacing breaks, whatever the wires do.
    expect(better([0, 3, 0, 0, 0, 0, 0, 0], [1, 0, 0, -9, 0, 0, 0, 0])).toBe(true);
    expect(better([1, 0, 0, -9, 0, 0, 0, 0], [0, 3, 0, 0, 0, 0, 0, 0])).toBe(false);
  });

  it('ranks straight wires above backward wires, crossings and movement', () => {
    expect(better([0, 0, 0, -3, 2, 5, 0, 300], [0, 0, 0, -2, 0, 0, 0, 0])).toBe(true);
  });

  it('a tie is not better', () => {
    expect(better([0, 0, 0, -1, 0, 0, 0, 20], [0, 0, 0, -1, 0, 0, 0, 20])).toBe(false);
  });

  it('pixels moved breaks a tie', () => {
    const m = measure(rightToLeft(), curve);
    expect(better(score(m, 20), score(m, 40))).toBe(true);
    expect(score(m)).toEqual([0, 0, 0, -0, 8, 12, 0, 0]);
  });
});

describe('ports passed (H4)', () => {
  // a → c runs level through b's unused input and output on the same row.
  const row = (): LayoutGraph => ({
    cards: [
      demoCard({ id: 'a', x: 0, y: 0, inputs: [], outputs: ['out'] }),
      demoCard({ id: 'b', x: 360, y: 0, inputs: ['in'], outputs: ['out'] }),
      demoCard({ id: 'c', x: 720, y: 0, inputs: ['in'], outputs: [] })
    ],
    wires: [demoWire('a', 'out', 'c', 'in')]
  });
  const passed = (graph: LayoutGraph) =>
    measure(graph, curve)
      .passes.map((p) => `${p.wire} @ ${p.card}.${p.direction}.${p.port}`)
      .sort();

  it('counts every handle a wire runs through, unconnected or not', () => {
    expect(passed(row())).toEqual(['a.out>c.in @ b.input.in', 'a.out>c.in @ b.output.out']);
    const m = measure(row(), curve);
    expect(m.straight).toBe(1);
    expect(score(m).slice(0, 4)).toEqual([0, 0, 2, -1]);
    expect(passCards(m)).toEqual(new Set(['a', 'b', 'c']));
    expect(formatMetrics(m)).toBe(
      'straight 1/1 · backward 0 · crossings 0 · overlaps 0 · spacing ok · ports passed 2'
    );
  });

  it('outranks a straight wire: a bent wire past the ports scores better', () => {
    const bent = row();
    bent.cards[2] = { ...bent.cards[2], y: 100 };
    expect(passed(bent)).toEqual([]);
    expect(better(score(measure(bent, curve)), score(measure(row(), curve)))).toBe(true);
  });

  it('a handle one row away does not count', () => {
    const g = row();
    g.cards[1] = { ...g.cards[1], y: 40 };
    expect(passed(g)).toEqual([]);
    expect(measure(g, curve).nearMisses).toEqual([]);
  });

  it('a wire closer than a grid step but outside the hit is a near miss, ranked below crossings', () => {
    const g = row();
    g.cards[1] = { ...g.cards[1], y: 12 };
    const m = measure(g, curve);
    expect(passed(g)).toEqual([]);
    expect(m.nearMisses.map((p) => `${p.card}.${p.direction}.${p.port}`).sort()).toEqual([
      'b.input.in',
      'b.output.out'
    ]);
    expect(score(m)).toEqual([0, 0, 0, -1, 0, 0, 2, 0]);
    expect(formatMetrics(m)).toBe(
      'straight 1/1 · backward 0 · crossings 0 · overlaps 0 · spacing ok · near misses 2'
    );
  });

  it('a handle wired to the same port as the other end does not count (it reads true)', () => {
    const g = row();
    g.wires.push(demoWire('a', 'out', 'b', 'in'), demoWire('b', 'out', 'c', 'in'));
    // a.out feeds b.in, and b.out feeds c.in: both readings are true.
    expect(passed(g)).toEqual([]);
  });

  it('a wire drawn right to left does not count (it is backward)', () => {
    const g = row();
    g.wires = [demoWire('c', 'out', 'a', 'out')];
    g.cards[2] = { ...g.cards[2], outputs: [{ portId: 'out', dx: 240, dy: 80 }] };
    g.cards[0] = { ...g.cards[0], inputs: [{ portId: 'out', dx: 0, dy: 80 }] };
    expect(measure(g, curve).backward).toBe(1);
    expect(passed(g)).toEqual([]);
  });

  it('Jurgen - Dries as the old sweep left it: message → values runs through Preview and Confirm', () => {
    const g = jurgenDries();
    const at = (id: string, x: number, y: number) =>
      (g.cards = g.cards.map((c) => (c.id === id ? { ...c, x, y } : c)));
    at('chat_input', -620, -120);
    at('messenger', -220, -120);
    at('confirmation', 180, -155);
    at('entity_save', 580, -160);
    expect(passed(g)).toEqual([
      'chat_input.message>entity_save.values @ confirmation.output.False',
      'chat_input.message>entity_save.values @ messenger.output.message'
    ]);
  });
});

describe('scoreMove: the score of a one-card move, counted incrementally', () => {
  /** A seeded random graph: cards with two inputs (one a loop_back) and two outputs, forward
   *  wires with fan-out, loopbacks, a note, and a wire to an unknown card. */
  function randomGraph(seed: number, n: number): LayoutGraph {
    let state = seed;
    const rnd = () => (state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const grid = (max: number) => Math.round((rnd() * max) / 20) * 20;
    const cards: LayoutCard[] = [];
    for (let i = 0; i < n; i++) {
      cards.push({
        id: `n${i}`,
        kind: 'card',
        x: grid(2000),
        y: grid(1000),
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
    cards.push({
      id: 'note',
      kind: 'note',
      x: 400,
      y: 400,
      width: 200,
      height: 100,
      inputs: [],
      outputs: []
    });
    const wires: LayoutWire[] = [];
    const wire = (
      id: string,
      source: string,
      sourcePort: string,
      target: string,
      targetPort: string
    ) =>
      wires.push({
        id,
        source,
        sourcePort,
        target,
        targetPort,
        loopback: targetPort === 'loop_back'
      });
    for (let i = 1; i < n; i++) {
      wire(`w${i}`, `n${Math.floor(rnd() * i)}`, rnd() < 0.7 ? 'out' : 'alt', `n${i}`, 'in');
      if (rnd() < 0.25) wire(`b${i}`, `n${i}`, 'out', `n${Math.floor(rnd() * i)}`, 'loop_back');
    }
    wire('gone', 'n0', 'out', 'missing', 'in');
    return { cards, wires };
  }

  const move = (graph: LayoutGraph, id: string, dx: number, dy: number): LayoutGraph => ({
    ...graph,
    cards: graph.cards.map((c) => (c.id === id ? { ...c, x: c.x + dx, y: c.y + dy } : c))
  });

  for (const [name, options] of [
    ['curved loopbacks', curve],
    ['return lanes', lane]
  ] as const) {
    it(`equals the full measure for every move tried (${name})`, () => {
      const shifts = [
        [0, 20],
        [0, -40],
        [120, 0],
        [-300, 60],
        [0, 400]
      ];
      let compared = 0;
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const graph = randomGraph(seed, 12);
        const before = measure(graph, options);
        for (const card of graph.cards) {
          for (const [dx, dy] of shifts) {
            const next = move(graph, card.id, dx, dy);
            const moved = Math.abs(dx) + Math.abs(dy);
            expect(scoreMove(before, next, card.id, options, moved)).toEqual(
              score(measure(next, options), moved)
            );
            compared++;
          }
        }
      }
      expect(compared).toBe(6 * 13 * 5);
    });
  }

  it('equals the full measure on the design examples', () => {
    for (const graph of [tangled(), rightToLeft(), jurgenDries()]) {
      for (const options of [curve, lane]) {
        const before = measure(graph, options);
        for (const card of graph.cards) {
          const next = move(graph, card.id, 0, -20);
          expect(scoreMove(before, next, card.id, options, 20)).toEqual(
            score(measure(next, options), 20)
          );
        }
      }
    }
  });
});
