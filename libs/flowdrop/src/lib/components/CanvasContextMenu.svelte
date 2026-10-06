<!--
  CanvasContextMenu Component
  The editor's right-click / Shift+F10 menu. Renders already-resolved entries
  (see editor/contextMenu.ts) as an ARIA menu positioned at the pointer and
  clamped inside its offset parent (the canvas). Closes on outside pointerdown,
  wheel (zoom/pan), window blur, Escape, and after an entry runs.
  Styled with BEM syntax.
-->

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Icon from '@iconify/svelte';
  import { m } from '$lib/messages/index.js';
  import { isSeparator, type ContextMenuEntry } from '../editor/contextMenu.js';

  interface Props {
    /** Resolved entries (separators already cleaned). */
    entries: ContextMenuEntry[];
    /** Left edge of the menu, in px relative to the offset parent. */
    x: number;
    /** Top edge of the menu, in px relative to the offset parent. */
    y: number;
    /** Run an entry. The menu closes afterwards. */
    onselect: (entry: ContextMenuEntry) => void;
    /** Close without running anything. */
    onclose: () => void;
  }

  const { entries, x, y, onselect, onclose }: Props = $props();

  let menuEl: HTMLDivElement;
  let left = $state(0);
  let top = $state(0);

  /** Element that had focus when the menu opened; focus returns there on keyboard close. */
  let previouslyFocused: HTMLElement | null = null;

  function items(): HTMLButtonElement[] {
    return Array.from(
      menuEl?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([aria-disabled="true"])'
      ) ?? []
    );
  }

  function restoreFocus(): void {
    if (previouslyFocused && previouslyFocused.isConnected) {
      previouslyFocused.focus({ preventScroll: true });
    }
  }

  function closeAndRestore(): void {
    onclose();
    restoreFocus();
  }

  function run(entry: ContextMenuEntry): void {
    if (isSeparator(entry) || entry.disabled) return;
    onselect(entry);
    restoreFocus();
  }

  /** Clamp the menu inside the offset parent, flipping nothing: it just slides back in. */
  function position(): void {
    const parent = menuEl.offsetParent as HTMLElement | null;
    const maxW = parent?.clientWidth ?? window.innerWidth;
    const maxH = parent?.clientHeight ?? window.innerHeight;
    left = Math.max(0, Math.min(x, maxW - menuEl.offsetWidth));
    top = Math.max(0, Math.min(y, maxH - menuEl.offsetHeight));
  }

  onMount(() => {
    previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    void tick().then(() => {
      position();
      items()[0]?.focus({ preventScroll: true });
    });

    function onPointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && menuEl.contains(event.target)) return;
      onclose();
    }
    function onWheel(): void {
      onclose();
    }
    function onBlur(): void {
      onclose();
    }

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('wheel', onWheel, { capture: true, passive: true });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('blur', onBlur);
    };
  });

  // Re-clamp if the requested position changes while open.
  $effect(() => {
    void x;
    void y;
    if (menuEl) position();
  });

  function handleKeydown(event: KeyboardEvent): void {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        list[(index + 1) % list.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        list[(index - 1 + list.length) % list.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        list[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        list[list.length - 1]?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        closeAndRestore();
        break;
      case 'Tab':
        event.preventDefault();
        closeAndRestore();
        break;
      // Enter and Space activate the focused button natively (click).
      default:
        break;
    }
    // Keep menu keys away from the canvas (arrow keys would nudge the node, Backspace would delete it).
    event.stopPropagation();
  }
</script>

<div
  bind:this={menuEl}
  class="canvas-context-menu nodrag nopan nowheel"
  role="menu"
  tabindex="-1"
  aria-label={m().contextMenu.menuLabel}
  style:left="{left}px"
  style:top="{top}px"
  onkeydown={handleKeydown}
  oncontextmenu={(event) => event.preventDefault()}
>
  {#each entries as entry (entry.id)}
    {#if isSeparator(entry)}
      <div class="canvas-context-menu__separator" role="separator"></div>
    {:else}
      <button
        type="button"
        class="canvas-context-menu__item"
        role="menuitem"
        tabindex="-1"
        aria-disabled={entry.disabled ? 'true' : undefined}
        onclick={() => run(entry)}
      >
        <span class="canvas-context-menu__icon" aria-hidden="true">
          {#if entry.icon}
            <Icon icon={entry.icon} />
          {/if}
        </span>
        <span class="canvas-context-menu__label">{entry.label}</span>
        {#if entry.shortcut}
          <span class="canvas-context-menu__shortcut" aria-hidden="true">{entry.shortcut}</span>
        {/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .canvas-context-menu {
    position: absolute;
    z-index: 50;
    min-width: 11rem;
    max-width: 18rem;
    padding: 0.25rem;
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    box-shadow: var(--fd-shadow-lg);
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    outline: none;
  }

  .canvas-context-menu__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: none;
    border-radius: var(--fd-radius-sm);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  .canvas-context-menu__item:hover,
  .canvas-context-menu__item:focus-visible {
    background-color: var(--fd-subtle);
    outline: none;
  }

  .canvas-context-menu__item[aria-disabled='true'] {
    color: var(--fd-muted-foreground);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .canvas-context-menu__item[aria-disabled='true']:hover {
    background: none;
  }

  .canvas-context-menu__icon {
    display: inline-flex;
    width: 1rem;
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  .canvas-context-menu__label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .canvas-context-menu__shortcut {
    margin-left: 1rem;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
  }

  .canvas-context-menu__separator {
    height: 1px;
    margin: 0.25rem 0.25rem;
    background-color: var(--fd-border-muted);
  }
</style>
