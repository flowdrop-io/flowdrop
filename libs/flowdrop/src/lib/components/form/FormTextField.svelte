<!--
  FormTextField Component
  Text input field for string values
  
  Features:
  - Standard text input with focus and hover states
  - Proper ARIA attributes for accessibility
  - Placeholder support
-->

<script lang="ts">
  import Input from '../Input.svelte';

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
    value = '',
    placeholder = '',
    required = false,
    disabled = false,
    ariaDescribedBy,
    onChange
  }: Props = $props();

  /**
   * Handle input changes
   */
  function handleInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    onChange(target.value);
  }
</script>

<Input
  {id}
  type="text"
  value={value ?? ''}
  {placeholder}
  {disabled}
  aria-describedby={ariaDescribedBy}
  aria-required={required}
  oninput={handleInput}
/>
