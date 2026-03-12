<!--
  TextInputPrompt Component
  
  Renders a text input prompt for text-type interrupts.
  Supports single-line input and multiline textarea.
  Shows the entered text when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
  import Icon from "@iconify/svelte";
  import type { TextConfig } from "../../types/interrupt.js";

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
    /** Username of the person who resolved the interrupt */
    resolvedByUserName?: string;
    /** Callback when user submits text */
    onSubmit: (value: string) => void;
  }

  let {
    config,
    isResolved,
    resolvedValue,
    isSubmitting,
    error,
    resolvedByUserName,
    onSubmit,
  }: Props = $props();

  /** Local state for input value */
  // svelte-ignore state_referenced_locally — initial default, user edits the input
  let inputValue = $state(config.defaultValue ?? "");

  /** Display value - either resolved or current input */
  const displayValue = $derived(
    isResolved ? (resolvedValue ?? "") : inputValue,
  );

  /** Whether the input is multiline */
  const isMultiline = $derived(config.multiline ?? false);

  /** Character count */
  const charCount = $derived(inputValue.length);

  /** Check if input is valid */
  const isValidInput = $derived(
    inputValue.length > 0 &&
      (config.minLength === undefined ||
        inputValue.length >= config.minLength) &&
      (config.maxLength === undefined || inputValue.length <= config.maxLength),
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
    if (event.key === "Enter" && !isMultiline && !event.shiftKey) {
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
  <!-- Message -->
  <p class="text-prompt__message">{config.message}</p>

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
        placeholder={config.placeholder ?? "Enter your response..."}
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
        placeholder={config.placeholder ?? "Enter your response..."}
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
        class:text-prompt__char-count--warning={config.maxLength !==
          undefined && charCount > config.maxLength * 0.9}
      >
        {charCount}
        {#if config.maxLength !== undefined}
          / {config.maxLength}
        {/if}
        {#if config.minLength !== undefined}
          (min: {config.minLength})
        {/if}
      </span>
    </div>
  {/if}

  <!-- Submit button -->
  {#if !isResolved}
    <div class="text-prompt__actions">
      <button
        type="button"
        class="text-prompt__submit"
        onclick={handleSubmit}
        disabled={!isValidInput || isSubmitting}
      >
        {#if isSubmitting}
          <span class="text-prompt__spinner"></span>
        {:else}
          <Icon icon="mdi:send" />
        {/if}
        <span>Submit</span>
      </button>
    </div>
  {/if}

  <!-- Resolved indicator -->
  {#if isResolved}
    <div class="text-prompt__resolved-badge">
      <Icon icon="mdi:check-circle" />
      <span>
        {resolvedByUserName
          ? `Response submitted by ${resolvedByUserName}`
          : "Response submitted"}
      </span>
    </div>
  {/if}
</div>

<style>
  /* Uses design tokens from base.css/tokens.css */
  .text-prompt {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
  }

  .text-prompt--resolved {
    opacity: 0.85;
  }

  .text-prompt--submitting {
    pointer-events: none;
  }

  .text-prompt__message {
    margin: 0;
    font-size: var(--fd-interrupt-font-message);
    line-height: var(--fd-interrupt-line-height);
    color: var(--fd-foreground);
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

  .text-prompt__input,
  .text-prompt__textarea {
    width: 100%;
    padding: var(--fd-space-md) var(--fd-space-xl);
    font-size: var(--fd-interrupt-font-message);
    font-family: inherit;
    line-height: var(--fd-interrupt-line-height);
    color: var(--fd-foreground);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border-strong);
    border-radius: var(--fd-radius-lg);
    outline: none;
    transition: all var(--fd-transition-fast);
  }

  .text-prompt__input::placeholder,
  .text-prompt__textarea::placeholder {
    color: var(--fd-muted-foreground);
  }

  .text-prompt__input:focus,
  .text-prompt__textarea:focus {
    border-color: var(--fd-interrupt-completed-border);
    box-shadow: 0 0 0 3px var(--fd-interrupt-completed-shadow);
  }

  .text-prompt__input:disabled,
  .text-prompt__textarea:disabled {
    background-color: var(--fd-muted);
    cursor: not-allowed;
  }

  /* Resolved state - neutral blue to match other interrupt prompts */
  .text-prompt__input--resolved,
  .text-prompt__textarea--resolved {
    background-color: var(--fd-primary-muted);
    border-color: var(--fd-interrupt-completed-border);
  }

  .text-prompt__textarea {
    resize: vertical;
    min-height: 100px;
  }

  .text-prompt__char-count {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    text-align: right;
    padding-right: var(--fd-space-3xs);
  }

  .text-prompt__char-count--warning {
    color: var(--fd-warning);
  }

  .text-prompt__actions {
    display: flex;
    gap: var(--fd-space-md);
  }

  .text-prompt__submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-sm) var(--fd-space-2xl);
    border-radius: var(--fd-radius-lg);
    font-size: var(--fd-text-sm);
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all var(--fd-transition-normal);
    border: none;
    min-height: var(--fd-interrupt-btn-min-height);
    background: var(--fd-interrupt-btn-primary-bg);
    color: var(--fd-primary-foreground);
    box-shadow: 0 1px 3px var(--fd-interrupt-btn-primary-shadow);
  }

  .text-prompt__submit:hover:not(:disabled) {
    background: var(--fd-interrupt-btn-primary-bg-hover);
    box-shadow: 0 4px 12px var(--fd-interrupt-btn-primary-shadow);
    transform: translateY(-1px);
  }

  .text-prompt__submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .text-prompt__spinner {
    width: var(--fd-interrupt-spinner-size);
    height: var(--fd-interrupt-spinner-size);
    border: 2px solid var(--fd-border);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: text-spin 0.6s linear infinite;
  }

  @keyframes text-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Resolved badge - neutral blue theme */
  .text-prompt__resolved-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-2xs) var(--fd-space-md);
    background-color: var(--fd-interrupt-badge-completed-bg);
    border-radius: var(--fd-radius-full);
    color: var(--fd-interrupt-badge-completed-text);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    align-self: flex-start;
  }
</style>
