/**
 * Svelte App Wrapper for Drupal Integration
 * This provides a way to mount Svelte components in Drupal
 */

import { mount } from 'svelte';
import WorkflowEditor from './components/WorkflowEditor.svelte';
import type { Workflow, NodeMetadata } from './types/index.js';
import type { EndpointConfig } from './config/endpoints.js';
import { createEndpointConfig } from './config/endpoints.js';

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
  } = {}
): Promise<any> {
  const {
    workflow,
    nodes = [],
    apiBaseUrl,
    endpointConfig
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
 * Unmount a Svelte app
 */
export function unmountWorkflowEditor(app: any): void {
  if (app && typeof app.destroy === 'function') {
    app.destroy();
  }
} 