/**
 * Accessible name for a canvas node. It goes on xyflow's focusable node
 * wrapper (`Node.ariaLabel`), the only element that is focusable and carries a
 * role; the visual node components inside stay unnamed.
 */

import type { Messages } from '../messages/types.js';

/**
 * @param graph - The `nodes.graph` branch of the active messages
 * @param componentName - Resolved node component name (e.g. `gatewayNode`)
 * @param title - The node's display title
 */
export function nodeAriaLabel(
  graph: Messages['nodes']['graph'],
  componentName: string,
  title: string
): string {
  if (componentName === 'gatewayNode') return graph.gatewayNode({ title });
  if (componentName === 'ideaNode') return graph.ideaNode({ title });
  return graph.workflowNode({ name: title });
}
