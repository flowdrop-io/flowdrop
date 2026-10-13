import { describe, it, expect } from 'vitest';
import { describeTidy, tweenPositions } from '../../../src/lib/editor/tidy.js';
import type { LayoutCounts } from '../../../src/lib/commands/types.js';

const counts = (over: Partial<LayoutCounts> = {}): LayoutCounts => ({
  straight: 0,
  backward: 0,
  crossings: 0,
  overlaps: 0,
  spacing: 0,
  passes: 0,
  ...over
});

describe('describeTidy', () => {
  it('lists what improved, hard rules first, with plurals', () => {
    const parts = describeTidy({
      changed: true,
      before: counts({
        straight: 1,
        crossings: 3,
        overlaps: 1,
        spacing: 2,
        passes: 1,
        backward: 2
      }),
      after: counts({ straight: 4, crossings: 2 })
    });
    expect(parts).toEqual([
      '1 overlap fixed',
      '2 pairs of cards spaced out',
      '1 wire no longer runs through a port',
      '3 wires straightened',
      '2 wires turned to flow left to right',
      '1 crossing removed'
    ]);
  });

  it('leaves out what got worse or stayed the same', () => {
    // A straight wire can be traded for a port pass (H4 outranks straight wires).
    const parts = describeTidy({
      changed: true,
      before: counts({ straight: 3, passes: 1 }),
      after: counts({ straight: 2 })
    });
    expect(parts).toEqual(['1 wire no longer runs through a port']);
  });

  it('is empty when only the port order changed nothing it counts', () => {
    expect(describeTidy({ changed: true, before: counts(), after: counts() })).toEqual([]);
  });
});

describe('tweenPositions', () => {
  const from = new Map([
    ['a', { x: 0, y: 0 }],
    ['b', { x: 100, y: 100 }]
  ]);
  const to = new Map([
    ['a', { x: 0, y: 200 }],
    ['b', { x: 100, y: 100 }]
  ]);

  it('starts where the cards were and lands where they go', () => {
    expect(tweenPositions(from, to, 0).get('a')).toEqual({ x: 0, y: 0 });
    expect(tweenPositions(from, to, 1).get('a')).toEqual({ x: 0, y: 200 });
  });

  it('eases out: past halfway at half time', () => {
    expect(tweenPositions(from, to, 0.5).get('a')!.y).toBeGreaterThan(100);
  });

  it('returns only the cards that move, and clamps t', () => {
    expect([...tweenPositions(from, to, 0.5).keys()]).toEqual(['a']);
    expect(tweenPositions(from, to, 2).get('a')).toEqual({ x: 0, y: 200 });
    expect(tweenPositions(from, to, -1).get('a')).toEqual({ x: 0, y: 0 });
  });
});
