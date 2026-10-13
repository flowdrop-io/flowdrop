import { describe, it, expect } from 'vitest';
import {
  assignLanes,
  bezierPoints,
  loopBody,
  segmentCrossing,
  wireEnds,
  cardIndex
} from '../../../src/lib/layout/geometry.js';
import { measure } from '../../../src/lib/layout/measure.js';
import { DEFAULT_LAYOUT_OPTIONS, type LayoutGraph } from '../../../src/lib/layout/types.js';
import { demoCard, demoWire, tangled } from './fixtures.js';

describe('wire ends and paths', () => {
  it('a wire runs from the source handle to the target handle', () => {
    const g = tangled();
    expect(wireEnds(g.wires[0], cardIndex(g))).toEqual({ sx: 240, sy: 220, tx: 360, ty: 180 });
  });

  it('the bezier starts and ends on the handles, like xyflow draws it', () => {
    const pts = bezierPoints({ sx: 0, sy: 0, tx: 200, ty: 100 });
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[pts.length - 1]).toEqual([200, 100]);
    // Symmetric S-curve: halfway it is halfway.
    expect(pts[16]).toEqual([100, 50]);
  });

  it('segments touching at an end do not cross', () => {
    expect(segmentCrossing([0, 0], [10, 0], [10, 0], [10, 10])).toBeNull();
    expect(segmentCrossing([0, 0], [10, 10], [0, 10], [10, 0])).toEqual([5, 5]);
  });
});

describe('return lanes (D5)', () => {
  it('the loop body is the cards on a forward path from the loop back to the source', () => {
    const g = tangled();
    expect(loopBody(g, g.wires[6])).toEqual(new Set(['loop', 'send']));
  });

  it('a lane runs 40 under the lowest card of its loop body', () => {
    const lanes = assignLanes(tangled());
    // loop (y 180, 2 rows → 340) and send (y 300, 1 row → 420) are the loop body.
    expect(lanes.get('send.sent>loop.loop_back')).toBe(420 + 40);
  });

  /** A loop body from x 0 to 1200 with an inner loop from 400 to 800, and a separate one further right. */
  function nested(): LayoutGraph {
    const card = (id: string, x: number) =>
      demoCard({
        id,
        x,
        y: 0,
        inputs: ['in', 'loop_back'],
        outputs: ['out'],
        fixed: ['loop_back']
      });
    return {
      cards: [
        card('a', 0),
        card('b', 400),
        card('c', 800),
        card('d', 1200),
        card('e', 1600),
        card('f', 2000)
      ],
      wires: [
        demoWire('d', 'out', 'a', 'loop_back', true),
        demoWire('c', 'out', 'b', 'loop_back', true),
        demoWire('f', 'out', 'e', 'loop_back', true)
      ]
    };
  }

  it('the inner loop takes the inner track, the outer one goes a track below', () => {
    const lanes = assignLanes(nested());
    expect(lanes.get('c.out>b.loop_back')).toBe(160 + 40);
    expect(lanes.get('d.out>a.loop_back')).toBe(160 + 40 + 20);
  });

  it('loops that do not overlap share a track', () => {
    const lanes = assignLanes(nested());
    expect(lanes.get('f.out>e.loop_back')).toBe(160 + 40);
  });

  it('nested lanes do not cross each other', () => {
    const m = measure(nested(), { ...DEFAULT_LAYOUT_OPTIONS, loopbacks: 'lane' });
    expect(m.crossings).toEqual([]);
  });

  it('a card that is not in the loop body, within gap y of the lane, breaks spacing', () => {
    const g = tangled();
    g.cards.push(demoCard({ id: 'below', x: 1100, y: 440, inputs: [], outputs: [] }));
    const m = measure(g, { ...DEFAULT_LAYOUT_OPTIONS, loopbacks: 'lane' });
    expect(m.conflicts).toContainEqual({
      card: 'below',
      with: 'send.sent>loop.loop_back',
      kind: 'lane'
    });
  });
});
