<!--
  FlowDrop App Component
  Main application wrapper with navbar, sidebars, and workflow editor
  Styled with BEM syntax
-->

<script lang="ts">
  import type { ContextMenuOptions } from '../editor/contextMenu.js';
  import { onMount, tick, untrack } from 'svelte';
  import MainLayout from '$lib/components/layouts/MainLayout.svelte';
  import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
  import NodeSidebar from '$lib/components/NodeSidebar.svelte';
  import DockedPlayground from '$lib/components/playground/DockedPlayground.svelte';
  import EditorModeSwitch from '$lib/components/EditorModeSwitch.svelte';
  import CanvasIconButton from '$lib/components/CanvasIconButton.svelte';
  import EditorStatusBar from '$lib/components/EditorStatusBar.svelte';
  import MenuIcon from '$lib/components/icons/MenuIcon.svelte';
  import MenuOpenIcon from '$lib/components/icons/MenuOpenIcon.svelte';
  import ConfigForm from '$lib/components/ConfigForm.svelte';
  import NodeInspector from '$lib/components/NodeInspector.svelte';
  import ConfigPanel from '$lib/components/ConfigPanel.svelte';
  import WorkflowInterfaceEditor from '$lib/components/WorkflowInterfaceEditor.svelte';
  import WorkflowPlaygroundSettings from '$lib/components/WorkflowPlaygroundSettings.svelte';
  import {
    followInterfaceInputEdit,
    withPlaygroundChat,
    withoutInterfaceTurns
  } from '$lib/utils/playgroundChat.js';
  import ReadOnlyDetails from '$lib/components/ReadOnlyDetails.svelte';
  import CommandConsole from '$lib/components/console/CommandConsole.svelte';
  import AIChatPanel from '$lib/components/chat/AIChatPanel.svelte';
  import TabbedSurface from '$lib/components/surfaces/TabbedSurface.svelte';
  import type { Snippet } from 'svelte';
  import type { SurfaceTab } from '$lib/components/surfaces/TabbedSurface.svelte';
  import SurfaceOverlay from '$lib/components/surfaces/SurfaceOverlay.svelte';
  import type { UIAction } from '$lib/commands/index.js';
  import NodeSwapPicker from '$lib/components/NodeSwapPicker.svelte';
  import SwapMappingEditor from '$lib/components/SwapMappingEditor.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import type { NavbarAction } from '$lib/types/navbar.js';
  import type { NodeMetadata, Workflow, WorkflowNode, ConfigSchema } from '$lib/types/index.js';
  import type { InteractiveSwapState, SwapEventContext } from '$lib/utils/nodeSwap.js';
  import {
    computeInteractiveState,
    buildSwapPreviewFromState,
    executeSwap,
    validateSwapResult
  } from '$lib/utils/nodeSwap.js';
  import type { SwapStrategy } from '$lib/utils/nodeSwap.js';
  import { DEFAULT_WORKFLOW_FORMAT } from '$lib/types/index.js';
  import { createEndpointConfig } from '$lib/config/endpoints.js';
  import type { EndpointConfig } from '$lib/config/endpoints.js';
  import type { AuthProvider } from '$lib/types/auth.js';
  import type { FlowDropEventHandlers, FlowDropFeatures } from '$lib/types/events.js';
  import { mergeFeatures } from '$lib/types/events.js';
  import type { FlowDropTheme, FlowDropThemeName } from '$lib/types/theme.js';
  import { buildScopedSkinCss, toScopeId } from '$lib/themes/scopedSkinCss.js';
  import { resolveTheme } from '$lib/themes/index.js';
  import { provideInstance } from '../stores/getInstance.svelte.js';
  import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
  import { globalSaveWorkflow, globalExportWorkflow } from '$lib/services/globalSave.js';
  import { apiToasts, dismissToast } from '$lib/services/toastService.js';
  import { initAutoSave } from '$lib/services/autoSaveService.js';
  import {
    getUiSettings,
    updateSettings,
    seedUiDefaults,
    initializeTheme
  } from '../stores/settingsStore.svelte.js';
  import { logger } from '../utils/logger.js';
  import {
    resolveInspectorSurface,
    closeTarget,
    openingNodeTab,
    type NodeInspectorTab
  } from '../utils/inspectorSurface.js';
  import { hasRun } from '../utils/lastRun.js';
  import { validateWorkflowData } from '../utils/validation.js';
  import type { SettingsCategory, SurfacePlacement } from '$lib/types/settings.js';
  import type { EditorMode } from '../stores/editorModeStore.svelte.js';
  import { defaultMessages, mergeMessages, setMessages } from '$lib/messages/index.js';
  import type { MessagesOverride } from '$lib/messages/index.js';

  /**
   * Configuration props for runtime customization
   */
  interface Props {
    /** Initial workflow to load */
    workflow?: Workflow;
    /** Pre-loaded node types (if provided, skips API fetch) */
    nodes?: NodeMetadata[];
    /** Editor height */
    height?: string | number;
    /** Editor width */
    width?: string | number;
    /** Show the navbar */
    showNavbar?: boolean;
    /** Disable the node sidebar */
    disableSidebar?: boolean;
    /**
     * Default host for the node/workflow configuration panel: `sidebar` (right
     * rail), `modal` (centered overlay), or `below` (bottom panel). Seeds the
     * user setting on first load — a value the user later changes wins.
     * @default 'sidebar'
     */
    configPlacement?: SurfacePlacement;
    /**
     * Default host for the console / AI Assistant group. Seeds the user setting
     * on first load — a value the user later changes wins.
     * @default 'below'
     */
    consolePlacement?: SurfacePlacement;
    /**
     * Editor interaction mode. Replaces the former `readOnly` + `lockWorkflow`
     * boolean pair (2.0 breaking change).
     *
     * | mode         | node drag / connect / select | proximity-connect | node swap | bottom console panel + toggle |
     * |--------------|------------------------------|-------------------|-----------|-------------------------------|
     * | `'edit'`     | enabled                      | enabled           | enabled   | available                     |
     * | `'readonly'` | disabled                     | disabled          | disabled  | hidden                        |
     * | `'locked'`   | disabled                     | disabled          | disabled  | hidden                        |
     *
     * In 1.x `readOnly` and `lockWorkflow` gated the exact same set of
     * interactions and were always combined as `!readOnly && !lockWorkflow`,
     * so any combination of the two booleans collapsed to "edit" (both false)
     * or "disabled" (either true). `'readonly'` and `'locked'` therefore behave
     * identically today; the two names are kept as distinct intents so future
     * versions can differentiate them without another breaking change.
     *
     * Migration: `readOnly` → `mode="readonly"`; `lockWorkflow` →
     * `mode="locked"`; both `false` (or unset) → `mode="edit"` (the default).
     *
     * @default 'edit'
     */
    mode?: 'edit' | 'readonly' | 'locked';
    /**
     * Start in, or switch to, Test mode: the Playground docked beside the
     * canvas and the inspector always open. A second axis beside `mode`: it
     * only takes effect on an editable canvas (`mode: 'edit'`) with a saved
     * workflow and no `pipelineId`, and `features.testMode` not off.
     *
     * Seeds `instance.editorMode`, the per-instance store that is the source
     * of truth afterwards (the navbar's Edit | Test switch writes it, and so
     * can a host: `instance.editorMode.set('test')`). A later change of this
     * prop sets the store again.
     *
     * @default 'edit'
     */
    editorMode?: EditorMode;
    /** Pipeline ID for fetching node execution info */
    pipelineId?: string;
    /** Increments to force a refresh of pipeline node status from the server */
    refreshTrigger?: number;
    /** Custom navbar title */
    navbarTitle?: string;
    /** Custom navbar actions */
    navbarActions?: NavbarAction[];
    /** Show settings gear icon in navbar */
    showSettings?: boolean;
    /** Show the "Connected" status indicator in the navbar (default: true) */
    showStatus?: boolean;
    /** API base URL */
    apiBaseUrl?: string;
    /** Endpoint configuration */
    endpointConfig?: EndpointConfig;
    /** Authentication provider */
    authProvider?: AuthProvider;
    /**
     * Called before save — return false to cancel. Forwarded to the save
     * pipeline. (Flattened from the former `eventHandlers` object in 2.0.)
     */
    onBeforeSave?: FlowDropEventHandlers['onBeforeSave'];
    /** Called after a successful save. */
    onAfterSave?: FlowDropEventHandlers['onAfterSave'];
    /** Called when a save fails. */
    onSaveError?: FlowDropEventHandlers['onSaveError'];
    /** Called on any API error — return true to suppress the default toast. */
    onApiError?: FlowDropEventHandlers['onApiError'];
    /** Called after a workflow is loaded/imported. */
    onWorkflowLoad?: FlowDropEventHandlers['onWorkflowLoad'];
    /** Called before a node swap — return false to cancel. */
    onBeforeSwap?: FlowDropEventHandlers['onBeforeSwap'];
    /** Called after a node swap is applied. */
    onAfterSwap?: FlowDropEventHandlers['onAfterSwap'];
    /** Feature configuration */
    features?: FlowDropFeatures;
    /** Visual theme — named built-in ('default' | 'minimal') or custom theme object */
    theme?: FlowDropTheme | FlowDropThemeName;
    /** Which settings tabs to show in the modal */
    settingsCategories?: SettingsCategory[];
    /** Show the "Sync to Cloud" button in the settings modal */
    showSettingsSyncButton?: boolean;
    /** Show the reset buttons in the settings modal */
    showSettingsResetButton?: boolean;
    /** Pluggable swap strategies — instance-scoped, checked in order */
    swapStrategies?: SwapStrategy[];
    /** Additional JSON Schema properties to show in the Workflow Settings panel. Values are persisted in workflow.config. */
    workflowSettingsSchema?: ConfigSchema;
    /**
     * Format ids this host supports (e.g. `['flowdrop']`). Filters the
     * "Workflow Format" options in the Workflow Settings panel; when one or
     * zero options remain the field is hidden entirely and the stored format
     * is left untouched. Omit to offer every registered format.
     */
    workflowFormats?: string[];
    /**
     * Override user-facing strings. Pass either a partial of the `Messages`
     * tree directly, or a callback that returns one. Missing keys fall through
     * to English defaults.
     *
     * For static overrides, a value is fine: `messages={{ common: { save: 'Apply' } }}`.
     * For reactive overrides driven by an i18n library (paraglide, etc.),
     * either form works — Svelte 5's prop reactivity propagates locale changes.
     * The callback form is useful when your translations live behind a
     * function call you'd rather not invoke unless the prop is actually read.
     */
    messages?: MessagesOverride | (() => MessagesOverride);
    /**
     * Customise the canvas context menu. `items` receives the built-in entries
     * and returns the final list. The menu only opens in `'edit'` mode.
     */
    contextMenu?: ContextMenuOptions;
    /** Per-instance state container (created by mount functions). Defaults to the page-default instance. */
    instance?: FlowDropInstance;
  }

  let {
    workflow: initialWorkflow,
    nodes: propNodes,
    height = '100vh',
    width = '100%',
    showNavbar = false,
    disableSidebar = false,
    configPlacement: configPlacementProp,
    consolePlacement: consolePlacementProp,
    mode = 'edit',
    editorMode: editorModeProp,
    pipelineId,
    refreshTrigger = 0,
    navbarTitle,
    navbarActions = [],
    showSettings = true,
    showStatus = true,
    apiBaseUrl,
    endpointConfig: propEndpointConfig,
    authProvider,
    onBeforeSave,
    onAfterSave,
    onSaveError,
    onApiError,
    onWorkflowLoad,
    onBeforeSwap,
    onAfterSwap,
    features: propFeatures,
    theme: themeProp,
    settingsCategories,
    showSettingsSyncButton,
    showSettingsResetButton,
    swapStrategies,
    workflowSettingsSchema,
    workflowFormats,
    messages: messagesOverride,
    contextMenu,
    instance
  }: Props = $props();

  // Resolve (and provide to children) the per-instance state container.
  // Must run during component init — provideInstance reads/sets Svelte context.
  // The instance never changes for a mounted component, so capturing it once is correct.
  // svelte-ignore state_referenced_locally
  const fd = provideInstance(instance);

  // feature flags don't change at runtime
  // svelte-ignore state_referenced_locally
  const features = mergeFeatures(propFeatures);

  // Test mode: the `editorMode` prop seeds the instance's store (the source of
  // truth from then on); a later change of the prop sets it again.
  // svelte-ignore state_referenced_locally
  if (editorModeProp) fd.editorMode.set(editorModeProp);
  // svelte-ignore state_referenced_locally
  let lastEditorModeProp = editorModeProp;
  $effect(() => {
    const requested = editorModeProp;
    if (requested === lastEditorModeProp) return;
    lastEditorModeProp = requested;
    if (requested) fd.editorMode.set(requested);
  });

  // `mode` is the public API; internally the canvas only cares whether editing
  // is disabled. 'readonly' and 'locked' both disable the same interactions
  // (see the `mode` prop JSDoc for the full matrix).
  const canvasEditable = $derived(mode === 'edit');

  /**
   * Test mode can be entered: it is offered, the canvas is editable, this is
   * not a pipeline view, and the workflow is saved (the Playground runs the
   * saved workflow's id).
   */
  const testModeAvailable = $derived(
    features.testMode && canvasEditable && !pipelineId && !!fd.workflow.current?.id
  );
  /** Test mode is in effect: requested, and available. */
  const testMode = $derived(testModeAvailable && fd.editorMode.isTest);
  const effectiveEditorMode = $derived<EditorMode>(testMode ? 'test' : 'edit');

  /** Narrow screens: the Playground is a drawer over the canvas, not a column. */
  let narrow = $state(false);
  let drawerOpen = $state(true);
  $effect(() => {
    // Entering Test mode shows the Playground.
    if (testMode) untrack(() => (drawerOpen = true));
  });

  /** The node library popover of Test mode (N). */
  let libraryOpen = $state(false);
  let libraryEl = $state<HTMLElement | null>(null);
  $effect(() => {
    if (!testMode) libraryOpen = false;
  });
  $effect(() => {
    if (!libraryOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (libraryEl && !libraryEl.contains(event.target as Node)) libraryOpen = false;
    };
    window.addEventListener('pointerdown', closeOnOutside, true);
    return () => window.removeEventListener('pointerdown', closeOnOutside, true);
  });
  function toggleLibrary(): void {
    libraryOpen = !libraryOpen;
    if (libraryOpen) {
      void tick().then(() =>
        libraryEl?.querySelector<HTMLInputElement>('.flowdrop-sidebar__search input')?.focus()
      );
    }
  }

  // Badges follow a run while it is watched, and this effect is the one owner
  // of loading them (through the coalesced fd.runs.requestNodeStatuses): in
  // Test mode always (the shown run, live or finished), in Edit mode while a
  // run exists (live, or ended and still on the run bar, whose fade drops it).
  // They are dropped when neither holds, so Edit mode at rest has none.
  const followRun = $derived(
    !pipelineId && (testMode || fd.runs.activeRun !== null || fd.runs.isLive)
  );
  const EDIT_STATUS_REFRESH_MS = 1500;
  $effect(() => {
    if (!followRun) return;
    // Tracked: the shown run, its status (a host run changes nothing else),
    // and every batch of new messages.
    void fd.playground.activeExecutionId;
    void fd.playground.sessionStatus;
    void fd.playground.pipelineRefreshTrigger;
    void fd.runs.activeRun?.runId;
    void fd.runs.activeRun?.status;
    untrack(() => fd.runs.requestNodeStatuses());
  });
  // Edit mode has no Playground poll to ride on (and a host run has none at
  // all), so while a run is live the badges are also asked for on a timer.
  $effect(() => {
    if (!followRun || testMode || !fd.runs.isLive) return;
    const timer = setInterval(() => fd.runs.requestNodeStatuses(), EDIT_STATUS_REFRESH_MS);
    return () => clearInterval(timer);
  });
  $effect(() => {
    if (!followRun) return;
    return () => fd.runs.clearNodeStatuses();
  });
  // `edited` marks: shown in Test mode only. The baseline is taken when a run
  // is first seen (live or opened), before any statuses load, so edits made
  // while its statuses are still loading count.
  $effect(() => {
    fd.editedNodes.setVisible(testMode);
  });
  $effect(() => {
    void fd.workflow.current?.id;
    const runId = fd.runs.activeRun?.runId ?? fd.playground.activeExecutionId ?? null;
    untrack(() => fd.editedNodes.track(pipelineId ? null : runId));
  });
  // Crossing between Edit and Test drops a run that has already ended, so the
  // bar does not come back stale. A live run keeps its state.
  $effect(() => {
    void testMode;
    untrack(() => {
      const run = fd.runs.activeRun;
      if (run && run.endedAt !== null) fd.runs.dismissRun();
    });
  });

  // Messages: merge consumer overrides over defaults; expose via context as a
  // getter so consumer-side reactivity (e.g. paraglide-js locale switches)
  // propagates into every child without a subscription. Accepts either a
  // value or a callback — normalize here so the rest of the component sees
  // the merged tree directly.
  let mergedMessages = $derived(
    mergeMessages(
      defaultMessages,
      typeof messagesOverride === 'function' ? messagesOverride() : messagesOverride
    )
  );
  // setContext must run during component init (synchronously, not in $effect)
  // — Svelte enforces that. The context value is a getter that closes over
  // the live $derived, so child components always read the current tree.
  setMessages(() => mergedMessages);

  // Default navbar primary actions — used when no `navbarActions` prop is supplied.
  // Derived so the labels track locale changes.
  const defaultPrimaryActions = $derived([
    {
      label: mergedMessages.navigation.save,
      href: '#save',
      icon: 'heroicons:document-arrow-down',
      variant: 'primary' as const,
      onclick: (e: Event) => {
        e.preventDefault();
        saveWorkflow();
      }
    },
    {
      label: mergedMessages.navigation.export,
      href: '#export',
      icon: 'heroicons:arrow-down-tray',
      variant: 'outline' as const,
      onclick: (e: Event) => {
        e.preventDefault();
        exportWorkflow();
      }
    },
    {
      label: mergedMessages.navigation.import,
      href: '#import',
      icon: 'heroicons:arrow-up-tray',
      variant: 'outline' as const,
      onclick: (e: Event) => {
        e.preventDefault();
        fileInputRef?.click();
      }
    },
    {
      label: mergedMessages.navigation.workflowSettings,
      href: '#settings',
      icon: 'heroicons:cog-6-tooth',
      variant: 'outline' as const,
      onclick: (e: Event) => {
        e.preventDefault();
        toggleWorkflowSettings();
      }
    }
  ]);

  // Theme system — resolve named theme or custom object, inject CSS tokens from skin
  // Explicit prop wins; falls back to user's persisted theme preference from settings
  let resolvedTheme = $derived(resolveTheme(themeProp ?? getUiSettings().theme));
  let themeConfig = $derived(resolvedTheme.config);

  // Skin tokens are scoped to this instance (data-fd-scope on .flowdrop-root,
  // copied onto portalled overlays), so two editors with different skins do
  // not overwrite each other and the host page gets no --fd-* variables.
  // See themes/scopedSkinCss.ts. data-theme stays page-global on <html>.
  // One cleaned value for the attribute, the skin rule and fd.skinScope.
  const rawScopeId = $props.id();
  const scopeId = toScopeId(rawScopeId);

  // Publish the scope on the instance so overlays mounted outside this tree
  // (the WebMCP approval dialog) can carry it. Cleared only if still ours.
  $effect(() => {
    fd.skinScope = scopeId;
    return () => {
      if (fd.skinScope === scopeId) fd.skinScope = null;
    };
  });

  $effect(() => {
    if (typeof document === 'undefined') return;
    const css = buildScopedSkinCss(scopeId, resolvedTheme.skin);
    if (!css) return;

    const style = document.createElement('style');
    style.setAttribute('data-fd-skin', scopeId);
    style.textContent = css;
    document.head.appendChild(style);

    return () => style.remove();
  });

  // Create breadcrumb-style title - at top level to avoid store subscription issues
  let breadcrumbTitle = $derived.by(() => {
    // Use custom navbar title if provided
    if (navbarTitle) {
      return navbarTitle;
    }
    // Default workflow title logic
    const wfName = fd.workflow.name;
    if (!wfName || wfName === 'Untitled Workflow') {
      return 'Workflow / New Workflow';
    }
    return `Workflow / ${wfName}`;
  });

  let nodes = $state<NodeMetadata[]>([]);
  let nodeTypesLoading = $state<boolean>(true);

  // The instance carries the list this editor knows, so code outside the
  // component tree (the WebMCP adapter's list_types / add_node) reads what the
  // editor fetched instead of fetching again.
  $effect(() => {
    fd.nodeTypes.set(nodes);
  });
  // Remove workflow prop - use global store directly
  // let workflow = $derived($workflowStore || initialWorkflow);
  let error = $state<string | null>(null);
  let endpointConfig = $state<EndpointConfig | null>(null);

  // ConfigSidebar state
  let isConfigSidebarOpen = $state(false);
  let selectedNodeId = $state<string | null>(null);

  // Workflow settings sidebar state
  let isWorkflowSettingsOpen = $state(false);
  // Inner tab within the workflow-settings surface — see Phase 3 of
  // `.claude/plans/workflow-interface.md`. Settings and the interface editor
  // are two tabs of one surface, not a field inside the settings form.
  let workflowSettingsTab = $state<'settings' | 'interface' | 'playground'>('settings');
  // The Playground tab exists only while the workflow carries Playground
  // settings; a workflow loaded without them shows Settings. Derived rather
  // than reset, so there is no frame with the Playground tab picked and
  // nothing shown, and the pick comes back with a workflow that has them.
  const activeWorkflowSettingsTab = $derived(
    workflowSettingsTab === 'playground' && fd.workflow.current?.playground === undefined
      ? 'settings'
      : workflowSettingsTab
  );

  // Which surface (`config` | `console` | `chat`) is focused in its host. A
  // single selector across hosts: each TabbedSurface highlights this id when it
  // hosts that surface, else falls back to its own first tab. Opening config
  // focuses it wherever it lives (sidebar/modal/below).
  let activeSurface = $state<string>(getUiSettings().bottomPanelTab);

  // Node swap state
  let swapMode = $state<'idle' | 'picking' | 'mapping'>('idle');
  let swapInteractiveState = $state<InteractiveSwapState | null>(null);

  // Built-in workflow settings field names — consumer schemas must not reuse these.
  // 'interface' is reserved too: it names `Workflow.interface`'s own tab, not a
  // workflowSettingsSchema field, but a consumer schema could still collide.
  const WORKFLOW_SETTINGS_RESERVED = new Set([
    'name',
    'description',
    'format',
    'interface',
    'playground'
  ]);

  // Registered formats this host offers — the mount-level `workflowFormats`
  // allowlist filters the registry (an unknown id filters to nothing rather
  // than erroring; the field simply hides).
  let workflowFormatOptions = $derived(
    fd.formats
      .getOneOfOptions()
      .filter((option) => !workflowFormats || workflowFormats.includes(option.const))
  );

  // Workflow configuration schema (derived to pick up dynamic format options)
  let workflowConfigSchema: ConfigSchema = $derived.by(() => {
    const extraProps = Object.fromEntries(
      Object.entries(workflowSettingsSchema?.properties ?? {}).filter(([k]) => {
        if (WORKFLOW_SETTINGS_RESERVED.has(k)) {
          logger.warn(
            `workflowSettingsSchema: property "${k}" is reserved and will be ignored. Choose a different key.`
          );
          return false;
        }
        return true;
      })
    );
    const extraRequired = (workflowSettingsSchema?.required ?? []).filter(
      (k) => !WORKFLOW_SETTINGS_RESERVED.has(k)
    );
    return {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          title: 'Workflow Name',
          description: 'The name of the workflow',
          default: ''
        },
        description: {
          type: 'string',
          title: 'Description',
          description: 'A description of the workflow',
          format: 'multiline',
          default: ''
        },
        // A format choice is only real when the host supports more than one
        // format: with a single (or empty) filtered option set the field is
        // hidden, and the stored format is preserved on apply (see onChange).
        ...(workflowFormatOptions.length > 1 && {
          format: {
            type: 'string' as const,
            title: 'Workflow Format',
            description: 'The specification format for this workflow',
            oneOf: workflowFormatOptions,
            default: 'flowdrop'
          }
        }),
        ...extraProps
      },
      required: ['name', ...extraRequired]
    };
  });

  // Workflow configuration values
  let workflowConfigValues = $derived({
    name: fd.workflow.name || '',
    description: fd.workflow.current?.description || '',
    ...(workflowFormatOptions.length > 1 && {
      format: fd.workflow.current?.metadata?.format || 'flowdrop'
    }),
    ...(fd.workflow.current?.config ?? {})
  });

  // Get the current node from the workflow store
  let selectedNodeForConfig = $derived.by(() => {
    const wf = fd.workflow.current;
    if (!selectedNodeId || !wf) return null;
    return wf.nodes.find((node) => node.id === selectedNodeId) || null;
  });

  // WorkflowEditor reference for save functionality
  let workflowEditorRef: WorkflowEditor | null = null;

  /**
   * Fetch node types from the server
   *
   * If propNodes is provided, uses those instead of fetching from API.
   * Uses enhanced API client with authProvider support when available.
   */
  async function fetchNodeTypes(): Promise<void> {
    // If nodes were provided as props, use them directly (skip API fetch)
    if (propNodes && propNodes.length > 0) {
      // Merge format-provided nodes with prop nodes (deduplicate by ID, props take priority)
      const formatNodes = fd.formats.getAllFormatNodes();
      const existingIds = new Set(propNodes.map((n) => n.node_type_id));
      const uniqueFormatNodes = formatNodes.filter((n) => !existingIds.has(n.node_type_id));
      nodes = [...propNodes, ...uniqueFormatNodes];
      nodeTypesLoading = false;
      return;
    }

    // Show loading toast (if toasts are enabled)
    const loadingToast = features.showToasts ? apiToasts.loading('Loading node types') : null;
    try {
      error = null;

      // Fetch via this instance's API client (configured in initializeApiEndpoints).
      const fetchedNodes: NodeMetadata[] = await fd.api.client.getAvailableNodes();

      // Merge format-provided nodes with API nodes (deduplicate by ID, API takes priority)
      const formatNodes = fd.formats.getAllFormatNodes();
      const existingIds = new Set(fetchedNodes.map((n) => n.node_type_id));
      const uniqueFormatNodes = formatNodes.filter((n) => !existingIds.has(n.node_type_id));
      nodes = [...fetchedNodes, ...uniqueFormatNodes];
      error = null;
      nodeTypesLoading = false;

      // Dismiss loading toast
      if (loadingToast) {
        dismissToast(loadingToast);
      }
    } catch (err) {
      // Dismiss loading toast and show error toast
      if (loadingToast) {
        dismissToast(loadingToast);
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Notify parent via event handler
      if (onApiError) {
        const suppressToast = onApiError(
          err instanceof Error ? err : new Error(errorMessage),
          'fetchNodes'
        );
        if (suppressToast) {
          // Parent handled the error, keep nodes empty
          nodes = [];
          nodeTypesLoading = false;
          return;
        }
      }

      // Show error and set empty nodes array (no fallback to sample data)
      error = `API Error: ${errorMessage}. No node types available.`;
      if (features.showToasts) {
        apiToasts.error('Load node types', errorMessage);
      }

      // Set empty nodes array instead of fallback data
      nodes = [];
      nodeTypesLoading = false;
    }
  }

  /**
   * Retry loading node types
   */
  function retryLoad(): void {
    fetchNodeTypes();
  }

  /**
   * Test API connection
   */
  async function testApiConnection(): Promise<void> {
    try {
      const baseUrl = endpointConfig?.baseUrl || apiBaseUrl || '/api/flowdrop';
      const testUrl = `${baseUrl}/nodes`;

      const response = await fetch(testUrl);
      const data = await response.json();

      if (response.ok && data.success) {
        apiToasts.success('API connection test', 'Connection successful');
      } else {
        apiToasts.error('API connection test', 'Connection failed');
      }
    } catch (err) {
      apiToasts.error('API connection test', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  /**
   * Initialize API endpoints and create enhanced client if authProvider is available
   * Priority: propEndpointConfig > existingConfig > apiBaseUrl > default
   */
  async function initializeApiEndpoints(): Promise<void> {
    // First priority: Use endpointConfig prop if provided (from mountFlowDropApp)
    if (propEndpointConfig) {
      configureApi(propEndpointConfig);
      return;
    }

    // Second priority: Reuse this instance's existing config (e.g. set by a
    // parent layout that already configured fd.api) when no override is given.
    const existingConfig = fd.api.config;
    if (existingConfig && !apiBaseUrl) {
      configureApi(existingConfig);
      return;
    }

    // Third priority: Use provided apiBaseUrl or default
    const baseUrl = apiBaseUrl || '/api/flowdrop';

    const config = createEndpointConfig(baseUrl, {
      timeout: 10000, // 10 second timeout
      retry: {
        enabled: true,
        maxAttempts: 2,
        delay: 1000,
        backoff: 'exponential'
      }
    });

    configureApi(config);
  }

  /**
   * Configure this instance's ApiContext and mirror its config/client into the
   * local state used by child components and the save service.
   */
  function configureApi(config: EndpointConfig): void {
    fd.api.configure(config, authProvider);
    endpointConfig = config;
  }

  /**
   * ConfigSidebar functions
   */
  function openConfigSidebar(node: WorkflowNode): void {
    // Close if already open for the same node
    if (isConfigSidebarOpen && selectedNodeId === node.id) {
      closeConfigSidebar();
      return;
    }
    selectedNodeId = node.id;
    isConfigSidebarOpen = true;
    activeSurface = 'config';
    // Reset swap state when switching nodes
    swapMode = 'idle';
    swapInteractiveState = null;
  }

  function closeConfigSidebar(): void {
    isConfigSidebarOpen = false;
    selectedNodeId = null;
    // Reset swap state when closing
    swapMode = 'idle';
    swapInteractiveState = null;
  }

  // Which tab the open node shows. Picked when the node opens (Last run in Test
  // mode if it ran in the shown run, else Config) and kept until another node
  // opens, so a node that starts running under the cursor does not change the
  // tab by itself. Edit mode always resolves to Config (`NodeInspector`).
  let nodeTabPick = $state<{ nodeId: string; tab: NodeInspectorTab } | null>(null);
  $effect.pre(() => {
    const id = selectedNodeId;
    untrack(() => {
      if (!id) {
        nodeTabPick = null;
      } else if (nodeTabPick?.nodeId !== id) {
        nodeTabPick = {
          nodeId: id,
          tab: openingNodeTab(effectiveEditorMode, hasRun(fd.playground.nodeStatusFor(id)))
        };
      }
    });
  });
  const nodeInspectorTab = $derived<NodeInspectorTab>(
    nodeTabPick && nodeTabPick.nodeId === selectedNodeId ? nodeTabPick.tab : 'config'
  );

  // Messages and canvas nodes light each other up through fd.highlight; the
  // open node is the "selected" one.
  $effect(() => {
    fd.highlight.setSelected(selectedNodeForConfig?.id ?? null);
    return () => fd.highlight.setSelected(null);
  });

  /**
   * A message's node link was clicked: select the node, open its Last run and
   * bring it into view. Only on request (this is the one place the view moves
   * for a run). False when this is not Test mode or the node is gone.
   */
  function revealNodeLastRun(nodeId: string): boolean {
    const node = fd.workflow.current?.nodes.find((n) => n.id === nodeId);
    if (!testMode || !node) return false;
    nodeTabPick = { nodeId, tab: 'lastRun' };
    selectedNodeId = nodeId;
    isConfigSidebarOpen = true;
    activeSurface = 'config';
    swapMode = 'idle';
    swapInteractiveState = null;
    workflowEditorRef?.canvasFocusNode(nodeId);
    return true;
  }
  $effect(() => fd.highlight.setRevealHandler(revealNodeLastRun));

  /**
   * Toggle workflow settings sidebar
   */
  function toggleWorkflowSettings(): void {
    if (testMode) {
      // The workflow tabs are Test mode's resting inspector: this brings them
      // back from a node, and there is nothing to close.
      closeConfigSidebar();
      return;
    }
    isWorkflowSettingsOpen = !isWorkflowSettingsOpen;
    // Close config sidebar if opening workflow settings
    if (isWorkflowSettingsOpen) {
      closeConfigSidebar();
      activeSurface = 'config';
    }
  }

  /**
   * Show the workflow's Playground settings: the workflow tabs with the
   * Playground tab selected, in Test mode's resting inspector or, in Edit
   * mode, as the workflow-settings surface. The docked Playground links here.
   */
  function openPlaygroundSettings(): void {
    if (fd.workflow.current?.playground === undefined) return;
    workflowSettingsTab = 'playground';
    closeConfigSidebar();
    if (!testMode) {
      isWorkflowSettingsOpen = true;
      activeSurface = 'config';
    }
  }

  /**
   * Start swap mode — transitions the right sidebar to the node picker
   */
  function startSwap(): void {
    swapMode = 'picking';
    swapInteractiveState = null;
  }

  /**
   * Handle selection of a target node type for swap
   */
  function handleSwapSelect(metadata: NodeMetadata): void {
    const node = selectedNodeForConfig;
    if (!node) return;

    const wf = fd.workflow.current;
    if (!wf) return;

    // Format compatibility guard — defence-in-depth behind picker's own filter
    const currentFormat = fd.workflow.format;
    if (metadata.formats?.length && !metadata.formats.includes(currentFormat)) {
      return;
    }

    // Port compatibility comes from this instance's checker.
    const interactive = computeInteractiveState(node, metadata, wf.edges, wf.nodes, {
      checker: fd.portCompatibility,
      strategies: swapStrategies
    });

    swapInteractiveState = interactive;
    swapMode = 'mapping';
  }

  /**
   * Execute the confirmed node swap
   */
  async function executeNodeSwap(finalState?: InteractiveSwapState): Promise<void> {
    const state = finalState ?? swapInteractiveState;
    if (!state) return;

    const wf = fd.workflow.current;
    if (!wf) return;

    const oldLabel = state.oldNode.data.label;
    const newLabel = state.newMetadata.name;

    // Convert interactive state to swap preview
    const preview = buildSwapPreviewFromState(state, wf.edges);

    // Execute the swap
    const result = executeSwap(state.oldNode, state.newMetadata, preview, wf.nodes, wf.edges);

    // Post-swap validation
    const validation = validateSwapResult(result);
    if (!validation.valid) {
      logger.error('Swap validation failed:', validation.error);
      return;
    }

    // onBeforeSwap hook — abort if returns false
    if (onBeforeSwap) {
      const swapEventCtx: SwapEventContext = {
        oldNode: state.oldNode,
        newMetadata: state.newMetadata,
        preview,
        portOverrides: [],
        configOverrides: []
      };
      const shouldProceed = await onBeforeSwap(swapEventCtx);
      if (shouldProceed === false) return;
    }

    // Apply as a single atomic swap with descriptive history entry
    fd.workflow.swapNode({
      nodes: result.updatedNodes,
      edges: result.updatedEdges,
      description: `Swap node: ${oldLabel} → ${newLabel}`,
      oldNodeId: state.oldNode.id,
      newNodeId: state.newNodeId,
      portMappings: preview.portMappings
    });

    // onAfterSwap hook (fire-and-forget — swap is already applied)
    if (onAfterSwap) {
      try {
        onAfterSwap(result, state.oldNode, state.newNodeId);
      } catch (err) {
        logger.error('onAfterSwap hook error:', err);
      }
    }

    // Select the new node in the sidebar
    const newNodeId = state.newNodeId;
    selectedNodeId = newNodeId;

    // Reset swap state
    swapMode = 'idle';
    swapInteractiveState = null;

    // Wait for SvelteFlow to process the new node before updating visual state
    await tick();

    // Refresh the editor visual state
    if (workflowEditorRef) {
      const newNode = result.updatedNodes.find((n) => n.id === newNodeId);
      if (newNode) {
        workflowEditorRef.updateNodeData(newNodeId, newNode.data);
        await workflowEditorRef.refreshEdgePositions(newNodeId);
      }
    }
  }

  /**
   * Cancel swap and return to normal config view
   */
  function cancelSwap(): void {
    swapMode = 'idle';
    swapInteractiveState = null;
  }

  /**
   * Save workflow - thin wrapper that delegates to globalSaveWorkflow().
   *
   * All save logic (blur flush, metadata construction, API call, event hooks,
   * toast notifications) lives in globalSave.ts — the single source of truth.
   */
  // --- Node config live-edit sessions --------------------------------------
  // Config fields commit live (per change) into the store via
  // fd.workflow.updateNodeConfig(), which coalesces a field-editing session
  // into a single undo step and defers the external change event. We finalize
  // that session — commit the undo step, fire the deferred event, and refresh
  // edge geometry ONCE — on blur, panel close, node switch, and save. Edges are
  // refreshed only here, never per keystroke (that per-change recompute, plus a
  // full-workflow history clone per keystroke, was the original editor freeze).
  let pendingConfigNodeId: string | null = null;

  function flushNodeConfigEdit(): void {
    const nodeId = pendingConfigNodeId;
    pendingConfigNodeId = null;
    fd.workflow.finalizeNodeConfig();
    if (nodeId) {
      // Handle geometry can only have changed via config (e.g. gateway
      // branches); refresh once now that the session is done.
      void workflowEditorRef?.refreshEdgePositions(nodeId);
    }
  }

  // Finalize the previous field session when the open config node changes
  // (switching nodes, or closing the panel). Tracks the node id reactively;
  // the flush itself is untracked so it can't feed back into the effect.
  let lastConfigNodeId: string | null = null;
  $effect(() => {
    const id = activeConfig?.kind === 'node' ? activeConfig.node.id : null;
    if (id !== lastConfigNodeId) {
      lastConfigNodeId = id;
      untrack(() => flushNodeConfigEdit());
    }
  });

  async function saveWorkflow(): Promise<boolean> {
    // Commit any in-flight config edit so the save and its history are
    // consistent (the value itself is already live in the store).
    flushNodeConfigEdit();
    return globalSaveWorkflow({
      eventHandlers: { onBeforeSave, onAfterSave, onSaveError, onApiError },
      features,
      instance: fd,
      onMarkAsSaved: () => fd.workflow.markAsSaved()
    });
  }

  /**
   * Export workflow - thin wrapper that delegates to globalExportWorkflow().
   *
   * All export logic (flush, metadata construction, file download) lives
   * in globalSave.ts — the single source of truth.
   */
  async function exportWorkflow(): Promise<void> {
    await globalExportWorkflow({ features, instance: fd });
  }

  /**
   * Import workflow from a JSON file
   *
   * Reads the selected file, validates its structure, and loads it into the workflow store.
   */
  function importWorkflow(file: File): void {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Could not read file contents.');
        }
        const data = JSON.parse(text);
        const validation = validateWorkflowData(data);
        if (!validation.valid) {
          if (features.showToasts) {
            apiToasts.error('Import workflow', validation.error ?? 'Invalid workflow JSON');
          }
          logger.warn('Workflow import validation failed:', validation.error);
          return;
        }
        fd.workflow.initialize(data as Workflow);
        if (features.showToasts) {
          apiToasts.success('Import workflow', 'Workflow imported successfully');
        }
        if (onWorkflowLoad) {
          onWorkflowLoad(data as Workflow);
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error('Workflow import failed:', errorObj);
        if (features.showToasts) {
          apiToasts.error('Import workflow', errorObj);
        }
      }
    };
    reader.onerror = () => {
      const message = 'Failed to read the selected file.';
      logger.error(message);
      if (features.showToasts) {
        apiToasts.error('Import workflow', message);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Handle file input change event for workflow import
   */
  function handleImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      importWorkflow(file);
    }
    // Reset input so same file can be re-imported
    input.value = '';
  }

  // Function to handle clicks outside the sidebar
  function handleCanvasClick(event: MouseEvent): void {
    // Check if the click is outside the right sidebar
    const rightSidebar = document.querySelector('.flowdrop-main-layout__sidebar--right');
    if (rightSidebar && !rightSidebar.contains(event.target as Node)) {
      // Close sidebar when clicking outside of it
      if (isConfigSidebarOpen) {
        closeConfigSidebar();
      }
    }
  }

  // Load node types on mount
  onMount(() => {
    // Apply the persisted theme preference to the document and wire its
    // reactivity. Idempotent — a no-op when mountFlowDropApp already
    // initialized it; load-bearing for hosts rendering <App> directly,
    // where nothing else applies data-theme (the persisted light/dark
    // choice was otherwise never restored on reload).
    initializeTheme();

    // Seed placement defaults from mount props without clobbering a returning
    // user's persisted choices (host default < user snapshot).
    seedUiDefaults({
      configPlacement: configPlacementProp,
      consolePlacement: consolePlacementProp
    });

    (async () => {
      try {
        await initializeApiEndpoints();

        // The instance's port compatibility checker is seeded with
        // DEFAULT_PORT_CONFIG at construction; mountFlowDropApp re-initializes
        // it from the backend's port config. SvelteKit routes that render
        // <App> directly keep the defaults (no separate fetch here).

        await fetchNodeTypes();

        // Initialize the workflow store
        if (initialWorkflow) {
          fd.workflow.initialize(initialWorkflow);

          // Emit onWorkflowLoad event
          if (onWorkflowLoad) {
            onWorkflowLoad(initialWorkflow);
          }
        } else {
          // Initialize with a default empty workflow so the editor is functional
          // (e.g., drag-and-drop requires a non-null workflow in the store)
          const defaultWorkflow: Workflow = {
            id: '',
            name: 'Untitled Workflow',
            nodes: [],
            edges: [],
            metadata: {
              schemaVersion: '1.0.0',
              format: DEFAULT_WORKFLOW_FORMAT,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          };
          fd.workflow.initialize(defaultWorkflow);
        }
      } catch (error) {
        logger.error('Failed to initialize editor:', error);
      }
    })();

    // Narrow screens: Test mode's Playground is a drawer over the canvas.
    const narrowQuery = window.matchMedia('(max-width: 1199px)');
    narrow = narrowQuery.matches;
    const handleNarrowChange = (event: MediaQueryListEvent) => (narrow = event.matches);
    narrowQuery.addEventListener('change', handleNarrowChange);

    // Listen for workflow settings toggle from main navbar
    const handleWorkflowSettingsToggle = () => {
      toggleWorkflowSettings();
    };

    window.addEventListener('workflow-settings-toggle', handleWorkflowSettingsToggle);

    // Initialize auto-save based on user settings
    const cleanupAutoSave = initAutoSave({
      isDirty: () => fd.workflow.isDirty,
      onSave: async () => {
        await saveWorkflow();
      },
      onError: (error) => {
        // Don't show toast for auto-save errors to avoid noise
        logger.warn('Auto-save failed:', error);
      },
      onSuccess: () => {
        logger.debug('Auto-saved workflow');
      }
    });

    return () => {
      window.removeEventListener('workflow-settings-toggle', handleWorkflowSettingsToggle);
      narrowQuery.removeEventListener('change', handleNarrowChange);
      cleanupAutoSave();
    };
  });

  // =========================================================================
  // Surface placement — where the config panel and console/chat are hosted.
  // =========================================================================

  // Test mode always shows the inspector in the right sidebar, whatever
  // placement the person chose for Edit mode.
  const configPlacement = $derived(testMode ? 'sidebar' : getUiSettings().configPlacement);
  const consolePlacement = $derived(getUiSettings().consolePlacement);

  /** Config surface has something to show (node config or workflow settings). Test mode always has. */
  const configActive = $derived(isWorkflowSettingsOpen || !!selectedNodeForConfig || testMode);
  /** The Command Console tab is offered by this mount. */
  const consoleTabOffered = features.console;
  /** The AI Assistant tab is offered: switched on, and a chat backend exists. */
  const chatTabOffered = $derived(
    features.assistant && endpointConfig?.endpoints?.chat !== undefined
  );
  /** At least one surface of the console/chat group is offered. */
  const consoleGroupOffered = $derived(consoleTabOffered || chatTabOffered);
  /** Console/chat group is available (offered, editable canvas, console toggled open). */
  const consoleActive = $derived(
    consoleGroupOffered && getUiSettings().consoleOpen && canvasEditable
  );

  /**
   * The console-group tabs this mount offers, for whichever host renders them.
   * Snippets are passed in because they are declared in the template.
   */
  function consoleGroupTabs(consoleBody: Snippet, chatBody: Snippet): SurfaceTab[] {
    return [
      ...(consoleTabOffered
        ? [
            {
              id: 'console',
              label: mergedMessages.navigation.bottomPanel.console,
              content: consoleBody,
              display: 'contents' as const
            }
          ]
        : []),
      ...(chatTabOffered
        ? [{ id: 'chat', label: mergedMessages.navigation.bottomPanel.chat, content: chatBody }]
        : [])
    ];
  }
  /** Node-swap sub-flow occupies the right sidebar regardless of placement. */
  const swapActive = $derived(swapMode !== 'idle');

  const configHere = (loc: SurfacePlacement) => configActive && configPlacement === loc;
  const consoleHere = (loc: SurfacePlacement) => consoleActive && consolePlacement === loc;

  /** Any surface routed to a given host location is present there. */
  const anyHere = (loc: SurfacePlacement) => configHere(loc) || consoleHere(loc);

  /**
   * Metadata for the active config surface, independent of its host. The form
   * itself is rendered by the host via the `configBody` snippet.
   */
  const inspectorSurface = $derived(
    resolveInspectorSurface({
      hasNode: !!selectedNodeForConfig,
      workflowOpen: isWorkflowSettingsOpen,
      editorMode: effectiveEditorMode
    })
  );
  /** The inspector can be closed: not the workflow tabs of Test mode, which rest there. */
  const configClosable = $derived(closeTarget(inspectorSurface, effectiveEditorMode) !== null);

  const activeConfig = $derived.by(() => {
    if (inspectorSurface === 'workflow') {
      return {
        kind: 'workflow' as const,
        title: mergedMessages.navigation.workflowSettingsPanelTitle,
        id: fd.workflow.current?.id,
        description: undefined as string | undefined,
        details: [
          { label: 'Nodes', value: String(fd.workflow.current?.nodes?.length ?? 0) },
          { label: 'Connections', value: String(fd.workflow.current?.edges?.length ?? 0) }
        ],
        configTitle: mergedMessages.navigation.workflowSettingsPanelSubtitle
      };
    }
    const node = inspectorSurface === 'node' ? selectedNodeForConfig : null;
    if (node) {
      return {
        kind: 'node' as const,
        node,
        title: node.data.label,
        id: node.id,
        description:
          node.data.metadata?.description || mergedMessages.navigation.nodeConfigDescription,
        details: [
          { label: 'Type', value: node.data.metadata?.type || node.type },
          { label: 'Category', value: node.data.metadata?.category || 'general' }
        ],
        configTitle: undefined as string | undefined
      };
    }
    return null;
  });

  /** Close whichever config surface is currently open. */
  function closeActiveConfig(): void {
    // A node closes first; the inspector then falls back to the workflow tabs
    // if they are open. Closing the workflow tabs closes the surface.
    const target = closeTarget(inspectorSurface, effectiveEditorMode);
    if (target === 'node') {
      closeConfigSidebar();
    } else if (target === 'workflow') {
      isWorkflowSettingsOpen = false;
    }
  }

  /** Select a surface tab; console/chat also persist as the last bottom tab. */
  function selectSurface(id: string): void {
    activeSurface = id;
    if (id === 'console' || id === 'chat') {
      updateSettings({ ui: { bottomPanelTab: id } });
    }
  }

  const showRightPanel = $derived(
    (!disableSidebar || testMode) && (swapActive || configHere('sidebar') || consoleHere('sidebar'))
  );

  /** Test mode's docked Playground column; resizable, and a drawer when narrow. */
  const TEST_DOCK_WIDTH = 360;
  const dockedInColumn = $derived(testMode && !narrow);

  /**
   * Calculate left sidebar width based on collapsed state
   * When collapsed, use 0; otherwise use user-configured width.
   * In Test mode the left slot holds the Playground: its own width, never collapsed.
   */
  const leftSidebarWidth = $derived(
    testMode
      ? dockedInColumn
        ? TEST_DOCK_WIDTH
        : 0
      : getUiSettings().sidebarCollapsed
        ? 0
        : getUiSettings().sidebarWidth
  );

  /** Whether the sidebar is collapsed */
  const isSidebarCollapsed = $derived(getUiSettings().sidebarCollapsed);

  /** Toggle sidebar collapsed state */
  function toggleSidebar(): void {
    updateSettings({
      ui: { sidebarCollapsed: !getUiSettings().sidebarCollapsed }
    });
  }

  // File input reference for workflow import
  let fileInputRef = $state<HTMLInputElement | null>(null);

  /**
   * Handle global keyboard shortcut for console toggle.
   * Backtick (`) toggles the console open/closed unless user is typing in an input.
   */
  function handleGlobalKeydown(event: KeyboardEvent): void {
    // Dead key on international keyboards — do not intercept
    if (event.key === 'Dead') return;

    // N opens the node library in Test mode, where the sidebar is the Playground.
    const isLibraryKey = testMode && (event.key === 'n' || event.key === 'N');
    if (event.key !== '`' && !isLibraryKey) return;
    if (isLibraryKey && (event.metaKey || event.ctrlKey || event.altKey)) return;

    // Don't intercept when user is typing in an input, textarea, or contenteditable
    const target = event.target as HTMLElement;
    const isInputElement =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (isInputElement) return;
    if (isLibraryKey) {
      event.preventDefault();
      toggleLibrary();
      return;
    }
    if (!consoleGroupOffered) return;

    event.preventDefault();
    toggleConsole();
  }

  function handleConsoleUIAction(action: UIAction): void {
    if (action.type === 'open_config') {
      const wf = fd.workflow.current;
      if (!wf) return;
      const node = wf.nodes.find((n) => n.id === action.nodeId);
      if (node) openConfigSidebar(node);
    } else if (action.type === 'select_node') {
      selectedNodeId = action.nodeId;
    } else if (action.type === 'canvas_fit_view') {
      workflowEditorRef?.canvasFitView();
    } else if (action.type === 'canvas_zoom_in') {
      workflowEditorRef?.canvasZoomIn();
    } else if (action.type === 'canvas_zoom_out') {
      workflowEditorRef?.canvasZoomOut();
    } else if (action.type === 'canvas_zoom_to') {
      workflowEditorRef?.canvasZoomTo(action.level);
    } else if (action.type === 'canvas_pan_to') {
      workflowEditorRef?.canvasPanTo(action.position.x, action.position.y);
    } else if (action.type === 'canvas_reset_view') {
      workflowEditorRef?.canvasResetView();
    }
  }

  function toggleConsole(): void {
    const currentOpen = getUiSettings().consoleOpen;
    updateSettings({ ui: { consoleOpen: !currentOpen } });

    // Focus management after DOM update
    tick().then(() => {
      if (currentOpen) {
        // Console was open, now closing — focus the canvas
        const canvas = document.querySelector<HTMLElement>('.flowdrop-editor-main');
        canvas?.focus();
      } else {
        // Console was closed, now opening — focus first focusable element inside console
        const consoleEl = document.querySelector<HTMLElement>('.command-console');
        const focusTarget = consoleEl?.querySelector<HTMLElement>('input, button, [tabindex]');
        focusTarget?.focus();
      }
    });
  }

  /** Close the console/chat group (used by the modal host's close button). */
  function closeConsole(): void {
    updateSettings({ ui: { consoleOpen: false } });
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
  <title>FlowDrop - Visual Workflow Manager</title>
  <meta name="description" content="A modern drag-and-drop workflow editor for LLM applications" />
</svelte:head>

<!-- Hidden file input for workflow JSON import -->
<input
  bind:this={fileInputRef}
  type="file"
  accept=".json,application/json"
  style="display: none;"
  onchange={handleImportFileChange}
/>

<!--
  Surface content snippets — each rendered by exactly one host (a surface has a
  single placement), so the once-per-render Snippet constraint always holds.
-->

{#snippet nodeConfigFormEl(node: WorkflowNode)}
  <ConfigForm
    {authProvider}
    {node}
    commitMode="live"
    workflowId={fd.workflow.current?.id}
    workflowNodes={fd.workflow.current?.nodes}
    workflowEdges={fd.workflow.current?.edges}
    onChange={(updatedConfig, meta) => {
      if (!node.id) return;
      const updatedData = { ...node.data, config: updatedConfig };

      // Blur / end-of-session: commit the coalesced undo step + fire the
      // change event once, and refresh edges once.
      if (meta?.commit) {
        pendingConfigNodeId = node.id;
        flushNodeConfigEdit();
        return;
      }

      // Live edit (every change): update the store cheaply — no history clone,
      // no external event; both are deferred to the session flush above. Also
      // reflect the change on the canvas immediately (e.g. nodeType changes).
      pendingConfigNodeId = node.id;
      fd.workflow.updateNodeConfig(node.id, { data: updatedData }, { fieldKey: meta?.fieldKey });
      workflowEditorRef?.updateNodeData(node.id, updatedData);
    }}
  />
{/snippet}

{#snippet nodeInspectorEl(node: WorkflowNode)}
  <NodeInspector
    editorMode={effectiveEditorMode}
    tab={nodeInspectorTab}
    onTabChange={(tab) => (nodeTabPick = { nodeId: node.id, tab })}
    info={fd.playground.nodeStatusFor(node.id)}
    runShown={fd.playground.nodeStatusScope !== null}
  >
    {#snippet config()}
      {@render nodeConfigFormEl(node)}
    {/snippet}
  </NodeInspector>
{/snippet}

{#snippet workflowConfigFormEl()}
  <ConfigForm
    {authProvider}
    schema={workflowConfigSchema}
    values={workflowConfigValues}
    commitMode="blur"
    onChange={(config) => {
      // Sync workflow settings changes immediately on field blur
      const wf = fd.workflow.current;
      if (wf) {
        const currentFormat = wf.metadata?.format || DEFAULT_WORKFLOW_FORMAT;
        // Fall back to the CURRENT format, not the default: when the field is
        // hidden (host supports one format) config.format is absent, and
        // applying name/description must not silently rewrite the format.
        const newFormat = (config.format as string) || currentFormat;

        // Warn about incompatible nodes when format changes
        if (newFormat !== currentFormat) {
          const incompatibleNodes = wf.nodes?.filter((node) => {
            const formats = node.data?.metadata?.formats;
            return formats && formats.length > 0 && !formats.includes(newFormat);
          });
          if (incompatibleNodes && incompatibleNodes.length > 0) {
            logger.warn(
              `Format changed to '${newFormat}'. ${incompatibleNodes.length} node(s) are not compatible with this format and may not export correctly:`,
              incompatibleNodes.map((n) => n.data?.label || n.type)
            );
          }
        }

        // Extract built-in fields; everything else belongs in workflow.config
        const { name, description, format: _format, ...customConfig } = config;
        fd.workflow.batchUpdate({
          name: name as string,
          description: description as string | undefined,
          metadata: {
            ...wf.metadata,
            format: newFormat
          },
          ...(workflowSettingsSchema && { config: customConfig as Record<string, unknown> })
        });
      }
    }}
  />
{/snippet}

<!--
  The canonical Workflow.interface editor (Phase 3 of
  `.claude/plans/workflow-interface.md`). Edits route through
  `fd.workflow.batchUpdate`, so history covers them like any other workflow
  mutation.
-->
{#snippet workflowInterfaceEl()}
  {#if fd.workflow.current}
    <WorkflowInterfaceEditor
      workflow={fd.workflow.current}
      dataTypes={fd.portCompatibility.getEnabledDataTypes()}
      checker={fd.portCompatibility}
      onChange={(next, edit) => {
        // A renamed or removed input is followed in the chat binding, in the
        // same update (one undo step), so the binding never names an input
        // the interface no longer has.
        const playground = fd.workflow.current?.playground;
        const followed = edit ? followInterfaceInputEdit(playground, edit) : playground;
        // Settings that no longer bind anything must not fall back to `turn`
        // marks left on the interface: they go in the same update.
        const cleared = followed !== playground && followed?.chat === null;
        fd.workflow.batchUpdate({
          interface: cleared ? withoutInterfaceTurns(next) : next,
          ...(followed !== playground && { playground: followed })
        });
      }}
      onOpenPlaygroundSettings={fd.workflow.current.playground !== undefined
        ? () => (workflowSettingsTab = 'playground')
        : undefined}
    />
  {/if}
{/snippet}

<!--
  The workflow's Playground settings (its chat binding). Only for a backend
  that sends them (`workflow.playground`, FlowDrop 2.7.0 on): an older one
  would drop the key on save. Edits go through the workflow store, so they
  mark the workflow dirty and are saved with it.
-->
{#snippet workflowPlaygroundEl()}
  {#if fd.workflow.current}
    <WorkflowPlaygroundSettings
      workflow={fd.workflow.current}
      onChange={(next) => fd.workflow.batchUpdate({ playground: next })}
      onMoveTurns={(chat) => {
        const current = fd.workflow.current;
        if (!current) return;
        fd.workflow.batchUpdate({
          playground: withPlaygroundChat(current.playground, chat),
          interface: withoutInterfaceTurns(current.interface)
        });
      }}
    />
  {/if}
{/snippet}

<!--
  Two tabs of the workflow-settings surface: the schema-driven settings form,
  and the interface editor. A tab, not a field in the settings form — see
  Phase 3's rationale (`ConfigForm` cannot express a bindings list).
-->
{#snippet workflowSettingsTabs()}
  <div class="workflow-settings-tabs">
    <div class="workflow-settings-tabs__bar" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeWorkflowSettingsTab === 'settings'}
        class="workflow-settings-tabs__tab"
        class:workflow-settings-tabs__tab--active={activeWorkflowSettingsTab === 'settings'}
        onclick={() => (workflowSettingsTab = 'settings')}
      >
        {mergedMessages.navigation.workflowSettingsPanelSubtitle}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeWorkflowSettingsTab === 'interface'}
        class="workflow-settings-tabs__tab"
        class:workflow-settings-tabs__tab--active={activeWorkflowSettingsTab === 'interface'}
        onclick={() => (workflowSettingsTab = 'interface')}
      >
        {mergedMessages.navigation.workflowSettingsInterfaceTab}
      </button>
      {#if fd.workflow.current?.playground !== undefined}
        <button
          type="button"
          role="tab"
          aria-selected={activeWorkflowSettingsTab === 'playground'}
          class="workflow-settings-tabs__tab"
          class:workflow-settings-tabs__tab--active={activeWorkflowSettingsTab === 'playground'}
          onclick={() => (workflowSettingsTab = 'playground')}
        >
          {mergedMessages.navigation.workflowSettingsPlaygroundTab}
        </button>
      {/if}
    </div>
    <div
      class="workflow-settings-tabs__panel"
      style:display={activeWorkflowSettingsTab === 'settings' ? 'block' : 'none'}
    >
      {@render workflowConfigFormEl()}
    </div>
    <div
      class="workflow-settings-tabs__panel"
      style:display={activeWorkflowSettingsTab === 'interface' ? 'block' : 'none'}
    >
      {@render workflowInterfaceEl()}
    </div>
    {#if fd.workflow.current?.playground !== undefined}
      <div
        class="workflow-settings-tabs__panel"
        style:display={activeWorkflowSettingsTab === 'playground' ? 'block' : 'none'}
      >
        {@render workflowPlaygroundEl()}
      </div>
    {/if}
  </div>
{/snippet}

<!--
  Chromeless config body for tabbed/overlay hosts. `showHeader` draws a slim
  title + close bar when the host doesn't provide one (bottom / shared sidebar);
  the modal host supplies its own header, so it passes `false`.
-->
{#snippet configBody(showHeader: boolean)}
  {#if activeConfig}
    <div class="config-surface">
      {#if showHeader}
        <div class="config-surface__header">
          <h2 class="config-surface__title">{activeConfig.title}</h2>
          {#if configClosable}
            <button
              class="config-surface__close"
              onclick={closeActiveConfig}
              aria-label={mergedMessages.layout.closeConfigPanel}
            >
              ×
            </button>
          {/if}
        </div>
      {/if}
      {#if activeConfig.id}
        <div class="config-surface__details">
          <ReadOnlyDetails
            id={activeConfig.id}
            description={activeConfig.description}
            details={activeConfig.details}
          />
        </div>
      {/if}
      <div class="config-surface__content">
        {#if activeConfig.kind === 'node'}
          <div class="config-surface__section">
            <h3 class="config-surface__section-title">
              {activeConfig.configTitle ?? 'Configuration'}
            </h3>
            {@render nodeInspectorEl(activeConfig.node)}
          </div>
        {:else}
          {@render workflowSettingsTabs()}
        {/if}
      </div>
    </div>
  {/if}
{/snippet}

{#snippet configTabContent()}
  {@render configBody(true)}
{/snippet}

{#snippet configBareContent()}
  {@render configBody(false)}
{/snippet}

{#snippet consoleSurfaceBody()}
  <CommandConsole nodeTypes={nodes} onUIAction={handleConsoleUIAction} />
{/snippet}

{#snippet chatSurfaceBody()}
  <AIChatPanel
    nodeTypes={nodes}
    workflowId={fd.workflow.current?.id}
    onUIAction={handleConsoleUIAction}
    {endpointConfig}
  />
{/snippet}

<!--
  Console + chat tabs, shared by whichever host the console group is routed to.
-->
{#snippet consoleChatTabs()}
  {@const tabs = consoleGroupTabs(consoleSurfaceBody, chatSurfaceBody)}
  <TabbedSurface {tabs} activeId={activeSurface} onSelect={selectSurface} />
{/snippet}

<!--
  Rich config panel for the common case: config is the sole occupant of the
  right sidebar. Keeps ConfigPanel's full chrome (swap, ad-hoc pop-out, details)
  so the default experience is unchanged.
-->
{#snippet configPanelSidebar()}
  {#if activeConfig}
    <ConfigPanel
      title={activeConfig.title}
      id={activeConfig.id}
      description={activeConfig.description}
      details={activeConfig.details}
      configTitle={activeConfig.configTitle ?? 'Configuration'}
      onClose={configClosable ? closeActiveConfig : undefined}
      onSwap={activeConfig.kind === 'node' && canvasEditable && features.enableNodeSwap
        ? startSwap
        : undefined}
    >
      {#if activeConfig.kind === 'node'}
        {@render nodeInspectorEl(activeConfig.node)}
      {:else}
        {@render workflowSettingsTabs()}
      {/if}
    </ConfigPanel>
  {/if}
{/snippet}

<!-- The Edit | Test switch, in the navbar's trailing region -->
{#snippet editorModeEnd()}
  {#if testModeAvailable}
    <EditorModeSwitch
      mode={effectiveEditorMode}
      onChange={(next) => fd.editorMode.set(next)}
      runActive={fd.runs.isLive}
    />
  {/if}
{/snippet}

<!-- Test mode's Playground, in the left slot or, on a narrow screen, a drawer -->
{#snippet dockedPlayground()}
  {#if fd.workflow.current}
    <DockedPlayground
      workflow={fd.workflow.current}
      onSave={saveWorkflow}
      onOpenSettings={fd.workflow.current.playground !== undefined
        ? openPlaygroundSettings
        : undefined}
    />
  {/if}
{/snippet}

<!-- MainLayout wrapper for workflow editor -->
<div class="flowdrop-root" data-fd-scope={scopeId}>
  <MainLayout
    {height}
    {width}
    showHeader={showNavbar}
    showLeftSidebar={testMode ? dockedInColumn : !disableSidebar}
    showRightSidebar={showRightPanel}
    showBottomPanel={anyHere('below')}
    bottomPanelHeight={getUiSettings().consoleHeight}
    showFooter={false}
    headerHeight={60}
    {leftSidebarWidth}
    rightSidebarWidth={400}
    leftSidebarMinWidth={testMode ? 300 : getUiSettings().sidebarCollapsed ? 0 : 280}
    leftSidebarMaxWidth={testMode ? 560 : getUiSettings().sidebarCollapsed ? 0 : 450}
    rightSidebarMinWidth={320}
    rightSidebarMaxWidth={550}
    enableLeftSplitPane={dockedInColumn}
    enableRightSplitPane={true}
    class="flowdrop-app-layout"
  >
    <!-- Header: Navbar -->
    {#snippet header()}
      <Navbar
        title={breadcrumbTitle}
        primaryActions={navbarActions.length > 0 ? navbarActions : defaultPrimaryActions}
        {showStatus}
        {showSettings}
        {settingsCategories}
        {showSettingsSyncButton}
        {showSettingsResetButton}
        end={editorModeEnd}
      />
    {/snippet}

    <!-- Left Sidebar: Node Components; in Test mode, the Playground -->
    {#snippet leftSidebar()}
      {#if testMode}
        {@render dockedPlayground()}
      {:else}
        <NodeSidebar
          {nodes}
          loading={nodeTypesLoading}
          activeFormat={fd.workflow.format}
          categoriesDefaultOpen={themeConfig?.sidebar?.categoriesDefaultOpen ?? false}
        />
      {/if}
    {/snippet}

    <!--
      Right Sidebar. Node-swap sub-flow takes over when active. Otherwise the
      rail hosts whichever surfaces are placed `sidebar`: a lone config surface
      keeps the rich ConfigPanel; anything shared coexists as tabs.
    -->
    {#snippet rightSidebar()}
      {#if swapMode === 'mapping' && swapInteractiveState && selectedNodeForConfig}
        <SwapMappingEditor
          interactiveState={swapInteractiveState}
          onConfirm={executeNodeSwap}
          onCancel={cancelSwap}
          onBack={() => {
            swapMode = 'picking';
            swapInteractiveState = null;
          }}
        />
      {:else if swapMode === 'picking' && selectedNodeForConfig}
        <NodeSwapPicker
          currentNode={selectedNodeForConfig}
          availableNodes={nodes}
          activeFormat={fd.workflow.format}
          onSelect={handleSwapSelect}
          onCancel={cancelSwap}
        />
      {:else if configHere('sidebar') && !consoleHere('sidebar')}
        {@render configPanelSidebar()}
      {:else if configHere('sidebar') || consoleHere('sidebar')}
        {@const tabs = [
          ...(configHere('sidebar')
            ? [
                {
                  id: 'config',
                  label: activeConfig?.title ?? 'Configuration',
                  content: configTabContent
                }
              ]
            : []),
          ...(consoleHere('sidebar') ? consoleGroupTabs(consoleSurfaceBody, chatSurfaceBody) : [])
        ] as SurfaceTab[]}
        <TabbedSurface {tabs} activeId={activeSurface} onSelect={selectSurface} />
      {/if}
    {/snippet}

    <!--
      Bottom Panel. Hosts whichever surfaces are placed `below` — config,
      console, chat — as a single tab strip (hidden when only one is present).
    -->
    {#snippet bottomPanel()}
      {@const tabs = [
        ...(configHere('below')
          ? [
              {
                id: 'config',
                label: activeConfig?.title ?? 'Configuration',
                content: configTabContent
              }
            ]
          : []),
        ...(consoleHere('below') ? consoleGroupTabs(consoleSurfaceBody, chatSurfaceBody) : [])
      ] as SurfaceTab[]}
      <TabbedSurface {tabs} activeId={activeSurface} onSelect={selectSurface} />
    {/snippet}

    <!-- Main Content: Workflow Editor with Error Status -->
    {#if error}
      <EditorStatusBar
        {error}
        onRetry={retryLoad}
        onSetApiUrl={() => {
          const defaultUrl = '/api/flowdrop';
          const newUrl = prompt('Enter Backend API URL:', defaultUrl);
          if (newUrl) {
            configureApi(createEndpointConfig(newUrl));
            fetchNodeTypes();
          }
        }}
        onTestApi={testApiConnection}
        onDismiss={() => (error = null)}
      />
    {/if}

    <!-- Main Editor Area -->
    <!-- interactive workflow canvas region with keyboard support -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="flowdrop-editor-main"
      class:pipeline-view={!!pipelineId}
      style="--fd-canvas-left-offset: {testMode || !disableSidebar
        ? leftSidebarWidth + 'px'
        : '0px'}"
      onclick={handleCanvasClick}
      onkeydown={(e) => {
        if (e.key !== 'Escape') return;
        // The topmost transient surface first (the node library), then the selection.
        if (libraryOpen) libraryOpen = false;
        else closeConfigSidebar();
      }}
      role="region"
      aria-label={mergedMessages.layout.workflowCanvas}
    >
      <!--
        Floating sidebar toggle — always visible on the canvas top-left. In
        Test mode the sidebar is the Playground: a column that needs no
        toggle, or on a narrow screen a drawer that this button opens.
      -->
      {#if testMode ? narrow : !disableSidebar}
        <CanvasIconButton
          class="flowdrop-sidebar-fab {testMode && drawerOpen
            ? 'flowdrop-sidebar-fab--beside-drawer'
            : ''}"
          label={testMode
            ? drawerOpen
              ? mergedMessages.layout.hidePlayground
              : mergedMessages.layout.showPlayground
            : isSidebarCollapsed
              ? mergedMessages.layout.expandSidebar
              : mergedMessages.layout.collapseSidebar}
          active={testMode ? drawerOpen : !isSidebarCollapsed}
          onclick={testMode ? () => (drawerOpen = !drawerOpen) : toggleSidebar}
        >
          {#snippet icon()}
            {#if testMode ? !drawerOpen : isSidebarCollapsed}
              <MenuIcon />
            {:else}
              <MenuOpenIcon />
            {/if}
          {/snippet}
        </CanvasIconButton>
      {/if}

      <!-- Test mode, narrow screen: the Playground as a drawer over the canvas -->
      {#if testMode && narrow}
        <div class="test-drawer" data-testid="test-drawer" hidden={!drawerOpen}>
          {@render dockedPlayground()}
        </div>
      {/if}

      <!-- Test mode: the node library as a popover (N) -->
      {#if testMode && libraryOpen}
        <div
          class="node-library-popover"
          class:node-library-popover--beside-drawer={narrow && drawerOpen}
          data-testid="node-library-popover"
          role="dialog"
          aria-label={mergedMessages.layout.nodeLibrary}
          bind:this={libraryEl}
        >
          <NodeSidebar
            popover={true}
            {nodes}
            loading={nodeTypesLoading}
            activeFormat={fd.workflow.format}
            categoriesDefaultOpen={themeConfig?.sidebar?.categoriesDefaultOpen ?? false}
          />
        </div>
      {/if}

      <WorkflowEditor
        bind:this={workflowEditorRef}
        endpointConfig={endpointConfig ?? undefined}
        {authProvider}
        {openConfigSidebar}
        {mode}
        {pipelineId}
        {refreshTrigger}
        builtinEditors={features.builtinEditors}
        {contextMenu}
        gridVariant={themeConfig?.canvas?.grid ?? 'dots'}
        consoleOpen={consoleActive}
        showRunBar={!fd.editorMode.isTest}
        onOpenTest={testModeAvailable ? () => fd.editorMode.set('test') : undefined}
        onToggleConsole={consoleGroupOffered ? toggleConsole : undefined}
        consoleToggleLabel={consoleTabOffered
          ? undefined
          : mergedMessages.navigation.bottomPanel.chat}
      />
    </div>
  </MainLayout>
</div>

<!--
  Modal host — floats surfaces routed to `modal` above the canvas. Portalled to
  <body> by SurfaceOverlay. When both config and console are modal they coexist
  as tabs inside one overlay.
-->
{#if configHere('modal') && consoleHere('modal')}
  <SurfaceOverlay
    title={activeConfig?.title ?? mergedMessages.navigation.workflowSettingsPanelTitle}
    closeLabel={mergedMessages.layout.closeConfigPanel}
    onClose={() => {
      closeActiveConfig();
      closeConsole();
    }}
  >
    {@const tabs = [
      { id: 'config', label: activeConfig?.title ?? 'Configuration', content: configBareContent },
      ...consoleGroupTabs(consoleSurfaceBody, chatSurfaceBody)
    ] as SurfaceTab[]}
    <TabbedSurface {tabs} activeId={activeSurface} onSelect={selectSurface} />
  </SurfaceOverlay>
{:else if configHere('modal')}
  <SurfaceOverlay
    title={activeConfig?.title ?? 'Configuration'}
    closeLabel={mergedMessages.layout.closeConfigPanel}
    onClose={closeActiveConfig}
  >
    {@render configBareContent()}
  </SurfaceOverlay>
{:else if consoleHere('modal')}
  <SurfaceOverlay
    title={activeSurface === 'chat' || !consoleTabOffered
      ? mergedMessages.navigation.bottomPanel.chat
      : mergedMessages.navigation.bottomPanel.console}
    closeLabel={mergedMessages.layout.closeConfigPanel}
    onClose={closeConsole}
  >
    {@render consoleChatTabs()}
  </SurfaceOverlay>
{/if}

<style>
  .flowdrop-root {
    display: contents;
  }

  /* Floating sidebar toggle button — placement only; visuals live in CanvasIconButton */
  :global(.flowdrop-sidebar-fab) {
    top: 12px;
    left: 12px;
    z-index: 50;
  }

  /* Test mode on a narrow screen: the Playground over the canvas's left edge. */
  .test-drawer {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 55;
    width: min(380px, 92%);
    background: var(--fd-background);
    border-right: 1px solid var(--fd-border);
    box-shadow: var(--fd-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.18));
  }

  :global(.flowdrop-sidebar-fab--beside-drawer) {
    left: calc(min(380px, 92%) + 12px) !important;
  }

  /* Test mode's node library, over the canvas's top-left corner. */
  .node-library-popover {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 60;
    width: 280px;
    max-height: calc(100% - 24px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--fd-panel-bg, var(--fd-background));
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg, 8px);
    box-shadow: var(--fd-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.18));
  }

  .node-library-popover--beside-drawer {
    left: calc(min(380px, 92%) + 60px);
  }

  /* Main editor area */
  .flowdrop-editor-main {
    flex: 1;
    position: relative;
    min-width: 0;
    height: 100%;
    overflow: hidden;
    background: var(--fd-layout-background);
  }

  /*
    Chromeless config surface (bottom / modal / shared-sidebar hosts). Mirrors
    ConfigPanel's inner layout; the host owns any outer chrome.
  */
  .config-surface {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background-color: var(--fd-panel-bg);
    backdrop-filter: var(--fd-panel-backdrop-filter);
  }

  .config-surface__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-card);
    flex-shrink: 0;
  }

  .config-surface__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .config-surface__close {
    background: none;
    border: none;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    color: var(--fd-muted-foreground);
    padding: 0.25rem;
    border-radius: var(--fd-radius-sm);
    transition:
      color var(--fd-transition-fast),
      background-color var(--fd-transition-fast);
  }

  .config-surface__close:hover {
    color: var(--fd-foreground);
    background-color: var(--fd-subtle);
  }

  .config-surface__details {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--fd-border-muted);
    background-color: var(--fd-card);
    flex-shrink: 0;
  }

  .config-surface__content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem;
  }

  .config-surface__section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .config-surface__section-title {
    margin: 0;
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /*
    Inner tab strip for the workflow-settings surface — Settings vs. Interface
    (Phase 3 of `.claude/plans/workflow-interface.md`). Deliberately not the
    `TabbedSurface` component: that one governs which *host* a surface lives in
    (sidebar/modal/below); this is a surface's own internal navigation, sitting
    inside whichever host already scrolls it.
  */
  .workflow-settings-tabs {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs, 0.5rem);
  }

  .workflow-settings-tabs__bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    border-bottom: 1px solid var(--fd-border);
  }

  .workflow-settings-tabs__tab {
    padding: 0.375rem 0.75rem;
    font-size: var(--fd-text-xs);
    font-weight: 500;
    cursor: pointer;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--fd-muted-foreground);
    transition: all var(--fd-transition-fast);
  }

  .workflow-settings-tabs__tab:hover {
    color: var(--fd-foreground);
  }

  .workflow-settings-tabs__tab--active {
    color: var(--fd-foreground);
    border-bottom-color: var(--fd-primary);
  }
</style>
