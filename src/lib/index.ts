/**
 * FlowDrop - Visual Workflow Editor Library
 * A Svelte 5 component library built on @xyflow/svelte for creating node-based workflow editors
 */

// Import CSS to ensure styles are included in the library build
import './styles/base.css';

// Initialize built-in node components in the registry
// This import has a side effect of registering all built-in nodes
import './registry/builtinNodes.js';

// Export types
export type {
	NodeCategory,
	NodeDataType,
	NodePort,
	NodeMetadata,
	ConfigValues,
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
	WorkflowEvents,
	BuiltinNodeType
} from './types/index.js';

// Export configuration types
export type {
	WorkflowEditorConfig,
	EditorFeatures,
	UIConfig,
	APIConfig,
	ExecutionConfig,
	StorageConfig
} from './types/config.js';

// Export authentication types and providers
export type { AuthProvider, StaticAuthConfig, CallbackAuthConfig } from './types/auth.js';
export { StaticAuthProvider, CallbackAuthProvider, NoAuthProvider } from './types/auth.js';

// Export event types
export type {
	WorkflowChangeType,
	FlowDropEventHandlers,
	FlowDropFeatures
} from './types/events.js';
export { DEFAULT_FEATURES, mergeFeatures } from './types/events.js';

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

// Export node component registry
export {
	// Core registry
	nodeComponentRegistry,
	createNamespacedType,
	parseNamespacedType,
	// Built-in nodes
	BUILTIN_NODE_COMPONENTS,
	BUILTIN_NODE_TYPES,
	FLOWDROP_SOURCE,
	registerBuiltinNodes,
	areBuiltinsRegistered,
	isBuiltinType,
	getBuiltinTypes,
	resolveBuiltinAlias,
	// Plugin system
	registerFlowDropPlugin,
	unregisterFlowDropPlugin,
	registerCustomNode,
	createPlugin,
	isValidNamespace,
	getRegisteredPlugins,
	getPluginNodeCount
} from './registry/index.js';
export type {
	// Core registry types
	NodeComponentProps,
	NodeComponentRegistration,
	NodeComponentCategory,
	StatusPosition,
	StatusSize,
	NodeRegistrationFilter,
	// Plugin types
	FlowDropPluginConfig,
	PluginNodeDefinition,
	PluginRegistrationResult
} from './registry/index.js';

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

// Export draft storage service
export {
	getDraftStorageKey,
	saveDraft,
	loadDraft,
	deleteDraft,
	hasDraft,
	getDraftMetadata,
	DraftAutoSaveManager
} from './services/draftStorage.js';

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
	workflowMetadataChanged,
	// Dirty state tracking
	isDirtyStore,
	isDirty,
	markAsSaved,
	getWorkflow as getWorkflowFromStore,
	setOnDirtyStateChange,
	setOnWorkflowChange
} from './stores/workflowStore.js';

// Export endpoint configuration
export * from './config/endpoints.js';
export { DEFAULT_PORT_CONFIG } from './config/defaultPortConfig.js';
export * from './config/runtimeConfig.js';

// Export adapters
export * from './adapters/WorkflowAdapter.js';

// Export Svelte app wrapper for framework integration
export {
	mountWorkflowEditor,
	mountFlowDropApp,
	unmountFlowDropApp
} from './svelte-app.js';
export type { FlowDropMountOptions, MountedFlowDropApp, NavbarAction } from './svelte-app.js';

// Export API error class
export { ApiError } from './api/enhanced-client.js';
