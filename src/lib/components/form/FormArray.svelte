<!--
  FormArray Component
  Dynamic array field that allows adding, removing, and reordering items
  Generates sub-forms for each item based on the schema's items property
  
  Features:
  - Add/remove items with animated transitions
  - Supports simple types (string, number, boolean) and complex types (objects)
  - Recursively uses FormField for item rendering
  - Drag handle for future reordering support
  - Collapsible items for complex object arrays
  - Empty state with helpful prompt
  
  Accessibility:
  - Proper ARIA labels for add/remove buttons
  - Keyboard navigation support
  - Screen reader friendly item descriptions
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { FieldSchema } from './types.js';

	interface Props {
		/** Field identifier */
		id: string;
		/** Current array value */
		value: unknown[];
		/** Schema for array items */
		itemSchema: FieldSchema;
		/** Minimum number of items required */
		minItems?: number;
		/** Maximum number of items allowed */
		maxItems?: number;
		/** Label for add button */
		addLabel?: string;
		/** Whether the field is disabled */
		disabled?: boolean;
		/** Callback when value changes */
		onChange: (value: unknown[]) => void;
	}

	let {
		id,
		value = [],
		itemSchema,
		minItems = 0,
		maxItems,
		addLabel = 'Add Item',
		disabled = false,
		onChange
	}: Props = $props();

	/**
	 * Ensure value is always an array
	 */
	const items = $derived(Array.isArray(value) ? value : []);

	/**
	 * Check if we can add more items
	 */
	const canAddItem = $derived(maxItems === undefined || items.length < maxItems);

	/**
	 * Check if we can remove items
	 */
	const canRemoveItem = $derived(items.length > minItems);

	/**
	 * Determine if items are simple (primitive) or complex (objects)
	 */
	const isSimpleType = $derived(
		itemSchema.type === 'string' ||
			itemSchema.type === 'number' ||
			itemSchema.type === 'integer' ||
			itemSchema.type === 'boolean'
	);

	/**
	 * Get the default value for a new item based on schema
	 */
	function getDefaultValue(): unknown {
		if (itemSchema.default !== undefined) {
			return itemSchema.default;
		}

		switch (itemSchema.type) {
			case 'string':
				return '';
			case 'number':
			case 'integer':
				return 0;
			case 'boolean':
				return false;
			case 'object':
				// Create default object from properties
				if (itemSchema.properties) {
					const defaultObj: Record<string, unknown> = {};
					Object.entries(itemSchema.properties).forEach(([key, propSchema]) => {
						if (propSchema.default !== undefined) {
							defaultObj[key] = propSchema.default;
						} else {
							defaultObj[key] = getDefaultForType(propSchema.type);
						}
					});
					return defaultObj;
				}
				return {};
			case 'array':
				return [];
			default:
				return '';
		}
	}

	/**
	 * Get default value for a specific type
	 */
	function getDefaultForType(type: string | undefined): unknown {
		switch (type) {
			case 'string':
				return '';
			case 'number':
			case 'integer':
				return 0;
			case 'boolean':
				return false;
			case 'object':
				return {};
			case 'array':
				return [];
			default:
				return '';
		}
	}

	/**
	 * Add a new item to the array
	 */
	function addItem(): void {
		if (!canAddItem || disabled) return;
		const newValue = [...items, getDefaultValue()];
		onChange(newValue);
	}

	/**
	 * Remove an item at the specified index
	 */
	function removeItem(index: number): void {
		if (!canRemoveItem || disabled) return;
		const newValue = items.filter((_, i) => i !== index);
		onChange(newValue);
	}

	/**
	 * Update an item at the specified index
	 */
	function updateItem(index: number, newItemValue: unknown): void {
		const newValue = items.map((item, i) => (i === index ? newItemValue : item));
		onChange(newValue);
	}

	/**
	 * Update a property of an object item
	 */
	function updateObjectProperty(index: number, propertyKey: string, propertyValue: unknown): void {
		const currentItem = items[index] as Record<string, unknown>;
		const updatedItem = { ...currentItem, [propertyKey]: propertyValue };
		updateItem(index, updatedItem);
	}

	/**
	 * Move an item up in the array
	 */
	function moveItemUp(index: number): void {
		if (index === 0 || disabled) return;
		const newValue = [...items];
		[newValue[index - 1], newValue[index]] = [newValue[index], newValue[index - 1]];
		onChange(newValue);
	}

	/**
	 * Move an item down in the array
	 */
	function moveItemDown(index: number): void {
		if (index === items.length - 1 || disabled) return;
		const newValue = [...items];
		[newValue[index], newValue[index + 1]] = [newValue[index + 1], newValue[index]];
		onChange(newValue);
	}

	/**
	 * Get item label for display
	 */
	function getItemLabel(index: number, item: unknown): string {
		if (isSimpleType) {
			const itemStr = String(item);
			return itemStr.length > 30
				? `${itemStr.substring(0, 30)}...`
				: itemStr || `Item ${index + 1}`;
		}

		// For objects, try to find a name/label/title property
		if (typeof item === 'object' && item !== null) {
			const obj = item as Record<string, unknown>;
			const labelKey = Object.keys(obj).find((k) =>
				['name', 'label', 'title', 'id'].includes(k.toLowerCase())
			);
			if (labelKey && obj[labelKey]) {
				return String(obj[labelKey]);
			}
		}

		return `Item ${index + 1}`;
	}

	/**
	 * Track collapsed state for complex items
	 */
	let collapsedItems = $state<Set<number>>(new Set());

	/**
	 * Toggle collapsed state for an item
	 */
	function toggleCollapse(index: number): void {
		const newCollapsed = new Set(collapsedItems);
		if (newCollapsed.has(index)) {
			newCollapsed.delete(index);
		} else {
			newCollapsed.add(index);
		}
		collapsedItems = newCollapsed;
	}

	/**
	 * Check if an item is collapsed
	 */
	function isCollapsed(index: number): boolean {
		return collapsedItems.has(index);
	}
</script>

<div class="form-array" class:form-array--disabled={disabled}>
	<!-- Array Items -->
	{#if items.length > 0}
		<div class="form-array__items">
			{#each items as item, index (index)}
				<div
					class="form-array__item"
					class:form-array__item--simple={isSimpleType}
					class:form-array__item--complex={!isSimpleType}
					style="animation-delay: {index * 50}ms"
				>
					<!-- Item Header -->
					<div class="form-array__item-header">
						<!-- Item index/label -->
						{#if !isSimpleType}
							<button
								type="button"
								class="form-array__item-toggle"
								onclick={() => toggleCollapse(index)}
								aria-expanded={!isCollapsed(index)}
								aria-label={isCollapsed(index) ? 'Expand item' : 'Collapse item'}
							>
								<Icon
									icon={isCollapsed(index) ? 'heroicons:chevron-right' : 'heroicons:chevron-down'}
									class="form-array__toggle-icon"
								/>
								<span class="form-array__item-label">{getItemLabel(index, item)}</span>
							</button>
						{:else}
							<span class="form-array__item-number">#{index + 1}</span>
						{/if}

						<!-- Action buttons group -->
						<div class="form-array__actions">
							<!-- Move Up button -->
							<button
								type="button"
								class="form-array__action-btn form-array__action-btn--move"
								onclick={() => moveItemUp(index)}
								disabled={index === 0 || disabled}
								aria-label="Move item {index + 1} up"
								title="Move up"
							>
								<Icon icon="heroicons:arrow-up" />
							</button>

							<!-- Move Down button -->
							<button
								type="button"
								class="form-array__action-btn form-array__action-btn--move"
								onclick={() => moveItemDown(index)}
								disabled={index === items.length - 1 || disabled}
								aria-label="Move item {index + 1} down"
								title="Move down"
							>
								<Icon icon="heroicons:arrow-down" />
							</button>

							<!-- Delete button -->
							<button
								type="button"
								class="form-array__action-btn form-array__action-btn--delete"
								onclick={() => removeItem(index)}
								disabled={!canRemoveItem || disabled}
								aria-label="Delete item {index + 1}"
								title="Delete item"
							>
								<Icon icon="heroicons:trash" />
							</button>
						</div>
					</div>

					<!-- Item Content -->
					<div
						class="form-array__item-content"
						class:form-array__item-content--collapsed={!isSimpleType && isCollapsed(index)}
					>
						{#if isSimpleType}
							<!-- Simple type: render inline input -->
							{#if itemSchema.type === 'string'}
								{#if itemSchema.format === 'multiline'}
									<textarea
										class="form-array__input form-array__textarea"
										value={String(item ?? '')}
										placeholder={itemSchema.placeholder ?? ''}
										rows={3}
										oninput={(e) => updateItem(index, e.currentTarget.value)}
										{disabled}
									></textarea>
								{:else}
									<input
										type="text"
										class="form-array__input"
										value={String(item ?? '')}
										placeholder={itemSchema.placeholder ?? ''}
										oninput={(e) => updateItem(index, e.currentTarget.value)}
										{disabled}
									/>
								{/if}
							{:else if itemSchema.type === 'number' || itemSchema.type === 'integer'}
								<input
									type="number"
									class="form-array__input form-array__input--number"
									value={item as number}
									placeholder={itemSchema.placeholder ?? ''}
									min={itemSchema.minimum}
									max={itemSchema.maximum}
									oninput={(e) => {
										const val = e.currentTarget.value;
										updateItem(index, val === '' ? '' : Number(val));
									}}
									{disabled}
								/>
							{:else if itemSchema.type === 'boolean'}
								<label class="form-array__toggle-wrapper">
									<input
										type="checkbox"
										class="form-array__checkbox-input"
										checked={Boolean(item)}
										onchange={(e) => updateItem(index, e.currentTarget.checked)}
										{disabled}
									/>
									<span class="form-array__toggle-track">
										<span class="form-array__toggle-thumb"></span>
									</span>
									<span class="form-array__toggle-label">
										{item ? 'Yes' : 'No'}
									</span>
								</label>
							{:else if itemSchema.enum}
								<!-- Enum: render select -->
								<select
									class="form-array__select"
									value={String(item ?? '')}
									onchange={(e) => updateItem(index, e.currentTarget.value)}
									{disabled}
								>
									{#each itemSchema.enum as option}
										<option value={String(option)}>{String(option)}</option>
									{/each}
								</select>
							{:else}
								<!-- Fallback to text -->
								<input
									type="text"
									class="form-array__input"
									value={String(item ?? '')}
									placeholder={itemSchema.placeholder ?? ''}
									oninput={(e) => updateItem(index, e.currentTarget.value)}
									{disabled}
								/>
							{/if}
						{:else if itemSchema.type === 'object' && itemSchema.properties}
							<!-- Complex type: render sub-form for object properties -->
							{#if !isCollapsed(index)}
								<div class="form-array__subform">
									{#each Object.entries(itemSchema.properties) as [propKey, propSchema], propIndex (propKey)}
										{@const propValue = (item as Record<string, unknown>)?.[propKey]}
										{@const isRequired = itemSchema.required?.includes(propKey) ?? false}
										{@const propFieldSchema = propSchema as FieldSchema}

										<div
											class="form-array__subform-field"
											style="animation-delay: {propIndex * 20}ms"
										>
											<label class="form-array__subform-label" for="{id}-{index}-{propKey}">
												<span class="form-array__subform-label-text">
													{propFieldSchema.title ?? propKey}
												</span>
												{#if isRequired}
													<span class="form-array__required">*</span>
												{/if}
											</label>

											<div class="form-array__subform-input">
												{#if propFieldSchema.enum}
													<select
														id="{id}-{index}-{propKey}"
														class="form-array__select"
														value={String(propValue ?? '')}
														onchange={(e) =>
															updateObjectProperty(index, propKey, e.currentTarget.value)}
														{disabled}
													>
														{#each propFieldSchema.enum as option}
															<option value={String(option)}>{String(option)}</option>
														{/each}
													</select>
												{:else if propFieldSchema.type === 'string' && propFieldSchema.format === 'multiline'}
													<textarea
														id="{id}-{index}-{propKey}"
														class="form-array__input form-array__textarea"
														value={String(propValue ?? '')}
														placeholder={propFieldSchema.placeholder ?? ''}
														rows={3}
														oninput={(e) =>
															updateObjectProperty(index, propKey, e.currentTarget.value)}
														{disabled}
													></textarea>
												{:else if propFieldSchema.type === 'string'}
													<input
														id="{id}-{index}-{propKey}"
														type="text"
														class="form-array__input"
														value={String(propValue ?? '')}
														placeholder={propFieldSchema.placeholder ?? ''}
														oninput={(e) =>
															updateObjectProperty(index, propKey, e.currentTarget.value)}
														{disabled}
													/>
												{:else if propFieldSchema.type === 'number' || propFieldSchema.type === 'integer'}
													<input
														id="{id}-{index}-{propKey}"
														type="number"
														class="form-array__input form-array__input--number"
														value={propValue as number}
														placeholder={propFieldSchema.placeholder ?? ''}
														min={propFieldSchema.minimum}
														max={propFieldSchema.maximum}
														oninput={(e) => {
															const val = e.currentTarget.value;
															updateObjectProperty(index, propKey, val === '' ? '' : Number(val));
														}}
														{disabled}
													/>
												{:else if propFieldSchema.type === 'boolean'}
													<label class="form-array__toggle-wrapper">
														<input
															id="{id}-{index}-{propKey}"
															type="checkbox"
															class="form-array__checkbox-input"
															checked={Boolean(propValue)}
															onchange={(e) =>
																updateObjectProperty(index, propKey, e.currentTarget.checked)}
															{disabled}
														/>
														<span class="form-array__toggle-track">
															<span class="form-array__toggle-thumb"></span>
														</span>
														<span class="form-array__toggle-label">
															{propValue ? 'Yes' : 'No'}
														</span>
													</label>
												{:else}
													<input
														id="{id}-{index}-{propKey}"
														type="text"
														class="form-array__input"
														value={String(propValue ?? '')}
														placeholder={propFieldSchema.placeholder ?? ''}
														oninput={(e) =>
															updateObjectProperty(index, propKey, e.currentTarget.value)}
														{disabled}
													/>
												{/if}
											</div>

											{#if propFieldSchema.description && propFieldSchema.title}
												<p class="form-array__subform-description">{propFieldSchema.description}</p>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						{:else}
							<!-- Unknown complex type -->
							<div class="form-array__unsupported">
								<p>Complex item type "{itemSchema.type}" is not fully supported.</p>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Empty State -->
		<div class="form-array__empty">
			<Icon icon="heroicons:squares-plus" class="form-array__empty-icon" />
			<p class="form-array__empty-text">No items yet</p>
		</div>
	{/if}

	<!-- Add Button -->
	<button
		type="button"
		class="form-array__add-btn"
		onclick={addItem}
		disabled={!canAddItem || disabled}
		aria-label={addLabel}
	>
		<Icon icon="heroicons:plus" />
		<span>{addLabel}</span>
	</button>

	<!-- Item count and limits -->
	{#if minItems > 0 || maxItems !== undefined}
		<div class="form-array__info">
			<span class="form-array__count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
			{#if minItems > 0}
				<span class="form-array__limit">Min: {minItems}</span>
			{/if}
			{#if maxItems !== undefined}
				<span class="form-array__limit">Max: {maxItems}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* ============================================
	   FORM ARRAY CONTAINER
	   ============================================ */

	.form-array {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.form-array--disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	/* ============================================
	   ITEMS CONTAINER
	   ============================================ */

	.form-array__items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* ============================================
	   INDIVIDUAL ITEM
	   ============================================ */

	.form-array__item {
		display: flex;
		flex-direction: column;
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		overflow: hidden;
		animation: itemFadeIn 0.25s ease-out forwards;
		opacity: 0;
		transform: translateY(-8px);
	}

	@keyframes itemFadeIn {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.form-array__item--simple .form-array__item-content {
		padding: 0.5rem 0.75rem 0.75rem;
	}

	.form-array__item--complex .form-array__item-content {
		padding: 0;
	}

	/* ============================================
	   ITEM HEADER
	   ============================================ */

	.form-array__item-header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem 0.75rem;
		background-color: var(--fd-subtle);
		border-bottom: 1px solid var(--fd-border);
	}

	.form-array__item--simple .form-array__item-header {
		padding: 0.5rem 0.625rem;
	}

	/* ============================================
	   ITEM NUMBER/LABEL
	   ============================================ */

	.form-array__item-number {
		font-size: var(--fd-text-xs);
		font-weight: 600;
		color: var(--fd-muted-foreground);
		min-width: 1.75rem;
		padding: 0.125rem 0.375rem;
		background-color: var(--fd-border);
		border-radius: var(--fd-radius-sm);
		text-align: center;
	}

	.form-array__item-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		padding: 0.375rem 0.5rem;
		margin: -0.25rem;
		border: 1px solid transparent;
		background: transparent;
		cursor: pointer;
		text-align: left;
		border-radius: var(--fd-radius-md);
		transition: all var(--fd-transition-fast);
	}

	.form-array__item-toggle:hover {
		background-color: var(--fd-border);
	}

	.form-array__item-toggle:focus-visible {
		outline: none;
		border-color: var(--fd-primary);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	.form-array__item-toggle :global(svg) {
		width: 1.125rem;
		height: 1.125rem;
		color: var(--fd-muted-foreground);
		transition: transform var(--fd-transition-normal);
	}

	.form-array__item-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--fd-foreground);
	}

	/* ============================================
	   ACTION BUTTONS GROUP
	   ============================================ */

	.form-array__actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-left: auto;
	}

	.form-array__action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.form-array__action-btn :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.form-array__action-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
	}

	.form-array__action-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	/* Move Up/Down buttons - Blue semantic color */
	.form-array__action-btn--move {
		background-color: var(--fd-primary-muted);
		border-color: var(--fd-primary);
		color: var(--fd-primary-hover);
	}

	.form-array__action-btn--move:hover:not(:disabled) {
		background-color: var(--fd-primary-muted);
		border-color: var(--fd-primary-hover);
		color: var(--fd-primary-hover);
	}

	.form-array__action-btn--move:active:not(:disabled) {
		background-color: var(--fd-primary);
	}

	/* Delete button - Red/Warning semantic color */
	.form-array__action-btn--delete {
		background-color: var(--fd-error-muted);
		border-color: var(--fd-error);
		color: var(--fd-error);
	}

	.form-array__action-btn--delete:hover:not(:disabled) {
		background-color: var(--fd-error-muted);
		border-color: var(--fd-error-hover);
		color: var(--fd-error-hover);
	}

	.form-array__action-btn--delete:active:not(:disabled) {
		background-color: var(--fd-error);
	}

	/* ============================================
	   ITEM CONTENT
	   ============================================ */

	.form-array__item-content {
		transition: all 0.2s ease-out;
	}

	.form-array__item-content--collapsed {
		height: 0;
		overflow: hidden;
		padding: 0 !important;
	}

	/* ============================================
	   INPUTS (Simple Types)
	   ============================================ */

	.form-array__input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
		font-size: var(--fd-text-sm);
		font-family: inherit;
		color: var(--fd-foreground);
		background-color: var(--fd-background);
		transition: all var(--fd-transition-normal);
	}

	.form-array__input::placeholder {
		color: var(--fd-muted-foreground);
	}

	.form-array__input:hover {
		border-color: var(--fd-border-strong);
	}

	.form-array__input:focus {
		outline: none;
		border-color: var(--fd-primary);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.form-array__input--number {
		font-variant-numeric: tabular-nums;
	}

	.form-array__textarea {
		resize: vertical;
		min-height: 4rem;
		line-height: 1.5;
	}

	.form-array__select {
		width: 100%;
		padding: 0.5rem 2rem 0.5rem 0.75rem;
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
		font-size: var(--fd-text-sm);
		font-family: inherit;
		color: var(--fd-foreground);
		background-color: var(--fd-background);
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		background-size: 1rem;
	}

	.form-array__select:hover {
		border-color: var(--fd-border-strong);
	}

	.form-array__select:focus {
		outline: none;
		border-color: var(--fd-primary);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	/* ============================================
	   TOGGLE (Boolean in Array)
	   ============================================ */

	.form-array__toggle-wrapper {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		cursor: pointer;
	}

	.form-array__checkbox-input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.form-array__toggle-track {
		position: relative;
		width: 2.25rem;
		height: 1.25rem;
		background-color: var(--fd-border-strong);
		border-radius: 0.625rem;
		transition: background-color var(--fd-transition-normal);
		flex-shrink: 0;
	}

	.form-array__toggle-thumb {
		position: absolute;
		top: 0.125rem;
		left: 0.125rem;
		width: 1rem;
		height: 1rem;
		background-color: var(--fd-background);
		border-radius: 50%;
		box-shadow: var(--fd-shadow-sm);
		transition: transform var(--fd-transition-normal);
	}

	.form-array__checkbox-input:checked + .form-array__toggle-track {
		background-color: var(--fd-primary);
	}

	.form-array__checkbox-input:checked + .form-array__toggle-track .form-array__toggle-thumb {
		transform: translateX(1rem);
	}

	.form-array__toggle-label {
		font-size: 0.8125rem;
		color: var(--fd-muted-foreground);
	}

	/* ============================================
	   SUBFORM (Complex Types)
	   ============================================ */

	.form-array__subform {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem;
		background-color: var(--fd-background);
	}

	.form-array__subform-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		animation: subfieldFadeIn 0.2s ease-out forwards;
		opacity: 0;
	}

	@keyframes subfieldFadeIn {
		to {
			opacity: 1;
		}
	}

	.form-array__subform-label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--fd-text-xs);
		font-weight: 600;
		color: var(--fd-muted-foreground);
	}

	.form-array__subform-label-text {
		line-height: 1.4;
	}

	.form-array__required {
		color: var(--fd-error);
		font-weight: 500;
	}

	.form-array__subform-description {
		margin: 0;
		font-size: 0.6875rem;
		color: var(--fd-muted-foreground);
		line-height: 1.4;
	}

	/* ============================================
	   EMPTY STATE
	   ============================================ */

	.form-array__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		background-color: var(--fd-muted);
		border: 2px dashed var(--fd-border-strong);
		border-radius: var(--fd-radius-lg);
	}

	.form-array__empty :global(svg) {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--fd-muted-foreground);
		margin-bottom: 0.625rem;
	}

	.form-array__empty-text {
		margin: 0;
		font-size: var(--fd-text-sm);
		font-weight: 500;
		color: var(--fd-muted-foreground);
	}

	/* ============================================
	   ADD BUTTON
	   ============================================ */

	.form-array__add-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border: 1px solid var(--fd-success);
		border-radius: var(--fd-radius-lg);
		background-color: var(--fd-success-muted);
		color: var(--fd-success-hover);
		font-size: 0.8125rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all var(--fd-transition-fast);
	}

	.form-array__add-btn:hover:not(:disabled) {
		background-color: var(--fd-success-muted);
		border-color: var(--fd-success-hover);
		color: var(--fd-success-hover);
	}

	.form-array__add-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
	}

	.form-array__add-btn:active:not(:disabled) {
		background-color: var(--fd-success);
	}

	.form-array__add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.form-array__add-btn :global(svg) {
		width: 1.125rem;
		height: 1.125rem;
	}

	/* ============================================
	   INFO BAR
	   ============================================ */

	.form-array__info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.6875rem;
		color: var(--fd-muted-foreground);
	}

	.form-array__count {
		font-weight: 500;
	}

	.form-array__limit {
		padding: 0.125rem 0.375rem;
		background-color: var(--fd-subtle);
		border-radius: var(--fd-radius-sm);
	}

	/* ============================================
	   UNSUPPORTED TYPE
	   ============================================ */

	.form-array__unsupported {
		padding: 0.75rem;
		background-color: var(--fd-warning-muted);
		border: 1px solid var(--fd-warning);
		border-radius: var(--fd-radius-md);
		color: var(--fd-warning-hover);
		font-size: var(--fd-text-xs);
	}

	.form-array__unsupported p {
		margin: 0;
	}
</style>
