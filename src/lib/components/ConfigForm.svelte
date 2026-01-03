<!--
  ConfigForm Component
  Handles dynamic form rendering for node or entity configuration
  Supports both node-based config and direct schema/values
  Uses SchemaFormAdapter to delegate form rendering to either json-editor or native implementation
  
  Features:
  - Dynamic form generation from JSON Schema via SchemaFormAdapter
  - UI Extensions integrated into schema as additional properties
  - Support for both json-editor and native modes
  
  Accessibility features:
  - Delegated to SchemaFormAdapter and underlying implementations
  - Focus-visible states for keyboard navigation
  - Required field indicators
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { ConfigSchema, WorkflowNode, NodeUIExtensions } from '$lib/types/index.js';
	import SchemaFormAdapter from '$lib/components/SchemaFormAdapter.svelte';
	import { formConfig } from '$lib/stores/formConfig.js';

	interface Props {
		/** Optional workflow node (if provided, schema and values are derived from it) */
		node?: WorkflowNode;
		/** Direct config schema (used when node is not provided) */
		schema?: ConfigSchema;
		/** Direct config values (used when node is not provided) */
		values?: Record<string, unknown>;
		/** Whether to show UI extension settings section */
		showUIExtensions?: boolean;
		/** Form adapter mode: "json-editor" or "native" (defaults to global config) */
		mode?: 'json-editor' | 'native';
		/** Callback when form is saved (includes both config and extensions if enabled) */
		onSave: (config: Record<string, unknown>, uiExtensions?: NodeUIExtensions) => void;
		/** Callback when form is cancelled */
		onCancel: () => void;
	}

	let { node, schema, values, showUIExtensions = true, mode, onSave, onCancel }: Props = $props();

	/**
	 * Determine the actual mode to use:
	 * 1. Use explicit prop if provided
	 * 2. Fall back to global configuration
	 */
	const actualMode = $derived(mode ?? $formConfig.mode);

	/**
	 * Reference to the SchemaFormAdapter instance
	 */
	let formAdapter: { getValue: () => Record<string, unknown> } | undefined = $state();

	/**
	 * Get the configuration schema from node metadata or direct prop
	 * If showUIExtensions is enabled, merge UI extension properties into schema
	 */
	const configSchema = $derived.by<ConfigSchema | undefined>(() => {
		const baseSchema = schema ?? (node?.data.metadata?.configSchema as ConfigSchema | undefined);

		if (!baseSchema) return undefined;

		// If UI extensions are enabled, merge them into the schema
		if (showUIExtensions && node) {
			const extendedSchema: ConfigSchema = {
				...baseSchema,
				properties: {
					...baseSchema.properties,
					// Add UI extension properties
					__ui_hideUnconnectedHandles: {
						type: 'boolean',
						title: 'Hide Unconnected Ports',
						description:
							'Hide input and output ports that are not connected to reduce visual clutter',
						default: false
					}
				}
			};
			return extendedSchema;
		}

		return baseSchema;
	});

	/**
	 * Get the current configuration from node or direct prop
	 * If showUIExtensions is enabled, merge UI extension values
	 */
	const initialValues = $derived.by<Record<string, unknown>>(() => {
		const baseValues = values ?? node?.data.config ?? {};

		// If UI extensions are enabled, merge extension values
		if (showUIExtensions && node) {
			const typeDefaults = node.data.metadata?.extensions?.ui ?? {};
			const instanceOverrides = node.data.extensions?.ui ?? {};
			const uiExtensions = { ...typeDefaults, ...instanceOverrides };

			return {
				...baseValues,
				__ui_hideUnconnectedHandles: uiExtensions.hideUnconnectedHandles ?? false
			};
		}

		return baseValues;
	});

	/**
	 * Handle form submission
	 * Separates config values from UI extension values
	 */
	function handleSave(): void {
		if (!formAdapter) return;

		const allValues = formAdapter.getValue();

		// Separate UI extension fields (prefixed with __ui_)
		const configValues: Record<string, unknown> = {};
		const uiExtensions: NodeUIExtensions = {};

		Object.entries(allValues).forEach(([key, value]) => {
			if (key.startsWith('__ui_')) {
				// Extract UI extension field
				const extensionKey = key.replace('__ui_', '');
				if (extensionKey === 'hideUnconnectedHandles') {
					uiExtensions.hideUnconnectedHandles = Boolean(value);
				}
			} else {
				// Regular config field
				configValues[key] = value;
			}
		});

		// Pass UI extensions only if enabled
		if (showUIExtensions && node) {
			onSave(configValues, uiExtensions);
		} else {
			onSave(configValues);
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
		<!-- Schema Form Adapter -->
		<div class="config-form__fields">
			<SchemaFormAdapter
				bind:this={formAdapter}
				schema={configSchema}
				values={initialValues}
				mode={actualMode}
				required={configSchema.required}
				nodeId={node?.id}
			/>
		</div>

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
	   Form rendering delegated to SchemaFormAdapter
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
