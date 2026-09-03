/**
 * Svelte context plumbing for the messages system.
 *
 * The context value is a **getter** `() => Messages`, not a snapshot. Storing
 * a getter lets the consumer's i18n library drive reactivity transparently:
 * they pass `messages={() => somethingReactive()}` to `<FlowDrop>`, the root
 * `$derived`s the merged tree, and `m()` re-reads it on every access. No
 * subscription, no store, no flowdrop-owned reactive primitive.
 *
 * Components rendered outside the root provider (Storybook stories, ad-hoc
 * mounts) silently fall back to `defaultMessages` rather than throwing — see
 * `getMessages()` below. Trade-off: a missing provider produces English
 * regardless of the consumer's locale, by design.
 */

import { getContext, setContext } from 'svelte';
import { defaultMessages } from './defaults.js';
import type { Messages } from './types.js';

const KEY = Symbol('flowdrop.messages');

const defaultGetter: () => Messages = () => defaultMessages;

export function setMessages(getter: () => Messages): void {
  setContext(KEY, getter);
}

/**
 * The context entry `setMessages` would create, for code that mounts a
 * component imperatively (`mount(Component, { target, context })`) and so has
 * no provider above it. The WebMCP confirm dialog is mounted this way.
 */
export function messagesContext(getter: () => Messages): Map<unknown, unknown> {
  return new Map([[KEY, getter]]);
}

/**
 * Returns the current messages getter. Components should call the result on
 * every read so locale switches in the consumer's i18n library propagate
 * without a subscription.
 *
 * Outside a provider, returns a getter that always yields `defaultMessages`.
 */
export function getMessages(): () => Messages {
  return getContext<() => Messages>(KEY) ?? defaultGetter;
}

/**
 * Shorthand for the common pattern `getMessages()()` — read the current
 * merged messages tree once. Use inside templates: `m().form.array.moveUp`.
 */
export function m(): Messages {
  return getMessages()();
}
