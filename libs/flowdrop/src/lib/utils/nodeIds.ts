/**
 * Shared node ID generation and config defaults utilities.
 * Used by both the visual editor and the workflow adapter to ensure
 * consistent behavior across all code paths.
 */

import type { ConfigSchema } from '../types/index.js';

/**
 * Minimal node shape required for ID generation.
 * Both WorkflowNode and StandardNode satisfy this interface.
 */
interface NodeWithMetadata {
  id: string;
  data?: { metadata?: { id?: string } };
}

/**
 * Generate a unique node ID based on node type and existing nodes.
 * Format: <node_type>.<number>
 * Example: boolean_gateway.1, calculator.2
 */
export function generateNodeId(nodeTypeId: string, existingNodes: NodeWithMetadata[]): string {
  // Count how many nodes of this type already exist
  const existingNodeIds = existingNodes
    .filter((node) => node.data?.metadata?.id === nodeTypeId)
    .map((node) => node.id);

  // Extract the numbers from existing IDs with the same prefix
  const existingNumbers = existingNodeIds
    .map((id) => {
      const match = id.match(new RegExp(`^${nodeTypeId}\\.(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => num > 0);

  // Find the next available number (highest + 1)
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  return `${nodeTypeId}.${nextNumber}`;
}

/**
 * Extract default config values from a node's configSchema.
 * Iterates configSchema.properties and returns an object with each property's
 * default value (if defined).
 */
export function extractConfigDefaults(configSchema?: ConfigSchema): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (!configSchema?.properties) return config;

  for (const [key, prop] of Object.entries(configSchema.properties)) {
    if (prop && typeof prop === 'object' && 'default' in prop) {
      config[key] = prop.default;
    }
  }

  return config;
}
