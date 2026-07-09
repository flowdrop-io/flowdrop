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
  import { setContext } from 'svelte';
  import Icon from '@iconify/svelte';
  import type {
    ConfigSchema,
    WorkflowNode,
    WorkflowEdge,
    ConfigEditOptions,
    AuthProvider
  } from '$lib/types/index.js';
  import type { UISchemaElement } from '$lib/types/uischema.js';
  // Import the light, registry-based field factory and light fields directly
  // (not via the form barrel, which aggregates the heavy CodeMirror editors).
  import FormField from '$lib/components/form/FormFieldLight.svelte';
  import FormUISchemaRenderer from '$lib/components/form/FormUISchemaRenderer.svelte';
  import type { FieldSchema } from '$lib/components/form/types.js';
  import {
    getEffectiveConfigEditOptions,
    fetchDynamicSchema,
    resolveExternalEditUrl,
    resolveDynamicSchemaKey,
    invalidateSchemaCache,
    type DynamicSchemaResult
  } from '$lib/services/dynamicSchemaService.js';
  import { globalSaveWorkflow } from '$lib/services/globalSave.js';
  import { provideInstance } from '$lib/stores/getInstance.svelte.js';
  import { getAvailableVariables } from '$lib/services/variableService.js';
  import { logger } from '../utils/logger.js';
  import { mergeWithDefaults, cascadeClearAutocompleteDependents } from '$lib/utils/formMerge.js';
  import { applyFetchedSchema } from '$lib/utils/schemaMerge.js';

  interface Props {
    /** Optional workflow node (if provided, schema and values are derived from it) */
    node?: WorkflowNode;
    /** Direct config schema (used when node is not provided) */
    schema?: ConfigSchema;
    /**
     * Optional UI Schema that controls field layout and grouping.
     * When provided, fields render according to the UISchema tree structure.
     * When absent, falls back to node.data.metadata.uiSchema, then flat rendering.
     * @see https://jsonforms.io/docs/uischema
     */
    uiSchema?: UISchemaElement;
    /** Direct config values (used when node is not provided) */
    values?: Record<string, unknown>;
    /** Optional workflow ID for context in external links */
    workflowId?: string;
    /** Whether to also save the workflow when saving config */
    saveWorkflowWhenSavingConfig?: boolean;
    /**
     * All workflow nodes (used for deriving template variables from connected nodes).
     * When provided along with workflowEdges, enables autocomplete for template fields.
     */
    workflowNodes?: WorkflowNode[];
    /**
     * All workflow edges (used for finding connections to derive template variables).
     * When provided along with workflowNodes, enables autocomplete for template fields.
     */
    workflowEdges?: WorkflowEdge[];
    /** Auth provider for API requests (used for template variable API mode) */
    authProvider?: AuthProvider;
    /** Callback when any field value changes (fired on blur for immediate sync) */
    onChange?: (config: Record<string, unknown>) => void;
    /** Callback when form is saved */
    onSave?: (config: Record<string, unknown>) => void;
    /** Callback when form is cancelled */
    onCancel?: () => void;
  }

  let {
    node,
    schema,
    uiSchema,
    values,
    workflowId,
    saveWorkflowWhenSavingConfig = false,
    workflowNodes = [],
    workflowEdges = [],
    authProvider,
    onChange,
    onSave,
    onCancel
  }: Props = $props();

  // Resolve the active instance for endpoint configuration (dynamic schema fetch).
  // ConfigForm is a standalone-capable container (exported from /editor and able
  // to render bare, e.g. with a direct `schema`/`values`). Self-provide so its
  // leaf <FormField>s resolve and SSR doesn't throw. provideInstance() reuses an
  // ancestor's context instance when nested in <App>/<WorkflowEditor>, returns
  // the shared page-default in the browser, and creates a fresh per-render
  // instance on the server (no cross-request leakage); no destroy here for the
  // same reasons as SchemaForm (shared/default in the browser, no SSR teardown).
  const fd = provideInstance();

  // Set context for child components (e.g., FormAutocomplete)
  // Use getter functions to ensure child components always get the current prop value,
  // even if the prop changes after initial mount
  setContext<() => AuthProvider | undefined>('flowdrop:getAuthProvider', () => authProvider);

  /**
   * State for dynamic schema loading
   */
  let dynamicSchemaLoading = $state(false);
  let dynamicSchemaError = $state<string | null>(null);
  let fetchedDynamicSchema = $state<ConfigSchema | null>(null);
  // A uiSchema the endpoint returned alongside the schema (server-hydrated
  // forms). Held next to fetchedDynamicSchema and cleared in lockstep with it.
  let fetchedDynamicUiSchema = $state<UISchemaElement | null>(null);

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
    const staticSchema = schema ?? (node?.data.metadata?.configSchema as ConfigSchema | undefined);
    // A fetched dynamic schema is layered onto the static one per the endpoint's
    // mergeStrategy/target (default 'replace' → fetched wins wholesale). With no
    // static schema, the fetched schema is the form.
    if (fetchedDynamicSchema) {
      const endpoint = configEditOptions?.dynamicSchema;
      return endpoint
        ? applyFetchedSchema(staticSchema, fetchedDynamicSchema, endpoint)
        : fetchedDynamicSchema;
    }
    return staticSchema;
  });

  /**
   * Get the UI schema for the active configSchema.
   * Priority: direct uiSchema prop > fetched dynamic uiSchema > node metadata.
   *
   * When the dynamic fetch returned a uiSchema, it wins over the node's static
   * metadata uiSchema: the static one references only the static schema's
   * properties, so it can't lay out a server-provided (hydrated) schema — its
   * controls would point at fields that aren't rendered while the fetched
   * fields would have no controls at all. The endpoint is expected to return a
   * uiSchema describing the schema it served.
   */
  const configUISchema = $derived.by<UISchemaElement | undefined>(() => {
    if (uiSchema) return uiSchema;
    if (fetchedDynamicSchema && fetchedDynamicUiSchema) return fetchedDynamicUiSchema;
    return node?.data.metadata?.uiSchema as UISchemaElement | undefined;
  });

  /**
   * Whether this node sources its schema dynamically: dynamic schema is
   * configured and used, and it actually contributes to the form — either there
   * is no static schema to fall back on, it is explicitly preferred, or it is
   * configured to merge/target (in which case it layers onto the static schema
   * rather than replacing it, so we fetch even when a static schema exists).
   */
  const wantsDynamicSchema = $derived.by(() => {
    if (!node || !useDynamicSchema) return false;
    const endpoint = configEditOptions?.dynamicSchema;
    const layersOntoStatic = endpoint?.mergeStrategy === 'merge' || endpoint?.target != null;
    const staticSchema = schema ?? node.data.metadata?.configSchema;
    return !staticSchema || configEditOptions?.preferDynamicSchema === true || layersOntoStatic;
  });

  /**
   * Resolved fetch key for the dynamic schema endpoint. Read from the committed
   * `node.data.config` (not the in-flight `edits`/`configValues`), so it moves
   * at the commit boundary: a field edit reaches it only once `handleFormBlur`
   * fires `onChange` and the parent writes the value back onto the node. It
   * therefore recomputes when a committed config value the endpoint's
   * parameterMapping references changes (e.g. a trigger node's event_type),
   * driving the auto-refetch effect below. Relies on `node` being a deep
   * reactive proxy whose `.data.config` is mutated in place; a replaced node or
   * a plain snapshot would not re-run this derived.
   */
  const dynamicSchemaKey = $derived.by<string | null>(() => {
    if (!node || !configEditOptions?.dynamicSchema || !wantsDynamicSchema) return null;
    return resolveDynamicSchemaKey(configEditOptions.dynamicSchema, node, workflowId);
  });

  /**
   * Key of the schema currently loaded or in flight. Guards the effect from
   * re-fetching a schema whose inputs have not changed.
   */
  let loadedSchemaKey = $state<string | null>(null);

  /**
   * Get the current configuration from node or direct prop
   */
  const initialConfig = $derived(values ?? node?.data.config ?? {});

  /**
   * User edits to config — only keys the user has touched since the current
   * schema was loaded. configValues is derived from props + edits, so children
   * mount with the correct values already in place (no parent→child race
   * during the initial flush). Never assign to configValues directly.
   */
  let edits = $state<Record<string, unknown>>({});

  const configValues = $derived(mergeWithDefaults(configSchema, initialConfig, edits));

  setContext<() => Record<string, unknown>>('flowdrop:getFormValues', () => configValues);

  // Drop edits when the schema reference changes — covers dynamic-schema load
  // (configSchema flips from undefined → loaded) and "different node opened"
  // (node prop change → metadata.configSchema reference change). Identity
  // comparison only — value churn in `initialConfig` preserves in-flight edits.
  // capturing the initial derived reference is intentional; later changes are picked up by the effect below
  // svelte-ignore state_referenced_locally
  let prevSchemaRef = configSchema;
  $effect.pre(() => {
    if (configSchema !== prevSchemaRef) {
      prevSchemaRef = configSchema;
      edits = {};
    }
  });

  /**
   * Flag to track if workflow save is in progress
   */
  let isSavingWorkflow = $state(false);

  /**
   * Fetch dynamic schema when needed
   */
  async function loadDynamicSchema(): Promise<void> {
    if (!node || !configEditOptions?.dynamicSchema) return;

    dynamicSchemaLoading = true;
    dynamicSchemaError = null;

    try {
      const result: DynamicSchemaResult = await fetchDynamicSchema(
        fd.api.config,
        configEditOptions.dynamicSchema,
        node,
        workflowId
      );

      if (result.success && result.schema) {
        fetchedDynamicSchema = result.schema;
        fetchedDynamicUiSchema = result.uiSchema ?? null;
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
    invalidateSchemaCache(node, configEditOptions.dynamicSchema, workflowId);
    fetchedDynamicSchema = null;
    fetchedDynamicUiSchema = null;

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
   * Load — and reload — the dynamic schema when its resolved key changes.
   *
   * Covers both the initial fetch (loadedSchemaKey starts null) and refetching
   * after a config value the endpoint depends on changes (e.g. picking a
   * different trigger event_type). A load already in flight is left to finish;
   * the effect re-runs when it settles and picks up any newer key then.
   *
   * The `dynamicSchemaLoading` read is load-bearing in both directions: it
   * guards against re-entering while a fetch is in flight, AND — because it is
   * a tracked read — flipping back to false on settle is what re-runs this
   * effect to pick up a newer key. Don't hoist or drop it; the settle-and-
   * refetch depends on it.
   *
   * loadedSchemaKey is set BEFORE the fetch (not after success) on purpose: a
   * failed load consumes the key so a persistent error can't loop the effect
   * into a refetch storm. Recovery from an error is manual, via
   * refreshDynamicSchema().
   */
  $effect(() => {
    const key = dynamicSchemaKey;
    if (key === null || key === loadedSchemaKey || dynamicSchemaLoading) {
      return;
    }
    loadedSchemaKey = key;
    loadDynamicSchema();
  });

  /**
   * Check if a field is required based on schema
   */
  function isFieldRequired(key: string): boolean {
    if (!configSchema?.required) return false;
    return configSchema.required.includes(key);
  }

  /**
   * Handle field value changes from FormField components.
   *
   * When a field changes, also clear any sibling autocomplete that declared
   * this field in its `autocomplete.params` map — its previous value was
   * computed against the old dependency value and is now stale. The cascade
   * runs only on user-driven edits via this codepath; undo/redo and external
   * config replacement flow through `initialConfig` and don't trigger it (#33).
   */
  function handleFieldChange(key: string, value: unknown): void {
    const previous = configValues[key];
    edits[key] = value;
    if (previous === value) return;
    const dependents = cascadeClearAutocompleteDependents(configSchema, key);
    for (const [depKey, depValue] of Object.entries(dependents)) {
      edits[depKey] = depValue;
    }
  }

  /**
   * Handle form field blur - sync changes to workflow immediately
   * Uses focusout which bubbles from child elements
   * This enables auto-save behavior without requiring explicit Save button clicks
   */
  function handleFormBlur(): void {
    if (onChange) {
      // Spread `initialConfig` first so config keys the active schema doesn't
      // own (e.g. after a dynamic schema narrows the field set) pass through
      // untouched instead of being silently dropped; `configValues` then wins
      // for every field the schema actually renders.
      onChange({ ...initialConfig, ...configValues });
      // Discharge the edits buffer at the commit boundary. Subsequent prop
      // changes (parent absorbing the commit, undo/redo, collaboration) then
      // flow through `initialConfig` cleanly instead of being shadowed by a
      // stale local edit.
      edits = {};
    }
  }

  /**
   * Handle form submission
   * Collects config values and optionally saves the workflow.
   */
  async function handleSave(): Promise<void> {
    // Collect all form values including hidden fields. Start from
    // `initialConfig` so keys the active schema doesn't own survive the save
    // (see handleFormBlur); `configValues` and the DOM scrape below then take
    // precedence for every field the schema renders.
    const form = document.querySelector('.config-form');
    const updatedConfig: Record<string, unknown> = { ...initialConfig, ...configValues };

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

    if (onSave) {
      onSave(updatedConfig);
    }

    // Save workflow if the option is enabled
    if (saveWorkflowWhenSavingConfig) {
      isSavingWorkflow = true;
      try {
        await globalSaveWorkflow();
      } catch (error) {
        logger.error('Failed to save workflow after config save:', error);
      } finally {
        isSavingWorkflow = false;
      }
    }
  }

  /**
   * Convert ConfigProperty to FieldSchema for FormField component.
   * Processes template fields to inject computed variable schema.
   *
   * For template fields, the `variables` config controls which input ports
   * provide variables for autocomplete.
   */
  function toFieldSchema(property: Record<string, unknown>): FieldSchema {
    const fieldSchema = property as FieldSchema;

    // Process template fields to compute variable schema
    if (
      fieldSchema.format === 'template' &&
      node &&
      workflowNodes.length > 0 &&
      workflowEdges.length > 0
    ) {
      // Get the variables config (may be undefined or partially defined)
      const variablesConfig = fieldSchema.variables;

      // Compute the variable schema with optional port filtering and port name prefixing
      const computedSchema = getAvailableVariables(node, workflowNodes, workflowEdges, {
        targetPortIds: variablesConfig?.ports,
        includePortName: variablesConfig?.includePortName
      });

      // Merge computed schema with any pre-defined schema
      const mergedSchema = variablesConfig?.schema
        ? {
            variables: {
              ...computedSchema.variables,
              ...variablesConfig.schema.variables
            }
          }
        : computedSchema;

      return {
        ...fieldSchema,
        variables: {
          ...variablesConfig,
          schema: mergedSchema
        }
      } as FieldSchema;
    }

    return fieldSchema;
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
        {#if configUISchema}
          <FormUISchemaRenderer
            element={configUISchema}
            schema={configSchema}
            values={configValues}
            requiredFields={configSchema.required ?? []}
            onFieldChange={handleFieldChange}
            {toFieldSchema}
            {node}
            nodes={workflowNodes}
            edges={workflowEdges}
            {workflowId}
            {authProvider}
          />
        {:else}
          {#each Object.entries(configSchema.properties) as [key, field], index (key)}
            {@const fieldSchema = toFieldSchema(field as Record<string, unknown>)}
            {@const required = isFieldRequired(key)}

            <FormField
              fieldKey={key}
              schema={fieldSchema}
              value={configValues[key]}
              {required}
              animationIndex={index}
              {node}
              nodes={workflowNodes}
              edges={workflowEdges}
              {workflowId}
              {authProvider}
              onChange={(val) => handleFieldChange(key, val)}
            />
          {/each}
        {/if}
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
    gap: var(--fd-space-3xl);
  }

  .config-form__fields {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-2xl);
  }

  /* ============================================
	   FOOTER ACTIONS
	   Only shown when onSave is provided (legacy mode without onChange)
	   ============================================ */

  .config-form__footer {
    display: flex;
    gap: var(--fd-space-md);
    justify-content: flex-end;
    padding-top: var(--fd-space-xl);
    border-top: 1px solid var(--fd-border-muted);
    margin-top: var(--fd-space-xs);
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
    gap: var(--fd-space-xs);
    padding: 0.625rem var(--fd-space-xl);
    border-radius: var(--fd-control-radius);
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

  .config-form__button--primary {
    background: linear-gradient(135deg, var(--fd-primary) 0%, var(--fd-primary-hover) 100%);
    color: var(--fd-primary-foreground);
    box-shadow:
      0 1px 3px rgba(59, 130, 246, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .config-form__button--primary:hover {
    background: linear-gradient(135deg, var(--fd-primary-hover) 0%, var(--fd-primary-hover) 100%);
    box-shadow:
      0 4px 12px rgba(59, 130, 246, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  .config-form__button--primary:active {
    transform: translateY(0);
  }

  /* ============================================
	   DEBUG SECTION
	   ============================================ */

  .config-form__debug {
    background-color: var(--fd-warning-muted);
    border: 1px solid var(--fd-warning);
    border-radius: var(--fd-control-radius);
    overflow: hidden;
  }

  .config-form__debug-header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-xl);
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
    padding: var(--fd-space-xl);
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
    padding: var(--fd-space-6xl) var(--fd-space-3xl);
    text-align: center;
  }

  .config-form__empty-icon {
    width: 3rem;
    height: 3rem;
    margin-bottom: var(--fd-space-xl);
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
    margin-top: var(--fd-space-xl);
  }

  /* ============================================
	   ADMIN/EDIT SECTION - External Configuration
	   ============================================ */

  .config-form__admin-edit {
    background: linear-gradient(135deg, var(--fd-info-muted) 0%, var(--fd-primary-muted) 100%);
    border: 1px solid var(--fd-primary);
    border-radius: 0.625rem;
    overflow: hidden;
    margin-bottom: var(--fd-space-xl);
  }

  .config-form__admin-edit-header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-xl);
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
    padding: var(--fd-space-xl);
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
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
    padding: var(--fd-space-6xl) var(--fd-space-3xl);
    gap: var(--fd-space-xl);
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
    border-radius: var(--fd-control-radius);
    overflow: hidden;
  }

  .config-form__error-header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-xl);
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
    padding: var(--fd-space-xl);
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
  }

  .config-form__error-message {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--fd-error);
    line-height: 1.5;
  }

  .config-form__error-actions {
    display: flex;
    gap: var(--fd-space-xs);
    flex-wrap: wrap;
  }

  /* ============================================
	   SCHEMA ACTIONS (Refresh, External Editor)
	   ============================================ */

  .config-form__schema-actions {
    display: flex;
    gap: var(--fd-space-xs);
    margin-bottom: var(--fd-space-xl);
    padding-bottom: var(--fd-space-md);
    border-bottom: 1px solid var(--fd-border-muted);
  }

  .config-form__schema-refresh,
  .config-form__schema-external {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-3xs) var(--fd-space-xs);
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
    background: linear-gradient(135deg, var(--fd-accent) 0%, var(--fd-primary) 100%);
    color: var(--fd-accent-foreground);
    box-shadow:
      0 1px 3px rgba(99, 102, 241, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .config-form__button--external:hover {
    background: linear-gradient(135deg, var(--fd-accent-hover) 0%, var(--fd-primary-hover) 100%);
    box-shadow:
      0 4px 12px rgba(99, 102, 241, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  .config-form__button--external:active {
    transform: translateY(0);
  }
</style>
