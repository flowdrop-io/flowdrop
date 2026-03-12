<!--
  FormTextField Component
  Text input field for string values
  
  Features:
  - Standard text input with focus and hover states
  - Proper ARIA attributes for accessibility
  - Placeholder support
-->

<script lang="ts">
  interface Props {
    /** Field identifier */
    id: string;
    /** Current value */
    value: string;
    /** Placeholder text */
    placeholder?: string;
    /** Whether the field is required */
    required?: boolean;
    /** Whether the field is disabled (read-only) */
    disabled?: boolean;
    /** ARIA description ID */
    ariaDescribedBy?: string;
    /** Callback when value changes */
    onChange: (value: string) => void;
  }

  let {
    id,
    value = "",
    placeholder = "",
    required = false,
    disabled = false,
    ariaDescribedBy,
    onChange,
  }: Props = $props();

  /**
   * Handle input changes
   */
  function handleInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    onChange(target.value);
  }
</script>

<input
  {id}
  type="text"
  class="form-text-field"
  value={value ?? ""}
  {placeholder}
  {disabled}
  aria-describedby={ariaDescribedBy}
  aria-required={required}
  oninput={handleInput}
/>

<style>
  .form-text-field {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    font-size: var(--fd-text-sm);
    font-family: inherit;
    color: var(--fd-foreground);
    background-color: var(--fd-muted);
    transition: all var(--fd-transition-normal);
    box-shadow: var(--fd-shadow-sm);
  }

  .form-text-field::placeholder {
    color: var(--fd-muted-foreground);
  }

  .form-text-field:hover {
    border-color: var(--fd-border-strong);
    background-color: var(--fd-background);
  }

  .form-text-field:focus {
    outline: none;
    border-color: var(--fd-primary);
    background-color: var(--fd-background);
    box-shadow:
      0 0 0 3px rgba(59, 130, 246, 0.12),
      var(--fd-shadow-sm);
  }
</style>
