/**
 * FlowDrop - Workflow Library
 * A Svelte Flow-based library for building workflows
 */

// Import CSS to ensure styles are included in the library build
import "../app.css";

// Export types
export type {
  NodeCategory,
  NodeDataType,
  NodePort,
  NodeMetadata,
  NodeConfig,
  WorkflowNode,
  WorkflowEdge,
  Workflow,
  ApiResponse,
  NodesResponse,
  WorkflowResponse,
  WorkflowsResponse,
  ExecutionStatus,
  ExecutionResult,
  FlowDropConfig,
  WorkflowEvents
} from "./types/index.js";

// Export configuration types
export type {
  WorkflowEditorConfig,
  EditorFeatures,
  UIConfig,
  APIConfig,
  ExecutionConfig,
  StorageConfig,
  NodeType,
  WorkflowData,
  ExecutionResult as EditorExecutionResult,
  EditorState
} from "./types/config.js";

// Export API clients
export { FlowDropApiClient } from "./api/client.js";
export { EnhancedFlowDropApiClient } from "./api/enhanced-client.js";

// Export components
export { default as WorkflowEditor } from "./components/WorkflowEditor.svelte";
export { default as NodeSidebar } from "./components/NodeSidebar.svelte";
export { default as WorkflowNodeComponent } from "./components/WorkflowNode.svelte";
export { default as SimpleNodeComponent } from "./components/SimpleNode.svelte";
export { default as ToolNodeComponent } from "./components/ToolNode.svelte";
export { default as NotesNodeComponent } from "./components/NotesNode.svelte";
export { default as CanvasBanner } from "./components/CanvasBanner.svelte";

// Export sample data for development
export { sampleNodes, sampleWorkflow } from "./data/samples.js";

// Export utilities
export * from "./utils/icons.js";
export * from "./utils/colors.js";
export * from "./utils/connections.js";
export * from "./utils/config.js";
export * from "./utils/nodeTypes.js";

// Export services
export * from "./services/api.js";

// Export endpoint configuration
export * from "./config/endpoints.js";

// Export adapters
export * from "./adapters/WorkflowAdapter.js";

// Export API client
export * from "./clients/ApiClient.js";

// Export Svelte app wrapper for Drupal integration
export { mountWorkflowEditor, unmountWorkflowEditor } from "./svelte-app.js";
