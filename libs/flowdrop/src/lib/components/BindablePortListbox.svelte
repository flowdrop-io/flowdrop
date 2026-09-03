<!--
  BindablePortListbox — the one place a workflow interface entry picks a port.

  A searchable, grouped listbox over `rankBindablePorts()`: ports nothing is
  using yet first, then the connected or already-published ones. Each row
  wears the same two chips a port row wears on the canvas — the shape symbol
  in the lane's colour and the outlined lane-name chip — so a candidate is
  recognisable as the port it points at, and the fixed-width symbol keeps the
  rows aligned whatever the type name's length.

  Shared by the "Add input / Add output" composer (highlight, then a separate
  Add button confirms) and by an existing entry's "Bound port" control (a
  click confirms, like a select). The two differ only in `confirmOnClick`;
  keyboard handling — arrows, Home/End, Enter to confirm, Escape to cancel —
  lives on the listbox as a roving `aria-activedescendant`, so the options
  themselves carry no key handlers.

  Owns only the search query and the highlight. What a confirmed pick means
  belongs to the caller.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Input from '$lib/components/Input.svelte';
  import PortShapeSymbol from '$lib/components/ports/PortShapeSymbol.svelte';
  import PortLaneChip from '$lib/components/ports/PortLaneChip.svelte';
  import { m } from '$lib/messages/index.js';
  import type { PortCompatibilityChecker } from '$lib/utils/connections.js';
  import {
    bindablePortKey,
    isFreeBindablePort,
    type RankedBindablePort
  } from '$lib/utils/workflowInterface.js';

  interface Props {
    direction: 'inputs' | 'outputs';
    /** From `rankBindablePorts` — already ordered free-first. */
    candidates: RankedBindablePort[];
    /** The instance's checker — source of each row's shape symbol and lane colour. */
    checker: PortCompatibilityChecker;
    /** Unique per listbox on the page; option ids are derived from it. */
    idPrefix: string;
    /** The port the caller is already bound to, marked as such in the list. */
    currentKey?: string;
    /** A single click confirms (select-like) instead of only highlighting. */
    confirmOnClick?: boolean;
    /** Take keyboard focus when rendered — the list is a modal moment. */
    autofocus?: boolean;
    onHighlight?: (candidate: RankedBindablePort | undefined) => void;
    onConfirm: (candidate: RankedBindablePort) => void;
    onCancel?: () => void;
  }

  const {
    direction,
    candidates,
    checker,
    idPrefix,
    currentKey,
    confirmOnClick = false,
    autofocus = false,
    onHighlight,
    onConfirm,
    onCancel
  }: Props = $props();

  const isInput = $derived(direction === 'inputs');

  let query = $state('');
  let highlightedKey = $state<string | null>(null);
  let listbox = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (autofocus) listbox?.focus();
  });

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((candidate) =>
      [
        candidate.nodeLabel,
        candidate.port.name,
        candidate.port.id,
        candidate.port.dataType,
        candidate.port.description ?? ''
      ].some((text) => text.toLowerCase().includes(q))
    );
  });

  const free = $derived(filtered.filter(isFreeBindablePort));
  const taken = $derived(filtered.filter((candidate) => !isFreeBindablePort(candidate)));

  const highlighted = $derived(
    highlightedKey === null
      ? undefined
      : candidates.find((candidate) => bindablePortKey(candidate) === highlightedKey)
  );

  function highlight(candidate: RankedBindablePort | undefined): void {
    highlightedKey = candidate ? bindablePortKey(candidate) : null;
    onHighlight?.(candidate);
  }

  function optionId(candidate: RankedBindablePort): string {
    return `${idPrefix}-${candidate.nodeId}-${candidate.port.id}`.replace(/[^A-Za-z0-9_-]/g, '_');
  }

  function pick(candidate: RankedBindablePort): void {
    highlight(candidate);
    if (confirmOnClick) onConfirm(candidate);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel?.();
      return;
    }
    if (filtered.length === 0) return;
    const index = highlighted
      ? filtered.findIndex((c) => bindablePortKey(c) === bindablePortKey(highlighted))
      : -1;
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
  {#if candidates.length > 0}
    <Input
      size="sm"
      type="search"
      value={query}
      placeholder={m().workflowInterface.composerSearchPlaceholder}
      aria-label={m().workflowInterface.composerSearchLabel}
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
    bind:this={listbox}
    aria-label={isInput
      ? m().workflowInterface.composerListLabelInput
      : m().workflowInterface.composerListLabelOutput}
    aria-activedescendant={highlighted ? optionId(highlighted) : undefined}
    onkeydown={handleKeydown}
  >
    {#if candidates.length === 0}
      <p class="wf-portlist__empty">{m().workflowInterface.composerNoPorts}</p>
    {:else if filtered.length === 0}
      <p class="wf-portlist__empty">{m().workflowInterface.composerNoMatches}</p>
    {:else}
      {#snippet option(candidate: RankedBindablePort)}
        {@const key = bindablePortKey(candidate)}
        {@const isHighlighted = highlighted !== undefined && bindablePortKey(highlighted) === key}
        {@const isCurrent = currentKey !== undefined && currentKey === key}
        <!-- Keyboard handling lives on the listbox (roving aria-activedescendant),
             so the option itself needs no key handler. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          id={optionId(candidate)}
          class="wf-portlist__option"
          class:wf-portlist__option--highlighted={isHighlighted}
          class:wf-portlist__option--current={isCurrent}
          class:wf-portlist__option--taken={!isFreeBindablePort(candidate)}
          role="option"
          tabindex="-1"
          aria-selected={isHighlighted}
          onclick={() => pick(candidate)}
          ondblclick={() => onConfirm(candidate)}
        >
          <PortShapeSymbol {checker} port={candidate.port} />
          <span class="wf-portlist__option-body">
            <span class="wf-portlist__option-path">
              <span class="wf-portlist__option-node">{candidate.nodeLabel}</span>
              <Icon icon="heroicons:chevron-right" />
              <span class="wf-portlist__option-port">{candidate.port.name}</span>
              <PortLaneChip {checker} port={candidate.port} />
            </span>
            {#if candidate.port.description}
              <span class="wf-portlist__option-desc">{candidate.port.description}</span>
            {/if}
            {#if isCurrent || candidate.connected || candidate.publishedAs !== undefined || candidate.port.required}
              <span class="wf-portlist__option-flags">
                {#if isCurrent}
                  <span class="flowdrop-badge flowdrop-badge--sm flowdrop-badge--primary">
                    {m().workflowInterface.bindingCurrent}
                  </span>
                {/if}
                {#if candidate.connected}
                  <span class="flowdrop-badge flowdrop-badge--sm flowdrop-badge--warning">
                    {m().workflowInterface.composerConnected}
                  </span>
                {/if}
                {#if candidate.publishedAs !== undefined}
                  <span class="flowdrop-badge flowdrop-badge--sm flowdrop-badge--secondary">
                    {m().workflowInterface.composerPublishedAs({ id: candidate.publishedAs })}
                  </span>
                {/if}
                {#if candidate.port.required}
                  <span class="flowdrop-badge flowdrop-badge--sm flowdrop-badge--outline">
                    {m().workflowInterface.composerRequired}
                  </span>
                {/if}
              </span>
            {/if}
          </span>
          <span class="wf-portlist__option-check" aria-hidden="true">
            <Icon icon="heroicons:check" />
          </span>
        </div>
      {/snippet}

      {#if free.length > 0}
        <div class="wf-portlist__group" role="presentation">
          <span class="wf-portlist__group-title">{m().workflowInterface.composerGroupFree}</span>
          {#each free as candidate (bindablePortKey(candidate))}
            {@render option(candidate)}
          {/each}
        </div>
      {/if}
      {#if taken.length > 0}
        <div class="wf-portlist__group" role="presentation">
          <span class="wf-portlist__group-title">{m().workflowInterface.composerGroupTaken}</span>
          {#each taken as candidate (bindablePortKey(candidate))}
            {@render option(candidate)}
          {/each}
        </div>
      {/if}
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
    letter-spacing: 0.05em;
    text-transform: uppercase;
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
