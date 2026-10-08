<!--
  FormPrompt Component
  
  Renders a JSON Schema-based form for form-type interrupts: the same card of
  fields the Playground's inputs form uses (InputFields), inside the
  interrupt's "needs you" frame, with a primary Submit. An array or object
  field is typed as JSON and sent parsed.
  Shows the submitted form data when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Card from '../primitives/Card.svelte';
  import Button from '../primitives/Button.svelte';
  import InputFields from '../playground/InputFields.svelte';
  import type { FormConfig } from '../../types/interrupt.js';
  import { m } from '$lib/messages/index.js';
  import { mergeWithDefaults } from '../../utils/formMerge.js';

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
    problem = null;
  }

  /** Why the last Submit did not go out (a blank required field, bad JSON). */
  let problem = $state<string | null>(null);

  const requiredKeys = $derived(config.schema.required ?? []);
  const title = (key: string): string =>
    ((config.schema.properties?.[key] as Record<string, unknown> | undefined)?.title as string) ??
    key;

  /**
   * Handle form submission: defaults filled in, array and object fields
   * parsed from their JSON text.
   */
  function handleSave(): void {
    if (isResolved || isSubmitting) return;
    const merged = mergeWithDefaults(config.schema, config.defaultValues ?? {}, formValues);
    const invalid: string[] = [];
    for (const [key, property] of Object.entries(config.schema.properties ?? {})) {
      const value = merged[key];
      if (
        (property.type === 'array' || property.type === 'object') &&
        typeof value === 'string' &&
        value.trim() !== ''
      ) {
        try {
          merged[key] = JSON.parse(value);
        } catch {
          invalid.push(title(key));
        }
      }
    }
    const missing = requiredKeys.filter(
      (key) => merged[key] === undefined || merged[key] === null || merged[key] === ''
    );
    if (missing.length > 0 || invalid.length > 0) {
      problem = [
        missing.length > 0
          ? interrupt.form.missingRequired({ names: missing.map(title).join(', ') })
          : null,
        invalid.length > 0 ? interrupt.form.invalidJson({ names: invalid.join(', ') }) : null
      ]
        .filter((line) => line !== null)
        .join('. ');
      return;
    }
    problem = null;
    onSubmit(merged);
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
    <Card padding="md">
      <InputFields
        schema={config.schema}
        values={formValues}
        onChange={handleChange}
        disabled={isSubmitting}
      />
      {#if problem}
        <p class="form-prompt__problem" role="alert">{problem}</p>
      {/if}
      {#snippet footer()}
        <Button variant="primary" loading={isSubmitting} onclick={handleSave}>
          {interrupt.form.submit}
        </Button>
      {/snippet}
    </Card>
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

  .form-prompt__problem {
    margin: var(--fd-space-sm) 0 0;
    color: var(--fd-error);
    font-size: var(--fd-text-xs);
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
