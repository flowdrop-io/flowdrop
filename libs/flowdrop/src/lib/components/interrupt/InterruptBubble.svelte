<!--
  InterruptBubble Component
  
  Container component for rendering interrupt prompts inline in the chat flow.
  Displays the appropriate prompt component based on interrupt type.
  Handles resolve/cancel actions using state machine for safe transitions.
  Styled with BEM syntax similar to MessageBubble.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import ConfirmationPrompt from './ConfirmationPrompt.svelte';
  import ChoicePrompt from './ChoicePrompt.svelte';
  import TextInputPrompt from './TextInputPrompt.svelte';
  import FormPrompt from './FormPrompt.svelte';
  import ReviewPrompt from './ReviewPrompt.svelte';
  import MessageTagStrip from '../playground/MessageTagStrip.svelte';
  import HierarchyTrail from '../playground/HierarchyTrail.svelte';
  import type { MessageHierarchyItem, MessageTag } from '../../types/playground.js';
  import type {
    Interrupt,
    InterruptType,
    ConfirmationConfig,
    ChoiceConfig,
    TextConfig,
    FormConfig,
    ReviewConfig,
    ReviewResolution
  } from '../../types/interrupt.js';
  import {
    isTerminalState,
    isSubmitting as checkIsSubmitting,
    getErrorMessage,
    getResolvedValue
  } from '../../types/interruptState.js';
  import { type InterruptWithState } from '../../stores/interruptStore.svelte.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { interruptService } from '../../services/interruptService.js';
  import { logger } from '../../utils/logger.js';
  import { m } from '$lib/messages/index.js';

  /**
   * Component props
   */
  interface Props {
    /** The interrupt to display (initial data, used for ID lookup) */
    interrupt: Interrupt | InterruptWithState;
    /** Whether to show the timestamp */
    showTimestamp?: boolean;
    /** Callback to refresh messages after interrupt resolution */
    onResolved?: () => void;
    /**
     * Hierarchy items forwarded from the parent playground message. Rendered
     * as a chevron-separated trail in the footer.
     */
    hierarchy?: MessageHierarchyItem[];
    /**
     * Server-emitted tags forwarded from the parent playground message.
     * Rendered as chips in the footer.
     */
    tags?: MessageTag[];
  }

  let {
    interrupt: initialInterrupt,
    showTimestamp = true,
    onResolved,
    hierarchy,
    tags
  }: Props = $props();

  const fd = getInstance();

  /**
   * Get the current interrupt state from the store.
   * This ensures we react to store updates (like status changes).
   */
  const currentInterrupt = $derived(
    fd.interrupts.getMap().get(initialInterrupt.id) ?? addMachineState(initialInterrupt)
  );

  const hierarchyItems = $derived(hierarchy ?? []);
  const tagItems = $derived(tags ?? []);
  const hasHierarchy = $derived(hierarchyItems.length > 0);
  const hasTags = $derived(tagItems.length > 0);

  /**
   * Helper to ensure interrupt has machine state
   */
  function addMachineState(interrupt: Interrupt | InterruptWithState): InterruptWithState {
    if ('machineState' in interrupt) {
      return interrupt;
    }
    return {
      ...interrupt,
      machineState: { status: 'idle' }
    };
  }

  /** Whether this interrupt is in a terminal state (resolved or cancelled) */
  const isResolved = $derived(isTerminalState(currentInterrupt.machineState));

  /** Whether this interrupt is currently submitting */
  const isSubmitting = $derived(checkIsSubmitting(currentInterrupt.machineState));

  /** Error message for this interrupt */
  const error = $derived(getErrorMessage(currentInterrupt.machineState));

  /** Resolved value for display */
  const resolvedValue = $derived(getResolvedValue(currentInterrupt.machineState));

  /**
   * Get the icon for the interrupt type
   */
  function getTypeIcon(type: InterruptType): string {
    switch (type) {
      case 'confirmation':
        return 'mdi:help-circle';
      case 'choice':
        return 'mdi:format-list-bulleted';
      case 'text':
        return 'mdi:text-box';
      case 'form':
        return 'mdi:form-select';
      case 'review':
        return 'mdi:file-compare';
      default:
        return 'mdi:bell';
    }
  }

  // Hoist the bubble branch — five reads inside the header alone.
  const t = $derived(m().interrupt.bubble);

  /**
   * Get the label for the interrupt type
   */
  function getTypeLabel(type: InterruptType): string {
    const required = t.required;
    switch (type) {
      case 'confirmation':
        return required.confirmation;
      case 'choice':
        return required.selection;
      case 'text':
        return required.input;
      case 'form':
        return required.form;
      case 'review':
        return required.review;
      default:
        return required.default;
    }
  }

  /** Get resolved label for the header when resolved */
  function getResolvedLabel(type: InterruptType): string {
    const submitted = t.submitted;
    switch (type) {
      case 'confirmation':
        return submitted.confirmation;
      case 'choice':
        return submitted.selection;
      case 'text':
        return submitted.input;
      case 'form':
        return submitted.form;
      case 'review':
        return submitted.review;
      default:
        return submitted.default;
    }
  }

  /**
   * Format timestamp for display
   */
  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Handle resolve action using state machine
   */
  async function handleResolve(value: unknown): Promise<void> {
    // Start the submission - state machine validates this transition
    const startResult = fd.interrupts.startSubmit(currentInterrupt.id, value);
    if (!startResult.valid) {
      logger.warn('[InterruptBubble] Cannot submit:', startResult.error);
      return;
    }

    try {
      // Call API if service is configured
      if (interruptService.isConfigured(fd.api.config)) {
        await interruptService.resolveInterrupt(
          fd.api.config,
          currentInterrupt.id,
          value,
          fd.api.authProvider
        );
      }

      // Mark as successful - transitions to resolved state
      fd.interrupts.submitSuccess(currentInterrupt.id);

      // Notify parent to refresh messages
      onResolved?.();
    } catch (err) {
      // Mark as failed - transitions to error state (can retry)
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit response';
      fd.interrupts.submitFailure(currentInterrupt.id, errorMessage);
      logger.error('[InterruptBubble] Resolve error:', err);
    }
  }

  /**
   * Handle cancel action using state machine
   */
  async function handleCancel(): Promise<void> {
    // Start the cancel - state machine validates this transition
    const startResult = fd.interrupts.startCancel(currentInterrupt.id);
    if (!startResult.valid) {
      logger.warn('[InterruptBubble] Cannot cancel:', startResult.error);
      return;
    }

    try {
      // Call API if service is configured
      if (interruptService.isConfigured(fd.api.config)) {
        await interruptService.cancelInterrupt(
          fd.api.config,
          currentInterrupt.id,
          fd.api.authProvider
        );
      }

      // Mark as successful - transitions to cancelled state
      fd.interrupts.submitSuccess(currentInterrupt.id);

      // Notify parent to refresh messages
      onResolved?.();
    } catch (err) {
      // Mark as failed - transitions to error state (can retry)
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel';
      fd.interrupts.submitFailure(currentInterrupt.id, errorMessage);
      logger.error('[InterruptBubble] Cancel error:', err);
    }
  }

  /**
   * Handle retry after error
   */
  function handleRetry(): void {
    fd.interrupts.retry(currentInterrupt.id);
  }

  // Typed config getters for each prompt type
  const confirmationConfig = $derived(currentInterrupt.config as ConfirmationConfig);
  const choiceConfig = $derived(currentInterrupt.config as ChoiceConfig);
  const textConfig = $derived(currentInterrupt.config as TextConfig);
  const formConfig = $derived(currentInterrupt.config as FormConfig);
  const reviewConfig = $derived(currentInterrupt.config as ReviewConfig);

  // Determine the actual resolved value to pass to prompt components
  const displayResolvedValue = $derived(resolvedValue ?? currentInterrupt.responseValue);

  /**
   * Extract the username of who resolved the interrupt from metadata.
   * This is provided by the backend when the interrupt is resolved.
   */
  const resolvedByUserName = $derived(
    typeof currentInterrupt.metadata?.resolvedByUserName === 'string'
      ? currentInterrupt.metadata.resolvedByUserName
      : undefined
  );
</script>

<div
  class="interrupt-bubble"
  class:interrupt-bubble--completed={currentInterrupt.machineState.status === 'resolved'}
  class:interrupt-bubble--cancelled={currentInterrupt.machineState.status === 'cancelled'}
  class:interrupt-bubble--submitting={isSubmitting}
  class:interrupt-bubble--error={currentInterrupt.machineState.status === 'error'}
  role="group"
  aria-label={getTypeLabel(currentInterrupt.type)}
>
  <!-- Header -->
  <div class="interrupt-bubble__header">
    <span class="interrupt-bubble__type">
      <Icon icon={getTypeIcon(currentInterrupt.type)} aria-hidden="true" />
      {#if isResolved}
        {currentInterrupt.machineState.status === 'cancelled'
          ? t.cancelled
          : getResolvedLabel(currentInterrupt.type)}
      {:else if currentInterrupt.machineState.status === 'error'}
        {t.errorRetry}
      {:else}
        {getTypeLabel(currentInterrupt.type)}
      {/if}
    </span>
    {#if showTimestamp}
      <time
        class="interrupt-bubble__timestamp"
        datetime={currentInterrupt.resolvedAt ?? currentInterrupt.createdAt}
        aria-label="sent at {formatTimestamp(
          currentInterrupt.resolvedAt ?? currentInterrupt.createdAt
        )}"
      >
        {formatTimestamp(currentInterrupt.resolvedAt ?? currentInterrupt.createdAt)}
      </time>
    {/if}
  </div>

  <!-- Error message with retry button -->
  {#if currentInterrupt.machineState.status === 'error'}
    <div class="interrupt-bubble__error">
      <Icon icon="mdi:alert-circle" />
      <span>{error}</span>
      <button type="button" class="interrupt-bubble__retry-btn" onclick={handleRetry}>
        <Icon icon="mdi:refresh" />
        {t.retry}
      </button>
    </div>
  {/if}

  <!-- Prompt content based on type -->
  <div class="interrupt-bubble__body">
    {#if currentInterrupt.type === 'confirmation'}
      <ConfirmationPrompt
        config={confirmationConfig}
        {isResolved}
        resolvedValue={displayResolvedValue as boolean | undefined}
        {isSubmitting}
        {error}
        {resolvedByUserName}
        onConfirm={() => handleResolve(true)}
        onDecline={() => handleResolve(false)}
      />
    {:else if currentInterrupt.type === 'choice'}
      <ChoicePrompt
        config={choiceConfig}
        {isResolved}
        resolvedValue={displayResolvedValue as string | string[] | undefined}
        {isSubmitting}
        {error}
        {resolvedByUserName}
        onSubmit={(value) => handleResolve(value)}
      />
    {:else if currentInterrupt.type === 'text'}
      <TextInputPrompt
        config={textConfig}
        {isResolved}
        resolvedValue={displayResolvedValue as string | undefined}
        {isSubmitting}
        {error}
        {resolvedByUserName}
        onSubmit={(value) => handleResolve(value)}
      />
    {:else if currentInterrupt.type === 'form'}
      <FormPrompt
        config={formConfig}
        {isResolved}
        resolvedValue={displayResolvedValue as Record<string, unknown> | undefined}
        {isSubmitting}
        {error}
        {resolvedByUserName}
        onSubmit={(value) => handleResolve(value)}
      />
    {:else if currentInterrupt.type === 'review'}
      <ReviewPrompt
        config={reviewConfig}
        {isResolved}
        resolvedValue={displayResolvedValue as ReviewResolution | undefined}
        {isSubmitting}
        {error}
        {resolvedByUserName}
        onSubmit={(value) => handleResolve(value)}
      />
    {/if}
  </div>

  <!-- Footer -->
  {#if currentInterrupt.nodeId || hasHierarchy || hasTags || (currentInterrupt.allowCancel && !isResolved && currentInterrupt.type !== 'confirmation')}
    <div class="interrupt-bubble__footer">
      <div class="interrupt-bubble__attribution">
        {#if currentInterrupt.nodeId}
          <span
            class="interrupt-bubble__node"
            title={t.nodeIdTooltip({ id: currentInterrupt.nodeId })}
          >
            <Icon icon="mdi:graph" aria-hidden="true" />
            <span>{t.fromWorkflow}</span>
          </span>
        {/if}
        <HierarchyTrail items={hierarchyItems} />
        <MessageTagStrip tags={tagItems} />
      </div>
      {#if currentInterrupt.allowCancel && !isResolved && currentInterrupt.type !== 'confirmation'}
        <button
          type="button"
          class="interrupt-bubble__cancel-btn"
          onclick={handleCancel}
          disabled={isSubmitting}
        >
          <Icon icon="mdi:close" aria-hidden="true" />
          <span>{t.cancel}</span>
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Uses design tokens from base.css: --fd-interrupt-* */
  .interrupt-bubble {
    display: flex;
    flex-direction: column;
    margin: var(--fd-space-md) var(--fd-space-xl);
    border-radius: var(--fd-radius-xl);
    background-color: var(--fd-interrupt-prompt-bg);
    border: 1px solid var(--fd-interrupt-prompt-border-pending);
    box-shadow: 0 2px 8px var(--fd-interrupt-pending-shadow);
    animation: interruptSlideIn 0.3s ease-out;
    overflow: hidden;
  }

  @keyframes interruptSlideIn {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* State border colors */
  .interrupt-bubble--completed {
    border-color: var(--fd-interrupt-prompt-border-completed);
    box-shadow: 0 2px 8px var(--fd-interrupt-completed-shadow);
  }

  .interrupt-bubble--cancelled {
    border-color: var(--fd-interrupt-prompt-border-cancelled);
    box-shadow: 0 2px 8px var(--fd-interrupt-cancelled-shadow);
  }

  .interrupt-bubble--error {
    border-color: var(--fd-interrupt-prompt-border-error);
    box-shadow: 0 2px 8px var(--fd-interrupt-error-shadow);
  }

  .interrupt-bubble--submitting {
    opacity: 0.9;
  }

  /* Header */
  .interrupt-bubble__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-xl);
    background: var(--fd-interrupt-pending-bg);
    border-bottom: 1px solid var(--fd-interrupt-prompt-border-pending);
  }

  .interrupt-bubble--completed .interrupt-bubble__header {
    background: var(--fd-interrupt-completed-bg);
    border-bottom-color: var(--fd-interrupt-prompt-border-completed);
  }

  .interrupt-bubble--cancelled .interrupt-bubble__header {
    background: var(--fd-interrupt-cancelled-bg);
    border-bottom-color: var(--fd-interrupt-prompt-border-cancelled);
  }

  .interrupt-bubble--error .interrupt-bubble__header {
    background: var(--fd-interrupt-error-bg);
    border-bottom-color: var(--fd-interrupt-prompt-border-error);
  }

  .interrupt-bubble__type {
    display: flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    font-weight: 600;
    font-size: var(--fd-text-sm);
    color: var(--fd-interrupt-pending-text);
  }

  .interrupt-bubble--completed .interrupt-bubble__type {
    color: var(--fd-interrupt-completed-text);
  }

  .interrupt-bubble--cancelled .interrupt-bubble__type {
    color: var(--fd-interrupt-cancelled-text);
  }

  .interrupt-bubble--error .interrupt-bubble__type {
    color: var(--fd-interrupt-error-text);
  }

  .interrupt-bubble__timestamp {
    font-size: var(--fd-text-2xs);
    color: var(--fd-interrupt-pending-text-light);
    font-family: var(--fd-font-mono);
  }

  .interrupt-bubble--completed .interrupt-bubble__timestamp {
    color: var(--fd-interrupt-completed-text-light);
  }

  .interrupt-bubble--cancelled .interrupt-bubble__timestamp {
    color: var(--fd-interrupt-cancelled-text-light);
  }

  .interrupt-bubble--error .interrupt-bubble__timestamp {
    color: var(--fd-interrupt-error-text-light);
  }

  /* Error message */
  .interrupt-bubble__error {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin: var(--fd-space-md) var(--fd-space-xl) 0;
    padding: var(--fd-space-xs) var(--fd-space-md);
    background-color: var(--fd-error-muted);
    border-radius: var(--fd-radius-md);
    color: var(--fd-interrupt-error-text);
    font-size: var(--fd-interrupt-font-error);
  }

  .interrupt-bubble__retry-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    margin-left: auto;
    padding: var(--fd-space-3xs) var(--fd-space-xs);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    font-family: inherit;
    color: var(--fd-error-foreground);
    background-color: var(--fd-interrupt-error-avatar);
    border: none;
    border-radius: var(--fd-radius-sm);
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  .interrupt-bubble__retry-btn:hover {
    background-color: var(--fd-error-hover);
  }

  .interrupt-bubble__retry-btn:focus-visible {
    outline: 2px solid var(--fd-ring);
    outline-offset: 2px;
  }

  /* Body - prompt content area, full width */
  .interrupt-bubble__body {
    padding: var(--fd-space-xl);
  }

  .interrupt-bubble--cancelled .interrupt-bubble__body {
    opacity: 0.75;
  }

  /* Desaturate body content in error state to reduce visual noise from green/red colors */
  .interrupt-bubble--error .interrupt-bubble__body {
    filter: saturate(0.2);
    opacity: 0.7;
  }

  /* Footer */
  .interrupt-bubble__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-xl);
    background: var(--fd-interrupt-pending-bg);
    border-top: 1px solid var(--fd-interrupt-prompt-border-pending);
  }

  .interrupt-bubble--completed .interrupt-bubble__footer {
    background: var(--fd-interrupt-completed-bg);
    border-top-color: var(--fd-interrupt-prompt-border-completed);
  }

  .interrupt-bubble--cancelled .interrupt-bubble__footer {
    background: var(--fd-interrupt-cancelled-bg);
    border-top-color: var(--fd-interrupt-prompt-border-cancelled);
  }

  .interrupt-bubble--error .interrupt-bubble__footer {
    background: var(--fd-interrupt-error-bg);
    border-top-color: var(--fd-interrupt-prompt-border-error);
  }

  .interrupt-bubble__attribution {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
    flex: 1 1 auto;
  }

  .interrupt-bubble__node {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
  }

  .interrupt-bubble__cancel-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    margin-left: auto;
    padding: var(--fd-space-2xs) var(--fd-space-md);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    font-family: inherit;
    color: var(--fd-muted-foreground);
    background-color: transparent;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    cursor: pointer;
    transition: all var(--fd-transition-fast);
  }

  .interrupt-bubble__cancel-btn:hover:not(:disabled) {
    color: var(--fd-error);
    border-color: var(--fd-error);
    background-color: var(--fd-error-muted);
  }

  .interrupt-bubble__cancel-btn:focus-visible {
    outline: 2px solid var(--fd-ring);
    outline-offset: 2px;
  }

  .interrupt-bubble__cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .interrupt-bubble {
      margin: var(--fd-space-xs);
    }

    .interrupt-bubble__header,
    .interrupt-bubble__body,
    .interrupt-bubble__footer {
      padding-left: var(--fd-space-lg);
      padding-right: var(--fd-space-lg);
    }

    .interrupt-bubble__cancel-btn {
      min-height: 2.5rem;
      padding: var(--fd-space-xs) var(--fd-space-md);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .interrupt-bubble {
      animation: none;
    }
    .interrupt-bubble__cancel-btn {
      transition: none;
    }
  }
</style>
