import { describe, it, expect } from 'vitest';
import {
  boundsWithTags,
  fitPadding,
  CANVAS_FIT_PADDING,
  FIT_SHEET_GAP
} from '$lib/utils/canvasFit.js';

const box = (id: string, x: number, y: number, width = 200, height = 100) => ({
  id,
  x,
  y,
  width,
  height
});

describe('boundsWithTags', () => {
  it('is null without nodes', () => {
    expect(boundsWithTags([])).toBeNull();
  });

  it('is the plain node bounds without tags', () => {
    expect(boundsWithTags([box('a', 0, 0), box('b', 400, 50)])).toEqual({
      x: 0,
      y: 0,
      width: 600,
      height: 150
    });
  });

  it('grows left for input tags and right for output tags', () => {
    const reserve = new Map([
      ['a', { left: 120, right: 0 }],
      ['b', { left: 0, right: 150 }]
    ]);
    expect(boundsWithTags([box('a', 0, 0), box('b', 400, 50)], reserve)).toEqual({
      x: -120,
      y: 0,
      width: 600 + 120 + 150,
      height: 150
    });
  });

  it('ignores reserve for a node that is not on the list, and only widens the outermost nodes', () => {
    const reserve = new Map([
      ['mid', { left: 300, right: 300 }],
      ['gone', { left: 999, right: 999 }]
    ]);
    const bounds = boundsWithTags(
      [box('a', 0, 0), box('mid', 300, 0, 100), box('b', 600, 0)],
      reserve
    );
    // mid's tags reach -0 .. 700, inside what a and b already cover on the right edge (800)
    expect(bounds).toEqual({ x: 0, y: 0, width: 800, height: 100 });
  });
});

describe('fitPadding', () => {
  it('is the plain canvas padding with no sheet', () => {
    expect(fitPadding()).toBe(CANVAS_FIT_PADDING);
    expect(fitPadding(0)).toBe(CANVAS_FIT_PADDING);
    expect(fitPadding(Number.NaN)).toBe(CANVAS_FIT_PADDING);
  });

  it('adds the sheet width and a gap on the right', () => {
    expect(fitPadding(428)).toEqual({
      ...(CANVAS_FIT_PADDING as object),
      right: `${428 + FIT_SHEET_GAP}px`
    });
  });
});
