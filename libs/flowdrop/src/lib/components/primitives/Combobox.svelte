<!--
  Combobox — the searchable rendering of `Select`.

  An ARIA 1.2 editable combobox with a listbox popup: the input holds focus the
  whole time and the highlighted option is named by `aria-activedescendant`, so
  the options carry no key handlers. Typing filters (label, description and
  group, every word has to match) and bolds what matched; a status line says
  "n of m"; options with a `group` are listed under their title.

  Keyboard: ArrowDown / ArrowUp open the list and move the highlight (disabled
  options are skipped), Home / End jump to the ends, Enter chooses the
  highlighted option, Escape closes and drops the query (the event stops there,
  the editor clears the selection on Escape), Tab closes without choosing.
  A click outside closes it.

  Closed, the field shows the chosen option's label; open, it is the search box
  and the label moves to the placeholder. The popup is positioned under the
  field and as wide as it; it is not portalled, so a host that clips overflow
  clips it (the same as `Menu`).

  Use it through `Select` (which picks this rendering for long, grouped or
  described lists); mount it directly only to force it.

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import { getMessages } from '../../messages/context.js';
  import {
    displayOrder,
    filterOptions,
    groupOptions,
    moveHighlight,
    type FilteredOption,
    type SelectOption
  } from '../../utils/selectOptions.js';

  interface Props {
    options: SelectOption[];
    /** The chosen option's value; '' (or any unknown value) is "nothing chosen". */
    value?: string;
    onValueChange?: (value: string) => void;
    id?: string;
    name?: string;
    disabled?: boolean;
    invalid?: boolean;
    size?: 'sm' | 'md' | 'lg';
    /** Shown when nothing is chosen. */
    placeholder?: string;
    class?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-required'?: boolean | 'true' | 'false';
  }

  let {
    options,
    value = '',
    onValueChange,
    id,
    name,
    disabled = false,
    invalid = false,
    size = 'md',
    placeholder = '',
    class: className = '',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    'aria-required': ariaRequired
  }: Props = $props();

  const getMsgs = getMessages();
  const msgs = $derived(getMsgs().select);
  const uid = $props.id();
  const listId = `${uid}-list`;

  let open = $state(false);
  let query = $state('');
  let highlighted = $state(-1);
  let rootEl = $state<HTMLElement | null>(null);
  let listEl = $state<HTMLElement | null>(null);

  const chosen = $derived(options.find((o) => o.value === value));
  const filtered = $derived(filterOptions(options, query));
  const groups = $derived(groupOptions(filtered));
  const ordered = $derived(displayOrder(groups));
  const activeId = $derived(
    open && highlighted >= 0 && ordered[highlighted]
      ? optionId(ordered[highlighted].option)
      : undefined
  );

  function optionId(option: SelectOption): string {
    return `${uid}-opt-${options.indexOf(option)}`;
  }

  function openList(): void {
    if (open || disabled) return;
    open = true;
    query = '';
    const at = ordered.findIndex((item) => item.option.value === value);
    highlighted = at >= 0 ? at : moveHighlight(ordered, -1, 'Home');
  }

  function closeList(): void {
    open = false;
    query = '';
    highlighted = -1;
  }

  function choose(item: FilteredOption | undefined): void {
    if (!item || item.option.disabled) return;
    closeList();
    if (item.option.value !== value) onValueChange?.(item.option.value);
  }

  function onInput(event: Event): void {
    if (!open) open = true;
    query = (event.currentTarget as HTMLInputElement).value;
    highlighted = moveHighlight(ordered, -1, 'Home');
  }

  function onKeydown(event: KeyboardEvent): void {
    const { key } = event;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      highlighted = moveHighlight(ordered, highlighted, key);
    } else if ((key === 'Home' || key === 'End') && open) {
      event.preventDefault();
      highlighted = moveHighlight(ordered, highlighted, key);
    } else if (key === 'Enter' && open) {
      event.preventDefault();
      choose(ordered[highlighted]);
    } else if (key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      closeList();
    } else if (key === 'Tab') {
      closeList();
    }
  }

  function onFocusout(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !rootEl?.contains(next)) closeList();
  }

  // Keep the highlighted option in view as the arrow keys walk a long list.
  $effect(() => {
    if (!activeId || !listEl) return;
    listEl.querySelector<HTMLElement>(`#${CSS.escape(activeId)}`)?.scrollIntoView?.({
      block: 'nearest'
    });
  });

  const inputClass = $derived(
    [
      'flowdrop-input',
      'flowdrop-input--select',
      size === 'md' ? '' : `flowdrop-input--${size}`,
      invalid ? 'flowdrop-input--invalid' : '',
      'fd-combobox__input',
      open ? 'fd-combobox__input--open' : '',
      className
    ]
      .filter(Boolean)
      .join(' ')
  );
</script>

<div class="fd-combobox flowdrop-select-wrap" bind:this={rootEl} onfocusout={onFocusout}>
  <input
    {id}
    class={inputClass}
    type="text"
    role="combobox"
    autocomplete="off"
    spellcheck="false"
    aria-expanded={open}
    aria-controls={listId}
    aria-haspopup="listbox"
    aria-autocomplete="list"
    aria-activedescendant={activeId}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledby}
    aria-describedby={ariaDescribedby}
    aria-required={ariaRequired}
    aria-invalid={invalid || undefined}
    {disabled}
    placeholder={open ? (chosen?.label ?? msgs.searchPlaceholder) : placeholder}
    value={open ? query : (chosen?.label ?? '')}
    oninput={onInput}
    onkeydown={onKeydown}
    onclick={() => (open ? closeList() : openList())}
  />
  {#if name}
    <input type="hidden" {name} {value} />
  {/if}
  {#if open}
    <span class="fd-combobox__lead" aria-hidden="true">
      <Icon icon="heroicons:magnifying-glass" />
    </span>
  {/if}
  <span class="flowdrop-select-wrap__icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
      />
    </svg>
  </span>

  {#if open}
    <!-- Options are not focusable: the input keeps focus and names the active one.
         Keeping the mouse from taking focus off the input is what makes that work. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fd-combobox__popup" onmousedown={(e) => e.preventDefault()}>
      <div class="fd-combobox__status" role="status">
        {msgs.count({ shown: ordered.length, total: options.length })}
      </div>
      <div
        id={listId}
        class="fd-combobox__list"
        role="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : ariaLabelledby}
        bind:this={listEl}
      >
        {#each groups as group, g (g)}
          {#snippet rows()}
            {#each group.items as item (item.option.value)}
              {@const index = ordered.indexOf(item)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <div
                id={optionId(item.option)}
                class="fd-combobox__option"
                class:fd-combobox__option--active={index === highlighted}
                class:fd-combobox__option--chosen={item.option.value === value}
                role="option"
                tabindex="-1"
                aria-selected={item.option.value === value}
                aria-disabled={item.option.disabled || undefined}
                onclick={() => choose(item)}
                onmousemove={() => {
                  if (!item.option.disabled) highlighted = index;
                }}
              >
                <span class="fd-combobox__check" aria-hidden="true">
                  <Icon icon="heroicons:check" />
                </span>
                <span class="fd-combobox__body">
                  <span class="fd-combobox__label">
                    {#each item.label as part, p (p)}{#if part.match}<mark>{part.text}</mark
                        >{:else}{part.text}{/if}{/each}
                  </span>
                  {#if item.description}
                    <span class="fd-combobox__desc">
                      {#each item.description as part, p (p)}{#if part.match}<mark>{part.text}</mark
                          >{:else}{part.text}{/if}{/each}
                    </span>
                  {/if}
                </span>
              </div>
            {/each}
          {/snippet}
          {#if group.title}
            <div class="fd-combobox__group" role="group" aria-label={group.title}>
              <span class="fd-combobox__group-title" aria-hidden="true">{group.title}</span>
              {@render rows()}
            </div>
          {:else}
            {@render rows()}
          {/if}
        {/each}
      </div>
      {#if ordered.length === 0}
        <p class="fd-combobox__empty">{msgs.noMatches}</p>
      {/if}
      <div class="fd-combobox__hints" aria-hidden="true">
        <span><kbd>↑↓</kbd> {msgs.hintMove}</span>
        <span><kbd>Enter</kbd> {msgs.hintChoose}</span>
        <span><kbd>Esc</kbd> {msgs.hintClose}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .fd-combobox {
    position: relative;
  }

  .fd-combobox__input--open {
    padding-left: 2rem;
    border-color: var(--fd-primary);
    box-shadow: 0 0 0 var(--fd-ring-width) var(--fd-primary-muted);
  }

  /* Open, the field is a search box: the chosen label is the placeholder, so keep it legible. */
  .fd-combobox__input--open::placeholder {
    color: var(--fd-foreground);
    opacity: 0.7;
  }

  .fd-combobox__lead {
    position: absolute;
    left: 0.625rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    pointer-events: none;
    color: var(--fd-muted-foreground);
  }

  .fd-combobox__popup {
    position: absolute;
    top: calc(100% + var(--fd-space-3xs));
    left: 0;
    right: 0;
    z-index: 50;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-menu-radius);
    box-shadow: var(--fd-menu-shadow);
    font-family: var(--fd-font-sans);
    overflow: hidden;
  }

  .fd-combobox__status {
    padding: var(--fd-space-xs) var(--fd-space-sm) var(--fd-space-2xs);
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
  }

  .fd-combobox__list {
    max-height: 16rem;
    overflow-y: auto;
    padding: var(--fd-space-2xs);
    scrollbar-width: thin;
    scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
  }

  .fd-combobox__empty {
    margin: 0;
    padding: var(--fd-space-md) var(--fd-space-sm);
    font-size: var(--fd-text-xs);
    text-align: center;
    color: var(--fd-muted-foreground);
  }

  .fd-combobox__group-title {
    display: block;
    padding: var(--fd-space-xs) var(--fd-space-sm) var(--fd-space-3xs);
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
  }

  .fd-combobox__option {
    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs) var(--fd-space-sm);
    border-radius: var(--fd-menu-item-radius);
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    cursor: pointer;
  }

  .fd-combobox__option--active {
    background-color: var(--fd-muted);
  }

  /* Chosen is the check (and a touch of weight) only; the background is the highlight's. */
  .fd-combobox__option--chosen .fd-combobox__label {
    font-weight: 500;
  }

  .fd-combobox__option[aria-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .fd-combobox__check {
    flex: none;
    display: inline-flex;
    width: 1rem;
    margin-top: 0.125rem;
    color: var(--fd-primary);
    visibility: hidden;
  }

  .fd-combobox__option--chosen .fd-combobox__check {
    visibility: visible;
  }

  .fd-combobox__body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .fd-combobox__desc {
    font-size: var(--fd-text-2xs);
    line-height: 1.45;
    color: var(--fd-muted-foreground);
  }

  /* Muted text on the highlight tone is too faint in some palettes. */
  .fd-combobox__option--active .fd-combobox__desc {
    color: var(--fd-foreground);
  }

  .fd-combobox__option mark {
    background: transparent;
    color: inherit;
    font-weight: 700;
  }

  .fd-combobox__hints {
    display: flex;
    gap: var(--fd-space-md);
    padding: var(--fd-space-xs) var(--fd-space-sm);
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
  }

  .fd-combobox__hints kbd {
    font: inherit;
    font-weight: 600;
    color: var(--fd-foreground);
  }
</style>
