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

  let firstChoice = $state<HTMLButtonElement | null>(null);

  // Land keyboard focus on the form as it opens; the listbox takes it itself
  // as the author steps into it — the composer is a modal moment inside the panel.
  $effect(() => {
    if (mode === 'choose') firstChoice?.focus();
  });

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
