/**
 * Zoom tiers.
 *
 * The canvas shows a node at up to four levels of detail, chosen from the
 * viewport zoom: `full` (the whole card), `outline` (header and unlabelled port
 * bars), `glyph` (a category tile and a title) and `map` (the tile alone). Which
 * tiers are on, and where each starts, is the `editor.zoomTiers` setting. The
 * tier is published as `data-fd-zoom` on `.flowdrop-root`, so every node
 * restyles itself in CSS and nothing re-renders. Geometry never depends on the
 * tier: parts are hidden with `visibility`/`display`, never resized or moved.
 */

export type ZoomTierName = 'full' | 'outline' | 'glyph' | 'map';
/** Alias kept for callers that name the tier a zoom resolves to. */
export type ZoomTier = ZoomTierName;

/** For each tier that is on, the zoom at which it starts. A tier left out is off. */
export type ZoomTierConfig = Partial<Record<ZoomTierName, number>>;

/** Highest to lowest. */
export const ZOOM_TIER_ORDER: readonly ZoomTierName[] = ['full', 'outline', 'glyph', 'map'];

/** The library default: all four tiers. */
export const DEFAULT_ZOOM_TIERS: Readonly<ZoomTierConfig> = Object.freeze({
  full: 0.75,
  outline: 0.45,
  glyph: 0.25,
  map: 0
});

/**
 * Hysteresis: a tier boundary is crossed only once the zoom is this far past
 * it (in zoom units, so 0.025 is 2.5 points of the percentage on each side of a
 * threshold, a 5% dead band), so a zoom that rests on a threshold does not
 * flicker between tiers.
 */
export const ZOOM_HYSTERESIS = 0.025;

/** The largest value a tier may start at (the editor's maximum zoom). */
const ZOOM_MAX = 4;

/** The tiers that are on, highest first, with their start zoom. Assumes a valid config. */
function active(config: ZoomTierConfig): [ZoomTierName, number][] {
  const out: [ZoomTierName, number][] = [];
  for (const name of ZOOM_TIER_ORDER) {
    const v = config[name];
    if (typeof v === 'number') out.push([name, v]);
  }
  return out;
}

/** Why a config is invalid, or `null` when it is valid. */
export function zoomTiersProblem(config: unknown): string | null {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    return 'not an object';
  }
  const c = config as Record<string, unknown>;
  for (const key of Object.keys(c)) {
    if (!ZOOM_TIER_ORDER.includes(key as ZoomTierName)) return `unknown tier "${key}"`;
  }
  if (c.full === undefined) return '"full" is required';
  let last = Infinity;
  for (const name of ZOOM_TIER_ORDER) {
    const v = c[name];
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > ZOOM_MAX) {
      return `"${name}" must be a number from 0 to ${ZOOM_MAX}`;
    }
    if (v >= last) return `"${name}" must start below the tier above it`;
    last = v;
  }
  return null;
}

let warned = false;

/**
 * A valid config: the one given, or the library default (with one console
 * warning per page) when it is not valid. Never throws.
 */
export function normalizeZoomTiers(config: unknown): ZoomTierConfig {
  if (config === undefined) return { ...DEFAULT_ZOOM_TIERS };
  const problem = zoomTiersProblem(config);
  if (problem === null) return { ...(config as ZoomTierConfig) };
  if (!warned) {
    warned = true;
    // eslint-disable-next-line no-console
    console.warn(`[flowdrop] editor.zoomTiers is invalid (${problem}); using the default.`);
  }
  return { ...DEFAULT_ZOOM_TIERS };
}

/** Test hook: let the next invalid config warn again. */
export function resetZoomTiersWarning(): void {
  warned = false;
}

/**
 * The tier for a zoom. Without `previous` the thresholds are exact; with it, a
 * boundary is crossed only past the hysteresis band. A tier shows from its own
 * value up to the next higher tier that is on; the lowest tier that is on
 * extends down to any zoom.
 */
export function zoomTier(
  zoom: number,
  previous?: ZoomTierName,
  config: ZoomTierConfig = DEFAULT_ZOOM_TIERS
): ZoomTierName {
  const tiers = active(normalizeZoomTiers(config));
  const prevIndex = previous ? tiers.findIndex(([n]) => n === previous) : -1;
  // Walk down: tier i holds while the zoom is at or above its start. The
  // boundary below tier i is the start of tier i, shifted by the band toward
  // wherever the zoom came from.
  for (let i = 0; i < tiers.length - 1; i++) {
    const start = tiers[i][1];
    const h = prevIndex === -1 ? 0 : prevIndex <= i ? -ZOOM_HYSTERESIS : ZOOM_HYSTERESIS;
    if (zoom >= start + h) return tiers[i][0];
  }
  return tiers[tiers.length - 1][0];
}

// --- Removed in the tier-drawings step; kept so the nodes still build until then. ---

export interface GlyphMetrics {
  size: number;
  row: boolean;
}
export const GLYPH_ROW_BELOW = 160;
export function glyphMetrics(width: number, height: number): GlyphMetrics {
  if (height < GLYPH_ROW_BELOW) {
    return { size: Math.round(0.5 * Math.min(height, 100)), row: true };
  }
  return {
    size: Math.round(Math.min(0.34 * Math.min(width, 280), 0.42 * Math.min(width, height))),
    row: false
  };
}
