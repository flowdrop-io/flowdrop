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
  handler: (
    node: WorkflowNode,
    link: ExternalEditLink
  ) => ConfigValues | void | Promise<ConfigValues | void>;
  store: ExternalEditStore;
  /**
   * Whether the editor accepts the result, asked when the handler resolves
   * (the editor may have been locked while the host form was open). False
   * when read-only or locked: the handler is still called (the link is shown
   * there), but its result is not written. Defaults to writable.
   */
  canWrite?: () => boolean;
  /**
   * Ids of nodes whose host form is open. A node already in it is skipped
   * (the handler is not called again); the caller keeps the set alive.
   */
  pending?: Set<string>;
  /** Called with the node as written, e.g. to refresh the canvas. */
  onWritten?: (node: WorkflowNode) => void;
}

/**
 * Run the host handler and apply its result.
 *
 * - A config replaces the node's config (not merged): one undo step, workflow dirty.
 *   It is copied, so the host keeps no reference into the workflow.
 * - Anything but a plain object (an array, a string, ...) is logged and dropped.
 * - Nothing resolved: the node is left as it is.
 * - A rejection is logged and swallowed.
 * - A node deleted while the host form was open: the result is dropped.
 * - A node whose host form is already open (`pending`): nothing happens.
 */
export async function runExternalEdit(options: RunExternalEditOptions): Promise<void> {
  const { node, link, handler, store, canWrite, pending, onWritten } = options;

  if (pending?.has(node.id)) return;
  pending?.add(node.id);
  let result: ConfigValues | void;
  try {
    result = await handler(node, link);
  } catch (error) {
    logger.warn('onExternalEdit rejected; node left unchanged:', error);
    return;
  } finally {
    pending?.delete(node.id);
  }
  if (result === undefined || result === null) return;
  if (typeof result !== 'object' || Array.isArray(result)) {
    logger.warn(
      'onExternalEdit resolved with something other than a config object; ignored:',
      result
    );
    return;
  }

  if (canWrite && !canWrite()) {
    logger.warn('onExternalEdit result ignored: the editor is read-only or locked');
    return;
  }

  // A copy, so the host keeps no reference into the workflow (a Svelte host's
  // `$state` proxy included).
  const config = $state.snapshot(result) as ConfigValues;

  const current = store.current?.nodes.find((n) => n.id === node.id);
  if (!current) {
    logger.debug(`onExternalEdit result dropped: node ${node.id} no longer exists`);
    return;
  }

  // Close any open field-editing session first so this is a step of its own.
  store.finalizeNodeConfig();
  store.updateNodeConfig(node.id, { data: { ...current.data, config } });
  store.finalizeNodeConfig();
  const written = store.current?.nodes.find((n) => n.id === node.id);
  if (written) onWritten?.(written);
}
