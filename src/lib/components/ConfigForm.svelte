<!--
  ConfigForm Component
  Handles dynamic form rendering for node or entity configuration
  Supports both node-based config and direct schema/values
  Uses reactive $state for proper Svelte 5 reactivity
  
  Features:
  - Dynamic form generation from JSON Schema
  - UI Extensions support for display settings (e.g., hide unconnected handles)
  
  Accessibility features:
  - Proper label associations with for/id attributes
  - ARIA describedby for field descriptions
  - Focus-visible states for keyboard navigation
  - Required field indicators
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { ConfigSchema, WorkflowNode, NodeUIExtensions } from '$lib/types/index.js';

	interface Props {
		/** Optional workflow node (if provided, schema and values are derived from it) */
		node?: WorkflowNode;
		/** Direct config schema (used when node is not provided) */
		schema?: ConfigSchema;
		/** Direct config values (used when node is not provided) */
		values?: Record<string, unknown>;
		/** Whether to show UI extension settings section */
		showUIExtensions?: boolean;
		/** Callback when form is saved (includes both config and extensions if enabled) */
		onSave: (config: Record<string, unknown>, uiExtensions?: NodeUIExtensions) => void;
		/** Callback when form is cancelled */
		onCancel: () => void;
	}

	let { node, schema, values, showUIExtensions = true, onSave, onCancel }: Props = $props();

	/**
	 * Get the configuration schema from node metadata or direct prop
	 */
	const configSchema = $derived(
		schema ?? (node?.data.metadata?.configSchema as ConfigSchema | undefined)
	);

	/**
	 * Get the current configuration from node or direct prop
	 */
	const initialConfig = $derived(values ?? node?.data.config ?? {});

	/**
	 * Create reactive configuration values using $state
	 * This fixes the Svelte 5 reactivity warnings
	 */
	let configValues = $state<Record<string, unknown>>({});

	/**
	 * UI Extension values for display settings
	 * Merges node type defaults with instance overrides
	 */
	let uiExtensionValues = $state<NodeUIExtensions>({});

	/**
	 * Get initial UI extensions from node (instance level overrides type level)
	 */
	const initialUIExtensions = $derived.by<NodeUIExtensions>(() => {
		if (!node) return {};
		// Merge type-level defaults with instance-level overrides
		const typeDefaults = node.data.metadata?.extensions?.ui ?? {};
		const instanceOverrides = node.data.extensions?.ui ?? {};
		return { ...typeDefaults, ...instanceOverrides };
	});

	/**
	 * Initialize config values when node/schema changes
	 */
	$effect(() => {
		if (configSchema?.properties) {
			const mergedConfig: Record<string, unknown> = {};
			Object.entries(configSchema.properties).forEach(([key, field]) => {
				const fieldConfig = field as Record<string, unknown>;
				// Use existing value if available, otherwise use default
				mergedConfig[key] =
					initialConfig[key] !== undefined ? initialConfig[key] : fieldConfig.default;
			});
			configValues = mergedConfig;
		}
	});

	/**
	 * Initialize UI extension values when node changes
	 */
	$effect(() => {
		uiExtensionValues = {
			hideUnconnectedHandles: initialUIExtensions.hideUnconnectedHandles ?? false
		};
	});

	/**
	 * Check if a field is required based on schema
	 */
	function isFieldRequired(key: string): boolean {
		if (!configSchema?.required) return false;
		return configSchema.required.includes(key);
	}

	/**
	 * Handle form submission
	 * Collects both config values and UI extension values
	 */
	function handleSave(): void {
		// Collect all form values including hidden fields
		const form = document.querySelector('.config-form');
		const updatedConfig: Record<string, unknown> = { ...configValues };

		if (form) {
			const inputs = form.querySelectorAll('input, select, textarea');
			inputs.forEach((input: Element) => {
				const inputEl = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
				// Skip UI extension fields (prefixed with ext-)
				if (inputEl.id && !inputEl.id.startsWith('ext-')) {
					if (inputEl instanceof HTMLInputElement && inputEl.type === 'checkbox') {
						updatedConfig[inputEl.id] = inputEl.checked;
					} else if (inputEl instanceof HTMLInputElement && inputEl.type === 'number') {
						updatedConfig[inputEl.id] = inputEl.value ? Number(inputEl.value) : inputEl.value;
					} else if (inputEl instanceof HTMLInputElement && inputEl.type === 'hidden') {
						// Parse hidden field values that might be JSON
						try {
							const parsed = JSON.parse(inputEl.value);
							updatedConfig[inputEl.id] = parsed;
						} catch {
							// If not JSON, use raw value
							updatedConfig[inputEl.id] = inputEl.value;
						}
					} else {
						updatedConfig[inputEl.id] = inputEl.value;
					}
				}
			});
		}

		// Preserve hidden field values from original config if not collected from form
		if (initialConfig && configSchema?.properties) {
			Object.entries(configSchema.properties).forEach(
				([key, property]: [string, Record<string, unknown>]) => {
					if (property.format === 'hidden' && !(key in updatedConfig) && key in initialConfig) {
						updatedConfig[key] = initialConfig[key];
					}
				}
			);
		}

		// Pass UI extensions only if enabled
		if (showUIExtensions && node) {
			onSave(updatedConfig, uiExtensionValues);
		} else {
			onSave(updatedConfig);
		}
	}
</script>

{#if configSchema}
	<form
		class="config-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSave();
		}}
	>
		{#if configSchema.properties}
			<div class="config-form__fields">
				{#each Object.entries(configSchema.properties) as [key, field], index (key)}
					{@const fieldConfig = field as Record<string, unknown>}
					{@const required = isFieldRequired(key)}
					{@const hasDescription = Boolean(fieldConfig.description)}
					{@const descriptionId = hasDescription ? `${key}-description` : undefined}

					{#if fieldConfig.format !== 'hidden'}
						<div class="config-form__field" style="animation-delay: {index * 30}ms">
							<!-- Field Label -->
							<label class="config-form__label" for={key}>
								<span class="config-form__label-text">
									{String(fieldConfig.title || fieldConfig.description || key)}
								</span>
								{#if required}
									<span class="config-form__required" aria-label="required">*</span>
								{/if}
							</label>

							<!-- Field Input Container -->
							<div class="config-form__input-wrapper">
								{#if fieldConfig.enum && fieldConfig.multiple}
									<!-- Checkboxes for enum with multiple selection -->
									{@const enumOptions = fieldConfig.enum as string[]}
									<div
										class="config-form__checkbox-group"
										role="group"
										aria-labelledby="{key}-label"
										aria-describedby={descriptionId}
									>
										{#each enumOptions as option (String(option))}
											{@const currentValue = configValues[key]}
											{@const valueArray = Array.isArray(currentValue) ? currentValue : []}
											<label class="config-form__checkbox-item">
												<input
													type="checkbox"
													class="config-form__checkbox-input"
													value={String(option)}
													checked={valueArray.includes(String(option))}
													onchange={(e) => {
														const checked = e.currentTarget.checked;
														const existingValue = configValues[key];
														const currentValues: unknown[] = Array.isArray(existingValue)
															? [...existingValue]
															: [];
														if (checked) {
															if (!currentValues.includes(String(option))) {
																configValues[key] = [...currentValues, String(option)];
															}
														} else {
															configValues[key] = currentValues.filter((v) => v !== String(option));
														}
													}}
												/>
												<span class="config-form__checkbox-custom" aria-hidden="true">
													<Icon icon="heroicons:check" />
												</span>
												<span class="config-form__checkbox-label">
													{String(option)}
												</span>
											</label>
										{/each}
									</div>
								{:else if fieldConfig.enum}
									<!-- Select for enum with single selection -->
									{@const enumOptions = fieldConfig.enum as string[]}
									<div class="config-form__select-wrapper">
										<select
											id={key}
											class="config-form__select"
											bind:value={configValues[key]}
											aria-describedby={descriptionId}
											aria-required={required}
										>
											{#each enumOptions as option (String(option))}
												<option value={String(option)}>{String(option)}</option>
											{/each}
										</select>
										<span class="config-form__select-icon" aria-hidden="true">
											<Icon icon="heroicons:chevron-down" />
										</span>
									</div>
								{:else if fieldConfig.type === 'string' && fieldConfig.format === 'multiline'}
									<!-- Textarea for multiline strings -->
									<textarea
										id={key}
										class="config-form__textarea"
										bind:value={configValues[key]}
										placeholder={String(fieldConfig.placeholder || '')}
										rows="4"
										aria-describedby={descriptionId}
										aria-required={required}
									></textarea>
								{:else if fieldConfig.type === 'string'}
									<input
										id={key}
										type="text"
										class="config-form__input"
										bind:value={configValues[key]}
										placeholder={String(fieldConfig.placeholder || '')}
										aria-describedby={descriptionId}
										aria-required={required}
									/>
								{:else if fieldConfig.type === 'number'}
									<input
										id={key}
										type="number"
										class="config-form__input config-form__input--number"
										bind:value={configValues[key]}
										placeholder={String(fieldConfig.placeholder || '')}
										aria-describedby={descriptionId}
										aria-required={required}
									/>
								{:else if fieldConfig.type === 'boolean'}
									<!-- Toggle Switch for boolean -->
									<label class="config-form__toggle">
										<input
											id={key}
											type="checkbox"
											class="config-form__toggle-input"
											checked={Boolean(configValues[key] || fieldConfig.default || false)}
											onchange={(e) => {
												configValues[key] = e.currentTarget.checked;
											}}
											aria-describedby={descriptionId}
										/>
										<span class="config-form__toggle-track">
											<span class="config-form__toggle-thumb"></span>
										</span>
										<span class="config-form__toggle-label">
											{configValues[key] ? 'Enabled' : 'Disabled'}
										</span>
									</label>
								{:else if fieldConfig.type === 'select' || fieldConfig.options}
									{@const selectOptions = (fieldConfig.options ?? []) as Array<{
										value: unknown;
										label: unknown;
									}>}
									<div class="config-form__select-wrapper">
										<select
											id={key}
											class="config-form__select"
											bind:value={configValues[key]}
											aria-describedby={descriptionId}
											aria-required={required}
										>
											{#each selectOptions as option (String(option.value))}
												<option value={String(option.value)}>{String(option.label)}</option>
											{/each}
										</select>
										<span class="config-form__select-icon" aria-hidden="true">
											<Icon icon="heroicons:chevron-down" />
										</span>
									</div>
								{:else}
									<!-- Fallback for unknown field types -->
									<input
										id={key}
										type="text"
										class="config-form__input"
										bind:value={configValues[key]}
										placeholder={String(fieldConfig.placeholder || '')}
										aria-describedby={descriptionId}
									/>
								{/if}
							</div>

							<!-- Field Description -->
							{#if hasDescription && fieldConfig.title}
								<p id={descriptionId} class="config-form__description">
									{String(fieldConfig.description)}
								</p>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{:else}
			<!-- If no properties, show the raw schema for debugging -->
			<div class="config-form__debug">
				<div class="config-form__debug-header">
					<Icon icon="heroicons:bug-ant" class="config-form__debug-icon" />
					<span>Debug - Config Schema</span>
				</div>
				<pre class="config-form__debug-content">{JSON.stringify(configSchema, null, 2)}</pre>
			</div>
		{/if}

		<!-- UI Extensions Section -->
		{#if showUIExtensions && node}
			<div class="config-form__extensions">
				<div class="config-form__extensions-header">
					<Icon icon="heroicons:adjustments-horizontal" class="config-form__extensions-icon" />
					<span>Display Settings</span>
				</div>
				<div class="config-form__extensions-content">
					<!-- Hide Unconnected Handles Toggle -->
					<div class="config-form__field">
						<label class="config-form__label" for="ext-hideUnconnectedHandles">
							<span class="config-form__label-text">Hide Unconnected Ports</span>
						</label>
						<div class="config-form__input-wrapper">
							<label class="config-form__toggle">
								<input
									id="ext-hideUnconnectedHandles"
									type="checkbox"
									class="config-form__toggle-input"
									checked={Boolean(uiExtensionValues.hideUnconnectedHandles)}
									onchange={(e) => {
										uiExtensionValues.hideUnconnectedHandles = e.currentTarget.checked;
									}}
									aria-describedby="ext-hideUnconnectedHandles-description"
								/>
								<span class="config-form__toggle-track">
									<span class="config-form__toggle-thumb"></span>
								</span>
								<span class="config-form__toggle-label">
									{uiExtensionValues.hideUnconnectedHandles ? 'Hidden' : 'Visible'}
								</span>
							</label>
						</div>
						<p id="ext-hideUnconnectedHandles-description" class="config-form__description">
							Hide input and output ports that are not connected to reduce visual clutter
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Footer Actions -->
		<div class="config-form__footer">
			<button
				type="button"
				class="config-form__button config-form__button--secondary"
				onclick={onCancel}
			>
				<Icon icon="heroicons:x-mark" class="config-form__button-icon" />
				<span>Cancel</span>
			</button>
			<button type="submit" class="config-form__button config-form__button--primary">
				<Icon icon="heroicons:check" class="config-form__button-icon" />
				<span>Save Changes</span>
			</button>
		</div>
	</form>
{:else}
	<div class="config-form__empty">
		<div class="config-form__empty-icon">
			<Icon icon="heroicons:cog-6-tooth" />
		</div>
		<p class="config-form__empty-text">No configuration options available for this node.</p>
	</div>
{/if}

<style>
	/* ============================================
	   CONFIG FORM - Modern, Accessible Design
	   ============================================ */

	.config-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.config-form__fields {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ============================================
	   FIELD CONTAINER
	   ============================================ */

	.config-form__field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		animation: fieldFadeIn 0.3s ease-out forwards;
		opacity: 0;
		transform: translateY(4px);
	}

	@keyframes fieldFadeIn {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ============================================
	   LABELS
	   ============================================ */

	.config-form__label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ref-gray-700, #374151);
		letter-spacing: -0.01em;
	}

	.config-form__label-text {
		line-height: 1.4;
	}

	.config-form__required {
		color: var(--color-ref-red-500, #ef4444);
		font-weight: 500;
	}

	/* ============================================
	   INPUT WRAPPER
	   ============================================ */

	.config-form__input-wrapper {
		position: relative;
	}

	/* ============================================
	   TEXT INPUTS
	   ============================================ */

	.config-form__input {
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

	.config-form__input::placeholder {
		color: var(--color-ref-gray-400, #9ca3af);
	}

	.config-form__input:hover {
		border-color: var(--color-ref-gray-300, #d1d5db);
		background-color: #ffffff;
	}

	.config-form__input:focus {
		outline: none;
		border-color: var(--color-ref-blue-500, #3b82f6);
		background-color: #ffffff;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.config-form__input--number {
		font-variant-numeric: tabular-nums;
	}

	/* ============================================
	   TEXTAREA
	   ============================================ */

	.config-form__textarea {
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

	.config-form__textarea::placeholder {
		color: var(--color-ref-gray-400, #9ca3af);
	}

	.config-form__textarea:hover {
		border-color: var(--color-ref-gray-300, #d1d5db);
		background-color: #ffffff;
	}

	.config-form__textarea:focus {
		outline: none;
		border-color: var(--color-ref-blue-500, #3b82f6);
		background-color: #ffffff;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}

	/* ============================================
	   SELECT DROPDOWN
	   ============================================ */

	.config-form__select-wrapper {
		position: relative;
	}

	.config-form__select {
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

	.config-form__select:hover {
		border-color: var(--color-ref-gray-300, #d1d5db);
		background-color: #ffffff;
	}

	.config-form__select:focus {
		outline: none;
		border-color: var(--color-ref-blue-500, #3b82f6);
		background-color: #ffffff;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.config-form__select-icon {
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

	.config-form__select-icon :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.config-form__select:focus + .config-form__select-icon {
		color: var(--color-ref-blue-500, #3b82f6);
	}

	/* ============================================
	   CHECKBOX GROUP
	   ============================================ */

	.config-form__checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 0.75rem;
		background-color: var(--color-ref-gray-50, #f9fafb);
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-radius: 0.5rem;
	}

	.config-form__checkbox-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		cursor: pointer;
		padding: 0.375rem;
		margin: -0.375rem;
		border-radius: 0.375rem;
		transition: background-color 0.15s;
	}

	.config-form__checkbox-item:hover {
		background-color: var(--color-ref-gray-100, #f3f4f6);
	}

	.config-form__checkbox-input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.config-form__checkbox-custom {
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

	.config-form__checkbox-custom :global(svg) {
		width: 0.75rem;
		height: 0.75rem;
		color: #ffffff;
		opacity: 0;
		transform: scale(0.5);
		transition: all 0.15s;
	}

	.config-form__checkbox-input:checked + .config-form__checkbox-custom {
		background-color: var(--color-ref-blue-500, #3b82f6);
		border-color: var(--color-ref-blue-500, #3b82f6);
	}

	.config-form__checkbox-input:checked + .config-form__checkbox-custom :global(svg) {
		opacity: 1;
		transform: scale(1);
	}

	.config-form__checkbox-input:focus-visible + .config-form__checkbox-custom {
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.config-form__checkbox-label {
		font-size: 0.875rem;
		color: var(--color-ref-gray-700, #374151);
		line-height: 1.4;
	}

	/* ============================================
	   TOGGLE SWITCH (Boolean)
	   ============================================ */

	.config-form__toggle {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		padding: 0.5rem 0;
	}

	.config-form__toggle-input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.config-form__toggle-track {
		position: relative;
		width: 2.75rem;
		height: 1.5rem;
		background-color: var(--color-ref-gray-300, #d1d5db);
		border-radius: 0.75rem;
		transition: background-color 0.2s;
		flex-shrink: 0;
	}

	.config-form__toggle-thumb {
		position: absolute;
		top: 0.125rem;
		left: 0.125rem;
		width: 1.25rem;
		height: 1.25rem;
		background-color: #ffffff;
		border-radius: 50%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.config-form__toggle-input:checked + .config-form__toggle-track {
		background-color: var(--color-ref-blue-500, #3b82f6);
	}

	.config-form__toggle-input:checked + .config-form__toggle-track .config-form__toggle-thumb {
		transform: translateX(1.25rem);
	}

	.config-form__toggle-input:focus-visible + .config-form__toggle-track {
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.config-form__toggle-label {
		font-size: 0.875rem;
		color: var(--color-ref-gray-600, #4b5563);
		font-weight: 500;
		min-width: 4.5rem;
	}

	.config-form__toggle-input:checked ~ .config-form__toggle-label {
		color: var(--color-ref-blue-600, #2563eb);
	}

	/* ============================================
	   FIELD DESCRIPTION
	   ============================================ */

	.config-form__description {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-ref-gray-500, #6b7280);
		line-height: 1.5;
		padding-left: 0.125rem;
	}

	/* ============================================
	   FOOTER ACTIONS
	   ============================================ */

	.config-form__footer {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		padding-top: 1rem;
		border-top: 1px solid var(--color-ref-gray-100, #f3f4f6);
		margin-top: 0.5rem;
	}

	.config-form__button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		border: 1px solid transparent;
		min-height: 2.5rem;
	}

	.config-form__button :global(svg) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.config-form__button--secondary {
		background-color: #ffffff;
		border-color: var(--color-ref-gray-200, #e5e7eb);
		color: var(--color-ref-gray-700, #374151);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.config-form__button--secondary:hover {
		background-color: var(--color-ref-gray-50, #f9fafb);
		border-color: var(--color-ref-gray-300, #d1d5db);
		color: var(--color-ref-gray-900, #111827);
	}

	.config-form__button--secondary:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.config-form__button--primary {
		background: linear-gradient(
			135deg,
			var(--color-ref-blue-500, #3b82f6) 0%,
			var(--color-ref-blue-600, #2563eb) 100%
		);
		color: #ffffff;
		box-shadow:
			0 1px 3px rgba(59, 130, 246, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.config-form__button--primary:hover {
		background: linear-gradient(
			135deg,
			var(--color-ref-blue-600, #2563eb) 0%,
			var(--color-ref-blue-700, #1d4ed8) 100%
		);
		box-shadow:
			0 4px 12px rgba(59, 130, 246, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	.config-form__button--primary:active {
		transform: translateY(0);
	}

	.config-form__button--primary:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.4),
			0 4px 12px rgba(59, 130, 246, 0.35);
	}

	/* ============================================
	   UI EXTENSIONS SECTION
	   ============================================ */

	.config-form__extensions {
		background-color: var(--color-ref-slate-50, #f8fafc);
		border: 1px solid var(--color-ref-slate-200, #e2e8f0);
		border-radius: 0.5rem;
		overflow: hidden;
		margin-top: 0.5rem;
	}

	.config-form__extensions-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: var(--color-ref-slate-100, #f1f5f9);
		border-bottom: 1px solid var(--color-ref-slate-200, #e2e8f0);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ref-slate-700, #334155);
	}

	.config-form__extensions-header :global(svg) {
		width: 1rem;
		height: 1rem;
		color: var(--color-ref-slate-500, #64748b);
	}

	.config-form__extensions-content {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* ============================================
	   DEBUG SECTION
	   ============================================ */

	.config-form__debug {
		background-color: var(--color-ref-amber-50, #fffbeb);
		border: 1px solid var(--color-ref-amber-200, #fde68a);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.config-form__debug-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: var(--color-ref-amber-100, #fef3c7);
		border-bottom: 1px solid var(--color-ref-amber-200, #fde68a);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ref-amber-800, #92400e);
	}

	.config-form__debug-header :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.config-form__debug-content {
		margin: 0;
		padding: 1rem;
		font-size: 0.75rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		color: var(--color-ref-gray-700, #374151);
		overflow-x: auto;
		background-color: #ffffff;
		line-height: 1.5;
	}

	/* ============================================
	   EMPTY STATE
	   ============================================ */

	.config-form__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
	}

	.config-form__empty-icon {
		width: 3rem;
		height: 3rem;
		margin-bottom: 1rem;
		color: var(--color-ref-gray-300, #d1d5db);
	}

	.config-form__empty-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.config-form__empty-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-ref-gray-500, #6b7280);
		font-style: italic;
		line-height: 1.5;
	}
</style>
