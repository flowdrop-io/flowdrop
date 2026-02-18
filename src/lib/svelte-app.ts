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
import type { WorkflowFormatAdapter } from './registry/workflowFormatRegistry.js';
import { workflowFormatRegistry } from './registry/workflowFormatRegistry.js';
import './registry/builtinFormats.js';
import { initializePortCompatibility } from './utils/connections.js';
import { DEFAULT_PORT_CONFIG } from './config/defaultPortConfig.js';
import { fetchPortConfig } from './services/portConfigApi.js';
import { fetchCategories } from './services/categoriesApi.js';
import { initializeCategories } from './stores/categoriesStore.js';
import {
	isDirty,
	markAsSaved,
	getWorkflow as getWorkflowFromStore,
	setOnDirtyStateChange,
	setOnWorkflowChange
} from './stores/workflowStore.js';
import { DraftAutoSaveManager, getDraftStorageKey } from './services/draftStorage.js';
import { mergeFeatures } from './types/events.js';
import type { PartialSettings } from './types/settings.js';
import { initializeSettings } from './stores/settingsStore.js';

// Extend Window interface for global save/export functions
declare global {
	interface Window {
		flowdropSave?: () => Promise<void>;
		flowdropExport?: () => void;
	}
}

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
		formatAdapters
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
			console.warn('Failed to fetch port config from API, using default:', error);
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
			console.warn('Failed to fetch categories from API, using defaults:', error);
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
			features
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
			// Also update draft manager
			if (state.draftManager) {
				state.draftManager.markAsSaved();
			}
		},

		getWorkflow: () => getWorkflowFromStore(),

		save: async () => {
			if (typeof window !== 'undefined' && window.flowdropSave) {
				await window.flowdropSave();
			} else {
				console.warn('⚠️ Save functionality not available');
			}
		},

		export: () => {
			if (typeof window !== 'undefined' && window.flowdropExport) {
				window.flowdropExport();
			} else {
				console.warn('⚠️ Export functionality not available');
			}
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
			console.warn('Failed to fetch port config from API, using default:', error);
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
			console.warn('Failed to fetch categories from API, using defaults:', error);
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
			if (typeof window !== 'undefined' && window.flowdropSave) {
				await window.flowdropSave();
			} else {
				console.warn('⚠️ Save functionality not available');
			}
		},

		export: () => {
			if (typeof window !== 'undefined' && window.flowdropExport) {
				window.flowdropExport();
			} else {
				console.warn('⚠️ Export functionality not available');
			}
		}
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
