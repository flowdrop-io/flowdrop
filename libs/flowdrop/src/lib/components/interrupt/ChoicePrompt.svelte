<!--
  ChoicePrompt Component
  
  Renders a selection prompt for choice-type interrupts.
  Supports single selection (radio buttons) and multiple selection (checkboxes).
  Shows the selected options when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from '../primitives/Button.svelte';
  import type { ChoiceConfig, InterruptChoice } from '../../types/interrupt.js';
  import { m } from '$lib/messages/index.js';

  /**
   * Component props
   */
  interface Props {
    /** Choice configuration from the interrupt */
    config: ChoiceConfig;
    /** Whether this interrupt has been resolved */
    isResolved: boolean;
    /** The resolved value(s) if resolved */
    resolvedValue?: string | string[];
    /** Whether the form is currently submitting */
    isSubmitting: boolean;
    /** Error message if submission failed */
    error?: string;
    /** Callback when user submits selection */
    onSubmit: (value: string | string[]) => void;
  }

  let { config, isResolved, resolvedValue, isSubmitting, error, onSubmit }: Props = $props();

  // Hoist the choice branch — counter, min, max, submit reads.
  const t = $derived(m().interrupt.choice);

  // Unique name for the radio/checkbox group so multiple ChoicePrompts on
  // screen don't share the same HTML group and interfere with each other.
  const groupName = `choice-option-${Math.random().toString(36).slice(2, 8)}`;

  /** Local state for selected values */
  let selectedValues = $state<Set<string>>(new Set());

  /** Options with a description stack as rows; plain ones sit side by side as pills. */
  const hasDescriptions = $derived(config.options.some((o) => !!o.description));

  /** Whether multiple selection is enabled */
  const isMultiple = $derived(config.multiple ?? false);

  /** Minimum selections required */
  const minSelections = $derived(config.minSelections ?? (isMultiple ? 0 : 1));

  /** Maximum selections allowed */
  const maxSelections = $derived(config.maxSelections ?? (isMultiple ? config.options.length : 1));

  /** Check if submit is valid */
  const isValidSelection = $derived(
    selectedValues.size >= minSelections && selectedValues.size <= maxSelections
  );

  /** Check if an option was selected in resolved state */
  function isOptionResolved(option: InterruptChoice): boolean {
    if (!isResolved || resolvedValue === undefined) return false;
    if (Array.isArray(resolvedValue)) {
      return resolvedValue.includes(option.value);
    }
    return resolvedValue === option.value;
  }

  /**
   * Handle option selection/deselection
   */
  function handleOptionChange(option: InterruptChoice, checked: boolean): void {
    if (isResolved || isSubmitting) return;

    const newSelected = new Set(selectedValues);

    if (isMultiple) {
      if (checked) {
        // Check max selections
        if (newSelected.size < maxSelections) {
          newSelected.add(option.value);
        }
      } else {
        newSelected.delete(option.value);
      }
    } else {
      // Single selection - clear and set
      newSelected.clear();
      if (checked) {
        newSelected.add(option.value);
      }
    }

    selectedValues = newSelected;
  }

  /**
   * Handle form submission
   */
  function handleSubmit(): void {
    if (!isValidSelection || isResolved || isSubmitting) return;

    const values = Array.from(selectedValues);
    if (isMultiple) {
      onSubmit(values);
    } else {
      onSubmit(values[0] ?? '');
    }
  }
</script>

<div
  class="choice-prompt"
  class:choice-prompt--resolved={isResolved}
  class:choice-prompt--submitting={isSubmitting}
>
  <!-- Error message -->
  {#if error}
    <div class="choice-prompt__error">
      <Icon icon="mdi:alert-circle" />
      <span>{error}</span>
    </div>
  {/if}

  <!-- Options -->
  <div
    class="choice-prompt__options"
    class:choice-prompt__options--stacked={hasDescriptions}
    role={isMultiple ? 'group' : 'radiogroup'}
    aria-label={config.message}
  >
    {#each config.options as option (option.value)}
      {@const isChecked = isResolved ? isOptionResolved(option) : selectedValues.has(option.value)}
      <label
        class="choice-prompt__option"
        class:choice-prompt__option--selected={isChecked}
        class:choice-prompt__option--resolved={isResolved && isChecked}
      >
        <input
          type={isMultiple ? 'checkbox' : 'radio'}
          name={groupName}
          value={option.value}
          checked={isChecked}
          disabled={isResolved || isSubmitting}
          onchange={(e) => handleOptionChange(option, (e.target as HTMLInputElement).checked)}
          class="choice-prompt__input"
        />
        {#if isMultiple && isChecked}
          <Icon icon="mdi:check" class="choice-prompt__checkmark" aria-hidden="true" />
        {/if}
        <span class="choice-prompt__option-content">
          <span class="choice-prompt__option-label">{option.label}</span>
          {#if option.description}
            <span class="choice-prompt__option-description">{option.description}</span>
          {/if}
        </span>
      </label>
    {/each}
  </div>

  <!-- Selection info for multiple -->
  {#if isMultiple && !isResolved}
    <div class="choice-prompt__info">
      <span>
        {t.selectedCount({
          n: selectedValues.size,
          total: config.options.length
        })}
        {#if minSelections > 0}
          {t.min({ n: minSelections })}
        {/if}
        {#if maxSelections < config.options.length}
          {t.max({ n: maxSelections })}
        {/if}
      </span>
    </div>
  {/if}

  <!-- Submit (only for explicit submission) -->
  {#if !isResolved}
    <div class="choice-prompt__actions">
      <Button
        variant="primary"
        loading={isSubmitting}
        onclick={handleSubmit}
        disabled={!isValidSelection || isSubmitting}
      >
        {t.submit}
      </Button>
    </div>
  {/if}
</div>

<style>
  /* Uses design tokens from base.css/tokens.css */
  .choice-prompt {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
  }

  .choice-prompt--resolved {
    opacity: 0.85;
  }

  .choice-prompt--submitting {
    pointer-events: none;
  }

  .choice-prompt__error {
    display: flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-xs) var(--fd-space-md);
    background-color: var(--fd-error-muted);
    border-radius: var(--fd-radius-md);
    color: var(--fd-error);
    font-size: var(--fd-interrupt-font-error);
  }

  /* Options are pills side by side; with descriptions they stack as rows. */
  .choice-prompt__options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-xs);
  }

  .choice-prompt__options--stacked {
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .choice-prompt__option {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    min-height: var(--fd-control-md);
    padding: 0 var(--fd-space-md);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border-strong);
    border-radius: var(--fd-control-radius);
    color: var(--fd-foreground);
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  .choice-prompt__options--stacked .choice-prompt__option {
    padding-block: var(--fd-space-xs);
  }

  .choice-prompt__option:hover {
    background-color: var(--fd-subtle);
  }

  .choice-prompt__option:has(:focus-visible) {
    outline: 2px solid var(--fd-ring);
    outline-offset: 1px;
  }

  .choice-prompt__option--selected,
  .choice-prompt__option--selected:hover {
    background-color: var(--fd-accent-muted);
    border-color: var(--fd-accent);
  }

  .choice-prompt--resolved .choice-prompt__option {
    cursor: default;
  }

  .choice-prompt--resolved .choice-prompt__option:not(.choice-prompt__option--resolved) {
    opacity: var(--fd-interrupt-not-selected-opacity);
  }

  .choice-prompt__input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  :global(.choice-prompt__checkmark) {
    flex-shrink: 0;
    color: var(--fd-accent);
  }

  .choice-prompt__option-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .choice-prompt__option-label {
    font-size: var(--fd-text-sm);
    font-weight: 500;
    color: var(--fd-foreground);
  }

  .choice-prompt__option-description {
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
    line-height: var(--fd-leading-tight);
  }

  .choice-prompt__info {
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
  }

  .choice-prompt__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--fd-space-xs);
  }
</style>
