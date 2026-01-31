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
		/** Callback when any field value changes (fired on blur for immediate sync) */
		onChange?: (config: Record<string, unknown>, uiExtensions?: NodeUIExtensions) => void;
		/** Callback when form is saved (includes both config and extensions if enabled) */
		onSave?: (config: Record<string, unknown>, uiExtensions?: NodeUIExtensions) => void;
		/** Callback when form is cancelled */
		onCancel?: () => void;
	}

	let {
		node,
		schema,
		values,
		showUIExtensions = true,
		workflowId,
		saveWorkflowWhenSavingConfig = false,
		onChange,
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
	 * Handle form field blur - sync changes to workflow immediately
	 * Uses focusout which bubbles from child elements
	 * This enables auto-save behavior without requiring explicit Save button clicks
	 */
	function handleFormBlur(): void {
		if (onChange) {
			const extensions = showUIExtensions && node ? uiExtensionValues : undefined;
			onChange({ ...configValues }, extensions);
		}
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
		if (onSave) {
			if (showUIExtensions && node) {
				onSave(updatedConfig, uiExtensionValues);
			} else {
				onSave(updatedConfig);
			}
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

<!-- Dynamic Schema Loading State -->
{#if dynamicSchemaLoading}
	<div class="config-form__loading">
		<div class="config-form__loading-spinner"></div>
		<p class="config-form__loading-text">
			{configEditOptions?.loadingMessage ?? 'Loading configuration options...'}
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
{:else if configSchema}
	<form
		class="config-form"
		onfocusout={handleFormBlur}
		onsubmit={(e) => {
			e.preventDefault();
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

		<!-- Footer Actions - Only shown when onSave is provided and onChange is not -->
		<!-- With onChange (on-blur sync), changes are saved automatically, so no Save button needed -->
		{#if onSave && !onChange}
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
					onclick={handleSave}
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
		{/if}
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
		gap: var(--fd-space-6);
	}

	.config-form__fields {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-5);
	}

	/* ============================================
	   FOOTER ACTIONS
	   Only shown when onSave is provided (legacy mode without onChange)
	   ============================================ */

	.config-form__footer {
		display: flex;
		gap: var(--fd-space-3);
		justify-content: flex-end;
		padding-top: var(--fd-space-4);
		border-top: 1px solid var(--fd-border-muted);
		margin-top: var(--fd-space-2);
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

	/* ============================================
	   SHARED BUTTON STYLES
	   Used by error actions, external config buttons, and footer
	   ============================================ */

	.config-form__button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--fd-space-2);
		padding: 0.625rem var(--fd-space-4);
		border-radius: var(--fd-radius-lg);
		font-size: var(--fd-text-sm);
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		border: 1px solid transparent;
		min-height: 2.5rem;
	}

	.config-form__button :global(svg) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.config-form__button--secondary {
		background-color: var(--fd-background);
		border-color: var(--fd-border);
		color: var(--fd-foreground);
		box-shadow: var(--fd-shadow-sm);
	}

	.config-form__button--secondary:hover {
		background-color: var(--fd-muted);
		border-color: var(--fd-border-strong);
		color: var(--fd-foreground);
	}

	.config-form__button--secondary:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.config-form__button--primary {
		background: linear-gradient(
			135deg,
			var(--fd-primary) 0%,
			var(--fd-primary-hover) 100%
		);
		color: var(--fd-primary-foreground);
		box-shadow:
			0 1px 3px rgba(59, 130, 246, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.config-form__button--primary:hover {
		background: linear-gradient(
			135deg,
			var(--fd-primary-hover) 0%,
			var(--fd-primary-hover) 100%
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
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		overflow: hidden;
		margin-top: var(--fd-space-2);
	}

	.config-form__extensions-header {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2);
		padding: var(--fd-space-3) var(--fd-space-4);
		background-color: var(--fd-subtle);
		border-bottom: 1px solid var(--fd-border);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--fd-foreground);
	}

	.config-form__extensions-header :global(svg) {
		width: 1rem;
		height: 1rem;
		color: var(--fd-muted-foreground);
	}

	.config-form__extensions-content {
		padding: var(--fd-space-4);
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-4);
	}

	/* ============================================
	   DEBUG SECTION
	   ============================================ */

	.config-form__debug {
		background-color: var(--fd-warning-muted);
		border: 1px solid var(--fd-warning);
		border-radius: var(--fd-radius-lg);
		overflow: hidden;
	}

	.config-form__debug-header {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2);
		padding: var(--fd-space-3) var(--fd-space-4);
		background-color: var(--fd-warning-muted);
		border-bottom: 1px solid var(--fd-warning);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--fd-warning-hover);
	}

	.config-form__debug-header :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.config-form__debug-content {
		margin: 0;
		padding: var(--fd-space-4);
		font-size: var(--fd-text-xs);
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		color: var(--fd-foreground);
		overflow-x: auto;
		background-color: var(--fd-background);
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
		padding: var(--fd-space-12) var(--fd-space-6);
		text-align: center;
	}

	.config-form__empty-icon {
		width: 3rem;
		height: 3rem;
		margin-bottom: var(--fd-space-4);
		color: var(--fd-border);
	}

	.config-form__empty-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.config-form__empty-text {
		margin: 0;
		font-size: var(--fd-text-sm);
		color: var(--fd-muted-foreground);
		font-style: italic;
		line-height: 1.5;
	}

	.config-form__empty-button {
		margin-top: var(--fd-space-4);
	}

	/* ============================================
	   ADMIN/EDIT SECTION - External Configuration
	   ============================================ */

	.config-form__admin-edit {
		background: linear-gradient(135deg, var(--fd-info-muted) 0%, var(--fd-primary-muted) 100%);
		border: 1px solid var(--fd-primary);
		border-radius: 0.625rem;
		overflow: hidden;
		margin-bottom: var(--fd-space-4);
	}

	.config-form__admin-edit-header {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2);
		padding: var(--fd-space-3) var(--fd-space-4);
		background: linear-gradient(135deg, var(--fd-primary-muted) 0%, var(--fd-primary-muted) 100%);
		border-bottom: 1px solid var(--fd-primary);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--fd-primary-hover);
	}

	.config-form__admin-edit-header :global(svg) {
		width: 1rem;
		height: 1rem;
		color: var(--fd-primary);
	}

	.config-form__admin-edit-content {
		padding: var(--fd-space-4);
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-3);
	}

	.config-form__admin-edit-description {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--fd-primary-hover);
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
		padding: var(--fd-space-12) var(--fd-space-6);
		gap: var(--fd-space-4);
	}

	.config-form__loading-spinner {
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid var(--fd-primary-muted);
		border-top-color: var(--fd-primary);
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
		font-size: var(--fd-text-sm);
		color: var(--fd-muted-foreground);
	}

	/* ============================================
	   ERROR STATE
	   ============================================ */

	.config-form__error {
		background-color: var(--fd-error-muted);
		border: 1px solid var(--fd-error);
		border-radius: var(--fd-radius-lg);
		overflow: hidden;
	}

	.config-form__error-header {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2);
		padding: var(--fd-space-3) var(--fd-space-4);
		background-color: var(--fd-error-muted);
		border-bottom: 1px solid var(--fd-error);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--fd-error-hover);
	}

	.config-form__error-header :global(svg) {
		width: 1rem;
		height: 1rem;
		color: var(--fd-error);
	}

	.config-form__error-content {
		padding: var(--fd-space-4);
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-3);
	}

	.config-form__error-message {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--fd-error);
		line-height: 1.5;
	}

	.config-form__error-actions {
		display: flex;
		gap: var(--fd-space-2);
		flex-wrap: wrap;
	}

	/* ============================================
	   SCHEMA ACTIONS (Refresh, External Editor)
	   ============================================ */

	.config-form__schema-actions {
		display: flex;
		gap: var(--fd-space-2);
		margin-bottom: var(--fd-space-4);
		padding-bottom: var(--fd-space-3);
		border-bottom: 1px solid var(--fd-border-muted);
	}

	.config-form__schema-refresh,
	.config-form__schema-external {
		display: inline-flex;
		align-items: center;
		gap: var(--fd-space-1);
		padding: var(--fd-space-1) var(--fd-space-2);
		font-size: var(--fd-text-xs);
		font-weight: 500;
		font-family: inherit;
		border-radius: var(--fd-radius-md);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
		border: 1px solid transparent;
	}

	.config-form__schema-refresh {
		background-color: var(--fd-muted);
		border-color: var(--fd-border);
		color: var(--fd-muted-foreground);
	}

	.config-form__schema-refresh:hover {
		background-color: var(--fd-subtle);
		border-color: var(--fd-border-strong);
		color: var(--fd-foreground);
	}

	.config-form__schema-refresh :global(svg),
	.config-form__schema-external :global(svg) {
		width: 0.875rem;
		height: 0.875rem;
	}

	.config-form__schema-external {
		background-color: var(--fd-primary-muted);
		border-color: var(--fd-primary);
		color: var(--fd-primary-hover);
	}

	.config-form__schema-external:hover {
		background-color: var(--fd-primary-muted);
		border-color: var(--fd-primary-hover);
		color: var(--fd-primary-hover);
	}

	/* ============================================
	   EXTERNAL BUTTON STYLE
	   ============================================ */

	.config-form__button--external {
		background: linear-gradient(
			135deg,
			var(--fd-accent) 0%,
			var(--fd-primary) 100%
		);
		color: var(--fd-accent-foreground);
		box-shadow:
			0 1px 3px rgba(99, 102, 241, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.config-form__button--external:hover {
		background: linear-gradient(
			135deg,
			var(--fd-accent-hover) 0%,
			var(--fd-primary-hover) 100%
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
