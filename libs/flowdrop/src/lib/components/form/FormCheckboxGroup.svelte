<!--
  FormCheckboxGroup Component
  Checkbox group for multiple value selection (enum with multiple=true)
  
  Features:
  - Checkbox primitive per option: no box around the group
-->

<script lang="ts">
  import Checkbox from '../primitives/Checkbox.svelte';

  interface Props {
    /** Field identifier (used for ARIA) */
    id: string;
    /** Current selected values */
    value: string[];
    /** Available options */
    options: string[];
    /** Whether the field is disabled (read-only) */
    disabled?: boolean;
    /** ARIA description ID */
    ariaDescribedBy?: string;
    /** Callback when value changes */
    onChange: (value: string[]) => void;
  }

  let {
    id,
    value = [],
    options = [],
    disabled = false,
    ariaDescribedBy,
    onChange
  }: Props = $props();

  /**
   * Handle checkbox toggle
   */
  function handleCheckboxChange(option: string, checked: boolean): void {
    const currentValues = Array.isArray(value) ? [...value] : [];

    if (checked) {
      if (!currentValues.includes(option)) {
        onChange([...currentValues, option]);
      }
    } else {
      onChange(currentValues.filter((v) => v !== option));
    }
  }
</script>

<div
  class="form-checkbox-group"
  role="group"
  aria-labelledby="{id}-label"
  aria-describedby={ariaDescribedBy}
>
  {#each options as option (option)}
    {@const isChecked = Array.isArray(value) && value.includes(option)}
    <Checkbox
      value={option}
      checked={isChecked}
      {disabled}
      label={option}
      onchange={(checked) => handleCheckboxChange(option, checked)}
    />
  {/each}
</div>

<style>
  .form-checkbox-group {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }
</style>
