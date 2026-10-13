/**
 * Node layout: how good a layout is.
 *
 * `measure` counts what the rules care about; `score` turns that into one
 * tuple compared rank by rank, so a lower rank can never buy back a higher one:
 *
 * 1. overlaps (H2; fewer)
 * 2. spacing breaks (H3; fewer)
 * 3. ports passed (H4; fewer)
 * 4. straight wires (H1; more)
 * 5. backward wires (S5; fewer)
 * 6. crossings (S1; fewer)
 * 7. near misses (H4, graded; fewer)
 * 8. pixels moved (S3; fewer, the tie-break)
 *
 * Overlaps rank above spacing: a card on top of another is worse than two cards too close, so a
 * move can never trade a spacing break for an overlap, whatever it does for the wires. Only an
 * overlap, a spacing break or a passed port can bend a straight wire (decision D1, widened by H4).
 *
 * Ports passed (H4): a wire that runs through a handle other than its own two ends reads as if
 * it started, ended or was relayed there (a level wire running through a card's unused input and
 * output looks like it goes through the card). Every such wire and handle counts once, except a
 * handle wired to the same port as the wire's other end (what it suggests is true), and a wire
 * drawn right to left (counted as backward instead).
 *
 * Near misses (H4, graded): a wire that stays out of a handle but comes within one grid step of it
 * still looks attached (a wire leaving a card's edge just above a port). Same exceptions; ranked
 * last before pixels, so it only breaks ties and never costs a straight wire or a crossing.
 *
 * Spacing (decision D2): cards side by side need `gapX` between them, stacked
 * cards need `gapY`, diagonal neighbours need neither. Annotations count as
 * obstacles for cards; one annotation against another is not checked
 * (decision D8). A return lane needs `gapY` of air below it too.
 *
 * @module layout/measure
 */

import {
  boxOf,
  loopbackLanes,
  polylineCrossing,
  wirePaths,
  type LoopbackLane,
  type WirePath,
  type XY
} from './geometry.js';
import {
  LAYOUT_GRID,
  cardSpanX,
  type LayoutCard,
  type LayoutGraph,
  type LayoutOptions,
  type LayoutWire
} from './types.js';

/** Two things too close: two cards, or a card and a return lane (`with` is then the loopback's wire id). */
export interface LayoutConflict {
  card: string;
  with: string;
  kind: 'overlap' | 'spacing' | 'lane';
}

export interface LayoutCrossing {
  /** Wire ids. */
  a: string;
  b: string;
  at: XY;
}

/** A wire running through, or close past, a handle that is not one of its ends (H4). */
export interface LayoutPortPass {
  /** Wire id. */
  wire: string;
  /** The card and port the wire runs through. */
  card: string;
  port: string;
  direction: 'input' | 'output';
}

export interface LayoutMetrics {
  /** Level, left-to-right wires (loopbacks not counted). */
  straight: number;
  /** Wires counted for straight and backward: every resolved wire but loopbacks. */
  total: number;
  /** Wires running right to left (loopbacks not counted). */
  backward: number;
  overlaps: number;
  /** Spacing breaks, between cards and against return lanes. */
  spacing: number;
  conflicts: LayoutConflict[];
  crossings: LayoutCrossing[];
  /** Wires running through a port that is not one of their ends (H4). */
  passes: LayoutPortPass[];
  /** Wires that miss such a port by less than a grid step (H4, graded). */
  nearMisses: LayoutPortPass[];
  /** Every resolved wire with its path. */
  wires: WirePath[];
  /** Wires whose card or handle is unknown (left out of every count). */
  unresolved: string[];
}

/** Compared rank by rank; lower is better in every rank. */
export type LayoutScore = readonly [
  overlaps: number,
  spacing: number,
  passes: number,
  straight: number,
  backward: number,
  crossings: number,
  nearMisses: number,
  moved: number
];

/** A wire is level when its ends are less than this apart vertically. */
const LEVEL_EPSILON = 0.5;
/**
 * A wire closer than this to a handle centre runs through it: half the grid, so a wire on the
 * next port row (one grid step away) does not count.
 */
const PORT_HIT = LAYOUT_GRID / 2;
/** How far a handle may sit outside its card's box (header pins). */
const HANDLE_SLACK = 40;
/** Closer than this (but not a hit) is a near miss: one grid step. */
const PORT_NEAR = LAYOUT_GRID;

/** Squared distance from a point to a segment. */
function segmentDistance2(p: XY, a: XY, b: XY): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2)) : 0;
  const dx = a[0] + t * vx - p[0];
  const dy = a[1] + t * vy - p[1];
  return dx * dx + dy * dy;
}

interface PortLinks {
  fedBySource: Map<string, Set<string>>;
  feedsTarget: Map<string, Set<string>>;
}

/** Per wire list: which ports feed which (it never depends on where the cards are). */
const portLinkCache = new WeakMap<readonly LayoutWire[], PortLinks>();

function portLinks(wires: readonly LayoutWire[]): PortLinks {
  let links = portLinkCache.get(wires);
  if (!links) {
    const fedBySource = new Map<string, Set<string>>();
    const feedsTarget = new Map<string, Set<string>>();
    const add = (map: Map<string, Set<string>>, key: string, value: string) => {
      let set = map.get(key);
      if (!set) map.set(key, (set = new Set()));
      set.add(value);
    };
    for (const w of wires) {
      const source = `${w.source}\0${w.sourcePort}`;
      const target = `${w.target}\0${w.targetPort}`;
      add(fedBySource, target, source);
      add(feedsTarget, source, target);
    }
    links = { fedBySource, feedsTarget };
    portLinkCache.set(wires, links);
  }
  return links;
}

/**
 * Every wire that runs through, or close past, a handle other than its own two ends. With `cards`,
 * only the handles on those cards.
 */
export function portClearance(
  graph: LayoutGraph,
  wires: readonly WirePath[],
  cards: readonly LayoutCard[] = graph.cards
): { passes: LayoutPortPass[]; nearMisses: LayoutPortPass[] } {
  const sourceOf = (w: LayoutWire) => `${w.source}\0${w.sourcePort}`;
  const targetOf = (w: LayoutWire) => `${w.target}\0${w.targetPort}`;
  const { fedBySource, feedsTarget } = portLinks(graph.wires);
  const passes: LayoutPortPass[] = [];
  const nearMisses: LayoutPortPass[] = [];
  const hit2 = PORT_HIT * PORT_HIT;
  const near2 = PORT_NEAR * PORT_NEAR;
  for (const path of wires) {
    // A wire drawn right to left loops back past its own cards; the backward rank already
    // counts it, and the sweep's first phase turns it around.
    if (path.tx < path.sx && path.laneY === undefined) continue;
    const { wire, points } = path;
    const box = boxOf(points);
    const minX = box[0] - PORT_NEAR;
    const minY = box[1] - PORT_NEAR;
    const maxX = box[2] + PORT_NEAR;
    const maxY = box[3] + PORT_NEAR;
    for (const card of cards) {
      if (card.kind !== 'card') continue;
      // A handle sits on its card (a pin may stick out a little): a card far from the wire has
      // none to hit.
      if (
        card.x - HANDLE_SLACK > maxX ||
        card.x + card.width + HANDLE_SLACK < minX ||
        card.y - HANDLE_SLACK > maxY ||
        card.y + card.height + HANDLE_SLACK < minY
      )
        continue;
      for (const direction of ['input', 'output'] as const) {
        for (const handle of direction === 'input' ? card.inputs : card.outputs) {
          // Position first: it rules out almost every handle, and the key below costs a string.
          const at: XY = [card.x + handle.dx, card.y + handle.dy];
          if (at[0] < minX || at[0] > maxX || at[1] < minY || at[1] > maxY) continue;
          const key = `${card.id}\0${handle.portId}`;
          if (
            direction === 'output'
              ? feedsTarget.get(key)?.has(targetOf(wire))
              : fedBySource.get(key)?.has(sourceOf(wire))
          )
            continue;
          let closest = Infinity;
          for (let i = 0; i < points.length - 1 && closest >= hit2; i++) {
            closest = Math.min(closest, segmentDistance2(at, points[i], points[i + 1]));
          }
          const pass = { wire: wire.id, card: card.id, port: handle.portId, direction };
          if (closest < hit2) passes.push(pass);
          else if (closest < near2) nearMisses.push(pass);
        }
      }
    }
  }
  return { passes, nearMisses };
}

/** Whether a resolved, non-loopback wire is straight: level and left to right. */
export function isStraight(path: WirePath): boolean {
  return !path.wire.loopback && path.tx >= path.sx && Math.abs(path.sy - path.ty) < LEVEL_EPSILON;
}

/** Whether a resolved, non-loopback wire runs right to left. */
export function isBackward(path: WirePath): boolean {
  return !path.wire.loopback && path.tx < path.sx;
}

/**
 * The air between two boxes along x and along y; negative when their projections overlap.
 * Along x a card reaches as far as its interface tags.
 */
function gaps(a: LayoutCard, b: LayoutCard): { gx: number; gy: number } {
  const [aLeft, aRight] = cardSpanX(a);
  const [bLeft, bRight] = cardSpanX(b);
  return {
    gx: Math.max(bLeft - aRight, aLeft - bRight),
    gy: Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height))
  };
}

/** Whether two cards overlap, or are too close: `null` when neither. */
function cardConflict(
  a: LayoutCard,
  b: LayoutCard,
  options: LayoutOptions
): 'overlap' | 'spacing' | null {
  if (a.kind !== 'card' && b.kind !== 'card') return null;
  const { gx, gy } = gaps(a, b);
  if (gx < 0 && gy < 0) return 'overlap';
  if ((gx < 0 && gy < options.gapY) || (gy < 0 && gx < options.gapX)) return 'spacing';
  return null;
}

/** The cards too close to a return lane: any card across its span but outside its body. */
function laneConflicts(
  path: WirePath,
  cards: readonly LayoutCard[],
  options: LayoutOptions
): LayoutConflict[] {
  if (path.laneY === undefined) return [];
  const lo = Math.min(path.sx, path.tx);
  const hi = Math.max(path.sx, path.tx);
  const conflicts: LayoutConflict[] = [];
  for (const card of cards) {
    if (card.kind !== 'card' || path.body?.has(card.id)) continue;
    const [left, right] = cardSpanX(card);
    if (left >= hi || right <= lo) continue;
    if (
      card.y + card.height > path.laneY - options.gapY + LEVEL_EPSILON &&
      card.y < path.laneY + options.gapY
    ) {
      conflicts.push({ card: card.id, with: path.wire.id, kind: 'lane' });
    }
  }
  return conflicts;
}

/** Where two wires cross, or null. Wires fanning out of one port, or into one port, meet by design. */
function wireCrossing(a: WirePath, b: WirePath): XY | null {
  if (a.wire.source === b.wire.source && a.wire.sourcePort === b.wire.sourcePort) return null;
  if (a.wire.target === b.wire.target && a.wire.targetPort === b.wire.targetPort) return null;
  return polylineCrossing(a.points, b.points);
}

/** Measure a layout. */
export function measure(graph: LayoutGraph, options: LayoutOptions): LayoutMetrics {
  const wires = wirePaths(graph, options);
  const resolved = new Set(wires.map((path) => path.wire.id));
  const unresolved = graph.wires.filter((wire) => !resolved.has(wire.id)).map((wire) => wire.id);

  let straight = 0;
  let total = 0;
  let backward = 0;
  for (const path of wires) {
    if (path.wire.loopback) continue;
    total++;
    if (isBackward(path)) backward++;
    else if (isStraight(path)) straight++;
  }

  const conflicts: LayoutConflict[] = [];
  let overlaps = 0;
  let spacing = 0;
  const { cards } = graph;
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const kind = cardConflict(cards[i], cards[j], options);
      if (!kind) continue;
      if (kind === 'overlap') overlaps++;
      else spacing++;
      conflicts.push({ card: cards[i].id, with: cards[j].id, kind });
    }
  }

  // A lane runs under its loop body; any other card across its span keeps gapY clear of it.
  for (const path of wires) {
    const lane = laneConflicts(path, cards, options);
    spacing += lane.length;
    conflicts.push(...lane);
  }

  const crossings: LayoutCrossing[] = [];
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const at = wireCrossing(wires[i], wires[j]);
      if (at) crossings.push({ a: wires[i].wire.id, b: wires[j].wire.id, at });
    }
  }

  return {
    straight,
    total,
    backward,
    overlaps,
    spacing,
    conflicts,
    crossings,
    ...portClearance(graph, wires),
    wires,
    unresolved
  };
}

/** The ranked score of a measured layout, given how far the change moved cards (px). */
export function score(metrics: LayoutMetrics, moved = 0): LayoutScore {
  return [
    metrics.overlaps,
    metrics.spacing,
    metrics.passes.length,
    -metrics.straight,
    metrics.backward,
    metrics.crossings.length,
    metrics.nearMisses.length,
    moved
  ];
}

/** Whether two polylines are the same points. */
function samePoints(a: readonly XY[], b: readonly XY[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  return true;
}

/**
 * The score of `next`, a layout that differs from the measured `base` only in where `cardId`
 * is. Equal to `score(measure(next, options), moved)`, but counts again only what the move can
 * change: the card's pairs, the wires on the card and (with return lanes) the lanes whose path
 * the move changed, since a lane follows its loop body and the lanes it nests with. A primitive
 * judges its candidates with it and measures the winner.
 *
 * With `bound` (the best score so far) a candidate that is already worse than it on a higher rank
 * is dropped before the dear ranks (ports passed, crossings) are counted: the result is then
 * only guaranteed to rank worse than `bound`, its lower ranks being `Infinity`. Without `bound`
 * it is exact.
 */
export function scoreMove(
  base: LayoutMetrics,
  next: LayoutGraph,
  cardId: string,
  options: LayoutOptions,
  moved = 0,
  bound?: LayoutScore
): LayoutScore {
  // `rank` ranks counted so far: worse than the bound on the first difference means stop.
  const beaten = (counted: number[]): boolean => {
    if (!bound) return false;
    for (let i = 0; i < counted.length; i++) {
      if (counted[i] > bound[i]) return true;
      if (counted[i] < bound[i]) return false;
    }
    return false;
  };
  const dropped = (counted: number[]): LayoutScore => {
    const rest = Array<number>(8 - counted.length).fill(Infinity);
    return [...counted, ...rest] as unknown as LayoutScore;
  };
  const lanesOn = options.loopbacks === 'lane';
  const basePaths = new Map(base.wires.map((path) => [path.wire.id, path]));
  // Lanes are cheap polylines; the work is what they cross. Work out the new lanes of the whole
  // graph and count again only the loopbacks whose path differs from the measured one.
  let lanes: Map<string, LoopbackLane> | undefined;
  if (lanesOn && next.wires.some((wire) => wire.loopback)) lanes = loopbackLanes(next);
  const touched = (wire: LayoutWire) => {
    if (wire.source === cardId || wire.target === cardId) return true;
    if (!lanesOn || !wire.loopback) return false;
    const was = basePaths.get(wire.id);
    const now = lanes?.get(wire.id);
    return !was || !now || !samePoints(was.points, now.points);
  };
  const changed = new Set(next.wires.filter(touched).map((wire) => wire.id));
  const fresh = wirePaths(next, options, (wire) => changed.has(wire.id), lanes);
  const kept = base.wires.filter((path) => !changed.has(path.wire.id));

  let straight = base.straight;
  let backward = base.backward;
  for (const path of base.wires) {
    if (!changed.has(path.wire.id)) continue;
    if (isBackward(path)) backward--;
    else if (isStraight(path)) straight--;
  }
  for (const path of fresh) {
    if (isBackward(path)) backward++;
    else if (isStraight(path)) straight++;
  }

  // Card pairs without the moved card stand; so do the lane breaks of lanes that did not change
  // (except against the moved card).
  let overlaps = 0;
  let spacing = 0;
  for (const c of base.conflicts) {
    if (c.kind === 'lane') {
      if (c.card !== cardId && !changed.has(c.with)) spacing++;
      continue;
    }
    if (c.card === cardId || c.with === cardId) continue;
    if (c.kind === 'overlap') overlaps++;
    else spacing++;
  }
  const card = next.cards.find((c) => c.id === cardId);
  if (card) {
    for (const other of next.cards) {
      if (other.id === cardId) continue;
      const kind = cardConflict(card, other, options);
      if (kind === 'overlap') overlaps++;
      else if (kind) spacing++;
    }
    for (const path of kept) spacing += laneConflicts(path, [card], options).length;
  }
  for (const path of fresh) spacing += laneConflicts(path, next.cards, options).length;
  if (beaten([overlaps, spacing])) return dropped([overlaps, spacing]);

  // Changed wires against every handle, unchanged wires against the moved card's handles.
  const stands = (pass: LayoutPortPass) => !changed.has(pass.wire) && pass.card !== cardId;
  const ofFresh = portClearance(next, fresh);
  const ofKept = card ? portClearance(next, kept, [card]) : { passes: [], nearMisses: [] };
  const passes = base.passes.filter(stands).length + ofFresh.passes.length + ofKept.passes.length;
  if (beaten([overlaps, spacing, passes, -straight, backward])) {
    return dropped([overlaps, spacing, passes, -straight, backward]);
  }

  let crossings = base.crossings.filter((c) => !changed.has(c.a) && !changed.has(c.b)).length;
  for (let i = 0; i < fresh.length; i++) {
    for (const other of kept) if (wireCrossing(fresh[i], other)) crossings++;
    for (let j = i + 1; j < fresh.length; j++) if (wireCrossing(fresh[i], fresh[j])) crossings++;
  }

  const nearMisses =
    base.nearMisses.filter(stands).length + ofFresh.nearMisses.length + ofKept.nearMisses.length;

  return [overlaps, spacing, passes, -straight, backward, crossings, nearMisses, moved];
}

/** True when `a` beats `b` (strictly). */
export function better(a: LayoutScore, b: LayoutScore): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}

/** The cards in a conflict. */
export function conflictCards(metrics: LayoutMetrics): Set<string> {
  const ids = new Set<string>();
  for (const c of metrics.conflicts) {
    ids.add(c.card);
    if (c.kind !== 'lane') ids.add(c.with);
  }
  return ids;
}

/** The cards a passed port is on, and the two ends of each wire that passes one. */
export function passCards(metrics: LayoutMetrics): Set<string> {
  const ends = new Map(metrics.wires.map((p) => [p.wire.id, p.wire]));
  const ids = new Set<string>();
  for (const pass of metrics.passes) {
    ids.add(pass.card);
    const wire = ends.get(pass.wire);
    if (wire) {
      ids.add(wire.source);
      ids.add(wire.target);
    }
  }
  return ids;
}

/**
 * One line for the console: `straight 3/6 · backward 0 · crossings 0 · overlaps 0 · spacing ok`,
 * with `· ports passed 2` / `· near misses 1` when there are any.
 */
export function formatMetrics(metrics: LayoutMetrics): string {
  return [
    `straight ${metrics.straight}/${metrics.total}`,
    `backward ${metrics.backward}`,
    `crossings ${metrics.crossings.length}`,
    `overlaps ${metrics.overlaps}`,
    `spacing ${metrics.spacing ? `${metrics.spacing} too close` : 'ok'}`,
    ...(metrics.passes.length ? [`ports passed ${metrics.passes.length}`] : []),
    ...(metrics.nearMisses.length ? [`near misses ${metrics.nearMisses.length}`] : [])
  ].join(' · ');
}

/** `before → after`, or the value once when it did not change. */
function change(before: string | number, after: string | number): string {
  return before === after ? `${before}` : `${before} → ${after}`;
}

export interface FormatChangeOptions {
  /** Print only the values that changed (dry runs): `overlaps 1 → 0`. */
  onlyChanged?: boolean;
}

/**
 * The score before and after on one line: `straight 0 → 1 · crossings 3 → 2 · overlaps 1 ·
 * spacing ok`. A value that did not change is printed once; `backward` appears only when
 * either side is non-zero; `straight` has no `/total`.
 */
export function formatChange(
  before: LayoutMetrics,
  after: LayoutMetrics,
  options: FormatChangeOptions = {}
): string {
  const spacing = (m: LayoutMetrics) => (m.spacing ? `${m.spacing} too close` : 'ok');
  const parts: Array<[string, string | number, string | number]> = [
    ['straight', before.straight, after.straight]
  ];
  if (before.backward || after.backward) parts.push(['backward', before.backward, after.backward]);
  parts.push(
    ['crossings', before.crossings.length, after.crossings.length],
    ['overlaps', before.overlaps, after.overlaps],
    ['spacing', spacing(before), spacing(after)]
  );
  if (before.passes.length || after.passes.length)
    parts.push(['ports passed', before.passes.length, after.passes.length]);
  if (before.nearMisses.length || after.nearMisses.length)
    parts.push(['near misses', before.nearMisses.length, after.nearMisses.length]);
  return parts
    .filter(([, b, a]) => !options.onlyChanged || b !== a)
    .map(([name, b, a]) => `${name} ${change(b, a)}`)
    .join(' · ');
}
