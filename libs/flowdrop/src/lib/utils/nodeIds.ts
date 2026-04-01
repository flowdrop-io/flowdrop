/**
 * Shared node ID generation utility.
 * Used by both the visual editor and the workflow adapter to ensure
 * consistent ID generation across all code paths.
 */

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
export function generateNodeId(
  nodeTypeId: string,
  existingNodes: NodeWithMetadata[],
): string {
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
  const nextNumber =
    existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  return `${nodeTypeId}.${nextNumber}`;
}
