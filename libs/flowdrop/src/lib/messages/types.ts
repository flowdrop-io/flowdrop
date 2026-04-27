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
 *   - preserves function leaves with their original signature,
 *   - additionally accepts a plain `string` where the default is a function,
 *     so consumers using i18n libraries that emit pre-resolved strings don't
 *     have to wrap them.
 */
export type DeepPartial<T> = T extends AnyFn
  ? T | string
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type MessagesOverride = DeepPartial<Messages>;
