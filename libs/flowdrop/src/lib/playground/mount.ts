/**
 * Playground Mount Functions
 *
 * Provides mount/unmount functions for integrating the Playground component
 * into any web application. Particularly useful for integration with
 * vanilla JS, Drupal, WordPress, or other frameworks.
 *
 * @module playground/mount
 *
 * @example Basic usage in vanilla JavaScript:
 * ```javascript
 * const app = await FlowDrop.mountPlayground(
 *   document.getElementById("playground-container"),
 *   {
 *     workflowId: "wf-123",
 *     endpointConfig: FlowDrop.createEndpointConfig("/api/flowdrop"),
 *     mode: "standalone"
 *   }
 * );
 *
 * // Later, to cleanup:
 * app.destroy();
 * ```
 *
 * @example Drupal integration:
 * ```javascript
 * (function (Drupal, FlowDrop) {
 *   Drupal.behaviors.flowdropPlayground = {
 *     attach: function (context, settings) {
 *       const container = document.getElementById("playground-container");
 *       if (!container || container.dataset.initialized) return;
 *       container.dataset.initialized = "true";
 *
 *       FlowDrop.mountPlayground(container, {
 *         workflowId: settings.flowdrop.workflowId,
 *         endpointConfig: FlowDrop.createEndpointConfig(settings.flowdrop.apiBaseUrl),
 *         mode: "standalone"
 *       }).then(function (app) {
 *         container._flowdropApp = app;
 *       });
 *     }
 *   };
 * })(Drupal, window.FlowDrop);
 * ```
 */

import { mount, unmount } from 'svelte';
import Playground from '../components/playground/Playground.svelte';
import PlaygroundModal from '../components/playground/PlaygroundModal.svelte';
import PlaygroundStudio from '../components/playground/PlaygroundStudio.svelte';
import PlaygroundApp from '../components/playground/PlaygroundApp.svelte';
import type { Workflow } from '../types/index.js';
import type { EndpointConfig } from '../config/endpoints.js';
import type {
  PlaygroundMode,
  PlaygroundConfig,
  PlaygroundSession,
  PlaygroundMessagesApiResponse,
  PlaygroundSessionStatus
} from '../types/playground.js';
import type { PartialSettings, SettingsCategory } from '../types/settings.js';
import { initializeSettings } from '../stores/settingsStore.svelte.js';
import type { NavbarAction } from '../types/navbar.js';
import type { PipelineViewDef } from '../types/index.js';
import { setEndpointConfig } from '../services/api.js';
import { playgroundService } from '../services/playgroundService.js';
import {
  getCurrentSession,
  getSessions,
  getMessages,
  getIsExecuting,
  playgroundActions,
  applyServerResponse,
  subscribeToSessionStatus
} from '../stores/playgroundStore.svelte.js';

/**
 * Mount options for Playground component
 */
export interface PlaygroundMountOptions {
  /**
   * Target workflow ID (required)
   * The workflow that the playground will interact with
   */
  workflowId: string;

  /**
   * Pre-loaded workflow data (optional)
   * If not provided, the component will fetch it from the API
   */
  workflow?: Workflow;

  /**
   * Display mode
   * - "standalone": Full-page playground experience
   * - "embedded": Panel mode for embedding alongside other content
   * - "modal": Modal dialog mode with backdrop
   * @default "standalone"
   */
  mode?: PlaygroundMode;

  /**
   * Resume a specific session by ID
   * If provided, the playground will load this session on mount
   */
  initialSessionId?: string;

  /**
   * API endpoint configuration
   * Use createEndpointConfig() to create this
   */
  endpointConfig?: EndpointConfig;

  /**
   * Playground-specific configuration options
   */
  config?: PlaygroundConfig;

  /**
   * Container height (CSS value). If omitted, the library does NOT set an
   * inline height — the host's own CSS owns sizing. Pass a definite value
   * (e.g. `"100dvh"`, `"600px"`) only when mounting into an unsized
   * container.
   */
  height?: string;

  /**
   * Container width (CSS value). If omitted, the library does NOT set an
   * inline width. See `height` for rationale.
   */
  width?: string;

  /**
   * Callback when playground is closed (required for embedded and modal modes)
   */
  onClose?: () => void;

  /**
   * Called when session status changes (from polling or actions)
   *
   * @param status - The new session status
   * @param previousStatus - The previous session status
   */
  onSessionStatusChange?: (
    status: PlaygroundSessionStatus,
    previousStatus: PlaygroundSessionStatus
  ) => void;

  /**
   * Optional setting overrides deep-merged over current settings before mount.
   * Theme is re-initialized on every mount regardless. Mirrors mountFlowDropApp's
   * `settings` option.
   */
  settings?: PartialSettings;
}

/**
 * Return type for mounted Playground instance
 */
export interface MountedPlayground {
  /**
   * Destroy the playground and clean up resources
   * Should be called when removing the playground from the DOM
   */
  destroy: () => void;

  /**
   * Get the current session
   * @returns The current session or null if none selected
   */
  getCurrentSession: () => PlaygroundSession | null;

  /**
   * Get all sessions for the workflow
   * @returns Array of playground sessions
   */
  getSessions: () => PlaygroundSession[];

  /**
   * Get the message count in the current session
   * @returns Number of messages
   */
  getMessageCount: () => number;

  /**
   * Check if the playground is currently executing
   * @returns True if a workflow execution is in progress
   */
  isExecuting: () => boolean;

  /**
   * Stop any active polling
   */
  stopPolling: () => void;

  /**
   * Restart polling for the current session
   * Useful after polling stops (e.g., on awaiting_input) and you want to resume
   */
  startPolling: () => void;

  /**
   * Push a poll response into the store pipeline.
   * Use with custom transports (WebSocket/SSE) instead of built-in polling.
   *
   * @param response - A PlaygroundMessagesApiResponse to process
   */
  pushMessages: (response: PlaygroundMessagesApiResponse) => void;

  /**
   * Reset the playground state
   * Clears the current session and messages
   */
  reset: () => void;
}

async function resolveEndpointConfig(
  endpointConfig: EndpointConfig | undefined
): Promise<EndpointConfig | undefined> {
  if (!endpointConfig) return undefined;
  const { defaultEndpointConfig } = await import('../config/endpoints.js');
  const resolved: EndpointConfig = {
    ...defaultEndpointConfig,
    ...endpointConfig,
    endpoints: { ...defaultEndpointConfig.endpoints, ...endpointConfig.endpoints }
  };
  setEndpointConfig(resolved);
  return resolved;
}

/**
 * Shared prelude for the playground mount functions: resolves the endpoint
 * config and initializes settings/theme. Each mount function still owns its
 * own argument validation and container sizing (those vary per mode).
 */
async function prepareMount(options: {
  endpointConfig?: EndpointConfig;
  settings?: PartialSettings;
}): Promise<EndpointConfig | undefined> {
  const finalEndpointConfig = await resolveEndpointConfig(options.endpointConfig);
  await initializeSettings({ defaults: options.settings });
  return finalEndpointConfig;
}

/**
 * Apply caller-supplied height/width as inline styles. When omitted, the host
 * CSS owns container sizing — this is deliberate: a default of `100%` does not
 * resolve inside parents with only `min-height` set (a common pattern in
 * Drupal admin chrome), collapsing the playground to zero.
 */
function sizeContainer(
  container: HTMLElement,
  height: string | undefined,
  width: string | undefined
): void {
  if (height !== undefined) container.style.height = height;
  if (width !== undefined) container.style.width = width;
}

function buildMountedPlayground(
  svelteApp: ReturnType<typeof mount>,
  workflowId: string,
  config: PlaygroundConfig,
  onSessionStatusChange?: (
    status: PlaygroundSessionStatus,
    previousStatus: PlaygroundSessionStatus
  ) => void
): MountedPlayground {
  const pollingInterval = config.pollingInterval ?? 1500;
  const unsubscribeStatus = onSessionStatusChange
    ? subscribeToSessionStatus(onSessionStatusChange)
    : undefined;

  return {
    destroy: () => {
      unsubscribeStatus?.();
      playgroundService.stopPolling();
      playgroundActions.reset();
      unmount(svelteApp);
    },
    getCurrentSession: () => getCurrentSession(),
    getSessions: () => getSessions(),
    getMessageCount: () => getMessages().length,
    isExecuting: () => getIsExecuting(),
    stopPolling: () => playgroundService.stopPolling(),
    startPolling: () => {
      const session = getCurrentSession();
      if (session) {
        playgroundService.startPolling(
          session.id,
          (response) => applyServerResponse(response),
          pollingInterval,
          config.shouldStopPolling,
          playgroundService.getLastSequenceNumber()
        );
      }
    },
    pushMessages: (response: PlaygroundMessagesApiResponse) => applyServerResponse(response),
    reset: () => {
      playgroundService.stopPolling();
      playgroundActions.reset();
    }
  };
}

/**
 * Mount the Playground component in a container
 *
 * This function mounts the Playground Svelte component into a DOM container,
 * enabling interactive workflow testing with a chat interface.
 *
 * @param container - DOM element to mount the playground into
 * @param options - Configuration options for the playground
 * @returns Promise resolving to a MountedPlayground instance
 *
 * @example
 * ```typescript
 * import { mountPlayground, createEndpointConfig } from "@flowdrop/flowdrop/playground";
 *
 * const app = await mountPlayground(
 *   document.getElementById("playground"),
 *   {
 *     workflowId: "wf-123",
 *     endpointConfig: createEndpointConfig("/api/flowdrop"),
 *     mode: "standalone",
 *     config: {
 *       showTimestamps: true,
 *       autoScroll: true,
 *       pollingInterval: 1500
 *     }
 *   }
 * );
 * ```
 */
export async function mountPlayground(
  container: HTMLElement,
  options: PlaygroundMountOptions
): Promise<MountedPlayground> {
  const {
    workflowId,
    workflow,
    mode = 'standalone',
    initialSessionId,
    endpointConfig,
    config = {},
    height,
    width,
    settings: initialSettings,
    onClose,
    onSessionStatusChange
  } = options;

  // Validate required parameters
  if (!workflowId) {
    throw new Error('workflowId is required for mountPlayground()');
  }

  if (!container) {
    throw new Error('container element is required for mountPlayground()');
  }

  // Validate onClose for modal mode
  if (mode === 'modal' && !onClose) {
    throw new Error('onClose callback is required for modal mode');
  }

  const finalEndpointConfig = await prepareMount({
    endpointConfig,
    settings: initialSettings
  });

  let targetContainer = container;

  if (mode === 'modal') {
    targetContainer = document.body;
  } else {
    sizeContainer(container, height, width);
  }

  let svelteApp: ReturnType<typeof mount>;
  if (mode === 'modal') {
    svelteApp = mount(PlaygroundModal, {
      target: targetContainer,
      props: {
        isOpen: true,
        workflowId,
        workflow,
        initialSessionId,
        endpointConfig: finalEndpointConfig,
        config,
        onClose: () => {
          if (onClose) {
            onClose();
          }
        }
      }
    });
  } else {
    svelteApp = mount(Playground, {
      target: targetContainer,
      props: {
        workflowId,
        workflow,
        mode,
        initialSessionId,
        endpointConfig: finalEndpointConfig,
        config,
        onClose
      }
    });
  }

  return buildMountedPlayground(svelteApp, workflowId, config, onSessionStatusChange);
}

/**
 * Unmount a Playground instance
 *
 * Convenience function for destroying a mounted playground.
 * Equivalent to calling `app.destroy()`.
 *
 * @param app - The mounted playground to unmount
 *
 * @example
 * ```typescript
 * const app = await mountPlayground(container, options);
 * // ... later
 * unmountPlayground(app);
 * ```
 */
export function unmountPlayground(app: MountedPlayground): void {
  if (app && typeof app.destroy === 'function') {
    app.destroy();
  }
}

export interface PlaygroundStudioMountOptions extends PlaygroundMountOptions {
  initialPipelineOpen?: boolean;
  minChatWidth?: number;
  initialPipelineWidth?: number;
  onSessionNavigate?: (sessionId: string) => void;
  /** Additional pipeline views injected into the view switcher */
  pipelineViews?: PipelineViewDef[];
}

export async function mountPlaygroundStudio(
  container: HTMLElement,
  options: PlaygroundStudioMountOptions
): Promise<MountedPlayground> {
  const {
    workflowId,
    workflow,
    mode = 'standalone',
    initialSessionId,
    endpointConfig,
    config = {},
    height,
    width,
    initialPipelineOpen,
    minChatWidth,
    initialPipelineWidth,
    settings: initialSettings,
    onClose,
    onSessionNavigate,
    onSessionStatusChange,
    pipelineViews
  } = options;

  if (!workflowId) {
    throw new Error('workflowId is required for mountPlaygroundStudio()');
  }
  if (!container) {
    throw new Error('container element is required for mountPlaygroundStudio()');
  }
  if (mode === 'modal') {
    throw new Error('modal mode is not supported by mountPlaygroundStudio() — use mountPlayground() instead');
  }

  const finalEndpointConfig = await prepareMount({
    endpointConfig,
    settings: initialSettings
  });

  sizeContainer(container, height, width);

  const svelteApp = mount(PlaygroundStudio, {
    target: container,
    props: {
      workflowId,
      workflow,
      mode,
      initialSessionId,
      endpointConfig: finalEndpointConfig,
      config,
      onClose,
      onSessionNavigate,
      initialPipelineOpen,
      minChatWidth,
      initialPipelineWidth,
      extraPipelineViews: pipelineViews
    }
  });

  return buildMountedPlayground(svelteApp, workflowId, config, onSessionStatusChange);
}

export interface PlaygroundAppMountOptions
  extends Omit<PlaygroundStudioMountOptions, 'mode'> {
  /**
   * Display mode. Modal is unsupported — use mountPlayground() for that.
   * @default "standalone"
   */
  mode?: 'standalone' | 'embedded';
  /** Render the FlowDrop Navbar above the playground (default: true). */
  showNavbar?: boolean;
  /** Title shown in the navbar. Falls back to the workflow name, then "Playground". */
  navbarTitle?: string;
  /** Action buttons rendered in the navbar. Passed straight through to <Navbar primaryActions>. */
  primaryActions?: NavbarAction[];
  /** Show the settings gear icon in the navbar (default: true). */
  showSettings?: boolean;
  /** Restrict which settings categories are exposed in the settings modal. */
  settingsCategories?: SettingsCategory[];
  /** Show the "Sync to Cloud" button in the settings modal. */
  showSettingsSyncButton?: boolean;
  /** Show the reset buttons in the settings modal. */
  showSettingsResetButton?: boolean;
}

/**
 * Mount the full-page PlaygroundApp (Navbar + PlaygroundStudio) into a container.
 *
 * Use this when you want the same chrome as the FlowDrop editor — logo,
 * branding, and settings modal — wrapped around the playground. For an
 * embeddable split-pane without the navbar, use mountPlaygroundStudio().
 *
 * @example
 * ```typescript
 * const app = await mountPlaygroundApp(container, {
 *   workflowId: 'wf-123',
 *   endpointConfig: createEndpointConfig('/api/flowdrop'),
 *   navbarTitle: 'My Workflow',
 *   primaryActions: [
 *     { label: 'Edit', href: '/workflows/wf-123/edit', icon: 'mdi:pencil-outline', variant: 'secondary' },
 *     { label: 'Workflows', href: '/workflows', icon: 'mdi:arrow-left', variant: 'outline' }
 *   ]
 * });
 * ```
 */
export async function mountPlaygroundApp(
  container: HTMLElement,
  options: PlaygroundAppMountOptions
): Promise<MountedPlayground> {
  const {
    workflowId,
    workflow,
    mode = 'standalone',
    initialSessionId,
    endpointConfig,
    config = {},
    height,
    width,
    showNavbar = true,
    navbarTitle,
    primaryActions,
    showSettings = true,
    settingsCategories,
    showSettingsSyncButton,
    showSettingsResetButton,
    initialPipelineOpen,
    minChatWidth,
    initialPipelineWidth,
    settings: initialSettings,
    onClose,
    onSessionNavigate,
    onSessionStatusChange
  } = options;

  if (!workflowId) {
    throw new Error('workflowId is required for mountPlaygroundApp()');
  }
  if (!container) {
    throw new Error('container element is required for mountPlaygroundApp()');
  }
  // Positive narrowing (not `=== 'modal'`) because PlaygroundAppMountOptions
  // Omit-narrows `mode`, so the type lies for JS callers — check the values
  // we actually accept instead of the one we don't.
  if (mode !== 'standalone' && mode !== 'embedded') {
    throw new Error(
      `mountPlaygroundApp(): mode must be 'standalone' or 'embedded', got ${String(mode)}`
    );
  }

  const finalEndpointConfig = await prepareMount({
    endpointConfig,
    settings: initialSettings
  });

  sizeContainer(container, height, width);

  const svelteApp = mount(PlaygroundApp, {
    target: container,
    props: {
      workflowId,
      workflow,
      mode,
      initialSessionId,
      endpointConfig: finalEndpointConfig,
      config,
      showNavbar,
      navbarTitle,
      primaryActions,
      showSettings,
      settingsCategories,
      showSettingsSyncButton,
      showSettingsResetButton,
      initialPipelineOpen,
      minChatWidth,
      initialPipelineWidth,
      onClose,
      onSessionNavigate
    }
  });

  return buildMountedPlayground(svelteApp, workflowId, config, onSessionStatusChange);
}
