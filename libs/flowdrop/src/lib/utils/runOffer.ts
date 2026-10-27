/**
 * Whether the editor offers a Run button in Edit mode.
 *
 * @module utils/runOffer
 */

export interface RunOfferState {
  /** `features.runButton` (default on). */
  runButton: boolean | undefined;
  /** The canvas is editable (`mode: 'edit'`). */
  canvasEditable: boolean;
  /** A run-history view of one pipeline, not the editor's workflow. */
  pipelineId: string | undefined;
  /** The id of the saved workflow, if it has one. */
  workflowId: string | undefined;
  /** The host supplied an `onRun` hook. */
  hostCanRun: boolean;
  /** The backend exposes the `workflows.run` endpoint. */
  backendCanRun: boolean;
}

/** True when a Run button makes sense: editable, saved, and something can start the run. */
export function canOfferRun(state: RunOfferState): boolean {
  return (
    state.runButton !== false &&
    state.canvasEditable &&
    !state.pipelineId &&
    !!state.workflowId &&
    (state.hostCanRun || state.backendCanRun)
  );
}
