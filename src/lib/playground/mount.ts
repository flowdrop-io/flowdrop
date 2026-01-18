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

import { mount, unmount } from "svelte";
import Playground from "../components/playground/Playground.svelte";
import PlaygroundModal from "../components/playground/PlaygroundModal.svelte";
import type { Workflow } from "../types/index.js";
import type { EndpointConfig } from "../config/endpoints.js";
import type { PlaygroundMode, PlaygroundConfig, PlaygroundSession } from "../types/playground.js";
import { setEndpointConfig } from "../services/api.js";
import { playgroundService } from "../services/playgroundService.js";
import {
	currentSession,
	sessions,
	messages,
	playgroundActions
} from "../stores/playgroundStore.js";
import { get } from "svelte/store";

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
	 * Container height (CSS value)
	 * @default "100%"
	 */
	height?: string;

	/**
	 * Container width (CSS value)
	 * @default "100%"
	 */
	width?: string;

	/**
	 * Callback when playground is closed (required for embedded and modal modes)
	 */
	onClose?: () => void;
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
	 * Reset the playground state
	 * Clears the current session and messages
	 */
	reset: () => void;
}

/**
 * Internal state for a mounted Playground instance
 */
interface MountedPlaygroundState {
	/** Svelte component instance */
	svelteApp: ReturnType<typeof mount>;
	/** Container element */
	container: HTMLElement;
	/** Original container (for cleanup) */
	originalContainer?: HTMLElement;
	/** Workflow ID */
	workflowId: string;
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
 * import { mountPlayground, createEndpointConfig } from "@d34dman/flowdrop/playground";
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
		mode = "standalone",
		initialSessionId,
		endpointConfig,
		config = {},
		height = "100%",
		width = "100%",
		onClose
	} = options;

	// Validate required parameters
	if (!workflowId) {
		throw new Error("workflowId is required for mountPlayground()");
	}

	if (!container) {
		throw new Error("container element is required for mountPlayground()");
	}

	// Validate onClose for modal mode
	if (mode === "modal" && !onClose) {
		throw new Error("onClose callback is required for modal mode");
	}

	// Set endpoint configuration if provided
	let finalEndpointConfig: EndpointConfig | undefined;

	if (endpointConfig) {
		// Merge with default configuration to ensure all required endpoints are present
		const { defaultEndpointConfig } = await import("../config/endpoints.js");
		finalEndpointConfig = {
			...defaultEndpointConfig,
			...endpointConfig,
			endpoints: {
				...defaultEndpointConfig.endpoints,
				...endpointConfig.endpoints
			}
		};
		setEndpointConfig(finalEndpointConfig);
	}

	// Handle modal mode differently
	// For modal mode, PlaygroundModal creates its own backdrop, so we mount directly to body
	// For other modes, use the provided container
	let targetContainer = container;

	if (mode === "modal") {
		// For modal mode, create a container in the body
		// PlaygroundModal will handle the backdrop itself
		targetContainer = document.body;
	} else {
		// Apply container styling for non-modal modes
		container.style.height = height;
		container.style.width = width;
	}

	// Mount the appropriate component
	const svelteApp = mount(
		mode === "modal" ? PlaygroundModal : Playground,
		{
			target: targetContainer,
			props: mode === "modal"
				? {
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
				: {
						workflowId,
						workflow,
						mode,
						initialSessionId,
						endpointConfig: finalEndpointConfig,
						config,
						onClose
					}
		}
	);

	// Store state for cleanup
	const state: MountedPlaygroundState = {
		svelteApp,
		container: targetContainer,
		originalContainer: mode === "modal" ? container : undefined,
		workflowId
	};

	// Create the mounted playground interface
	const mountedPlayground: MountedPlayground = {
		destroy: () => {
			// Stop any active polling
			playgroundService.stopPolling();

			// Reset playground state
			playgroundActions.reset();

			// Unmount Svelte component
			unmount(state.svelteApp);
		},

		getCurrentSession: () => {
			return get(currentSession);
		},

		getSessions: () => {
			return get(sessions);
		},

		getMessageCount: () => {
			return get(messages).length;
		},

		isExecuting: () => {
			return playgroundService.isPolling();
		},

		stopPolling: () => {
			playgroundService.stopPolling();
		},

		reset: () => {
			playgroundService.stopPolling();
			playgroundActions.reset();
		}
	};

	return mountedPlayground;
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
	if (app && typeof app.destroy === "function") {
		app.destroy();
	}
}
