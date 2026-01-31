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

<textarea
	{id}
	class="form-textarea"
	value={value ?? ''}
	{placeholder}
	{rows}
	{disabled}
	aria-describedby={ariaDescribedBy}
	aria-required={required}
	oninput={handleInput}
></textarea>

<style>
	.form-textarea {
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
		resize: vertical;
		min-height: 5rem;
		line-height: 1.5;
	}

	.form-textarea::placeholder {
		color: var(--fd-muted-foreground);
	}

	.form-textarea:hover {
		border-color: var(--fd-border-strong);
		background-color: var(--fd-background);
	}

	.form-textarea:focus {
		outline: none;
		border-color: var(--fd-primary);
		background-color: var(--fd-background);
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			var(--fd-shadow-sm);
	}
</style>
