/**
 * MSW Mock Server - Main Entry Point
 *
 * This module provides a complete mock API server for FlowDrop using MSW (Mock Service Worker).
 * It can be used for:
 * - Local development without a backend
 * - API documentation and reference
 * - Static hosting as a demo site (Netlify, Vercel, etc.)
 * - Unit and integration testing
 *
 * @example
 * ```ts
 * // Browser usage (e.g., in your app entry point)
 * import { startMockServer } from "./mocks";
 *
 * if (import.meta.env.DEV) {
 *   await startMockServer();
 *   console.log("🔶 Mock API server started");
 * }
 * ```
 *
 * @example
 * ```ts
 * // Testing usage
 * import { handlers } from "./mocks";
 * import { setupServer } from "msw/node";
 *
 * const server = setupServer(...handlers);
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */

// Re-export browser utilities
export { worker, startMockServer, stopMockServer, resetHandlers, addHandlers } from './browser.js';

// Re-export all handlers for use in tests or custom setups
export {
	handlers,
	nodeHandlers,
	workflowHandlers,
	pipelineHandlers,
	configHandlers
} from './handlers/index.js';

// Re-export mock data for direct access
export {
	// Workflow data
	mockWorkflows,
	getAllWorkflows,
	getWorkflowById,
	createWorkflow,
	updateWorkflow,
	deleteWorkflow,
	demoAIContentWorkflow,
	// Pipeline data
	mockPipelines,
	pipelineLogs,
	getPipelinesForWorkflow,
	getPipelineById,
	getPipelineLogs,
	createPipeline,
	updatePipelineStatus,
	// Node data
	mockNodes,
	getNodeById,
	getNodesByCategory,
	searchNodes,
	mockNodesCount,
	// Port config
	DEFAULT_PORT_CONFIG
} from './data/index.js';

// Re-export types
export type {
	Pipeline,
	PipelineStatus,
	JobStatus,
	NodeStatus,
	JobStatusSummary,
	LogEntry
} from './data/index.js';
