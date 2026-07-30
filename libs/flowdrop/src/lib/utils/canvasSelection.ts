/**
 * Canvas Selection Utilities
 *
 * Keeps canvas pointer gestures from turning into browser text-selection drags.
 */

/**
 * Suppress the text-selection drag a port handle mousedown would otherwise start.
 *
 * All canvas chrome is `user-select: none` (xyflow sets it on the node, pane and
 * viewport), but WebKit still begins a selection drag from a mousedown on
 * unselectable content: it anchors at the nearest selectable text *outside* the
 * canvas — sidebar, toolbar, status bar or the surrounding host page — and
 * extends it as the pointer moves, so drawing a connection paints a selection
 * across the app (#37). Chromium and Firefox never start the gesture.
 *
 * Only handles need this: xyflow already suppresses the default for node drags
 * (d3-drag) and pane drags. Handles are the one canvas drag started from a plain
 * mousedown handler, so we suppress the default here — nothing in the connect
 * flow depends on it, since xyflow tracks the drag on its own pointer listeners.
 * The default action also moves focus, so re-apply it to keep the focus ring
 * (`.svelte-flow__handle:focus` in base.css) behaving as before.
 *
 * Bind in the capture phase so xyflow's handle handler still receives the event.
 */
export function suppressPortDragSelection(event: MouseEvent): void {
  // Primary button only — other buttons never start a selection.
  if (event.button !== 0) return;

  const target = event.target as HTMLElement | null;
  if (typeof target?.closest !== 'function') return;

  const handle = target.closest<HTMLElement>('.svelte-flow__handle');
  if (!handle) return;

  event.preventDefault();
  handle.focus();
}
