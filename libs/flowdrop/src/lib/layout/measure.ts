/**
 * Node layout: how good a layout is.
 *
 * `measure` counts what the rules care about; `score` turns that into one
 * tuple compared rank by rank, so a lower rank can never buy back a higher one:
 *
 * 1. overlaps + spacing breaks (H2, H3; fewer)
 * 2. straight wires (H1; more)
 * 3. backward wires (S5; fewer)
 * 4. crossings (S1; fewer)
 * 5. pixels moved (S3; fewer, the tie-break)
 *
 * So only an overlap or a spacing break can bend a straight wire (decision D1).
 *
 * Spacing (decision D2): cards side by side need `gapX` between them, stacked
 * cards need `gapY`, diagonal neighbours need neither. Annotations count as
 * obstacles for cards; one annotation against another is not checked
 * (decision D8). A return lane needs `gapY` of air below it too.
 *
 * @module layout/measure
 */

import { polylineCrossing, wirePaths, type WirePath, type XY } from './geometry.js';
import type { LayoutCard, LayoutGraph, LayoutOptions } from './types.js';

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
  /** Every resolved wire with its path. */
  wires: WirePath[];
  /** Wires whose card or handle is unknown (left out of every count). */
  unresolved: string[];
}

/** Compared rank by rank; lower is better in every rank. */
export type LayoutScore = readonly [number, number, number, number, number];

/** A wire is level when its ends are less than this apart vertically. */
const LEVEL_EPSILON = 0.5;

/** Whether a resolved, non-loopback wire is straight: level and left to right. */
export function isStraight(path: WirePath): boolean {
  return !path.wire.loopback && path.tx >= path.sx && Math.abs(path.sy - path.ty) < LEVEL_EPSILON;
}

/** Whether a resolved, non-loopback wire runs right to left. */
export function isBackward(path: WirePath): boolean {
  return !path.wire.loopback && path.tx < path.sx;
}

/** The air between two boxes along x and along y; negative when their projections overlap. */
function gaps(a: LayoutCard, b: LayoutCard): { gx: number; gy: number } {
  return {
    gx: Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width)),
    gy: Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height))
  };
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
      const a = cards[i];
      const b = cards[j];
      if (a.kind !== 'card' && b.kind !== 'card') continue;
      const { gx, gy } = gaps(a, b);
      if (gx < 0 && gy < 0) {
        overlaps++;
        conflicts.push({ card: a.id, with: b.id, kind: 'overlap' });
      } else if ((gx < 0 && gy < options.gapY) || (gy < 0 && gx < options.gapX)) {
        spacing++;
        conflicts.push({ card: a.id, with: b.id, kind: 'spacing' });
      }
    }
  }

  // A lane runs under its loop body; any other card across its span keeps gapY clear of it.
  for (const path of wires) {
    if (path.laneY === undefined) continue;
    const lo = Math.min(path.sx, path.tx);
    const hi = Math.max(path.sx, path.tx);
    for (const card of cards) {
      if (card.kind !== 'card' || path.body?.has(card.id)) continue;
      if (card.x >= hi || card.x + card.width <= lo) continue;
      if (
        card.y + card.height > path.laneY - options.gapY + LEVEL_EPSILON &&
        card.y < path.laneY + options.gapY
      ) {
        spacing++;
        conflicts.push({ card: card.id, with: path.wire.id, kind: 'lane' });
      }
    }
  }

  const crossings: LayoutCrossing[] = [];
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const a = wires[i].wire;
      const b = wires[j].wire;
      // Wires fanning out of one port, or into one port, meet by design.
      if (a.source === b.source && a.sourcePort === b.sourcePort) continue;
      if (a.target === b.target && a.targetPort === b.targetPort) continue;
      const at = polylineCrossing(wires[i].points, wires[j].points);
      if (at) crossings.push({ a: a.id, b: b.id, at });
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
    wires,
    unresolved
  };
}

/** The ranked score of a measured layout, given how far the change moved cards (px). */
export function score(metrics: LayoutMetrics, moved = 0): LayoutScore {
  return [
    metrics.overlaps + metrics.spacing,
    -metrics.straight,
    metrics.backward,
    metrics.crossings.length,
    moved
  ];
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

/** One line for the console: `straight 3/6 · backward 0 · crossings 0 · overlaps 0 · spacing ok`. */
export function formatMetrics(metrics: LayoutMetrics): string {
  return [
    `straight ${metrics.straight}/${metrics.total}`,
    `backward ${metrics.backward}`,
    `crossings ${metrics.crossings.length}`,
    `overlaps ${metrics.overlaps}`,
    `spacing ${metrics.spacing ? `${metrics.spacing} too close` : 'ok'}`
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
  return parts
    .filter(([, b, a]) => !options.onlyChanged || b !== a)
    .map(([name, b, a]) => `${name} ${change(b, a)}`)
    .join(' · ');
}
