/**
 * Node layout: the graph sweep.
 *
 * A graph layout is an order plus the primitives, run the usual layered-graph way: every card
 * into its column, the hard rules fixed, then forward and backward passes of `ports` and `align`
 * until a pass changes nothing. Each step is one accepted proposal, so the log reads like the
 * `layout node beautify` output. Pure: the input graph is never mutated.
 *
 * Annotations are fixed obstacles (D8): never in the node order, never the one that yields, and
 * the final translation leaves them where they are.
 *
 * @module layout/sweep
 */

import { better, formatChange, measure, score, type LayoutMetrics } from './measure.js';
import { columnRanks, propose, type LayoutProposal } from './primitives.js';
import type { LayoutCard, LayoutGraph, LayoutOptions } from './types.js';

/** `ports` + `align` passes at most. */
const MAX_PASSES = 4;

export interface SweepPhase {
  /** 0 column, 1 hard rules, 2 ports and align, 3 translate back. */
  phase: 0 | 1 | 2 | 3;
  title: string;
  /** The accepted proposals of the phase, in order. */
  steps: LayoutProposal[];
  /** Other lines worth printing: why a phase stopped, or why the translation was skipped. */
  notes: string[];
}

export interface SweepResult {
  /** Accepted proposals only, in order (the translation of phase 3 is `translation`). */
  steps: LayoutProposal[];
  /** Only the phases where something happened. */
  phases: SweepPhase[];
  /** Phase 3: every card moved by this much, back to the original top-left. */
  translation?: { dx: number; dy: number };
  /** True when anything moved or was reordered. */
  accepted: boolean;
  before: LayoutMetrics;
  after: LayoutMetrics;
  /** The graph after every step and the translation. */
  graph: LayoutGraph;
}

const PHASE_TITLES = [
  'phase 0: flow left to right (column, in column order)',
  'phase 1: hard rules (the lower card of each pair yields)',
  'phase 2: ports and align, alternating sweeps',
  'phase 3: back to the original top-left'
] as const;

/** The top-left corner of the cards (annotations do not count). */
function topLeft(graph: LayoutGraph): { x: number; y: number } {
  const cards = graph.cards.filter((c) => c.kind === 'card');
  return {
    x: Math.min(...cards.map((c) => c.x)),
    y: Math.min(...cards.map((c) => c.y))
  };
}

/** The graph with every card (not annotation) moved by the same amount. */
function translate(graph: LayoutGraph, dx: number, dy: number): LayoutGraph {
  return {
    ...graph,
    cards: graph.cards.map((c) => (c.kind === 'card' ? { ...c, x: c.x + dx, y: c.y + dy } : c))
  };
}

/** The card of a conflicting pair that yields: the lower one, never an annotation. */
function yielding(graph: LayoutGraph, ids: string[]): LayoutCard | undefined {
  const byId = new Map(graph.cards.map((c) => [c.id, c]));
  return ids
    .map((id) => byId.get(id))
    .filter((c): c is LayoutCard => c?.kind === 'card')
    .sort((a, b) => b.y - a.y || b.x - a.x)[0];
}

/** Run the sweep over a graph. */
export function sweep(graph: LayoutGraph, options: LayoutOptions): SweepResult {
  const before = measure(graph, options);
  const cards = graph.cards.filter((c) => c.kind === 'card');
  const phases: SweepPhase[] = [0, 1, 2, 3].map((phase) => ({
    phase: phase as SweepPhase['phase'],
    title: PHASE_TITLES[phase],
    steps: [],
    notes: []
  }));
  let current = graph;

  const run = (
    phase: SweepPhase,
    id: string,
    primitive: 'column' | 'ports' | 'align' | 'clear'
  ) => {
    const step = propose(current, id, primitive, options);
    if (step.accepted) {
      current = step.graph;
      phase.steps.push(step);
    }
    return step;
  };

  // Phase 0: every card into its column, in column order.
  const ranks = columnRanks(graph);
  const byColumn = [...cards].sort(
    (a, b) => (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0) || a.y - b.y || a.x - b.x
  );
  for (const card of byColumn) run(phases[0], card.id, 'column');

  // Phase 1: in each overlapping or too-close pair the lower card yields. Stops when `clear`
  // refuses; the bound keeps a pair that trades places from looping.
  for (let guard = 0; guard < 2 * cards.length; guard++) {
    const conflict = measure(current, options).conflicts[0];
    if (!conflict) break;
    // A lane conflict names the card only (`with` is a wire id).
    const ids = conflict.kind === 'lane' ? [conflict.card] : [conflict.card, conflict.with];
    const lower = yielding(current, ids);
    if (!lower) break;
    const step = run(phases[1], lower.id, 'clear');
    if (!step.accepted) {
      phases[1].notes.push(`${lower.id}: clear: no change; ${step.reason}`);
      break;
    }
  }

  // Phase 2: soft rules. Forward by x, then backward; the score keeps phase 1 intact.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const ids = current.cards
      .filter((c) => c.kind === 'card')
      .sort((a, b) => a.x - b.x || a.y - b.y)
      .map((c) => c.id);
    if (pass % 2) ids.reverse();
    let changed = false;
    for (const id of ids) {
      for (const primitive of ['ports', 'align'] as const) {
        if (run(phases[2], id, primitive).accepted) changed = true;
      }
    }
    if (!changed) break;
  }

  // Phase 3: moving every card by the same amount keeps wires and crossings, so put the graph
  // back at its original top-left. Annotations stay, so skip it when that would score worse.
  let translation: SweepResult['translation'];
  if (cards.length > 0) {
    const was = topLeft(graph);
    const now = topLeft(current);
    const dx = was.x - now.x;
    const dy = was.y - now.y;
    if (dx || dy) {
      const moved = translate(current, dx, dy);
      const stay = score(measure(current, options));
      const go = score(measure(moved, options));
      if (better(stay, go)) {
        phases[3].notes.push(
          `not moved back to the original top-left (${dx >= 0 ? '+' : ''}${dx}, ${dy >= 0 ? '+' : ''}${dy}): it would score worse against the notes`
        );
      } else {
        current = moved;
        translation = { dx, dy };
      }
    }
  }

  const steps = phases.flatMap((p) => p.steps);
  const accepted = steps.length > 0 || translation !== undefined;
  return {
    steps,
    phases: phases.filter(
      (p) => p.steps.length || p.notes.length || (p.phase === 3 && translation)
    ),
    ...(translation ? { translation } : {}),
    accepted,
    before,
    after: accepted ? measure(current, options) : before,
    graph: current
  };
}

/**
 * Console lines: a header per phase where something happened, one line per accepted step, then
 * the score before and after. A dry run says what would happen.
 */
export function formatSweep(result: SweepResult, dryRun = false): string[] {
  if (!result.accepted) {
    return [
      `sweep: no change; the layout is as good as the primitives can make it`,
      `  ${formatChange(result.before, result.after)}`
    ];
  }
  const lines: string[] = [];
  for (const phase of result.phases) {
    lines.push(`# ${phase.title}`);
    for (const step of phase.steps) {
      const text = dryRun
        ? step.message.startsWith('moved ')
          ? `would move ${step.message.slice('moved '.length)}`
          : `would change: ${step.message}`
        : step.message;
      lines.push(`${step.nodeId}: ${text}`);
    }
    if (phase.phase === 3 && result.translation) {
      const { dx, dy } = result.translation;
      lines.push(
        `  ${dryRun ? 'would move' : 'moved'} every card by ${dx >= 0 ? '+' : ''}${dx}, ${dy >= 0 ? '+' : ''}${dy}`
      );
    }
    for (const note of phase.notes) lines.push(`  ${note}`);
  }
  lines.push(`${dryRun ? 'would give' : 'sweep'}: ${formatChange(result.before, result.after)}`);
  return lines;
}
