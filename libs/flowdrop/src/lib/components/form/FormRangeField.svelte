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
    /** Whether the field is disabled (read-only) */
    disabled?: boolean;
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
    disabled = false,
    ariaDescribedBy,
    onChange,
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
      {disabled}
      aria-describedby={ariaDescribedBy}
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
      var(--fd-primary) 0%,
      var(--fd-primary) var(--progress, 0%),
      var(--fd-border) var(--progress, 0%),
      var(--fd-border) 100%
    );
    cursor: pointer;
    transition: background var(--fd-transition-fast);
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
      var(--fd-background) 0%,
      var(--fd-muted) 100%
    );
    border: 2px solid var(--fd-primary);
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
    background: var(--fd-border);
  }

  .form-range-field::-moz-range-progress {
    height: 6px;
    border-radius: 3px;
    background: var(--fd-primary);
  }

  /* Firefox - Thumb */
  .form-range-field::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      var(--fd-background) 0%,
      var(--fd-muted) 100%
    );
    border: 2px solid var(--fd-primary);
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
    font-size: var(--fd-text-xs);
    font-variant-numeric: tabular-nums;
  }

  .form-range-min,
  .form-range-max {
    color: var(--fd-muted-foreground);
    font-weight: 400;
  }

  .form-range-current {
    font-weight: 600;
    color: var(--fd-primary-hover);
    background-color: var(--fd-primary-muted);
    padding: 0.125rem 0.5rem;
    border-radius: var(--fd-radius-sm);
    min-width: 2.5rem;
    text-align: center;
  }
</style>
