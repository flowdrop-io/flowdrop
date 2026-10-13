/**
 * Node layout: the primitives.
 *
 * Each primitive looks at one node and proposes one change to the graph: the
 * next graph, what changed, the score before and after, and a one-line message.
 * Nothing is written; the caller reads the proposal and decides. A proposal is
 * accepted only when its score beats the current layout (`better(score(after,
 * moved), score(before, 0))`), so a refusal always carries a reason. Only the
 * given node's pixels count as moved. Inputs are never mutated.
 *
 * - `column`: x to the node's column (longest forward path), then a vertical search for room.
 * - `ports`: connected, non-fixed handles re-sorted by the y of what they connect to, within the
 *   slots they already hold. Never moves the node.
 * - `align`: y, one candidate per wire (the shift that levels it). Never changes x.
 * - `clear`: y, only for a card in an overlap or spacing break, or on a wire through a port (H4).
 *   Never changes x.
 *
 * `clear` and `column` never move a card above the topmost card of the graph (Q2).
 *
 * Annotations (notes, captions) are never laid out; they stay obstacles (D7, D8).
 * Positions stay on the 20px grid (H0). An unknown node id throws.
 *
 * @module layout/primitives
 */

import { cardIndex, wireEnds } from './geometry.js';
import {
  better,
  conflictCards,
  formatChange,
  passCards,
  measure,
  score,
  scoreMove,
  type LayoutMetrics,
  type LayoutScore
} from './measure.js';
import {
  LAYOUT_GRID,
  type LayoutCard,
  type LayoutGraph,
  type LayoutHandle,
  type LayoutOptions
} from './types.js';

export type LayoutPrimitive = 'column' | 'ports' | 'align' | 'clear';
export type LayoutStrategy = LayoutPrimitive | 'all';

/** The order `all` runs the primitives in. */
export const STRATEGY_ORDER: readonly LayoutPrimitive[] = ['column', 'ports', 'align', 'clear'];

export interface PortOrderChange {
  from: string[];
  to: string[];
}

export interface LayoutChanges {
  position?: { from: { x: number; y: number }; to: { x: number; y: number } };
  /** Handle order of the card, top to bottom, fixed handles included. */
  ports?: { inputs?: PortOrderChange; outputs?: PortOrderChange };
}

export interface LayoutProposal {
  nodeId: string;
  primitive: LayoutPrimitive;
  accepted: boolean;
  /** The next graph when accepted, else the input graph itself. */
  graph: LayoutGraph;
  /** What changed; empty when refused. */
  changes: LayoutChanges;
  before: LayoutMetrics;
  /** The metrics of `graph`: equal to `before` when refused. */
  after: LayoutMetrics;
  /** Pixels the node moved (|dx| + |dy|); 0 for ports and refusals. */
  moved: number;
  /** One line without the node id: the change, or the best candidate when refused. */
  message: string;
  /** Why nothing changed; set exactly when refused. */
  reason?: string;
}

export interface BeautifyResult {
  nodeId: string;
  strategy: LayoutStrategy;
  /** One per primitive run. `all` on an annotation gives one refusal (as `column`). */
  steps: LayoutProposal[];
  /** True when any step was accepted. */
  accepted: boolean;
  before: LayoutMetrics;
  after: LayoutMetrics;
  /** The graph after every accepted step. */
  graph: LayoutGraph;
}

/** The farthest a vertical search goes, per primitive. */
const CLEAR_REACH = 400;
const COLUMN_REACH = 600;

/**
 * The highest a `clear` or `column` move may put a card: the top of the topmost card (Q2). A card
 * never jumps above the graph the user laid out, even when that would score better.
 */
function topEdge(graph: LayoutGraph): number {
  return Math.min(...graph.cards.filter((c) => c.kind === 'card').map((c) => c.y));
}

function cardOrThrow(graph: LayoutGraph, nodeId: string): LayoutCard {
  const card = graph.cards.find((c) => c.id === nodeId);
  if (!card) throw new Error(`Unknown node "${nodeId}"`);
  return card;
}

/** The graph with one card replaced; nothing is mutated. */
function replaceCard(graph: LayoutGraph, card: LayoutCard): LayoutGraph {
  return { ...graph, cards: graph.cards.map((c) => (c.id === card.id ? card : c)) };
}

function refuse(
  graph: LayoutGraph,
  nodeId: string,
  primitive: LayoutPrimitive,
  before: LayoutMetrics,
  reason: string,
  message = reason
): LayoutProposal {
  return {
    nodeId,
    primitive,
    accepted: false,
    graph,
    changes: {},
    before,
    after: before,
    moved: 0,
    message,
    reason
  };
}

function shiftMessage(dy: number, from: number): string {
  return `moved ${dy > 0 ? 'down' : 'up'} ${Math.abs(dy)} (y ${from} → ${from + dy})`;
}

interface Candidate {
  graph: LayoutGraph;
  dx: number;
  dy: number;
  metrics: LayoutMetrics;
}

/**
 * The best-scoring move of the node among the shifts, or undefined when there is none. Each
 * candidate is scored against `before` by what the move changes; only the winner is measured.
 */
function bestMove(
  graph: LayoutGraph,
  card: LayoutCard,
  shifts: Array<[number, number]>,
  options: LayoutOptions,
  before: LayoutMetrics
): Candidate | undefined {
  let best: Omit<Candidate, 'metrics'> | undefined;
  let bestScore: LayoutScore | undefined;
  for (const [dx, dy] of shifts) {
    // The unmoved card is the baseline, not a candidate.
    if (!dx && !dy) continue;
    const next = replaceCard(graph, { ...card, x: card.x + dx, y: card.y + dy });
    const sc = scoreMove(before, next, card.id, options, Math.abs(dx) + Math.abs(dy));
    if (!bestScore || better(sc, bestScore)) {
      best = { graph: next, dx, dy };
      bestScore = sc;
    }
  }
  return best && { ...best, metrics: measure(best.graph, options) };
}

/** Finish a move: accept it when it beats the current layout, else refuse with the best candidate. */
function judgeMove(
  graph: LayoutGraph,
  card: LayoutCard,
  primitive: LayoutPrimitive,
  before: LayoutMetrics,
  best: Candidate | undefined,
  message: (best: Candidate) => string,
  noCandidates: string,
  force = false
): LayoutProposal {
  if (!best) return refuse(graph, card.id, primitive, before, noCandidates);
  const moved = Math.abs(best.dx) + Math.abs(best.dy);
  const text = message(best);
  if (!force && !better(score(best.metrics, moved), score(before, 0))) {
    return refuse(
      graph,
      card.id,
      primitive,
      before,
      `best candidate (${text}) does not beat the current layout`,
      text
    );
  }
  return {
    nodeId: card.id,
    primitive,
    accepted: true,
    graph: best.graph,
    changes: {
      position: {
        from: { x: card.x, y: card.y },
        to: { x: card.x + best.dx, y: card.y + best.dy }
      }
    },
    before,
    after: best.metrics,
    moved,
    message: text
  };
}

// ---- ports ----

/** The slots of one direction and the portIds sorted into them. */
function sortedHandles(
  graph: LayoutGraph,
  card: LayoutCard,
  direction: 'inputs' | 'outputs'
): LayoutHandle[] {
  const cards = cardIndex(graph);
  const handles = card[direction];
  const keyOf = (portId: string): number | null => {
    const ys: number[] = [];
    for (const wire of graph.wires) {
      if (wire.loopback || wire.source === wire.target) continue;
      const mine =
        direction === 'inputs'
          ? wire.target === card.id && wire.targetPort === portId
          : wire.source === card.id && wire.sourcePort === portId;
      if (!mine) continue;
      const ends = wireEnds(wire, cards);
      if (ends) ys.push(direction === 'inputs' ? ends.sy : ends.ty);
    }
    return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : null;
  };

  const slots: number[] = [];
  const movable: Array<{ portId: string; key: number; index: number }> = [];
  handles.forEach((handle, index) => {
    if (handle.fixed) return;
    const key = keyOf(handle.portId);
    if (key === null) return;
    slots.push(index);
    movable.push({ portId: handle.portId, key, index });
  });
  const sorted = [...movable].sort((a, b) => a.key - b.key || a.index - b.index);
  const next = handles.map((handle) => ({ ...handle }));
  slots.forEach((slot, i) => {
    next[slot].portId = sorted[i].portId;
  });
  return next;
}

function proposePorts(
  graph: LayoutGraph,
  card: LayoutCard,
  before: LayoutMetrics,
  options: LayoutOptions
): LayoutProposal {
  const next: LayoutCard = { ...card };
  const ports: NonNullable<LayoutChanges['ports']> = {};
  const messages: string[] = [];
  for (const direction of ['inputs', 'outputs'] as const) {
    const handles = sortedHandles(graph, card, direction);
    const from = card[direction].map((h) => h.portId);
    const to = handles.map((h) => h.portId);
    if (from.join('\n') === to.join('\n')) continue;
    next[direction] = handles;
    ports[direction] = { from, to };
    messages.push(`${direction} reordered ${to.join(', ')} (was ${from.join(', ')})`);
  }
  if (messages.length === 0) {
    return refuse(graph, card.id, 'ports', before, 'ports already follow their wires');
  }
  const message = messages.join('; ');
  const nextGraph = replaceCard(graph, next);
  const after = measure(nextGraph, options);
  if (!better(score(after, 0), score(before, 0))) {
    return refuse(
      graph,
      card.id,
      'ports',
      before,
      `best candidate (${message}) does not beat the current layout`,
      message
    );
  }
  return {
    nodeId: card.id,
    primitive: 'ports',
    accepted: true,
    graph: nextGraph,
    changes: { ports },
    before,
    after,
    moved: 0,
    message
  };
}

// ---- align, clear ----

function proposeAlign(
  graph: LayoutGraph,
  card: LayoutCard,
  before: LayoutMetrics,
  options: LayoutOptions
): LayoutProposal {
  const cards = cardIndex(graph);
  const dys: number[] = [];
  for (const wire of graph.wires) {
    if (wire.loopback || wire.source === wire.target) continue;
    const ends = wireEnds(wire, cards);
    if (!ends) continue;
    if (wire.target === card.id) dys.push(ends.sy - ends.ty);
    else if (wire.source === card.id) dys.push(ends.ty - ends.sy);
  }
  const shifts = [...new Set(dys)]
    .filter((dy) => dy !== 0 && dy % LAYOUT_GRID === 0)
    .map((dy): [number, number] => [0, dy]);
  let none = 'no wire on this card can be levelled on the grid';
  if (dys.length === 0) none = 'no wire on this card to level';
  else if (dys.every((dy) => dy === 0)) none = 'every wire on this card is already level';
  return judgeMove(
    graph,
    card,
    'align',
    before,
    bestMove(graph, card, shifts, options, before),
    (best) => shiftMessage(best.dy, card.y),
    none
  );
}

function proposeClear(
  graph: LayoutGraph,
  card: LayoutCard,
  before: LayoutMetrics,
  options: LayoutOptions
): LayoutProposal {
  if (!conflictCards(before).has(card.id) && !passCards(before).has(card.id)) {
    return refuse(
      graph,
      card.id,
      'clear',
      before,
      'no overlap, spacing break or wire through a port on this card'
    );
  }
  const shifts: Array<[number, number]> = [];
  const top = topEdge(graph);
  for (let k = LAYOUT_GRID; k <= CLEAR_REACH; k += LAYOUT_GRID) {
    shifts.push([0, k]);
    if (card.y - k >= top) shifts.push([0, -k]);
  }
  return judgeMove(
    graph,
    card,
    'clear',
    before,
    bestMove(graph, card, shifts, options, before),
    (best) => shiftMessage(best.dy, card.y),
    'no free spot within 400 of this card'
  );
}

// ---- column ----

const snap = (value: number): number => Math.round(value / LAYOUT_GRID) * LAYOUT_GRID;
const ceilToGrid = (value: number): number => Math.ceil(value / LAYOUT_GRID) * LAYOUT_GRID;

/** Longest path over non-loopback wires between cards; annotations are ignored. */
export function columnRanks(graph: LayoutGraph): Map<string, number> {
  const ids = graph.cards.filter((c) => c.kind === 'card').map((c) => c.id);
  const rank = new Map(ids.map((id) => [id, 0]));
  const forward = graph.wires.filter(
    (w) => !w.loopback && w.source !== w.target && rank.has(w.source) && rank.has(w.target)
  );
  // A cycle of non-loopback wires cannot settle; bound the passes so it still ends.
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const wire of forward) {
      const next = rank.get(wire.source)! + 1;
      if (next > rank.get(wire.target)!) {
        rank.set(wire.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return rank;
}

/** Where columns start (x of rank 0) and how far apart they are. */
export function columnGrid(
  graph: LayoutGraph,
  options: LayoutOptions
): { origin: number; stride: number } {
  const ranks = columnRanks(graph);
  const cards = graph.cards.filter((c) => c.kind === 'card');
  const first = options.columnOrigin === 'left' ? [] : cards.filter((c) => ranks.get(c.id) === 0);
  const origin = snap(Math.min(...(first.length ? first : cards).map((c) => c.x)));
  const widest = Math.max(...cards.map((c) => c.width));
  return { origin, stride: ceilToGrid(widest + options.gapX) };
}

function proposeColumn(
  graph: LayoutGraph,
  card: LayoutCard,
  before: LayoutMetrics,
  options: LayoutOptions,
  force: boolean
): LayoutProposal {
  const rank = columnRanks(graph).get(card.id) ?? 0;
  const { origin, stride } = columnGrid(graph, options);
  const targetX = origin + rank * stride;
  if (card.x === targetX) {
    return refuse(graph, card.id, 'column', before, `already in column ${rank}`);
  }
  const dx = targetX - card.x;
  // A card off the grid lands on it (H0), so its wires can be levelled with cards that are on it.
  const dy0 = snap(card.y) - card.y;
  const shifts: Array<[number, number]> = [[dx, dy0]];
  const top = topEdge(graph);
  for (let k = LAYOUT_GRID; k <= COLUMN_REACH; k += LAYOUT_GRID) {
    shifts.push([dx, dy0 + k]);
    if (card.y + dy0 - k >= top) shifts.push([dx, dy0 - k]);
  }
  return judgeMove(
    graph,
    card,
    'column',
    before,
    bestMove(graph, card, shifts, options, before),
    (best) =>
      `moved to column ${rank} (x ${card.x} → ${targetX}${
        best.dy ? `, y ${card.y} → ${card.y + best.dy}` : ''
      })`,
    'no free spot in this column',
    force
  );
}

// ---- public ----

export interface ProposeOptions {
  /**
   * `column` only: take the best spot in the column even when it scores worse than where the card
   * is now. The sweep's phase 0 uses it: every card goes into its column first, and a half-done
   * graph (some cards in columns, some not) is no fair judge of a single move.
   */
  force?: boolean;
  /** `measure(graph, options)`, when the caller has it already (the sweep, `beautify`). */
  before?: LayoutMetrics;
}

/** What a primitive would do to one node, judged against the current layout. */
export function propose(
  graph: LayoutGraph,
  nodeId: string,
  primitive: LayoutPrimitive,
  options: LayoutOptions,
  { force = false, before = measure(graph, options) }: ProposeOptions = {}
): LayoutProposal {
  const card = cardOrThrow(graph, nodeId);
  if (card.kind !== 'card') {
    return refuse(
      graph,
      nodeId,
      primitive,
      before,
      `a ${card.kind} is not laid out: it stays put and cards keep clear of it`
    );
  }
  switch (primitive) {
    case 'column':
      return proposeColumn(graph, card, before, options, force);
    case 'ports':
      return proposePorts(graph, card, before, options);
    case 'align':
      return proposeAlign(graph, card, before, options);
    case 'clear':
      return proposeClear(graph, card, before, options);
  }
}

/**
 * Run a primitive, or for `all` column, ports, align, clear in that order, each judged on the
 * graph the previous step left.
 */
export function beautify(
  graph: LayoutGraph,
  nodeId: string,
  strategy: LayoutStrategy,
  options: LayoutOptions
): BeautifyResult {
  const card = cardOrThrow(graph, nodeId);
  const before = measure(graph, options);
  const primitives = strategy === 'all' ? STRATEGY_ORDER : [strategy];
  const steps: LayoutProposal[] = [];
  let current = graph;
  let metrics = before;
  for (const primitive of primitives) {
    const step = propose(current, nodeId, primitive, options, { before: metrics });
    steps.push(step);
    if (step.accepted) {
      current = step.graph;
      metrics = step.after;
    }
    // An annotation refuses every primitive the same way; say it once.
    if (card.kind !== 'card') break;
  }
  const accepted = steps.some((s) => s.accepted);
  return {
    nodeId,
    strategy,
    steps,
    accepted,
    before,
    after: metrics,
    graph: current
  };
}

/**
 * Console lines for a proposal: `compose: inputs reordered …` and the score change, or
 * `compose: no change; <reason>`. A dry run says what would happen.
 */
export function formatProposal(proposal: LayoutProposal, dryRun = false): string[] {
  const { nodeId, message, reason } = proposal;
  if (!proposal.accepted) return [`${nodeId}: no change; ${reason}`];
  if (!dryRun) {
    return [`${nodeId}: ${message}`, `  ${formatChange(proposal.before, proposal.after)}`];
  }
  const would = message.startsWith('moved ')
    ? `would move ${message.slice('moved '.length)}`
    : `would change: ${message}`;
  const changed = formatChange(proposal.before, proposal.after, { onlyChanged: true });
  return [`${nodeId}: ${would}${changed ? `; ${changed}` : ''}`];
}

/** Console lines for a beautify run, in the design's format. */
export function formatBeautify(result: BeautifyResult, dryRun = false): string[] {
  if (result.steps.length === 1) return formatProposal(result.steps[0], dryRun);
  const lines: string[] = [];
  for (const step of result.steps) {
    if (step.accepted) lines.push(formatProposal(step, dryRun)[0]);
    else lines.push(`${result.nodeId}: ${step.primitive}: no change; ${step.reason}`);
  }
  const changed = formatChange(result.before, result.after, { onlyChanged: dryRun });
  if (result.accepted && changed) lines.push(`  ${changed}`);
  return lines;
}
