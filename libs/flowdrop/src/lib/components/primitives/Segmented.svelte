<!--
  Segmented primitive — a single-choice switch (e.g. Edit | Test).

  role="radiogroup" with role="radio" items and a roving tabindex: Tab enters on
  the selected option, Left/Right (Up/Down) move and select, Home/End jump.

  @internal Not exported from any package entry; not public API yet.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';

  interface SegmentedOption {
    /** Value written to `value` when chosen */
    value: string;
    /** Visible label */
    label: string;
    /** Optional Iconify icon name, e.g. `mdi:pencil` */
    icon?: string;
    /** Tooltip text */
    title?: string;
  }

  interface Props {
    /** Options, in order */
    options: SegmentedOption[];
    /** Selected option value (bindable) */
    value?: string;
    /** Called with the new value after the user changes the selection */
    onchange?: (value: string) => void;
    /** Height: `sm` = 24, `md` = 28 */
    size?: 'sm' | 'md';
    /** Accessible name of the group */
    ariaLabel: string;
    /** Extra classes appended to the root */
    class?: string;
  }

  let {
    options,
    value = $bindable(),
    onchange,
    size = 'md',
    ariaLabel,
    class: className = ''
  }: Props = $props();

  let buttons: HTMLButtonElement[] = $state([]);

  // The tab stop: the selected option, or the first when nothing is selected.
  const tabStop = $derived(
    options.some((o) => o.value === value) ? value : (options[0]?.value ?? undefined)
  );

  function select(index: number, focus: boolean): void {
    const next = options[index];
    if (!next) return;
    if (next.value !== value) {
      value = next.value;
      onchange?.(next.value);
    }
    if (focus) buttons[index]?.focus();
  }

  function onkeydown(event: KeyboardEvent, index: number): void {
    const last = options.length - 1;
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
  class="flowdrop-ui-segmented flowdrop-ui-segmented--{size} {className}"
  role="radiogroup"
  aria-label={ariaLabel}
>
  {#each options as option, index (option.value)}
    <button
      bind:this={buttons[index]}
      type="button"
      role="radio"
      class="flowdrop-ui-segmented__item"
      class:flowdrop-ui-segmented__item--selected={option.value === value}
      aria-checked={option.value === value}
      tabindex={option.value === tabStop ? 0 : -1}
      title={option.title}
      onclick={() => select(index, false)}
      onkeydown={(e) => onkeydown(e, index)}
    >
      {#if option.icon}
        <Icon icon={option.icon} aria-hidden="true" />
      {/if}
      <span>{option.label}</span>
    </button>
  {/each}
</div>

<style>
  .flowdrop-ui-segmented {
    display: inline-flex;
    align-items: stretch;
    box-sizing: border-box;
    padding: var(--fd-space-3xs);
    gap: var(--fd-space-3xs);
    background-color: var(--fd-muted);
    border: 1px solid var(--fd-border-muted);
    border-radius: var(--fd-control-radius);
  }

  .flowdrop-ui-segmented__item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-2xs);
    border: 0;
    border-radius: var(--fd-radius-md);
    background: transparent;
    color: var(--fd-muted-foreground);
    font-family: inherit;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--fd-transition-fast),
      color var(--fd-transition-fast);
  }

  .flowdrop-ui-segmented--md .flowdrop-ui-segmented__item {
    /* Control height minus the container padding and border */
    height: calc(var(--fd-control-md) - var(--fd-space-2xs) - 2px);
    padding: 0 var(--fd-space-md);
    font-size: var(--fd-text-sm);
  }

  .flowdrop-ui-segmented--sm .flowdrop-ui-segmented__item {
    height: calc(var(--fd-control-sm) - var(--fd-space-2xs) - 2px);
    padding: 0 var(--fd-space-xs);
    font-size: var(--fd-text-xs);
  }

  .flowdrop-ui-segmented__item:hover:not(.flowdrop-ui-segmented__item--selected) {
    color: var(--fd-foreground);
  }

  .flowdrop-ui-segmented__item--selected {
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    box-shadow: var(--fd-shadow-sm);
  }
</style>
