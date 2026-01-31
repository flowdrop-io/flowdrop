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
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		font-size: var(--fd-text-sm);
		font-family: inherit;
		font-variant-numeric: tabular-nums;
		color: var(--fd-foreground);
		background-color: var(--fd-muted);
		transition: all var(--fd-transition-normal);
		box-shadow: var(--fd-shadow-sm);
	}

	.form-number-field::placeholder {
		color: var(--fd-muted-foreground);
	}

	.form-number-field:hover {
		border-color: var(--fd-border-strong);
		background-color: var(--fd-background);
	}

	.form-number-field:focus {
		outline: none;
		border-color: var(--fd-primary);
		background-color: var(--fd-background);
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			var(--fd-shadow-sm);
	}
</style>
