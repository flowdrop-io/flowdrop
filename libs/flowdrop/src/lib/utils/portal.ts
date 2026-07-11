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
 * Usage: `<div use:portal>…</div>` or `<div use:portal={targetElement}>…</div>`.
 * No-op during SSR (no `document`).
 */
export function portal(node: HTMLElement, target: HTMLElement | undefined = undefined) {
  let host: HTMLElement | null = null;

  function mount(to: HTMLElement | undefined) {
    if (typeof document === 'undefined') return;
    host = to ?? document.body;
    host.appendChild(node);
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
