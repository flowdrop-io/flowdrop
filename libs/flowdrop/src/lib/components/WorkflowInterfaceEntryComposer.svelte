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
  import { m } from '$lib/messages/index.js';
  import type { RankedBindablePort } from '$lib/utils/workflowInterface.js';
  import BindablePortListbox from '$lib/components/BindablePortListbox.svelte';
  import type { PortCompatibilityChecker } from '$lib/utils/connections.js';
  import { focusOnMount } from '$lib/utils/focus.js';

  interface Props {
    direction: 'inputs' | 'outputs';
    /** From `rankBindablePorts` — already ordered free-first. */
    candidates: RankedBindablePort[];
    /**
     * The instance's port-compatibility checker — the source of each row's
     * shape symbol and lane chip, so a candidate reads exactly as its port does
     * on the canvas.
     */
    checker: PortCompatibilityChecker;
    onBind: (candidate: RankedBindablePort) => void;
    onCustom: () => void;
    onCancel: () => void;
  }

  const { direction, candidates, checker, onBind, onCustom, onCancel }: Props = $props();

  const isInput = $derived(direction === 'inputs');

  let mode = $state<'choose' | 'bind'>('choose');
  let selected = $state<RankedBindablePort | undefined>(undefined);

  function confirm(candidate: RankedBindablePort | undefined = selected): void {
    if (candidate) onBind(candidate);
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
        {@attach focusOnMount()}
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
    <BindablePortListbox
      {direction}
      {candidates}
      {checker}
      idPrefix="wf-composer-option-{direction}"
      autofocus
      onHighlight={(candidate) => (selected = candidate)}
      onConfirm={(candidate) => confirm(candidate)}
      {onCancel}
    />

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
    A draft where the new row will land: flat, with no border, fill or shadow.
    A small heading says what is being added; the two choices are plain rows
    that take a tint on hover, like menu items.
  */
  .wf-composer {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
    padding: var(--fd-space-xs) 0;
  }

  .wf-composer__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fd-space-sm);
  }

  .wf-composer__heading {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .wf-composer__icon {
    display: none;
  }

  .wf-composer__heading-text {
    display: flex;
    align-items: baseline;
    gap: var(--fd-space-xs);
    min-width: 0;
  }

  .wf-composer__title {
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .wf-composer__step {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .wf-composer :global(.wf-composer__close) {
    flex-shrink: 0;
  }

  .wf-composer__question {
    margin: 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .wf-composer__choices {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
  }

  .wf-composer__choice {
    display: flex;
    align-items: center;
    gap: var(--fd-space-sm);
    width: 100%;
    padding: var(--fd-space-xs) var(--fd-space-sm);
    border: none;
    border-radius: var(--fd-control-radius);
    background-color: transparent;
    color: var(--fd-foreground);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  .wf-composer__choice:hover,
  .wf-composer__choice:focus-visible {
    background-color: var(--fd-muted);
  }

  .wf-composer__choice-icon {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  .wf-composer__choice-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .wf-composer__choice-title {
    font-size: var(--fd-text-sm);
    font-weight: 500;
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

  .wf-composer__actions {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .wf-composer__actions-spacer {
    flex: 1;
  }
</style>
