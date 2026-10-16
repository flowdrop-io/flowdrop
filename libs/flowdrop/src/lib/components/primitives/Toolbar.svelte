<!--
  @component
  Toolbar: a bare row (or column) that groups controls so arrow keys move between them.

  It draws nothing itself; each control inside floats on its own. `role="toolbar"`: the arrow
  keys (Left/Right when horizontal, Up/Down when vertical), Home and End move focus between
  the focusable children. This is a shortcut on top of Tab, not a replacement: every control
  keeps its place in the Tab order. A `Segmented` inside keeps its own arrow keys; the
  toolbar skips events a child already handled.

  **Toolbar, Segmented or Tabs?** Toolbar groups several different controls. `Segmented` picks
  a mode. `Tabs` picks a view.

  **Use it for** a group of buttons and switches. The real canvas toolbar is `CanvasToolbar`
  (Editor/Canvas).
  **Not for** drawing a bar; it has no surface of its own.

  Not exported from the package; not public API yet.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Accessible name of the toolbar */
    ariaLabel: string;
    /** Layout and arrow-key axis */
    orientation?: 'horizontal' | 'vertical';
    /** Extra classes appended to the root */
    class?: string;
    /** Toolbar content */
    children: Snippet;
  }

  let { ariaLabel, orientation = 'horizontal', class: className = '', children }: Props = $props();

  let root: HTMLDivElement | undefined = $state();

  const FOCUSABLE =
    'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex^="-"])';

  function items(): HTMLElement[] {
    if (!root) return [];
    // Radios of a Segmented count too: their roving tabindex (-1) hides the
    // unselected ones from the plain focusable selector.
    return Array.from(
      root.querySelectorAll<HTMLElement>(`${FOCUSABLE}, [role="radio"]:not(:disabled)`)
    );
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const next = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const prev = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    if (![next, prev, 'Home', 'End'].includes(event.key)) return;
    const list = items();
    if (list.length === 0) return;
    const current = list.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    let target = current;
    if (event.key === next) target = (current + 1) % list.length;
    else if (event.key === prev) target = (current - 1 + list.length) % list.length;
    else if (event.key === 'Home') target = 0;
    else target = list.length - 1;
    event.preventDefault();
    list[target]?.focus();
  }
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
  bind:this={root}
  class="flowdrop-ui-toolbar flowdrop-ui-toolbar--{orientation} {className}"
  role="toolbar"
  aria-label={ariaLabel}
  aria-orientation={orientation}
  {onkeydown}
>
  {@render children()}
</div>

<style>
  .flowdrop-ui-toolbar {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    gap: 6px;
    color: var(--fd-foreground);
  }

  .flowdrop-ui-toolbar--vertical {
    flex-direction: column;
    align-items: stretch;
  }
</style>
