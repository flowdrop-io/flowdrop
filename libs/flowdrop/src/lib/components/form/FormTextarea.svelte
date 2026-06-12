<!--
  FormTextarea Component
  Multiline text input field for longer string values
  
  Features:
  - Resizable textarea with minimum height
  - Focus and hover states
  - Proper ARIA attributes for accessibility
-->

<script lang="ts">
  import Textarea from '../Textarea.svelte';

  interface Props {
    /** Field identifier */
    id: string;
    /** Current value */
    value: string;
    /** Placeholder text */
    placeholder?: string;
    /** Number of visible rows */
    rows?: number;
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
    rows = 4,
    required = false,
    disabled = false,
    ariaDescribedBy,
    onChange
  }: Props = $props();

  /**
   * Handle textarea changes
   */
  function handleInput(event: Event): void {
    const target = event.currentTarget as HTMLTextAreaElement;
    onChange(target.value);
  }
</script>

<Textarea
  {id}
  value={value ?? ''}
  {placeholder}
  {rows}
  {disabled}
  aria-describedby={ariaDescribedBy}
  aria-required={required}
  oninput={handleInput}
/>
