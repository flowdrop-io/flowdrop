/**
 * Svelte action that relocates an element to `document.body` (or another
 * target) for its lifetime, then removes it on destroy.
 *
 * Modals and overlays use `position: fixed` expecting the viewport as their
 * containing block. When any ancestor establishes a containing block — via
 * `transform`, `filter`, `backdrop-filter`, `will-change`, `contain`, etc. —
 * `fixed` resolves against that ancestor instead, causing clipping and
 * mis-centering. Portalling the node to `document.body` sidesteps this by
 * escaping those ancestors entirely.
 *
 * The node leaves `.flowdrop-root`, so it takes the editor's skin scope with
 * it: `data-fd-scope` is copied from the nearest scoped ancestor (read before
 * the move) and the node gets the `flowdrop-portal` class, which the base
 * stylesheet treats as a FlowDrop root.
 *
 * Usage: `<div use:portal>…</div>` or `<div use:portal={targetElement}>…</div>`.
 * No-op during SSR (no `document`).
 */
/** Attribute that scopes one editor's skin (on `.flowdrop-root`, copied onto overlays). */
export const SCOPE_ATTR = 'data-fd-scope';
export const PORTAL_CLASS = 'flowdrop-portal';

export function portal(node: HTMLElement, target: HTMLElement | undefined = undefined) {
  let host: HTMLElement | null = null;
  // Remembered across updates: after the first move the node no longer has the
  // editor as an ancestor to look the scope up on.
  let scope: string | null = null;

  function mount(to: HTMLElement | undefined) {
    if (typeof document === 'undefined') return;
    scope ??= node.closest(`[${SCOPE_ATTR}]`)?.getAttribute(SCOPE_ATTR) ?? null;
    host = to ?? document.body;
    host.appendChild(node);
    node.classList.add(PORTAL_CLASS);
    if (scope !== null) node.setAttribute(SCOPE_ATTR, scope);
  }

  mount(target);

  return {
    update(nextTarget: HTMLElement | undefined) {
      mount(nextTarget);
    },
    destroy() {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  };
}
