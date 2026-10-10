import { describe, it, expect } from 'vitest';
import { zoomTier, glyphMetrics, ZOOM_HYSTERESIS, type ZoomTier } from '$lib/utils/zoomTier.js';

describe('zoomTier', () => {
  it('uses the exact thresholds without a previous tier', () => {
    expect(zoomTier(1.5)).toBe('full');
    expect(zoomTier(0.66)).toBe('full');
    expect(zoomTier(0.659)).toBe('glyph');
    expect(zoomTier(0.25)).toBe('glyph');
    expect(zoomTier(0.249)).toBe('map');
    expect(zoomTier(0.15)).toBe('map');
  });

  it('holds the tier inside the hysteresis band and crosses past it', () => {
    const h = ZOOM_HYSTERESIS;
    // from full: stays until the zoom is a band below 66%
    expect(zoomTier(0.66 - h / 2, 'full')).toBe('full');
    expect(zoomTier(0.66 - h - 0.001, 'full')).toBe('glyph');
    // from glyph: needs a band above 66% to return to full
    expect(zoomTier(0.66 + h / 2, 'glyph')).toBe('glyph');
    expect(zoomTier(0.66 + h + 0.001, 'glyph')).toBe('full');
    // the lower threshold behaves the same
    expect(zoomTier(0.25 - h / 2, 'glyph')).toBe('glyph');
    expect(zoomTier(0.25 - h - 0.001, 'glyph')).toBe('map');
    expect(zoomTier(0.25 + h / 2, 'map')).toBe('map');
    expect(zoomTier(0.25 + h + 0.001, 'map')).toBe('glyph');
  });

  it('jumps several tiers at once', () => {
    expect(zoomTier(0.1, 'full')).toBe('map');
    expect(zoomTier(1, 'map')).toBe('full');
  });

  it('does not flicker when a sweep rests on a threshold', () => {
    let tier: ZoomTier = zoomTier(0.7);
    const seen = new Set<ZoomTier>();
    for (const z of [0.67, 0.665, 0.66, 0.655, 0.662, 0.658, 0.664]) {
      tier = zoomTier(z, tier);
      seen.add(tier);
    }
    expect(seen).toEqual(new Set(['full']));
  });
});

describe('glyphMetrics', () => {
  it('sizes the glyph to the card and goes side by side on short cards', () => {
    expect(glyphMetrics(280, 80)).toEqual({ size: 40, row: true });
    expect(glyphMetrics(280, 140).row).toBe(true);
    const tall = glyphMetrics(280, 300);
    expect(tall.row).toBe(false);
    expect(tall.size).toBe(95);
    expect(glyphMetrics(280, 160).size).toBe(67);
  });
});
