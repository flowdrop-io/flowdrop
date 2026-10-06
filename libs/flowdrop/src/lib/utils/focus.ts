/**
 * Focus attachments.
 *
 * `{@attach focusOnMount()}` moves keyboard focus to an element as it enters
 * the DOM — a dialog's primary button, the first choice of a form that just
 * opened, a listbox the author stepped into. An attachment rather than an
 * `$effect` over a `bind:this` because focusing is a fact about the element's
 * arrival, not about state: it runs once when the node mounts and never again.
 *
 * `{@attach focusWhenVisible()}` is the same for an element inside a canvas
 * node, which xyflow keeps `visibility: hidden` until it has measured it.
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

/**
 * Focus the element as soon as it can take focus, for an element that mounts
 * inside an xyflow node. xyflow renders the node wrapper
 * (`.svelte-flow__node`) with an inline `visibility: hidden` until the node
 * has dimensions, and a hidden element cannot be focused, so a node that was
 * just added to the canvas cannot take focus on mount. If the element is
 * already visible it is focused at once; otherwise the wrapper's `style` is
 * watched and the element is focused when the visibility flips. The observer
 * goes away on success and on cleanup.
 *
 * @param onFocused - runs after the element took focus (e.g. to select its text)
 */
export function focusWhenVisible(
  onFocused?: (element: HTMLElement) => void
): Attachment<HTMLElement> {
  return (element) => {
    function tryFocus(): boolean {
      // Visibility is inherited, so the element's own computed value covers the wrapper's.
      if (getComputedStyle(element).visibility === 'hidden') return false;
      element.focus({ preventScroll: true });
      if (document.activeElement !== element) return false;
      onFocused?.(element);
      return true;
    }

    if (tryFocus()) return;

    const wrapper = element.closest<HTMLElement>('.svelte-flow__node');
    if (!wrapper) return;
    const observer = new MutationObserver(() => {
      if (tryFocus()) observer.disconnect();
    });
    observer.observe(wrapper, { attributes: true, attributeFilter: ['style', 'class'] });
    return () => observer.disconnect();
  };
}
