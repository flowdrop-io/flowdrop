/**
 * Core types for the Workflow Library
 */

import type { Node, Edge, Connection, XYPosition } from "@xyflow/svelte";
import { ConnectionLineType } from "@xyflow/svelte";

/**
 * Node category types for organizing nodes in the sidebar
 * Based on actual API response categories
 */
export type NodeCategory = 
  | "inputs"
  | "outputs"
  | "prompts"
  | "models"
  | "processing"
  | "logic"
  | "data"
  | "tools"
  | "helpers"
  | "vector stores"
  | "embeddings"
  | "memories"
  | "agents"
  | "bundles";

/**
 * Node input/output types
 */
export type NodeDataType = 
  // Text and basic types
  | "string"
  | "text"
  
  // Numeric types
  | "number"
  | "integer"
  | "float"
  
  // Boolean and logical types
  | "boolean"
  
  // Collection types
  | "array"
  | "list"
  
  // Complex types
  | "object"
  | "json"
  
  // File types
  | "file"
  | "document"
  
  // Media types
  | "image"
  | "picture"
  | "audio"
  | "sound"
  | "video"
  | "movie"
  
  // Special types
  | "url"
  | "email"
  | "date"
  | "datetime"
  | "time";

/**
 * Node port configuration
 */
export interface NodePort {
  id: string;
  name: string;
  type: "input" | "output";
  dataType: NodeDataType;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
}

/**
 * Node configuration metadata
 */
export interface NodeMetadata {
  id: string;
  name: string;
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
 * JSON Schema for node configuration
 * Defines the structure and validation rules for node configuration
 */
export interface ConfigSchema {
  type: "object";
  properties: Record<string, ConfigProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Individual property definition in config schema
 */
export interface ConfigProperty {
  type: "string" | "number" | "boolean" | "array" | "object" | "integer";
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: ConfigProperty;
  properties?: Record<string, ConfigProperty>;
  [key: string]: unknown; // Allow additional JSON Schema properties
}

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

export interface NodesResponse extends ApiResponse<NodeMetadata[]> {}
export interface WorkflowResponse extends ApiResponse<Workflow> {}
export interface WorkflowsResponse extends ApiResponse<Workflow[]> {}

/**
 * Workflow execution status
 */
export type ExecutionStatus = 
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

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
  apiBaseUrl: string;
  theme?: "light" | "dark" | "auto";
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