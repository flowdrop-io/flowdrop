/**
 * Which content the right-hand inspector shows.
 *
 * The inspector follows the selection: a node opened for configuration wins,
 * because it is the more specific thing the person pointed at. With no node,
 * the workflow's own tabs (Settings | Interface | Playground) show when the
 * workflow-settings surface is open. With neither, there is no inspector.
 *
 * Neither mode rests on the workflow tabs: with nothing open there is no
 * inspector, and in Test mode that leaves the canvas the whole width (the
 * inspector there is a sheet over it, opened by a node or the Playground link).
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

/** The tabs of a node in the inspector. */
export type NodeInspectorTab = 'config' | 'lastRun';

/**
 * The tabs a node shows. Test mode has Config | Last run; Edit mode has no tab
 * strip at all (an empty list): Config is the only content, as it always was.
 */
export function nodeInspectorTabs(editorMode: 'edit' | 'test' = 'edit'): NodeInspectorTab[] {
  return editorMode === 'test' ? ['config', 'lastRun'] : [];
}

/**
 * The tab to show: the requested one if the mode offers it, else Config.
 * Leaving Test mode therefore lands on Config without losing the pick.
 */
export function resolveNodeTab(
  requested: NodeInspectorTab,
  editorMode: 'edit' | 'test' = 'edit'
): NodeInspectorTab {
  return nodeInspectorTabs(editorMode).includes(requested) ? requested : 'config';
}

/**
 * The tab a node opens on when it becomes the open node: Last run in Test mode
 * (the sheet is opened to see what the node did, ran or not), Config in Edit mode.
 */
export function openingNodeTab(editorMode: 'edit' | 'test' = 'edit'): NodeInspectorTab {
  return editorMode === 'test' ? 'lastRun' : 'config';
}
