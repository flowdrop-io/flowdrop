/**
 * MSW handlers index - combines all API handlers
 * This file exports all handlers for the mock server
 */

import { nodeHandlers } from './nodes.js';
import { workflowHandlers } from './workflows.js';
import { pipelineHandlers } from './pipelines.js';
import { configHandlers } from './config.js';

/**
 * All MSW request handlers for the FlowDrop API
 * These handlers mock the complete FlowDrop API as defined in the OpenAPI spec
 */
export const handlers = [
	...configHandlers,
	...nodeHandlers,
	...workflowHandlers,
	...pipelineHandlers
];

// Re-export individual handler groups for selective use
export { nodeHandlers } from './nodes.js';
export { workflowHandlers } from './workflows.js';
export { pipelineHandlers } from './pipelines.js';
export { configHandlers } from './config.js';
