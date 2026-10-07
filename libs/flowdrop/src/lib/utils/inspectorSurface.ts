/**
 * Which content the right-hand inspector shows.
 *
 * The inspector follows the selection: a node opened for configuration wins,
 * because it is the more specific thing the person pointed at. With no node,
 * the workflow's own tabs (Settings | Interface | Playground) show when the
 * workflow-settings surface is open. With neither, there is no inspector.
 *
 * Before this rule, the workflow surface won over a node: with workflow
 * settings open, double-clicking a node changed nothing the person could see.
 */

export type InspectorSurface = 'node' | 'workflow' | null;

export interface InspectorSelection {
  /** A node is open for configuration. */
  hasNode: boolean;
  /** The workflow-settings surface is open (navbar link). */
  workflowOpen: boolean;
}

export function resolveInspectorSurface(selection: InspectorSelection): InspectorSurface {
  if (selection.hasNode) return 'node';
  if (selection.workflowOpen) return 'workflow';
  return null;
}

/**
 * What the inspector's close control dismisses. A node closes first and the
 * inspector falls back to the workflow tabs if they are open; closing the
 * workflow tabs closes the surface.
 */
export function closeTarget(surface: InspectorSurface): 'node' | 'workflow' | null {
  return surface;
}
