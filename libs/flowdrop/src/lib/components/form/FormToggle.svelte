<!--
  FormToggle Component
  Toggle switch for boolean values
  
  Features:
  - Smooth toggle animation
  - On/Off labels with state-based coloring
  - Focus-visible states for keyboard navigation
-->

<script lang="ts">
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** Field identifier */
    id: string;
    /** Current value */
    value: boolean;
    /**
     * Per-instance label for the on state (e.g. "Hidden" for a visibility
     * toggle). Falls back to the global `messages.form.toggle.enabled`.
     */
    onLabel?: string;
    /**
     * Per-instance label for the off state. Falls back to the global
     * `messages.form.toggle.disabled`.
     */
    offLabel?: string;
    /**
     * Keep the state label as the switch's accessible name only, without
     * rendering it. For dense rows where the switch alone carries the state.
     */
    hideLabel?: boolean;
    /** Whether the field is disabled (read-only) */
    disabled?: boolean;
    /** ARIA description ID */
    ariaDescribedBy?: string;
    /** Callback when value changes */
    onChange: (value: boolean) => void;
  }

  let {
    id,
    value = false,
    onLabel,
    offLabel,
    hideLabel = false,
    disabled = false,
    ariaDescribedBy,
    onChange
  }: Props = $props();

  const resolvedOnLabel = $derived(onLabel ?? m().form.toggle.enabled);
  const resolvedOffLabel = $derived(offLabel ?? m().form.toggle.disabled);

  /**
   * Handle toggle changes
   */
  function handleChange(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    onChange(target.checked);
  }
</script>

<label class="form-toggle" class:form-toggle--compact={hideLabel}>
  <input
    {id}
    type="checkbox"
    class="form-toggle__input"
    checked={value}
    {disabled}
    aria-describedby={ariaDescribedBy}
    onchange={handleChange}
  />
  <span class="form-toggle__track">
    <span class="form-toggle__thumb"></span>
  </span>
  <span class="form-toggle__label" class:form-toggle__label--sr-only={hideLabel}>
    {value ? resolvedOnLabel : resolvedOffLabel}
  </span>
</label>

<style>
  .form-toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem 0;
  }

  .form-toggle__input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .form-toggle__track {
    position: relative;
    width: 2.75rem;
    height: 1.5rem;
    background-color: var(--fd-border-strong);
    border-radius: 0.75rem;
    transition: background-color var(--fd-transition-normal);
    flex-shrink: 0;
  }

  .form-toggle__thumb {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    background-color: var(--fd-background);
    border-radius: 50%;
    box-shadow: var(--fd-shadow-sm);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .form-toggle__input:checked + .form-toggle__track {
    background-color: var(--fd-primary);
  }

  .form-toggle__input:checked + .form-toggle__track .form-toggle__thumb {
    transform: translateX(1.25rem);
  }

  .form-toggle__label {
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
    font-weight: 500;
    min-width: 4.5rem;
  }

  .form-toggle__input:checked ~ .form-toggle__label {
    color: var(--fd-primary-hover);
  }

  /* Compact: switch only, no reserved label column and no vertical padding. */
  .form-toggle--compact {
    gap: 0;
    padding: 0;
  }

  .form-toggle__label--sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    min-width: 0;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
</style>
