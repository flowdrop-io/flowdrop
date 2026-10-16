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
  cardSpanX,
  type LayoutCard,
  type LayoutGraph,
  type LayoutHandle,
  type LayoutOptions,
  type LayoutWire
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

/** The farthest a vertical search goes in steps of one grid, per primitive. */
const CLEAR_REACH = 400;
const COLUMN_REACH = 600;
/**
 * The farthest a card goes to sit right above or below another card of its column. A crowded
 * column (a fan-out of thirty cards is five thousand pixels tall) has no free slot within the
 * reach above, and only a slot far out resolves the overlap; the card goes straight to the nearest
 * one past the last card it would meet. Bounded so one card never leaves the page.
 */
const STACK_REACH = 6000;

/**
 * Vertical shifts that put the card right above or below another card it would share a column with
 * at `x` (gap included), snapped to the grid, past the plain reach and within {@link STACK_REACH}.
 * Never above `top`. Sorted by distance.
 */
function stackShifts(
  graph: LayoutGraph,
  card: LayoutCard,
  x: number,
  y: number,
  top: number,
  options: LayoutOptions,
  plainReach: number
): number[] {
  const dys = new Set<number>();
  const [left, right] = cardSpanX({ ...card, x });
  for (const other of graph.cards) {
    if (other.id === card.id) continue;
    // Side by side with enough air (interface tags included): the vertical gap does not matter.
    const [otherLeft, otherRight] = cardSpanX(other);
    if (otherLeft >= right + options.gapX || otherRight <= left - options.gapX) continue;
    const below =
      Math.ceil((other.y + other.height + options.gapY - y) / LAYOUT_GRID) * LAYOUT_GRID;
    const above =
      Math.floor((other.y - card.height - options.gapY - y) / LAYOUT_GRID) * LAYOUT_GRID;
    for (const dy of [below, above]) {
      if (Math.abs(dy) > plainReach && Math.abs(dy) <= STACK_REACH && y + dy >= top) dys.add(dy);
    }
  }
  return [...dys].sort((a, b) => Math.abs(a) - Math.abs(b));
}

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
    const sc = scoreMove(before, next, card.id, options, Math.abs(dx) + Math.abs(dy), bestScore);
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
  for (const dy of stackShifts(graph, card, card.x, card.y, top, options, CLEAR_REACH)) {
    shifts.push([0, dy]);
  }
  return judgeMove(
    graph,
    card,
    'clear',
    before,
    bestMove(graph, card, shifts, options, before),
    (best) => shiftMessage(best.dy, card.y),
    'no free spot for this card'
  );
}

// ---- column ----

const snap = (value: number): number => Math.round(value / LAYOUT_GRID) * LAYOUT_GRID;
const ceilToGrid = (value: number): number => Math.ceil(value / LAYOUT_GRID) * LAYOUT_GRID;

/**
 * Longest path over non-loopback wires between cards; annotations are ignored. A cycle of
 * non-loopback wires (one that does not run through a loop_back port) has no longest path: the
 * wire that closes it, the one a depth-first walk from the start nodes meets last, is a back
 * edge and counts for nothing, so the rest of the cycle lays out left to right and the back
 * edge runs right to left like any backward wire.
 */
export function columnRanks(graph: LayoutGraph): Map<string, number> {
  const ids = graph.cards.filter((c) => c.kind === 'card').map((c) => c.id);
  const rank = new Map(ids.map((id) => [id, 0]));
  const forward = graph.wires.filter(
    (w) => !w.loopback && w.source !== w.target && rank.has(w.source) && rank.has(w.target)
  );
  const out = new Map<string, LayoutWire[]>(ids.map((id) => [id, []]));
  const indegree = new Map(ids.map((id) => [id, 0]));
  for (const wire of forward) {
    out.get(wire.source)!.push(wire);
    indegree.set(wire.target, indegree.get(wire.target)! + 1);
  }

  // Depth first, roots (nothing feeds them) before the rest, so a cycle is cut at its way in.
  const back = new Set<LayoutWire>();
  const state = new Map<string, 1 | 2>(); // 1 on the path, 2 done
  const roots = [...ids.filter((id) => indegree.get(id) === 0), ...ids];
  for (const root of roots) {
    if (state.has(root)) continue;
    state.set(root, 1);
    const stack: Array<{ id: string; next: number }> = [{ id: root, next: 0 }];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const wires = out.get(top.id)!;
      if (top.next >= wires.length) {
        state.set(top.id, 2);
        stack.pop();
        continue;
      }
      const wire = wires[top.next++];
      const seen = state.get(wire.target);
      if (seen === 1) back.add(wire);
      else if (seen === undefined) {
        state.set(wire.target, 1);
        stack.push({ id: wire.target, next: 0 });
      }
    }
  }

  // Longest path over what is left (a DAG): Kahn's order, ranks raised along each wire.
  const waiting = new Map(ids.map((id) => [id, 0]));
  for (const wire of forward) {
    if (!back.has(wire)) waiting.set(wire.target, waiting.get(wire.target)! + 1);
  }
  const queue = ids.filter((id) => waiting.get(id) === 0);
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    for (const wire of out.get(id)!) {
      if (back.has(wire)) continue;
      rank.set(wire.target, Math.max(rank.get(wire.target)!, rank.get(id)! + 1));
      waiting.set(wire.target, waiting.get(wire.target)! - 1);
      if (waiting.get(wire.target) === 0) queue.push(wire.target);
    }
  }
  return rank;
}

/**
 * Where columns start (x of rank 0) and how far apart they are: the widest card plus the gap.
 * A column whose cards have interface tags moves further right by the room the tags take: the
 * output tags of the column before it and the input tags of its own cards. `columnX` is the x of
 * every rank.
 */
export function columnGrid(
  graph: LayoutGraph,
  options: LayoutOptions
): { origin: number; stride: number; columnX: (rank: number) => number } {
  const ranks = columnRanks(graph);
  const cards = graph.cards.filter((c) => c.kind === 'card');
  const first = options.columnOrigin === 'left' ? [] : cards.filter((c) => ranks.get(c.id) === 0);
  const origin = snap(Math.min(...(first.length ? first : cards).map((c) => c.x)));
  const widest = Math.max(...cards.map((c) => c.width));
  const stride = ceilToGrid(widest + options.gapX);

  // Per rank: how far the cards reach right of the column x, and how far their tags reach left.
  const reachRight = new Map<number, number>();
  const reachLeft = new Map<number, number>();
  for (const card of cards) {
    const rank = ranks.get(card.id) ?? 0;
    const right = card.width + (card.tags?.right ?? 0);
    reachRight.set(rank, Math.max(reachRight.get(rank) ?? widest, right));
    reachLeft.set(rank, Math.max(reachLeft.get(rank) ?? 0, card.tags?.left ?? 0));
  }
  const xs = [origin];
  const columnX = (rank: number): number => {
    for (let r = xs.length; r <= rank; r++) {
      const right = reachRight.get(r - 1) ?? widest;
      xs.push(xs[r - 1] + ceilToGrid(right + (reachLeft.get(r) ?? 0) + options.gapX));
    }
    return xs[Math.max(0, rank)];
  };
  return { origin, stride, columnX };
}

function proposeColumn(
  graph: LayoutGraph,
  card: LayoutCard,
  before: LayoutMetrics,
  options: LayoutOptions,
  force: boolean
): LayoutProposal {
  const rank = columnRanks(graph).get(card.id) ?? 0;
  const targetX = columnGrid(graph, options).columnX(rank);
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
  for (const dy of stackShifts(graph, card, targetX, card.y + dy0, top, options, COLUMN_REACH)) {
    shifts.push([dx, dy0 + dy]);
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
