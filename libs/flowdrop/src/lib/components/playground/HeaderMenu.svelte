<!--
  HeaderMenu

  A button that opens a menu: the one control behind both the history chip and
  the ⋯ menu of the docked Playground's header. A thin skin over the `Menu`
  primitive, which owns keyboard handling (arrows, Home/End, typeahead, Escape,
  Tab), ARIA and positioning.

  Items are any element with `role="menuitem"`, `menuitemcheckbox` or
  `menuitemradio` inside `children`, which receives `close` so an item can
  close the menu after it acts.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Menu from '../primitives/Menu.svelte';

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
</script>

<Menu
  class="header-menu"
  {label}
  {testId}
  {align}
  {onOpen}
  {trigger}
  {children}
  minWidth={220}
  triggerClass="header-menu__button header-menu__button--{variant}"
/>

<style>
  :global(.header-menu__button) {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    line-height: 1;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  /* The session chip is a label with a chevron, not a box: a fill appears on hover. */
  :global(.header-menu__button--chip) {
    height: var(--fd-control-md);
    padding: 0 var(--fd-space-xs);
    border-radius: var(--fd-control-radius);
    font-weight: 600;
    max-width: 100%;
  }

  :global(.header-menu__button--icon) {
    justify-content: center;
    width: var(--fd-size-icon-btn);
    height: var(--fd-size-icon-btn);
    padding: 0;
    border-radius: var(--fd-control-radius);
    color: var(--fd-muted-foreground);
  }

  :global(.header-menu__button:hover),
  :global(.header-menu__button.flowdrop-ui-menu__trigger--open) {
    background-color: var(--fd-muted);
  }

  :global(.header-menu__button:focus-visible) {
    outline: 2px solid var(--fd-primary);
    outline-offset: 1px;
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
</style>
