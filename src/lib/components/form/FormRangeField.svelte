<!--
  FormRangeField Component
  Range slider input field for numeric values
  
  Features:
  - Modern styled range slider with custom track and thumb
  - Min/max/step support for value constraints
  - Real-time value display with tabular numeric font
  - Proper ARIA attributes for accessibility
  - Visual feedback for current value position
-->

<script lang="ts">
	interface Props {
		/** Field identifier */
		id: string;
		/** Current value */
		value: number | string;
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
		onChange: (value: number) => void;
	}

	let {
		id,
		value = 0,
		min = 0,
		max = 100,
		step = 1,
		required = false,
		ariaDescribedBy,
		onChange
	}: Props = $props();

	/**
	 * Compute the current numeric value
	 * Handles string values and defaults
	 */
	const numericValue = $derived.by((): number => {
		if (typeof value === "number") {
			return value;
		}
		const parsed = Number(value);
		return isNaN(parsed) ? min : parsed;
	});

	/**
	 * Compute the percentage position for the filled track
	 * Used to show visual progress of the slider
	 */
	const progressPercentage = $derived.by((): number => {
		const range = max - min;
		if (range === 0) return 0;
		return ((numericValue - min) / range) * 100;
	});

	/**
	 * Handle input changes
	 * Converts the value to a number and triggers onChange
	 */
	function handleInput(event: Event): void {
		const target = event.currentTarget as HTMLInputElement;
		const numValue = Number(target.value);
		onChange(numValue);
	}
</script>

<div class="form-range-container">
	<div class="form-range-slider">
		<input
			{id}
			type="range"
			class="form-range-field"
			value={numericValue}
			{min}
			{max}
			{step}
			aria-describedby={ariaDescribedBy}
			aria-required={required}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={numericValue}
			oninput={handleInput}
			style="--progress: {progressPercentage}%"
		/>
	</div>
	<div class="form-range-values">
		<span class="form-range-min">{min}</span>
		<span class="form-range-current">{numericValue}</span>
		<span class="form-range-max">{max}</span>
	</div>
</div>

<style>
	.form-range-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.form-range-slider {
		position: relative;
		width: 100%;
		padding: 0.25rem 0;
	}

	.form-range-field {
		width: 100%;
		height: 6px;
		border-radius: 3px;
		appearance: none;
		-webkit-appearance: none;
		background: linear-gradient(
			to right,
			var(--color-ref-blue-500, #3b82f6) 0%,
			var(--color-ref-blue-500, #3b82f6) var(--progress, 0%),
			var(--color-ref-gray-200, #e5e7eb) var(--progress, 0%),
			var(--color-ref-gray-200, #e5e7eb) 100%
		);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	/* Webkit (Chrome, Safari, Edge) - Track */
	.form-range-field::-webkit-slider-runnable-track {
		height: 6px;
		border-radius: 3px;
	}

	/* Webkit - Thumb */
	.form-range-field::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: linear-gradient(
			135deg,
			#ffffff 0%,
			var(--color-ref-gray-50, #f9fafb) 100%
		);
		border: 2px solid var(--color-ref-blue-500, #3b82f6);
		box-shadow:
			0 2px 6px rgba(59, 130, 246, 0.25),
			0 1px 2px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		margin-top: -6px;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.form-range-field::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow:
			0 4px 12px rgba(59, 130, 246, 0.35),
			0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.form-range-field:focus::-webkit-slider-thumb {
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.2),
			0 4px 12px rgba(59, 130, 246, 0.35);
	}

	/* Firefox - Track */
	.form-range-field::-moz-range-track {
		height: 6px;
		border-radius: 3px;
		background: var(--color-ref-gray-200, #e5e7eb);
	}

	.form-range-field::-moz-range-progress {
		height: 6px;
		border-radius: 3px;
		background: var(--color-ref-blue-500, #3b82f6);
	}

	/* Firefox - Thumb */
	.form-range-field::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: linear-gradient(
			135deg,
			#ffffff 0%,
			var(--color-ref-gray-50, #f9fafb) 100%
		);
		border: 2px solid var(--color-ref-blue-500, #3b82f6);
		box-shadow:
			0 2px 6px rgba(59, 130, 246, 0.25),
			0 1px 2px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.form-range-field::-moz-range-thumb:hover {
		transform: scale(1.1);
		box-shadow:
			0 4px 12px rgba(59, 130, 246, 0.35),
			0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.form-range-field:focus::-moz-range-thumb {
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.2),
			0 4px 12px rgba(59, 130, 246, 0.35);
	}

	/* Focus styles */
	.form-range-field:focus {
		outline: none;
	}

	.form-range-field:focus-visible {
		outline: none;
	}

	/* Value display row */
	.form-range-values {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}

	.form-range-min,
	.form-range-max {
		color: var(--color-ref-gray-400, #9ca3af);
		font-weight: 400;
	}

	.form-range-current {
		font-weight: 600;
		color: var(--color-ref-blue-600, #2563eb);
		background-color: var(--color-ref-blue-50, #eff6ff);
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		min-width: 2.5rem;
		text-align: center;
	}
</style>

