/**
 * Unit Test — the graph sweep (`layout beautify`)
 *
 * The two demo graphs of the design: "right to left" (every wire backwards, 12 crossings) and
 * "tangled" (crossings, an overlap, a loop, a caption and a note).
 */

import { describe, it, expect } from 'vitest';
import {
  sweep,
  formatSweep,
  measure,
  score,
  better,
  DEFAULT_LAYOUT_OPTIONS as BASE_OPTIONS,
  LAYOUT_GRID
} from '$lib/layout/index.js';

/** These examples pin the design numbers of the curved loopback; lanes are covered in measure/geometry. */
const OPTIONS = { ...BASE_OPTIONS, loopbacks: 'curve' as const };
import type { LayoutGraph } from '$lib/layout/index.js';
import { demoCard, demoWire, jurgenDries, rightToLeft, tangled } from './fixtures.js';

const positions = (g: LayoutGraph) => Object.fromEntries(g.cards.map((c) => [c.id, [c.x, c.y]]));
const topLeft = (g: LayoutGraph) => {
  const cards = g.cards.filter((c) => c.kind === 'card');
  return [Math.min(...cards.map((c) => c.x)), Math.min(...cards.map((c) => c.y))];
};

describe('sweep: right to left', () => {
  const start = rightToLeft();
  const result = sweep(start, OPTIONS);

  it('puts every wire in the flow direction and straightens 7 of 9', () => {
    expect(result.before).toMatchObject({ straight: 0, backward: 8, total: 9 });
    expect(result.before.crossings).toHaveLength(12);
    expect(result.after).toMatchObject({
      straight: 7,
      backward: 0,
      total: 9,
      overlaps: 0,
      spacing: 0
    });
  });

  // Phase 0 counts columns from the leftmost card (`columnOrigin: 'left'`), as the design demo
  // does; a single `column` move still counts from the start node.
  it('cuts 12 crossings to 0, as in the design (columns count from the leftmost card)', () => {
    expect(result.after.crossings).toHaveLength(0);
  });

  it('goes back to the original top-left', () => {
    expect(topLeft(result.graph)).toEqual(topLeft(start));
    expect(result.translation).toBeDefined();
  });

  it('keeps every card on the grid', () => {
    for (const c of result.graph.cards) {
      expect(c.x % LAYOUT_GRID).toBe(0);
      expect(c.y % LAYOUT_GRID).toBe(0);
    }
  });

  it('is a fixed point: a second sweep finds nothing to do', () => {
    const again = sweep(result.graph, OPTIONS);
    expect(again.accepted).toBe(false);
    expect(again.steps).toEqual([]);
    expect(formatSweep(again)[0]).toBe(
      'sweep: no change; the layout is as good as the primitives can make it'
    );
  });
});

describe('sweep: tangled', () => {
  const start = tangled();
  const result = sweep(start, OPTIONS);

  it('fixes the overlap and the spacing break, and the crossings', () => {
    expect(result.before).toMatchObject({ straight: 0, overlaps: 1, spacing: 1 });
    expect(result.before.crossings).toHaveLength(3);
    expect(result.after).toMatchObject({ straight: 3, total: 6, overlaps: 0, spacing: 0 });
    expect(result.after.crossings).toHaveLength(0);
  });

  it('runs the phases in order and reports only the ones that did something', () => {
    expect(result.phases.map((p) => p.phase)).toEqual([1, 2]);
    expect(result.steps.map((s) => `${s.nodeId}:${s.primitive}`)).toEqual([
      'lookup:clear',
      'compose:clear',
      'form:ports',
      'compose:ports',
      'send:align'
    ]);
    expect(result.steps.every((s) => s.accepted)).toBe(true);
  });

  it('never moves or reorders an annotation, and never lets one yield', () => {
    for (const id of ['cap1', 'note1']) {
      const was = start.cards.find((c) => c.id === id)!;
      const now = result.graph.cards.find((c) => c.id === id)!;
      expect(now).toEqual(was);
      expect(result.steps.some((s) => s.nodeId === id)).toBe(false);
    }
  });

  it('needs no translation when the top-left did not move', () => {
    expect(result.translation).toBeUndefined();
  });

  it('prints headers only for phases that happened, a line per step and the score', () => {
    const lines = formatSweep(result);
    expect(lines.filter((l) => l.startsWith('#'))).toEqual([
      '# phase 1: hard rules (the lower card of each pair yields)',
      '# phase 2: ports and align, alternating sweeps'
    ]);
    expect(lines).toContain('lookup: moved down 100 (y 200 → 300)');
    expect(lines).toContain('form: outputs reordered message, email (was email, message)');
    expect(lines[lines.length - 1]).toBe(
      'sweep: straight 0 → 3 · crossings 3 → 0 · overlaps 1 → 0 · spacing 1 too close → ok'
    );
  });

  it('a dry run says what would happen', () => {
    const lines = formatSweep(result, true);
    expect(lines).toContain('lookup: would move down 100 (y 200 → 300)');
    expect(lines).toContain(
      'form: would change: outputs reordered message, email (was email, message)'
    );
    expect(lines[lines.length - 1]).toMatch(/^would give: /);
  });

  it('every accepted step improved on the one before', () => {
    let current = measure(start, OPTIONS);
    for (const step of result.steps) {
      expect(step.before.crossings.length).toBe(current.crossings.length);
      expect(better(score(step.after, step.moved), score(step.before))).toBe(true);
      current = step.after;
    }
    expect(current.crossings).toEqual(result.after.crossings);
  });
});

describe('sweep: Jurgen - Dries (H4, no wire through a port)', () => {
  const result = sweep(jurgenDries(), OPTIONS);

  it('leaves no wire running through a port, and straightens the trigger chain', () => {
    expect(result.before.passes).toHaveLength(1);
    expect(result.after.passes).toEqual([]);
    expect(result.after).toMatchObject({ straight: 3, backward: 0, overlaps: 0, spacing: 0 });
    expect(result.after.crossings).toEqual([]);
  });

  it('keeps the near miss it cannot fix without bending a straight wire', () => {
    // message → values leaves Preview's edge 12px above `type`; moving Preview or Save would
    // bend chat → Preview or True → trigger, and straight wires outrank near misses.
    expect(result.before.nearMisses).toHaveLength(2);
    expect(result.after.nearMisses.map((p) => `${p.card}.${p.port}`)).toEqual(['messenger.type']);
  });

  it('message → values bends instead of running level through Preview and Confirm', () => {
    const values = result.after.wires.find(
      (w) => w.wire.id === 'chat_input.message>entity_save.values'
    )!;
    expect(values.sy).not.toBe(values.ty);
  });

  it('puts a card that started off the grid on it', () => {
    for (const card of result.graph.cards) {
      expect(Math.abs(card.x % LAYOUT_GRID)).toBe(0);
      expect(Math.abs(card.y % LAYOUT_GRID)).toBe(0);
    }
  });

  it('phase 0 puts every card into its column even when one move alone scores worse', () => {
    expect(result.phases[0].steps.map((s) => s.nodeId)).toEqual([
      'messenger',
      'confirmation',
      'entity_save'
    ]);
  });
});

describe('sweep: interface tags', () => {
  // a → b → c in a row, all level, but b's input tag runs into a and its output tag into c.
  const tagged = (): LayoutGraph => ({
    cards: [
      demoCard({ id: 'a', x: 0, y: 100, inputs: [], outputs: ['o'] }),
      {
        ...demoCard({ id: 'b', x: 360, y: 100, inputs: ['i'], outputs: ['o'] }),
        tags: { left: 100, right: 100 }
      },
      demoCard({ id: 'c', x: 720, y: 100, inputs: ['i'], outputs: [] })
    ],
    wires: [demoWire('a', 'o', 'b', 'i'), demoWire('b', 'o', 'c', 'i')]
  });

  it('moves the columns apart instead of moving a card off its row', () => {
    const r = sweep(tagged(), OPTIONS);
    expect(positions(r.graph)).toEqual({ a: [0, 100], b: [460, 100], c: [920, 100] });
    expect(r.after).toMatchObject({ spacing: 0, overlaps: 0, straight: 2 });
    expect(r.phases[0].notes).toContain('columns moved apart to make room for interface tags');
  });
});

describe('sweep: keeps the layout unless it gets better (G1)', () => {
  // Two unconnected cards off the grid: the sweep moves them onto it, which scores no better.
  const start: LayoutGraph = {
    cards: [
      demoCard({ id: 'a', x: 13, y: 217, inputs: [], outputs: ['out'] }),
      demoCard({ id: 'b', x: 402, y: 733, inputs: ['in'], outputs: [] })
    ],
    wires: []
  };
  const result = sweep(start, OPTIONS);

  it('applies nothing and returns the input graph', () => {
    expect(result.accepted).toBe(false);
    expect(result.steps).toEqual([]);
    expect(result.phases).toEqual([]);
    expect(result.graph).toBe(start);
    expect(result.after).toBe(result.before);
  });

  it('says what it found and why it kept the layout', () => {
    expect(result.noBetter).toBeDefined();
    const lines = formatSweep(result);
    expect(lines[0]).toBe(
      'sweep: no change; the best layout found is no better than the current one'
    );
    expect(lines[1]).toMatch(/^ {2}current: straight 0\/0 · /);
    expect(lines[2]).toMatch(/^ {2}found: {3}straight 0\/0 · /);
  });

  it('an improving sweep is not affected', () => {
    expect(sweep(tangled(), OPTIONS).noBetter).toBeUndefined();
    expect(sweep(rightToLeft(), OPTIONS).noBetter).toBeUndefined();
  });
});

describe('sweep: purity', () => {
  it.each([
    ['right to left', rightToLeft],
    ['tangled', tangled]
  ])('never mutates the input (%s)', (_name, make) => {
    const input = make();
    const frozen = JSON.stringify(input);
    const deepFreeze = (o: unknown): void => {
      if (o && typeof o === 'object') {
        Object.freeze(o);
        Object.values(o).forEach(deepFreeze);
      }
    };
    deepFreeze(input);
    const result = sweep(input, OPTIONS);
    expect(JSON.stringify(input)).toBe(frozen);
    expect(result.graph).not.toBe(input);
    expect(positions(result.graph)).not.toEqual(positions(input));
  });

  it('gives the same result twice', () => {
    expect(sweep(tangled(), OPTIONS)).toEqual(sweep(tangled(), OPTIONS));
  });

  it('a graph with nothing to improve returns itself unchanged', () => {
    const calm = sweep(sweep(tangled(), OPTIONS).graph, OPTIONS);
    expect(calm.accepted).toBe(false);
    expect(calm.phases).toEqual([]);
    expect(calm.after).toBe(calm.before);
  });

  it('an empty graph is a no-op', () => {
    const result = sweep({ cards: [], wires: [] }, OPTIONS);
    expect(result.accepted).toBe(false);
  });

  it('a graph of annotations only is a no-op', () => {
    const notes = tangled();
    const only = { cards: notes.cards.filter((c) => c.kind !== 'card'), wires: [] };
    const result = sweep(only, OPTIONS);
    expect(result.accepted).toBe(false);
  });
});
