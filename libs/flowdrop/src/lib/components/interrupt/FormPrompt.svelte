<!--
  FormPrompt Component
  
  Renders a JSON Schema-based form for form-type interrupts.
  Wraps the existing SchemaForm component for consistent form handling.
  Shows the submitted form data when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import SchemaForm from '../SchemaForm.svelte';
  import type { FormConfig } from '../../types/interrupt.js';
  import { getMessages, m, mergeMessages, setMessages } from '$lib/messages/index.js';

  /**
   * Component props
   */
  interface Props {
    /** Form configuration from the interrupt */
    config: FormConfig;
    /** Whether this interrupt has been resolved */
    isResolved: boolean;
    /** The resolved form values if resolved */
    resolvedValue?: Record<string, unknown>;
    /** Whether the form is currently submitting */
    isSubmitting: boolean;
    /** Error message if submission failed */
    error?: string;
    /** Username of the person who resolved the interrupt */
    resolvedByUserName?: string;
    /** Callback when user submits form */
    onSubmit: (value: Record<string, unknown>) => void;
  }

  let {
    config,
    isResolved,
    resolvedValue,
    isSubmitting,
    error,
    resolvedByUserName,
    onSubmit
  }: Props = $props();

  /** Local state for form values */
  // initial default, user fills the form
  // svelte-ignore state_referenced_locally
  let formValues = $state<Record<string, unknown>>(config.defaultValues ?? {});

  /** Display values - either resolved or current form values */
  const displayValues = $derived(isResolved ? (resolvedValue ?? {}) : formValues);

  // Hoist the interrupt branch — six reads in the template, three of them
  // inside `formatResolvedValue` which is called per `{#each schema.property}`.
  const interrupt = $derived(m().interrupt);

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

  /**
   * Format resolved value for display.
   * Returns localized strings via the current messages tree.
   */
  function formatResolvedValue(value: unknown): string {
    if (value === null || value === undefined) return interrupt.form.empty;
    if (typeof value === 'boolean') return value ? interrupt.form.yes : interrupt.form.no;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
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
  <!-- Message -->
  <p class="form-prompt__message">{config.message}</p>

  <!-- Error message -->
  {#if error}
    <div class="form-prompt__error">
      <Icon icon="mdi:alert-circle" />
      <span>{error}</span>
    </div>
  {/if}

  <!-- Form -->
  {#if !isResolved}
    <div class="form-prompt__form-wrapper">
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
  {:else}
    <!-- Resolved state: Show submitted values as read-only -->
    <div class="form-prompt__resolved-values">
      <h4 class="form-prompt__resolved-title">{interrupt.form.submittedValuesTitle}</h4>
      <div class="form-prompt__values-list">
        {#each Object.entries(config.schema.properties ?? {}) as [key, field] (key)}
          {@const value = displayValues[key]}
          {@const fieldTitle = ((field as Record<string, unknown>).title as string) ?? key}
          <div class="form-prompt__value-item">
            <span class="form-prompt__value-label">{fieldTitle}</span>
            <span class="form-prompt__value-content">
              {formatResolvedValue(value)}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Resolved indicator -->
  {#if isResolved}
    <div class="form-prompt__resolved-badge">
      <Icon icon="mdi:check-circle" />
      <span>
        {resolvedByUserName
          ? interrupt.responseSubmittedBy({ name: resolvedByUserName })
          : interrupt.responseSubmitted}
      </span>
    </div>
  {/if}
</div>

<style>
  /* Uses design tokens from base.css/tokens.css */
  .form-prompt {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
  }

  .form-prompt--resolved {
    opacity: 0.85;
  }

  .form-prompt--submitting {
    pointer-events: none;
  }

  .form-prompt__message {
    margin: 0;
    font-size: var(--fd-interrupt-font-message);
    line-height: var(--fd-interrupt-line-height);
    color: var(--fd-foreground);
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

  .form-prompt__form-wrapper {
    background-color: var(--fd-muted);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    padding: var(--fd-space-xl);
  }

  /* Resolved values - neutral blue theme */
  .form-prompt__resolved-values {
    background-color: var(--fd-primary-muted);
    border: 1px solid var(--fd-interrupt-completed-border);
    border-radius: var(--fd-radius-lg);
    padding: var(--fd-space-xl);
  }

  .form-prompt__resolved-title {
    margin: 0 0 var(--fd-space-md) 0;
    font-size: var(--fd-interrupt-font-error);
    font-weight: 600;
    color: var(--fd-interrupt-badge-completed-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-prompt__values-list {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .form-prompt__value-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .form-prompt__value-label {
    font-size: var(--fd-text-xs);
    font-weight: 500;
    color: var(--fd-muted-foreground);
  }

  .form-prompt__value-content {
    font-size: var(--fd-text-sm);
    color: var(--fd-foreground);
    word-break: break-word;
    white-space: pre-wrap;
  }

  /* Resolved badge - neutral blue theme */
  .form-prompt__resolved-badge {
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
