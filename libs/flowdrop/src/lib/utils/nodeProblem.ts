import { getContext, setContext } from 'svelte';

/**
 * The Doctor's findings on one node, shared by UniversalNode (which knows them)
 * with the node component (which draws them in its header). `claimed` is set by
 * a node that renders a NodeProblemMark itself; UniversalNode draws a fallback
 * mark in the node's corner for the types that do not (Idea, Caption, ...).
 */
export interface NodeProblem {
  /** Worst severity on the node, or null when it has no problems. */
  readonly severity: 'error' | 'warning' | 'info' | null;
  /** Accessible name, e.g. "Error: 2 problems". */
  readonly label: string;
  /** Tooltip: the label, then one line per problem. */
  readonly tooltip: string;
  /** Whether the node component draws the mark itself. */
  claimed: boolean;
}

const KEY = Symbol('fd-node-problem');

export function provideNodeProblem(problem: NodeProblem): void {
  setContext(KEY, problem);
}

/** The node's problems, or undefined outside a UniversalNode (stories, tests). */
export function getNodeProblem(): NodeProblem | undefined {
  return getContext<NodeProblem | undefined>(KEY);
}
