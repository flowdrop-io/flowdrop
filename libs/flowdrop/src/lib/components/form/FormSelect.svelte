<!--
  FormSelect Component
  Dropdown select for single value selection
  
  Features:
  - Custom styled dropdown with chevron icon
  - Supports both string[] and FieldOption[] for options
  - Proper ARIA attributes for accessibility
-->

<script lang="ts">
  import Select from '../Select.svelte';
  import { normalizeOptions, type FieldOption } from './types.js';

  interface Props {
    /** Field identifier */
    id: string;
    /** Current value */
    value: string;
    /** Available options - can be string[] or FieldOption[] */
    options: FieldOption[] | string[];
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
    options = [],
    required = false,
    disabled = false,
    ariaDescribedBy,
    onChange
  }: Props = $props();

  /**
   * Normalize options to consistent FieldOption format
   */
  const normalizedOptions = $derived(normalizeOptions(options));

  /**
   * Handle select changes
   */
  function handleChange(event: Event): void {
    const target = event.currentTarget as HTMLSelectElement;
    onChange(target.value);
  }
</script>

<Select
  {id}
  value={value ?? ''}
  {disabled}
  aria-describedby={ariaDescribedBy}
  aria-required={required}
  onchange={handleChange}
>
  {#each normalizedOptions as option (option.value)}
    <option value={option.value}>{option.label}</option>
  {/each}
</Select>
