/**
 * Store Integration Bridge
 *
 * Bridges the command system to the live Svelte stores.
 * This is the only Svelte-coupled file in commands/.
 */

import { getDefaultInstance, type FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import { buildTypeMap, type CommandContext, type CommandDispatch, type UIAction } from './types.js';
import type { NodeMetadata } from '../types/index.js';

/**
 * Creates a CommandContext that bridges the command system to the live Svelte stores.
 *
 * @param nodeTypes - Available node type definitions
 * @param onUIAction - Optional callback for UI-side actions (open config panel, select node)
 * @param instance - The FlowDrop instance to operate on; defaults to the
 *   page-default instance when omitted
 * @returns CommandContext connected to live stores, or null if no workflow is loaded
 */
export function createStoreCommandContext(
  nodeTypes: NodeMetadata[],
  onUIAction?: (action: UIAction) => void,
  instance?: FlowDropInstance
): CommandContext | null {
  const fd = instance ?? getDefaultInstance();
  const readWorkflow = () => fd.workflow.current;
  const actions = fd.workflow.actions;
  const history = fd.history;

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
      // Flush a pending edit session into a committed step before undoing it.
      actions.finalizeNodeConfig();
      const previousState = history.undo();
      if (previousState) {
        actions.restoreFromHistory(previousState);
        return true;
      }
      return false;
    },

    redo: () => {
      actions.finalizeNodeConfig();
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

    // Commit the transaction's post-change (current) state so one undo reverts
    // the whole batch and redo restores its result (issue #39).
    commitTransaction: () => {
      const currentWorkflow = readWorkflow();
      if (currentWorkflow) {
        history.commitTransaction(currentWorkflow);
      }
    },
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
