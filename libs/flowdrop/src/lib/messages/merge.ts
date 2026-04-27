/**
 * Deep-merge a `MessagesOverride` onto the canonical `Messages` tree.
 *
 * Hand-written rather than pulled from lodash because the shape is known and
 * fixed: leaves are strings or functions, branches are plain objects. The
 * 15-line walker is smaller than the lodash import and has no edge cases we
 * don't want.
 *
 * Rules:
 *   - `undefined` partial returns the base reference unchanged (cheap path
 *     for the no-override case).
 *   - Override branches are walked recursively and merged with their base.
 *   - Override leaves replace base leaves wholesale. Functions and strings
 *     are interchangeable per `DeepPartial` (see `./types.ts`).
 *   - Keys not present in the override fall through to the base.
 */

import type { Messages, MessagesOverride } from './types.js';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  typeof value !== 'function';

export function mergeMessages(base: Messages, partial: MessagesOverride | undefined): Messages {
  if (partial === undefined) return base;
  return mergeNode(base, partial) as Messages;
}

function mergeNode(base: unknown, partial: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(partial)) return partial ?? base;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(partial)) {
    const baseChild = base[key];
    const partialChild = partial[key];
    out[key] =
      isPlainObject(baseChild) && isPlainObject(partialChild)
        ? mergeNode(baseChild, partialChild)
        : (partialChild ?? baseChild);
  }
  return out;
}
