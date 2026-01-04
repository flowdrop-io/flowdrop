<!--
  FormTextarea Component
  Multiline text input field for longer string values
  
  Features:
  - Resizable textarea with minimum height
  - Focus and hover states
  - Proper ARIA attributes for accessibility
-->

<script lang="ts">
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

<textarea
	{id}
	class="form-textarea"
	value={value ?? ''}
	{placeholder}
	{rows}
	aria-describedby={ariaDescribedBy}
	aria-required={required}
	oninput={handleInput}
></textarea>

<style>
	.form-textarea {
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
		resize: vertical;
		min-height: 5rem;
		line-height: 1.5;
	}

	.form-textarea::placeholder {
		color: var(--color-ref-gray-400, #9ca3af);
	}

	.form-textarea:hover {
		border-color: var(--color-ref-gray-300, #d1d5db);
		background-color: #ffffff;
	}

	.form-textarea:focus {
		outline: none;
		border-color: var(--color-ref-blue-500, #3b82f6);
		background-color: #ffffff;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}
</style>
