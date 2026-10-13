import { describe, it, expect } from 'vitest';
import {
  beautify,
  formatBeautify,
  formatProposal,
  propose,
  columnRanks,
  type LayoutPrimitive
} from '../../../src/lib/layout/primitives.js';
import { formatChange, measure } from '../../../src/lib/layout/measure.js';
import {
  DEFAULT_LAYOUT_OPTIONS as o,
  LAYOUT_GRID,
  type LayoutGraph
} from '../../../src/lib/layout/types.js';
import { demoCard, demoWire, rightToLeft, tangled } from './fixtures.js';

const PRIMITIVES: LayoutPrimitive[] = ['column', 'ports', 'align', 'clear'];
const snapshot = (g: LayoutGraph) => JSON.stringify(g);
const card = (g: LayoutGraph, id: string) => g.cards.find((c) => c.id === id)!;

/** Every other card is exactly as it was. */
function othersUntouched(a: LayoutGraph, b: LayoutGraph, id: string) {
  for (const c of a.cards) if (c.id !== id) expect(card(b, c.id)).toEqual(c);
  expect(b.wires).toEqual(a.wires);
}

describe('ports', () => {
  it('tangled compose: label goes above contact, which fixes one crossing and makes one wire straight', () => {
    const g = tangled();
    const before = snapshot(g);
    const p = propose(g, 'compose', 'ports', o);
    expect(p.accepted).toBe(true);
    expect(p.message).toBe('inputs reordered label, contact (was contact, label)');
    expect(p.changes).toEqual({
      ports: { inputs: { from: ['contact', 'label'], to: ['label', 'contact'] } }
    });
    expect(p.before.straight).toBe(0);
    expect(p.after.straight).toBe(1);
    expect(p.before.crossings).toHaveLength(3);
    expect(p.after.crossings).toHaveLength(2);
    expect(formatChange(p.before, p.after)).toBe(
      'straight 0 → 1 · crossings 3 → 2 · overlaps 1 · spacing 1 too close'
    );
    expect(p.moved).toBe(0);
    expect(p.reason).toBeUndefined();
    expect(snapshot(g)).toBe(before);
  });

  it('never moves the node, keeps the slots, and touches nothing else', () => {
    const g = tangled();
    const p = propose(g, 'compose', 'ports', o);
    const next = card(p.graph, 'compose');
    const was = card(g, 'compose');
    expect({ x: next.x, y: next.y }).toEqual({ x: was.x, y: was.y });
    expect(next.inputs.map((h) => h.dy)).toEqual(was.inputs.map((h) => h.dy));
    expect(next.outputs).toEqual(was.outputs);
    othersUntouched(g, p.graph, 'compose');
  });

  it('refuses when the ports already follow their wires', () => {
    const g = rightToLeft();
    const p = propose(g, 'invoice', 'ports', o);
    expect(p.accepted).toBe(false);
    expect(p.reason).toBe('ports already follow their wires');
    expect(p.graph).toBe(g);
    expect(p.after).toBe(p.before);
  });

  it('sorts outputs by the mean y of what they feed (parse in right to left)', () => {
    const p = propose(rightToLeft(), 'parse', 'ports', o);
    expect(p.accepted).toBe(true);
    expect(p.message).toBe('outputs reordered customer, order (was order, customer)');
  });

  it('fixed and unconnected handles keep their slot', () => {
    // d wants the top slot, but a is fixed, c has no wire; only b and d trade places.
    const graph: LayoutGraph = {
      cards: [
        demoCard({ id: 'u', x: 0, y: 100, inputs: [], outputs: ['hi'] }),
        demoCard({ id: 'v', x: 0, y: 500, inputs: [], outputs: ['lo'] }),
        demoCard({
          id: 'n',
          x: 360,
          y: 300,
          inputs: ['a', 'b', 'c', 'd'],
          outputs: [],
          fixed: ['a']
        })
      ],
      wires: [demoWire('v', 'lo', 'n', 'b'), demoWire('u', 'hi', 'n', 'd')]
    };
    const p = propose(graph, 'n', 'ports', o);
    expect(p.accepted).toBe(true);
    expect(p.message).toBe('inputs reordered a, d, c, b (was a, b, c, d)');
    const inputs = card(p.graph, 'n').inputs;
    expect(inputs.map((h) => h.portId)).toEqual(['a', 'd', 'c', 'b']);
    expect(inputs.map((h) => h.dy)).toEqual([80, 120, 160, 200]);
    expect(inputs[0].fixed).toBe(true);
  });

  it('ignores loopback wires', () => {
    const g = tangled();
    expect(propose(g, 'send', 'ports', o).accepted).toBe(false);
  });
});

describe('align', () => {
  it('tangled form: moves up 40, straightens a wire, keeps x', () => {
    const g = tangled();
    const before = snapshot(g);
    const p = propose(g, 'form', 'align', o);
    expect(p.accepted).toBe(true);
    expect(p.message).toBe('moved up 40 (y 100 → 60)');
    expect(p.changes.position).toEqual({ from: { x: 0, y: 100 }, to: { x: 0, y: 60 } });
    expect(p.moved).toBe(40);
    expect(formatChange(p.before, p.after)).toBe(
      'straight 0 → 1 · crossings 3 · overlaps 1 · spacing 1 too close'
    );
    expect(card(p.graph, 'form').x).toBe(0);
    othersUntouched(g, p.graph, 'form');
    expect(snapshot(g)).toBe(before);
  });

  it('refuses when the best shift does not beat the layout', () => {
    const p = propose(rightToLeft(), 'notify', 'align', o);
    expect(p.accepted).toBe(false);
    expect(p.reason).toBe(
      'best candidate (moved up 20 (y 460 → 440)) does not beat the current layout'
    );
    expect(p.graph).toEqual(rightToLeft());
  });

  it('a loopback gives no candidate', () => {
    const graph: LayoutGraph = {
      cards: [
        demoCard({ id: 'a', x: 0, y: 100, inputs: [], outputs: ['o'] }),
        demoCard({ id: 'b', x: 360, y: 300, inputs: ['loop_back'], outputs: [] })
      ],
      wires: [demoWire('a', 'o', 'b', 'loop_back', true)]
    };
    const p = propose(graph, 'b', 'align', o);
    expect(p.accepted).toBe(false);
    expect(p.reason).toBe('no wire on this card to level');
  });

  it('says so when every wire is level already', () => {
    const graph: LayoutGraph = {
      cards: [
        demoCard({ id: 'a', x: 0, y: 100, inputs: [], outputs: ['o'] }),
        demoCard({ id: 'b', x: 360, y: 100, inputs: ['i'], outputs: [] })
      ],
      wires: [demoWire('a', 'o', 'b', 'i')]
    };
    expect(propose(graph, 'b', 'align', o).reason).toBe('every wire on this card is already level');
  });

  it('does not buy a bent wire with a spacing break: only rank 1 can', () => {
    // Levelling b would put it on top of c, so the layout stays.
    const graph: LayoutGraph = {
      cards: [
        demoCard({ id: 'a', x: 0, y: 300, inputs: [], outputs: ['o'] }),
        demoCard({ id: 'b', x: 360, y: 100, inputs: ['i'], outputs: [] }),
        demoCard({ id: 'c', x: 360, y: 300, inputs: [], outputs: [] })
      ],
      wires: [demoWire('a', 'o', 'b', 'i')]
    };
    const p = propose(graph, 'b', 'align', o);
    expect(p.accepted).toBe(false);
    expect(measure(graph, o).overlaps).toBe(0);
  });
});

describe('clear', () => {
  it('tangled lookup: leaves classify; overlap gone, x and every other card untouched', () => {
    const g = tangled();
    const p = propose(g, 'lookup', 'clear', o);
    expect(p.accepted).toBe(true);
    expect(p.message).toBe('moved up 260 (y 200 → -60)');
    expect(p.before.overlaps).toBe(1);
    expect(p.after.overlaps).toBe(0);
    expect(formatChange(p.before, p.after, { onlyChanged: true })).toBe(
      'crossings 3 → 1 · overlaps 1 → 0'
    );
    expect(card(p.graph, 'lookup').x).toBe(360);
    othersUntouched(g, p.graph, 'lookup');
  });

  it('tangled compose: clears the caption, which stays put', () => {
    const g = tangled();
    const p = propose(g, 'compose', 'clear', o);
    expect(p.accepted).toBe(true);
    expect(p.after.spacing).toBe(0);
    expect(card(p.graph, 'cap1')).toEqual(card(g, 'cap1'));
    expect(card(p.graph, 'compose').x).toBe(720);
  });

  it('refuses a card with no overlap or spacing break', () => {
    const g = tangled();
    const p = propose(g, 'form', 'clear', o);
    expect(p.accepted).toBe(false);
    expect(p.reason).toBe('no overlap or spacing break on this card');
    expect(p.graph).toBe(g);
  });
});

describe('column', () => {
  it('ranks cards by the longest forward path; annotations and loopbacks do not count', () => {
    const ranks = columnRanks(tangled());
    expect([...ranks]).toEqual([
      ['form', 0],
      ['classify', 1],
      ['lookup', 1],
      ['compose', 2],
      ['loop', 3],
      ['send', 4]
    ]);
  });

  it('right to left: parse moves into its column, to the right of the start node', () => {
    const g = rightToLeft();
    const p = propose(g, 'parse', 'column', o);
    expect(p.accepted).toBe(true);
    expect(p.message).toBe('moved to column 1 (x 1080 → 1800, y 120 → 300)');
    expect(p.changes.position).toEqual({ from: { x: 1080, y: 120 }, to: { x: 1800, y: 300 } });
    expect(p.moved).toBe(900);
    // Port order never changes.
    expect(card(p.graph, 'parse').inputs).toEqual(card(g, 'parse').inputs);
    expect(card(p.graph, 'parse').outputs).toEqual(card(g, 'parse').outputs);
    othersUntouched(g, p.graph, 'parse');
  });

  it('refuses a node already in its column', () => {
    const p = propose(rightToLeft(), 'hook', 'column', o);
    expect(p.accepted).toBe(false);
    expect(p.reason).toBe('already in column 0');
  });

  it('uses a stride of widest card + gap x, up to the grid', () => {
    const graph: LayoutGraph = {
      cards: [
        { ...demoCard({ id: 'a', x: 0, y: 100, inputs: [], outputs: ['o'] }), width: 280 },
        demoCard({ id: 'b', x: 100, y: 100, inputs: ['i'], outputs: [] })
      ],
      wires: [demoWire('a', 'o', 'b', 'i')]
    };
    const p = propose(graph, 'b', 'column', { ...o, gapX: 130 });
    expect(p.changes.position?.to.x).toBe(420);
    expect(420 % LAYOUT_GRID).toBe(0);
  });
});

describe('annotations', () => {
  it.each(PRIMITIVES)('%s refuses a note and a caption and changes nothing', (primitive) => {
    const g = tangled();
    for (const [id, kind] of [
      ['note1', 'note'],
      ['cap1', 'caption']
    ]) {
      const p = propose(g, id, primitive, o);
      expect(p.accepted).toBe(false);
      expect(p.reason).toBe(`a ${kind} is not laid out: it stays put and cards keep clear of it`);
      expect(p.graph).toBe(g);
    }
  });
});

describe('every primitive on every node', () => {
  for (const [name, make] of [
    ['tangled', tangled],
    ['right to left', rightToLeft]
  ] as const) {
    it(`${name}: never worse on rank 1, never mutates, stays on the grid`, () => {
      const g = make();
      const before = snapshot(g);
      for (const c of g.cards) {
        for (const primitive of PRIMITIVES) {
          const p = propose(g, c.id, primitive, o);
          expect(p.accepted === (p.reason === undefined)).toBe(true);
          expect(p.after.overlaps + p.after.spacing).toBeLessThanOrEqual(
            p.before.overlaps + p.before.spacing
          );
          for (const next of p.graph.cards) {
            expect(next.x % LAYOUT_GRID === 0).toBe(true);
            expect(next.y % LAYOUT_GRID === 0).toBe(true);
          }
          if (primitive === 'ports') othersUntouched(g, p.graph, c.id);
          if (primitive === 'align' || primitive === 'clear') {
            expect(card(p.graph, c.id).x).toBe(c.x);
            othersUntouched(g, p.graph, c.id);
          }
          if (primitive === 'ports' || primitive === 'column') {
            const next = card(p.graph, c.id);
            if (primitive === 'ports') expect({ x: next.x, y: next.y }).toEqual({ x: c.x, y: c.y });
            else {
              expect(next.inputs).toEqual(c.inputs);
              expect(next.outputs).toEqual(c.outputs);
            }
          }
        }
      }
      expect(snapshot(g)).toBe(before);
    });
  }

  it('an unknown node throws', () => {
    expect(() => propose(tangled(), 'nope', 'ports', o)).toThrow('Unknown node "nope"');
  });
});

describe('beautify', () => {
  it('a single primitive is a list of one', () => {
    const r = beautify(tangled(), 'compose', 'ports', o);
    expect(r.steps).toHaveLength(1);
    expect(r.accepted).toBe(true);
    expect(formatBeautify(r)).toEqual([
      'compose: inputs reordered label, contact (was contact, label)',
      '  straight 0 → 1 · crossings 3 → 2 · overlaps 1 · spacing 1 too close'
    ]);
  });

  it('prints a dry run with only what changes', () => {
    const r = beautify(tangled(), 'lookup', 'clear', o);
    expect(formatBeautify(r, true)).toEqual([
      'lookup: would move up 260 (y 200 → -60); crossings 3 → 1 · overlaps 1 → 0'
    ]);
    expect(formatProposal(r.steps[0], true)[0]).toContain('would move up 260');
  });

  it('prints a refusal as no change with the reason', () => {
    const r = beautify(rightToLeft(), 'hook', 'column', o);
    expect(formatBeautify(r)).toEqual(['hook: no change; already in column 0']);
    expect(r.graph).toEqual(rightToLeft());
  });

  it('all, on one node: column, ports, align, clear, each judged on the graph before', () => {
    const g = rightToLeft();
    const before = snapshot(g);
    const r = beautify(g, 'parse', 'all', o);
    expect(r.steps.map((s) => s.primitive)).toEqual(PRIMITIVES);
    expect(r.steps.map((s) => s.accepted)).toEqual([true, true, false, false]);
    expect(r.steps[1].before).toEqual(r.steps[0].after);
    expect(r.steps[2].before).toEqual(r.steps[1].after);
    expect(formatBeautify(r)).toEqual([
      'parse: moved to column 1 (x 1080 → 1800, y 120 → 300)',
      'parse: outputs reordered customer, order (was order, customer)',
      'parse: align: no change; best candidate (moved up 100 (y 300 → 200)) does not beat the current layout',
      'parse: clear: no change; no overlap or spacing break on this card',
      '  straight 0 → 1 · backward 8 → 7 · crossings 12 → 5 · overlaps 0 · spacing ok'
    ]);
    expect(r.before.crossings).toHaveLength(12);
    expect(r.after.crossings).toHaveLength(5);
    expect(measure(r.graph, o).crossings).toHaveLength(5);
    expect(snapshot(g)).toBe(before);
  });

  it('all, on an annotation, refuses once', () => {
    const r = beautify(tangled(), 'note1', 'all', o);
    expect(r.steps).toHaveLength(1);
    expect(r.accepted).toBe(false);
    expect(formatBeautify(r)).toEqual([
      'note1: no change; a note is not laid out: it stays put and cards keep clear of it'
    ]);
  });
});

describe('formatChange', () => {
  const g = tangled();
  const m = measure(g, o);
  const rtl = measure(rightToLeft(), o);

  it('prints an unchanged value once, and straight without a total', () => {
    expect(formatChange(m, m)).toBe('straight 0 · crossings 3 · overlaps 1 · spacing 1 too close');
  });

  it('shows backward only when a side is non-zero', () => {
    expect(formatChange(rtl, rtl)).toBe(
      'straight 0 · backward 8 · crossings 12 · overlaps 0 · spacing ok'
    );
  });

  it('shows a changing spacing with an arrow', () => {
    const after = { ...m, spacing: 0 };
    expect(formatChange(m, after)).toContain('spacing 1 too close → ok');
    expect(formatChange(m, after, { onlyChanged: true })).toBe('spacing 1 too close → ok');
  });

  it('onlyChanged is empty when nothing changed', () => {
    expect(formatChange(m, m, { onlyChanged: true })).toBe('');
  });
});
