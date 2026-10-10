import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  zoomTier,
  normalizeZoomTiers,
  resetZoomTiersWarning,
  DEFAULT_ZOOM_TIERS,
  ZOOM_HYSTERESIS,
  type ZoomTierConfig,
  type ZoomTierName
} from '$lib/utils/zoomTier.js';

const LIB = DEFAULT_ZOOM_TIERS;
const FDDO: ZoomTierConfig = { full: 0.45, outline: 0.25, map: 0 };
const H = ZOOM_HYSTERESIS;

describe('zoomTier, library set', () => {
  it('uses the exact thresholds without a previous tier', () => {
    expect(zoomTier(1.5, undefined, LIB)).toBe('full');
    expect(zoomTier(0.75, undefined, LIB)).toBe('full');
    expect(zoomTier(0.749, undefined, LIB)).toBe('outline');
    expect(zoomTier(0.45, undefined, LIB)).toBe('outline');
    expect(zoomTier(0.449, undefined, LIB)).toBe('glyph');
    expect(zoomTier(0.25, undefined, LIB)).toBe('glyph');
    expect(zoomTier(0.249, undefined, LIB)).toBe('map');
    expect(zoomTier(0.1, undefined, LIB)).toBe('map');
  });

  it('defaults the config to the library set', () => {
    expect(zoomTier(0.5)).toBe('outline');
  });

  it.each([
    [0.75, 'full', 'outline'],
    [0.45, 'outline', 'glyph'],
    [0.25, 'glyph', 'map']
  ] as [number, ZoomTierName, ZoomTierName][])(
    'holds inside the band and crosses past it at %s',
    (edge, upper, lower) => {
      expect(zoomTier(edge - H / 2, upper, LIB)).toBe(upper);
      expect(zoomTier(edge - H - 0.001, upper, LIB)).toBe(lower);
      expect(zoomTier(edge + H / 2, lower, LIB)).toBe(lower);
      expect(zoomTier(edge + H + 0.001, lower, LIB)).toBe(upper);
    }
  );

  it('jumps several tiers at once', () => {
    expect(zoomTier(0.1, 'full', LIB)).toBe('map');
    expect(zoomTier(1, 'map', LIB)).toBe('full');
    expect(zoomTier(0.3, 'full', LIB)).toBe('glyph');
  });

  it('does not flicker when a sweep rests on a threshold', () => {
    let tier: ZoomTierName = zoomTier(0.8, undefined, LIB);
    const seen = new Set<ZoomTierName>();
    for (const z of [0.77, 0.76, 0.75, 0.74, 0.752, 0.748, 0.764]) {
      tier = zoomTier(z, tier, LIB);
      seen.add(tier);
    }
    expect(seen).toEqual(new Set(['full']));
  });
});

describe('zoomTier, fddo set', () => {
  it('has three tiers and no glyph', () => {
    expect(zoomTier(1, undefined, FDDO)).toBe('full');
    expect(zoomTier(0.45, undefined, FDDO)).toBe('full');
    expect(zoomTier(0.4, undefined, FDDO)).toBe('outline');
    expect(zoomTier(0.25, undefined, FDDO)).toBe('outline');
    expect(zoomTier(0.2, undefined, FDDO)).toBe('map');
  });

  it('applies the band to both boundaries', () => {
    expect(zoomTier(0.45 - H / 2, 'full', FDDO)).toBe('full');
    expect(zoomTier(0.45 - H - 0.001, 'full', FDDO)).toBe('outline');
    expect(zoomTier(0.25 + H / 2, 'map', FDDO)).toBe('map');
    expect(zoomTier(0.25 + H + 0.001, 'map', FDDO)).toBe('outline');
  });
});

describe('zoomTier, other sets', () => {
  it('{full:0} is the full card at every zoom', () => {
    for (const z of [4, 1, 0.3, 0.05]) {
      expect(zoomTier(z, undefined, { full: 0 })).toBe('full');
      expect(zoomTier(z, 'full', { full: 0 })).toBe('full');
    }
  });

  it('the lowest tier that is on extends down whatever its value', () => {
    const c: ZoomTierConfig = { full: 0.6, outline: 0.3 };
    expect(zoomTier(0.01, undefined, c)).toBe('outline');
    expect(zoomTier(0.01, 'full', c)).toBe('outline');
  });

  it('a tier turned off is skipped', () => {
    const c: ZoomTierConfig = { full: 0.75, glyph: 0.25 };
    expect(zoomTier(0.5, undefined, c)).toBe('glyph');
    expect(zoomTier(0.3, undefined, c)).toBe('glyph');
  });

  it('a previous tier that is off is harmless', () => {
    expect(zoomTier(0.5, 'map', { full: 0.75, outline: 0.3 })).toBe('outline');
  });
});

describe('normalizeZoomTiers', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetZoomTiersWarning();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('returns valid sets unchanged without warning', () => {
    for (const c of [LIB, FDDO, { full: 0 }, { full: 0.5, map: 0.1 }, { full: 4 }]) {
      expect(normalizeZoomTiers(c)).toEqual(c);
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it('gives the library default for undefined without warning', () => {
    expect(normalizeZoomTiers(undefined)).toEqual(LIB);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ['no full', { outline: 0.4 }],
    ['empty', {}],
    ['not strictly decreasing', { full: 0.5, outline: 0.5 }],
    ['increasing', { full: 0.3, outline: 0.5 }],
    ['out of rank order', { full: 0.7, glyph: 0.5, outline: 0.3 }],
    ['negative', { full: 0.5, map: -0.1 }],
    ['over the maximum', { full: 5 }],
    ['NaN', { full: NaN }],
    ['Infinity', { full: Infinity }],
    ['a string', { full: '0.5' }],
    ['an unknown tier', { full: 0.5, tiny: 0.1 }],
    ['null', null],
    ['an array', [0.5]]
  ])('falls back to the default for %s, with one warning', (_n, bad) => {
    expect(normalizeZoomTiers(bad)).toEqual(LIB);
    expect(normalizeZoomTiers(bad)).toEqual(LIB);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('zoomTier with an invalid config uses the default and does not throw', () => {
    expect(zoomTier(0.5, undefined, { outline: 0.4 })).toBe('outline');
  });

  it('returns a copy, never the shared default', () => {
    const a = normalizeZoomTiers(undefined);
    a.full = 9;
    expect(LIB.full).toBe(0.75);
  });
});
