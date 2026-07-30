/**
 * Command Classifier for LLM Chat Interface
 *
 * Determines whether a DSL command is read-only or mutating,
 * so the UI knows which commands can auto-execute and which
 * need user approval.
 *
 * @module chat/commandClassifier
 */

/** Commands that only read workflow state without modifying it */
const READ_ONLY_COMMANDS = new Set([
  'list_nodes',
  'list_edges',
  'list_types',
  'info',
  'get_config',
  'help'
]);

/**
 * Determine whether a DSL command type is mutating (modifies workflow state).
 *
 * Read-only commands (list_nodes, list_edges, list_types, info, get_config, help)
 * return false. All other commands are considered mutating and return true.
 *
 * @param commandType - The command type string (e.g., "add", "list_nodes")
 * @returns true if the command modifies workflow state, false if read-only
 */
export function isMutatingCommand(commandType: string): boolean {
  return !READ_ONLY_COMMANDS.has(commandType);
}

/**
 * Commands that rewrite the position of *existing* nodes.
 *
 * Viewport commands (`canvas fitview`, zoom, pan) are deliberately absent —
 * they only move the camera and leave the stored arrangement intact.
 */
const LAYOUT_COMMANDS = new Set(['auto_layout', 'beautify_layout']);

/**
 * Determine whether a DSL command type re-arranges existing node positions.
 *
 * Used by the AI panel to honour the `chatAllowLayoutChanges` behaviour setting:
 * when layout changes are disallowed, these commands are skipped instead of
 * executed so a hand-crafted layout survives an assistant batch (issue #36).
 *
 * @param commandType - The command type string (e.g., "beautify_layout")
 * @returns true if the command repositions existing nodes
 */
export function isLayoutCommand(commandType: string): boolean {
  return LAYOUT_COMMANDS.has(commandType);
}
