/**
 * Type machinery for the FlowDrop messages system.
 *
 * `Messages` is the canonical shape of every user-facing string in the library.
 * It is derived from `defaultMessages` so the defaults file is the single
 * source of truth — adding a key there immediately widens the type.
 *
 * Consumers pass `DeepPartial<Messages>` to override any subset. Function
 * leaves (parameterised strings) may be overridden with either a function of
 * the same signature OR a plain string for cases where the override doesn't
 * need the parameters.
 */

import type { defaultMessages } from './defaults.js';

export type Messages = typeof defaultMessages;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => unknown;

/**
 * A recursive partial that:
 *   - allows skipping any key at any level,
 *   - preserves function leaves with their original signature — overrides
 *     of parameterised messages MUST stay functions, because call sites
 *     invoke them with the params object,
 *   - widens string leaves to `string` so `as const` literal defaults
 *     (e.g. `'Cancel'`) accept arbitrary translations.
 */
export type DeepPartial<T> = T extends AnyFn
  ? T
  : T extends string
    ? string
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

export type MessagesOverride = DeepPartial<Messages>;
