/**
 * FlowDrop Core Module
 *
 * This module exports types, utilities, and lightweight functionality
 * with zero heavy dependencies. Safe to import without bundling
 * @xyflow/svelte, codemirror, easymde, or marked.
 *
 * @module core
 *
 * @example
 * ```typescript
 * // Import types and utilities without heavy dependencies
 * import type { Workflow, WorkflowNode, NodeMetadata } from "@d34dman/flowdrop/core";
 * import { getStatusColor, createDefaultExecutionInfo } from "@d34dman/flowdrop/core";
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

// Main workflow types
export type {
	NodeCategory,
	BuiltinNodeCategory,
	CategoryDefinition,
	NodeDataType,
	NodePort,
	DynamicPort,
	Branch,
	NodeMetadata,
	NodeExtensions,
	NodeUIExtensions,
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
	BuiltinNodeType,
	// Port configuration
	PortConfig,
	PortCompatibilityRule,
	// Config Schema
	ConfigSchema,
	ConfigProperty,
	// Admin/Edit configuration types
	HttpMethod,
	DynamicSchemaEndpoint,
	ExternalEditLink,
	ConfigEditOptions,
	// Edge types
	EdgeCategory
} from '../types/index.js';

// Configuration types
export type {
	WorkflowEditorConfig,
	EditorFeatures,
	UIConfig,
	APIConfig,
	ExecutionConfig,
	StorageConfig
} from '../types/config.js';

// Authentication types
export type { AuthProvider, StaticAuthConfig, CallbackAuthConfig } from '../types/auth.js';

// Event types
export type {
	WorkflowChangeType,
	FlowDropEventHandlers,
	FlowDropFeatures
} from '../types/events.js';

// Form field types (no component dependencies)
export type {
	FieldSchema,
	FieldType,
	FieldFormat,
	FieldOption,
	SchemaFormProps,
	BaseFieldProps,
	TextFieldProps,
	TextareaFieldProps,
	NumberFieldProps,
	ToggleFieldProps,
	RangeFieldProps,
	SelectFieldProps,
	CheckboxGroupFieldProps,
	ArrayFieldProps,
	CodeEditorFieldProps,
	MarkdownEditorFieldProps,
	TemplateEditorFieldProps,
	FormFieldFactoryProps,
	FormFieldWrapperProps
} from '../components/form/types.js';

// Registry types
export type {
	NodeComponentProps,
	NodeComponentRegistration,
	NodeComponentCategory,
	StatusPosition,
	StatusSize,
	NodeRegistrationFilter,
	FlowDropPluginConfig,
	PluginNodeDefinition,
	PluginRegistrationResult
} from '../registry/index.js';

// Service types
export type { ToastType, ToastOptions } from '../services/toastService.js';
export type { DynamicSchemaResult } from '../services/dynamicSchemaService.js';

// Playground types
export type {
	PlaygroundSession,
	PlaygroundMessage,
	PlaygroundInputField,
	PlaygroundMessageRequest,
	PlaygroundMessagesResult,
	PlaygroundConfig,
	PlaygroundMode,
	PlaygroundSessionStatus,
	PlaygroundMessageRole,
	PlaygroundMessageLevel,
	PlaygroundMessageMetadata,
	PlaygroundApiResponse,
	PlaygroundSessionsResponse,
	PlaygroundSessionResponse,
	PlaygroundMessageResponse,
	PlaygroundMessagesApiResponse
} from '../types/playground.js';

export { isChatInputNode, CHAT_INPUT_PATTERNS } from '../types/playground.js';

// Endpoint config types
export type { EndpointConfig } from '../config/endpoints.js';

// Svelte app types
export type { FlowDropMountOptions, MountedFlowDropApp, NavbarAction } from '../svelte-app.js';

// ============================================================================
// Authentication Providers (no dependencies)
// ============================================================================

export { StaticAuthProvider, CallbackAuthProvider, NoAuthProvider } from '../types/auth.js';

// ============================================================================
// Event Utilities
// ============================================================================

export { DEFAULT_FEATURES, mergeFeatures } from '../types/events.js';

// ============================================================================
// Utility Functions (no heavy dependencies)
// ============================================================================

// Node status utilities
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
} from '../utils/nodeStatus.js';

// Node wrapper utilities
export {
	createNodeWrapperConfig,
	shouldShowNodeStatus,
	getOptimalStatusPosition,
	getOptimalStatusSize,
	DEFAULT_NODE_STATUS_CONFIG
} from '../utils/nodeWrapper.js';
export type { NodeStatusConfig } from '../utils/nodeWrapper.js';

// Color utilities
export * from '../utils/colors.js';

// Icon utilities
export * from '../utils/icons.js';

// Config utilities
export * from '../utils/config.js';

// Node type utilities
export * from '../utils/nodeTypes.js';

// Connection utilities (including loopback edge detection)
export {
	isLoopbackEdge,
	isValidLoopbackCycle,
	hasCycles,
	hasInvalidCycles
} from '../utils/connections.js';

// Form type utilities
export { isFieldOptionArray, normalizeOptions } from '../components/form/types.js';

// ============================================================================
// Configuration
// ============================================================================

export { DEFAULT_PORT_CONFIG } from '../config/defaultPortConfig.js';
export { defaultEndpointConfig, createEndpointConfig } from '../config/endpoints.js';

// ============================================================================
// Adapters
// ============================================================================

export * from '../adapters/WorkflowAdapter.js';

// ============================================================================
// Theme System
// ============================================================================

export type { ThemePreference, ResolvedTheme } from '../stores/themeStore.js';
export {
	theme,
	resolvedTheme,
	setTheme,
	toggleTheme,
	cycleTheme,
	initializeTheme,
	isThemeInitialized
} from '../stores/themeStore.js';
