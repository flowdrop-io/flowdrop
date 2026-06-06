/**
 * Svelte App Wrapper for Framework Integration
 *
 * Provides mount/unmount functions for integrating FlowDrop into any web application.
 * Particularly useful for integration with vanilla JS, Drupal, WordPress, or other frameworks.
 *
 * @module svelte-app
 */

import { mount, unmount } from 'svelte';
import WorkflowEditor from './components/WorkflowEditor.svelte';
import App from './components/App.svelte';
import type { Workflow, NodeMetadata, PortConfig, CategoryDefinition } from './types/index.js';
import type { EndpointConfig } from './config/endpoints.js';
import type { AuthProvider } from './types/auth.js';
import type { FlowDropEventHandlers, FlowDropFeatures } from './types/events.js';
import type { FlowDropTheme, FlowDropThemeName } from './types/theme.js';
import type { WorkflowFormatAdapter } from './registry/workflowFormatRegistry.js';
import { workflowFormatRegistry } from './registry/workflowFormatRegistry.js';
import './registry/builtinFormats.js';
import { initializePortCompatibility } from './utils/connections.js';
import { DEFAULT_PORT_CONFIG } from './config/defaultPortConfig.js';
import { fetchPortConfig } from './services/portConfigApi.js';
import { fetchCategories } from './services/categoriesApi.js';
import {
  createFlowDropInstance,
  getDefaultInstance,
  type FlowDropInstance
} from './stores/instanceContainer.svelte.js';
import {
  DraftAutoSaveManager,
  getDraftStorageKey,
  setDraftStorage,
  resolveDraftStorage,
  clearAllDrafts as clearAllDraftsFromStorage,
  type DraftStorageOption
} from './services/draftStorage.js';
import { mergeFeatures } from './types/events.js';
import type { PartialSettings, SettingsCategory } from './types/settings.js';
import {
  initializeSettings,
  getBehaviorSettings,
  onSettingsChange
} from './stores/settingsStore.svelte.js';
import { logger } from './utils/logger.js';
import { globalSaveWorkflow, globalExportWorkflow } from './services/globalSave.js';

import type { NavbarAction } from './types/navbar.js';
export type { NavbarAction };

/**
 * Mount options for FlowDrop App
 */
export interface FlowDropMountOptions {
  // Existing options
  /** Initial workflow to load */
  workflow?: Workflow;
  /** Available node types */
  nodes?: NodeMetadata[];
  /** API endpoint configuration */
  endpointConfig?: EndpointConfig;
  /** Port configuration for connections */
  portConfig?: PortConfig;
  /** Category definitions for node categories */
  categories?: CategoryDefinition[];
  /** Editor height */
  height?: string | number;
  /** Editor width */
  width?: string | number;

  // UI options
  /** Show the navbar */
  showNavbar?: boolean;
  /** Disable the node sidebar */
  disableSidebar?: boolean;
  /** Lock the workflow (prevent changes) */
  lockWorkflow?: boolean;
  /** Read-only mode */
  readOnly?: boolean;

  // Pipeline mode
  /** Pipeline ID for status display */
  pipelineId?: string;

  // Navbar customization
  /** Custom navbar title */
  navbarTitle?: string;
  /** Custom navbar actions */
  navbarActions?: NavbarAction[];
  /** Show settings gear icon in navbar */
  showSettings?: boolean;
  /** Show the "Connected" status indicator in the navbar (default: true) */
  showStatus?: boolean;

  // NEW: Authentication provider
  /** Authentication provider for API requests */
  authProvider?: AuthProvider;

  // NEW: Event handlers
  /** Event handlers for workflow lifecycle */
  eventHandlers?: FlowDropEventHandlers;

  // NEW: Feature flags
  /** Feature configuration */
  features?: FlowDropFeatures;

  // NEW: Default settings overrides
  /** Initial settings overrides (theme, behavior, editor, ui, api) */
  settings?: PartialSettings;

  // NEW: Draft storage key
  /** Custom storage key for workflow drafts */
  draftStorageKey?: string;

  // NEW: Draft storage backend
  /**
   * Where workflow drafts are persisted.
   *
   * - `'local'` (default): `localStorage` — drafts survive reloads and remain
   *   stored on the device even after the tab or browser is closed, until
   *   saved or cleared. Call `clearAllDrafts()` on logout for shared devices.
   * - `'session'`: `sessionStorage` — drafts are scoped to the tab and removed
   *   when it closes (they do not survive crash-and-reopen).
   * - A custom `DraftStorageAdapter` — note the adapter interface is
   *   synchronous, so it suits in-memory stores and write-through caches;
   *   async backends (IndexedDB, network) need a sync cache in front.
   *
   * The resolved adapter is captured per mount, so multiple FlowDrop
   * instances on one page can use different backends.
   *
   * Note: neither built-in backend protects against same-origin script access
   * (XSS). End users can additionally opt out of draft persistence at runtime
   * via the "Store Drafts in Browser" behavior setting.
   */
  draftStorage?: DraftStorageOption;

  // NEW: Workflow format adapters
  /** Custom workflow format adapters to register */
  formatAdapters?: WorkflowFormatAdapter[];

  // NEW: Visual theme
  /** Visual theme — named built-in ('default' | 'minimal') or custom theme object */
  theme?: FlowDropTheme | FlowDropThemeName;

  // Settings modal customization
  /** Which settings tabs to show in the modal (defaults to all) */
  settingsCategories?: SettingsCategory[];
  /** Show the "Sync to Cloud" button in the settings modal */
  showSettingsSyncButton?: boolean;
  /** Show the reset buttons in the settings modal */
  showSettingsResetButton?: boolean;

  // NEW: Multi-instance support
  /**
   * Identifier for this FlowDrop instance.
   *
   * When omitted, the first mount on the page becomes the *default* instance:
   * it keeps the legacy (unscoped) draft/panel storage keys and remains
   * reachable through the module-level store APIs, exactly as before.
   * Additional mounts get auto-generated ids (`fd-1`, `fd-2`, …).
   *
   * Pass an explicit id to opt a mount out of default-instance behavior and
   * scope its draft/panel storage keys (`flowdrop:draft:<id>:…`) — recommended
   * whenever you mount more than one editor with drafts enabled.
   */
  instanceId?: string;
}

/**
 * Return type for mounted FlowDrop app
 */
export interface MountedFlowDropApp {
  /**
   * Destroy the app and clean up resources
   */
  destroy: () => void;

  /**
   * Check if there are unsaved changes
   */
  isDirty: () => boolean;

  /**
   * Mark the workflow as saved (clears dirty state)
   */
  markAsSaved: () => void;

  /**
   * Get the current workflow data
   */
  getWorkflow: () => Workflow | null;

  /**
   * Trigger save operation
   */
  save: () => Promise<void>;

  /**
   * Trigger export operation (downloads JSON)
   */
  export: () => void;

  /**
   * Clear all FlowDrop workflow drafts from the configured draft storage
   * (`localStorage` unless changed via the `draftStorage` mount option).
   *
   * Removes every key beginning with `flowdrop:draft:` plus the custom
   * `draftStorageKey` configured at mount time (if any). Call this from
   * the host application's logout handler so drafts do not persist across
   * user sessions on shared devices.
   *
   * @returns The number of entries removed.
   */
  clearAllDrafts: () => number;
}

/**
 * Internal state for a mounted FlowDrop instance
 */
interface MountedAppState {
  svelteApp: ReturnType<typeof mount>;
  draftManager: DraftAutoSaveManager | null;
  eventHandlers: FlowDropEventHandlers | null;
  /** Unsubscribe from the draft opt-out settings listener (null when drafts are disabled) */
  unsubscribeDraftSettings: (() => void) | null;
}

// ---------------------------------------------------------------------------
// Instance acquisition
// ---------------------------------------------------------------------------

/** Whether a mount currently owns the page-default instance. */
let defaultInstanceClaimed = false;

/**
 * Resolve the FlowDrop instance for a new mount.
 *
 * No `instanceId` + default unclaimed → the page-default instance (legacy
 * storage keys, reachable via the module-level store APIs). Everything else
 * gets its own isolated instance.
 */
function acquireInstance(instanceId?: string): { fd: FlowDropInstance; isDefault: boolean } {
  if (!instanceId && !defaultInstanceClaimed) {
    defaultInstanceClaimed = true;
    return { fd: getDefaultInstance(), isDefault: true };
  }
  return { fd: createFlowDropInstance({ id: instanceId }), isDefault: false };
}

/**
 * Release a mount's instance on destroy.
 *
 * Non-default instances are fully destroyed (subscriptions, effect roots,
 * callbacks). The default instance is only *released* — its callbacks are
 * cleared but its reactive wiring stays alive, matching the pre-multi-instance
 * behavior where module stores survived unmount and a later mount reused them.
 */
function releaseInstance(fd: FlowDropInstance, isDefault: boolean): void {
  if (isDefault) {
    fd.workflow.setOnDirtyStateChange(null);
    fd.workflow.setOnWorkflowChange(null);
    defaultInstanceClaimed = false;
  } else {
    fd.destroy();
  }
}

/**
 * Mount the full FlowDrop App with navbar, sidebars, and workflow editor
 *
 * Use this for a complete workflow editing experience with all UI components.
 *
 * @param container - DOM element to mount the app into
 * @param options - Configuration options for the app
 * @returns Promise resolving to a MountedFlowDropApp instance
 *
 * @example
 * ```typescript
 * const app = await mountFlowDropApp(document.getElementById("editor"), {
 *   workflow: myWorkflow,
 *   endpointConfig: createEndpointConfig("/api/flowdrop"),
 *   authProvider: new CallbackAuthProvider({
 *     getToken: () => authService.getAccessToken()
 *   }),
 *   eventHandlers: {
 *     onDirtyStateChange: (isDirty) => updateSaveButton(isDirty),
 *     onAfterSave: () => showSuccess("Saved!")
 *   }
 * });
 * ```
 */
export async function mountFlowDropApp(
  container: HTMLElement,
  options: FlowDropMountOptions = {}
): Promise<MountedFlowDropApp> {
  const {
    workflow,
    nodes,
    endpointConfig,
    portConfig,
    categories,
    height = '100vh',
    width = '100%',
    showNavbar = false,
    disableSidebar,
    lockWorkflow,
    readOnly,
    pipelineId,
    navbarTitle,
    navbarActions,
    showSettings,
    showStatus,
    authProvider,
    eventHandlers,
    features: userFeatures,
    settings: initialSettings,
    draftStorageKey: customDraftKey,
    draftStorage,
    formatAdapters,
    theme,
    settingsCategories,
    showSettingsSyncButton,
    showSettingsResetButton,
    instanceId
  } = options;

  // Per-instance state container — this is what allows multiple FlowDrop
  // editors to coexist on one page without sharing workflow/history state.
  const { fd, isDefault } = acquireInstance(instanceId);

  // Register custom format adapters before mounting
  if (formatAdapters) {
    for (const adapter of formatAdapters) {
      workflowFormatRegistry.register(adapter);
    }
  }

  // Merge features with defaults
  const features = mergeFeatures(userFeatures);

  // Resolve this instance's draft storage backend. The adapter is captured
  // here and threaded into the draft manager and clearAllDrafts, so a later
  // mount with a different backend cannot retarget this instance. The
  // module-level default is also updated for the standalone helpers
  // (last mount wins there — instance paths do not depend on it).
  const draftStorageAdapter = resolveDraftStorage(draftStorage ?? 'local');
  setDraftStorage(draftStorageAdapter);

  // Apply initial settings overrides and initialize theme
  await initializeSettings({
    defaults: initialSettings
  });

  // Create endpoint configuration
  let config: EndpointConfig | undefined;

  if (endpointConfig) {
    // Merge with default configuration to ensure all required endpoints are present
    const { defaultEndpointConfig } = await import('./config/endpoints.js');
    config = {
      ...defaultEndpointConfig,
      ...endpointConfig,
      endpoints: {
        ...defaultEndpointConfig.endpoints,
        ...endpointConfig.endpoints
      }
    };
  } else {
    // Use default configuration if none provided
    const { defaultEndpointConfig } = await import('./config/endpoints.js');
    config = defaultEndpointConfig;
  }

  // Initialize port configuration
  let finalPortConfig = portConfig;

  if (!finalPortConfig && config) {
    // Try to fetch port configuration from API
    try {
      finalPortConfig = await fetchPortConfig(config, authProvider);
    } catch (error) {
      logger.warn('Failed to fetch port config from API, using default:', error);
      finalPortConfig = DEFAULT_PORT_CONFIG;
    }
  } else if (!finalPortConfig) {
    finalPortConfig = DEFAULT_PORT_CONFIG;
  }

  // Note: port compatibility config is page-global (last mount wins) — see
  // the multi-instance limitations in the docs.
  initializePortCompatibility(finalPortConfig);

  // Initialize this instance's categories
  if (categories) {
    fd.categories.initialize(categories);
  } else if (config) {
    try {
      const fetchedCategories = await fetchCategories(config, authProvider);
      fd.categories.initialize(fetchedCategories);
    } catch (error) {
      logger.warn('Failed to fetch categories from API, using defaults:', error);
    }
  }

  // Set up event handler callbacks in this instance's store
  if (eventHandlers?.onDirtyStateChange) {
    fd.workflow.setOnDirtyStateChange(eventHandlers.onDirtyStateChange);
  }

  if (eventHandlers?.onWorkflowChange) {
    fd.workflow.setOnWorkflowChange(eventHandlers.onWorkflowChange);
  }

  // Create the Svelte App component with configuration
  const svelteApp = mount(App, {
    target: container,
    props: {
      instance: fd,
      workflow,
      nodes,
      height,
      width,
      showNavbar,
      disableSidebar,
      lockWorkflow,
      readOnly,
      pipelineId,
      navbarTitle,
      navbarActions,
      showSettings,
      showStatus,
      endpointConfig: config,
      authProvider,
      eventHandlers,
      features,
      theme,
      settingsCategories,
      showSettingsSyncButton,
      showSettingsResetButton
    }
  });

  // Set up draft auto-save manager
  let draftManager: DraftAutoSaveManager | null = null;
  let unsubscribeDraftSettings: (() => void) | null = null;

  if (features.autoSaveDraft) {
    // Instance-scoped prefix: the default instance keeps the legacy bare
    // 'flowdrop:draft' namespace; additional instances get ':<id>' sub-keys.
    const storageKey = getDraftStorageKey(workflow?.id, customDraftKey, fd.storagePrefix);

    draftManager = new DraftAutoSaveManager({
      storageKey,
      interval: features.autoSaveDraftInterval,
      enabled: features.autoSaveDraft,
      getWorkflow: () => fd.workflow.current,
      isDirty: () => fd.workflow.isDirty,
      // User-facing opt-out: the "Store Drafts in Browser" behavior setting.
      // Checked on every save so toggling it takes effect immediately.
      isPersistenceAllowed: () => getBehaviorSettings().storeDraftsInBrowser,
      storage: draftStorageAdapter
    });

    draftManager.start();

    // When the user opts out, also remove the draft already in storage.
    unsubscribeDraftSettings = onSettingsChange((event) => {
      if (
        event.category === 'behavior' &&
        event.key === 'storeDraftsInBrowser' &&
        event.newValue === false
      ) {
        draftManager?.clearDraft();
      }
    });
  }

  // Store state for cleanup
  const state: MountedAppState = {
    svelteApp,
    draftManager,
    eventHandlers: eventHandlers ?? null,
    unsubscribeDraftSettings
  };

  // Create the mounted app interface
  const mountedApp: MountedFlowDropApp = {
    destroy: () => {
      // Call onBeforeUnmount if provided
      if (state.eventHandlers?.onBeforeUnmount) {
        const currentWorkflow = fd.workflow.current;
        if (currentWorkflow) {
          state.eventHandlers.onBeforeUnmount(currentWorkflow, fd.workflow.isDirty);
        }
      }

      // Stop draft manager
      if (state.draftManager) {
        // Save one final draft if dirty (no-op when the user opted out)
        if (fd.workflow.isDirty) {
          state.draftManager.forceSave();
        }
        state.draftManager.stop();
      }

      // Stop listening for the draft opt-out setting
      if (state.unsubscribeDraftSettings) {
        state.unsubscribeDraftSettings();
        state.unsubscribeDraftSettings = null;
      }

      // Release this mount's instance: clears its callbacks (and, for
      // non-default instances, all subscriptions/effect roots) without
      // touching sibling instances on the same page.
      releaseInstance(fd, isDefault);

      // Unmount Svelte app
      unmount(state.svelteApp);
    },

    isDirty: () => fd.workflow.isDirty,

    markAsSaved: () => {
      fd.workflow.markAsSaved();
      if (state.draftManager) {
        // Migrate the draft key when the host confirms a save. New workflows start
        // on '<prefix>:new', a key shared across all tabs. If the host has
        // written the server-assigned ID back into the store before calling
        // markAsSaved(), we can move to a unique per-workflow key and stop
        // competing with other tabs that may also have unsaved new workflows.
        // Skip when customDraftKey is set — the host manages that key explicitly.
        if (!customDraftKey) {
          const currentWorkflow = fd.workflow.current;
          if (currentWorkflow?.id) {
            state.draftManager.updateStorageKey(
              getDraftStorageKey(currentWorkflow.id, undefined, fd.storagePrefix)
            );
          }
        }
        state.draftManager.markAsSaved();
      }
    },

    getWorkflow: () => fd.workflow.current,

    save: async () => {
      await globalSaveWorkflow({
        instance: fd,
        onSaved: (saved) => {
          // globalSaveWorkflow does not write the server-assigned ID back to the
          // workflow store, so we cannot read it from the store here.
          // Instead we use the savedWorkflow returned by the API directly.
          // This migrates '<prefix>:new' to a unique per-workflow key
          // immediately after the first save, preventing cross-tab collisions
          // when multiple new workflows are open simultaneously.
          if (state.draftManager && !customDraftKey && saved.id) {
            state.draftManager.updateStorageKey(
              getDraftStorageKey(saved.id, undefined, fd.storagePrefix)
            );
          }
        }
      });
    },

    export: () => {
      globalExportWorkflow({ instance: fd });
    },

    clearAllDrafts: () => {
      const extras = customDraftKey ? [customDraftKey] : [];
      // Clear this instance's backend, not whatever the module default is now
      const removed = clearAllDraftsFromStorage(extras, draftStorageAdapter);
      if (state.draftManager) {
        state.draftManager.markAsSaved();
      }
      return removed;
    }
  };

  return mountedApp;
}

/**
 * Mount the WorkflowEditor component in a container
 *
 * Simpler alternative to mountFlowDropApp - only mounts the editor without navbar.
 *
 * @param container - DOM element to mount the editor into
 * @param options - Configuration options
 * @returns Promise resolving to a MountedFlowDropApp instance
 */
export async function mountWorkflowEditor(
  container: HTMLElement,
  options: {
    workflow?: Workflow;
    nodes?: NodeMetadata[];
    endpointConfig?: EndpointConfig;
    portConfig?: PortConfig;
    categories?: CategoryDefinition[];
    authProvider?: AuthProvider;
    /** Instance identifier — see {@link FlowDropMountOptions.instanceId}. */
    instanceId?: string;
  } = {}
): Promise<MountedFlowDropApp> {
  const { nodes = [], endpointConfig, portConfig, categories, authProvider, instanceId } = options;

  // Per-instance state container (see mountFlowDropApp)
  const { fd, isDefault } = acquireInstance(instanceId);

  // Create endpoint configuration
  let config: EndpointConfig | undefined;

  if (endpointConfig) {
    // Merge with default configuration to ensure all required endpoints are present
    const { defaultEndpointConfig } = await import('./config/endpoints.js');
    config = {
      ...defaultEndpointConfig,
      ...endpointConfig,
      endpoints: {
        ...defaultEndpointConfig.endpoints,
        ...endpointConfig.endpoints
      }
    };
  } else {
    // Use default configuration if none provided
    const { defaultEndpointConfig } = await import('./config/endpoints.js');
    config = defaultEndpointConfig;
  }

  // Initialize port configuration
  let finalPortConfig = portConfig;

  if (!finalPortConfig && config) {
    // Try to fetch port configuration from API
    try {
      finalPortConfig = await fetchPortConfig(config, authProvider);
    } catch (error) {
      logger.warn('Failed to fetch port config from API, using default:', error);
      finalPortConfig = DEFAULT_PORT_CONFIG;
    }
  } else if (!finalPortConfig) {
    finalPortConfig = DEFAULT_PORT_CONFIG;
  }

  initializePortCompatibility(finalPortConfig);

  // Initialize this instance's categories
  if (categories) {
    fd.categories.initialize(categories);
  } else if (config) {
    try {
      const fetchedCategories = await fetchCategories(config, authProvider);
      fd.categories.initialize(fetchedCategories);
    } catch (error) {
      logger.warn('Failed to fetch categories from API, using defaults:', error);
    }
  }

  // Create the Svelte component
  const svelteApp = mount(WorkflowEditor, {
    target: container,
    props: {
      instance: fd,
      nodes,
      endpointConfig: config
    }
  });

  // Create the mounted app interface (simpler version)
  const mountedApp: MountedFlowDropApp = {
    destroy: () => {
      releaseInstance(fd, isDefault);
      unmount(svelteApp);
    },

    isDirty: () => fd.workflow.isDirty,

    markAsSaved: () => fd.workflow.markAsSaved(),

    getWorkflow: () => fd.workflow.current,

    save: async () => {
      await globalSaveWorkflow({ instance: fd });
    },

    export: () => {
      globalExportWorkflow({ instance: fd });
    },

    clearAllDrafts: () => clearAllDraftsFromStorage()
  };

  return mountedApp;
}

/**
 * Unmount a FlowDrop app
 *
 * @param app - The mounted app to unmount
 */
export function unmountFlowDropApp(app: MountedFlowDropApp): void {
  if (app && typeof app.destroy === 'function') {
    app.destroy();
  }
}
