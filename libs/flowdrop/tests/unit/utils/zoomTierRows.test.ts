import { describe, it, expect } from 'vitest';
import {
  zoomRows,
  zoomConfigFromRows,
  zoomBelowOptions,
  zoomBelowForEnable,
  type ZoomRow
} from '$lib/utils/zoomTierRows.js';
import { normalizeZoomTiers, type ZoomTierConfig } from '$lib/utils/zoomTier.js';

const LIB: ZoomTierConfig = { full: 0.75, outline: 0.45, glyph: 0.25, map: 0 };
const FDDO: ZoomTierConfig = { full: 0.45, outline: 0.25, map: 0 };

describe('zoomRows and zoomConfigFromRows', () => {
  it('reads the library set as three rows on, below 75 / 45 / 25', () => {
    expect(zoomRows(LIB)).toEqual([
      { tier: 'outline', on: true, below: 75 },
      { tier: 'glyph', on: true, below: 45 },
      { tier: 'map', on: true, below: 25 }
    ]);
  });

  it('reads the fddo set with glyph off', () => {
    const rows = zoomRows(FDDO);
    expect(rows.map((r) => [r.tier, r.on, r.below])).toEqual([
      ['outline', true, 45],
      ['glyph', false, 45],
      ['map', true, 25]
    ]);
  });

  it('reads { full: 0 } as every row off', () => {
    expect(zoomRows({ full: 0 }).every((r) => !r.on)).toBe(true);
  });

  it('round-trips every valid set (the lowest tier is stored as 0)', () => {
    for (const c of [LIB, FDDO, { full: 0 }, { full: 0.6, glyph: 0.3 }, { full: 0.5, map: 0 }]) {
      expect(zoomConfigFromRows(zoomRows(c))).toEqual(expectedFor(c));
    }
  });

  it('always produces a valid config', () => {
    const rows = zoomRows(LIB);
    for (let mask = 0; mask < 8; mask++) {
      const r = rows.map((row, i) => ({ ...row, on: Boolean(mask & (1 << i)) }));
      const c = zoomConfigFromRows(r);
      expect(normalizeZoomTiers(c)).toEqual(c);
    }
  });

  it('an invalid config reads as the default', () => {
    expect(zoomRows({ outline: 0.4 })).toEqual(zoomRows(LIB));
  });

  it('keeps what an off row had', () => {
    expect(zoomRows(FDDO, { glyph: 35 })[1]).toEqual({ tier: 'glyph', on: false, below: 35 });
  });
});

/** The stored form of the rows read from `c`: the lowest tier is 0. */
function expectedFor(c: ZoomTierConfig): ZoomTierConfig {
  const order = ['full', 'outline', 'glyph', 'map'] as const;
  const on = order.filter((t) => typeof c[t] === 'number');
  const out: ZoomTierConfig = {};
  on.forEach((t, i) => (out[t] = i + 1 < on.length ? c[t] : 0));
  return out;
}

describe('zoomBelowOptions', () => {
  const rows = zoomRows(LIB);

  it('limits each row by the rows on either side', () => {
    expect(zoomBelowOptions(rows, 'outline')).toEqual([90, 85, 80, 75, 70, 65, 60, 55, 50]);
    expect(zoomBelowOptions(rows, 'glyph')).toEqual([70, 65, 60, 55, 50, 45, 40, 35, 30]);
    expect(zoomBelowOptions(rows, 'map')).toEqual([40, 35, 30, 25, 20]);
  });

  it('never offers a value that makes the set invalid', () => {
    for (const tier of ['outline', 'glyph', 'map'] as const) {
      for (const n of zoomBelowOptions(rows, tier)) {
        const next = rows.map((r) => (r.tier === tier ? { ...r, below: n } : r));
        const c = zoomConfigFromRows(next);
        expect(normalizeZoomTiers(c)).toEqual(c);
      }
    }
  });

  it('skips a row that is off when limiting its neighbours', () => {
    const r = zoomRows(FDDO);
    expect(zoomBelowOptions(r, 'outline')[0]).toBe(90);
    expect(zoomBelowOptions(r, 'outline').at(-1)).toBe(30);
    expect(zoomBelowOptions(r, 'map')[0]).toBe(40);
  });

  it('includes a value that is off the grid', () => {
    const r = zoomRows({ full: 0.33, outline: 0 });
    expect(zoomBelowOptions(r, 'outline')).toContain(33);
  });
});

describe('zoomBelowForEnable', () => {
  it('restores what the row had when it still fits', () => {
    const r = zoomRows(FDDO, { glyph: 35 });
    expect(zoomBelowForEnable(r, 'glyph')).toBe(35);
  });

  it('picks a value inside the gap when the old one does not fit', () => {
    const r = zoomRows({ full: 0.6, outline: 0.4, map: 0 }, { glyph: 85 });
    const n = zoomBelowForEnable(r, 'glyph')!;
    expect(n).toBeLessThan(60);
    expect(n).toBeGreaterThan(40);
  });

  it('is null when no step fits between the neighbours', () => {
    const rows: ZoomRow[] = [
      { tier: 'outline', on: true, below: 30 },
      { tier: 'glyph', on: false, below: 45 },
      { tier: 'map', on: true, below: 25 }
    ];
    expect(zoomBelowForEnable(rows, 'glyph')).toBeNull();
  });

  it('offers a value for the first row when everything is off', () => {
    expect(zoomBelowForEnable(zoomRows({ full: 0 }), 'outline')).toBe(75);
  });
});
