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
