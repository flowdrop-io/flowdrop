/**
 * Svelte App Wrapper for Drupal Integration
 * This provides a way to mount Svelte components in Drupal
 */

import { mount } from 'svelte';
import WorkflowEditor from './components/WorkflowEditor.svelte';
import App from './components/App.svelte';
import type { Workflow, NodeMetadata, PortConfig } from './types/index.js';
import type { EndpointConfig } from './config/endpoints.js';
import { createEndpointConfig } from './config/endpoints.js';
import { initializePortCompatibility } from './utils/connections.js';
import { DEFAULT_PORT_CONFIG } from './config/defaultPortConfig.js';
import { fetchPortConfig } from './services/portConfigApi.js';

// Extend Window interface for global save/export functions
declare global {
	interface Window {
		flowdropSave?: () => Promise<void>;
		flowdropExport?: () => void;
	}
}

/**
 * Return type for mounted Svelte app
 */
interface MountedSvelteApp {
	destroy: () => void;
	save?: () => Promise<void>;
	export?: () => void;
	// Add any other methods from Svelte's mount return type as needed
}

/**
 * Mount the full FlowDrop App with configurable navbar height and other settings
 * This is the recommended way to mount the app for IIFE usage
 */
export async function mountFlowDropApp(
	container: HTMLElement,
	options: {
		workflow?: Workflow;
		nodes?: NodeMetadata[];
		endpointConfig?: EndpointConfig;
		portConfig?: PortConfig;
		height?: string | number;
		width?: string | number;
		showNavbar?: boolean;
		// Pipeline status mode configuration
		disableSidebar?: boolean;
		lockWorkflow?: boolean;
		readOnly?: boolean;
		nodeStatuses?: Record<string, 'pending' | 'running' | 'completed' | 'error'>;
		pipelineId?: string;
		// Navbar customization
		navbarTitle?: string;
		navbarActions?: Array<{
			label: string;
			href: string;
			icon?: string;
			variant?: 'primary' | 'secondary' | 'outline';
			onclick?: (event: Event) => void;
		}>;
	} = {}
): Promise<MountedSvelteApp> {
	const {
		workflow,
		nodes = [],
		endpointConfig,
		portConfig,
		height = '100vh',
		width = '100%',
		showNavbar = false,
		disableSidebar,
		lockWorkflow,
		readOnly,
		nodeStatuses,
		pipelineId,
		navbarTitle,
		navbarActions
	} = options;

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

	// Create the Svelte App component with configuration
	const app = mount(App, {
		target: container,
		props: {
			workflow,
			height,
			width,
			showNavbar,
			disableSidebar,
			lockWorkflow,
			readOnly,
			nodeStatuses,
			pipelineId,
			navbarTitle,
			navbarActions
		}
	}) as MountedSvelteApp;

	// Expose save and export functionality
	app.save = async () => {
		if (typeof window !== 'undefined' && window.flowdropSave) {
			await window.flowdropSave();
		} else {
			console.warn('⚠️ Save functionality not available');
		}
	};

	app.export = () => {
		if (typeof window !== 'undefined' && window.flowdropExport) {
			window.flowdropExport();
		} else {
			console.warn('⚠️ Export functionality not available');
		}
	};

	return app;
}

/**
 * Mount the WorkflowEditor component in a Drupal container
 */
export async function mountWorkflowEditor(
	container: HTMLElement,
	options: {
		workflow?: Workflow;
		nodes?: NodeMetadata[];
		endpointConfig?: EndpointConfig;
		portConfig?: PortConfig;
	} = {}
): Promise<MountedSvelteApp> {
	const { workflow, nodes = [], endpointConfig, portConfig } = options;

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

	// Create the Svelte component
	const app = mount(WorkflowEditor, {
		target: container,
		props: {
			nodes,
			endpointConfig: config
		}
	}) as MountedSvelteApp;

	return app;
}

/**
 * Unmount a Svelte app (works for both App and WorkflowEditor)
 */
export function unmountFlowDropApp(app: MountedSvelteApp): void {
	if (app && typeof app.destroy === 'function') {
		app.destroy();
	}
}

/**
 * Unmount a Svelte app (alias for backward compatibility)
 */
export function unmountWorkflowEditor(app: MountedSvelteApp): void {
	unmountFlowDropApp(app);
}
