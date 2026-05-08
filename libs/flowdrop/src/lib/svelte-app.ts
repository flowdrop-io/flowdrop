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
import { initializeCategories } from './stores/categoriesStore.svelte.js';
import {
  isDirty,
  markAsSaved,
  getWorkflow as getWorkflowFromStore,
  setOnDirtyStateChange,
  setOnWorkflowChange
} from './stores/workflowStore.svelte.js';
import {
  DraftAutoSaveManager,
  getDraftStorageKey,
  clearAllDrafts as clearAllDraftsFromStorage
} from './services/draftStorage.js';
import { mergeFeatures } from './types/events.js';
import type { PartialSettings, SettingsCategory } from './types/settings.js';
import { initializeSettings } from './stores/settingsStore.svelte.js';
import { logger } from './utils/logger.js';
import { globalSaveWorkflow, globalExportWorkflow } from './services/globalSave.js';

/**
 * Navbar action configuration
 */
export interface NavbarAction {
  label: string;
  href: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  onclick?: (event: Event) => void;
}

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
  /** Node execution statuses */
  nodeStatuses?: Record<string, 'pending' | 'running' | 'completed' | 'error'>;

  // Navbar customization
  /** Custom navbar title */
  navbarTitle?: string;
  /** Custom navbar actions */
  navbarActions?: NavbarAction[];
  /** Show settings gear icon in navbar */
  showSettings?: boolean;

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
  /** Custom storage key for localStorage drafts */
  draftStorageKey?: string;

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
   * Clear all FlowDrop workflow drafts from `localStorage`.
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
    nodeStatuses,
    pipelineId,
    navbarTitle,
    navbarActions,
    showSettings,
    authProvider,
    eventHandlers,
    features: userFeatures,
    settings: initialSettings,
    draftStorageKey: customDraftKey,
    formatAdapters,
    theme,
    settingsCategories,
    showSettingsSyncButton,
    showSettingsResetButton
  } = options;

  // Register custom format adapters before mounting
  if (formatAdapters) {
    for (const adapter of formatAdapters) {
      workflowFormatRegistry.register(adapter);
    }
  }

  // Merge features with defaults
  const features = mergeFeatures(userFeatures);

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
      finalPortConfig = await fetchPortConfig(config);
    } catch (error) {
      logger.warn('Failed to fetch port config from API, using default:', error);
      finalPortConfig = DEFAULT_PORT_CONFIG;
    }
  } else if (!finalPortConfig) {
    finalPortConfig = DEFAULT_PORT_CONFIG;
  }

  initializePortCompatibility(finalPortConfig);

  // Initialize categories
  if (categories) {
    initializeCategories(categories);
  } else if (config) {
    try {
      const fetchedCategories = await fetchCategories(config);
      initializeCategories(fetchedCategories);
    } catch (error) {
      logger.warn('Failed to fetch categories from API, using defaults:', error);
    }
  }

  // Set up event handler callbacks in the store
  if (eventHandlers?.onDirtyStateChange) {
    setOnDirtyStateChange(eventHandlers.onDirtyStateChange);
  }

  if (eventHandlers?.onWorkflowChange) {
    setOnWorkflowChange(eventHandlers.onWorkflowChange);
  }

  // Create the Svelte App component with configuration
  const svelteApp = mount(App, {
    target: container,
    props: {
      workflow,
      nodes,
      height,
      width,
      showNavbar,
      disableSidebar,
      lockWorkflow,
      readOnly,
      nodeStatuses,
      pipelineId,
      navbarTitle,
      navbarActions,
      showSettings,
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

  if (features.autoSaveDraft) {
    const storageKey = getDraftStorageKey(workflow?.id, customDraftKey);

    draftManager = new DraftAutoSaveManager({
      storageKey,
      interval: features.autoSaveDraftInterval,
      enabled: features.autoSaveDraft,
      getWorkflow: getWorkflowFromStore,
      isDirty
    });

    draftManager.start();
  }

  // Store state for cleanup
  const state: MountedAppState = {
    svelteApp,
    draftManager,
    eventHandlers: eventHandlers ?? null
  };

  // Create the mounted app interface
  const mountedApp: MountedFlowDropApp = {
    destroy: () => {
      // Call onBeforeUnmount if provided
      if (state.eventHandlers?.onBeforeUnmount) {
        const currentWorkflow = getWorkflowFromStore();
        if (currentWorkflow) {
          state.eventHandlers.onBeforeUnmount(currentWorkflow, isDirty());
        }
      }

      // Stop draft manager
      if (state.draftManager) {
        // Save one final draft if dirty
        if (isDirty()) {
          state.draftManager.forceSave();
        }
        state.draftManager.stop();
      }

      // Clear event callbacks
      setOnDirtyStateChange(null);
      setOnWorkflowChange(null);

      // Unmount Svelte app
      unmount(state.svelteApp);
    },

    isDirty: () => isDirty(),

    markAsSaved: () => {
      markAsSaved();
      if (state.draftManager) {
        // Migrate the draft key when the host confirms a save. New workflows start
        // on 'flowdrop:draft:new', a key shared across all tabs. If the host has
        // written the server-assigned ID back into the store before calling
        // markAsSaved(), we can move to a unique per-workflow key and stop
        // competing with other tabs that may also have unsaved new workflows.
        // Skip when customDraftKey is set — the host manages that key explicitly.
        if (!customDraftKey) {
          const currentWorkflow = getWorkflowFromStore();
          if (currentWorkflow?.id) {
            state.draftManager.updateStorageKey(getDraftStorageKey(currentWorkflow.id));
          }
        }
        state.draftManager.markAsSaved();
      }
    },

    getWorkflow: () => getWorkflowFromStore(),

    save: async () => {
      await globalSaveWorkflow({
        onSaved: (saved) => {
          // globalSaveWorkflow does not write the server-assigned ID back to the
          // workflow store, so we cannot read it from getWorkflowFromStore() here.
          // Instead we use the savedWorkflow returned by the API directly.
          // This migrates 'flowdrop:draft:new' to a unique per-workflow key
          // immediately after the first save, preventing cross-tab collisions
          // when multiple new workflows are open simultaneously.
          if (state.draftManager && !customDraftKey && saved.id) {
            state.draftManager.updateStorageKey(getDraftStorageKey(saved.id));
          }
        }
      });
    },

    export: () => {
      globalExportWorkflow();
    },

    clearAllDrafts: () => {
      const extras = customDraftKey ? [customDraftKey] : [];
      const removed = clearAllDraftsFromStorage(extras);
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
  } = {}
): Promise<MountedFlowDropApp> {
  const { nodes = [], endpointConfig, portConfig, categories } = options;

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
      finalPortConfig = await fetchPortConfig(config);
    } catch (error) {
      logger.warn('Failed to fetch port config from API, using default:', error);
      finalPortConfig = DEFAULT_PORT_CONFIG;
    }
  } else if (!finalPortConfig) {
    finalPortConfig = DEFAULT_PORT_CONFIG;
  }

  initializePortCompatibility(finalPortConfig);

  // Initialize categories
  if (categories) {
    initializeCategories(categories);
  } else if (config) {
    try {
      const fetchedCategories = await fetchCategories(config);
      initializeCategories(fetchedCategories);
    } catch (error) {
      logger.warn('Failed to fetch categories from API, using defaults:', error);
    }
  }

  // Create the Svelte component
  const svelteApp = mount(WorkflowEditor, {
    target: container,
    props: {
      nodes,
      endpointConfig: config
    }
  });

  // Create the mounted app interface (simpler version)
  const mountedApp: MountedFlowDropApp = {
    destroy: () => {
      unmount(svelteApp);
    },

    isDirty: () => isDirty(),

    markAsSaved: () => markAsSaved(),

    getWorkflow: () => getWorkflowFromStore(),

    save: async () => {
      await globalSaveWorkflow();
    },

    export: () => {
      globalExportWorkflow();
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
