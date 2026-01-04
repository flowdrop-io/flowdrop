<!--
  FormNumberField Component
  Number input field for numeric values
  
  Features:
  - Tabular numeric font for alignment
  - Min/max/step support
  - Proper ARIA attributes for accessibility
-->

<script lang="ts">
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

<input
	{id}
	type="number"
	class="form-number-field"
	value={value ?? ''}
	{placeholder}
	{min}
	{max}
	{step}
	aria-describedby={ariaDescribedBy}
	aria-required={required}
	oninput={handleInput}
/>

<style>
	.form-number-field {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-family: inherit;
		font-variant-numeric: tabular-nums;
		color: var(--color-ref-gray-900, #111827);
		background-color: var(--color-ref-gray-50, #f9fafb);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.form-number-field::placeholder {
		color: var(--color-ref-gray-400, #9ca3af);
	}

	.form-number-field:hover {
		border-color: var(--color-ref-gray-300, #d1d5db);
		background-color: #ffffff;
	}

	.form-number-field:focus {
		outline: none;
		border-color: var(--color-ref-blue-500, #3b82f6);
		background-color: #ffffff;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}
</style>
