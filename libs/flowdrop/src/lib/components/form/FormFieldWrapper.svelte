<!--
  @component
  The frame around one form field: the label, a required mark, the help text under the field, and the field itself as children.

  `inline` puts a switch on the label's row. `plain` is for section-style fields such as the ports list,
  where the label is for screen readers only. `aside` adds a short muted note on the label row.

  **Use it for** giving a custom field the same label and help text as the built-in ones.
  **Not for** choosing which control to draw from a schema (that is `FormField`, which wraps its fields in this).
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { m } from '$lib/messages/index.js';
  import Button from '../primitives/Button.svelte';

  interface Props {
    /** Field identifier for label association */
    id: string;
    /** Display label text */
    label: string;
    /** Whether the field is required */
    required?: boolean;
    /** Description/help text for the field */
    description?: string;
    /** Animation delay in milliseconds */
    animationDelay?: number;
    /**
     * Section-style field (the ports list): the label is read by screen readers
     * only (the inspector tab already names it) and the description sits above
     * the content and may wrap.
     */
    plain?: boolean;
    /** Switch field: the control sits on the label's row, the help underneath. */
    inline?: boolean;
    /** Short muted note on the label row, right-aligned (an array's "Matched in order"). */
    aside?: string;
    /**
     * A "null" toggle on the label row, for a field that may hold `null` (its type
     * or enum lists it). While `on`, the field shows a muted "null" in place of its input.
     */
    nullToggle?: { on: boolean; disabled?: boolean; onToggle: () => void };
    /** The field's type is only `null`: show the muted "null" and no input, with no toggle. */
    nullOnly?: boolean;
    /** A short plain-text hint under the field (e.g. "Skipped when not set"); its id is `{id}-hint` */
    hint?: string;
    /** Slot content for the field input */
    children: Snippet;
  }

  let {
    id,
    label,
    required = false,
    description,
    animationDelay = 0,
    plain = false,
    inline = false,
    aside,
    nullToggle,
    nullOnly = false,
    hint,
    children
  }: Props = $props();

  /**
   * Computed description ID for ARIA association
   */
  const descriptionId = $derived(description ? `${id}-description` : undefined);
  const hintId = $derived(hint ? `${id}-hint` : undefined);
</script>

<div
  class="form-field"
  class:form-field--plain={plain}
  class:form-field--inline={inline}
  style="animation-delay: {animationDelay}ms"
>
  <!-- Field Label -->
  <div class="form-field__label-row">
    <!-- While null is shown there is no input to point at, so the label has no `for`. -->
    <label
      class="form-field__label"
      class:form-field__label--sr={plain}
      for={nullToggle?.on || nullOnly ? undefined : id}
    >
      <span class="form-field__label-text">
        {label}
      </span>
      {#if required}
        <span class="form-field__required" aria-label={m().form.field.required}>*</span>
      {/if}
    </label>
    {#if aside}<span class="form-field__aside">{aside}</span>{/if}
    {#if nullToggle}
      <Button
        variant="ghost"
        size="sm"
        class="form-field__null-toggle"
        aria-pressed={nullToggle.on}
        ariaLabel={m().form.field.nullToggleLabel({ label })}
        title={m().form.field.nullToggleTitle}
        disabled={nullToggle.disabled}
        onclick={nullToggle.onToggle}
      >
        {m().form.field.nullToggle}
      </Button>
    {/if}
  </div>

  {#if plain && description}
    <p id={descriptionId} class="form-field__description form-field__description--wrap">
      {description}
    </p>
  {/if}

  <!-- Field Input Container -->
  <div class="form-field__input-wrapper">
    {#if nullToggle?.on || nullOnly}
      <div class="form-field__null" data-null-value>{m().form.field.nullValue}</div>
    {:else}
      {@render children()}
    {/if}
  </div>

  <!-- Field Description -->
  {#if description && !plain}
    <p id={descriptionId} class="form-field__description" title={description}>
      {description}
    </p>
  {/if}

  {#if hint}
    <p id={hintId} class="form-field__description form-field__hint">{hint}</p>
  {/if}
</div>

<style>
  /* ============================================
	   FIELD CONTAINER
	   ============================================ */

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
    animation: fieldFadeIn 0.3s ease-out forwards;
    opacity: 0;
    transform: translateY(4px);
  }

  @keyframes fieldFadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ============================================
	   LABELS
	   ============================================ */

  .form-field__label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--fd-field-label-size);
    font-weight: var(--fd-field-label-weight);
    color: var(--fd-foreground);
    letter-spacing: -0.01em;
  }

  .form-field__label-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--fd-space-md);
  }

  .form-field__aside {
    font-size: var(--fd-field-help-size);
    color: var(--fd-muted-foreground);
  }

  .form-field__label--sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .form-field--inline {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: var(--fd-space-md);
    row-gap: var(--fd-space-3xs);
    align-items: center;
  }

  .form-field--inline .form-field__description {
    grid-column: 1 / -1;
  }

  .form-field--plain {
    gap: var(--fd-space-md);
  }

  .form-field__label-text {
    line-height: 1.4;
  }

  .form-field__required {
    color: var(--fd-error);
    font-weight: 500;
  }

  /* ============================================
	   INPUT WRAPPER
	   ============================================ */

  .form-field__input-wrapper {
    position: relative;
  }

  /* ============================================
	   FIELD DESCRIPTION
	   ============================================ */

  .form-field__description {
    margin: 0;
    font-size: var(--fd-field-help-size);
    color: var(--fd-muted-foreground);
    line-height: 1.4;
    /* One line; the full text is in the title. */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The null toggle: muted while off; selected look (primary text on its muted
     wash, like a chosen Segmented option) while on, so the state shows without
     reading aria-pressed. */
  .form-field :global(.form-field__null-toggle) {
    color: var(--fd-muted-foreground);
    font-weight: 400;
  }
  .form-field :global(.form-field__null-toggle[aria-pressed='true']),
  .form-field :global(.form-field__null-toggle[aria-pressed='true']:hover:not(:disabled)) {
    color: var(--fd-primary);
    background-color: var(--fd-primary-muted);
    font-weight: 600;
  }

  /* The muted state of a field that holds null: same footprint as a text input. */
  .form-field__null {
    display: flex;
    align-items: center;
    min-height: var(--fd-control-md);
    padding: 0 var(--fd-space-md);
    border: 1px dashed var(--fd-border);
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-muted);
    color: var(--fd-muted-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-field-help-size);
    user-select: none;
  }

  .form-field__description--wrap {
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
  }
</style>
