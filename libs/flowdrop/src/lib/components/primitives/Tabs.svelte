<!--
  Tabs — underline tabs for switching a VIEW (role="tablist" / "tab") with a
  roving tabindex. A MODE switch (Edit | Test) is a Segmented control instead:
  these are the two selected-tab styles of the editor chrome.

  Tab stop is the selected tab; Left/Right (Up/Down) move focus AND select
  (automatic activation), Home/End jump. The selected tab is
  drawn in ink with a 2px underline; the others are muted, with no fill.

  Panels are the caller's job. Wire them with the exported helpers, using the
  same `idBase` you pass here:

    <Tabs idBase="pg" tabs={tabs} bind:value ariaLabel="Views" />
    <div role="tabpanel" id={tabPanelId('pg', value)}
         aria-labelledby={tabId('pg', value)} tabindex="0">...</div>

  Each tab carries `id={tabId(idBase, value)}` and
  `aria-controls={tabPanelId(idBase, value)}`. Without `idBase` an id is
  generated, which the caller cannot know: pass `idBase` whenever panels exist.

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts" module>
  /** DOM id of the tab for `value`. */
  export function tabId(idBase: string, value: string): string {
    return `${idBase}-tab-${value}`;
  }
  /** DOM id of the panel the tab for `value` controls. */
  export function tabPanelId(idBase: string, value: string): string {
    return `${idBase}-panel-${value}`;
  }
</script>

<script lang="ts">
  import Icon from '@iconify/svelte';

  interface TabItem {
    /** Value written to `value` when chosen */
    value: string;
    /** Visible label */
    label: string;
    /** Optional Iconify icon name */
    icon?: string;
    /** Optional count badge */
    count?: number;
  }

  interface Props {
    tabs: TabItem[];
    /** Selected tab value (bindable) */
    value?: string;
    /** Called with the new value after the user changes the selection */
    onchange?: (value: string) => void;
    /** Height: `sm` = 24, `md` = 28 */
    size?: 'sm' | 'md';
    /** Accessible name of the tablist */
    ariaLabel: string;
    /** Prefix for tab and panel ids (see header). Generated when absent. */
    idBase?: string;
    /** Extra classes on the root */
    class?: string;
  }

  let {
    tabs,
    value = $bindable(),
    onchange,
    size = 'md',
    ariaLabel,
    idBase,
    class: className = ''
  }: Props = $props();

  const generated = $props.id();
  const base = $derived(idBase ?? `flowdrop-tabs-${generated}`);

  let buttons: HTMLButtonElement[] = $state([]);

  const tabStop = $derived(
    tabs.some((t) => t.value === value) ? value : (tabs[0]?.value ?? undefined)
  );

  function select(index: number, focus: boolean): void {
    const next = tabs[index];
    if (!next) return;
    if (next.value !== value) {
      value = next.value;
      onchange?.(next.value);
    }
    if (focus) buttons[index]?.focus();
  }

  function onkeydown(event: KeyboardEvent, index: number): void {
    const last = tabs.length - 1;
    let target: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        target = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        target = index === 0 ? last : index - 1;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = last;
        break;
    }
    if (target === null) return;
    event.preventDefault();
    select(target, true);
  }
</script>

<div
  class="flowdrop-ui-tabs flowdrop-ui-tabs--{size} {className}"
  role="tablist"
  aria-label={ariaLabel}
>
  {#each tabs as tab, index (tab.value)}
    <button
      bind:this={buttons[index]}
      type="button"
      role="tab"
      id={tabId(base, tab.value)}
      class="flowdrop-ui-tabs__tab"
      class:flowdrop-ui-tabs__tab--selected={tab.value === value}
      aria-selected={tab.value === value}
      aria-controls={tabPanelId(base, tab.value)}
      tabindex={tab.value === tabStop ? 0 : -1}
      onclick={() => select(index, false)}
      onkeydown={(e) => onkeydown(e, index)}
    >
      {#if tab.icon}
        <Icon icon={tab.icon} aria-hidden="true" />
      {/if}
      <span>{tab.label}</span>
      {#if tab.count !== undefined}
        <span class="flowdrop-ui-tabs__count">{tab.count}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .flowdrop-ui-tabs {
    display: inline-flex;
    align-items: stretch;
    gap: var(--fd-space-xl);
    font-family: var(--fd-font-sans);
  }

  .flowdrop-ui-tabs__tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-2xs);
    box-sizing: border-box;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--fd-muted-foreground);
    font-family: inherit;
    font-weight: 400;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    /* The underline is an inset shadow, so selecting never shifts the layout. */
    box-shadow: var(--fd-tab-underline-off);
    transition:
      box-shadow var(--fd-transition-fast),
      color var(--fd-transition-fast);
  }

  .flowdrop-ui-tabs--md .flowdrop-ui-tabs__tab {
    height: var(--fd-control-lg);
    font-size: var(--fd-text-body);
  }

  .flowdrop-ui-tabs--sm .flowdrop-ui-tabs__tab {
    height: var(--fd-control-md);
    font-size: var(--fd-text-sm);
  }

  .flowdrop-ui-tabs__tab:hover:not(.flowdrop-ui-tabs__tab--selected) {
    color: var(--fd-foreground);
  }

  .flowdrop-ui-tabs__tab--selected {
    color: var(--fd-foreground);
    font-weight: 500;
    box-shadow: var(--fd-tab-underline);
  }

  .flowdrop-ui-tabs__count {
    padding: 0 var(--fd-space-2xs);
    border-radius: var(--fd-radius-full);
    background-color: var(--fd-border-muted);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-2xs);
    font-variant-numeric: tabular-nums;
    line-height: 1.5;
  }
</style>
