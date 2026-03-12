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
  import type { Snippet } from "svelte";

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
    /** Slot content for the field input */
    children: Snippet;
  }

  let {
    id,
    label,
    required = false,
    description,
    animationDelay = 0,
    children,
  }: Props = $props();

  /**
   * Computed description ID for ARIA association
   */
  const descriptionId = $derived(description ? `${id}-description` : undefined);
</script>

<div class="form-field" style="animation-delay: {animationDelay}ms">
  <!-- Field Label -->
  <label class="form-field__label" for={id}>
    <span class="form-field__label-text">
      {label}
    </span>
    {#if required}
      <span class="form-field__required" aria-label="required">*</span>
    {/if}
  </label>

  <!-- Field Input Container -->
  <div class="form-field__input-wrapper">
    {@render children()}
  </div>

  <!-- Field Description -->
  {#if description}
    <p id={descriptionId} class="form-field__description">
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
    gap: 0.5rem;
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
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--fd-foreground);
    letter-spacing: -0.01em;
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
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    line-height: 1.5;
    padding-left: 0.125rem;
  }
</style>
