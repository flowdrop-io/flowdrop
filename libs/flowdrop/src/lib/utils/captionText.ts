/**
 * Pure helpers for the caption node: text clean-up, width snapping and the
 * commit rules for in-place edits. No DOM, no Svelte, so they unit-test
 * directly.
 *
 * @module utils/captionText
 */

/** Collapse every run of whitespace (newlines and tabs included) to one space and trim. */
export function collapseCaptionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The width a caption takes: the natural width of its text plus padding,
 * rounded up to the next grid step, never below two grid steps (40px on the
 * default 20px grid) and never above `max`.
 *
 * @param naturalWidth - width of the text on one line plus horizontal padding, in px
 * @param grid - the editor's grid size in px
 * @param max - the maximum node width in px
 */
export function snapCaptionWidth(naturalWidth: number, grid: number, max: number): number {
  const step = grid > 0 ? grid : 20;
  const floor = 2 * step;
  const snapped = Math.ceil(Math.max(0, naturalWidth) / step) * step;
  return Math.min(max, Math.max(floor, snapped));
}

/** What the editor does with a finished in-place edit. */
export type InlineCommitOutcome = 'none' | 'remove' | 'add' | 'edit';

/** The decision for a finished in-place edit, with the text to write. */
export interface InlineCommitDecision {
  outcome: InlineCommitOutcome;
  /** The collapsed text; empty when the edit was cancelled. */
  label: string;
}

/**
 * The commit rules for an in-place edit of a caption. This is the one place
 * the typed text is cleaned (see `collapseCaptionText`); callers write
 * `label` and do not collapse again.
 *
 * - new caption, cancelled or empty: `remove` (no history entry)
 * - new caption, text: `add` (history "Add caption")
 * - existing caption, cancelled, empty or unchanged: `none` (the node restores itself)
 * - existing caption, changed text: `edit` (history "Edit caption")
 *
 * @param text - the text as typed, or `null` when the edit was cancelled
 * @param current - the label the node has now
 * @param isNew - whether the node was just added and has no history entry yet
 */
export function decideInlineCommit(
  text: string | null,
  current: string,
  isNew: boolean
): InlineCommitDecision {
  const label = text === null ? '' : collapseCaptionText(text);
  if (isNew) return { outcome: label === '' ? 'remove' : 'add', label };
  if (label === '' || label === current) return { outcome: 'none', label };
  return { outcome: 'edit', label };
}
