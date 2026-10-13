/**
 * Node layout: a return lane as an SVG path.
 *
 * The lane polyline (`loopbackLanes`) with rounded corners, shortened at the
 * target so the arrowhead the edge draws sits on the last segment. Pure: the
 * edge component only hands it the points.
 *
 * @module layout/lanePath
 */

import type { XY } from './geometry.js';

export interface LanePath {
  /** SVG path data, ending `arrow` before the target. */
  d: string;
  /** The middle of the lane, where a label sits. */
  label: XY;
  /** The arrowhead's direction, in degrees (the last segment's). */
  angleDeg: number;
}

/** The point `distance` from `from` towards `to` (clamped to the segment). */
function towards(from: XY, to: XY, distance: number): XY {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (length === 0) return from;
  const t = Math.min(distance, length) / length;
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

const fmt = (n: number): string => String(Math.round(n * 100) / 100);

/**
 * Round the corners of `points` with `radius` (smaller where a segment is
 * short) and stop `arrow` before the last point.
 */
export function lanePath(points: readonly XY[], radius: number, arrow: number): LanePath {
  const pts = points.slice();
  const last = pts.length - 1;
  const angleDeg =
    (Math.atan2(pts[last][1] - pts[last - 1][1], pts[last][0] - pts[last - 1][0]) * 180) / Math.PI;
  pts[last] = towards(pts[last], pts[last - 1], arrow);

  let d = `M ${fmt(pts[0][0])},${fmt(pts[0][1])}`;
  for (let i = 1; i < last; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const r = Math.min(
      radius,
      Math.hypot(b[0] - a[0], b[1] - a[1]) / 2,
      Math.hypot(c[0] - b[0], c[1] - b[1]) / 2
    );
    const from = towards(b, a, r);
    const to = towards(b, c, r);
    d += ` L ${fmt(from[0])},${fmt(from[1])} Q ${fmt(b[0])},${fmt(b[1])} ${fmt(to[0])},${fmt(to[1])}`;
  }
  d += ` L ${fmt(pts[last][0])},${fmt(pts[last][1])}`;

  // `lanePoints` (geometry.ts) returns six points: the lane is the segment between its two
  // vertical legs, the third of five. Any other shape gets the middle point of the polyline.
  if (pts.length !== 6) {
    return { d, label: points[Math.floor(points.length / 2)], angleDeg };
  }
  const lo = pts[2];
  const hi = pts[3];
  return { d, label: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2], angleDeg };
}
