<!--
  FormPrompt Component
  
  Renders a JSON Schema-based form for form-type interrupts.
  Wraps the existing SchemaForm component for consistent form handling. The form
  sits straight on the interrupt card (no card of its own); the question is the
  card's title and an answered card folds to one line (InterruptBubble).
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import SchemaForm from '../SchemaForm.svelte';
  import type { FormConfig } from '../../types/interrupt.js';
  import { getMessages, mergeMessages, setMessages } from '$lib/messages/index.js';

  /**
   * Component props
   */
  interface Props {
    /** Form configuration from the interrupt */
    config: FormConfig;
    /** Whether this interrupt has been resolved */
    isResolved: boolean;
    /** Whether the form is currently submitting */
    isSubmitting: boolean;
    /** Error message if submission failed */
    error?: string;
    /** Callback when user submits form */
    onSubmit: (value: Record<string, unknown>) => void;
  }

  let { config, isResolved, isSubmitting, error, onSubmit }: Props = $props();

  /** Local state for form values */
  // initial default, user fills the form
  // svelte-ignore state_referenced_locally
  let formValues = $state<Record<string, unknown>>(config.defaultValues ?? {});

  /**
   * Handle form value changes
   */
  function handleChange(values: Record<string, unknown>): void {
    if (isResolved || isSubmitting) return;
    formValues = values;
  }

  /**
   * Handle form submission
   */
  function handleSave(values: Record<string, unknown>): void {
    if (isResolved || isSubmitting) return;
    onSubmit(values);
  }

  // Scope a messages override for the inner SchemaForm so its Save button reads
  // the interrupt-specific submit label (e.g. "Submit"), and the cancel button
  // remains empty — historical behavior that effectively hid it. Avoids passing
  // deprecated `saveLabel` / `cancelLabel` props on SchemaForm.
  // Merges over the parent's tree so consumer-supplied overrides higher up
  // (e.g. translations from <FlowDrop messages={...} />) still apply.
  const parentMessages = getMessages();
  const scopedMessages = $derived.by(() => {
    const base = parentMessages();
    return mergeMessages(base, {
      form: { schema: { save: base.interrupt.form.submit, cancel: '' } }
    });
  });
  setMessages(() => scopedMessages);
</script>

<div
  class="form-prompt"
  class:form-prompt--resolved={isResolved}
  class:form-prompt--submitting={isSubmitting}
>
  <!-- Error message -->
  {#if error}
    <div class="form-prompt__error">
      <Icon icon="mdi:alert-circle" />
      <span>{error}</span>
    </div>
  {/if}

  <!-- Form -->
  <SchemaForm
    schema={config.schema}
    values={formValues}
    onChange={handleChange}
    onSave={handleSave}
    showActions={true}
    loading={isSubmitting}
    disabled={isResolved}
  />
</div>

<style>
  /* Uses design tokens from base.css/tokens.css */
  .form-prompt {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
  }

  .form-prompt--resolved {
    opacity: 0.85;
  }

  .form-prompt--submitting {
    pointer-events: none;
  }

  .form-prompt__error {
    display: flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-xs) var(--fd-space-md);
    background-color: var(--fd-error-muted);
    border-radius: var(--fd-radius-md);
    color: var(--fd-error);
    font-size: var(--fd-interrupt-font-error);
  }

  /* The card's own Cancel (title line) is the way out; the form's empty cancel button and its rule go. */
  .form-prompt :global(.schema-form__button--secondary) {
    display: none;
  }

  .form-prompt :global(.schema-form__footer) {
    border-top: 0;
    padding-top: 0;
    justify-content: flex-end;
  }
</style>
