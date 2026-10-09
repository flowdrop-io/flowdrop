/**
 * Width of the floating inspector sheet.
 *
 * Node settings open in a 360 px sheet (Test mode, or the placement the person
 * chose). Workflow settings always open as a sheet too, wider (420 px by
 * default) and resizable from its left edge; the width is saved in
 * `ui.sheetWidths.workflow`. It is clamped to a floor and to
 * min(half the canvas region, 640 px) so a wide sheet never squeezes the
 * canvas out.
 */

import type { UISettings } from '../types/settings.js';

/** Narrowest the workflow sheet may get, in pixels. */
export const SHEET_MIN_WIDTH = 360;
/** Widest the workflow sheet may get, in pixels, however wide the canvas is. */
export const SHEET_MAX_WIDTH = 640;
/** Widest the workflow sheet may get, as a share of the canvas region. */
export const SHEET_MAX_RATIO = 0.5;
/** Width of a node's sheet, in pixels. Not resizable. */
export const NODE_SHEET_WIDTH = 360;
/** Width the workflow sheet opens at until the person resizes it. */
export const DEFAULT_WORKFLOW_SHEET_WIDTH = 420;
/** Pixels one arrow key press moves the left edge. */
export const SHEET_KEY_STEP = 16;

/** Upper bound: min(canvas region × ratio, 640), never below the floor. */
export function sheetMaxWidth(regionWidth?: number): number {
  if (!regionWidth || !Number.isFinite(regionWidth) || regionWidth <= 0) return SHEET_MAX_WIDTH;
  return Math.max(
    SHEET_MIN_WIDTH,
    Math.min(SHEET_MAX_WIDTH, Math.floor(regionWidth * SHEET_MAX_RATIO))
  );
}

/** Clamp a width into [floor, sheetMaxWidth(regionWidth)], rounded to whole pixels. */
export function clampSheetWidth(width: number, regionWidth?: number): number {
  const max = sheetMaxWidth(regionWidth);
  if (!Number.isFinite(width)) return Math.min(DEFAULT_WORKFLOW_SHEET_WIDTH, max);
  return Math.min(Math.max(Math.round(width), SHEET_MIN_WIDTH), max);
}

/** The saved workflow-sheet width, from whatever the settings store holds. */
export function resolveWorkflowSheetWidth(
  ui: Partial<Pick<UISettings, 'sheetWidths'>> | undefined,
  regionWidth?: number
): number {
  const stored = ui?.sheetWidths?.workflow;
  const usable = typeof stored === 'number' && Number.isFinite(stored) && stored > 0;
  return clampSheetWidth(usable ? stored : DEFAULT_WORKFLOW_SHEET_WIDTH, regionWidth);
}
