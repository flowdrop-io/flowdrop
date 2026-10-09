<!--
  CanvasContextMenu Component
  The editor's right-click / Shift+F10 menu. Renders already-resolved entries
  (see editor/contextMenu.ts) as an ARIA menu positioned at the pointer and
  clamped inside the viewport. It is a manual popover, so it sits in the top
  layer and no ancestor's overflow or stacking context can clip or cover it;
  that is also why it is positioned in viewport coordinates. A manual popover
  does not light-dismiss, so it closes itself on outside pointerdown, wheel
  (zoom/pan), window blur, Escape, and after an entry runs.
  Styled with BEM syntax.
-->

<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { on } from 'svelte/events';
  import Icon from '@iconify/svelte';
  import { m } from '$lib/messages/index.js';
  import { isSeparator, type ContextMenuEntry } from '../editor/contextMenu.js';

  interface Props {
    /** Resolved entries (separators already cleaned). */
    entries: ContextMenuEntry[];
    /** Left edge of the menu, in viewport (client) px. */
    x: number;
    /** Top edge of the menu, in viewport (client) px. */
    y: number;
    /** Run an entry. The menu closes afterwards. */
    onselect: (entry: ContextMenuEntry) => void;
    /** Close without running anything. */
    onclose: () => void;
  }

  const { entries, x, y, onselect, onclose }: Props = $props();

  /** The icon column exists only when some entry has an icon. */
  const hasIcons = $derived(entries.some((e) => !isSeparator(e) && e.icon));

  let menuEl: HTMLDivElement | undefined = $state();

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

  /**
   * Opening, once per menu: remember the focus to return to, show the
   * popover, focus the first item and wire the dismissals a manual popover
   * does not do itself.
   */
  const open: Attachment<HTMLDivElement> = (el) => {
    previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Optional: jsdom has no Popover API.
    el.showPopover?.();
    el.querySelector<HTMLButtonElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus({
      preventScroll: true
    });

    const removers = [
      on(
        window,
        'pointerdown',
        (event) => {
          if (event.target instanceof Node && el.contains(event.target)) return;
          onclose();
        },
        { capture: true }
      ),
      on(window, 'wheel', () => onclose(), { capture: true, passive: true }),
      on(window, 'blur', () => onclose())
    ];
    return () => removers.forEach((remove) => remove());
  };

  /**
   * Placement, again whenever the requested position changes: slide back
   * inside the viewport rather than flipping. The popover is showing by now
   * (see `open`), so it can be measured. Written to the style directly: the
   * position is a measurement result, not state anything else reads.
   */
  const place: Attachment<HTMLDivElement> = (el) => {
    el.style.left = `${Math.max(0, Math.min(x, window.innerWidth - el.offsetWidth))}px`;
    el.style.top = `${Math.max(0, Math.min(y, window.innerHeight - el.offsetHeight))}px`;
  };

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
  popover="manual"
  class="canvas-context-menu nodrag nopan nowheel"
  role="menu"
  tabindex="-1"
  aria-label={m().contextMenu.menuLabel}
  onkeydown={handleKeydown}
  {@attach open}
  {@attach place}
  oncontextmenu={(event) => event.preventDefault()}
>
  {#each entries as entry (entry.id)}
    {#if isSeparator(entry)}
      <div class="canvas-context-menu__separator" role="separator"></div>
    {:else}
      <button
        type="button"
        class="canvas-context-menu__item"
        class:canvas-context-menu__item--danger={entry.danger}
        role="menuitem"
        tabindex="-1"
        aria-disabled={entry.disabled ? 'true' : undefined}
        onclick={() => run(entry)}
      >
        {#if hasIcons}
          <span class="canvas-context-menu__icon" aria-hidden="true">
            {#if entry.icon}
              <Icon icon={entry.icon} />
            {/if}
          </span>
        {/if}
        <span class="canvas-context-menu__label">{entry.label}</span>
        {#if entry.shortcut}
          <kbd class="canvas-context-menu__shortcut" aria-hidden="true">{entry.shortcut}</kbd>
        {/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .canvas-context-menu {
    /* Reset the popover user-agent styles: it is placed by the script, in the viewport. */
    position: fixed;
    inset: auto;
    margin: 0;
    overflow: visible;
    min-width: 11rem;
    max-width: 18rem;
    padding: 0.25rem;
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-menu-radius);
    box-shadow: var(--fd-menu-shadow);
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
    min-height: var(--fd-menu-item-height);
    border: none;
    border-radius: var(--fd-menu-item-radius);
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

  /* A key glyph (⌫ ↵), not a word and not a chip. */
  .canvas-context-menu__shortcut {
    margin-left: var(--fd-space-md);
    color: var(--fd-muted-foreground);
    font-family: inherit;
    font-size: var(--fd-text-xs);
    line-height: 1;
  }

  /* Destructive entry: danger tone on the label and icon, a faint danger fill on hover. */
  .canvas-context-menu__item--danger,
  .canvas-context-menu__item--danger .canvas-context-menu__icon {
    color: var(--fd-destructive);
  }

  .canvas-context-menu__item--danger:hover,
  .canvas-context-menu__item--danger:focus-visible {
    background-color: color-mix(in srgb, var(--fd-destructive) 10%, transparent);
  }

  .canvas-context-menu__separator {
    height: 1px;
    margin: 0.25rem 0.25rem;
    background-color: var(--fd-border-muted);
  }
</style>
