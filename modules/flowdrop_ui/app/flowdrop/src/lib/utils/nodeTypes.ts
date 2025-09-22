/**
 * Node type utilities for FlowDrop
 * Handles dynamic node type resolution based on NodeMetadata
 */

import type { NodeType, NodeMetadata } from "../types/index.js";

/**
 * Maps NodeType to SvelteFlow component names
 */
const NODE_TYPE_TO_COMPONENT_MAP: Record<NodeType, string> = {
  "note": "note",
  "simple": "simple",
  "square": "square", 
  "tool": "tool",
  "default": "workflowNode"
};

/**
 * Gets the SvelteFlow component name for a given NodeType
 */
export function getComponentNameForNodeType(nodeType: NodeType): string {
  return NODE_TYPE_TO_COMPONENT_MAP[nodeType] || "workflowNode";
}

/**
 * Gets the available node types for a given NodeMetadata
 * Priority: supportedTypes > type > "default"
 */
export function getAvailableNodeTypes(metadata: NodeMetadata): NodeType[] {
  if (metadata.supportedTypes && metadata.supportedTypes.length > 0) {
    return metadata.supportedTypes;
  }
  
  if (metadata.type) {
    return [metadata.type];
  }
  
  return ["default"];
}

/**
 * Gets the primary (default) node type for a given NodeMetadata
 * This is used when no specific type is configured by the user
 */
export function getPrimaryNodeType(metadata: NodeMetadata): NodeType {
  const availableTypes = getAvailableNodeTypes(metadata);
  return availableTypes[0];
}

/**
 * Determines the appropriate node type based on configuration and metadata
 * Priority: 
 * 1. configNodeType (if valid for this metadata)
 * 2. metadata.type (if valid)
 * 3. First supportedType
 * 4. "default"
 */
export function resolveNodeType(
  metadata: NodeMetadata, 
  configNodeType?: string
): NodeType {
  const availableTypes = getAvailableNodeTypes(metadata);
  
  // Check if configNodeType is valid for this metadata
  if (configNodeType && availableTypes.includes(configNodeType as NodeType)) {
    return configNodeType as NodeType;
  }
  
  // Fall back to primary type
  return getPrimaryNodeType(metadata);
}

/**
 * Gets the SvelteFlow component name for resolved node type
 * This replaces the old mapNodeType function
 */
export function resolveComponentName(
  metadata: NodeMetadata,
  configNodeType?: string
): string {
  const nodeType = resolveNodeType(metadata, configNodeType);
  return getComponentNameForNodeType(nodeType);
}

/**
 * Validates if a node type is supported by the given metadata
 */
export function isNodeTypeSupported(metadata: NodeMetadata, nodeType: NodeType): boolean {
  const availableTypes = getAvailableNodeTypes(metadata);
  return availableTypes.includes(nodeType);
}

/**
 * Gets enum options for node type configuration
 * Used in config schemas to show available options
 */
export function getNodeTypeEnumOptions(metadata: NodeMetadata): {
  enum: string[];
  enumNames: string[];
} {
  const availableTypes = getAvailableNodeTypes(metadata);
  
  const typeDisplayNames: Record<NodeType, string> = {
    "note": "Note (sticky note style)",
    "simple": "Simple (compact layout)",
    "tool": "Tool (specialized for agent tools)",
    "default": "Default (standard workflow node)"
  };
  
  return {
    enum: availableTypes,
    enumNames: availableTypes.map(type => typeDisplayNames[type] || type)
  };
}

/**
 * Creates a nodeType config property that respects supportedTypes
 * This replaces hardcoded enum values in config schemas
 */
export function createNodeTypeConfigProperty(metadata: NodeMetadata, defaultType?: NodeType) {
  const { enum: enumValues, enumNames } = getNodeTypeEnumOptions(metadata);
  const primaryType = defaultType || getPrimaryNodeType(metadata);
  
  return {
    type: "string" as const,
    title: "Node Type",
    description: "Choose the visual representation for this node",
    default: primaryType,
    enum: enumValues,
    enumNames
  };
}
