/**
 * Node type utilities for FlowDrop
 * Handles dynamic node type resolution based on NodeMetadata.
 *
 * This module provides utilities for:
 * - Resolving which node type to use based on metadata and config
 * - Getting available node types for a given metadata
 * - Creating config schema properties for node type selection
 *
 * Works with both built-in types and custom registered types.
 */

import type { NodeType, NodeMetadata } from "../types/index.js";
import { nodeComponentRegistry } from "../registry/nodeComponentRegistry.js";
import {
  resolveBuiltinAlias,
  isBuiltinType,
} from "../registry/builtinNodes.js";

/**
 * Display names for built-in node types.
 */
const TYPE_DISPLAY_NAMES: Record<NodeType, string> = {
  note: "Note (sticky note style)",
  simple: "Simple (compact layout)",
  square: "Square (geometric layout)",
  tool: "Tool (specialized for agent tools)",
  gateway: "Gateway (branching control flow)",
  terminal: "Terminal (start/end/exit)",
  default: "Default (standard workflow node)",
};

/**
 * Gets the SvelteFlow component name for a given NodeType.
 * Uses the node component registry to resolve types.
 *
 * @param nodeType - The node type identifier
 * @returns The component name to use
 */
export function getComponentNameForNodeType(
  nodeType: NodeType | string,
): string {
  // Resolve aliases first (e.g., "default" -> "workflowNode")
  const resolvedType = resolveBuiltinAlias(nodeType);

  // Check if it's registered in the registry
  if (nodeComponentRegistry.has(resolvedType)) {
    return resolvedType;
  }

  // Unknown type - return workflowNode as default
  return "workflowNode";
}

/**
 * Gets the available node types for a given NodeMetadata.
 * Priority: supportedTypes > type > "default"
 *
 * @param metadata - The node metadata
 * @returns Array of available node type identifiers
 */
export function getAvailableNodeTypes(
  metadata: NodeMetadata,
): (NodeType | string)[] {
  if (metadata.supportedTypes && metadata.supportedTypes.length > 0) {
    return metadata.supportedTypes;
  }

  if (metadata.type) {
    return [metadata.type];
  }

  return ["default"];
}

/**
 * Gets the primary (default) node type for a given NodeMetadata.
 * This is used when no specific type is configured by the user.
 *
 * @param metadata - The node metadata
 * @returns The primary node type
 */
export function getPrimaryNodeType(metadata: NodeMetadata): NodeType | string {
  const availableTypes = getAvailableNodeTypes(metadata);
  return availableTypes[0];
}

/**
 * Determines the appropriate node type based on configuration and metadata.
 *
 * Priority:
 * 1. configNodeType (if valid for this metadata)
 * 2. metadata.type (if valid)
 * 3. First supportedType
 * 4. "default"
 *
 * @param metadata - The node metadata
 * @param configNodeType - Optional type from user config
 * @returns The resolved node type
 */
export function resolveNodeType(
  metadata: NodeMetadata,
  configNodeType?: string,
): NodeType | string {
  const availableTypes = getAvailableNodeTypes(metadata);

  // Check if configNodeType is valid for this metadata
  if (configNodeType) {
    // Resolve alias for comparison
    const resolvedConfig = resolveBuiltinAlias(configNodeType);

    // Check if it's in available types
    if (
      availableTypes.includes(configNodeType as NodeType) ||
      availableTypes.includes(resolvedConfig as NodeType)
    ) {
      return configNodeType;
    }

    // Check if it's a registered custom type
    if (
      nodeComponentRegistry.has(configNodeType) ||
      nodeComponentRegistry.has(resolvedConfig)
    ) {
      return configNodeType;
    }
  }

  // Fall back to primary type
  return getPrimaryNodeType(metadata);
}

/**
 * Gets the SvelteFlow component name for resolved node type.
 * This is the main function used by UniversalNode to determine which component to render.
 *
 * @param metadata - The node metadata
 * @param configNodeType - Optional type from user config
 * @returns The component name to use
 */
export function resolveComponentName(
  metadata: NodeMetadata,
  configNodeType?: string,
): string {
  const nodeType = resolveNodeType(metadata, configNodeType);
  return getComponentNameForNodeType(nodeType);
}

/**
 * Validates if a node type is supported by the given metadata.
 *
 * @param metadata - The node metadata
 * @param nodeType - The type to check
 * @returns true if the type is supported
 */
export function isNodeTypeSupported(
  metadata: NodeMetadata,
  nodeType: NodeType | string,
): boolean {
  const availableTypes = getAvailableNodeTypes(metadata);

  // Check direct match
  if (availableTypes.includes(nodeType as NodeType)) {
    return true;
  }

  // Check alias match
  const resolvedType = resolveBuiltinAlias(nodeType);
  if (availableTypes.includes(resolvedType as NodeType)) {
    return true;
  }

  // Check if it's a registered custom type that's in the available list
  if (nodeComponentRegistry.has(nodeType)) {
    return availableTypes.some(
      (t) => t === nodeType || resolveBuiltinAlias(t) === nodeType,
    );
  }

  return false;
}

/**
 * Gets oneOf options for node type configuration.
 * Used in config schemas to show available options with labels.
 *
 * This function combines:
 * - Types specified in metadata.supportedTypes
 * - Registered custom types (optionally filtered)
 *
 * @param metadata - The node metadata
 * @param includeCustomTypes - Whether to include registered custom types
 * @returns Array of oneOf items with const (type value) and title (display name)
 */
export function getNodeTypeOneOfOptions(
  metadata: NodeMetadata,
  includeCustomTypes = false,
): Array<{ const: string; title: string }> {
  const availableTypes = getAvailableNodeTypes(metadata);
  const options: Array<{ const: string; title: string }> = [];
  const includedTypes = new Set<string>();

  for (const type of availableTypes) {
    includedTypes.add(type);

    // Get display name from registry or fallback to built-in names
    const registration = nodeComponentRegistry.get(type);
    let title: string;
    if (registration) {
      title = registration.displayName;
    } else if (type in TYPE_DISPLAY_NAMES) {
      title = TYPE_DISPLAY_NAMES[type as NodeType];
    } else {
      // Format unknown type nicely
      title = formatTypeName(type);
    }

    options.push({ const: type, title });
  }

  // Optionally include all registered custom types
  if (includeCustomTypes) {
    const registrations = nodeComponentRegistry.filter({
      predicate: (reg) =>
        !isBuiltinType(reg.type) && !includedTypes.has(reg.type),
    });

    for (const reg of registrations) {
      options.push({ const: reg.type, title: reg.displayName });
    }
  }

  return options;
}

/**
 * Creates a nodeType config property that respects supportedTypes.
 * This replaces hardcoded enum values in config schemas.
 *
 * Uses JSON Schema `oneOf` pattern with `const`/`title` for labeled options,
 * which is the standard approach supported by form components.
 *
 * @param metadata - The node metadata
 * @param defaultType - Optional default type override
 * @returns Config schema property object with oneOf for labeled options
 */
export function createNodeTypeConfigProperty(
  metadata: NodeMetadata,
  defaultType?: NodeType | string,
) {
  const oneOf = getNodeTypeOneOfOptions(metadata);
  const primaryType = defaultType ?? getPrimaryNodeType(metadata);

  return {
    type: "string" as const,
    title: "Node Type",
    description: "Choose the visual representation for this node",
    default: primaryType,
    oneOf,
  };
}

/**
 * Check if a type string represents a valid registered or built-in type.
 *
 * @param type - The type to check
 * @returns true if the type is valid
 */
export function isValidNodeType(type: string): boolean {
  return isBuiltinType(type) || nodeComponentRegistry.has(type);
}

/**
 * Get all available node types (built-in + registered).
 *
 * @returns Array of all valid node type identifiers
 */
export function getAllNodeTypes(): string[] {
  return nodeComponentRegistry.getTypes();
}

/**
 * Format a type name for display when no display name is registered.
 *
 * @param type - The raw type string
 * @returns Formatted display name
 */
function formatTypeName(type: string): string {
  // Handle namespaced types (e.g., "mylib:fancy" -> "Mylib: Fancy")
  if (type.includes(":")) {
    const [namespace, name] = type.split(":");
    return `${capitalize(namespace)}: ${capitalize(name)}`;
  }

  // Capitalize and add spaces for camelCase
  return capitalize(type.replace(/([A-Z])/g, " $1").trim());
}

/**
 * Capitalize the first letter of a string.
 *
 * @param str - The string to capitalize
 * @returns Capitalized string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
