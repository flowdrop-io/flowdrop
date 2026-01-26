<!--
  ConfigForm Component
  Handles dynamic form rendering for node or entity configuration
  Supports both node-based config and direct schema/values
  Uses reactive $state for proper Svelte 5 reactivity
  
  Features:
  - Dynamic form generation from JSON Schema using modular form components
  - UI Extensions support for display settings (e.g., hide unconnected handles)
  - Extensible architecture for complex schema types (array, object)
  - Admin/Edit support for external configuration links and dynamic schema fetching
  
  Accessibility features:
  - Proper label associations with for/id attributes
  - ARIA describedby for field descriptions
  - Focus-visible states for keyboard navigation
  - Required field indicators
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import type {
		ConfigSchema,
		WorkflowNode,
		NodeUIExtensions,
		ConfigEditOptions
	} from '$lib/types/index.js';
	import { FormField, FormFieldWrapper, FormToggle } from '$lib/components/form/index.js';
	import type { FieldSchema } from '$lib/components/form/index.js';
	import {
		getEffectiveConfigEditOptions,
		fetchDynamicSchema,
		resolveExternalEditUrl,
		invalidateSchemaCache,
		type DynamicSchemaResult
	} from '$lib/services/dynamicSchemaService.js';
	import { globalSaveWorkflow } from '$lib/services/globalSave.js';
	import {
		fetchAllFieldOptions,
		hasFieldsWithOptionsEndpoint,
		mergeOptionsIntoSchema
	} from '$lib/services/optionsService.js';
	import type { FieldOption } from '$lib/components/form/types.js';

	interface Props {
		/** Optional workflow node (if provided, schema and values are derived from it) */
		node?: WorkflowNode;
		/** Direct config schema (used when node is not provided) */
		schema?: ConfigSchema;
		/** Direct config values (used when node is not provided) */
		values?: Record<string, unknown>;
		/** Whether to show UI extension settings section */
		showUIExtensions?: boolean;
		/** Optional workflow ID for context in external links */
		workflowId?: string;
		/** Whether to also save the workflow when saving config */
		saveWorkflowWhenSavingConfig?: boolean;
		/** Callback when form is saved (includes both config and extensions if enabled) */
		onSave: (config: Record<string, unknown>, uiExtensions?: NodeUIExtensions) => void;
		/** Callback when form is cancelled */
		onCancel: () => void;
	}

	let {
		node,
		schema,
		values,
		showUIExtensions = true,
		workflowId,
		saveWorkflowWhenSavingConfig = false,
		onSave,
		onCancel
	}: Props = $props();

	/**
	 * State for dynamic schema loading
	 */
	let dynamicSchemaLoading = $state(false);
	let dynamicSchemaError = $state<string | null>(null);
	let fetchedDynamicSchema = $state<ConfigSchema | null>(null);

	/**
	 * State for field options loading
	 */
	let optionsLoading = $state(false);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Reserved for future error display
	let optionsErrors = $state<Map<string, string>>(new Map());
	let fetchedOptions = $state<Map<string, FieldOption[]>>(new Map());

	/**
	 * Get the admin edit configuration for the node
	 */
	const configEditOptions = $derived.by<ConfigEditOptions | undefined>(() => {
		if (!node) return undefined;
		return getEffectiveConfigEditOptions(node);
	});

	/**
	 * Determine if we should show the external edit link
	 */
	const showExternalEditLink = $derived.by(() => {
		if (!configEditOptions?.externalEditLink) return false;
		// Show if no dynamic schema, or if both exist but preferDynamicSchema is false
		if (!configEditOptions.dynamicSchema) return true;
		return !configEditOptions.preferDynamicSchema;
	});

	/**
	 * Determine if we should use/fetch dynamic schema
	 */
	const useDynamicSchema = $derived.by(() => {
		if (!configEditOptions?.dynamicSchema) return false;
		// Use if no external link, or if both exist and preferDynamicSchema is true
		if (!configEditOptions.externalEditLink) return true;
		return configEditOptions.preferDynamicSchema === true;
	});

	/**
	 * Get the configuration schema from node metadata, direct prop, or fetched dynamic schema
	 * Priority: fetchedDynamicSchema > direct schema prop > node metadata configSchema
	 */
	const configSchema = $derived.by<ConfigSchema | undefined>(() => {
		// If we have a fetched dynamic schema, use it
		if (fetchedDynamicSchema) {
			return fetchedDynamicSchema;
		}
		// Otherwise use the direct prop or node metadata
		return schema ?? (node?.data.metadata?.configSchema as ConfigSchema | undefined);
	});

	/**
	 * Check if the node has no static schema and needs dynamic loading
	 */
	const needsDynamicSchemaLoad = $derived.by(() => {
		if (!node) return false;
		const staticSchema = schema ?? node.data.metadata?.configSchema;
		// Need to load if: no static schema AND dynamic schema is configured
		return !staticSchema && useDynamicSchema && !fetchedDynamicSchema && !dynamicSchemaLoading;
	});

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
	 * Flag to track if workflow save is in progress
	 */
	let isSavingWorkflow = $state(false);

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
	 * Fetch dynamic schema when needed
	 */
	async function loadDynamicSchema(): Promise<void> {
		if (!node || !configEditOptions?.dynamicSchema) return;

		dynamicSchemaLoading = true;
		dynamicSchemaError = null;

		try {
			const result: DynamicSchemaResult = await fetchDynamicSchema(
				configEditOptions.dynamicSchema,
				node,
				workflowId
			);

			if (result.success && result.schema) {
				fetchedDynamicSchema = result.schema;
			} else {
				dynamicSchemaError =
					result.error ?? configEditOptions.errorMessage ?? 'Failed to load configuration schema';
			}
		} catch (err) {
			dynamicSchemaError =
				err instanceof Error
					? err.message
					: (configEditOptions.errorMessage ?? 'Failed to load configuration schema');
		} finally {
			dynamicSchemaLoading = false;
		}
	}

	/**
	 * Refresh the dynamic schema (invalidate cache and reload)
	 */
	async function refreshDynamicSchema(): Promise<void> {
		if (!node || !configEditOptions?.dynamicSchema) return;

		// Invalidate the cache first
		invalidateSchemaCache(node, configEditOptions.dynamicSchema);
		fetchedDynamicSchema = null;

		// Reload the schema
		await loadDynamicSchema();
	}

	/**
	 * Load options for fields with optionsEndpoint
	 */
	async function loadFieldOptions(schema: ConfigSchema): Promise<void> {
		if (!node) return;

		optionsLoading = true;
		optionsErrors = new Map();

		try {
			const result = await fetchAllFieldOptions(schema, node, workflowId);
			fetchedOptions = result.options;
			optionsErrors = result.errors;
		} catch (err) {
			console.error('Failed to load field options:', err);
		} finally {
			optionsLoading = false;
		}
	}

	/**
	 * Get the resolved external edit URL
	 */
	function getExternalEditUrl(): string {
		if (!node || !configEditOptions?.externalEditLink) return '#';
		return resolveExternalEditUrl(configEditOptions.externalEditLink, node, workflowId);
	}

	/**
	 * Handle opening external edit link
	 */
	function handleExternalEditClick(): void {
		if (!node || !configEditOptions?.externalEditLink) return;

		const url = getExternalEditUrl();
		const openInNewTab = configEditOptions.externalEditLink.openInNewTab !== false;

		if (openInNewTab) {
			window.open(url, '_blank', 'noopener,noreferrer');
		} else {
			window.location.href = url;
		}
	}

	/**
	 * Auto-load dynamic schema on mount if needed
	 */
	$effect(() => {
		if (needsDynamicSchemaLoad) {
			loadDynamicSchema();
		}
	});

	/**
	 * Load field options when schema is available and has fields with optionsEndpoint
	 */
	$effect(() => {
		const schema = configSchema;
		if (
			schema &&
			node &&
			hasFieldsWithOptionsEndpoint(schema) &&
			!optionsLoading &&
			fetchedOptions.size === 0
		) {
			loadFieldOptions(schema);
		}
	});

	/**
	 * Schema with fetched options merged in for form rendering
	 */
	const enrichedSchema = $derived.by(() => {
		if (!configSchema) return configSchema;
		if (fetchedOptions.size === 0) return configSchema;
		return mergeOptionsIntoSchema(configSchema, fetchedOptions);
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
	 * Optionally saves the workflow if the option is enabled
	 */
	async function handleSave(): Promise<void> {
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
					} else if (
						inputEl instanceof HTMLInputElement &&
						(inputEl.type === 'number' || inputEl.type === 'range')
					) {
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

		// Save workflow if the option is enabled
		if (saveWorkflowWhenSavingConfig) {
			isSavingWorkflow = true;
			try {
				await globalSaveWorkflow();
			} catch (error) {
				console.error('Failed to save workflow after config save:', error);
			} finally {
				isSavingWorkflow = false;
			}
		}
	}

	/**
	 * Convert ConfigProperty to FieldSchema for FormField component
	 */
	function toFieldSchema(property: Record<string, unknown>): FieldSchema {
		return property as FieldSchema;
	}
</script>

<!-- External Edit Link Section (shown when configured and preferred) -->
{#if showExternalEditLink && configEditOptions?.externalEditLink}
	<div class="config-form__admin-edit">
		<div class="config-form__admin-edit-header">
			<Icon icon="heroicons:arrow-top-right-on-square" />
			<span>External Configuration</span>
		</div>
		<div class="config-form__admin-edit-content">
			<p class="config-form__admin-edit-description">
				{configEditOptions.externalEditLink.description ??
					'This node requires external configuration. Click the button below to open the configuration panel.'}
			</p>
			<button
				type="button"
				class="config-form__button config-form__button--external"
				onclick={handleExternalEditClick}
			>
				<Icon
					icon={configEditOptions.externalEditLink.icon ?? 'heroicons:arrow-top-right-on-square'}
				/>
				<span>{configEditOptions.externalEditLink.label ?? 'Configure Externally'}</span>
			</button>
		</div>
	</div>
{/if}

<!-- Dynamic Schema or Options Loading State -->
{#if dynamicSchemaLoading || optionsLoading}
	<div class="config-form__loading">
		<div class="config-form__loading-spinner"></div>
		<p class="config-form__loading-text">
			{#if dynamicSchemaLoading}
				{configEditOptions?.loadingMessage ?? 'Loading configuration schema...'}
			{:else}
				Loading field options...
			{/if}
		</p>
	</div>
{:else if dynamicSchemaError}
	<div class="config-form__error">
		<div class="config-form__error-header">
			<Icon icon="heroicons:exclamation-triangle" />
			<span>Configuration Error</span>
		</div>
		<div class="config-form__error-content">
			<p class="config-form__error-message">{dynamicSchemaError}</p>
			<div class="config-form__error-actions">
				<button
					type="button"
					class="config-form__button config-form__button--secondary"
					onclick={refreshDynamicSchema}
				>
					<Icon icon="heroicons:arrow-path" />
					<span>Retry</span>
				</button>
				{#if configEditOptions?.externalEditLink}
					<button
						type="button"
						class="config-form__button config-form__button--external"
						onclick={handleExternalEditClick}
					>
						<Icon
							icon={configEditOptions.externalEditLink.icon ??
								'heroicons:arrow-top-right-on-square'}
						/>
						<span>{configEditOptions.externalEditLink.label ?? 'Use External Editor'}</span>
					</button>
				{/if}
			</div>
		</div>
	</div>
{:else if enrichedSchema}
	<form
		class="config-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSave();
		}}
	>
		<!-- Dynamic Schema Refresh Button -->
		{#if fetchedDynamicSchema && configEditOptions?.showRefreshButton !== false}
			<div class="config-form__schema-actions">
				<button
					type="button"
					class="config-form__schema-refresh"
					onclick={refreshDynamicSchema}
					title="Refresh configuration schema"
				>
					<Icon icon="heroicons:arrow-path" />
					<span>Refresh Schema</span>
				</button>
				{#if configEditOptions?.externalEditLink}
					<button
						type="button"
						class="config-form__schema-external"
						onclick={handleExternalEditClick}
						title={configEditOptions.externalEditLink.description ?? 'Open external editor'}
					>
						<Icon
							icon={configEditOptions.externalEditLink.icon ??
								'heroicons:arrow-top-right-on-square'}
						/>
						<span>{configEditOptions.externalEditLink.label ?? 'External Editor'}</span>
					</button>
				{/if}
			</div>
		{/if}

		{#if enrichedSchema.properties}
			<div class="config-form__fields">
				{#each Object.entries(enrichedSchema.properties) as [key, field], index (key)}
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
				<pre class="config-form__debug-content">{JSON.stringify(enrichedSchema, null, 2)}</pre>
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
				disabled={isSavingWorkflow}
			>
				<Icon icon="heroicons:x-mark" class="config-form__button-icon" />
				<span>Cancel</span>
			</button>
			<button
				type="submit"
				class="config-form__button config-form__button--primary"
				disabled={isSavingWorkflow}
			>
				{#if isSavingWorkflow}
					<span class="config-form__button-spinner"></span>
					<span>Saving...</span>
				{:else}
					<Icon icon="heroicons:check" class="config-form__button-icon" />
					<span>Save Changes</span>
				{/if}
			</button>
		</div>
	</form>
{:else if !dynamicSchemaLoading && !showExternalEditLink}
	<div class="config-form__empty">
		<div class="config-form__empty-icon">
			<Icon icon="heroicons:cog-6-tooth" />
		</div>
		<p class="config-form__empty-text">No configuration options available for this node.</p>
		{#if configEditOptions?.externalEditLink}
			<button
				type="button"
				class="config-form__button config-form__button--external config-form__empty-button"
				onclick={handleExternalEditClick}
			>
				<Icon
					icon={configEditOptions.externalEditLink.icon ?? 'heroicons:arrow-top-right-on-square'}
				/>
				<span>{configEditOptions.externalEditLink.label ?? 'Configure Externally'}</span>
			</button>
		{/if}
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

	/* Button Spinner */
	.config-form__button-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: config-form-spin 0.6s linear infinite;
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

	.config-form__empty-button {
		margin-top: 1rem;
	}

	/* ============================================
	   ADMIN/EDIT SECTION - External Configuration
	   ============================================ */

	.config-form__admin-edit {
		background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
		border: 1px solid var(--color-ref-blue-200, #bfdbfe);
		border-radius: 0.625rem;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.config-form__admin-edit-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
		border-bottom: 1px solid var(--color-ref-blue-200, #bfdbfe);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ref-blue-800, #1e40af);
	}

	.config-form__admin-edit-header :global(svg) {
		width: 1rem;
		height: 1rem;
		color: var(--color-ref-blue-600, #2563eb);
	}

	.config-form__admin-edit-content {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.config-form__admin-edit-description {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-ref-blue-700, #1d4ed8);
		line-height: 1.5;
	}

	/* ============================================
	   LOADING STATE
	   ============================================ */

	.config-form__loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		gap: 1rem;
	}

	.config-form__loading-spinner {
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid var(--color-ref-blue-100, #dbeafe);
		border-top-color: var(--color-ref-blue-500, #3b82f6);
		border-radius: 50%;
		animation: config-form-spin 0.8s linear infinite;
	}

	@keyframes config-form-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.config-form__loading-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-ref-gray-600, #4b5563);
	}

	/* ============================================
	   ERROR STATE
	   ============================================ */

	.config-form__error {
		background-color: var(--color-ref-red-50, #fef2f2);
		border: 1px solid var(--color-ref-red-200, #fecaca);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.config-form__error-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: var(--color-ref-red-100, #fee2e2);
		border-bottom: 1px solid var(--color-ref-red-200, #fecaca);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ref-red-800, #991b1b);
	}

	.config-form__error-header :global(svg) {
		width: 1rem;
		height: 1rem;
		color: var(--color-ref-red-600, #dc2626);
	}

	.config-form__error-content {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.config-form__error-message {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-ref-red-700, #b91c1c);
		line-height: 1.5;
	}

	.config-form__error-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* ============================================
	   SCHEMA ACTIONS (Refresh, External Editor)
	   ============================================ */

	.config-form__schema-actions {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-ref-gray-100, #f3f4f6);
	}

	.config-form__schema-refresh,
	.config-form__schema-external {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		font-family: inherit;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		border: 1px solid transparent;
	}

	.config-form__schema-refresh {
		background-color: var(--color-ref-gray-50, #f9fafb);
		border-color: var(--color-ref-gray-200, #e5e7eb);
		color: var(--color-ref-gray-600, #4b5563);
	}

	.config-form__schema-refresh:hover {
		background-color: var(--color-ref-gray-100, #f3f4f6);
		border-color: var(--color-ref-gray-300, #d1d5db);
		color: var(--color-ref-gray-700, #374151);
	}

	.config-form__schema-refresh :global(svg),
	.config-form__schema-external :global(svg) {
		width: 0.875rem;
		height: 0.875rem;
	}

	.config-form__schema-external {
		background-color: var(--color-ref-blue-50, #eff6ff);
		border-color: var(--color-ref-blue-200, #bfdbfe);
		color: var(--color-ref-blue-700, #1d4ed8);
	}

	.config-form__schema-external:hover {
		background-color: var(--color-ref-blue-100, #dbeafe);
		border-color: var(--color-ref-blue-300, #93c5fd);
		color: var(--color-ref-blue-800, #1e40af);
	}

	/* ============================================
	   EXTERNAL BUTTON STYLE
	   ============================================ */

	.config-form__button--external {
		background: linear-gradient(
			135deg,
			var(--color-ref-indigo-500, #6366f1) 0%,
			var(--color-ref-blue-600, #2563eb) 100%
		);
		color: #ffffff;
		box-shadow:
			0 1px 3px rgba(99, 102, 241, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.config-form__button--external:hover {
		background: linear-gradient(
			135deg,
			var(--color-ref-indigo-600, #4f46e5) 0%,
			var(--color-ref-blue-700, #1d4ed8) 100%
		);
		box-shadow:
			0 4px 12px rgba(99, 102, 241, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	.config-form__button--external:active {
		transform: translateY(0);
	}

	.config-form__button--external:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 3px rgba(99, 102, 241, 0.4),
			0 4px 12px rgba(99, 102, 241, 0.35);
	}
</style>
