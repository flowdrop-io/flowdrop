/**
 * Edge Styling Utility
 *
 * Standalone functions for determining edge categories and applying
 * visual styling to workflow edges based on source port data types.
 * Used by both the visual editor and the command DSL system.
 */

import { MarkerType } from "@xyflow/svelte";
import type {
  WorkflowNode as WorkflowNodeType,
  WorkflowEdge,
  EdgeCategory,
} from "../types/index.js";
import { extractPortId } from "../utils/handleIds.js";
import { isLoopbackEdge } from "../utils/connections.js";
import { EDGE_MARKER_SIZES } from "../config/constants.js";

/**
 * Check if a port ID matches a dynamic branch in a Gateway node.
 * Gateway nodes store branches in config.branches array.
 */
export function isGatewayBranch(
  node: WorkflowNodeType,
  portId: string,
): boolean {
  const nodeType = node.data?.metadata?.type || node.type;
  if (nodeType !== "gateway") {
    return false;
  }

  const branches = node.data?.config?.branches as
    | Array<{ name: string }>
    | undefined;
  if (!branches || !Array.isArray(branches)) {
    return false;
  }

  return branches.some((branch) => branch.name === portId);
}

/**
 * Get the data type of a port from a node's metadata.
 * Also handles dynamic ports like Gateway branches.
 */
export function getPortDataType(
  node: WorkflowNodeType,
  portId: string,
  portType: "input" | "output",
): string | null {
  // First, check static ports in metadata
  const ports =
    portType === "output"
      ? node.data?.metadata?.outputs
      : node.data?.metadata?.inputs;

  if (ports && Array.isArray(ports)) {
    const port = ports.find((p) => p.id === portId);
    if (port?.dataType) {
      return port.dataType;
    }
  }

  // Check dynamic ports from config (dynamicInputs/dynamicOutputs)
  const dynamicKey =
    portType === "output" ? "dynamicOutputs" : "dynamicInputs";
  const dynamicPorts = node.data?.config?.[dynamicKey] as
    | Array<{ name: string; dataType: string }>
    | undefined;
  if (dynamicPorts && Array.isArray(dynamicPorts)) {
    const dynamicPort = dynamicPorts.find((p) => p.name === portId);
    if (dynamicPort?.dataType) {
      return dynamicPort.dataType;
    }
  }

  // For output ports, also check dynamic Gateway branches
  // Gateway branches are always trigger type (control flow)
  if (portType === "output" && isGatewayBranch(node, portId)) {
    return "trigger";
  }

  return null;
}

/**
 * Determine the edge category based on source port data type.
 * Note: This does not check for loopback edges — use getEdgeCategoryWithLoopback() for that.
 */
export function getEdgeCategory(
  sourcePortDataType: string | null,
): EdgeCategory {
  if (sourcePortDataType === "trigger") {
    return "trigger";
  }

  if (sourcePortDataType === "tool") {
    return "tool";
  }

  return "data";
}

/**
 * Determine the full edge category including loopback detection.
 * Loopback edges take precedence over source port data type.
 */
export function getEdgeCategoryWithLoopback(
  edge: WorkflowEdge,
  sourcePortDataType: string | null,
): EdgeCategory {
  if (isLoopbackEdge(edge)) {
    return "loopback";
  }

  return getEdgeCategory(sourcePortDataType);
}

/**
 * Apply custom styling to a connection edge based on its source/target nodes.
 *
 * Sets:
 * - edge.data.metadata.edgeType (trigger/tool/loopback/data)
 * - edge.style, edge.class, edge.markerEnd based on category
 * - edge.data.targetNodeType and edge.data.targetCategory
 */
export function applyConnectionStyling(
  edge: WorkflowEdge,
  sourceNode: WorkflowNodeType,
  targetNode: WorkflowNodeType,
): void {
  // Extract port ID from sourceHandle
  const sourcePortId = extractPortId(edge.sourceHandle);

  // Get the source port's data type
  const sourcePortDataType = sourcePortId
    ? getPortDataType(sourceNode, sourcePortId, "output")
    : null;

  // Determine edge category (loopback takes precedence)
  const edgeCategory = getEdgeCategoryWithLoopback(edge, sourcePortDataType);

  // Apply styling based on edge category
  // Marker colors use CSS custom properties so they respond to theme changes automatically
  switch (edgeCategory) {
    case "loopback":
      edge.style =
        "stroke: var(--fd-edge-loopback); stroke-dasharray: var(--fd-edge-loopback-dasharray); stroke-width: var(--fd-edge-loopback-width); opacity: var(--fd-edge-loopback-opacity);";
      edge.class = "flowdrop--edge--loopback";
      edge.markerEnd = {
        type: MarkerType.ArrowClosed,
        ...EDGE_MARKER_SIZES.loopback,
        color: "var(--fd-edge-loopback)",
      };
      break;

    case "trigger":
      edge.style =
        "stroke: var(--fd-edge-trigger); stroke-width: var(--fd-edge-trigger-width);";
      edge.class = "flowdrop--edge--trigger";
      edge.markerEnd = {
        type: MarkerType.ArrowClosed,
        ...EDGE_MARKER_SIZES.trigger,
        color: "var(--fd-edge-trigger)",
      };
      break;

    case "tool":
      edge.style = "stroke: var(--fd-edge-tool); stroke-dasharray: 5 3;";
      edge.class = "flowdrop--edge--tool";
      edge.markerEnd = {
        type: MarkerType.ArrowClosed,
        ...EDGE_MARKER_SIZES.tool,
        color: "var(--fd-edge-tool)",
      };
      break;

    case "data":
    default:
      edge.style = "stroke: var(--fd-edge-data);";
      edge.class = "flowdrop--edge--data";
      edge.markerEnd = {
        type: MarkerType.ArrowClosed,
        ...EDGE_MARKER_SIZES.data,
        color: "var(--fd-edge-data)",
      };
      break;
  }

  // Store metadata in edge data for API and persistence
  edge.data = {
    ...edge.data,
    metadata: {
      ...((edge.data?.metadata as Record<string, unknown>) || {}),
      edgeType: edgeCategory,
      sourcePortDataType: sourcePortDataType ?? undefined,
    },
    targetNodeType: targetNode.type,
    targetCategory: targetNode.data.metadata.category,
  };
}

/**
 * Update existing edges with custom styling rules.
 * Batch operation that applies styling to all edges using a node map for O(1) lookup.
 */
export function updateEdgeStyles(
  edges: WorkflowEdge[],
  nodes: WorkflowNodeType[],
): WorkflowEdge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    const updatedEdge = { ...edge };

    if (!sourceNode || !targetNode) {
      updatedEdge.data = {
        ...updatedEdge.data,
        metadata: {
          ...((updatedEdge.data?.metadata as Record<string, unknown>) || {}),
          edgeType: "data" as EdgeCategory,
        },
      };
      return updatedEdge;
    }

    applyConnectionStyling(updatedEdge, sourceNode, targetNode);

    return updatedEdge;
  });
}
