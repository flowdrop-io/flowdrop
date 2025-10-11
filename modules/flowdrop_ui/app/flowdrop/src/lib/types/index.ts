/**
 * Core types for the Workflow Library
 */

import type { Node, Edge, XYPosition } from '@xyflow/svelte';
import { ConnectionLineType } from '@xyflow/svelte';
import type { EndpointConfig } from '../config/endpoints.js';

/**
 * Node category types for organizing nodes in the sidebar
 * Based on actual API response categories
 */
export type NodeCategory =
	| 'inputs'
	| 'outputs'
	| 'prompts'
	| 'models'
	| 'processing'
	| 'logic'
	| 'data'
	| 'tools'
	| 'helpers'
	| 'vector stores'
	| 'embeddings'
	| 'memories'
	| 'agents'
	| 'ai'
	| 'bundles';

/**
 * Port data type configuration
 */
export interface PortDataTypeConfig {
	/** Unique identifier for the data type */
	id: string;
	/** Display name for the data type */
	name: string;
	/** Description of the data type */
	description?: string;
	/** Color for the data type (CSS color value) */
	color: string;
	/** Category grouping for the data type */
	category?: string;
	/** Alternative names/aliases for this data type */
	aliases?: string[];
	/** Whether this data type is enabled */
	enabled?: boolean;
}

/**
 * Port compatibility rule configuration
 * Simple rule: sourceType can connect TO targetType
 */
export interface PortCompatibilityRule {
	/** Source data type ID (what you're connecting FROM) */
	from: string;
	/** Target data type ID (what you're connecting TO) */
	to: string;
	/** Optional description of why this connection is allowed */
	description?: string;
}

/**
 * Complete port configuration system
 */
export interface PortConfig {
	/** Available data types */
	dataTypes: PortDataTypeConfig[];
	/** Compatibility rules between data types */
	compatibilityRules: PortCompatibilityRule[];
	/** Default data type to use when none specified */
	defaultDataType: string;
	/** Version of the port configuration */
	version?: string;
}

/**
 * Node data type - now dynamic based on configuration
 * Will be string literals of available data type IDs
 */
export type NodeDataType = string;

/**
 * Node port configuration
 */
export interface NodePort {
	id: string;
	name: string;
	type: 'input' | 'output' | 'metadata';
	dataType: NodeDataType;
	required?: boolean;
	description?: string;
	defaultValue?: unknown;
}

/**
 * Node types for explicit component rendering
 */
export type NodeType = 'note' | 'simple' | 'square' | 'tool' | 'gateway' | 'default';

/**
 * Node configuration metadata
 */
export interface NodeMetadata {
	id: string;
	name: string;
	type?: NodeType;
	/**
	 * Array of supported node types that this node can be rendered as.
	 * If not specified, defaults to the single 'type' field or 'default'.
	 * This allows nodes to support multiple rendering modes (e.g., both 'simple' and 'default').
	 */
	supportedTypes?: NodeType[];
	description: string;
	category: NodeCategory;
	version: string;
	icon?: string;
	color?: string;
	inputs: NodePort[];
	outputs: NodePort[];
	configSchema?: ConfigSchema;
	tags?: string[];
}

/**
 * Common base interface for all schema properties
 */
export interface BaseProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer' | 'mixed' | 'float';
	description?: string;
	title?: string;
	default?: unknown;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	format?: string;
	items?: BaseProperty;
	properties?: Record<string, BaseProperty>;
	[key: string]: unknown; // Allow additional JSON Schema properties
}

/**
 * Common base interface for all schemas
 */
export interface BaseSchema {
	type: 'object';
	properties: Record<string, BaseProperty>;
	required?: string[];
	additionalProperties?: boolean;
}

/**
 * Configuration schema property with specific attributes
 */
export interface ConfigProperty extends BaseProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer';
	title?: string;
	description?: string;
	default?: unknown;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	format?: 'multiline' | string; // Special format for multiline text
	items?: ConfigProperty;
	properties?: Record<string, ConfigProperty>;
	[key: string]: unknown; // Allow additional JSON Schema properties
}

/**
 * Configuration schema interface
 */
export interface ConfigSchema extends BaseSchema {
	properties: Record<string, ConfigProperty>;
}

/**
 * Input schema property with specific attributes
 */
export interface InputProperty extends BaseProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer' | 'mixed';
	title?: string;
	description?: string;
	required?: boolean;
	default?: unknown;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	format?: 'multiline' | string;
	items?: InputProperty;
	properties?: Record<string, InputProperty>;
	[key: string]: unknown;
}

/**
 * Input schema interface
 */
export interface InputSchema extends BaseSchema {
	properties: Record<string, InputProperty>;
}

/**
 * Output schema property with specific attributes
 */
export interface OutputProperty extends BaseProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer' | 'mixed' | 'float';
	description: string; // Required for outputs
	title?: string;
	default?: unknown;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	format?: string;
	items?: OutputProperty;
	properties?: Record<string, OutputProperty>;
	[key: string]: unknown;
}

/**
 * Output schema interface
 */
export interface OutputSchema extends BaseSchema {
	properties: Record<string, OutputProperty>;
}

/**
 * Union type for all schema types
 */
export type Schema = ConfigSchema | InputSchema | OutputSchema;

/**
 * Union type for all property types
 */
export type Property = ConfigProperty | InputProperty | OutputProperty;

/**
 * Schema type discriminator
 */
export type SchemaType = 'config' | 'input' | 'output';

/**
 * Utility type to get the appropriate property type based on schema type
 */
export type SchemaProperty<T extends SchemaType> = T extends 'config'
	? ConfigProperty
	: T extends 'input'
		? InputProperty
		: T extends 'output'
			? OutputProperty
			: never;

/**
 * Utility type to get the appropriate schema type based on schema type
 */
export type SchemaTypeMap<T extends SchemaType> = T extends 'config'
	? ConfigSchema
	: T extends 'input'
		? InputSchema
		: T extends 'output'
			? OutputSchema
			: never;

/**
 * Node configuration values
 * Key-value pairs of user-entered configuration values
 */
export interface ConfigValues {
	[key: string]: unknown;
}

/**
 * Node configuration type (alias for backward compatibility)
 */
export type NodeConfig = ConfigValues;

/**
 * Extended node type for workflows
 */
export interface WorkflowNode extends Node {
	id: string;
	type: string;
	position: XYPosition;
	deletable?: boolean;
	data: {
		label: string;
		config: ConfigValues;
		metadata: NodeMetadata;
		isProcessing?: boolean;
		error?: string;
		nodeId?: string;
		/** Node execution tracking information */
		executionInfo?: NodeExecutionInfo;
	};
}

/**
 * Extended edge type for workflows
 */
export interface WorkflowEdge extends Edge {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
	type?: ConnectionLineType;
	selectable?: boolean;
	deletable?: boolean;
	data?: {
		label?: string;
		condition?: string;
		isToolConnection?: boolean;
		targetNodeType?: string;
		targetCategory?: string;
	};
}

/**
 * Complete workflow definition
 */
export interface Workflow {
	id: string;
	name: string;
	description?: string;
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	metadata?: {
		version: string;
		createdAt: string;
		updatedAt: string;
		author?: string;
		tags?: string[];
		versionId?: string;
		updateNumber?: number;
	};
}

/**
 * API response types
 */
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export type NodesResponse = ApiResponse<NodeMetadata[]>;
export type WorkflowResponse = ApiResponse<Workflow>;
export type WorkflowsResponse = ApiResponse<Workflow[]>;

/**
 * Node execution status enum
 */
export type NodeExecutionStatus =
	| 'idle'
	| 'pending'
	| 'running'
	| 'completed'
	| 'failed'
	| 'cancelled'
	| 'skipped';

/**
 * Node execution tracking information
 */
export interface NodeExecutionInfo {
	/** Current execution status */
	status: NodeExecutionStatus;
	/** Total number of times this node has been executed */
	executionCount: number;
	/** Last execution timestamp */
	lastExecuted?: string;
	/** Last execution duration in milliseconds */
	lastExecutionDuration?: number;
	/** Last error message if execution failed */
	lastError?: string;
	/** Whether the node is currently being executed */
	isExecuting: boolean;
}

/**
 * Workflow execution status
 */
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Workflow execution result
 */
export interface ExecutionResult {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	startTime: string;
	endTime?: string;
	results?: Record<string, unknown>;
	error?: string;
	logs?: string[];
}

/**
 * Library configuration
 */
export interface FlowDropConfig {
	endpointConfig?: EndpointConfig;
	theme?: 'light' | 'dark' | 'auto';
	enableDebug?: boolean;
	autoSave?: boolean;
	autoSaveInterval?: number;
	maxUndoSteps?: number;
	nodeSpacing?: number;
	gridSize?: number;
}

/**
 * Event types for the workflow editor
 */
export interface WorkflowEvents {
	nodeAdded: { node: WorkflowNode };
	nodeRemoved: { nodeId: string };
	nodeUpdated: { node: WorkflowNode };
	edgeAdded: { edge: WorkflowEdge };
	edgeRemoved: { edgeId: string };
	workflowSaved: { workflow: Workflow };
	workflowLoaded: { workflow: Workflow };
	executionStarted: { workflowId: string };
	executionCompleted: { result: ExecutionResult };
	executionFailed: { error: string };
}
