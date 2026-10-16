/**
 * Host-handled external editing (`onExternalEdit`).
 *
 * Calls the host's handler for a node's external edit link and, when the host
 * resolves with a config, writes it into the node as one undo step.
 *
 * @module utils/externalEdit
 */

import type { ConfigValues, ExternalEditLink, Workflow, WorkflowNode } from '../types/index.js';
import { logger } from './logger.js';

/** The slice of the workflow store this needs. */
export interface ExternalEditStore {
  readonly current: Workflow | null;
  updateNodeConfig(nodeId: string, updates: Partial<WorkflowNode>): void;
  finalizeNodeConfig(): void;
}

export interface RunExternalEditOptions {
  node: WorkflowNode;
  link: ExternalEditLink;
  /** The host's `onExternalEdit` handler. */
  handler: (node: WorkflowNode, link: ExternalEditLink) => Promise<ConfigValues | void>;
  store: ExternalEditStore;
  /**
   * False when the editor is read-only or locked: the handler is still called
   * (the link is shown there), but its result is not written.
   */
  canWrite?: boolean;
  /** Called after a config was written, e.g. to refresh the canvas. */
  onWritten?: (node: WorkflowNode) => void;
}

/**
 * Run the host handler and apply its result.
 *
 * - A config replaces the node's config (not merged): one undo step, workflow dirty.
 * - Nothing resolved: the node is left as it is.
 * - A rejection is logged and swallowed.
 * - A node deleted while the host form was open: the result is dropped.
 */
export async function runExternalEdit(options: RunExternalEditOptions): Promise<void> {
  const { node, link, handler, store, canWrite = true, onWritten } = options;

  let result: ConfigValues | void;
  try {
    result = await handler(node, link);
  } catch (error) {
    logger.warn('onExternalEdit rejected; node left unchanged:', error);
    return;
  }
  if (!result || typeof result !== 'object') return;

  if (!canWrite) {
    logger.debug('onExternalEdit result ignored: the editor is not in edit mode');
    return;
  }

  const current = store.current?.nodes.find((n) => n.id === node.id);
  if (!current) {
    logger.debug(`onExternalEdit result dropped: node ${node.id} no longer exists`);
    return;
  }

  // Close any open field-editing session first so this is a step of its own.
  store.finalizeNodeConfig();
  store.updateNodeConfig(node.id, { data: { ...current.data, config: result } });
  store.finalizeNodeConfig();
  onWritten?.(current);
}
