<!--
  FormNumberField Component
  Number input field for numeric values
  
  Features:
  - Tabular numeric font for alignment
  - Min/max/step support
  - Proper ARIA attributes for accessibility
-->

<script lang="ts">
  import Input from '../Input.svelte';

  interface Props {
    /** Field identifier */
    id: string;
    /** Current value */
    value: number | string;
    /** Placeholder text */
    placeholder?: string;
    /** Minimum allowed value */
    min?: number;
    /** Maximum allowed value */
    max?: number;
    /** Step increment */
    step?: number;
    /** Whether the field is required */
    required?: boolean;
    /** Whether the field is disabled (read-only) */
    disabled?: boolean;
    /** ARIA description ID */
    ariaDescribedBy?: string;
    /** Callback when value changes */
    onChange: (value: number | string) => void;
  }

  let {
    id,
    value = '',
    placeholder = '',
    min,
    max,
    step,
    required = false,
    disabled = false,
    ariaDescribedBy,
    onChange
  }: Props = $props();

  /**
   * Handle input changes
   * Returns the value as a number if valid, otherwise as string
   */
  function handleInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    const inputValue = target.value;

    if (inputValue === '') {
      onChange('');
    } else {
      const numValue = Number(inputValue);
      onChange(isNaN(numValue) ? inputValue : numValue);
    }
  }
</script>

<Input
  {id}
  type="number"
  class="flowdrop-input--numeric"
  value={value ?? ''}
  {placeholder}
  {min}
  {max}
  {step}
  {disabled}
  aria-describedby={ariaDescribedBy}
  aria-required={required}
  oninput={handleInput}
/>
