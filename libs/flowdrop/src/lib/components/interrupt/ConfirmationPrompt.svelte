<!--
  ConfirmationPrompt Component
  
  Renders a Yes/No confirmation prompt for confirmation-type interrupts.
  Displays the message and two action buttons with customizable labels.
  Shows the selected response when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
  import Icon from "@iconify/svelte";
  import type { ConfirmationConfig } from "../../types/interrupt.js";

  /**
   * Component props
   */
  interface Props {
    /** Confirmation configuration from the interrupt */
    config: ConfirmationConfig;
    /** Whether this interrupt has been resolved */
    isResolved: boolean;
    /** The resolved value (true/false) if resolved */
    resolvedValue?: boolean;
    /** Whether the form is currently submitting */
    isSubmitting: boolean;
    /** Error message if submission failed */
    error?: string;
    /** Username of the person who resolved the interrupt */
    resolvedByUserName?: string;
    /** Callback when user confirms (Yes) */
    onConfirm: () => void;
    /** Callback when user declines (No) */
    onDecline: () => void;
  }

  let {
    config,
    isResolved,
    resolvedValue,
    isSubmitting,
    error,
    resolvedByUserName,
    onConfirm,
    onDecline,
  }: Props = $props();

  /** Computed label for confirm button */
  const confirmLabel = $derived(config.confirmLabel ?? "Yes");

  /** Computed label for decline/cancel button */
  const declineLabel = $derived(config.cancelLabel ?? "No");
</script>

<div
  class="confirmation-prompt"
  class:confirmation-prompt--resolved={isResolved}
  class:confirmation-prompt--submitting={isSubmitting}
>
  <!-- Message -->
  <p class="confirmation-prompt__message">{config.message}</p>

  <!-- Error message -->
  {#if error}
    <div class="confirmation-prompt__error">
      <Icon icon="mdi:alert-circle" />
      <span>{error}</span>
    </div>
  {/if}

  <!-- Actions -->
  <div class="confirmation-prompt__actions">
    <button
      type="button"
      class="confirmation-prompt__button confirmation-prompt__button--decline"
      class:confirmation-prompt__button--selected={isResolved &&
        resolvedValue === false}
      class:confirmation-prompt__button--not-selected={isResolved &&
        resolvedValue !== false}
      onclick={onDecline}
      disabled={isResolved || isSubmitting}
      aria-label={declineLabel}
    >
      {#if isSubmitting && !isResolved}
        <span class="confirmation-prompt__spinner"></span>
      {:else if isResolved && resolvedValue === false}
        <Icon icon="mdi:check-circle" />
      {:else if isResolved}
        <!-- Not selected - show dimmed X icon -->
        <Icon icon="mdi:close" />
      {:else}
        <Icon icon="mdi:close" />
      {/if}
      <span>{declineLabel}</span>
    </button>

    <button
      type="button"
      class="confirmation-prompt__button confirmation-prompt__button--confirm"
      class:confirmation-prompt__button--selected={isResolved &&
        resolvedValue === true}
      class:confirmation-prompt__button--not-selected={isResolved &&
        resolvedValue !== true}
      onclick={onConfirm}
      disabled={isResolved || isSubmitting}
      aria-label={confirmLabel}
    >
      {#if isSubmitting && !isResolved}
        <span class="confirmation-prompt__spinner"></span>
      {:else if isResolved && resolvedValue === true}
        <Icon icon="mdi:check-circle" />
      {:else if isResolved}
        <!-- Not selected - show dimmed check icon -->
        <Icon icon="mdi:check" />
      {:else}
        <Icon icon="mdi:check" />
      {/if}
      <span>{confirmLabel}</span>
    </button>
  </div>

  <!-- Resolved indicator -->
  {#if isResolved}
    <div class="confirmation-prompt__resolved-badge">
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
  .confirmation-prompt {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
  }

  .confirmation-prompt--resolved {
    opacity: 0.85;
  }

  .confirmation-prompt--submitting {
    pointer-events: none;
  }

  .confirmation-prompt__message {
    margin: 0;
    font-size: var(--fd-interrupt-font-message);
    line-height: var(--fd-interrupt-line-height);
    color: var(--fd-foreground);
  }

  .confirmation-prompt__error {
    display: flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-xs) var(--fd-space-md);
    background-color: var(--fd-error-muted);
    border-radius: var(--fd-radius-md);
    color: var(--fd-error);
    font-size: var(--fd-interrupt-font-error);
  }

  .confirmation-prompt__actions {
    display: flex;
    gap: var(--fd-space-md);
    flex-wrap: wrap;
  }

  .confirmation-prompt__button {
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
    border: 1px solid transparent;
    min-height: var(--fd-interrupt-btn-min-height);
    min-width: 100px;
  }

  .confirmation-prompt__button:disabled {
    cursor: not-allowed;
  }

  /* Uses design tokens from base.css: --fd-interrupt-* */
  .confirmation-prompt__button--decline {
    background-color: var(--fd-interrupt-btn-secondary-bg);
    border-color: var(--fd-interrupt-btn-secondary-border);
    color: var(--fd-interrupt-btn-secondary-text);
  }

  .confirmation-prompt__button--decline:hover:not(:disabled) {
    background-color: var(--fd-border);
    border-color: var(--fd-muted-foreground);
  }

  .confirmation-prompt__button--decline:disabled {
    opacity: 0.6;
  }

  /* Non-selected decline button when resolved - very dimmed */
  .confirmation-prompt__button--decline.confirmation-prompt__button--not-selected {
    opacity: var(--fd-interrupt-not-selected-opacity);
    background-color: var(--fd-muted);
    border-color: var(--fd-border);
    color: var(--fd-muted-foreground);
  }

  /* Selected decline button - highlighted with border and background */
  .confirmation-prompt__button--decline.confirmation-prompt__button--selected {
    opacity: 1;
    background-color: var(--fd-interrupt-selected-decline-bg);
    border-color: var(--fd-interrupt-selected-decline-border);
    border-width: 2px;
    color: var(--fd-interrupt-selected-decline-text);
    box-shadow: 0 0 0 3px var(--fd-interrupt-selected-decline-glow);
  }

  .confirmation-prompt__button--confirm {
    background: var(--fd-interrupt-btn-primary-bg);
    color: var(--fd-primary-foreground);
    box-shadow: 0 1px 3px var(--fd-interrupt-btn-primary-shadow);
  }

  .confirmation-prompt__button--confirm:hover:not(:disabled) {
    background: var(--fd-interrupt-btn-primary-bg-hover);
    box-shadow: 0 4px 12px var(--fd-interrupt-btn-primary-shadow);
    transform: translateY(-1px);
  }

  .confirmation-prompt__button--confirm:disabled {
    opacity: 0.6;
    transform: none;
    box-shadow: none;
  }

  /* Non-selected confirm button when resolved - very dimmed */
  .confirmation-prompt__button--confirm.confirmation-prompt__button--not-selected {
    opacity: var(--fd-interrupt-not-selected-opacity);
    background: var(--fd-border);
    color: var(--fd-muted-foreground);
    box-shadow: none;
  }

  /* Selected confirm button - highlighted with glow */
  .confirmation-prompt__button--confirm.confirmation-prompt__button--selected {
    opacity: 1;
    background: var(--fd-interrupt-selected-confirm-bg);
    border-width: 2px;
    border-color: var(--fd-interrupt-selected-confirm-border);
    box-shadow:
      0 0 0 3px var(--fd-interrupt-selected-confirm-glow),
      0 2px 8px var(--fd-interrupt-btn-primary-shadow);
  }

  .confirmation-prompt__spinner {
    width: var(--fd-interrupt-spinner-size);
    height: var(--fd-interrupt-spinner-size);
    border: 2px solid var(--fd-border);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: confirmation-spin 0.6s linear infinite;
  }

  .confirmation-prompt__button--decline .confirmation-prompt__spinner {
    border-color: var(--fd-border);
    border-top-color: var(--fd-foreground);
  }

  @keyframes confirmation-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Resolved badge - neutral blue theme */
  .confirmation-prompt__resolved-badge {
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
