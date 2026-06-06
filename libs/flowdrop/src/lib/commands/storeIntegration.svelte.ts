/**
 * Store Integration Bridge
 *
 * Bridges the command system to the live Svelte stores.
 * This is the only Svelte-coupled file in commands/.
 */

import { getWorkflowStore, workflowActions } from '../stores/workflowStore.svelte.js';
import { historyService } from '../services/historyService.js';
import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import { buildTypeMap, type CommandContext, type CommandDispatch, type UIAction } from './types.js';
import type { NodeMetadata } from '../types/index.js';

/**
 * Creates a CommandContext that bridges the command system to the live Svelte stores.
 *
 * @param nodeTypes - Available node type definitions
 * @param onUIAction - Optional callback for UI-side actions (open config panel, select node)
 * @param instance - The FlowDrop instance to operate on; falls back to the
 *   page-default instance when omitted (legacy behavior)
 * @returns CommandContext connected to live stores, or null if no workflow is loaded
 */
export function createStoreCommandContext(
  nodeTypes: NodeMetadata[],
  onUIAction?: (action: UIAction) => void,
  instance?: FlowDropInstance
): CommandContext | null {
  // Instance-aware accessors. Without an instance, route through the legacy
  // module shims (page-default instance) so existing callers — and tests that
  // mock the store modules — keep working unchanged.
  const readWorkflow = () => (instance ? instance.workflow.current : getWorkflowStore());
  const actions = instance ? instance.workflow.actions : workflowActions;
  const history = instance ? instance.history : historyService;

  const workflow = readWorkflow();
  if (!workflow) {
    return null;
  }

  const dispatch: CommandDispatch = {
    addNode: (node) => actions.addNode(node),
    removeNode: (nodeId) => actions.removeNode(nodeId),
    updateNode: (nodeId, updates) => actions.updateNode(nodeId, updates),
    addEdge: (edge) => actions.addEdge(edge),
    removeEdge: (edgeId) => actions.removeEdge(edgeId),
    batchUpdate: (updates) => actions.batchUpdate(updates),

    undo: () => {
      const previousState = history.undo();
      if (previousState) {
        actions.restoreFromHistory(previousState);
        return true;
      }
      return false;
    },

    redo: () => {
      const nextState = history.redo();
      if (nextState) {
        actions.restoreFromHistory(nextState);
        return true;
      }
      return false;
    },

    startTransaction: (description) => {
      const currentWorkflow = readWorkflow();
      if (currentWorkflow) {
        history.startTransaction(currentWorkflow, description);
      }
    },

    commitTransaction: () => history.commitTransaction(),
    cancelTransaction: () => {
      const snapshot = history.cancelTransaction();
      if (snapshot) {
        actions.restoreFromHistory(snapshot);
      }
    },

    emitUIAction: onUIAction,

    swapNode: (updates) => actions.swapNode(updates)
  };

  return {
    getWorkflow: () => readWorkflow(),
    nodeTypes,
    typeMap: buildTypeMap(nodeTypes),
    dispatch
  };
}
