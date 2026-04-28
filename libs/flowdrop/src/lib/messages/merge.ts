/**
 * Deep-merge a `MessagesOverride` onto the canonical `Messages` tree.
 *
 * Hand-written rather than pulled from lodash because the shape is known and
 * fixed: leaves are strings or functions, branches are plain objects. The
 * walker is smaller than the lodash import and has no edge cases we don't
 * want.
 *
 * Rules:
 *   - `undefined` partial returns the base reference unchanged (cheap path
 *     for the no-override case).
 *   - Override branches are walked recursively and merged with their base.
 *   - Override leaves replace base leaves wholesale. Functions and strings
 *     are interchangeable per `DeepPartial` (see `./types.ts`).
 *   - Keys not present in the override fall through to the base.
 *
 * Identity preservation: when a subtree of `partial` resolves to values that
 * are already `===` to the corresponding base values (string interning makes
 * this the common case for paraglide-style overrides — `p.save()` returns
 * the same `'Save'` string each call), the base reference is returned
 * unchanged. This stops downstream `$derived(m().branch)` reads in components
 * from invalidating on every parent re-render when the consumer passes an
 * inline `messages={{...}}` literal whose contents are stable but whose
 * outer identity churns. Function leaves still create fresh identities, but
 * they aren't read in render hotspots.
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
  let out: Record<string, unknown> | null = null;
  for (const key of Object.keys(partial)) {
    const baseChild = base[key];
    const partialChild = partial[key];
    const merged =
      isPlainObject(baseChild) && isPlainObject(partialChild)
        ? mergeNode(baseChild, partialChild)
        : (partialChild ?? baseChild);
    if (merged !== baseChild) {
      if (out === null) out = { ...base };
      out[key] = merged;
    }
  }
  return out ?? base;
}
