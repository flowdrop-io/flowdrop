<!--
  PortPickerListbox — a searchable, grouped listbox of ports.

  The shared body of the port pickers: the workflow interface's
  `BindablePortListbox` and the "Connect to…" popover. The caller supplies the
  groups and what each row says; this owns the search query, the highlight and
  the keyboard handling (arrows, Home/End, Enter to confirm, Escape to cancel,
  as a roving `aria-activedescendant`, so the options carry no key handlers).

  Each row wears the same two chips a port row wears on the canvas — the shape
  symbol in the lane's colour and the outlined lane-name chip — so a candidate
  is recognisable as the port it points at, and the fixed-width symbol keeps
  the rows aligned whatever the type name's length.

  What a confirmed pick means belongs to the caller.
-->

<script lang="ts" module>
  import type { NodePort } from '$lib/types/index.js';

  /** A chip on a row. */
  export interface PortPickerBadge {
    label: string;
    tone: 'primary' | 'warning' | 'secondary' | 'outline';
  }

  /** One pickable port. */
  export interface PortPickerOption<T = unknown> {
    /** Unique across the whole list. */
    key: string;
    nodeId: string;
    nodeLabel: string;
    port: NodePort;
    badges?: PortPickerBadge[];
    /** Drawn quieter; still pickable. */
    dimmed?: boolean;
    /** The row the caller is already on; kept at full strength. */
    current?: boolean;
    /** What the caller wants back on confirm. */
    value: T;
  }

  /** A titled run of options. */
  export interface PortPickerGroup<T = unknown> {
    title: string;
    options: PortPickerOption<T>[];
  }
</script>

<script lang="ts" generics="T">
  import Icon from '@iconify/svelte';
  import Input from '$lib/components/Input.svelte';
  import PortShapeSymbol from '$lib/components/ports/PortShapeSymbol.svelte';
  import PortLaneChip from '$lib/components/ports/PortLaneChip.svelte';
  import type { PortCompatibilityChecker } from '$lib/utils/connections.js';
  import { focusOnMount } from '$lib/utils/focus.js';

  interface Props {
    /** The rows, in display order; empty groups are not drawn. */
    groups: PortPickerGroup<T>[];
    /** The instance's checker — source of each row's shape symbol and lane colour. */
    checker: PortCompatibilityChecker;
    /** Unique per listbox on the page; option ids are derived from it. */
    idPrefix: string;
    searchLabel: string;
    searchPlaceholder: string;
    /** aria-label of the listbox. */
    listLabel: string;
    /** Shown when there are no options at all. */
    emptyText: string;
    /** Shown when the search leaves nothing. */
    noMatchesText: string;
    /** A single click confirms (select-like) instead of only highlighting. */
    confirmOnClick?: boolean;
    /** Take keyboard focus when rendered — the list is a modal moment. */
    autofocus?: boolean;
    onHighlight?: (option: PortPickerOption<T> | undefined) => void;
    onConfirm: (option: PortPickerOption<T>) => void;
    onCancel?: () => void;
  }

  const {
    groups,
    checker,
    idPrefix,
    searchLabel,
    searchPlaceholder,
    listLabel,
    emptyText,
    noMatchesText,
    confirmOnClick = false,
    autofocus = false,
    onHighlight,
    onConfirm,
    onCancel
  }: Props = $props();

  let query = $state('');
  let highlightedKey = $state<string | null>(null);

  const total = $derived(groups.reduce((sum, group) => sum + group.options.length, 0));

  const filteredGroups = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups.filter((group) => group.options.length > 0);
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) =>
          [
            option.nodeLabel,
            option.port.name,
            option.port.id,
            option.port.dataType,
            option.port.description ?? ''
          ].some((text) => text.toLowerCase().includes(q))
        )
      }))
      .filter((group) => group.options.length > 0);
  });

  /** Every visible option, in display order (what the arrow keys walk). */
  const filtered = $derived(filteredGroups.flatMap((group) => group.options));

  const highlighted = $derived(
    highlightedKey === null
      ? undefined
      : groups.flatMap((g) => g.options).find((o) => o.key === highlightedKey)
  );

  function highlight(option: PortPickerOption<T> | undefined): void {
    highlightedKey = option ? option.key : null;
    onHighlight?.(option);
  }

  /**
   * A DOM id for an option. Node and port ids can hold any character, so each
   * one outside `[A-Za-z0-9-]` — the underscore included — is written as `_`
   * plus its hex code point. Reversible, so `a.b` and `a_b` cannot collide.
   */
  function optionId(option: PortPickerOption<T>): string {
    const raw = `${option.nodeId}-${option.port.id}`;
    const safe = raw.replace(/[^A-Za-z0-9-]/g, (c) => `_${c.codePointAt(0)!.toString(16)}`);
    return `${idPrefix}-${safe}`;
  }

  function pick(option: PortPickerOption<T>): void {
    highlight(option);
    if (confirmOnClick) onConfirm(option);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel?.();
      return;
    }
    if (filtered.length === 0) return;
    const index = highlighted ? filtered.findIndex((o) => o.key === highlighted.key) : -1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlight(filtered[Math.min(index + 1, filtered.length - 1)]);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlight(filtered[Math.max(index - 1, 0)]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      highlight(filtered[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      highlight(filtered[filtered.length - 1]);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlighted) onConfirm(highlighted);
    }
  }
</script>

<div class="wf-portlist">
  {#if total > 0}
    <Input
      size="sm"
      type="search"
      value={query}
      placeholder={searchPlaceholder}
      aria-label={searchLabel}
      oninput={(e) => (query = e.currentTarget.value)}
    >
      {#snippet leading()}
        <Icon icon="heroicons:magnifying-glass" />
      {/snippet}
    </Input>
  {/if}

  <div
    class="wf-portlist__list"
    role="listbox"
    tabindex="0"
    {@attach focusOnMount(autofocus)}
    aria-label={listLabel}
    aria-activedescendant={highlighted ? optionId(highlighted) : undefined}
    onkeydown={handleKeydown}
  >
    {#if total === 0}
      <p class="wf-portlist__empty">{emptyText}</p>
    {:else if filtered.length === 0}
      <p class="wf-portlist__empty">{noMatchesText}</p>
    {:else}
      {#snippet row(option: PortPickerOption<T>)}
        {@const isHighlighted = highlighted !== undefined && highlighted.key === option.key}
        <!-- Keyboard handling lives on the listbox (roving aria-activedescendant),
             so the option itself needs no key handler. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          id={optionId(option)}
          class="wf-portlist__option"
          class:wf-portlist__option--highlighted={isHighlighted}
          class:wf-portlist__option--current={option.current}
          class:wf-portlist__option--taken={option.dimmed}
          role="option"
          tabindex="-1"
          aria-selected={isHighlighted}
          onclick={() => pick(option)}
          ondblclick={() => onConfirm(option)}
        >
          <PortShapeSymbol {checker} port={option.port} />
          <span class="wf-portlist__option-body">
            <span class="wf-portlist__option-path">
              <span class="wf-portlist__option-node">{option.nodeLabel}</span>
              <Icon icon="heroicons:chevron-right" />
              <span class="wf-portlist__option-port">{option.port.name}</span>
              <PortLaneChip {checker} port={option.port} />
            </span>
            {#if option.port.description}
              <span class="wf-portlist__option-desc">{option.port.description}</span>
            {/if}
            {#if option.badges && option.badges.length > 0}
              <span class="wf-portlist__option-flags">
                {#each option.badges as badge (badge.label)}
                  <span class="flowdrop-badge flowdrop-badge--sm flowdrop-badge--{badge.tone}">
                    {badge.label}
                  </span>
                {/each}
              </span>
            {/if}
          </span>
          <span class="wf-portlist__option-check" aria-hidden="true">
            <Icon icon="heroicons:check" />
          </span>
        </div>
      {/snippet}

      {#each filteredGroups as group (group.title)}
        <div class="wf-portlist__group" role="presentation">
          <span class="wf-portlist__group-title">{group.title}</span>
          {#each group.options as option (option.key)}
            {@render row(option)}
          {/each}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .wf-portlist {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .wf-portlist__list {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    max-height: 18rem;
    overflow-y: auto;
    padding: var(--fd-space-2xs);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-card);
    scrollbar-width: thin;
    scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
  }

  .wf-portlist__list:focus-visible {
    outline: none;
    border-color: var(--fd-primary);
    box-shadow: 0 0 0 var(--fd-ring-width) var(--fd-primary-muted);
  }

  .wf-portlist__empty {
    margin: 0;
    padding: var(--fd-space-md) var(--fd-space-sm);
    font-size: var(--fd-text-xs);
    line-height: 1.5;
    text-align: center;
    color: var(--fd-muted-foreground);
  }

  .wf-portlist__group {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .wf-portlist__group-title {
    padding: var(--fd-space-2xs) var(--fd-space-xs);
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
  }

  .wf-portlist__option {
    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs);
    border: 1px solid transparent;
    border-radius: var(--fd-radius-md);
    cursor: pointer;
    transition:
      background-color var(--fd-transition-fast),
      border-color var(--fd-transition-fast);
  }

  .wf-portlist__option:hover {
    background-color: var(--fd-muted);
  }

  .wf-portlist__option--highlighted,
  .wf-portlist__option--highlighted:hover {
    border-color: var(--fd-primary);
    background-color: var(--fd-primary-muted);
  }

  .wf-portlist__option--taken .wf-portlist__option-node,
  .wf-portlist__option--taken .wf-portlist__option-port {
    color: var(--fd-muted-foreground);
  }

  .wf-portlist__option--taken :global(.flowdrop-port-symbol),
  .wf-portlist__option--taken :global(.flowdrop-badge--outline) {
    opacity: 0.7;
  }

  /* The entry's own port is "taken" by itself; do not grey it out. */
  .wf-portlist__option--current .wf-portlist__option-node,
  .wf-portlist__option--current .wf-portlist__option-port {
    color: var(--fd-foreground);
  }

  .wf-portlist__option--current :global(.flowdrop-port-symbol),
  .wf-portlist__option--current :global(.flowdrop-badge--outline) {
    opacity: 1;
  }

  /* The lane chip is quiet on purpose; keep it from stretching a wrapped path. */
  .wf-portlist__option-path :global(.flowdrop-badge--outline) {
    flex: none;
  }

  .wf-portlist__option-body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
    min-width: 0;
  }

  .wf-portlist__option-path {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.125rem;
    font-size: var(--fd-text-xs);
    line-height: 1.4;
  }

  .wf-portlist__option-path :global(svg) {
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  .wf-portlist__option-node {
    color: var(--fd-muted-foreground);
  }

  .wf-portlist__option-port {
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .wf-portlist__option-desc {
    font-size: var(--fd-text-2xs);
    line-height: 1.45;
    color: var(--fd-muted-foreground);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .wf-portlist__option-flags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-2xs);
    margin-top: 0.125rem;
  }

  .wf-portlist__option-flags :global(.flowdrop-badge) {
    font-size: var(--fd-text-2xs);
    line-height: 1.2;
  }

  .wf-portlist__option-check {
    flex-shrink: 0;
    display: inline-flex;
    width: 1rem;
    margin-top: 0.125rem;
    color: var(--fd-primary);
    opacity: 0;
    transition: opacity var(--fd-transition-fast);
  }

  .wf-portlist__option--highlighted .wf-portlist__option-check {
    opacity: 1;
  }
</style>
