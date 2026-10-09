/**
 * Svelte action: keeps `data-theme` on an editor's scope element in step with
 * the resolved colour scheme (light | dark).
 *
 * The scheme lives on the editor, not on `<html>`: the host page around an
 * editor is not themed, two editors never fight over one attribute, and an
 * overlay moved to `<body>` (see `portal`) takes the scheme with it by using
 * this same action. `base.css` sets `color-scheme` from it; `tokens.css`
 * switches the dark palette on `[data-theme='dark']`.
 *
 * Apply it to the editor root and to portalled overlays only. A nested element
 * with its own `data-theme` would re-declare the dark palette over a skin's
 * tokens inherited from the editor scope.
 */
import { getResolvedTheme } from '../stores/settingsStore.svelte.js';

export function themeScope(node: HTMLElement): { destroy(): void } {
  // Effects flush on a microtask; the first paint must not wait for it.
  node.setAttribute('data-theme', getResolvedTheme());
  const stop = $effect.root(() => {
    $effect(() => {
      node.setAttribute('data-theme', getResolvedTheme());
    });
  });
  return {
    destroy() {
      stop();
      node.removeAttribute('data-theme');
    }
  };
}
