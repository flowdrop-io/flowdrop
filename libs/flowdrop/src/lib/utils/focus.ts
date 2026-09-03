/**
 * Focus attachments.
 *
 * `{@attach focusOnMount()}` moves keyboard focus to an element as it enters
 * the DOM — a dialog's primary button, the first choice of a form that just
 * opened, a listbox the author stepped into. An attachment rather than an
 * `$effect` over a `bind:this` because focusing is a fact about the element's
 * arrival, not about state: it runs once when the node mounts and never again.
 *
 * @module utils/focus
 */

import type { Attachment } from 'svelte/attachments';

const noop: Attachment<HTMLElement> = () => {};

/**
 * Focus the element when it mounts. Pass `false` to switch it off at a call
 * site that only sometimes wants focus (a listbox that is autofocused in one
 * host and not in another).
 */
export function focusOnMount(enabled = true): Attachment<HTMLElement> {
  if (!enabled) return noop;
  return (element) => {
    element.focus();
  };
}
