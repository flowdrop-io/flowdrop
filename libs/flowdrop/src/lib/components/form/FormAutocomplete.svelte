<!--
  FormAutocomplete Component
  Text input with autocomplete suggestions fetched from a callback URL
  
  Features:
  - Single or multiple selection support
  - Selected values displayed as removable tags with light blue background
  - Debounced fetching on input
  - Optional fetch on focus
  - Loading state indicator
  - Keyboard navigation (arrow keys, enter, escape, backspace to remove)
  - Click-away to close dropdown
  - Response mapping with labelField/valueField
  - Error handling with retry
  - Full accessibility support (ARIA combobox pattern)
  
  Usage:
  - For single selection: autocomplete.multiple = false (default)
  - For multiple selection: autocomplete.multiple = true
  - Selected values appear as tags with "x" button to remove
-->

<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import type { AutocompleteConfig, AuthProvider } from '$lib/types/index.js';
	import type { FieldOption } from './types.js';
	import { buildFetchHeaders } from '$lib/utils/fetchWithAuth.js';
	import { logger } from '../../utils/logger.js';

	/**
	 * Props interface for FormAutocomplete component
	 */
	interface Props {
		/** Field identifier */
		id: string;
		/** Current selected value (string for single, string[] for multiple) */
		value: string | string[];
		/** Autocomplete configuration */
		autocomplete: AutocompleteConfig;
		/** Whether the field is required */
		required?: boolean;
		/** Placeholder text */
		placeholder?: string;
		/** Whether the field is disabled */
		disabled?: boolean;
		/** ARIA description ID */
		ariaDescribedBy?: string;
		/** Callback when value changes */
		onChange: (value: string | string[]) => void;
	}

	let {
		id,
		value = '',
		autocomplete,
		required = false,
		placeholder = '',
		disabled = false,
		ariaDescribedBy,
		onChange
	}: Props = $props();

	// Get AuthProvider and baseUrl from context via getter functions
	// This pattern ensures we always get the current value, even if props change after mount
	const getAuthProvider = getContext<(() => AuthProvider | undefined) | undefined>(
		'flowdrop:getAuthProvider'
	);
	const getBaseUrl = getContext<(() => string) | undefined>('flowdrop:getBaseUrl');

	// Configuration with defaults
	const queryParam = $derived(autocomplete.queryParam ?? 'q');
	const minChars = $derived(autocomplete.minChars ?? 0);
	const debounceMs = $derived(autocomplete.debounceMs ?? 300);
	const fetchOnFocus = $derived(autocomplete.fetchOnFocus ?? false);
	const labelField = $derived(autocomplete.labelField ?? 'label');
	const valueField = $derived(autocomplete.valueField ?? 'value');
	const allowFreeText = $derived(autocomplete.allowFreeText ?? false);
	const multiple = $derived(autocomplete.multiple ?? false);

	// Component state
	let inputElement: HTMLInputElement | undefined = $state(undefined);
	let containerElement: HTMLDivElement | undefined = $state(undefined);
	let popoverElement: HTMLDivElement | undefined = $state(undefined);
	let inputValue = $state('');
	let suggestions = $state<FieldOption[]>([]);
	let isOpen = $state(false);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let highlightedIndex = $state(-1);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let abortController: AbortController | null = null;

	// Popover positioning style
	let popoverStyle = $state('');

	// Cache of value-to-label mappings for selected items
	let labelCache = $state<Map<string, string>>(new Map());

	// Generate unique IDs for accessibility
	// svelte-ignore state_referenced_locally — id prop never changes
	const listboxId = `${id}-listbox`;
	// svelte-ignore state_referenced_locally
	const getOptionId = (index: number): string => `${id}-option-${index}`;

	/**
	 * Get the selected values as an array (normalizes single/multiple)
	 */
	const selectedValues = $derived<string[]>(
		multiple
			? Array.isArray(value)
				? value
				: value
					? [String(value)]
					: []
			: value
				? [String(value)]
				: []
	);

	/**
	 * Check if a value is selected
	 */
	function isSelected(optionValue: string): boolean {
		return selectedValues.includes(optionValue);
	}

	/**
	 * Get display label for a selected value
	 */
	function getDisplayLabel(val: string): string {
		// Check cache first
		if (labelCache.has(val)) {
			return labelCache.get(val) ?? val;
		}
		// Check current suggestions
		const match = suggestions.find((s) => s.value === val);
		if (match) {
			labelCache.set(val, match.label);
			return match.label;
		}
		// Return value as fallback
		return val;
	}

	/**
	 * Build the full URL for fetching suggestions
	 * @param query - The search query
	 * @returns Full URL with query parameter
	 */
	function buildUrl(query: string): string {
		const baseUrl = getBaseUrl?.() ?? '';
		const url = autocomplete.url.startsWith('http')
			? autocomplete.url
			: `${baseUrl}${autocomplete.url}`;

		const separator = url.includes('?') ? '&' : '?';
		return `${url}${separator}${encodeURIComponent(queryParam)}=${encodeURIComponent(query)}`;
	}

	/**
	 * Map API response to FieldOption array
	 * @param data - Response data from API
	 * @returns Array of FieldOption objects
	 */
	function mapResponse(data: unknown): FieldOption[] {
		if (!Array.isArray(data)) {
			logger.warn('[FormAutocomplete] Response is not an array:', data);
			return [];
		}

		return data.map((item: Record<string, unknown>) => ({
			label: String(item[labelField] ?? item[valueField] ?? ''),
			value: String(item[valueField] ?? '')
		}));
	}

	/**
	 * Fetch suggestions from the callback URL
	 * @param query - The search query
	 */
	async function fetchSuggestions(query: string): Promise<void> {
		// Cancel any pending request
		if (abortController) {
			abortController.abort();
		}

		// Check minimum characters requirement
		if (query.length < minChars && query.length > 0) {
			suggestions = [];
			return;
		}

		isLoading = true;
		error = null;
		abortController = new AbortController();

		try {
			// Build headers with authentication (call getter to get current value)
			const headers = await buildFetchHeaders(getAuthProvider?.());

			// Fetch with timeout
			const timeoutId = setTimeout(() => {
				abortController?.abort();
			}, 5000);

			const response = await fetch(buildUrl(query), {
				method: 'GET',
				headers,
				signal: abortController.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			const mapped = mapResponse(data);

			// Update label cache with fetched suggestions
			mapped.forEach((opt) => {
				labelCache.set(opt.value, opt.label);
			});

			suggestions = mapped;
			highlightedIndex = -1;
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				// Request was cancelled, ignore
				return;
			}
			logger.error('[FormAutocomplete] Fetch error:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch suggestions';
			suggestions = [];
		} finally {
			isLoading = false;
			abortController = null;
		}
	}

	/**
	 * Debounced fetch for input changes
	 * @param query - The search query
	 */
	function debouncedFetch(query: string): void {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			fetchSuggestions(query);
		}, debounceMs);
	}

	/**
	 * Handle input value changes
	 * @param event - Input event
	 */
	function handleInput(event: Event): void {
		const target = event.currentTarget as HTMLInputElement;
		inputValue = target.value;

		// Open dropdown
		showDropdown();

		// If allowFreeText and single mode, update the value immediately
		if (allowFreeText && !multiple) {
			onChange(inputValue);
		}

		// Fetch suggestions with debounce
		debouncedFetch(inputValue);
	}

	/**
	 * Handle input focus
	 */
	function handleFocus(): void {
		if (fetchOnFocus && suggestions.length === 0 && !isLoading) {
			fetchSuggestions(inputValue);
		}
		showDropdown();
	}

	/**
	 * Handle input blur
	 * Delayed to allow click events on options to fire first
	 */
	function handleBlur(): void {
		setTimeout(() => {
			hideDropdown();

			// If not allowFreeText and single mode, validate the input
			if (!allowFreeText && !multiple && inputValue !== '') {
				const currentVal = selectedValues;
				const matchingSuggestion = suggestions.find(
					(s) => s.value === currentVal[0] || s.label.toLowerCase() === inputValue.toLowerCase()
				);
				if (!matchingSuggestion && currentVal.length === 0) {
					inputValue = '';
				}
			}
		}, 200);
	}

	/**
	 * Handle option selection
	 * @param option - Selected option
	 */
	function selectOption(option: FieldOption): void {
		// Update label cache
		labelCache.set(option.value, option.label);

		if (multiple) {
			const current = selectedValues;
			if (current.includes(option.value)) {
				// Remove if already selected
				const newValues = current.filter((v) => v !== option.value);
				onChange(newValues);
			} else {
				// Add to selection
				const newValues = [...current, option.value];
				onChange(newValues);
			}
			// Clear input and keep dropdown open for more selections
			inputValue = '';
			inputElement?.focus();
		} else {
			// Single selection mode
			inputValue = '';
			onChange(option.value);
			hideDropdown();
		}
		highlightedIndex = -1;
	}

	/**
	 * Remove a selected tag
	 * @param valueToRemove - The value to remove
	 */
	function removeTag(valueToRemove: string): void {
		if (disabled) return;

		if (multiple) {
			const current = selectedValues;
			const newValues = current.filter((v) => v !== valueToRemove);
			onChange(newValues);
		} else {
			onChange('');
		}
		inputElement?.focus();
	}

	/**
	 * Handle keyboard navigation
	 * @param event - Keyboard event
	 */
	function handleKeydown(event: KeyboardEvent): void {
		// Handle backspace to remove last tag in multiple mode
		if (event.key === 'Backspace' && inputValue === '' && selectedValues.length > 0) {
			event.preventDefault();
			const current = selectedValues;
			if (multiple) {
				const newValues = current.slice(0, -1);
				onChange(newValues);
			} else {
				onChange('');
			}
			return;
		}

		if (!isOpen && event.key !== 'ArrowDown' && event.key !== 'Enter') {
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) {
					showDropdown();
					if (fetchOnFocus && suggestions.length === 0) {
						fetchSuggestions(inputValue);
					}
				} else {
					highlightedIndex = Math.min(highlightedIndex + 1, suggestions.length - 1);
				}
				break;

			case 'ArrowUp':
				event.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, -1);
				break;

			case 'Enter':
				event.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
					selectOption(suggestions[highlightedIndex]);
				} else if (allowFreeText && inputValue !== '') {
					if (multiple) {
						const current = selectedValues;
						if (!current.includes(inputValue)) {
							onChange([...current, inputValue]);
						}
						inputValue = '';
					} else {
						onChange(inputValue);
						hideDropdown();
					}
				}
				break;

			case 'Escape':
				event.preventDefault();
				hideDropdown();
				highlightedIndex = -1;
				break;

			case 'Tab':
				// Allow tab to close dropdown naturally
				hideDropdown();
				break;
		}
	}

	/**
	 * Retry failed fetch
	 */
	function handleRetry(): void {
		error = null;
		fetchSuggestions(inputValue);
	}

	/**
	 * Clear all selections
	 */
	function handleClearAll(): void {
		inputValue = '';
		onChange(multiple ? [] : '');
		suggestions = [];
		inputElement?.focus();
	}

	/**
	 * Sync label cache when value prop changes externally
	 */
	$effect(() => {
		// When value changes, try to find labels from suggestions
		const vals = selectedValues;
		vals.forEach((val) => {
			if (!labelCache.has(val)) {
				const match = suggestions.find((s) => s.value === val);
				if (match) {
					labelCache.set(val, match.label);
				}
			}
		});
	});

	/**
	 * Calculate popover position relative to viewport
	 * Popover API renders in top layer, bypassing all stacking contexts
	 */
	function updatePopoverPosition(): void {
		if (!containerElement) return;

		const rect = containerElement.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const maxDropdownHeight = 240; // 15rem in pixels approximately
		const spaceBelow = viewportHeight - rect.bottom;
		const spaceAbove = rect.top;

		const left = rect.left;
		const width = rect.width;

		if (spaceBelow < maxDropdownHeight && spaceAbove > spaceBelow) {
			// Position above the input
			const bottom = viewportHeight - rect.top + 4;
			const maxHeight = Math.min(spaceAbove - 8, maxDropdownHeight);
			popoverStyle = `bottom: ${bottom}px; left: ${left}px; width: ${width}px; max-height: ${maxHeight}px;`;
		} else {
			// Position below the input (default)
			const top = rect.bottom + 4;
			const maxHeight = Math.min(spaceBelow - 8, maxDropdownHeight);
			popoverStyle = `top: ${top}px; left: ${left}px; width: ${width}px; max-height: ${maxHeight}px;`;
		}
	}

	/**
	 * Show the popover dropdown
	 */
	function showDropdown(): void {
		if (!popoverElement || disabled) return;

		updatePopoverPosition();

		try {
			popoverElement.showPopover();
			isOpen = true;
		} catch {
			// Fallback for browsers without popover support - just set isOpen
			isOpen = true;
		}
	}

	/**
	 * Hide the popover dropdown
	 */
	function hideDropdown(): void {
		if (!popoverElement) return;

		try {
			popoverElement.hidePopover();
		} catch {
			// Fallback for browsers without popover support
		}
		isOpen = false;
	}

	/**
	 * Effect to update popover position on scroll/resize when open
	 */
	$effect(() => {
		if (isOpen && containerElement) {
			const handlePositionUpdate = (): void => {
				updatePopoverPosition();
			};

			window.addEventListener('scroll', handlePositionUpdate, true);
			window.addEventListener('resize', handlePositionUpdate);

			return () => {
				window.removeEventListener('scroll', handlePositionUpdate, true);
				window.removeEventListener('resize', handlePositionUpdate);
			};
		}
	});

	/**
	 * Cleanup on unmount
	 */
	onMount(() => {
		return () => {
			// Cleanup debounce timer
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
			// Cleanup abort controller
			if (abortController) {
				abortController.abort();
			}
		};
	});
</script>

<div
	bind:this={containerElement}
	class="form-autocomplete"
	class:form-autocomplete--disabled={disabled}
	class:form-autocomplete--multiple={multiple}
	class:form-autocomplete--has-value={selectedValues.length > 0}
>
	<!-- Main input container styled like a textfield/textarea -->
	<div
		class="form-autocomplete__field"
		class:form-autocomplete__field--focused={isOpen}
		onclick={() => inputElement?.focus()}
		onkeydown={() => {}}
		role="presentation"
	>
		<!-- Selected tags -->
		{#if selectedValues.length > 0}
			<div class="form-autocomplete__tags">
				{#each selectedValues as selectedVal (selectedVal)}
					<span class="form-autocomplete__tag">
						<span class="form-autocomplete__tag-label">{getDisplayLabel(selectedVal)}</span>
						{#if !disabled}
							<button
								type="button"
								class="form-autocomplete__tag-remove"
								aria-label={`Remove ${getDisplayLabel(selectedVal)}`}
								onclick={(e) => {
									e.stopPropagation();
									removeTag(selectedVal);
								}}
								tabindex={-1}
							>
								<Icon icon="heroicons:x-mark" />
							</button>
						{/if}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Input area -->
		<div class="form-autocomplete__input-area">
			<input
				bind:this={inputElement}
				type="text"
				{id}
				class="form-autocomplete__input"
				value={inputValue}
				placeholder={selectedValues.length === 0 ? placeholder : ''}
				{disabled}
				aria-required={required}
				aria-describedby={ariaDescribedBy}
				role="combobox"
				aria-expanded={isOpen}
				aria-controls={listboxId}
				aria-activedescendant={highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined}
				aria-autocomplete="list"
				autocomplete="off"
				oninput={handleInput}
				onfocus={handleFocus}
				onblur={handleBlur}
				onkeydown={handleKeydown}
			/>
		</div>

		<!-- Status icons -->
		<div class="form-autocomplete__icons">
			{#if isLoading}
				<span class="form-autocomplete__spinner" aria-label="Loading suggestions">
					<Icon icon="heroicons:arrow-path" />
				</span>
			{:else if selectedValues.length > 0 && !disabled}
				<button
					type="button"
					class="form-autocomplete__clear"
					aria-label="Clear all selections"
					onclick={(e) => {
						e.stopPropagation();
						handleClearAll();
					}}
					tabindex={-1}
				>
					<Icon icon="heroicons:x-mark" />
				</button>
			{:else}
				<span class="form-autocomplete__chevron" aria-hidden="true">
					<Icon icon="heroicons:chevron-down" />
				</span>
			{/if}
		</div>
	</div>

	<!-- Dropdown popover (uses Popover API to render in top layer, bypassing stacking contexts) -->
	<!-- svelte-ignore a11y_no_static_element_interactions — role="presentation" container; onmousedown prevents focus loss from input -->
	<div
		bind:this={popoverElement}
		id={listboxId}
		class="form-autocomplete__popover"
		popover="manual"
		role="presentation"
		style={popoverStyle}
		onmousedown={(e) => e.preventDefault()}
	>
		<ul class="form-autocomplete__listbox" role="listbox" aria-label="Suggestions">
			{#if isLoading}
				<li class="form-autocomplete__status form-autocomplete__status--loading">
					<Icon icon="heroicons:arrow-path" class="form-autocomplete__status-icon" />
					<span>Loading suggestions...</span>
				</li>
			{:else if error}
				<li class="form-autocomplete__status form-autocomplete__status--error">
					<Icon icon="heroicons:exclamation-triangle" class="form-autocomplete__status-icon" />
					<span>{error}</span>
					<button type="button" class="form-autocomplete__retry" onclick={handleRetry}>
						Retry
					</button>
				</li>
			{:else if suggestions.length === 0}
				<li class="form-autocomplete__status form-autocomplete__status--empty">
					<Icon icon="heroicons:magnifying-glass" class="form-autocomplete__status-icon" />
					<span>No results found</span>
				</li>
			{:else}
				{#each suggestions as option, index (option.value)}
					<!-- svelte-ignore a11y_click_events_have_key_events — WAI-ARIA combobox: keyboard nav handled on input, not individual options -->
					<li
						id={getOptionId(index)}
						class="form-autocomplete__option"
						class:form-autocomplete__option--highlighted={index === highlightedIndex}
						class:form-autocomplete__option--selected={isSelected(option.value)}
						role="option"
						aria-selected={isSelected(option.value)}
						onmouseenter={() => (highlightedIndex = index)}
						onclick={() => selectOption(option)}
					>
						<span class="form-autocomplete__option-label">{option.label}</span>
						{#if isSelected(option.value)}
							<Icon icon="heroicons:check" class="form-autocomplete__option-check" />
						{/if}
					</li>
				{/each}
			{/if}
		</ul>
	</div>
</div>

<style>
	.form-autocomplete {
		position: relative;
		width: 100%;
	}

	.form-autocomplete--disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	/* Field container styled like a textfield */
	.form-autocomplete__field {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--fd-space-3xs);
		min-height: 2.625rem;
		padding: var(--fd-space-3xs) 2.5rem var(--fd-space-3xs) var(--fd-space-md);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		font-size: var(--fd-text-sm);
		font-family: inherit;
		color: var(--fd-foreground);
		background-color: var(--fd-muted);
		transition: all var(--fd-transition-normal);
		box-shadow: var(--fd-shadow-sm);
		cursor: text;
		position: relative;
	}

	.form-autocomplete__field:hover {
		border-color: var(--fd-border-strong);
		background-color: var(--fd-background);
	}

	.form-autocomplete__field--focused {
		border-color: var(--fd-primary);
		background-color: var(--fd-background);
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			var(--fd-shadow-sm);
	}

	/* Multiple mode - textarea-like styling */
	.form-autocomplete--multiple .form-autocomplete__field {
		min-height: 3rem;
		align-content: flex-start;
	}

	/* Tags container */
	.form-autocomplete__tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--fd-space-3xs);
		align-items: center;
	}

	/* Individual tag - selected item chip */
	.form-autocomplete__tag {
		display: inline-flex;
		align-items: center;
		gap: var(--fd-space-3xs);
		padding: var(--fd-space-3xs) var(--fd-space-3xs) var(--fd-space-3xs) var(--fd-space-xs);
		background-color: var(--fd-primary-muted);
		border: 1px solid var(--fd-primary-muted);
		border-radius: var(--fd-radius-md);
		font-size: 0.8125rem;
		color: var(--fd-primary-hover);
		line-height: 1.2;
		max-width: 100%;
	}

	.form-autocomplete__tag-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 12rem;
	}

	.form-autocomplete__tag-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.125rem;
		margin-left: 0.125rem;
		border: none;
		border-radius: var(--fd-radius-sm);
		background: transparent;
		color: var(--fd-primary);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
		flex-shrink: 0;
	}

	.form-autocomplete__tag-remove:hover {
		background-color: var(--fd-primary-muted);
		color: var(--fd-primary-hover);
	}

	.form-autocomplete__tag-remove :global(svg) {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Input area */
	.form-autocomplete__input-area {
		flex: 1;
		min-width: 4rem;
		display: flex;
		align-items: center;
	}

	.form-autocomplete__input {
		width: 100%;
		padding: var(--fd-space-3xs) 0;
		border: none;
		outline: none;
		font-size: var(--fd-text-sm);
		font-family: inherit;
		color: var(--fd-foreground);
		background-color: transparent;
	}

	.form-autocomplete__input::placeholder {
		color: var(--fd-muted-foreground);
	}

	/* Status icons */
	.form-autocomplete__icons {
		position: absolute;
		right: var(--fd-space-xs);
		top: 0.625rem;
		display: flex;
		align-items: center;
		gap: var(--fd-space-3xs);
	}

	.form-autocomplete__chevron,
	.form-autocomplete__spinner {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--fd-muted-foreground);
		pointer-events: none;
	}

	.form-autocomplete__chevron :global(svg),
	.form-autocomplete__spinner :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.form-autocomplete__spinner {
		animation: autocomplete-spin 1s linear infinite;
	}

	@keyframes autocomplete-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.form-autocomplete__clear {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--fd-space-3xs);
		border: none;
		border-radius: var(--fd-radius-sm);
		background: transparent;
		color: var(--fd-muted-foreground);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
	}

	.form-autocomplete__clear:hover {
		background-color: var(--fd-muted);
		color: var(--fd-foreground);
	}

	.form-autocomplete__clear :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	/* Popover container - renders in top layer via Popover API */
	.form-autocomplete__popover {
		position: fixed;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		overflow: visible;
	}

	/* Reset default popover styles */
	.form-autocomplete__popover:popover-open {
		display: block;
	}

	/* Dropdown listbox inside popover */
	.form-autocomplete__listbox {
		margin: 0;
		padding: var(--fd-space-3xs);
		list-style: none;
		background-color: var(--fd-background);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		box-shadow: var(--fd-shadow-lg);
		overflow-y: auto;
		max-height: inherit;
	}

	.form-autocomplete__option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--fd-space-xs) var(--fd-space-md);
		border-radius: var(--fd-radius-md);
		cursor: pointer;
		transition: background-color var(--fd-transition-fast);
	}

	.form-autocomplete__option:hover,
	.form-autocomplete__option--highlighted {
		background-color: var(--fd-muted);
	}

	.form-autocomplete__option--selected {
		background-color: var(--fd-primary-muted);
	}

	.form-autocomplete__option--highlighted.form-autocomplete__option--selected {
		background-color: var(--fd-primary-muted);
	}

	.form-autocomplete__option-label {
		font-size: var(--fd-text-sm);
		color: var(--fd-foreground);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.form-autocomplete__option :global(.form-autocomplete__option-check) {
		width: 1rem;
		height: 1rem;
		color: var(--fd-primary);
		flex-shrink: 0;
		margin-left: var(--fd-space-xs);
	}

	/* Status messages */
	.form-autocomplete__status {
		display: flex;
		align-items: center;
		gap: var(--fd-space-xs);
		padding: var(--fd-space-md);
		font-size: var(--fd-text-sm);
		color: var(--fd-muted-foreground);
	}

	.form-autocomplete__status--loading {
		color: var(--fd-primary);
	}

	.form-autocomplete__status--error {
		color: var(--fd-error);
		flex-wrap: wrap;
	}

	.form-autocomplete__status--empty {
		color: var(--fd-muted-foreground);
	}

	.form-autocomplete__status :global(.form-autocomplete__status-icon) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.form-autocomplete__status--loading :global(.form-autocomplete__status-icon) {
		animation: autocomplete-spin 1s linear infinite;
	}

	.form-autocomplete__retry {
		margin-left: auto;
		padding: var(--fd-space-3xs) var(--fd-space-xs);
		border: 1px solid var(--fd-error);
		border-radius: var(--fd-radius-sm);
		background-color: transparent;
		color: var(--fd-error);
		font-size: var(--fd-text-xs);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--fd-transition-fast);
	}

	.form-autocomplete__retry:hover {
		background-color: var(--fd-error-muted);
	}
</style>
