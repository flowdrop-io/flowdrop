/**
 * Toast queue rules, kept pure so they can be tested without a DOM.
 *
 * - A success toast replaces the previous success instead of stacking behind it.
 * - At most `MAX_VISIBLE_TOASTS` toasts are visible. When a new one would be the
 *   fourth, the oldest transient one (success, info) goes first, then the oldest
 *   of the rest. Errors and warnings are persistent, so they outlive the
 *   transient ones.
 */

export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'loading';

/** One follow-up step offered by a toast, such as "Show problems". */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ActiveToast {
  id: string;
  kind: ToastKind;
  createdAt: number;
}

export const MAX_VISIBLE_TOASTS = 3;

/** Stable id shared by every success toast, so the library replaces in place. */
export const SUCCESS_TOAST_ID = 'flowdrop:success';

const TRANSIENT: ReadonlySet<ToastKind> = new Set(['success', 'info']);

/**
 * Ids to dismiss before showing `incoming`.
 *
 * A toast with the same id as `incoming` is not listed: the library replaces it
 * in place, so it does not count against the limit.
 */
export function planToastEviction(
  active: readonly ActiveToast[],
  incoming: { id: string; kind: ToastKind },
  max: number = MAX_VISIBLE_TOASTS
): string[] {
  const others = active.filter((t) => t.id !== incoming.id);
  const evict: string[] = [];
  let kept = others;

  if (incoming.kind === 'success') {
    evict.push(...others.filter((t) => t.kind === 'success').map((t) => t.id));
    kept = others.filter((t) => t.kind !== 'success');
  }

  const overflow = kept.length + 1 - max;
  if (overflow > 0) {
    const oldestFirst = [...kept].sort((a, b) => a.createdAt - b.createdAt);
    const order = [
      ...oldestFirst.filter((t) => TRANSIENT.has(t.kind)),
      ...oldestFirst.filter((t) => !TRANSIENT.has(t.kind))
    ];
    evict.push(...order.slice(0, overflow).map((t) => t.id));
  }
  return evict;
}
