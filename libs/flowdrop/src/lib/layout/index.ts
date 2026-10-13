/**
 * Node layout: the public API of the layout module (not yet in the package exports).
 *
 * @module layout
 */

export * from './types.js';
export { measure, score, better, conflictCards, formatMetrics, formatChange } from './measure.js';
export type { LayoutMetrics, LayoutScore, LayoutConflict, LayoutCrossing } from './measure.js';
export { fromWorkflow } from './fromWorkflow.js';
export type { FromWorkflowOptions, MeasuredCard } from './fromWorkflow.js';
export {
  propose,
  beautify,
  columnRanks,
  columnGrid,
  formatProposal,
  formatBeautify,
  STRATEGY_ORDER
} from './primitives.js';
export type {
  LayoutPrimitive,
  LayoutStrategy,
  LayoutProposal,
  LayoutChanges,
  BeautifyResult,
  PortOrderChange
} from './primitives.js';
export { inspect } from './inspect.js';
export { applyProposalToNodes, buildPortsConfig } from './toWorkflow.js';
export type { NodeLayoutUpdate } from './toWorkflow.js';
