/**
 * Node layout: where the wires run.
 *
 * A wire's two ends come from its cards and handles. Its path is the bezier
 * xyflow draws (`getBezierPath`, right to left, curvature 0.25), sampled into
 * a polyline so crossings can be found with plain segment tests; a loopback
 * drawn as a return lane is a polyline already.
 *
 * Return lanes (decision D5): one track per loopback, the first
 * {@link LANE_CLEARANCE} under the lowest card of its loop body (the cards on a
 * forward path from the loop's target back to its source). Shorter spans are
 * placed first, so a loopback whose span overlaps one already placed goes
 * {@link LANE_TRACK_PITCH} below it: lanes nest instead of crossing, and spans
 * that do not overlap share a track. Any other card under the span has to keep
 * clear of the lane (`measure` counts it as a spacing break).
 *
 * @module layout/geometry
 */

import {
  LANE_CLEARANCE,
  LANE_TRACK_PITCH,
  type LayoutCard,
  type LayoutGraph,
  type LayoutOptions,
  type LayoutWire
} from './types.js';

/** xyflow's default bezier curvature. */
const CURVATURE = 0.25;
/** Points a bezier is sampled into. */
const BEZIER_STEPS = 32;
/** How far a return lane runs out of a handle before it turns. */
const LANE_STUB = 30;

export type XY = readonly [number, number];

export interface WireEnds {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

export interface WirePath extends WireEnds {
  wire: LayoutWire;
  /** The path as a polyline. */
  points: XY[];
  /** The lane's y, for a loopback drawn as a lane. */
  laneY?: number;
  /** The loop body, for a loopback drawn as a lane. */
  body?: Set<string>;
}

/** Cards by id. */
export function cardIndex(graph: LayoutGraph): Map<string, LayoutCard> {
  return new Map(graph.cards.map((card) => [card.id, card]));
}

/** Where a wire's two handles are, or undefined when a card or a handle is unknown. */
export function wireEnds(
  wire: LayoutWire,
  cards: ReadonlyMap<string, LayoutCard>
): WireEnds | undefined {
  const source = cards.get(wire.source);
  const target = cards.get(wire.target);
  const out = source?.outputs.find((h) => h.portId === wire.sourcePort);
  const into = target?.inputs.find((h) => h.portId === wire.targetPort);
  if (!source || !target || !out || !into) return undefined;
  return {
    sx: source.x + out.dx,
    sy: source.y + out.dy,
    tx: target.x + into.dx,
    ty: target.y + into.dy
  };
}

/** xyflow's control offset for a right-to-left handle pair. */
function controlOffset(distance: number): number {
  return distance >= 0 ? 0.5 * distance : CURVATURE * 25 * Math.sqrt(-distance);
}

/** The bezier xyflow draws from a right-side source to a left-side target, as a polyline. */
export function bezierPoints({ sx, sy, tx, ty }: WireEnds): XY[] {
  const offset = controlOffset(tx - sx);
  const c1x = sx + offset;
  const c2x = tx - offset;
  const points: XY[] = [];
  for (let i = 0; i <= BEZIER_STEPS; i++) {
    const t = i / BEZIER_STEPS;
    const u = 1 - t;
    points.push([
      u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * tx,
      u * u * u * sy + 3 * u * u * t * sy + 3 * u * t * t * ty + t * t * t * ty
    ]);
  }
  return points;
}

/** A return lane: out of the source, down to the lane, back along it, up into the target. */
export function lanePoints({ sx, sy, tx, ty }: WireEnds, laneY: number): XY[] {
  const ax = sx + LANE_STUB;
  const bx = tx - LANE_STUB;
  return [
    [sx, sy],
    [ax, sy],
    [ax, laneY],
    [bx, laneY],
    [bx, ty],
    [tx, ty]
  ];
}

/** The x range a loopback spans (its loop body). */
function span(ends: WireEnds): [number, number] {
  return [Math.min(ends.sx, ends.tx), Math.max(ends.sx, ends.tx)];
}

/**
 * The loop body of a loopback: every card on a forward path from the wire's
 * target (the loop) to its source, both included.
 */
export function loopBody(graph: LayoutGraph, wire: LayoutWire): Set<string> {
  const forward = graph.wires.filter((w) => !w.loopback);
  const reach = (start: string, next: (w: LayoutWire) => [string, string]): Set<string> => {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
      const at = queue.shift()!;
      for (const w of forward) {
        const [from, to] = next(w);
        if (from === at && !seen.has(to)) {
          seen.add(to);
          queue.push(to);
        }
      }
    }
    return seen;
  };
  const fromLoop = reach(wire.target, (w) => [w.source, w.target]);
  const toSource = reach(wire.source, (w) => [w.target, w.source]);
  const body = new Set([...fromLoop].filter((id) => toSource.has(id)));
  body.add(wire.source);
  body.add(wire.target);
  return body;
}

/** The lowest bottom among the given cards (annotations never count). */
function bottomOf(cards: ReadonlyMap<string, LayoutCard>, ids: Iterable<string>): number {
  let bottom = -Infinity;
  for (const id of ids) {
    const card = cards.get(id);
    if (card && card.kind === 'card') bottom = Math.max(bottom, card.y + card.height);
  }
  return bottom;
}

/**
 * The lane y of every loopback (by wire id). Shorter spans first; a lane goes
 * one track below every placed lane whose span overlaps its own.
 */
export function assignLanes(
  graph: LayoutGraph,
  cards: ReadonlyMap<string, LayoutCard> = cardIndex(graph)
): Map<string, number> {
  const loops: Array<{ wire: LayoutWire; lo: number; hi: number }> = [];
  for (const wire of graph.wires) {
    if (!wire.loopback) continue;
    const ends = wireEnds(wire, cards);
    if (!ends) continue;
    const [lo, hi] = span(ends);
    loops.push({ wire, lo, hi });
  }
  loops.sort((a, b) => a.hi - a.lo - (b.hi - b.lo) || a.lo - b.lo);

  const placed: Array<{ lo: number; hi: number; y: number }> = [];
  const lanes = new Map<string, number>();
  for (const loop of loops) {
    let y = bottomOf(cards, loopBody(graph, loop.wire)) + LANE_CLEARANCE;
    for (const other of placed) {
      if (other.lo < loop.hi && other.hi > loop.lo) y = Math.max(y, other.y + LANE_TRACK_PITCH);
    }
    placed.push({ lo: loop.lo, hi: loop.hi, y });
    lanes.set(loop.wire.id, y);
  }
  return lanes;
}

/** Every wire whose ends are known, with its path. */
export function wirePaths(
  graph: LayoutGraph,
  options: Pick<LayoutOptions, 'loopbacks'>
): WirePath[] {
  const cards = cardIndex(graph);
  const lanes =
    options.loopbacks === 'lane' ? assignLanes(graph, cards) : new Map<string, number>();
  const paths: WirePath[] = [];
  for (const wire of graph.wires) {
    const ends = wireEnds(wire, cards);
    if (!ends) continue;
    const laneY = lanes.get(wire.id);
    paths.push(
      laneY === undefined
        ? { wire, ...ends, points: bezierPoints(ends) }
        : { wire, ...ends, points: lanePoints(ends, laneY), laneY, body: loopBody(graph, wire) }
    );
  }
  return paths;
}

/** Where two segments cross, strictly inside both (touching ends do not count). */
export function segmentCrossing(p1: XY, p2: XY, p3: XY, p4: XY): XY | null {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-9) return null;
  const ua = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const ub = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  if (ua <= 0 || ua >= 1 || ub <= 0 || ub >= 1) return null;
  return [p1[0] + ua * (p2[0] - p1[0]), p1[1] + ua * (p2[1] - p1[1])];
}

/** The first point where two polylines cross, or null. */
export function polylineCrossing(a: readonly XY[], b: readonly XY[]): XY | null {
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      const hit = segmentCrossing(a[i], a[i + 1], b[j], b[j + 1]);
      if (hit) return hit;
    }
  }
  return null;
}
