<!--
  InterruptBubble Component
  
  Container component for rendering interrupt prompts inline in the chat flow.
  Displays the appropriate prompt component based on interrupt type.
  Handles resolve/cancel actions using state machine for safe transitions.

  One card: a title line (warning icon and the prompt), the prompt's content and its
  actions. No header band, no footer band, no timestamp. Once answered it folds to
  one muted line ("Confirmed · Yes"). Used by the Playground and the AI Assistant.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from '../primitives/Button.svelte';
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

  let { interrupt: initialInterrupt, onResolved, hierarchy, tags }: Props = $props();

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
  const hasAttribution = $derived(hierarchyItems.length > 0 || tagItems.length > 0);

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

  /** The prompt, as the card's title line. */
  const title = $derived(
    currentInterrupt.message ?? (currentInterrupt.config as { message?: string }).message ?? ''
  );

  /** What the card says once it is answered: one line, e.g. "Confirmed · Yes". */
  const resolvedLine = $derived.by((): string => {
    if (currentInterrupt.machineState.status === 'cancelled') return t.cancelled;
    const value = displayResolvedValue;
    let line: string = t.resolved.submitted;
    switch (currentInterrupt.type) {
      case 'confirmation': {
        const config = confirmationConfig;
        const yes = config.confirmLabel ?? m().interrupt.confirmation.yes;
        const no = config.cancelLabel ?? m().interrupt.confirmation.no;
        line =
          value === false
            ? t.resolved.declined({ value: no })
            : t.resolved.confirmed({ value: yes });
        break;
      }
      case 'choice': {
        const chosen = (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(
          (v) => choiceConfig.options.find((o) => o.value === v)?.label ?? String(v)
        );
        if (chosen.length > 0) line = t.resolved.chose({ value: chosen.join(', ') });
        break;
      }
      case 'text':
        if (typeof value === 'string' && value !== '') {
          line = t.resolved.submittedValue({ value });
        }
        break;
    }
    return resolvedByUserName ? `${line} ${t.resolved.by({ name: resolvedByUserName })}` : line;
  });

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

{#if isResolved}
  <!-- Answered: one muted line. -->
  <div
    class="interrupt-resolved"
    class:interrupt-resolved--cancelled={currentInterrupt.machineState.status === 'cancelled'}
    role="group"
    aria-label={getTypeLabel(currentInterrupt.type)}
  >
    <Icon
      icon={currentInterrupt.machineState.status === 'cancelled' ? 'mdi:close' : 'mdi:check'}
      class="interrupt-resolved__icon"
      aria-hidden="true"
    />
    <span class="interrupt-resolved__text">{resolvedLine}</span>
  </div>
{:else}
  <div
    class="interrupt-bubble"
    class:interrupt-bubble--submitting={isSubmitting}
    class:interrupt-bubble--error={currentInterrupt.machineState.status === 'error'}
    role="group"
    aria-label={getTypeLabel(currentInterrupt.type)}
  >
    <!-- Title: what is being asked -->
    <div class="interrupt-bubble__title">
      <Icon icon="mdi:alert-circle-outline" class="interrupt-bubble__icon" aria-hidden="true" />
      <span class="interrupt-bubble__title-text">{title}</span>
      {#if currentInterrupt.allowCancel && currentInterrupt.type !== 'confirmation'}
        <Button
          variant="ghost"
          size="sm"
          class="interrupt-bubble__cancel"
          onclick={handleCancel}
          disabled={isSubmitting}
        >
          {t.cancel}
        </Button>
      {/if}
    </div>

    <!-- Error message with retry button -->
    {#if currentInterrupt.machineState.status === 'error'}
      <div class="interrupt-bubble__error">
        <Icon icon="mdi:alert-circle" />
        <span>{error}</span>
        <Button variant="secondary" size="sm" onclick={handleRetry}>
          {#snippet leadingIcon()}<Icon icon="mdi:refresh" />{/snippet}
          {t.retry}
        </Button>
      </div>
    {/if}

    <!-- Prompt content based on type -->
    <div class="interrupt-bubble__body">
      {#if currentInterrupt.type === 'confirmation'}
        <ConfirmationPrompt
          config={confirmationConfig}
          {isResolved}
          {isSubmitting}
          {error}
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
          onSubmit={(value) => handleResolve(value)}
        />
      {:else if currentInterrupt.type === 'text'}
        <TextInputPrompt
          config={textConfig}
          {isResolved}
          resolvedValue={displayResolvedValue as string | undefined}
          {isSubmitting}
          {error}
          onSubmit={(value) => handleResolve(value)}
        />
      {:else if currentInterrupt.type === 'form'}
        <FormPrompt
          config={formConfig}
          {isResolved}
          {isSubmitting}
          {error}
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

    {#if hasAttribution}
      <div class="interrupt-bubble__attribution">
        <HierarchyTrail items={hierarchyItems} />
        <MessageTagStrip tags={tagItems} />
      </div>
    {/if}
  </div>
{/if}

<style>
  /*
    One card. The `--fd-interrupt-card-*` tokens are unset unless the theme asks for the
    document layout (display.messages: 'document'); the value after the comma is the look
    the card has always had. Uses --fd-interrupt-* from base.css.
  */
  .interrupt-bubble {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
    margin: var(--fd-space-md) var(--fd-msg-gutter, var(--fd-space-xl));
    padding: var(--fd-interrupt-card-pad, var(--fd-space-xl));
    border-radius: var(--fd-interrupt-card-radius, var(--fd-radius-xl));
    background-color: var(--fd-interrupt-card-bg, var(--fd-interrupt-prompt-bg));
    border: 1px solid var(--fd-interrupt-card-border, var(--fd-interrupt-prompt-border-pending));
    box-shadow: var(--fd-interrupt-card-shadow, 0 2px 8px var(--fd-interrupt-pending-shadow));
    animation: interruptSlideIn 0.3s ease-out;
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

  .interrupt-bubble--error {
    border-color: var(--fd-interrupt-prompt-border-error);
  }

  .interrupt-bubble--submitting {
    opacity: 0.9;
  }

  /* Title line: the icon, the prompt, and the way out on the right. */
  .interrupt-bubble__title {
    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-xs);
    min-width: 0;
    font-weight: 600;
    font-size: var(--fd-text-sm);
    line-height: 1.4;
    color: var(--fd-foreground);
  }

  :global(.interrupt-bubble__icon) {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    margin-top: 0.1em;
    color: var(--fd-interrupt-pending-text);
  }

  .interrupt-bubble__title-text {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  :global(.interrupt-bubble__cancel) {
    flex-shrink: 0;
    margin-block: -0.15rem;
    color: var(--fd-muted-foreground);
  }

  /* Error message with retry */
  .interrupt-bubble__error {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs) var(--fd-space-md);
    background-color: var(--fd-error-muted);
    border-radius: var(--fd-radius-md);
    color: var(--fd-interrupt-error-text);
    font-size: var(--fd-interrupt-font-error);
  }

  .interrupt-bubble__error :global(.flowdrop-ui-button) {
    margin-left: auto;
  }

  .interrupt-bubble__body {
    min-width: 0;
  }

  /* Desaturate body content in error state to reduce visual noise from green/red colors */
  .interrupt-bubble--error .interrupt-bubble__body {
    filter: saturate(0.2);
    opacity: 0.7;
  }

  .interrupt-bubble__attribution {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
  }

  /* Answered: one quiet line with a green check. */
  .interrupt-resolved {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin: var(--fd-space-xs) var(--fd-msg-gutter, var(--fd-space-xl));
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
    min-width: 0;
  }

  :global(.interrupt-resolved__icon) {
    flex-shrink: 0;
    color: var(--fd-success);
  }

  .interrupt-resolved--cancelled :global(.interrupt-resolved__icon) {
    color: var(--fd-muted-foreground);
  }

  .interrupt-resolved__text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .interrupt-bubble {
      margin: var(--fd-space-xs);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .interrupt-bubble {
      animation: none;
    }
  }
</style>
