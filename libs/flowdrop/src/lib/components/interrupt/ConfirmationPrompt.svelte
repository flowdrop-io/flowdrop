<!--
  ConfirmationPrompt Component
  
  Renders a Yes/No confirmation prompt for confirmation-type interrupts.
  Two action buttons with customizable labels, secondary then primary. The question
  itself is the card's title (InterruptBubble); an answered card folds to one line there.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from '../primitives/Button.svelte';
  import type { ConfirmationConfig } from '../../types/interrupt.js';
  import { m } from '$lib/messages/index.js';

  /**
   * Component props
   */
  interface Props {
    /** Confirmation configuration from the interrupt */
    config: ConfirmationConfig;
    /** Whether this interrupt has been resolved */
    isResolved: boolean;
    /** Whether the form is currently submitting */
    isSubmitting: boolean;
    /** Error message if submission failed */
    error?: string;
    /** Callback when user confirms (Yes) */
    onConfirm: () => void;
    /** Callback when user declines (No) */
    onDecline: () => void;
  }

  let { config, isResolved, isSubmitting, error, onConfirm, onDecline }: Props = $props();

  /** Computed label for confirm button — config wins, falls back to messages tree. */
  const confirmLabel = $derived(config.confirmLabel ?? m().interrupt.confirmation.yes);

  /** Computed label for decline/cancel button — config wins, falls back to messages tree. */
  const declineLabel = $derived(config.cancelLabel ?? m().interrupt.confirmation.no);
</script>

<div
  class="confirmation-prompt"
  class:confirmation-prompt--resolved={isResolved}
  class:confirmation-prompt--submitting={isSubmitting}
>
  <!-- Error message -->
  {#if error}
    <div class="confirmation-prompt__error">
      <Icon icon="mdi:alert-circle" />
      <span>{error}</span>
    </div>
  {/if}

  <!-- Actions: secondary, then primary -->
  <div class="confirmation-prompt__actions">
    <Button
      variant="secondary"
      class="confirmation-prompt__button confirmation-prompt__button--decline"
      onclick={onDecline}
      disabled={isResolved || isSubmitting}
      aria-label={declineLabel}
    >
      {declineLabel}
    </Button>

    <Button
      variant="primary"
      class="confirmation-prompt__button confirmation-prompt__button--confirm"
      loading={isSubmitting && !isResolved}
      onclick={onConfirm}
      disabled={isResolved}
      aria-label={confirmLabel}
    >
      {confirmLabel}
    </Button>
  </div>
</div>

<style>
  .confirmation-prompt {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
  }

  .confirmation-prompt--resolved {
    opacity: 0.85;
  }

  .confirmation-prompt--submitting {
    pointer-events: none;
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
    justify-content: flex-end;
    gap: var(--fd-space-xs);
    flex-wrap: wrap;
  }
</style>
