<!--
  FormCheckboxGroup Component
  Checkbox group for multiple value selection (enum with multiple=true)
  
  Features:
  - Custom styled checkboxes with check icon
  - Animated checkbox state transitions
  - Focus-visible states for keyboard navigation
-->

<script lang="ts">
	import Icon from "@iconify/svelte";

	interface Props {
		/** Field identifier (used for ARIA) */
		id: string;
		/** Current selected values */
		value: string[];
		/** Available options */
		options: string[];
		/** ARIA description ID */
		ariaDescribedBy?: string;
		/** Callback when value changes */
		onChange: (value: string[]) => void;
	}

	let {
		id,
		value = [],
		options = [],
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
		<label class="form-checkbox-item">
			<input
				type="checkbox"
				class="form-checkbox__input"
				value={option}
				checked={isChecked}
				onchange={(e) => handleCheckboxChange(option, e.currentTarget.checked)}
			/>
			<span class="form-checkbox__custom" aria-hidden="true">
				<Icon icon="heroicons:check" />
			</span>
			<span class="form-checkbox__label">
				{option}
			</span>
		</label>
	{/each}
</div>

<style>
	.form-checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 0.75rem;
		background-color: var(--color-ref-gray-50, #f9fafb);
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-radius: 0.5rem;
	}

	.form-checkbox-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		cursor: pointer;
		padding: 0.375rem;
		margin: -0.375rem;
		border-radius: 0.375rem;
		transition: background-color 0.15s;
	}

	.form-checkbox-item:hover {
		background-color: var(--color-ref-gray-100, #f3f4f6);
	}

	.form-checkbox__input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.form-checkbox__custom {
		width: 1.125rem;
		height: 1.125rem;
		border: 1.5px solid var(--color-ref-gray-300, #d1d5db);
		border-radius: 0.25rem;
		background-color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.form-checkbox__custom :global(svg) {
		width: 0.75rem;
		height: 0.75rem;
		color: #ffffff;
		opacity: 0;
		transform: scale(0.5);
		transition: all 0.15s;
	}

	.form-checkbox__input:checked + .form-checkbox__custom {
		background-color: var(--color-ref-blue-500, #3b82f6);
		border-color: var(--color-ref-blue-500, #3b82f6);
	}

	.form-checkbox__input:checked + .form-checkbox__custom :global(svg) {
		opacity: 1;
		transform: scale(1);
	}

	.form-checkbox__input:focus-visible + .form-checkbox__custom {
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.form-checkbox__label {
		font-size: 0.875rem;
		color: var(--color-ref-gray-700, #374151);
		line-height: 1.4;
	}
</style>

