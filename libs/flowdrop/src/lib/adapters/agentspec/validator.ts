/**
 * Agent Spec Validator
 *
 * Validates workflows against Agent Spec constraints for export,
 * and validates imported Agent Spec documents for correctness.
 */

import type {
  AgentSpecFlow,
  AgentSpecBranchingNode,
} from "../../types/agentspec.js";
import type { StandardWorkflow } from "../WorkflowAdapter.js";

/** Validation result */
export interface AgentSpecValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a FlowDrop StandardWorkflow for Agent Spec export compatibility.
 *
 * Checks:
 * - Must have exactly 1 start node (terminal/triggers)
 * - Must have at least 1 end node (terminal/outputs)
 * - Gateway nodes must have branches defined
 */
export function validateForAgentSpecExport(
  workflow: StandardWorkflow,
): AgentSpecValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (workflow.nodes.length === 0) {
    errors.push("Workflow has no nodes");
    return { valid: false, errors, warnings };
  }

  // Check for start nodes
  const startNodes = workflow.nodes.filter((n) => {
    const ext = n.data.metadata.extensions?.["agentspec:component_type"];
    if (ext === "start_node") return true;
    return (
      n.data.metadata.type === "terminal" &&
      n.data.metadata.category === "triggers"
    );
  });

  if (startNodes.length === 0) {
    errors.push(
      "Agent Spec requires exactly one StartNode. No start node found (terminal node with triggers category).",
    );
  } else if (startNodes.length > 1) {
    errors.push(
      `Agent Spec requires exactly one StartNode. Found ${startNodes.length}: ${startNodes.map((n) => n.id).join(", ")}`,
    );
  }

  // Check for end nodes
  const endNodes = workflow.nodes.filter((n) => {
    const ext = n.data.metadata.extensions?.["agentspec:component_type"];
    if (ext === "end_node") return true;
    return (
      n.data.metadata.type === "terminal" &&
      n.data.metadata.category === "outputs"
    );
  });

  if (endNodes.length === 0) {
    errors.push(
      "Agent Spec requires at least one EndNode. No end node found (terminal node with outputs category).",
    );
  }

  // Check gateway nodes have branches
  const gatewayNodes = workflow.nodes.filter((n) => {
    const ext = n.data.metadata.extensions?.["agentspec:component_type"];
    return ext === "branching_node" || n.data.metadata.type === "gateway";
  });

  for (const gw of gatewayNodes) {
    const branches = gw.data.config?.branches;
    if (!branches || !Array.isArray(branches) || branches.length === 0) {
      warnings.push(
        `Gateway node "${gw.data.label || gw.id}" has no branches defined. Agent Spec BranchingNode requires at least one branch.`,
      );
    }
  }

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  for (const edge of workflow.edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }

  const disconnected = workflow.nodes.filter((n) => !connectedNodes.has(n.id));
  if (disconnected.length > 0) {
    warnings.push(
      `${disconnected.length} node(s) are not connected to any edges: ${disconnected.map((n) => n.data.label || n.id).join(", ")}`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an imported Agent Spec Flow document.
 *
 * Checks:
 * - Has a start_node reference that exists
 * - At least one end_node exists
 * - All edge references point to existing nodes
 * - BranchingNode has branches
 * - Data flow edges reference valid properties
 */
export function validateAgentSpecFlow(
  flow: AgentSpecFlow,
): AgentSpecValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!flow.nodes || flow.nodes.length === 0) {
    errors.push("Flow has no nodes");
    return { valid: false, errors, warnings };
  }

  // Build node name set
  const nodeNames = new Set(flow.nodes.map((n) => n.name));

  // Check start_node exists
  if (!flow.start_node) {
    errors.push("Flow is missing start_node reference");
  } else if (!nodeNames.has(flow.start_node)) {
    errors.push(`start_node "${flow.start_node}" does not match any node name`);
  }

  // Check start_node is actually a start_node type
  const startNode = flow.nodes.find((n) => n.name === flow.start_node);
  if (startNode && startNode.component_type !== "start_node") {
    warnings.push(
      `start_node "${flow.start_node}" has component_type "${startNode.component_type}" instead of "start_node"`,
    );
  }

  // Check for end nodes
  const endNodes = flow.nodes.filter((n) => n.component_type === "end_node");
  if (endNodes.length === 0) {
    warnings.push("Flow has no EndNode. Consider adding one for clarity.");
  }

  // Check for duplicate node names
  const nameCount = new Map<string, number>();
  for (const node of flow.nodes) {
    nameCount.set(node.name, (nameCount.get(node.name) || 0) + 1);
  }
  for (const [name, count] of nameCount) {
    if (count > 1) {
      errors.push(`Duplicate node name: "${name}" appears ${count} times`);
    }
  }

  // Validate control-flow edges
  for (const edge of flow.control_flow_connections) {
    if (!nodeNames.has(edge.from_node)) {
      errors.push(
        `Control flow edge "${edge.name}" references non-existent from_node "${edge.from_node}"`,
      );
    }
    if (!nodeNames.has(edge.to_node)) {
      errors.push(
        `Control flow edge "${edge.name}" references non-existent to_node "${edge.to_node}"`,
      );
    }

    // Validate from_branch references
    if (edge.from_branch) {
      const fromNode = flow.nodes.find((n) => n.name === edge.from_node);
      if (fromNode && fromNode.component_type === "branching_node") {
        const branchingNode = fromNode as AgentSpecBranchingNode;
        if (!branchingNode.branches?.some((b) => b.name === edge.from_branch)) {
          errors.push(
            `Control flow edge "${edge.name}" references branch "${edge.from_branch}" which doesn't exist on node "${edge.from_node}"`,
          );
        }
      }
    }
  }

  // Validate data-flow edges
  if (flow.data_flow_connections) {
    for (const edge of flow.data_flow_connections) {
      if (!nodeNames.has(edge.source_node)) {
        errors.push(
          `Data flow edge "${edge.name}" references non-existent source_node "${edge.source_node}"`,
        );
      }
      if (!nodeNames.has(edge.destination_node)) {
        errors.push(
          `Data flow edge "${edge.name}" references non-existent destination_node "${edge.destination_node}"`,
        );
      }

      // Check that output/input properties exist on the nodes
      const sourceNode = flow.nodes.find((n) => n.name === edge.source_node);
      if (sourceNode?.outputs) {
        const hasOutput = sourceNode.outputs.some(
          (o) => o.title === edge.source_output,
        );
        if (!hasOutput) {
          warnings.push(
            `Data flow edge "${edge.name}": source node "${edge.source_node}" has no output named "${edge.source_output}"`,
          );
        }
      }

      const destNode = flow.nodes.find((n) => n.name === edge.destination_node);
      if (destNode?.inputs) {
        const hasInput = destNode.inputs.some(
          (i) => i.title === edge.destination_input,
        );
        if (!hasInput) {
          warnings.push(
            `Data flow edge "${edge.name}": destination node "${edge.destination_node}" has no input named "${edge.destination_input}"`,
          );
        }
      }
    }
  }

  // Validate branching nodes have branches
  for (const node of flow.nodes) {
    if (node.component_type === "branching_node") {
      const bn = node as AgentSpecBranchingNode;
      if (!bn.branches || bn.branches.length === 0) {
        warnings.push(`BranchingNode "${node.name}" has no branches defined`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
