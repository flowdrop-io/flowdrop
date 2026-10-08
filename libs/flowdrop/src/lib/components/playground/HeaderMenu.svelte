<!--
  HeaderMenu

  A button that opens a menu: the one control behind both the history chip and
  the ⋯ menu of the docked Playground's header.

  Keyboard: Enter / Space / ArrowDown open it and focus the first item;
  ArrowUp / ArrowDown / Home / End move between items (disabled ones are
  skipped); Escape closes it and returns focus to the button; Tab closes it.
  Items are any element with `role="menuitem"`, `menuitemcheckbox` or
  `menuitemradio` inside `children`, which receives `close` so an item can
  close the menu after it acts.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Accessible name of the button (and of the menu). */
    label: string;
    /** Test hook, put on the button. */
    testId?: string;
    /** Button content. */
    trigger: Snippet;
    /** The menu's items. */
    children: Snippet<[{ close: () => void }]>;
    /** Which edge of the button the menu lines up with. @default 'start' */
    align?: 'start' | 'end';
    /** Runs when the menu opens (refresh what it lists). */
    onOpen?: () => void;
    /** `chip` is a labelled pill, `icon` a square icon button. @default 'chip' */
    variant?: 'chip' | 'icon';
  }

  let {
    label,
    testId,
    trigger,
    children,
    align = 'start',
    onOpen,
    variant = 'chip'
  }: Props = $props();

  let open = $state(false);
  let wrapEl = $state<HTMLElement | null>(null);
  let buttonEl = $state<HTMLButtonElement | null>(null);
  let menuEl = $state<HTMLElement | null>(null);

  const ITEMS = '[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])';

  function items(): HTMLElement[] {
    return menuEl ? Array.from(menuEl.querySelectorAll<HTMLElement>(ITEMS)) : [];
  }

  function show(focus: 'first' | 'last' = 'first'): void {
    open = true;
    onOpen?.();
    // The menu renders on the next tick.
    queueMicrotask(() => {
      const all = items();
      (focus === 'last' ? all.at(-1) : all[0])?.focus();
    });
  }

  function close(returnFocus = true): void {
    if (!open) return;
    open = false;
    if (returnFocus) buttonEl?.focus();
  }

  function onButtonKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) show(event.key === 'ArrowUp' ? 'last' : 'first');
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  function onMenuKeydown(event: KeyboardEvent): void {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        all[(index + 1) % all.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        all[(index - 1 + all.length) % all.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        all[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        all.at(-1)?.focus();
        break;
      case 'Escape':
        // Not further: the editor clears the selection on Escape.
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  }

  $effect(() => {
    if (!open) return;
    function onOutside(event: MouseEvent): void {
      if (!wrapEl?.contains(event.target as Node)) close(false);
    }
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  });
</script>

<div class="header-menu" bind:this={wrapEl}>
  <button
    type="button"
    class="header-menu__button header-menu__button--{variant}"
    class:header-menu__button--open={open}
    bind:this={buttonEl}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={label}
    title={label}
    data-testid={testId}
    onclick={() => (open ? close(false) : show())}
    onkeydown={onButtonKeydown}
  >
    {@render trigger()}
  </button>

  {#if open}
    <!-- Key handling is delegated from the focused menu items. -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
      class="header-menu__menu header-menu__menu--{align}"
      role="menu"
      aria-label={label}
      bind:this={menuEl}
      onkeydown={onMenuKeydown}
    >
      {@render children({ close: () => close() })}
    </div>
  {/if}
</div>

<style>
  .header-menu {
    position: relative;
    min-width: 0;
    display: inline-flex;
  }

  .header-menu__button {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
    border: 1px solid var(--fd-border);
    background: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    line-height: 1;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
  }

  .header-menu__button--chip {
    padding: var(--fd-space-3xs) var(--fd-space-sm) var(--fd-space-3xs) var(--fd-space-md);
    border-radius: 999px;
    max-width: 100%;
  }

  .header-menu__button--icon {
    justify-content: center;
    width: var(--fd-size-icon-btn);
    height: var(--fd-size-icon-btn);
    padding: 0;
    border-radius: var(--fd-radius-md);
    color: var(--fd-muted-foreground);
  }

  .header-menu__button:hover,
  .header-menu__button--open {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
  }

  .header-menu__button:focus-visible {
    outline: 2px solid var(--fd-primary);
    outline-offset: 1px;
  }

  .header-menu__menu {
    position: absolute;
    top: calc(100% + var(--fd-space-xs));
    z-index: 50;
    width: max-content;
    min-width: 220px;
    max-width: min(300px, calc(100vw - 32px));
    max-height: min(60vh, 420px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: var(--fd-space-xs);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    box-shadow: var(--fd-shadow-lg);
  }

  /* Shared by every item the header (or a host, through `menuItems`) renders. */
  :global(.header-menu__item) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    width: 100%;
    padding: var(--fd-space-sm);
    border: none;
    border-radius: var(--fd-radius-sm);
    background: transparent;
    color: var(--fd-foreground);
    font: inherit;
    font-size: var(--fd-text-sm);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  :global(.header-menu__item:hover:not(:disabled)),
  :global(.header-menu__item:focus-visible) {
    background-color: var(--fd-muted);
    outline: none;
  }

  :global(.header-menu__item:disabled) {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :global(.header-menu__item-label) {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    max-width: 100%;
    font-weight: 500;
  }

  :global(.header-menu__item-label > span) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.header-menu__item-hint) {
    max-width: 100%;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.header-menu__group) {
    padding: var(--fd-space-xs) var(--fd-space-sm) var(--fd-space-3xs);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  :global(.header-menu__divider) {
    height: 1px;
    margin: var(--fd-space-xs) 0;
    background-color: var(--fd-border-muted);
  }

  .header-menu__menu--start {
    left: 0;
  }

  .header-menu__menu--end {
    right: 0;
  }
</style>
