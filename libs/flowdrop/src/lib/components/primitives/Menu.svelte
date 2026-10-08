<!--
  Menu — a dropdown menu: a trigger button and a popup of items.

  Items come from `items` (declarative: actions, checkable and radio items,
  separators, group labels) and/or free-form `children` (which receives
  `close`; any element with `role="menuitem"`, `menuitemcheckbox` or
  `menuitemradio` takes part in keyboard navigation).

  Keyboard: Enter / Space / ArrowDown open it and focus the first item (ArrowUp
  the last); ArrowUp / ArrowDown / Home / End move between items (disabled ones
  are skipped); typing a character jumps to the next item starting with it;
  Escape closes it and returns focus to the trigger (the event stops there, the
  editor clears the selection on Escape); Tab closes it. A click outside closes
  it without taking focus back.

  The trigger is an `IconButton` showing `⋯` unless `trigger` (the content of
  the trigger button) is given; `triggerClass` styles that custom button.

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts" module>
  export interface MenuItem {
    type?: 'item';
    /** Visible text. */
    label: string;
    /** Muted second line. */
    hint?: string;
    /** Iconify name shown before the label. */
    icon?: string;
    /** Makes it a checkbox item; a check is shown when true. */
    checked?: boolean;
    /** Makes it a radio item (use with `checked`). */
    radio?: boolean;
    disabled?: boolean;
    /** Test hook, put on the item. */
    testId?: string;
    /** Runs when chosen; the menu closes afterwards unless `keepOpen`. */
    onselect?: () => void;
    keepOpen?: boolean;
  }
  export interface MenuSeparator {
    type: 'separator';
  }
  export interface MenuGroup {
    type: 'group';
    label: string;
  }
  export type MenuEntry = MenuItem | MenuSeparator | MenuGroup;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '@iconify/svelte';
  import IconButton from './IconButton.svelte';
  import { getMessages } from '../../messages/context.js';

  interface Props {
    /** Accessible name of the trigger (and of the menu). Defaults to "More actions". */
    label?: string;
    /** Declarative entries. */
    items?: MenuEntry[];
    /** Free-form content, rendered after `items`. */
    children?: Snippet<[{ close: () => void }]>;
    /** Content of the trigger button; without it the default `⋯` IconButton is used. */
    trigger?: Snippet<[{ open: boolean }]>;
    /** Class(es) on the custom trigger button. */
    triggerClass?: string;
    /** Test hook, put on the trigger. */
    testId?: string;
    /** Which edge of the trigger the popup lines up with. */
    align?: 'start' | 'end';
    /** Height of the default `⋯` trigger. */
    size?: 'sm' | 'md';
    /** Minimum popup width in px. */
    minWidth?: number;
    /** Open state (bindable). */
    open?: boolean;
    /** Runs when the menu opens (refresh what it lists). */
    onOpen?: () => void;
    /** Extra classes on the root. */
    class?: string;
  }

  let {
    label,
    items = [],
    children,
    trigger,
    triggerClass = '',
    testId,
    align = 'start',
    size = 'md',
    minWidth = 180,
    open = $bindable(false),
    onOpen,
    class: className = ''
  }: Props = $props();

  const getMsgs = getMessages();
  const name = $derived(label ?? getMsgs().menu.moreActions);

  let wrapEl = $state<HTMLElement | null>(null);
  let menuEl = $state<HTMLElement | null>(null);

  const ITEMS = '[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])';
  const hasLeading = $derived(
    items.some((e) => (e.type ?? 'item') === 'item' && ((e as MenuItem).icon || 'checked' in e))
  );

  function triggerEl(): HTMLElement | null {
    return wrapEl?.querySelector<HTMLElement>('[aria-haspopup="menu"]') ?? null;
  }

  function enabledItems(): HTMLElement[] {
    return menuEl ? Array.from(menuEl.querySelectorAll<HTMLElement>(ITEMS)) : [];
  }

  function show(focus: 'first' | 'last' = 'first'): void {
    open = true;
    onOpen?.();
    // The popup renders on the next tick.
    queueMicrotask(() => {
      const all = enabledItems();
      (focus === 'last' ? all.at(-1) : all[0])?.focus();
    });
  }

  function close(returnFocus = true): void {
    if (!open) return;
    open = false;
    if (returnFocus) triggerEl()?.focus();
  }

  function onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) show(event.key === 'ArrowUp' ? 'last' : 'first');
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  let typed = '';
  let typedTimer: ReturnType<typeof setTimeout> | undefined;

  function typeahead(char: string, all: HTMLElement[], index: number): void {
    typed += char.toLowerCase();
    clearTimeout(typedTimer);
    typedTimer = setTimeout(() => (typed = ''), 600);
    const text = (el: HTMLElement) => (el.textContent ?? '').trim().toLowerCase();
    // A repeated single letter cycles; a longer prefix searches from the current item.
    const start = typed.length === 1 ? index + 1 : index;
    for (let i = 0; i < all.length; i++) {
      const el = all[(start + i) % all.length];
      if (text(el).startsWith(typed)) {
        el.focus();
        return;
      }
    }
  }

  function onMenuKeydown(event: KeyboardEvent): void {
    const all = enabledItems();
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
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          if (event.key === ' ' && typed === '') break; // Space activates the item.
          typeahead(event.key, all, index);
        }
    }
  }

  function choose(item: MenuItem): void {
    item.onselect?.();
    if (!item.keepOpen) close();
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

<div class="flowdrop-ui-menu {className}" bind:this={wrapEl}>
  {#if trigger}
    <button
      type="button"
      class="flowdrop-ui-menu__trigger {triggerClass}"
      class:flowdrop-ui-menu__trigger--open={open}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={name}
      title={name}
      data-testid={testId}
      onclick={() => (open ? close(false) : show())}
      onkeydown={onTriggerKeydown}
    >
      {@render trigger({ open })}
    </button>
  {:else}
    <IconButton
      {size}
      ariaLabel={name}
      title={name}
      active={open ? true : undefined}
      aria-haspopup="menu"
      aria-expanded={open}
      data-testid={testId}
      onclick={() => (open ? close(false) : show())}
      onkeydown={onTriggerKeydown}
    >
      <Icon icon="mdi:dots-horizontal" aria-hidden="true" />
    </IconButton>
  {/if}

  {#if open}
    <!-- Key handling is delegated from the focused menu items. -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
      class="flowdrop-ui-menu__popup flowdrop-ui-menu__popup--{align}"
      style:min-width="{minWidth}px"
      role="menu"
      aria-label={name}
      bind:this={menuEl}
      onkeydown={onMenuKeydown}
    >
      {#each items as entry, i (i)}
        {#if entry.type === 'separator'}
          <div class="flowdrop-ui-menu__separator" role="separator"></div>
        {:else if entry.type === 'group'}
          <div class="flowdrop-ui-menu__group" role="presentation">{entry.label}</div>
        {:else}
          <button
            type="button"
            role={entry.radio
              ? 'menuitemradio'
              : entry.checked !== undefined
                ? 'menuitemcheckbox'
                : 'menuitem'}
            aria-checked={entry.checked === undefined ? undefined : entry.checked}
            class="flowdrop-ui-menu__item"
            disabled={entry.disabled}
            data-testid={entry.testId}
            onclick={() => choose(entry)}
          >
            <span class="flowdrop-ui-menu__item-label">
              {#if hasLeading}
                <span class="flowdrop-ui-menu__item-icon" aria-hidden="true">
                  {#if entry.checked}
                    <Icon icon="mdi:check" />
                  {:else if entry.icon}
                    <Icon icon={entry.icon} />
                  {/if}
                </span>
              {/if}
              <span class="flowdrop-ui-menu__item-text">{entry.label}</span>
            </span>
            {#if entry.hint}
              <span class="flowdrop-ui-menu__item-hint">{entry.hint}</span>
            {/if}
          </button>
        {/if}
      {/each}
      {#if children}
        {@render children({ close: () => close() })}
      {/if}
    </div>
  {/if}
</div>

<style>
  .flowdrop-ui-menu {
    position: relative;
    display: inline-flex;
    min-width: 0;
  }

  /* :where() keeps this at zero specificity so `triggerClass` always wins. */
  :where(.flowdrop-ui-menu__trigger) {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .flowdrop-ui-menu__popup {
    position: absolute;
    top: calc(100% + var(--fd-space-xs));
    z-index: 50;
    box-sizing: border-box;
    width: max-content;
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
    font-family: var(--fd-font-sans);
  }

  .flowdrop-ui-menu__popup--start {
    left: 0;
  }

  .flowdrop-ui-menu__popup--end {
    right: 0;
  }

  .flowdrop-ui-menu__item {
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

  .flowdrop-ui-menu__item:hover:not(:disabled),
  .flowdrop-ui-menu__item:focus-visible {
    background-color: var(--fd-muted);
    outline: none;
  }

  .flowdrop-ui-menu__item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .flowdrop-ui-menu__item-label {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    max-width: 100%;
    font-weight: 500;
  }

  .flowdrop-ui-menu__item-icon {
    display: inline-flex;
    flex: none;
    width: 1em;
    height: 1em;
  }

  .flowdrop-ui-menu__item-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flowdrop-ui-menu__item-hint {
    max-width: 100%;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flowdrop-ui-menu__group {
    padding: var(--fd-space-xs) var(--fd-space-sm) var(--fd-space-3xs);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .flowdrop-ui-menu__separator {
    height: 1px;
    margin: var(--fd-space-xs) 0;
    background-color: var(--fd-border-muted);
  }
</style>
