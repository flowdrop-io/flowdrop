/**
 * "Tidy up" from the canvas: what the toast says, and the steps of the move animation.
 *
 * Pure (no Svelte, no DOM). The tidy itself is the `layout beautify` / `layout node beautify`
 * command; the editor runs it, then uses these to show what happened.
 *
 * @module editor/tidy
 */

import type { LayoutResultData } from '../commands/types.js';
import { defaultMessages } from '../messages/defaults.js';

type TidyMessages = typeof defaultMessages.tidy;

/** How long the cards take to slide to their new place. */
export const TIDY_ANIMATION_MS = 250;

/**
 * What improved, one phrase each, in the order a reader cares about: overlaps and spacing,
 * wires through ports, straight wires, flow direction, crossings. Empty when nothing improved.
 */
export function describeTidy(
  data: LayoutResultData,
  messages: TidyMessages = defaultMessages.tidy
): string[] {
  const { before, after } = data;
  const parts: string[] = [];
  const gain = (n: number, say: (a: { n: number }) => string) => {
    if (n > 0) parts.push(say({ n }));
  };
  gain(before.overlaps - after.overlaps, messages.unoverlapped);
  gain(before.spacing - after.spacing, messages.spaced);
  gain(before.passes - after.passes, messages.unpassed);
  gain(after.straight - before.straight, messages.straightened);
  gain(before.backward - after.backward, messages.unbackward);
  gain(before.crossings - after.crossings, messages.uncrossed);
  return parts;
}

type XY = { x: number; y: number };

/** Ease out: fast start, gentle landing. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * The positions at time `t` (0 to 1) of a move from `from` to `to`. Only ids in both maps that
 * moved are returned; everything else stays where it is.
 */
export function tweenPositions(
  from: ReadonlyMap<string, XY>,
  to: ReadonlyMap<string, XY>,
  t: number
): Map<string, XY> {
  const k = easeOutCubic(Math.min(1, Math.max(0, t)));
  const out = new Map<string, XY>();
  for (const [id, end] of to) {
    const start = from.get(id);
    if (!start || (start.x === end.x && start.y === end.y)) continue;
    out.set(id, { x: start.x + (end.x - start.x) * k, y: start.y + (end.y - start.y) * k });
  }
  return out;
}
