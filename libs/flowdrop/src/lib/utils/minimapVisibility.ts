/**
 * Minimap sizing and visibility rules for the editor canvas.
 *
 * The minimap is a 120×72 panel in the canvas's bottom-right corner. On a canvas
 * narrower than {@link MINIMAP_MIN_CANVAS_WIDTH} it would cover too much of the
 * graph, so it is hidden there, whatever the user's "show minimap" setting says.
 * The setting can still switch it off on a wide canvas.
 */

/** Minimap outer width in px (border included). */
export const MINIMAP_WIDTH = 120;

/** Minimap outer height in px (border included). */
export const MINIMAP_HEIGHT = 72;

/**
 * Width of the minimap's border on each side (see base.css). xyflow's `width` /
 * `height` props size the inner SVG, so the border is taken off to land on the
 * outer 120×72.
 */
export const MINIMAP_BORDER = 1;

/** Canvases narrower than this (px) do not show the minimap. */
export const MINIMAP_MIN_CANVAS_WIDTH = 800;

/**
 * Whether to render the minimap.
 *
 * @param enabled - The user's `showMinimap` editor setting.
 * @param canvasWidth - Measured width of the canvas element in px; `undefined`
 *   before the first measurement, when the setting alone decides.
 */
export function shouldShowMinimap(enabled: boolean, canvasWidth: number | undefined): boolean {
  if (!enabled) return false;
  if (canvasWidth === undefined) return true;
  return canvasWidth >= MINIMAP_MIN_CANVAS_WIDTH;
}
