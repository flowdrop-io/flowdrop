<!--
  FormFieldWrapper Component
  Provides consistent layout for form fields with label, description, and animations
  
  Features:
  - Proper label associations with for/id attributes
  - ARIA describedby for field descriptions
  - Staggered fade-in animations
  - Required field indicators
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { m } from '$lib/messages/index.js';

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
    children
  }: Props = $props();

  /**
   * Computed description ID for ARIA association
   */
  const descriptionId = $derived(description ? `${id}-description` : undefined);
</script>

<div
  class="form-field"
  class:form-field--plain={plain}
  class:form-field--inline={inline}
  style="animation-delay: {animationDelay}ms"
>
  <!-- Field Label -->
  <label class="form-field__label" class:form-field__label--sr={plain} for={id}>
    <span class="form-field__label-text">
      {label}
    </span>
    {#if required}
      <span class="form-field__required" aria-label={m().form.field.required}>*</span>
    {/if}
  </label>

  {#if plain && description}
    <p id={descriptionId} class="form-field__description form-field__description--wrap">
      {description}
    </p>
  {/if}

  <!-- Field Input Container -->
  <div class="form-field__input-wrapper">
    {@render children()}
  </div>

  <!-- Field Description -->
  {#if description && !plain}
    <p id={descriptionId} class="form-field__description" title={description}>
      {description}
    </p>
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

  .form-field__description--wrap {
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
  }
</style>
