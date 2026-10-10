import { describe, it, expect } from 'vitest';
import {
  primaryIncomingWire,
  snapToStraight,
  straightenWires,
  STRAIGHT_SNAP_THRESHOLD,
  type Point,
  type StraightWire
} from '../../../src/lib/utils/straightWires.js';

/**
 * A -> B, the chain of the card contract: the trigger pin is at y = 20 and the
 * first data row at y = 80 on every node, 280 wide.
 */
const wire = (
  id: string,
  sourceId: string,
  targetId: string,
  { exec = false, sourceDy = 80, targetDy = 80 } = {}
): StraightWire => ({
  id,
  sourceId,
  targetId,
  sourceDx: 280,
  sourceDy: exec ? 20 : sourceDy,
  targetDx: 0,
  targetDy: exec ? 20 : targetDy,
  exec
});

const chain = [wire('trigger', 'a', 'b', { exec: true }), wire('data', 'a', 'b')];

const at = (entries: Record<string, [number, number]>): Map<string, Point> =>
  new Map(Object.entries(entries).map(([id, [x, y]]) => [id, { x, y }]));

describe('snapToStraight', () => {
  it('snaps a node within the threshold so the data wire is exactly straight', () => {
    const result = snapToStraight(chain, at({ a: [0, 100], b: [400, 108] }), new Set(['b']));
    expect(result.dy).toBe(-8);
  });

  it('straightens the trigger wire and the data wire at once, with a guide on each', () => {
    const result = snapToStraight(chain, at({ a: [0, 100], b: [400, 106] }), new Set(['b']));
    expect(result.dy).toBe(-6);
    expect(result.guides.map((g) => g.wireId).sort()).toEqual(['data', 'trigger']);
    // The guide runs along the wire, from the source handle to the target handle, at the handle y.
    const data = result.guides.find((g) => g.wireId === 'data')!;
    expect(data).toEqual({ wireId: 'data', x1: 280, x2: 400, y: 180 });
  });

  it('does nothing outside the threshold', () => {
    const far = STRAIGHT_SNAP_THRESHOLD + 1;
    const result = snapToStraight(chain, at({ a: [0, 100], b: [400, 100 + far] }), new Set(['b']));
    expect(result).toEqual({ dy: 0, guides: [] });
  });

  it('snaps at exactly the threshold', () => {
    const result = snapToStraight(
      chain,
      at({ a: [0, 100], b: [400, 100 + STRAIGHT_SNAP_THRESHOLD] }),
      new Set(['b'])
    );
    expect(result.dy).toBe(-STRAIGHT_SNAP_THRESHOLD);
  });

  it('does nothing while Alt is held', () => {
    const result = snapToStraight(chain, at({ a: [0, 100], b: [400, 104] }), new Set(['b']), {
      disabled: true
    });
    expect(result).toEqual({ dy: 0, guides: [] });
  });

  it('moves the source the right way when the source is the dragged node', () => {
    // Dragging A 4px too low: it must go up 4.
    const result = snapToStraight(chain, at({ a: [0, 104], b: [400, 100] }), new Set(['a']));
    expect(result.dy).toBe(-4);
  });

  it('reports a guide for a wire that is already straight (dy 0)', () => {
    const result = snapToStraight(chain, at({ a: [0, 100], b: [400, 100] }), new Set(['b']));
    expect(result.dy).toBe(0);
    expect(result.guides).toHaveLength(2);
  });

  it('prefers the closest wire when several are in reach', () => {
    const wires = [wire('near', 'a', 'c'), wire('far', 'b', 'c')];
    const result = snapToStraight(
      wires,
      at({ a: [0, 100], b: [0, 110], c: [400, 107] }),
      new Set(['c'])
    );
    // c's handle is at 187: 'near' is 7 away (a's handle at 180), 'far' is 3 away (b's at 190).
    expect(result.dy).toBe(3);
    expect(result.guides.map((g) => g.wireId)).toEqual(['far']);
  });

  it('ignores wires between two moving nodes (their relative position does not change)', () => {
    const result = snapToStraight(chain, at({ a: [0, 100], b: [400, 104] }), new Set(['a', 'b']));
    expect(result).toEqual({ dy: 0, guides: [] });
  });

  it('moves a whole multi-selection by the one shift, judged by the wires that leave it', () => {
    const wires = [wire('in', 'src', 'b'), wire('inner', 'b', 'c')];
    const result = snapToStraight(
      wires,
      at({ src: [0, 100], b: [400, 106], c: [800, 106] }),
      new Set(['b', 'c'])
    );
    expect(result.dy).toBe(-6);
    // The inner wire b -> c is unchanged and was already straight: no guide for it, only the wire into the selection.
    expect(result.guides.map((g) => g.wireId)).toEqual(['in']);
  });

  describe('with snap-to-grid', () => {
    it('offers a candidate only when the result stays on the grid', () => {
      // Source is off the 20 grid (y 110): straightening B would put it at y 110, off the grid.
      const off = snapToStraight(chain, at({ a: [0, 110], b: [400, 100] }), new Set(['b']), {
        grid: 20
      });
      expect(off).toEqual({ dy: 0, guides: [] });
      // Without the grid it would snap.
      const free = snapToStraight(chain, at({ a: [0, 110], b: [400, 100] }), new Set(['b']));
      expect(free.dy).toBe(10);
    });

    it('keeps the node on the grid when it snaps', () => {
      // A grid-10 canvas: B is dragged to 90 (on the grid), A is at 100: straight is 100, on the grid.
      const result = snapToStraight(chain, at({ a: [0, 100], b: [400, 90] }), new Set(['b']), {
        grid: 10
      });
      expect((90 + result.dy) % 10).toBe(0);
      expect(90 + result.dy).toBe(100);
    });

    it('a node dragged on a 20 grid next to its source is already straight and stays there', () => {
      const result = snapToStraight(chain, at({ a: [0, 100], b: [400, 100] }), new Set(['b']), {
        grid: 20
      });
      expect(result.dy).toBe(0);
      expect(result.guides).toHaveLength(2);
    });

    it('tolerates sub-pixel measuring near a grid line', () => {
      const result = snapToStraight(chain, at({ a: [0, 100.3], b: [400, 104] }), new Set(['b']), {
        grid: 20
      });
      expect(result.dy).toBeCloseTo(-3.7);
    });
  });
});

describe('primaryIncomingWire', () => {
  it('prefers a data wire to the trigger wire, and the top row among data wires', () => {
    const wires = [
      wire('t', 'a', 'x', { exec: true }),
      wire('low', 'a', 'x', { targetDy: 120 }),
      wire('high', 'b', 'x', { targetDy: 80 })
    ];
    expect(primaryIncomingWire('x', wires)?.id).toBe('high');
  });

  it('falls back to the trigger wire', () => {
    expect(primaryIncomingWire('x', [wire('t', 'a', 'x', { exec: true })])?.id).toBe('t');
  });

  it('is undefined with no incoming wire', () => {
    expect(primaryIncomingWire('a', chain)).toBeUndefined();
  });
});

describe('straightenWires', () => {
  it('moves a node so its first connected input lines up with its source', () => {
    const moved = straightenWires(['b'], chain, at({ a: [0, 100], b: [400, 260] }));
    expect([...moved]).toEqual([['b', 100]]);
  });

  it('leaves nodes that are straight, and nodes with no incoming wire, alone', () => {
    expect(straightenWires(['b'], chain, at({ a: [0, 100], b: [400, 100] })).size).toBe(0);
    expect(straightenWires(['a'], chain, at({ a: [0, 100], b: [400, 260] })).size).toBe(0);
  });

  it('handles a multi-selection left to right, so a selected chain ends up straight', () => {
    const wires = [wire('ab', 'a', 'b'), wire('bc', 'b', 'c')];
    const moved = straightenWires(
      ['c', 'b'],
      wires,
      at({ a: [0, 100], b: [400, 180], c: [800, 40] })
    );
    expect(moved.get('b')).toBe(100);
    // c follows b's new place, not its old one.
    expect(moved.get('c')).toBe(100);
  });

  it('aligns to a source that is not selected and does not move it', () => {
    const moved = straightenWires(['b'], chain, at({ a: [0, 140], b: [400, 100] }));
    expect(moved.has('a')).toBe(false);
    expect(moved.get('b')).toBe(140);
  });

  it('keeps nodes on the grid when the source is on it', () => {
    const moved = straightenWires(
      ['b'],
      [wire('ab', 'a', 'b', { sourceDy: 120, targetDy: 80 })],
      at({ a: [0, 100], b: [400, 360] })
    );
    expect(moved.get('b')! % 20).toBe(0);
    expect(moved.get('b')).toBe(140);
  });

  it('straightens the data wire when the source row and target row differ', () => {
    const moved = straightenWires(
      ['b'],
      [wire('ab', 'a', 'b', { sourceDy: 160, targetDy: 80 })],
      at({ a: [0, 100], b: [400, 100] })
    );
    expect(moved.get('b')).toBe(180);
  });

  it('is idempotent', () => {
    const positions = at({ a: [0, 100], b: [400, 260] });
    const first = straightenWires(['b'], chain, positions);
    const again = straightenWires(['b'], chain, at({ a: [0, 100], b: [400, first.get('b')!] }));
    expect(again.size).toBe(0);
  });
});
