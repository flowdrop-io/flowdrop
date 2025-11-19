/**
 * FlowDrop - Visual Workflow Editor Library
 * A Svelte 5 component library built on @xyflow/svelte for creating node-based workflow editors
 */

// Import CSS to ensure styles are included in the library build
import './styles/base.css';

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
} from './types/index.js';

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
} from './types/config.js';

// Export API clients
export { FlowDropApiClient } from './api/client.js';
export { EnhancedFlowDropApiClient } from './api/enhanced-client.js';

// Export components
export { default as WorkflowEditor } from './components/WorkflowEditor.svelte';
export { default as NodeSidebar } from './components/NodeSidebar.svelte';
export { default as WorkflowNodeComponent } from './components/WorkflowNode.svelte';
export { default as SimpleNodeComponent } from './components/SimpleNode.svelte';
export { default as ToolNodeComponent } from './components/ToolNode.svelte';
export { default as NotesNodeComponent } from './components/NotesNode.svelte';
export { default as CanvasBanner } from './components/CanvasBanner.svelte';
export { default as UniversalNode } from './components/UniversalNode.svelte';
export { default as GatewayNode } from './components/GatewayNode.svelte';
export { default as SquareNode } from './components/SquareNode.svelte';
export { default as LoadingSpinner } from './components/LoadingSpinner.svelte';
export { default as StatusIcon } from './components/StatusIcon.svelte';
export { default as StatusLabel } from './components/StatusLabel.svelte';
export { default as NodeStatusOverlay } from './components/NodeStatusOverlay.svelte';
export { default as MarkdownDisplay } from './components/MarkdownDisplay.svelte';
export { default as ConfigForm } from './components/ConfigForm.svelte';
export { default as ConfigModal } from './components/ConfigModal.svelte';
export { default as ConfigSidebar } from './components/ConfigSidebar.svelte';
export { default as ConnectionLine } from './components/ConnectionLine.svelte';
export { default as LogsSidebar } from './components/LogsSidebar.svelte';
export { default as PipelineStatus } from './components/PipelineStatus.svelte';
export { default as Navbar } from './components/Navbar.svelte';
export { default as Logo } from './components/Logo.svelte';

// Export sample data for development
export { sampleNodes, sampleWorkflow } from './data/samples.js';

// Export utilities
export * from './utils/icons.js';
export * from './utils/colors.js';
export * from './utils/connections.js';
export * from './utils/config.js';
export * from './utils/nodeTypes.js';
export {
	getStatusColor,
	getStatusIcon,
	getStatusLabel,
	getStatusBackgroundColor,
	getStatusTextColor,
	createDefaultExecutionInfo,
	updateExecutionStart,
	updateExecutionComplete,
	updateExecutionFailed,
	resetExecutionInfo,
	formatExecutionDuration,
	formatLastExecuted
} from './utils/nodeStatus.js';
export {
	createNodeWrapperConfig,
	shouldShowNodeStatus,
	getOptimalStatusPosition,
	getOptimalStatusSize,
	DEFAULT_NODE_STATUS_CONFIG
} from './utils/nodeWrapper.js';
export type { NodeStatusConfig } from './utils/nodeWrapper.js';

// Export services
export * from './services/api.js';
export {
	showSuccess,
	showError,
	showWarning,
	showInfo,
	showLoading,
	dismissToast,
	dismissAllToasts,
	showPromise,
	showConfirmation,
	apiToasts,
	workflowToasts,
	pipelineToasts
} from './services/toastService.js';
export type { ToastType, ToastOptions } from './services/toastService.js';
export { NodeExecutionService, nodeExecutionService } from './services/nodeExecutionService.js';
export {
	saveWorkflow,
	updateWorkflow,
	getWorkflow,
	getWorkflows,
	deleteWorkflow,
	getWorkflowCount,
	initializeSampleWorkflows
} from './services/workflowStorage.js';
export {
	globalSaveWorkflow,
	globalExportWorkflow,
	initializeGlobalSave
} from './services/globalSave.js';
export { fetchPortConfig, validatePortConfig } from './services/portConfigApi.js';

// Export helpers
export {
	EdgeStylingHelper,
	NodeOperationsHelper,
	WorkflowOperationsHelper,
	ConfigurationHelper
} from './helpers/workflowEditorHelper.js';

// Export stores
export {
	workflowStore,
	workflowActions,
	workflowId,
	workflowName,
	workflowNodes,
	workflowEdges,
	workflowMetadata,
	workflowChanged,
	workflowValidation,
	workflowMetadataChanged
} from './stores/workflowStore.js';

// Export endpoint configuration
export * from './config/endpoints.js';
export { defaultApiConfig, getEndpointUrl } from './config/apiConfig.js';
export type { ApiConfig } from './config/apiConfig.js';
export { DEFAULT_PORT_CONFIG } from './config/defaultPortConfig.js';
export * from './config/runtimeConfig.js';

// Export adapters
export * from './adapters/WorkflowAdapter.js';

// Export API client
export * from './clients/ApiClient.js';

// Export Svelte app wrapper for framework integration
export {
	mountWorkflowEditor,
	unmountWorkflowEditor,
	mountFlowDropApp,
	unmountFlowDropApp
} from './svelte-app.js';
