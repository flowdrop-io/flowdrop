<!--
  TextInputPrompt Component
  
  Renders a text input prompt for text-type interrupts.
  Supports single-line input and multiline textarea.
  Shows the entered text when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from '../primitives/Button.svelte';
  import type { TextConfig } from '../../types/interrupt.js';
  import { m } from '$lib/messages/index.js';

  /**
   * Component props
   */
  interface Props {
    /** Text configuration from the interrupt */
    config: TextConfig;
    /** Whether this interrupt has been resolved */
    isResolved: boolean;
    /** The resolved value if resolved */
    resolvedValue?: string;
    /** Whether the form is currently submitting */
    isSubmitting: boolean;
    /** Error message if submission failed */
    error?: string;
    /** Callback when user submits text */
    onSubmit: (value: string) => void;
  }

  let { config, isResolved, resolvedValue, isSubmitting, error, onSubmit }: Props = $props();

  // Hoist the text branch — placeholder/min/submit reads, including duplicate
  // placeholder in single- vs. multiline branches.
  const t = $derived(m().interrupt.text);

  /** Local state for input value */
  // initial default, user edits the input
  // svelte-ignore state_referenced_locally
  let inputValue = $state(config.defaultValue ?? '');

  /** Display value - either resolved or current input */
  const displayValue = $derived(isResolved ? (resolvedValue ?? '') : inputValue);

  /** Whether the input is multiline */
  const isMultiline = $derived(config.multiline ?? false);

  /** Character count */
  const charCount = $derived(inputValue.length);

  /** Check if input is valid */
  const isValidInput = $derived(
    inputValue.length > 0 &&
      (config.minLength === undefined || inputValue.length >= config.minLength) &&
      (config.maxLength === undefined || inputValue.length <= config.maxLength)
  );

  /**
   * Handle input change
   */
  function handleInput(event: Event): void {
    if (isResolved || isSubmitting) return;
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    inputValue = target.value;
  }

  /**
   * Handle form submission
   */
  function handleSubmit(): void {
    if (!isValidInput || isResolved || isSubmitting) return;
    onSubmit(inputValue);
  }

  /**
   * Handle Enter key for single-line input
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !isMultiline && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }
</script>

<div
  class="text-prompt"
  class:text-prompt--resolved={isResolved}
  class:text-prompt--submitting={isSubmitting}
>
  <!-- Error message -->
  {#if error}
    <div class="text-prompt__error">
      <Icon icon="mdi:alert-circle" />
      <span>{error}</span>
    </div>
  {/if}

  <!-- Input field -->
  <div class="text-prompt__input-wrapper">
    {#if isMultiline}
      <textarea
        class="text-prompt__textarea"
        class:text-prompt__textarea--resolved={isResolved}
        value={displayValue}
        placeholder={config.placeholder ?? t.placeholder}
        disabled={isResolved || isSubmitting}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        rows={4}
        minlength={config.minLength}
        maxlength={config.maxLength}
      ></textarea>
    {:else}
      <input
        type="text"
        class="text-prompt__input"
        class:text-prompt__input--resolved={isResolved}
        value={displayValue}
        placeholder={config.placeholder ?? t.placeholder}
        disabled={isResolved || isSubmitting}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        minlength={config.minLength}
        maxlength={config.maxLength}
      />
    {/if}
  </div>

  <!-- Character count -->
  {#if !isResolved && (config.minLength !== undefined || config.maxLength !== undefined)}
    <div class="text-prompt__char-count">
      <span
        class:text-prompt__char-count--warning={config.maxLength !== undefined &&
          charCount > config.maxLength * 0.9}
      >
        {charCount}
        {#if config.maxLength !== undefined}
          / {config.maxLength}
        {/if}
        {#if config.minLength !== undefined}
          {t.min({ n: config.minLength })}
        {/if}
      </span>
    </div>
  {/if}

  <!-- Submit button -->
  {#if !isResolved}
    <div class="text-prompt__actions">
      <Button
        variant="primary"
        loading={isSubmitting}
        onclick={handleSubmit}
        disabled={!isValidInput || isSubmitting}
      >
        {t.submit}
      </Button>
    </div>
  {/if}
</div>

<style>
  /* Uses design tokens from base.css/tokens.css */
  .text-prompt {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
  }

  .text-prompt--resolved {
    opacity: 0.85;
  }

  .text-prompt--submitting {
    pointer-events: none;
  }

  .text-prompt__error {
    display: flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-xs) var(--fd-space-md);
    background-color: var(--fd-error-muted);
    border-radius: var(--fd-radius-md);
    color: var(--fd-error);
    font-size: var(--fd-interrupt-font-error);
  }

  .text-prompt__input-wrapper {
    display: flex;
    flex-direction: column;
  }

  /* The Field control: 32 px (a textarea 64 px), 6 px radius, a strong rule, a ring on focus. */
  .text-prompt__input,
  .text-prompt__textarea {
    width: 100%;
    padding: 0 var(--fd-space-md);
    font-size: var(--fd-text-sm);
    font-family: inherit;
    color: var(--fd-foreground);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border-strong);
    border-radius: var(--fd-control-radius);
    outline: none;
    transition: all var(--fd-transition-fast);
  }

  .text-prompt__input {
    height: var(--fd-control-lg, 2rem);
  }

  .text-prompt__input::placeholder,
  .text-prompt__textarea::placeholder {
    color: var(--fd-muted-foreground);
  }

  .text-prompt__input:focus,
  .text-prompt__textarea:focus {
    border-color: var(--fd-accent);
    box-shadow: 0 0 0 3px var(--fd-accent-muted);
  }

  .text-prompt__input:disabled,
  .text-prompt__textarea:disabled {
    background-color: var(--fd-muted);
    cursor: not-allowed;
  }

  .text-prompt__textarea {
    padding: var(--fd-space-xs) var(--fd-space-md);
    line-height: 1.45;
    resize: vertical;
    min-height: 4rem;
  }

  .text-prompt__char-count {
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
    text-align: right;
  }

  .text-prompt__char-count--warning {
    color: var(--fd-warning);
  }

  .text-prompt__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--fd-space-xs);
  }
</style>
