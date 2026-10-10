/**
 * Zoom tiers (Graphite G8e).
 *
 * The canvas shows a node at three levels of detail, chosen from the viewport
 * zoom: `full` (the whole card) from 66%, `glyph` (a large category glyph and
 * a counter-scaled title) from 25%, and `map` (the glyph alone) below that.
 * The tier is published as `data-fd-zoom` on `.flowdrop-root`, so every node
 * restyles itself in CSS and nothing re-renders. Geometry never depends on the
 * tier: parts are hidden with `visibility`, never removed or resized.
 */

export type ZoomTier = 'full' | 'glyph' | 'map';

/** The zoom at which `full` starts. */
export const ZOOM_FULL_FROM = 0.66;
/** The zoom at which `glyph` starts. */
export const ZOOM_GLYPH_FROM = 0.25;
/**
 * Hysteresis: a tier boundary is crossed only once the zoom is this far past
 * it (in zoom units, so 0.025 is 2.5 points of the percentage on each side of a
 * threshold, a 5% dead band), so a zoom that rests on a threshold does not
 * flicker between tiers.
 */
export const ZOOM_HYSTERESIS = 0.025;

/**
 * The tier for a zoom. Without `previous` the thresholds are exact; with it, a
 * boundary is crossed only past the hysteresis band.
 */
export function zoomTier(zoom: number, previous?: ZoomTier): ZoomTier {
  const h = previous ? ZOOM_HYSTERESIS : 0;
  const belowFull = zoom < ZOOM_FULL_FROM + (previous === 'full' ? -h : h);
  if (!belowFull) return 'full';
  const belowGlyph = zoom < ZOOM_GLYPH_FROM + (previous === 'map' ? h : -h);
  return belowGlyph ? 'map' : 'glyph';
}

/** What the glyph view draws for a card: the glyph edge and whether title sits beside it. */
export interface GlyphMetrics {
  /** Glyph edge in flow px. */
  size: number;
  /** Short cards put the title beside the glyph instead of under it. */
  row: boolean;
}

/** Cards shorter than this (flow px) lay the glyph and title out side by side. */
export const GLYPH_ROW_BELOW = 160;

/**
 * The glyph is about 42% of the card's shorter side, but never more than 34% of
 * a 280px card wide (a big node gets a big glyph, up to a point); on short cards
 * it is half the height (at most 100) and the title sits beside it.
 */
export function glyphMetrics(width: number, height: number): GlyphMetrics {
  if (height < GLYPH_ROW_BELOW) {
    return { size: Math.round(0.5 * Math.min(height, 100)), row: true };
  }
  return {
    size: Math.round(Math.min(0.34 * Math.min(width, 280), 0.42 * Math.min(width, height))),
    row: false
  };
}
