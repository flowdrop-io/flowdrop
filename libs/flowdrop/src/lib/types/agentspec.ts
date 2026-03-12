/**
 * Open Agent Specification (Agent Spec) TypeScript Types
 *
 * Type definitions mirroring Oracle's Open Agent Spec format.
 * Used for bidirectional conversion between FlowDrop and Agent Spec.
 *
 * @see https://github.com/oracle/agent-spec
 * @see https://oracle.github.io/agent-spec/
 */

// ============================================================================
// Component Types
// ============================================================================

/** Agent Spec node component_type discriminator values */
export type AgentSpecNodeComponentType =
  | "start_node"
  | "end_node"
  | "llm_node"
  | "api_node"
  | "agent_node"
  | "flow_node"
  | "map_node"
  | "branching_node"
  | "tool_node";

/** Agent Spec tool component_type discriminator values */
export type AgentSpecToolComponentType =
  | "server_tool"
  | "client_tool"
  | "remote_tool";

/** All Agent Spec component_type values */
export type AgentSpecComponentType =
  | "agent"
  | "flow"
  | AgentSpecNodeComponentType
  | AgentSpecToolComponentType
  | "llm_config";

// ============================================================================
// Properties (JSON Schema-based)
// ============================================================================

/**
 * Agent Spec Property — JSON Schema-based input/output definition.
 *
 * Uses JSON Schema types and structure for describing data shape.
 * Placeholder syntax `{{variable_name}}` generates implicit input properties.
 */
export interface AgentSpecProperty {
  /** Property name (used as identifier in edges and templates) */
  title: string;
  /** JSON Schema type */
  type: string;
  /** Human-readable description */
  description?: string;
  /** Default value */
  default?: unknown;
  /** Allowed values (JSON Schema enum) */
  enum?: unknown[];
  /** Array item schema */
  items?: AgentSpecProperty;
  /** Object property schemas */
  properties?: Record<string, AgentSpecProperty>;
  /** Required properties (for object types) */
  required?: string[];
  /** Additional JSON Schema fields */
  [key: string]: unknown;
}

// ============================================================================
// Nodes
// ============================================================================

/** Base interface for all Agent Spec nodes */
export interface AgentSpecNodeBase {
  /** Discriminator for node type */
  component_type: AgentSpecNodeComponentType;
  /** Node name (used as identifier in edges) */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Input properties */
  inputs?: AgentSpecProperty[];
  /** Output properties */
  outputs?: AgentSpecProperty[];
  /** Extension metadata (includes FlowDrop-specific data for round-trip) */
  metadata?: Record<string, unknown>;
}

/** Graph entry point */
export interface AgentSpecStartNode extends AgentSpecNodeBase {
  component_type: "start_node";
}

/** Graph exit point */
export interface AgentSpecEndNode extends AgentSpecNodeBase {
  component_type: "end_node";
}

/** LLM text generation node */
export interface AgentSpecLLMNode extends AgentSpecNodeBase {
  component_type: "llm_node";
  /** LLM configuration (inline or $component_ref string) */
  llm_config?: AgentSpecLLMConfig | string;
  /** System prompt template (supports {{variable}} syntax) */
  system_prompt?: string;
  /** User prompt template (supports {{variable}} syntax) */
  prompt_template?: string;
  /** Output JSON Schema for structured output */
  output_schema?: Record<string, unknown>;
}

/** API call node */
export interface AgentSpecAPINode extends AgentSpecNodeBase {
  component_type: "api_node";
  /** API endpoint URL */
  endpoint?: string;
  /** HTTP method */
  method?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body template */
  body?: Record<string, unknown>;
}

/** Multi-round agent conversation node */
export interface AgentSpecAgentNode extends AgentSpecNodeBase {
  component_type: "agent_node";
  /** Agent reference ($component_ref or inline) */
  agent?: AgentSpecAgent | string;
}

/** Nested flow execution node */
export interface AgentSpecFlowNode extends AgentSpecNodeBase {
  component_type: "flow_node";
  /** Flow reference ($component_ref or inline) */
  flow?: AgentSpecFlow | string;
}

/** Map-reduce operation node */
export interface AgentSpecMapNode extends AgentSpecNodeBase {
  component_type: "map_node";
  /** Input collection property name */
  input_collection?: string;
  /** Output collection property name */
  output_collection?: string;
  /** Flow or node to execute per item ($component_ref or inline) */
  map_flow?: AgentSpecFlow | string;
}

/** Conditional routing node */
export interface AgentSpecBranchingNode extends AgentSpecNodeBase {
  component_type: "branching_node";
  /** Branch definitions with conditions */
  branches: AgentSpecBranch[];
}

/** Tool execution node */
export interface AgentSpecToolNode extends AgentSpecNodeBase {
  component_type: "tool_node";
  /** Tool reference ($component_ref or inline) */
  tool?: AgentSpecTool | string;
}

/** Union of all Agent Spec node types */
export type AgentSpecNode =
  | AgentSpecStartNode
  | AgentSpecEndNode
  | AgentSpecLLMNode
  | AgentSpecAPINode
  | AgentSpecAgentNode
  | AgentSpecFlowNode
  | AgentSpecMapNode
  | AgentSpecBranchingNode
  | AgentSpecToolNode;

// ============================================================================
// Branches
// ============================================================================

/** Branch definition for BranchingNode */
export interface AgentSpecBranch {
  /** Branch name (used as from_branch in ControlFlowEdge) */
  name: string;
  /** Condition expression for this branch */
  condition?: string;
  /** Human-readable description */
  description?: string;
}

// ============================================================================
// Edges
// ============================================================================

/**
 * Control Flow Edge — defines execution order between nodes.
 *
 * Multiple control flow connections from the same branch are prohibited.
 */
export interface AgentSpecControlFlowEdge {
  /** Edge name (identifier) */
  name: string;
  /** Source node name */
  from_node: string;
  /** Target node name */
  to_node: string;
  /** Source branch name (null/undefined = default "next" branch) */
  from_branch?: string | null;
}

/**
 * Data Flow Edge — routes data between node outputs and inputs.
 *
 * Maps a specific output property of a source node to a specific
 * input property of a destination node.
 */
export interface AgentSpecDataFlowEdge {
  /** Edge name (identifier) */
  name: string;
  /** Source node name */
  source_node: string;
  /** Source output property title */
  source_output: string;
  /** Destination node name */
  destination_node: string;
  /** Destination input property title */
  destination_input: string;
}

// ============================================================================
// Flow
// ============================================================================

/**
 * Agent Spec Flow — a directed, potentially cyclic graph of nodes.
 *
 * Flows function as "subroutines" encapsulating repeatable processes.
 * They separate control-flow (execution order) from data-flow (data routing).
 */
export interface AgentSpecFlow {
  component_type: "flow";
  /** Flow name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Reference to the StartNode name */
  start_node: string;
  /** All nodes in the flow */
  nodes: AgentSpecNode[];
  /** Execution order edges */
  control_flow_connections: AgentSpecControlFlowEdge[];
  /**
   * Data routing edges.
   * When null, data flows by matching input/output property names
   * across connected nodes (name-based variable access).
   */
  data_flow_connections?: AgentSpecDataFlowEdge[] | null;
  /** Extension metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tools
// ============================================================================

/** Base interface for Agent Spec tools */
export interface AgentSpecToolBase {
  component_type: AgentSpecToolComponentType;
  /** Tool name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Input parameters */
  inputs?: AgentSpecProperty[];
  /** Output parameters */
  outputs?: AgentSpecProperty[];
  /** Extension metadata */
  metadata?: Record<string, unknown>;
}

/** Tool executed in the same runtime environment */
export interface AgentSpecServerTool extends AgentSpecToolBase {
  component_type: "server_tool";
  /** Function name or module path */
  function_name?: string;
}

/** Tool executed by the client, results returned to runtime */
export interface AgentSpecClientTool extends AgentSpecToolBase {
  component_type: "client_tool";
}

/** Tool triggered via RPC/REST calls */
export interface AgentSpecRemoteTool extends AgentSpecToolBase {
  component_type: "remote_tool";
  /** Remote endpoint URL */
  endpoint?: string;
  /** HTTP method */
  method?: string;
  /** Request headers */
  headers?: Record<string, string>;
}

/** Union of all Agent Spec tool types */
export type AgentSpecTool =
  | AgentSpecServerTool
  | AgentSpecClientTool
  | AgentSpecRemoteTool;

// ============================================================================
// LLM Configuration
// ============================================================================

/** LLM model configuration */
export interface AgentSpecLLMConfig {
  component_type: "llm_config";
  /** Configuration name */
  name: string;
  /** Model identifier (e.g., "gpt-4o", "claude-sonnet-4-5-20250929") */
  model_id: string;
  /** Provider name (e.g., "openai", "anthropic") */
  provider?: string;
  /** API endpoint URL */
  url?: string;
  /** Generation parameters (temperature, max_tokens, etc.) */
  parameters?: Record<string, unknown>;
  /** Extension metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Agent
// ============================================================================

/**
 * Agent Spec Agent — top-level conversational AI system.
 *
 * Serves as the entry point and holds shared resources like
 * tools, memory, and LLM configuration.
 */
export interface AgentSpecAgent {
  component_type: "agent";
  /** Agent name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Agent inputs */
  inputs?: AgentSpecProperty[];
  /** Agent outputs */
  outputs?: AgentSpecProperty[];
  /** Available tools (inline or $component_ref strings) */
  tools?: (AgentSpecTool | string)[];
  /** LLM configuration (inline or $component_ref string) */
  llm_config?: AgentSpecLLMConfig | string;
  /** System prompt template */
  system_prompt?: string;
  /** Extension metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Document (Top-Level Container)
// ============================================================================

/**
 * Top-level Agent Spec document.
 *
 * Contains a flow and/or agent definition along with shared
 * tool and LLM configuration declarations.
 */
export interface AgentSpecDocument {
  /** Agent definition */
  agent?: AgentSpecAgent;
  /** Flow definition */
  flow?: AgentSpecFlow;
  /** Shared tool declarations */
  tools?: AgentSpecTool[];
  /** Shared LLM configurations */
  llm_configs?: AgentSpecLLMConfig[];
  /** Document-level metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Component Reference
// ============================================================================

/** Prefix for component references in Agent Spec */
export const COMPONENT_REF_PREFIX = "$component_ref:";

/**
 * Check if a value is a component reference string.
 *
 * @example
 * ```typescript
 * isComponentRef("$component_ref:my_tool") // true
 * isComponentRef("just a string") // false
 * ```
 */
export function isComponentRef(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(COMPONENT_REF_PREFIX);
}

/**
 * Extract the component ID from a component reference string.
 *
 * @example
 * ```typescript
 * extractComponentRefId("$component_ref:my_tool") // "my_tool"
 * ```
 */
export function extractComponentRefId(ref: string): string {
  return ref.slice(COMPONENT_REF_PREFIX.length);
}

/**
 * Create a component reference string.
 *
 * @example
 * ```typescript
 * createComponentRef("my_tool") // "$component_ref:my_tool"
 * ```
 */
export function createComponentRef(componentId: string): string {
  return `${COMPONENT_REF_PREFIX}${componentId}`;
}
