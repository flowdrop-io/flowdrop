/**
 * Agent Spec Adapter — Bidirectional conversion between FlowDrop and Agent Spec
 *
 * Converts between FlowDrop's StandardWorkflow format and Oracle's Open Agent Spec
 * JSON format. Handles the key structural differences:
 * - Unified edges (FlowDrop) ↔ control-flow + data-flow edges (Agent Spec)
 * - Node IDs (FlowDrop) ↔ node names (Agent Spec)
 * - Visual positions (FlowDrop) ↔ no positions (Agent Spec)
 *
 * @see https://github.com/oracle/agent-spec
 */

import type {
  AgentSpecFlow,
  AgentSpecNode,
  AgentSpecNodeComponentType,
  AgentSpecProperty,
  AgentSpecControlFlowEdge,
  AgentSpecDataFlowEdge,
  AgentSpecBranch,
  AgentSpecBranchingNode,
  AgentSpecLLMNode,
  AgentSpecAPINode,
  AgentSpecAgentNode,
  AgentSpecFlowNode,
  AgentSpecMapNode,
  AgentSpecToolNode,
} from "../../types/agentspec.js";

import type {
  StandardWorkflow,
  StandardNode,
  StandardEdge,
} from "../WorkflowAdapter.js";
import type { NodePort, NodeMetadata, Branch } from "../../types/index.js";

import {
  getComponentTypeDefaults,
  extractComponentType,
  AGENTSPEC_NAMESPACE,
} from "./componentTypeDefaults.js";

import { computeAutoLayout } from "./autoLayout.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger.js";

import {
  buildHandleId,
  extractPortId,
  extractDirection,
} from "../../utils/handleIds.js";

// ============================================================================
// Property ↔ Port Conversion
// ============================================================================

/**
 * Convert an Agent Spec Property to a FlowDrop NodePort.
 */
function agentSpecPropertyToNodePort(
  prop: AgentSpecProperty,
  portType: "input" | "output",
): NodePort {
  // Map JSON Schema types to FlowDrop data types
  let dataType: string;
  switch (prop.type) {
    case "string":
      dataType = "string";
      break;
    case "number":
    case "float":
      dataType = "number";
      break;
    case "integer":
      dataType = "number";
      break;
    case "boolean":
      dataType = "boolean";
      break;
    case "array":
      dataType = "array";
      break;
    case "object":
      dataType = "json";
      break;
    default:
      dataType = "mixed";
  }

  return {
    id: prop.title,
    name: prop.title,
    type: portType,
    dataType,
    required: false,
    description: prop.description,
  };
}

/**
 * Convert a FlowDrop NodePort to an Agent Spec Property.
 */
function nodePortToAgentSpecProperty(port: NodePort): AgentSpecProperty {
  // Map FlowDrop data types to JSON Schema types
  let type: string;
  switch (port.dataType) {
    case "string":
      type = "string";
      break;
    case "number":
    case "float":
      type = "number";
      break;
    case "integer":
      type = "integer";
      break;
    case "boolean":
      type = "boolean";
      break;
    case "array":
      type = "array";
      break;
    case "json":
    case "object":
      type = "object";
      break;
    default:
      type = "string";
  }

  const prop: AgentSpecProperty = {
    title: port.id,
    type,
  };

  if (port.description) prop.description = port.description;
  if (port.defaultValue !== undefined) prop.default = port.defaultValue;

  return prop;
}

// ============================================================================
// AgentSpecAdapter
// ============================================================================

export class AgentSpecAdapter {
  // ========================================================================
  // FlowDrop → Agent Spec (Export)
  // ========================================================================

  /**
   * Convert a FlowDrop StandardWorkflow to an Agent Spec Flow.
   *
   * Handles:
   * - Node conversion with config → node attributes
   * - Edge splitting into control-flow and data-flow
   * - Position preservation in metadata
   * - Gateway branch → from_branch mapping
   */
  toAgentSpec(workflow: StandardWorkflow): AgentSpecFlow {
    // Build node ID → name mapping
    // Agent Spec uses node names as references; FlowDrop uses structured IDs
    const nodeIdToName = new Map<string, string>();
    for (const node of workflow.nodes) {
      const name = this.resolveNodeName(node);
      nodeIdToName.set(node.id, name);
    }

    // Convert nodes
    const agentSpecNodes: AgentSpecNode[] = workflow.nodes.map((node) =>
      this.convertNodeToAgentSpec(node, nodeIdToName),
    );

    // Split edges into control-flow and data-flow
    const controlFlowEdges: AgentSpecControlFlowEdge[] = [];
    const dataFlowEdges: AgentSpecDataFlowEdge[] = [];

    for (const edge of workflow.edges) {
      const sourceNode = workflow.nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const sourcePortId = extractPortId(edge.sourceHandle);
      const sourcePortDataType = this.getSourcePortDataType(
        sourceNode,
        sourcePortId,
      );

      if (sourcePortDataType === "trigger") {
        controlFlowEdges.push(
          this.convertToControlFlowEdge(edge, sourceNode, nodeIdToName),
        );
      } else {
        dataFlowEdges.push(this.convertToDataFlowEdge(edge, nodeIdToName));
      }
    }

    // Find start node
    const startNodeName = this.findStartNodeName(agentSpecNodes, nodeIdToName);

    return {
      component_type: "flow",
      name: workflow.name,
      description: workflow.description,
      start_node: startNodeName,
      nodes: agentSpecNodes,
      control_flow_connections: controlFlowEdges,
      data_flow_connections: dataFlowEdges.length > 0 ? dataFlowEdges : null,
      metadata: {
        "flowdrop:workflow_id": workflow.id,
        "flowdrop:version": workflow.metadata?.version,
        ...(workflow.metadata?.author
          ? { "flowdrop:author": workflow.metadata.author }
          : {}),
        ...(workflow.metadata?.tags
          ? { "flowdrop:tags": workflow.metadata.tags }
          : {}),
      },
    };
  }

  /**
   * Export a FlowDrop StandardWorkflow as Agent Spec JSON string.
   */
  exportJSON(workflow: StandardWorkflow): string {
    return JSON.stringify(this.toAgentSpec(workflow), null, 2);
  }

  // ========================================================================
  // Agent Spec → FlowDrop (Import)
  // ========================================================================

  /**
   * Convert an Agent Spec Flow to a FlowDrop StandardWorkflow.
   *
   * Handles:
   * - Auto-layout (Agent Spec has no positions)
   * - Edge merging (control-flow + data-flow → unified edges)
   * - Node type mapping via registry
   * - Component type preservation in extensions
   */
  fromAgentSpec(agentSpecFlow: AgentSpecFlow): StandardWorkflow {
    // Compute positions for nodes
    const positions = computeAutoLayout(agentSpecFlow);

    // Build name → FlowDrop node ID mapping
    const nameToNodeId = new Map<string, string>();
    const nodeCountByType = new Map<string, number>();

    for (const asNode of agentSpecFlow.nodes) {
      const typeId = `${AGENTSPEC_NAMESPACE}.${asNode.component_type}`;
      const count = (nodeCountByType.get(typeId) || 0) + 1;
      nodeCountByType.set(typeId, count);
      const nodeId = `${typeId}.${count}`;
      nameToNodeId.set(asNode.name, nodeId);
    }

    // Convert nodes
    const nodes: StandardNode[] = agentSpecFlow.nodes.map((asNode) => {
      const nodeId = nameToNodeId.get(asNode.name)!;
      const position = positions.get(asNode.name) || { x: 0, y: 0 };
      return this.convertNodeFromAgentSpec(asNode, nodeId, position);
    });

    // Convert edges (merge control-flow + data-flow into unified edges)
    const edges: StandardEdge[] = [];

    // Control-flow edges → trigger port connections
    for (const cfEdge of agentSpecFlow.control_flow_connections) {
      const edge = this.convertFromControlFlowEdge(cfEdge, nameToNodeId, nodes);
      if (edge) edges.push(edge);
    }

    // Data-flow edges → data port connections
    if (agentSpecFlow.data_flow_connections) {
      for (const dfEdge of agentSpecFlow.data_flow_connections) {
        const edge = this.convertFromDataFlowEdge(dfEdge, nameToNodeId);
        if (edge) edges.push(edge);
      }
    }

    return {
      id:
        (agentSpecFlow.metadata?.["flowdrop:workflow_id"] as string) ||
        uuidv4(),
      name: agentSpecFlow.name,
      description: agentSpecFlow.description,
      nodes,
      edges,
      metadata: {
        version:
          (agentSpecFlow.metadata?.["flowdrop:version"] as string) || "1.0.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: agentSpecFlow.metadata?.["flowdrop:author"] as
          | string
          | undefined,
        tags: agentSpecFlow.metadata?.["flowdrop:tags"] as string[] | undefined,
      },
    };
  }

  /**
   * Import an Agent Spec flow from a JSON string.
   */
  importJSON(json: string): StandardWorkflow {
    const parsed = JSON.parse(json) as AgentSpecFlow;
    return this.fromAgentSpec(parsed);
  }

  // ========================================================================
  // Node Conversion (Private)
  // ========================================================================

  /**
   * Resolve a stable name for a FlowDrop node in Agent Spec.
   * Uses the node's config instanceTitle, label, or falls back to ID.
   */
  private resolveNodeName(node: StandardNode): string {
    const instanceTitle = node.data.config?.instanceTitle as string | undefined;
    if (instanceTitle) return instanceTitle;
    return node.data.label || node.id;
  }

  /**
   * Convert a FlowDrop StandardNode to an Agent Spec node.
   */
  private convertNodeToAgentSpec(
    node: StandardNode,
    nodeIdToName: Map<string, string>,
  ): AgentSpecNode {
    const componentType = this.resolveComponentType(node);
    const name = nodeIdToName.get(node.id) || node.id;

    // Convert data ports (skip trigger/tool ports — those are handled as edges)
    const dataInputs = node.data.metadata.inputs
      .filter((p) => p.dataType !== "trigger" && p.dataType !== "tool")
      .map((p) => nodePortToAgentSpecProperty(p));

    const dataOutputs = node.data.metadata.outputs
      .filter((p) => p.dataType !== "trigger" && p.dataType !== "tool")
      .map((p) => nodePortToAgentSpecProperty(p));

    // Build base node
    const base: AgentSpecNode = {
      component_type: componentType,
      name,
      description: node.data.metadata.description || undefined,
      inputs: dataInputs.length > 0 ? dataInputs : undefined,
      outputs: dataOutputs.length > 0 ? dataOutputs : undefined,
      metadata: {
        "flowdrop:position": node.position,
        "flowdrop:node_id": node.id,
        "flowdrop:node_type_id": node.data.metadata.id,
      },
    } as AgentSpecNode;

    // Add type-specific attributes from config
    return this.addNodeSpecificAttributes(base, node);
  }

  /**
   * Add Agent Spec type-specific attributes from FlowDrop config.
   */
  private addNodeSpecificAttributes(
    asNode: AgentSpecNode,
    fdNode: StandardNode,
  ): AgentSpecNode {
    const config = fdNode.data.config || {};

    switch (asNode.component_type) {
      case "llm_node": {
        const llmNode = asNode as AgentSpecLLMNode;
        if (config.prompt_template)
          llmNode.prompt_template = config.prompt_template as string;
        if (config.system_prompt)
          llmNode.system_prompt = config.system_prompt as string;
        if (config.llm_config_ref)
          llmNode.llm_config = config.llm_config_ref as string;
        return llmNode;
      }
      case "branching_node": {
        const branchNode = asNode as AgentSpecBranchingNode;
        const branches = config.branches as Branch[] | undefined;
        branchNode.branches = branches
          ? branches.map((b) => ({
              name: b.name,
              condition: b.condition || undefined,
              description: b.description || undefined,
            }))
          : [];
        return branchNode;
      }
      case "api_node": {
        const apiNode = asNode as AgentSpecAPINode;
        if (config.endpoint) apiNode.endpoint = config.endpoint as string;
        if (config.method) apiNode.method = config.method as string;
        if (config.headers) {
          try {
            apiNode.headers =
              typeof config.headers === "string"
                ? JSON.parse(config.headers)
                : (config.headers as Record<string, string>);
          } catch (error) {
            // Ignore parse errors
            logger.warn("Failed to parse header JSON", error);
          }
        }
        return apiNode;
      }
      case "agent_node": {
        const agentNode = asNode as AgentSpecAgentNode;
        if (config.agent_ref) agentNode.agent = config.agent_ref as string;
        return agentNode;
      }
      case "flow_node": {
        const flowNode = asNode as AgentSpecFlowNode;
        if (config.flow_ref) flowNode.flow = config.flow_ref as string;
        return flowNode;
      }
      case "map_node": {
        const mapNode = asNode as AgentSpecMapNode;
        if (config.input_collection)
          mapNode.input_collection = config.input_collection as string;
        if (config.output_collection)
          mapNode.output_collection = config.output_collection as string;
        if (config.map_flow_ref)
          mapNode.map_flow = config.map_flow_ref as string;
        return mapNode;
      }
      case "tool_node": {
        const toolNode = asNode as AgentSpecToolNode;
        if (config.tool_ref) toolNode.tool = config.tool_ref as string;
        return toolNode;
      }
      default:
        return asNode;
    }
  }

  /**
   * Resolve Agent Spec component type from a FlowDrop node.
   */
  private resolveComponentType(node: StandardNode): AgentSpecNodeComponentType {
    // Check extensions first (round-trip preservation)
    const ext = node.data.metadata.extensions?.["agentspec:component_type"];
    if (ext && typeof ext === "string") {
      return ext as AgentSpecNodeComponentType;
    }

    // Infer from FlowDrop node type ID
    const fromId = extractComponentType(node.data.metadata.id);
    if (fromId) return fromId as AgentSpecNodeComponentType;

    // Infer from FlowDrop visual type + category
    const nodeType = node.data.metadata.type;
    const category = node.data.metadata.category;

    if (nodeType === "terminal" && category === "triggers") return "start_node";
    if (nodeType === "terminal" && category === "outputs") return "end_node";
    if (nodeType === "gateway") return "branching_node";
    if (nodeType === "tool") return "tool_node";
    if (category === "ai" || category === "models") return "llm_node";
    if (category === "agents") return "agent_node";
    if (category === "data") return "api_node";

    // Default fallback
    return "llm_node";
  }

  /**
   * Convert an Agent Spec node to a FlowDrop StandardNode.
   *
   * Uses lightweight component type defaults for trigger ports and visual styling.
   * Does NOT depend on the full node type registry — works with any component_type,
   * including custom/unknown types (falls back to sensible defaults).
   */
  private convertNodeFromAgentSpec(
    asNode: AgentSpecNode,
    nodeId: string,
    position: { x: number; y: number },
  ): StandardNode {
    // Restore position from metadata if available (round-trip)
    const savedPosition = asNode.metadata?.["flowdrop:position"] as
      | { x: number; y: number }
      | undefined;
    const finalPosition = savedPosition || position;

    // Convert inputs/outputs to FlowDrop ports
    const dataInputs: NodePort[] = (asNode.inputs || []).map((p) =>
      agentSpecPropertyToNodePort(p, "input"),
    );
    const dataOutputs: NodePort[] = (asNode.outputs || []).map((p) =>
      agentSpecPropertyToNodePort(p, "output"),
    );

    // Use lightweight adapter defaults (never throws on unknown types)
    const defaults = getComponentTypeDefaults(asNode.component_type);
    const nodeTypeId =
      (asNode.metadata?.["flowdrop:node_type_id"] as string) ||
      `${AGENTSPEC_NAMESPACE}.${asNode.component_type}`;

    const metadata: NodeMetadata = {
      id: nodeTypeId,
      name: defaults.defaultName,
      type: defaults.visualType,
      description: asNode.description || defaults.defaultDescription,
      category: defaults.category as NodeMetadata["category"],
      version: "1.0.0",
      icon: defaults.icon,
      color: defaults.color,
      badge: defaults.badge,
      inputs: [...defaults.triggerInputs, ...dataInputs],
      outputs: [...defaults.triggerOutputs, ...dataOutputs],
      configSchema: { type: "object", properties: {} },
      formats: ["agentspec"],
      extensions: {
        "agentspec:component_type": asNode.component_type,
        "agentspec:original_name": asNode.name,
      },
    };

    // Build config from Agent Spec node-specific attributes
    const config = this.extractConfigFromAgentSpec(asNode);

    return {
      id: nodeId,
      type: nodeTypeId,
      position: finalPosition,
      data: {
        label: asNode.name,
        config,
        metadata,
      },
    };
  }

  /**
   * Extract FlowDrop config values from Agent Spec node-specific attributes.
   */
  private extractConfigFromAgentSpec(
    asNode: AgentSpecNode,
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    switch (asNode.component_type) {
      case "llm_node": {
        const llm = asNode as AgentSpecLLMNode;
        if (llm.prompt_template) config.prompt_template = llm.prompt_template;
        if (llm.system_prompt) config.system_prompt = llm.system_prompt;
        if (llm.llm_config) {
          config.llm_config_ref =
            typeof llm.llm_config === "string"
              ? llm.llm_config
              : llm.llm_config.name;
        }
        break;
      }
      case "branching_node": {
        const branch = asNode as AgentSpecBranchingNode;
        config.branches = branch.branches.map(
          (b: AgentSpecBranch) =>
            ({
              name: b.name,
              label: b.name,
              condition: b.condition || "",
              isDefault: !b.condition,
            }) satisfies Branch,
        );
        break;
      }
      case "api_node": {
        const api = asNode as AgentSpecAPINode;
        if (api.endpoint) config.endpoint = api.endpoint;
        if (api.method) config.method = api.method;
        if (api.headers) config.headers = JSON.stringify(api.headers, null, 2);
        break;
      }
      case "agent_node": {
        const agent = asNode as AgentSpecAgentNode;
        if (agent.agent) {
          config.agent_ref =
            typeof agent.agent === "string" ? agent.agent : agent.agent.name;
        }
        break;
      }
      case "flow_node": {
        const flow = asNode as AgentSpecFlowNode;
        if (flow.flow) {
          config.flow_ref =
            typeof flow.flow === "string" ? flow.flow : flow.flow.name;
        }
        break;
      }
      case "map_node": {
        const map = asNode as AgentSpecMapNode;
        if (map.input_collection)
          config.input_collection = map.input_collection;
        if (map.output_collection)
          config.output_collection = map.output_collection;
        if (map.map_flow) {
          config.map_flow_ref =
            typeof map.map_flow === "string" ? map.map_flow : map.map_flow.name;
        }
        break;
      }
      case "tool_node": {
        const tool = asNode as AgentSpecToolNode;
        if (tool.tool) {
          config.tool_ref =
            typeof tool.tool === "string" ? tool.tool : tool.tool.name;
        }
        break;
      }
    }

    return config;
  }

  // ========================================================================
  // Edge Conversion (Private)
  // ========================================================================

  /**
   * Get the data type of a source port from a FlowDrop node.
   */
  private getSourcePortDataType(
    node: StandardNode,
    portId: string | null,
  ): string | null {
    if (!portId) return null;

    // Check static output ports
    const port = node.data.metadata.outputs.find((p) => p.id === portId);
    if (port) return port.dataType;

    // Check if it's a gateway branch (always trigger)
    if (node.data.metadata.type === "gateway") {
      const branches = node.data.config?.branches as Branch[] | undefined;
      if (branches?.some((b) => b.name === portId)) {
        return "trigger";
      }
    }

    // Check dynamic outputs
    const dynamicOutputs = node.data.config?.dynamicOutputs as
      | Array<{ name: string; dataType: string }>
      | undefined;
    if (dynamicOutputs) {
      const dp = dynamicOutputs.find((p) => p.name === portId);
      if (dp) return dp.dataType;
    }

    return null;
  }

  /**
   * Convert a FlowDrop trigger edge to an Agent Spec ControlFlowEdge.
   */
  private convertToControlFlowEdge(
    edge: StandardEdge,
    sourceNode: StandardNode,
    nodeIdToName: Map<string, string>,
  ): AgentSpecControlFlowEdge {
    const fromNode = nodeIdToName.get(edge.source) || edge.source;
    const toNode = nodeIdToName.get(edge.target) || edge.target;
    const sourcePortId = extractPortId(edge.sourceHandle);

    // Determine from_branch for gateway nodes
    let fromBranch: string | undefined;
    if (sourceNode.data.metadata.type === "gateway" && sourcePortId) {
      const branches = sourceNode.data.config?.branches as Branch[] | undefined;
      if (branches?.some((b) => b.name === sourcePortId)) {
        fromBranch = sourcePortId;
      }
    }

    return {
      name: `${fromNode}_to_${toNode}${fromBranch ? `_${fromBranch}` : ""}`,
      from_node: fromNode,
      to_node: toNode,
      from_branch: fromBranch,
    };
  }

  /**
   * Convert a FlowDrop data edge to an Agent Spec DataFlowEdge.
   */
  private convertToDataFlowEdge(
    edge: StandardEdge,
    nodeIdToName: Map<string, string>,
  ): AgentSpecDataFlowEdge {
    const sourceNode = nodeIdToName.get(edge.source) || edge.source;
    const destNode = nodeIdToName.get(edge.target) || edge.target;
    const sourceOutput = extractPortId(edge.sourceHandle) || "output";
    const destInput = extractPortId(edge.targetHandle) || "input";

    return {
      name: `${sourceNode}_${sourceOutput}_to_${destNode}_${destInput}`,
      source_node: sourceNode,
      source_output: sourceOutput,
      destination_node: destNode,
      destination_input: destInput,
    };
  }

  /**
   * Convert an Agent Spec ControlFlowEdge to a FlowDrop edge.
   */
  private convertFromControlFlowEdge(
    cfEdge: AgentSpecControlFlowEdge,
    nameToNodeId: Map<string, string>,
    nodes: StandardNode[],
  ): StandardEdge | null {
    const sourceId = nameToNodeId.get(cfEdge.from_node);
    const targetId = nameToNodeId.get(cfEdge.to_node);
    if (!sourceId || !targetId) return null;

    // Determine source handle
    let sourcePortId = "trigger"; // default for non-branch control flow
    if (cfEdge.from_branch) {
      sourcePortId = cfEdge.from_branch;
    }

    return {
      id: uuidv4(),
      source: sourceId,
      target: targetId,
      sourceHandle: buildHandleId(sourceId, "output", sourcePortId),
      targetHandle: buildHandleId(targetId, "input", "trigger"),
    };
  }

  /**
   * Convert an Agent Spec DataFlowEdge to a FlowDrop edge.
   */
  private convertFromDataFlowEdge(
    dfEdge: AgentSpecDataFlowEdge,
    nameToNodeId: Map<string, string>,
  ): StandardEdge | null {
    const sourceId = nameToNodeId.get(dfEdge.source_node);
    const targetId = nameToNodeId.get(dfEdge.destination_node);
    if (!sourceId || !targetId) return null;

    return {
      id: uuidv4(),
      source: sourceId,
      target: targetId,
      sourceHandle: buildHandleId(sourceId, "output", dfEdge.source_output),
      targetHandle: buildHandleId(targetId, "input", dfEdge.destination_input),
    };
  }

  /**
   * Find the start node name from converted Agent Spec nodes.
   */
  private findStartNodeName(
    nodes: AgentSpecNode[],
    nodeIdToName: Map<string, string>,
  ): string {
    // Look for an explicit start_node
    const startNode = nodes.find((n) => n.component_type === "start_node");
    if (startNode) return startNode.name;

    // Fall back to the first node
    return nodes.length > 0 ? nodes[0].name : "start";
  }
}
