/**
 * Left column widths, kept per tab (Nodes | AI Assistant).
 *
 * The column is resizable in every mode. Each tab remembers its own width in
 * `ui.sidebarWidths`; the width is clamped to a floor and to
 * min(half the editor, 560 px) so a long reply can never squeeze the canvas out.
 */

import type { UISettings } from '../types/settings.js';

/** Tabs of the left column that remember a width. */
export type SidebarTab = 'nodes' | 'assistant';

export type SidebarWidths = Record<SidebarTab, number>;

/** Narrowest the left column may get, in pixels. */
export const SIDEBAR_MIN_WIDTH = 220;
/** Widest the left column may get, in pixels, however wide the editor is. */
export const SIDEBAR_MAX_WIDTH = 560;
/** Widest the left column may get, as a share of the editor width. */
export const SIDEBAR_MAX_RATIO = 0.5;

/** Width a tab opens at until the person resizes it. */
export const DEFAULT_SIDEBAR_WIDTHS: SidebarWidths = { nodes: 280, assistant: 380 };

/**
 * Upper bound for the column: min(editor × ratio, 560), never below the floor.
 * Without an editor width (not measured yet) only the absolute maximum applies.
 */
export function sidebarMaxWidth(editorWidth?: number): number {
  if (!editorWidth || !Number.isFinite(editorWidth) || editorWidth <= 0) return SIDEBAR_MAX_WIDTH;
  return Math.max(
    SIDEBAR_MIN_WIDTH,
    Math.min(SIDEBAR_MAX_WIDTH, Math.floor(editorWidth * SIDEBAR_MAX_RATIO))
  );
}

/** Clamp a width into [floor, max(editorWidth)], rounded to whole pixels. */
export function clampSidebarWidth(width: number, editorWidth?: number): number {
  const max = sidebarMaxWidth(editorWidth);
  if (!Number.isFinite(width)) return Math.min(DEFAULT_SIDEBAR_WIDTHS.nodes, max);
  return Math.min(Math.max(Math.round(width), SIDEBAR_MIN_WIDTH), max);
}

/**
 * Widths to use for the two tabs, from whatever the settings store holds.
 *
 * Settings saved before `sidebarWidths` existed carry only the single
 * `sidebarWidth`; it becomes the Nodes width. Missing, partial or garbage
 * entries fall back to the defaults, so a stored value can never break layout.
 */
export function resolveSidebarWidths(
  ui: Partial<Pick<UISettings, 'sidebarWidth' | 'sidebarWidths'>> | undefined
): SidebarWidths {
  const stored = ui?.sidebarWidths;
  const usable = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
  const legacyNodes = usable(ui?.sidebarWidth) ? ui.sidebarWidth : undefined;
  return {
    nodes: clampSidebarWidth(
      usable(stored?.nodes) ? stored.nodes : (legacyNodes ?? DEFAULT_SIDEBAR_WIDTHS.nodes)
    ),
    assistant: clampSidebarWidth(
      usable(stored?.assistant) ? stored.assistant : DEFAULT_SIDEBAR_WIDTHS.assistant
    )
  };
}
