/**
 * Svelte action: keeps `data-theme` on an editor's scope element in step with
 * the resolved colour scheme (light | dark).
 *
 * The scheme lives on the editor, not on `<html>`: an overlay moved to `<body>`
 * (see `portal`) takes the scheme with it by using this same action.
 * `base.css` sets `color-scheme` from it; `tokens.css` switches the dark palette
 * on `[data-theme='dark']`.
 *
 * Apply it to the editor root and to portalled overlays only. A nested element
 * with its own `data-theme` would re-declare the dark palette over a skin's
 * tokens inherited from the editor scope.
 *
 * Compatibility: 2.11.0 and earlier wrote the resolved scheme to
 * `<html data-theme>`, and hosts key their own styles on `html[data-theme]`.
 * Editor roots (`{ mirror: true }`) keep doing that. It is harmless to the scoped
 * design: the mirrored value is always the same resolved scheme the scope element
 * carries, so `[data-theme='dark']` matching `<html>` and the scope agree.
 */
import { getResolvedTheme } from '../stores/settingsStore.svelte.js';

export interface ThemeScopeOptions {
  /**
   * Also mirror the resolved scheme onto `<html data-theme>`.
   * Last resolved wins when several editors are mounted.
   */
  mirror?: boolean;
}

// Shared bookkeeping for the `<html>` mirror (one attribute, many editors).
let mirrorCount = 0;
let mirrorOriginal: string | null = null;
let mirrorLast: string | null = null;

function mirrorAcquire(): void {
  if (typeof document === 'undefined') return;
  if (mirrorCount === 0) {
    mirrorOriginal = document.documentElement.getAttribute('data-theme');
    mirrorLast = null;
  }
  mirrorCount++;
}

function mirrorSet(value: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', value);
  mirrorLast = value;
}

function mirrorRelease(): void {
  if (typeof document === 'undefined') return;
  mirrorCount = Math.max(0, mirrorCount - 1);
  if (mirrorCount > 0) return;
  const html = document.documentElement;
  // Only undo what we set: a host that changed the attribute since keeps its value.
  if (mirrorLast !== null && html.getAttribute('data-theme') === mirrorLast) {
    if (mirrorOriginal === null) html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', mirrorOriginal);
  }
  mirrorOriginal = null;
  mirrorLast = null;
}

export function themeScope(
  node: HTMLElement,
  options: ThemeScopeOptions = {}
): { destroy(): void } {
  const mirror = options.mirror === true;
  if (mirror) mirrorAcquire();
  const apply = (): void => {
    const resolved = getResolvedTheme();
    node.setAttribute('data-theme', resolved);
    if (mirror) mirrorSet(resolved);
  };
  // Effects flush on a microtask; the first paint must not wait for it.
  apply();
  const stop = $effect.root(() => {
    $effect(apply);
  });
  return {
    destroy() {
      stop();
      node.removeAttribute('data-theme');
      if (mirror) mirrorRelease();
    }
  };
}
