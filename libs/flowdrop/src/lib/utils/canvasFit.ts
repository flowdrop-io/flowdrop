/**
 * Fit-view padding for the editor canvas.
 *
 * The canvas toolbar (Edit | Test, run pill) floats over the top-left and the
 * zoom control over the bottom-left, so a plain fraction lets fit view tuck the
 * first or last node underneath them. Pixels clear the overlays; the fraction
 * keeps the sides breathing as before.
 *
 * @internal
 */
import type { FitViewOptions } from '@xyflow/svelte';

export const CANVAS_FIT_PADDING: NonNullable<FitViewOptions['padding']> = {
  top: '72px',
  bottom: '64px',
  x: 0.1
};

/** A box in flow coordinates. */
export interface FitBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Breathing room between the fitted graph and an open sheet, in px. */
export const FIT_SHEET_GAP = 16;

/**
 * Bounds of the nodes plus the room their interface tags take beside them.
 *
 * A tag sits outside its node, to the left of an input and to the right of an
 * output; `reserve` (`interfaceTagReserve`) says how far each node's tags
 * reach. Without this a fit view clips the outermost tags at the viewport
 * edge. Returns `null` when there are no boxes.
 */
export function boundsWithTags(
  boxes: ReadonlyArray<FitBox & { id: string }>,
  reserve?: ReadonlyMap<string, { left: number; right: number }>
): FitBox | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    const extra = reserve?.get(box.id);
    minX = Math.min(minX, box.x - (extra?.left ?? 0));
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width + (extra?.right ?? 0));
    maxY = Math.max(maxY, box.y + box.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Fit padding that also keeps clear of an open sheet on the right edge.
 * `rightInset` is how much of the canvas's right side the sheet covers (px);
 * with none the padding is the plain `CANVAS_FIT_PADDING`.
 */
export function fitPadding(rightInset = 0): NonNullable<FitViewOptions['padding']> {
  if (!Number.isFinite(rightInset) || rightInset <= 0) return CANVAS_FIT_PADDING;
  return {
    ...(CANVAS_FIT_PADDING as object),
    right: `${Math.round(rightInset + FIT_SHEET_GAP)}px`
  };
}
