/**
 * Global Save Service
 * Provides save and export functionality that can be accessed from anywhere in the app
 * This allows the main navbar to save workflows without being tied to a specific component
 */

import { get } from 'svelte/store';
import { workflowStore } from '$lib/stores/workflowStore.js';
import { workflowApi, setEndpointConfig } from './api.js';
import { createEndpointConfig } from '$lib/config/endpoints.js';
import { v4 as uuidv4 } from 'uuid';
import type { Workflow } from '$lib/types/index.js';
import { apiToasts, workflowToasts, dismissToast } from './toastService.js';

/**
 * Ensure API configuration is initialized
 * This is needed when the global save function is called from the layout component
 * which doesn't initialize the API configuration like the App component does
 */
async function ensureApiConfiguration(): Promise<void> {
	// Check if we need to initialize the API configuration
	// We'll check if the endpointConfig is already set by importing the api module
	try {
		// Import the api module to check if endpointConfig is already set
		const { getEndpointConfig } = await import('./api.js');

		// Try to get the current configuration
		const currentConfig = getEndpointConfig();
		if (currentConfig && currentConfig.baseUrl) {
			return;
		}
	} catch (error) {
		// Could not check existing API configuration, initializing
	}

	// API configuration is not initialized, so let's initialize it

	// Use the same environment variable priority as the App component
	// Prioritize VITE_API_BASE_URL since it's configured correctly
	const apiBaseUrl =
		import.meta.env.VITE_API_BASE_URL ||
		import.meta.env.VITE_DRUPAL_API_URL ||
		import.meta.env.VITE_FLOWDROP_API_URL ||
		(() => {
			// If we're in development (localhost:5173), use relative path
			if (window.location.hostname === 'localhost' && window.location.port === '5173') {
				return '/api/flowdrop';
			}
			// Otherwise, use the current domain
			return `${window.location.protocol}//${window.location.host}/api/flowdrop`;
		})();

	const config = createEndpointConfig(apiBaseUrl, {
		auth: {
			type: 'none' // No authentication for now
		},
		timeout: 10000, // 10 second timeout
		retry: {
			enabled: true,
			maxAttempts: 2,
			delay: 1000,
			backoff: 'exponential'
		}
	});

	setEndpointConfig(config);
}

/**
 * Global save function that can be called from anywhere
 * Uses the current workflow from the global store
 */
export async function globalSaveWorkflow(): Promise<void> {
	let loadingToast: string | undefined;

	try {
		// Show loading toast
		loadingToast = apiToasts.loading('Saving workflow');

		// Ensure API configuration is initialized
		await ensureApiConfiguration();

		// Get current workflow from global store
		const currentWorkflow = get(workflowStore);

		if (!currentWorkflow) {
			if (loadingToast) dismissToast(loadingToast);
			apiToasts.error('Save workflow', 'No workflow to save');
			return;
		}

		// Determine the workflow ID
		let workflowId: string;
		if (currentWorkflow.id) {
			workflowId = currentWorkflow.id;
		} else {
			workflowId = uuidv4();
		}

		// Create workflow object for saving
		const finalWorkflow: Workflow = {
			id: workflowId,
			name: currentWorkflow.name || 'Untitled Workflow',
			nodes: currentWorkflow.nodes || [],
			edges: currentWorkflow.edges || [],
			metadata: {
				version: '1.0.0',
				createdAt: currentWorkflow.metadata?.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		};

		const savedWorkflow = await workflowApi.saveWorkflow(finalWorkflow);

		// Dismiss loading toast and show success toast
		if (loadingToast) dismissToast(loadingToast);
		workflowToasts.saved(finalWorkflow.name);
	} catch (error) {
		// Dismiss loading toast and show error toast
		if (loadingToast) dismissToast(loadingToast);
		apiToasts.error('Save workflow', error instanceof Error ? error.message : 'Unknown error');
		throw error;
	}
}

/**
 * Global export function that can be called from anywhere
 * Uses the current workflow from the global store
 */
export async function globalExportWorkflow(): Promise<void> {
	try {
		// Get current workflow from global store
		const currentWorkflow = get(workflowStore);

		if (!currentWorkflow) {
			apiToasts.error('Export workflow', 'No workflow to export');
			return;
		}

		// Create workflow object for export
		const finalWorkflow: Workflow = {
			id: currentWorkflow.id || 'untitled-workflow',
			name: currentWorkflow.name || 'Untitled Workflow',
			nodes: currentWorkflow.nodes || [],
			edges: currentWorkflow.edges || [],
			metadata: {
				version: '1.0.0',
				createdAt: currentWorkflow.metadata?.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		};

		// Create and download the file
		const dataStr = JSON.stringify(finalWorkflow, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${finalWorkflow.name}.json`;
		link.click();
		URL.revokeObjectURL(url);

		// Show success toast
		workflowToasts.exported(finalWorkflow.name);
	} catch (error) {
		// Export failed
		apiToasts.error('Export workflow', error instanceof Error ? error.message : 'Unknown error');
	}
}

/**
 * Initialize global save functions on window object for external access
 * This allows the functions to be called from anywhere in the application
 */
export function initializeGlobalSave(): void {
	if (typeof window !== 'undefined') {
		// @ts-ignore - Adding to window for external access
		window.flowdropGlobalSave = globalSaveWorkflow;
		// @ts-ignore - Adding to window for external access
		window.flowdropGlobalExport = globalExportWorkflow;
	}
}
