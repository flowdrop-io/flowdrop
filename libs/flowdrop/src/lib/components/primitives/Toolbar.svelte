<!--
  Toolbar primitive — a floating group container for canvas controls.

  role="toolbar" with roving focus: Tab enters the group once, arrow keys
  (Left/Right for horizontal, Up/Down for vertical), Home and End move between
  the focusable children. Compose with Segmented, IconButton, Chip, and
  ToolbarSeparator. Native focusable elements only (buttons, links, inputs,
  elements with a non-negative tabindex).

  Note: a Segmented inside the toolbar keeps its own arrow-key handling; the
  toolbar skips events that a child already handled (defaultPrevented).

  @internal Not exported from any package entry; not public API yet.
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
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-3xs);
    background-color: var(--fd-card);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-xl);
    box-shadow: var(--fd-shadow-md);
    color: var(--fd-foreground);
  }

  .flowdrop-ui-toolbar--vertical {
    flex-direction: column;
    align-items: stretch;
  }
</style>
