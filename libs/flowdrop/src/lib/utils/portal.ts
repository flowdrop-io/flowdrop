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
 * stylesheet treats as a FlowDrop root. It also gets `data-theme` (the editor's
 * resolved colour scheme, via the `themeScope` action), since that no longer
 * sits on <html>.
 *
 * A host page that uses the `ui` components has no editor scope, only a
 * `.flowdrop-scope` wrapper with its own `data-theme` (a wrapper without one
 * falls back to the store, as the library's standalone components do). There the node gets the
 * `flowdrop-scope` class (so the host's skin rules still match it) and follows
 * the wrapper's `data-theme` instead of the editor's store.
 *
 * Usage: `<div use:portal>…</div>` or `<div use:portal={targetElement}>…</div>`.
 * No-op during SSR (no `document`).
 */
import { themeScope } from './themeScope.svelte.js';

/** Attribute that scopes one editor's skin (on `.flowdrop-root`, copied onto overlays). */
export const SCOPE_ATTR = 'data-fd-scope';
export const PORTAL_CLASS = 'flowdrop-portal';
/** The wrapper a host page puts around `ui` components (carries the skin and `data-theme`). */
const HOST_SCOPE_CLASS = 'flowdrop-scope';

export function portal(node: HTMLElement, target: HTMLElement | undefined = undefined) {
  // Read before the move, while the node still sits inside its ancestors.
  const editorScope = node.closest(`[${SCOPE_ATTR}]`);
  // Only a wrapper that sets `data-theme` counts: the library's own standalone
  // components (SettingsPanel, SchemaForm, PlaygroundSurface, …) also carry
  // `.flowdrop-scope`, without one, and keep following the store.
  const hostScope = editorScope
    ? null
    : node.closest<HTMLElement>(`.${HOST_SCOPE_CLASS}[data-theme]`);

  // The colour scheme is `data-theme` on the editor scope, not on <html>, so
  // an overlay on <body> gets its own (kept in step with the store). In a host
  // wrapper it is copied from the wrapper instead, and follows its changes.
  let theme: { destroy(): void };
  if (hostScope) {
    const copy = (): void => {
      const value = hostScope.getAttribute('data-theme');
      if (value === null) node.removeAttribute('data-theme');
      else node.setAttribute('data-theme', value);
    };
    copy();
    const observer = new MutationObserver(copy);
    observer.observe(hostScope, { attributes: true, attributeFilter: ['data-theme'] });
    theme = {
      destroy() {
        observer.disconnect();
        node.removeAttribute('data-theme');
      }
    };
  } else {
    theme = themeScope(node);
  }
  let host: HTMLElement | null = null;
  // Remembered across updates: after the first move the node no longer has the
  // editor as an ancestor to look the scope up on.
  let scope: string | null = null;

  function mount(to: HTMLElement | undefined) {
    if (typeof document === 'undefined') return;
    scope ??= editorScope?.getAttribute(SCOPE_ATTR) ?? null;
    host = to ?? document.body;
    host.appendChild(node);
    node.classList.add(PORTAL_CLASS);
    if (scope !== null) node.setAttribute(SCOPE_ATTR, scope);
    if (hostScope) node.classList.add(HOST_SCOPE_CLASS);
  }

  mount(target);

  return {
    update(nextTarget: HTMLElement | undefined) {
      mount(nextTarget);
    },
    destroy() {
      theme.destroy();
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  };
}
