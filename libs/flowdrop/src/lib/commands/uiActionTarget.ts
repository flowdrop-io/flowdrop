/**
 * Where the mount API's `runCommand` sends a command's UI actions (select a
 * node, open its config panel, fit/zoom/pan the canvas).
 *
 * The editor shell (`App`) registers its handler for its instance while it is
 * mounted. Kept off `FlowDropInstance` on purpose: it is internal, not
 * exported from any entry point, so hosts cannot replace it.
 *
 * @module commands/uiActionTarget
 */

import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import type { UIAction } from './types.js';

type UIActionHandler = (action: UIAction) => void;

const targets = new WeakMap<FlowDropInstance, UIActionHandler>();

/**
 * Make `handler` the instance's UI-action target. The returned release only
 * clears it while `handler` is still the target, so a shell mounted later
 * keeps its own registration when an earlier one goes away.
 */
export function provideUIActionTarget(
  instance: FlowDropInstance,
  handler: UIActionHandler
): () => void {
  targets.set(instance, handler);
  return () => {
    if (targets.get(instance) === handler) targets.delete(instance);
  };
}

/** Hand `action` to the instance's target; dropped when there is none. */
export function dispatchUIAction(instance: FlowDropInstance, action: UIAction): void {
  targets.get(instance)?.(action);
}

/** Whether a shell has registered a target for the instance (for tests). */
export function hasUIActionTarget(instance: FlowDropInstance): boolean {
  return targets.has(instance);
}
