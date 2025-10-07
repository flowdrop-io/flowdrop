/**
 * Svelte App Wrapper for Drupal Integration
 * This provides a way to mount Svelte components in Drupal
 */

import { mount } from 'svelte';
import WorkflowEditor from './components/WorkflowEditor.svelte';
import App from './components/App.svelte';
import type { Workflow, NodeMetadata, PortConfig, WorkflowEditorConfig } from './types/index.js';
import type { EndpointConfig } from './config/endpoints.js';
import { createEndpointConfig } from './config/endpoints.js';
import { initializePortCompatibility } from './utils/connections.js';
import { DEFAULT_PORT_CONFIG } from './config/defaultPortConfig.js';
import { fetchPortConfig } from './services/portConfigApi.js';

/**
 * Mount the full FlowDrop App with configurable navbar height and other settings
 * This is the recommended way to mount the app for IIFE usage
 */
export async function mountFlowDropApp(
  container: HTMLElement,
  config: Partial<WorkflowEditorConfig> = {}
): Promise<any> {
  // Create the Svelte App component with configuration
  const app = mount(App, {
    target: container,
    props: {
      config
    }
  });

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
    apiBaseUrl?: string;
    endpointConfig?: EndpointConfig;
    portConfig?: PortConfig;
  } = {}
): Promise<any> {
  const {
    workflow,
    nodes = [],
    apiBaseUrl,
    endpointConfig,
    portConfig
  } = options;

  // Create endpoint configuration
  let config: EndpointConfig | undefined;
  
  if (endpointConfig) {
    // Merge with default configuration to ensure all required endpoints are present
    const { createEndpointConfig, defaultEndpointConfig } = await import('./config/endpoints.js');
    config = {
      ...defaultEndpointConfig,
      ...endpointConfig,
      endpoints: {
        ...defaultEndpointConfig.endpoints,
        ...endpointConfig.endpoints,
      },
    };
  } else if (apiBaseUrl) {
    config = createEndpointConfig(apiBaseUrl);
  }

  // Initialize port configuration
  let finalPortConfig = portConfig;
  
  if (!finalPortConfig && config) {
    // Try to fetch port configuration from API
    try {
      finalPortConfig = await fetchPortConfig(config);
    } catch (error) {
      console.warn("Failed to fetch port config from API, using default:", error);
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
      workflow,
      nodes,
      endpointConfig: config
    }
  });

  return app;
}

/**
 * Unmount a Svelte app (works for both App and WorkflowEditor)
 */
export function unmountFlowDropApp(app: any): void {
  if (app && typeof app.destroy === 'function') {
    app.destroy();
  }
}

/**
 * Unmount a Svelte app (alias for backward compatibility)
 */
export function unmountWorkflowEditor(app: any): void {
  unmountFlowDropApp(app);
} 