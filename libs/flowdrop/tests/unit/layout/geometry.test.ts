import { describe, it, expect } from 'vitest';
import {
  assignLanes,
  bezierPoints,
  lanePoints,
  loopbackLanes,
  wirePaths,
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

describe('return lanes: several loopbacks', () => {
  const card = (id: string, x: number, y = 0) =>
    demoCard({
      id,
      x,
      y,
      inputs: ['in', 'loop_back'],
      outputs: ['out'],
      fixed: ['loop_back']
    });
  const lane = { ...DEFAULT_LAYOUT_OPTIONS, loopbacks: 'lane' as const };

  /** a > b > c > d with the inner loop c > b inside the outer loop d > a. */
  function nested(): LayoutGraph {
    return {
      cards: [card('a', 0), card('b', 400), card('c', 800), card('d', 1200)],
      wires: [
        demoWire('a', 'out', 'b', 'in'),
        demoWire('b', 'out', 'c', 'in'),
        demoWire('c', 'out', 'd', 'in'),
        demoWire('d', 'out', 'a', 'loop_back', true),
        demoWire('c', 'out', 'b', 'loop_back', true)
      ]
    };
  }

  it('the outer lane turns further out than the inner one on both ends', () => {
    const lanes = loopbackLanes(nested());
    const inner = lanes.get('c.out>b.loop_back')!;
    const outer = lanes.get('d.out>a.loop_back')!;
    // Cards are 240 wide, ports at y 80 (output c at x 1040, input b at x 400), bottoms at 160.
    expect(inner.points).toEqual([
      [1040, 80],
      [1070, 80],
      [1070, 200],
      [370, 200],
      [370, 120],
      [400, 120]
    ]);
    expect(outer.points).toEqual([
      [1440, 80],
      [1490, 80],
      [1490, 220],
      [-50, 220],
      [-50, 120],
      [0, 120]
    ]);
    // Out of the source: outer leg right of the inner one's; into the target: left of it.
    expect(outer.points[1][0]).toBeGreaterThan(inner.points[1][0]);
    expect(outer.points[4][0]).toBeLessThan(inner.points[4][0]);
  });

  it('the track of the outer lane is one pitch below the inner one', () => {
    const lanes = loopbackLanes(nested());
    expect(lanes.get('c.out>b.loop_back')!.laneY).toBe(200);
    expect(lanes.get('d.out>a.loop_back')!.laneY).toBe(220);
  });

  it('nested lanes do not cross, and neither crosses a card', () => {
    const m = measure(nested(), lane);
    expect(m.crossings).toEqual([]);
    expect(m.conflicts).toEqual([]);
  });

  it('loops side by side share a track', () => {
    const g: LayoutGraph = {
      cards: [card('e', 0), card('f', 400), card('g', 900), card('h', 1300)],
      wires: [
        demoWire('e', 'out', 'f', 'in'),
        demoWire('f', 'out', 'g', 'in'),
        demoWire('g', 'out', 'h', 'in'),
        demoWire('f', 'out', 'e', 'loop_back', true),
        demoWire('h', 'out', 'g', 'loop_back', true)
      ]
    };
    const lanes = loopbackLanes(g);
    expect(lanes.get('f.out>e.loop_back')!.laneY).toBe(200);
    expect(lanes.get('h.out>g.loop_back')!.laneY).toBe(200);
    expect(measure(g, lane).crossings).toEqual([]);
  });

  it('a loop in a row far below does not push a lane down', () => {
    const g: LayoutGraph = {
      cards: [card('a', 0), card('b', 400), card('i', 0, 1000), card('j', 400, 1000)],
      wires: [
        demoWire('a', 'out', 'b', 'in'),
        demoWire('b', 'out', 'a', 'loop_back', true),
        demoWire('i', 'out', 'j', 'in'),
        demoWire('j', 'out', 'i', 'loop_back', true)
      ]
    };
    const lanes = loopbackLanes(g);
    expect(lanes.get('b.out>a.loop_back')!.laneY).toBe(200);
    expect(lanes.get('j.out>i.loop_back')!.laneY).toBe(1200);
  });

  it('two loopbacks into one port share the final climb', () => {
    const g: LayoutGraph = {
      cards: [card('i', 0, 100), card('j', 400, 0), card('k', 400, 200)],
      wires: [
        demoWire('i', 'out', 'j', 'in'),
        demoWire('i', 'out', 'k', 'in'),
        demoWire('j', 'out', 'i', 'loop_back', true),
        demoWire('k', 'out', 'i', 'loop_back', true)
      ]
    };
    const lanes = loopbackLanes(g);
    const a = lanes.get('j.out>i.loop_back')!;
    const b = lanes.get('k.out>i.loop_back')!;
    expect(a.laneY).not.toBe(b.laneY);
    // Same x for the vertical leg into the port, and the same end.
    expect(a.points[4][0]).toBe(b.points[4][0]);
    expect(a.points[5]).toEqual(b.points[5]);
    // Sharing a port is not a crossing.
    expect(measure(g, lane).crossings).toEqual([]);
  });

  it('measure counts the very points the edge draws', () => {
    const g = nested();
    const drawn = loopbackLanes(g);
    for (const path of wirePaths(g, lane).filter((p) => p.wire.loopback)) {
      expect(path.points).toEqual(drawn.get(path.wire.id)!.points);
    }
  });

  it('loopbackLanes is every loopback and only loopbacks; the curve mode has no lanes', () => {
    const g = nested();
    expect([...loopbackLanes(g).keys()].sort()).toEqual(['c.out>b.loop_back', 'd.out>a.loop_back']);
    expect(wirePaths(g, DEFAULT_LAYOUT_OPTIONS).every((p) => p.laneY === undefined)).toBe(true);
  });

  it('lanePoints without depth is the single lane', () => {
    expect(lanePoints({ sx: 100, sy: 80, tx: 20, ty: 120 }, 300)).toEqual([
      [100, 80],
      [130, 80],
      [130, 300],
      [-10, 300],
      [-10, 120],
      [20, 120]
    ]);
  });
});
