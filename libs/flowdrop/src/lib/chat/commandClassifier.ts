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
