/**
 * Straight wires: magnetic alignment while dragging. (The "Straighten wires"
 * command became "Tidy node", the `layout node beautify` command.)
 *
 * A wire is straight when its source handle and its target handle are at the
 * same y. Every handle centre of a node card is a multiple of 20 from the node
 * top (see `nodeGeometry.ts`), so with nodes on the 20px grid any output can
 * line up with any input.
 *
 * Pure (no Svelte, no DOM). The caller supplies where each wire's handles are
 * (read from xyflow's measured handle bounds, so it works for every node type)
 * and where the nodes are, and gets back how far to move.
 *
 * @module utils/straightWires
 */

/** Within this many px of straight, a dragged node snaps (flow units). */
export const STRAIGHT_SNAP_THRESHOLD = 10;

/** A handle that is this close to a grid line is on it (absorbs sub-pixel measuring). */
const GRID_EPSILON = 0.75;

/**
 * One wire, with its handles measured from their node's top-left corner.
 * `*Dx` is the handle centre's x, used only to draw the guide.
 */
export interface StraightWire {
  id: string;
  sourceId: string;
  targetId: string;
  sourceDx: number;
  sourceDy: number;
  targetDx: number;
  targetDy: number;
  /** A completion (trigger) wire: the data wire is preferred when straightening. */
  exec?: boolean;
}

/** A node position (flow units, top-left). */
export interface Point {
  x: number;
  y: number;
}

/** A guide line along a wire that is straight. */
export interface StraightGuide {
  wireId: string;
  x1: number;
  x2: number;
  y: number;
}

export interface SnapOptions {
  /** Snap distance (default {@link STRAIGHT_SNAP_THRESHOLD}). */
  threshold?: number;
  /**
   * The snap-to-grid size, or undefined when snapping to the grid is off. The
   * snapped position must stay on the grid, so a candidate that would leave it
   * is not offered.
   */
  grid?: number;
  /** Alt held: no magnet. */
  disabled?: boolean;
}

export interface SnapResult {
  /** Vertical shift to apply to every moving node (0 when nothing snapped). */
  dy: number;
  /** One guide per wire that is straight after the shift. */
  guides: StraightGuide[];
}

/** Absolute y of a wire's two handles, given node positions. Undefined if a node is unknown. */
function handleYs(
  wire: StraightWire,
  positions: ReadonlyMap<string, Point>
): { sy: number; ty: number; sx: number; tx: number } | undefined {
  const s = positions.get(wire.sourceId);
  const t = positions.get(wire.targetId);
  if (!s || !t) return undefined;
  return {
    sy: s.y + wire.sourceDy,
    ty: t.y + wire.targetDy,
    sx: s.x + wire.sourceDx,
    tx: t.x + wire.targetDx
  };
}

function onGrid(value: number, grid: number): boolean {
  const r = Math.abs(value) % grid;
  return r < GRID_EPSILON || grid - r < GRID_EPSILON;
}

/**
 * Magnetic alignment for a drag. `positions` holds the nodes where the pointer
 * (and the grid snap) put them; `moving` are the dragged nodes (the whole
 * selection moves together, so one shift serves all of them).
 *
 * Of the wires that join a moving node to one that stays, the one closest to
 * straight within the threshold wins; every wire left straight by that shift
 * gets a guide, so a node that straightens its trigger wire and its data wire
 * at once shows both.
 */
export function snapToStraight(
  wires: readonly StraightWire[],
  positions: ReadonlyMap<string, Point>,
  moving: ReadonlySet<string>,
  options: SnapOptions = {}
): SnapResult {
  if (options.disabled) return { dy: 0, guides: [] };
  const threshold = options.threshold ?? STRAIGHT_SNAP_THRESHOLD;

  // A wire between a moving node and a fixed one; the shift that straightens it.
  const candidates: Array<{ wire: StraightWire; delta: number }> = [];
  for (const wire of wires) {
    const sourceMoves = moving.has(wire.sourceId);
    const targetMoves = moving.has(wire.targetId);
    if (sourceMoves === targetMoves) continue; // both move: the wire does not change
    const ys = handleYs(wire, positions);
    if (!ys) continue;
    // Moving the target by +delta moves its handle; moving the source does the opposite.
    const delta = targetMoves ? ys.sy - ys.ty : ys.ty - ys.sy;
    candidates.push({ wire, delta });
  }

  // Closest first; on a tie the earlier wire wins (stable).
  const sorted = candidates
    .filter(({ delta }) => Math.abs(delta) <= threshold)
    .filter(({ wire, delta }) => {
      if (options.grid === undefined) return true;
      const moved = moving.has(wire.targetId) ? wire.targetId : wire.sourceId;
      const pos = positions.get(moved);
      return pos !== undefined && onGrid(pos.y + delta, options.grid);
    })
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));

  if (sorted.length === 0) return { dy: 0, guides: [] };
  const dy = sorted[0].delta;

  const guides: StraightGuide[] = [];
  for (const wire of wires) {
    const sourceMoves = moving.has(wire.sourceId);
    const targetMoves = moving.has(wire.targetId);
    if (sourceMoves === targetMoves) continue;
    const ys = handleYs(wire, positions);
    if (!ys) continue;
    const residual = targetMoves ? ys.ty + dy - ys.sy : ys.sy + dy - ys.ty;
    if (Math.abs(residual) < 0.5) {
      guides.push({
        wireId: wire.id,
        x1: Math.min(ys.sx, ys.tx),
        x2: Math.max(ys.sx, ys.tx),
        y: targetMoves ? ys.ty + dy : ys.ty
      });
    }
  }
  return { dy, guides };
}
