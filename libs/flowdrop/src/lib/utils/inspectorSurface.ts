/**
 * Which content the right-hand inspector shows.
 *
 * The inspector follows the selection: a node opened for configuration wins,
 * because it is the more specific thing the person pointed at. With no node,
 * the workflow's own tabs (Settings | Interface | Playground) show when the
 * workflow-settings surface is open. With neither, there is no inspector.
 *
 * In Test mode the inspector is always there: with no node open it rests on
 * the workflow tabs, so the Playground tab and the interface are one click
 * away while a run is being watched. Edit mode keeps its inspector-on-demand,
 * so at rest the editor looks as it always has.
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
  /** The editor's mode. Default `edit`. */
  editorMode?: 'edit' | 'test';
}

export function resolveInspectorSurface(selection: InspectorSelection): InspectorSurface {
  if (selection.hasNode) return 'node';
  if (selection.workflowOpen || selection.editorMode === 'test') return 'workflow';
  return null;
}

/**
 * What the inspector's close control dismisses. A node closes first and the
 * inspector falls back to the workflow tabs if they are open; closing the
 * workflow tabs closes the surface. In Test mode the workflow tabs are the
 * resting state and cannot be closed, so the control is not offered for them.
 */
export function closeTarget(
  surface: InspectorSurface,
  editorMode: 'edit' | 'test' = 'edit'
): 'node' | 'workflow' | null {
  if (surface === 'workflow' && editorMode === 'test') return null;
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
 * if the node ran in the shown run (that is what one is looking for), else Config.
 */
export function openingNodeTab(
  editorMode: 'edit' | 'test' = 'edit',
  nodeHasRun = false
): NodeInspectorTab {
  return editorMode === 'test' && nodeHasRun ? 'lastRun' : 'config';
}
