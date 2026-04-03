/**
 * Store Integration Bridge
 *
 * Bridges the command system to the live Svelte stores.
 * This is the only Svelte-coupled file in commands/.
 */

import {
  getWorkflowStore,
  workflowActions,
} from "../stores/workflowStore.svelte.js";
import { historyService } from "../services/historyService.js";
import {
  buildTypeMap,
  type CommandContext,
  type CommandDispatch,
  type UIAction,
} from "./types.js";
import type { NodeMetadata } from "../types/index.js";

/**
 * Creates a CommandContext that bridges the command system to the live Svelte stores.
 *
 * @param nodeTypes - Available node type definitions
 * @param onUIAction - Optional callback for UI-side actions (open config panel, select node)
 * @returns CommandContext connected to live stores, or null if no workflow is loaded
 */
export function createStoreCommandContext(
  nodeTypes: NodeMetadata[],
  onUIAction?: (action: UIAction) => void,
): CommandContext | null {
  const workflow = getWorkflowStore();
  if (!workflow) {
    return null;
  }

  const dispatch: CommandDispatch = {
    addNode: (node) => workflowActions.addNode(node),
    removeNode: (nodeId) => workflowActions.removeNode(nodeId),
    updateNode: (nodeId, updates) =>
      workflowActions.updateNode(nodeId, updates),
    addEdge: (edge) => workflowActions.addEdge(edge),
    removeEdge: (edgeId) => workflowActions.removeEdge(edgeId),
    batchUpdate: (updates) => workflowActions.batchUpdate(updates),

    undo: () => {
      const previousState = historyService.undo();
      if (previousState) {
        workflowActions.restoreFromHistory(previousState);
        return true;
      }
      return false;
    },

    redo: () => {
      const nextState = historyService.redo();
      if (nextState) {
        workflowActions.restoreFromHistory(nextState);
        return true;
      }
      return false;
    },

    startTransaction: (description) => {
      const currentWorkflow = getWorkflowStore();
      if (currentWorkflow) {
        historyService.startTransaction(currentWorkflow, description);
      }
    },

    commitTransaction: () => historyService.commitTransaction(),
    cancelTransaction: () => {
      const snapshot = historyService.cancelTransaction();
      if (snapshot) {
        workflowActions.restoreFromHistory(snapshot);
      }
    },

    emitUIAction: onUIAction,

    swapNode: (updates) => workflowActions.swapNode(updates),
  };

  return {
    getWorkflow: () => getWorkflowStore(),
    nodeTypes,
    typeMap: buildTypeMap(nodeTypes),
    dispatch,
  };
}
