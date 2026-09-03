/**
 * Run a callback once an instance has a workflow.
 *
 * `fd.workflow.current` is `null` between `createFlowDropInstance()` and the
 * editor's `initialize()`, which the `App` component runs on mount. Anything
 * that wants the workflow's identity at set-up time — the WebMCP adapter puts
 * the workflow's name in every tool description — waits here for it.
 *
 * Fires at once when the workflow is already known. Returns a cancel function
 * for the case where the caller goes away first; after the callback has run
 * the watcher has already disposed itself and cancel is a no-op.
 *
 * @module utils/whenWorkflowLoaded
 */

import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import type { Workflow } from '../types/index.js';

export function whenWorkflowLoaded(
  instance: FlowDropInstance,
  callback: (workflow: Workflow) => void
): () => void {
  const now = instance.workflow.current;
  if (now) {
    callback(now);
    return () => {};
  }
  let done = false;
  const dispose = $effect.root(() => {
    $effect(() => {
      const workflow = instance.workflow.current;
      if (!workflow || done) return;
      done = true;
      // Leave the effect before running user code, and dispose the root after
      // it — disposing from inside the effect that is running is undefined.
      queueMicrotask(() => {
        dispose();
        callback(workflow);
      });
    });
  });
  return () => {
    if (done) return;
    done = true;
    dispose();
  };
}
