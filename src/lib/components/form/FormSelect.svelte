<!--
  FormSelect Component
  Dropdown select for single value selection
  
  Features:
  - Custom styled dropdown with chevron icon
  - Supports both string[] and FieldOption[] for options
  - Proper ARIA attributes for accessibility
-->

<script lang="ts">
	import Icon from "@iconify/svelte";
	import { normalizeOptions, type FieldOption } from "./types.js";

	interface Props {
		/** Field identifier */
		id: string;
		/** Current value */
		value: string;
		/** Available options - can be string[] or FieldOption[] */
		options: FieldOption[] | string[];
		/** Whether the field is required */
		required?: boolean;
		/** ARIA description ID */
		ariaDescribedBy?: string;
		/** Callback when value changes */
		onChange: (value: string) => void;
	}

	let {
		id,
		value = "",
		options = [],
		required = false,
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

<div class="form-select-wrapper">
	<select
		{id}
		class="form-select"
		value={value ?? ""}
		aria-describedby={ariaDescribedBy}
		aria-required={required}
		onchange={handleChange}
	>
		{#each normalizedOptions as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	<span class="form-select__icon" aria-hidden="true">
		<Icon icon="heroicons:chevron-down" />
	</span>
</div>

<style>
	.form-select-wrapper {
		position: relative;
	}

	.form-select {
		width: 100%;
		padding: 0.625rem 2.5rem 0.625rem 0.875rem;
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-family: inherit;
		color: var(--color-ref-gray-900, #111827);
		background-color: var(--color-ref-gray-50, #f9fafb);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		cursor: pointer;
		appearance: none;
	}

	.form-select:hover {
		border-color: var(--color-ref-gray-300, #d1d5db);
		background-color: #ffffff;
	}

	.form-select:focus {
		outline: none;
		border-color: var(--color-ref-blue-500, #3b82f6);
		background-color: #ffffff;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.form-select__icon {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--color-ref-gray-400, #9ca3af);
		display: flex;
		align-items: center;
		transition: color 0.2s;
	}

	.form-select__icon :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.form-select:focus + .form-select__icon {
		color: var(--color-ref-blue-500, #3b82f6);
	}
</style>

