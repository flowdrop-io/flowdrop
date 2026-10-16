/**
 * The settings panel's view of `editor.zoomTiers`: one row per tier below full,
 * each with an on/off switch and a "starts below N%" value.
 *
 * A row's "starts below" is where its tier begins as the canvas zooms out, which
 * is the stored start of the tier above it (the first row's value is the stored
 * `full`). The lowest tier that is on is stored with 0: it extends down to any
 * zoom. Options are limited by the neighbouring rows that are on, so a
 * combination that is not strictly decreasing cannot be picked.
 */
import {
  ZOOM_TIER_ORDER,
  DEFAULT_ZOOM_TIERS,
  normalizeZoomTiers,
  type ZoomTierConfig,
  type ZoomTierName
} from './zoomTier.js';

/** The tiers that have a row. Full has none. */
export type ZoomRowTier = Exclude<ZoomTierName, 'full'>;
export const ZOOM_ROW_TIERS: readonly ZoomRowTier[] = ['outline', 'glyph', 'map'];

/** The lowest and highest percentage a row offers, and the step. */
export const ZOOM_BELOW_MIN = 20;
export const ZOOM_BELOW_MAX = 90;
export const ZOOM_BELOW_STEP = 5;

export interface ZoomRow {
  tier: ZoomRowTier;
  on: boolean;
  /** Percent: the zoom below which this tier starts. Kept while the row is off. */
  below: number;
}

/** The percentage a row starts at when it has never been on. */
const DEFAULT_BELOW: Record<ZoomRowTier, number> = {
  outline: 75,
  glyph: 45,
  map: 25
};

const pct = (zoom: number): number => Math.round(zoom * 100);

/**
 * The rows for a config. `remembered` supplies the percentage of a row that is
 * off (so switching it back on restores what the user had).
 */
export function zoomRows(
  config: unknown,
  remembered: Partial<Record<ZoomRowTier, number>> = {}
): ZoomRow[] {
  const valid = normalizeZoomTiers(config);
  const on = ZOOM_TIER_ORDER.filter((t) => typeof valid[t] === 'number');
  return ZOOM_ROW_TIERS.map((tier) => {
    const i = on.indexOf(tier);
    if (i > 0) return { tier, on: true, below: pct(valid[on[i - 1]] as number) };
    return { tier, on: false, below: remembered[tier] ?? DEFAULT_BELOW[tier] };
  });
}

/** The config for rows. No row on is `{ full: 0 }`. */
export function zoomConfigFromRows(rows: readonly ZoomRow[]): ZoomTierConfig {
  const on = ZOOM_ROW_TIERS.map((t) => rows.find((r) => r.tier === t)).filter(
    (r): r is ZoomRow => !!r && r.on
  );
  if (on.length === 0) return { full: 0 };
  const config: ZoomTierConfig = { full: on[0].below / 100 };
  on.forEach((row, i) => {
    config[row.tier] = i + 1 < on.length ? on[i + 1].below / 100 : 0;
  });
  return config;
}

/** The nearest row above (higher rank) and below that is on, as percentages. */
function neighbours(rows: readonly ZoomRow[], tier: ZoomRowTier): { above: number; below: number } {
  const at = ZOOM_ROW_TIERS.indexOf(tier);
  let above = Infinity;
  let below = -Infinity;
  for (const r of rows) {
    if (!r.on || r.tier === tier) continue;
    const i = ZOOM_ROW_TIERS.indexOf(r.tier);
    if (i < at) above = Math.min(above, r.below);
    else below = Math.max(below, r.below);
  }
  return { above, below };
}

/** The percentages a row may take: the grid between its neighbours, plus its own value. */
export function zoomBelowOptions(rows: readonly ZoomRow[], tier: ZoomRowTier): number[] {
  const row = rows.find((r) => r.tier === tier);
  const { above, below } = neighbours(rows, tier);
  const out: number[] = [];
  for (let n = ZOOM_BELOW_MIN; n <= ZOOM_BELOW_MAX; n += ZOOM_BELOW_STEP) {
    if (n > below && n < above) out.push(n);
  }
  if (row?.on && !out.includes(row.below)) {
    out.push(row.below);
    out.sort((a, b) => b - a);
  } else {
    out.sort((a, b) => b - a);
  }
  return out;
}

/**
 * The percentage for a row being switched on: what it had if that still fits
 * between its neighbours, otherwise the grid value nearest the middle of the
 * gap. `null` when there is no room (the neighbours leave no step between them).
 */
export function zoomBelowForEnable(rows: readonly ZoomRow[], tier: ZoomRowTier): number | null {
  const row = rows.find((r) => r.tier === tier);
  const { above, below } = neighbours(rows, tier);
  const fits = (n: number): boolean => n > below && n < above;
  const grid: number[] = [];
  for (let n = ZOOM_BELOW_MIN; n <= ZOOM_BELOW_MAX; n += ZOOM_BELOW_STEP) if (fits(n)) grid.push(n);
  if (grid.length === 0) return null;
  if (row && fits(row.below)) return row.below;
  return grid[Math.floor((grid.length - 1) / 2)];
}

/** The library default's rows (for tests and the panel's reset path). */
export const DEFAULT_ZOOM_ROWS: readonly ZoomRow[] = zoomRows(DEFAULT_ZOOM_TIERS);
