/**
 * Mock data exports for MSW mock server
 * Provides a unified interface for all mock data
 */

// Re-export workflow data
export {
  mockWorkflows,
  getAllWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  demoAIContentWorkflow,
} from "./workflows.js";

// Re-export pipeline data
export {
  mockPipelines,
  pipelineLogs,
  getPipelinesForWorkflow,
  getPipelineById,
  getPipelineLogs,
  createPipeline,
  updatePipelineStatus,
} from "./pipelines.js";
export type {
  Pipeline,
  PipelineStatus,
  JobStatus,
  NodeStatus,
  JobStatusSummary,
  LogEntry,
} from "./pipelines.js";

// Re-export node data
export {
  mockNodes,
  getNodeById,
  getNodesByCategory,
  searchNodes,
  mockNodesCount,
} from "./nodes.js";

// Re-export port config
export { DEFAULT_PORT_CONFIG } from "../../lib/config/defaultPortConfig.js";

// Re-export playground data
export {
  getSessionsForWorkflow,
  getSessionById,
  createSession,
  deleteSession,
  getSessionMessages,
  addMessage,
  updateSessionStatus,
  simulateExecution,
  resetPlaygroundData,
  initializeSamplePlaygroundData,
} from "./playground.js";

// Re-export interrupt data
export {
  createConfirmationInterrupt,
  createChoiceInterrupt,
  createTextInterrupt,
  createFormInterrupt,
  getInterruptById,
  resolveInterrupt,
  cancelInterrupt,
  getSessionInterrupts,
  getPipelineInterrupts,
  resetInterruptData,
  sampleInterruptConfigs,
} from "./interrupts.js";

// Re-export autocomplete data
export {
  mockUsers,
  mockTags,
  mockCategories,
  mockProducts,
  mockLocations,
  searchUsers,
  searchTags,
  searchCategories,
  searchProducts,
  searchLocations,
  getUserById,
  getTagById,
  getCategoryById,
  sampleAutocompleteSchemas,
  sampleAutocompleteFormSchema,
} from "./autocomplete.js";
export type {
  MockUser,
  MockTag,
  MockCategory,
  MockProduct,
  MockLocation,
} from "./autocomplete.js";
