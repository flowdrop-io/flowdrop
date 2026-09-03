<!--
  WorkflowInterfaceEntryComposer

  The inline form that opens from "Add input" / "Add output" in
  `WorkflowInterfaceEditor`. Two steps, deliberately small:

  1. "Bind it to an existing port?" — yes takes the author to a port picker;
     no adds an empty entry straight away (the pre-composer behaviour).
  2. The picker: a custom listbox over `rankBindablePorts`, ports nothing is
     using yet first, then the connected or already-published ones, each row
     carrying the metadata a native <select> cannot show — type, node › port,
     description, and why a port sits in the second group.

  Stateless towards the workflow: it reports the author's choice through
  `onBind` / `onCustom` / `onCancel` and the editor builds the entry.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from '$lib/components/Button.svelte';
  import IconButton from '$lib/components/IconButton.svelte';
  import Input from '$lib/components/Input.svelte';
  import { m } from '$lib/messages/index.js';
  import { isFreeBindablePort, type RankedBindablePort } from '$lib/utils/workflowInterface.js';

  interface Props {
    direction: 'inputs' | 'outputs';
    /** From `rankBindablePorts` — already ordered free-first. */
    candidates: RankedBindablePort[];
    onBind: (candidate: RankedBindablePort) => void;
    onCustom: () => void;
    onCancel: () => void;
  }

  const { direction, candidates, onBind, onCustom, onCancel }: Props = $props();

  const isInput = $derived(direction === 'inputs');

  let mode = $state<'choose' | 'bind'>('choose');
  let query = $state('');
  let selectedKey = $state<string | null>(null);

  let firstChoice = $state<HTMLButtonElement | null>(null);
  let listbox = $state<HTMLDivElement | null>(null);

  // Land keyboard focus on the form as it opens, and on the list as the
  // author steps into it — the composer is a modal moment inside the panel.
  $effect(() => {
    if (mode === 'choose') firstChoice?.focus();
    else listbox?.focus();
  });

  function keyOf(candidate: RankedBindablePort): string {
    return `${candidate.nodeId} ${candidate.port.id}`;
  }

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

  const selected = $derived(
    selectedKey === null
      ? undefined
      : candidates.find((candidate) => keyOf(candidate) === selectedKey)
  );

  function optionId(candidate: RankedBindablePort): string {
    return `wf-composer-option-${direction}-${candidate.nodeId}-${candidate.port.id}`.replace(
      /[^A-Za-z0-9_-]/g,
      '_'
    );
  }

  function confirm(candidate: RankedBindablePort | undefined = selected): void {
    if (candidate) onBind(candidate);
  }

  function handleListKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if (filtered.length === 0) return;
    const index = selected ? filtered.findIndex((c) => keyOf(c) === keyOf(selected)) : -1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedKey = keyOf(filtered[Math.min(index + 1, filtered.length - 1)]);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedKey = keyOf(filtered[Math.max(index - 1, 0)]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectedKey = keyOf(filtered[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectedKey = keyOf(filtered[filtered.length - 1]);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  }

  function handleChoiceKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }
</script>

<div
  class="wf-composer"
  role="group"
  aria-label={isInput
    ? m().workflowInterface.composerTitleInput
    : m().workflowInterface.composerTitleOutput}
>
  <div class="wf-composer__header">
    <div class="wf-composer__heading">
      <span class="wf-composer__icon">
        <Icon icon="heroicons:sparkles" />
      </span>
      <div class="wf-composer__heading-text">
        <span class="wf-composer__title">
          {isInput
            ? m().workflowInterface.composerTitleInput
            : m().workflowInterface.composerTitleOutput}
        </span>
        <span class="wf-composer__step">
          {m().workflowInterface.composerStep({ step: mode === 'choose' ? 1 : 2, total: 2 })}
        </span>
      </div>
    </div>
    <IconButton
      size="sm"
      class="wf-composer__close"
      ariaLabel={m().workflowInterface.composerClose}
      onclick={onCancel}
    >
      <Icon icon="heroicons:x-mark" />
    </IconButton>
  </div>

  {#if mode === 'choose'}
    <p class="wf-composer__question">{m().workflowInterface.composerQuestion}</p>
    <div
      class="wf-composer__choices"
      role="group"
      aria-label={m().workflowInterface.composerQuestion}
    >
      <button
        type="button"
        class="wf-composer__choice"
        bind:this={firstChoice}
        onclick={() => (mode = 'bind')}
        onkeydown={handleChoiceKeydown}
      >
        <span class="wf-composer__choice-icon">
          <Icon icon="heroicons:link" />
        </span>
        <span class="wf-composer__choice-text">
          <span class="wf-composer__choice-title">{m().workflowInterface.composerBindYes}</span>
          <span class="wf-composer__choice-hint">{m().workflowInterface.composerBindYesHint}</span>
        </span>
        <Icon icon="heroicons:chevron-right" class="wf-composer__choice-arrow" />
      </button>
      <button
        type="button"
        class="wf-composer__choice"
        onclick={onCustom}
        onkeydown={handleChoiceKeydown}
      >
        <span class="wf-composer__choice-icon">
          <Icon icon="heroicons:pencil-square" />
        </span>
        <span class="wf-composer__choice-text">
          <span class="wf-composer__choice-title">{m().workflowInterface.composerBindNo}</span>
          <span class="wf-composer__choice-hint">{m().workflowInterface.composerBindNoHint}</span>
        </span>
        <Icon icon="heroicons:plus" class="wf-composer__choice-arrow" />
      </button>
    </div>
  {:else}
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
      class="wf-composer__list"
      role="listbox"
      tabindex="0"
      bind:this={listbox}
      aria-label={isInput
        ? m().workflowInterface.composerListLabelInput
        : m().workflowInterface.composerListLabelOutput}
      aria-activedescendant={selected ? optionId(selected) : undefined}
      onkeydown={handleListKeydown}
    >
      {#if candidates.length === 0}
        <p class="wf-composer__empty">{m().workflowInterface.composerNoPorts}</p>
      {:else if filtered.length === 0}
        <p class="wf-composer__empty">{m().workflowInterface.composerNoMatches}</p>
      {:else}
        {#snippet option(candidate: RankedBindablePort)}
          {@const isSelected = selected !== undefined && keyOf(selected) === keyOf(candidate)}
          <!-- Keyboard handling lives on the listbox (roving aria-activedescendant),
               so the option itself needs no key handler. -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div
            id={optionId(candidate)}
            class="wf-composer__option"
            class:wf-composer__option--selected={isSelected}
            class:wf-composer__option--taken={!isFreeBindablePort(candidate)}
            role="option"
            tabindex="-1"
            aria-selected={isSelected}
            onclick={() => (selectedKey = keyOf(candidate))}
            ondblclick={() => confirm(candidate)}
          >
            <span class="wf-composer__option-type">{candidate.port.dataType}</span>
            <span class="wf-composer__option-body">
              <span class="wf-composer__option-path">
                <span class="wf-composer__option-node">{candidate.nodeLabel}</span>
                <Icon icon="heroicons:chevron-right" />
                <span class="wf-composer__option-port">{candidate.port.name}</span>
              </span>
              {#if candidate.port.description}
                <span class="wf-composer__option-desc">{candidate.port.description}</span>
              {/if}
              {#if candidate.connected || candidate.publishedAs !== undefined || candidate.port.required}
                <span class="wf-composer__option-flags">
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
            <span class="wf-composer__option-check" aria-hidden="true">
              <Icon icon="heroicons:check" />
            </span>
          </div>
        {/snippet}

        {#if free.length > 0}
          <div class="wf-composer__group" role="presentation">
            <span class="wf-composer__group-title">{m().workflowInterface.composerGroupFree}</span>
            {#each free as candidate (keyOf(candidate))}
              {@render option(candidate)}
            {/each}
          </div>
        {/if}
        {#if taken.length > 0}
          <div class="wf-composer__group" role="presentation">
            <span class="wf-composer__group-title">{m().workflowInterface.composerGroupTaken}</span>
            {#each taken as candidate (keyOf(candidate))}
              {@render option(candidate)}
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <div class="wf-composer__actions">
      <Button variant="ghost" size="sm" onclick={() => (mode = 'choose')}>
        <Icon icon="heroicons:arrow-left" />
        {m().workflowInterface.composerBack}
      </Button>
      <span class="wf-composer__actions-spacer"></span>
      <Button variant="ghost" size="sm" onclick={onCancel}>
        {m().workflowInterface.composerCancel}
      </Button>
      <Button variant="primary" size="sm" disabled={!selected} onclick={() => confirm()}>
        <Icon icon="heroicons:plus" />
        {isInput ? m().workflowInterface.addInput : m().workflowInterface.addOutput}
      </Button>
    </div>
  {/if}
</div>

<style>
  /*
    A draft object, visibly not yet one of the cards below it: a dashed
    primary edge on a faintly primary-tinted surface, its own small header
    with a step counter, and its own close. Everything else — inputs,
    buttons, badges — is the shared control system.
  */
  .wf-composer {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
    padding: var(--fd-space-sm);
    border: 1px dashed color-mix(in srgb, var(--fd-primary) 55%, var(--fd-border));
    border-radius: var(--fd-radius-lg);
    background-color: color-mix(in srgb, var(--fd-primary) 4%, var(--fd-card));
    box-shadow: var(--fd-shadow-sm);
  }

  .wf-composer__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--fd-space-sm);
  }

  .wf-composer__heading {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
  }

  .wf-composer__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-primary-muted);
    color: var(--fd-primary);
    font-size: 0.9375rem;
    flex-shrink: 0;
  }

  .wf-composer__heading-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .wf-composer__title {
    font-size: var(--fd-text-sm);
    font-weight: 600;
    line-height: 1.3;
    color: var(--fd-foreground);
  }

  .wf-composer__step {
    font-size: var(--fd-text-2xs);
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--fd-primary);
  }

  .wf-composer :global(.wf-composer__close) {
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
  }

  .wf-composer__question {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--fd-foreground);
  }

  .wf-composer__choices {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .wf-composer__choice {
    display: flex;
    align-items: center;
    gap: var(--fd-space-sm);
    width: 100%;
    padding: var(--fd-space-xs) var(--fd-space-sm);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-card);
    color: var(--fd-foreground);
    text-align: left;
    cursor: pointer;
    transition:
      border-color var(--fd-transition-fast),
      background-color var(--fd-transition-fast),
      box-shadow var(--fd-transition-fast);
  }

  .wf-composer__choice:hover {
    border-color: var(--fd-primary);
    background-color: var(--fd-primary-muted);
  }

  .wf-composer__choice:focus-visible {
    outline: none;
    border-color: var(--fd-primary);
    box-shadow: 0 0 0 var(--fd-ring-width) var(--fd-primary-muted);
  }

  .wf-composer__choice-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: var(--fd-radius-full);
    background-color: var(--fd-muted);
    color: var(--fd-muted-foreground);
    font-size: 0.9375rem;
    flex-shrink: 0;
    transition:
      background-color var(--fd-transition-fast),
      color var(--fd-transition-fast);
  }

  .wf-composer__choice:hover .wf-composer__choice-icon {
    background-color: var(--fd-card);
    color: var(--fd-primary);
  }

  .wf-composer__choice-text {
    display: flex;
    flex-direction: column;
    gap: 0.0625rem;
    flex: 1;
    min-width: 0;
  }

  .wf-composer__choice-title {
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .wf-composer__choice-hint {
    font-size: var(--fd-text-xs);
    line-height: 1.45;
    color: var(--fd-muted-foreground);
  }

  .wf-composer :global(.wf-composer__choice-arrow) {
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  /* The picker */
  .wf-composer__list {
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

  .wf-composer__list:focus-visible {
    outline: none;
    border-color: var(--fd-primary);
    box-shadow: 0 0 0 var(--fd-ring-width) var(--fd-primary-muted);
  }

  .wf-composer__empty {
    margin: 0;
    padding: var(--fd-space-md) var(--fd-space-sm);
    font-size: var(--fd-text-xs);
    line-height: 1.5;
    text-align: center;
    color: var(--fd-muted-foreground);
  }

  .wf-composer__group {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .wf-composer__group-title {
    padding: var(--fd-space-2xs) var(--fd-space-xs);
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--fd-muted-foreground);
  }

  .wf-composer__option {
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

  .wf-composer__option:hover {
    background-color: var(--fd-muted);
  }

  .wf-composer__option--selected,
  .wf-composer__option--selected:hover {
    border-color: var(--fd-primary);
    background-color: var(--fd-primary-muted);
  }

  .wf-composer__option--taken .wf-composer__option-node,
  .wf-composer__option--taken .wf-composer__option-port {
    color: var(--fd-muted-foreground);
  }

  .wf-composer__option-type {
    flex-shrink: 0;
    margin-top: 0.125rem;
    padding: 0.0625rem 0.375rem;
    border-radius: var(--fd-radius-full);
    background-color: var(--fd-muted);
    color: var(--fd-muted-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: lowercase;
  }

  .wf-composer__option--selected .wf-composer__option-type {
    background-color: var(--fd-card);
    color: var(--fd-primary);
  }

  .wf-composer__option-body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
    min-width: 0;
  }

  .wf-composer__option-path {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.125rem;
    font-size: var(--fd-text-xs);
    line-height: 1.4;
  }

  .wf-composer__option-path :global(svg) {
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  .wf-composer__option-node {
    color: var(--fd-muted-foreground);
  }

  .wf-composer__option-port {
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .wf-composer__option-desc {
    font-size: var(--fd-text-2xs);
    line-height: 1.45;
    color: var(--fd-muted-foreground);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .wf-composer__option-flags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-2xs);
    margin-top: 0.125rem;
  }

  .wf-composer__option-flags :global(.flowdrop-badge) {
    font-size: var(--fd-text-2xs);
    line-height: 1.2;
  }

  .wf-composer__option-check {
    flex-shrink: 0;
    display: inline-flex;
    width: 1rem;
    margin-top: 0.125rem;
    color: var(--fd-primary);
    opacity: 0;
    transition: opacity var(--fd-transition-fast);
  }

  .wf-composer__option--selected .wf-composer__option-check {
    opacity: 1;
  }

  .wf-composer__actions {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .wf-composer__actions-spacer {
    flex: 1;
  }

  .wf-composer__actions :global(.flowdrop-btn) {
    min-height: 1.75rem;
    padding-block: 0;
  }
</style>
