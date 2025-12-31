<!--
  ConfigForm Component
  Handles dynamic form rendering for node or entity configuration
  Supports both node-based config and direct schema/values
  Uses reactive $state for proper Svelte 5 reactivity
  
  Features:
  - Dynamic form generation from JSON Schema using modular form components
  - UI Extensions support for display settings (e.g., hide unconnected handles)
  - Extensible architecture for complex schema types (array, object)
  
  Accessibility features:
  - Proper label associations with for/id attributes
  - ARIA describedby for field descriptions
  - Focus-visible states for keyboard navigation
  - Required field indicators
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { ConfigSchema, WorkflowNode, NodeUIExtensions } from '$lib/types/index.js';
	import { FormField, FormFieldWrapper, FormToggle } from '$lib/components/form/index.js';
	import type { FieldSchema } from '$lib/components/form/index.js';

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
	 * Handle field value changes from FormField components
	 */
	function handleFieldChange(key: string, value: unknown): void {
		configValues[key] = value;
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

	/**
	 * Convert ConfigProperty to FieldSchema for FormField component
	 */
	function toFieldSchema(property: Record<string, unknown>): FieldSchema {
		return property as FieldSchema;
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
					{@const fieldSchema = toFieldSchema(field as Record<string, unknown>)}
					{@const required = isFieldRequired(key)}

					<FormField
						fieldKey={key}
						schema={fieldSchema}
						value={configValues[key]}
						{required}
						animationIndex={index}
						onChange={(val) => handleFieldChange(key, val)}
					/>
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
					<FormFieldWrapper
						id="ext-hideUnconnectedHandles"
						label="Hide Unconnected Ports"
						description="Hide input and output ports that are not connected to reduce visual clutter"
					>
						<FormToggle
							id="ext-hideUnconnectedHandles"
							value={Boolean(uiExtensionValues.hideUnconnectedHandles)}
							onLabel="Hidden"
							offLabel="Visible"
							ariaDescribedBy="ext-hideUnconnectedHandles-description"
							onChange={(val) => {
								uiExtensionValues.hideUnconnectedHandles = val;
							}}
						/>
					</FormFieldWrapper>
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
	   CONFIG FORM - Container Styles
	   Individual field styles are in form/ components
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
