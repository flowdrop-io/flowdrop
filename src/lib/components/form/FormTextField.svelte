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

<input
	{id}
	type="text"
	class="form-text-field"
	value={value ?? ''}
	{placeholder}
	aria-describedby={ariaDescribedBy}
	aria-required={required}
	oninput={handleInput}
/>

<style>
	.form-text-field {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-family: inherit;
		color: var(--color-ref-gray-900, #111827);
		background-color: var(--color-ref-gray-50, #f9fafb);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.form-text-field::placeholder {
		color: var(--color-ref-gray-400, #9ca3af);
	}

	.form-text-field:hover {
		border-color: var(--color-ref-gray-300, #d1d5db);
		background-color: #ffffff;
	}

	.form-text-field:focus {
		outline: none;
		border-color: var(--color-ref-blue-500, #3b82f6);
		background-color: #ffffff;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}
</style>
