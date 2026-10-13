import { describe, it, expect } from 'vitest';
import { lanePath } from '../../../src/lib/layout/lanePath.js';
import type { XY } from '../../../src/lib/layout/geometry.js';

const points: XY[] = [
  [1040, 80],
  [1070, 80],
  [1070, 200],
  [370, 200],
  [370, 120],
  [400, 120]
];

describe('lanePath', () => {
  it('rounds every corner and stops the arrow length before the target', () => {
    const { d } = lanePath(points, 10, 8);
    expect(d.startsWith('M 1040,80 L 1060,80 Q 1070,80 1070,90')).toBe(true);
    expect(d.match(/Q/g)).toHaveLength(4);
    expect(d.endsWith('L 392,120')).toBe(true);
  });

  it('shrinks the radius on a short segment', () => {
    const { d } = lanePath(
      [
        [0, 0],
        [10, 0],
        [10, 100],
        [-100, 100],
        [-100, 20],
        [-90, 20]
      ],
      10,
      8
    );
    // The first leg is 10 long: its corner takes at most half of it.
    expect(d).toContain('L 5,0 Q 10,0 10,5');
  });

  it('the label sits in the middle of the lane, the arrow points along the last segment', () => {
    const path = lanePath(points, 10, 8);
    expect(path.label).toEqual([720, 200]);
    expect(path.angleDeg).toBe(0);
  });
});
