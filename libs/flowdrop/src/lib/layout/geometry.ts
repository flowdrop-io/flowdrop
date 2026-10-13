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
 * that do not overlap share a track. Loops in rows far apart do not count as
 * overlapping: only lanes whose legs share a y range stack. Any other card under the span has to keep
 * clear of the lane (`measure` counts it as a spacing break). A lane's vertical
 * legs sit one pitch further out per level it wraps, on both ends.
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
/** How far a return lane on the innermost track runs out of a handle before it turns. */
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

/**
 * A return lane: out of the source, down to the lane, back along it, up into the target.
 *
 * `outDepth` / `inDepth` push the two vertical legs {@link LANE_TRACK_PITCH} further out
 * per level (the source side runs right of the source, the target side left of the
 * target), so on both ends an outer lane turns further out than the inner lane it wraps.
 */
export function lanePoints(
  { sx, sy, tx, ty }: WireEnds,
  laneY: number,
  outDepth = 0,
  inDepth = outDepth
): XY[] {
  const ax = sx + LANE_STUB + outDepth * LANE_TRACK_PITCH;
  const bx = tx - LANE_STUB - inDepth * LANE_TRACK_PITCH;
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

/** Where a loopback's lane runs: its y, and how many lanes it wraps (0 = innermost). */
export interface LaneTrack {
  y: number;
  depth: number;
}

/**
 * The track of every loopback (by wire id). Shorter spans first; a lane goes one
 * track below every placed lane whose span overlaps its own, and one level deeper.
 */
export function assignTracks(
  graph: LayoutGraph,
  cards: ReadonlyMap<string, LayoutCard> = cardIndex(graph)
): Map<string, LaneTrack> {
  const loops: Array<{ wire: LayoutWire; lo: number; hi: number; top: number }> = [];
  for (const wire of graph.wires) {
    if (!wire.loopback) continue;
    const ends = wireEnds(wire, cards);
    if (!ends) continue;
    const [lo, hi] = span(ends);
    loops.push({ wire, lo, hi, top: Math.min(ends.sy, ends.ty) });
  }
  loops.sort((a, b) => a.hi - a.lo - (b.hi - b.lo) || a.lo - b.lo);

  const placed: Array<{ lo: number; hi: number; top: number; y: number; depth: number }> = [];
  const tracks = new Map<string, LaneTrack>();
  for (const loop of loops) {
    let y = bottomOf(cards, loopBody(graph, loop.wire)) + LANE_CLEARANCE;
    let depth = 0;
    const base = y;
    for (const other of placed) {
      // Lanes only share space when their spans overlap and their legs (from the handles down
      // to the lane) overlap too: a loop in a row far below the other one does not push it.
      if (other.lo < loop.hi && other.hi > loop.lo && other.top < base && other.y > loop.top) {
        y = Math.max(y, other.y + LANE_TRACK_PITCH);
        depth = Math.max(depth, other.depth + 1);
      }
    }
    placed.push({ lo: loop.lo, hi: loop.hi, top: loop.top, y, depth });
    tracks.set(loop.wire.id, { y, depth });
  }
  return tracks;
}

/** The lane y of every loopback (by wire id). */
export function assignLanes(
  graph: LayoutGraph,
  cards: ReadonlyMap<string, LayoutCard> = cardIndex(graph)
): Map<string, number> {
  return new Map([...assignTracks(graph, cards)].map(([id, track]) => [id, track.y]));
}

/** A loopback drawn as a return lane. */
export interface LoopbackLane {
  /** The lane polyline, from the source handle to the target handle. */
  points: XY[];
  /** The lane's y. */
  laneY: number;
  /** The loop body: the cards the lane runs under. */
  body: Set<string>;
}

/**
 * The return lane of every loopback in the graph, by wire id: the one place a
 * lane's points are made, so what the edge draws and what `measure` counts are
 * the same. Loopbacks into one port share the final climb, which sits as far
 * out as the outermost of them needs.
 */
export function loopbackLanes(
  graph: LayoutGraph,
  cards: ReadonlyMap<string, LayoutCard> = cardIndex(graph)
): Map<string, LoopbackLane> {
  const tracks = assignTracks(graph, cards);
  const climb = new Map<string, number>();
  const port = (wire: LayoutWire) => `${wire.target}\0${wire.targetPort}`;
  for (const wire of graph.wires) {
    const track = tracks.get(wire.id);
    if (track) climb.set(port(wire), Math.max(climb.get(port(wire)) ?? 0, track.depth));
  }
  const lanes = new Map<string, LoopbackLane>();
  for (const wire of graph.wires) {
    const track = tracks.get(wire.id);
    const ends = track && wireEnds(wire, cards);
    if (!track || !ends) continue;
    lanes.set(wire.id, {
      points: lanePoints(ends, track.y, track.depth, climb.get(port(wire))),
      laneY: track.y,
      body: loopBody(graph, wire)
    });
  }
  return lanes;
}

/**
 * Every wire whose ends are known, with its path. With `only`, just the wires it picks (a return
 * lane still sees the whole graph: its track depends on the other loopbacks).
 */
export function wirePaths(
  graph: LayoutGraph,
  options: Pick<LayoutOptions, 'loopbacks'>,
  only?: (wire: LayoutWire) => boolean
): WirePath[] {
  const cards = cardIndex(graph);
  const picked = only ? graph.wires.filter(only) : graph.wires;
  const lanes =
    options.loopbacks === 'lane' && picked.some((wire) => wire.loopback)
      ? loopbackLanes(graph, cards)
      : new Map<string, LoopbackLane>();
  const paths: WirePath[] = [];
  for (const wire of picked) {
    const ends = wireEnds(wire, cards);
    if (!ends) continue;
    const lane = lanes.get(wire.id);
    paths.push(
      lane
        ? { wire, ...ends, points: lane.points, laneY: lane.laneY, body: lane.body }
        : { wire, ...ends, points: bezierPoints(ends) }
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

export type Box = readonly [minX: number, minY: number, maxX: number, maxY: number];

/** Bounding boxes of the polylines seen so far: a candidate move reuses most wires unchanged. */
const boxes = new WeakMap<readonly XY[], Box>();

/** A polyline's bounding box. */
export function boxOf(points: readonly XY[]): Box {
  let box = boxes.get(points);
  if (!box) {
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    box = [minX, minY, maxX, maxY];
    boxes.set(points, box);
  }
  return box;
}

/** The first point where two polylines cross, or null. */
export function polylineCrossing(a: readonly XY[], b: readonly XY[]): XY | null {
  // Polylines whose boxes are apart cannot cross; neither can segments whose x or y ranges are.
  const ba = boxOf(a);
  const bb = boxOf(b);
  if (ba[0] > bb[2] || bb[0] > ba[2] || ba[1] > bb[3] || bb[1] > ba[3]) return null;
  for (let i = 0; i < a.length - 1; i++) {
    const [p1, p2] = [a[i], a[i + 1]];
    const ax0 = Math.min(p1[0], p2[0]);
    const ax1 = Math.max(p1[0], p2[0]);
    const ay0 = Math.min(p1[1], p2[1]);
    const ay1 = Math.max(p1[1], p2[1]);
    if (ax0 > bb[2] || ax1 < bb[0] || ay0 > bb[3] || ay1 < bb[1]) continue;
    for (let j = 0; j < b.length - 1; j++) {
      const [p3, p4] = [b[j], b[j + 1]];
      if (Math.max(p3[0], p4[0]) < ax0 || Math.min(p3[0], p4[0]) > ax1) continue;
      if (Math.max(p3[1], p4[1]) < ay0 || Math.min(p3[1], p4[1]) > ay1) continue;
      const hit = segmentCrossing(p1, p2, p3, p4);
      if (hit) return hit;
    }
  }
  return null;
}
