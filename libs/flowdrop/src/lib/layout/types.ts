/**
 * Node layout: the model every layout primitive works on.
 *
 * A plain picture of the canvas — card boxes, where each handle sits on its
 * card, and the wires between them — so the geometry, the score and the
 * primitives stay pure (no Svelte, no DOM, no xyflow). `fromWorkflow` builds it
 * from a workflow; the commands write the result back.
 *
 * @module layout/types
 */

/** The canvas grid every position is on. */
export const LAYOUT_GRID = 20;
/** Default gap between cards side by side (decision D2; an editor setting). */
export const DEFAULT_LAYOUT_GAP_X = 120;
/** Default gap between stacked cards (decision D2; an editor setting). */
export const DEFAULT_LAYOUT_GAP_Y = 40;
/** A return lane runs this far under the lowest card of its loop body. */
export const LANE_CLEARANCE = 40;
/** Distance between stacked return-lane tracks. */
export const LANE_TRACK_PITCH = 20;

/**
 * `card` is laid out. `note` and `caption` are annotations: never moved, never
 * in a node order, and cards keep clear of them (decision D8).
 */
export type LayoutCardKind = 'card' | 'note' | 'caption';

/** A handle centre, from its card's top-left corner. */
export interface LayoutHandle {
  portId: string;
  dx: number;
  dy: number;
  /**
   * A handle the `ports` primitive may not move: a reserved port, a header pin,
   * a gateway branch (decision D4).
   */
  fixed?: boolean;
}

export interface LayoutCard {
  id: string;
  kind: LayoutCardKind;
  /** Top-left, flow units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Input handles in display order (top to bottom). */
  inputs: LayoutHandle[];
  /** Output handles in display order (top to bottom). */
  outputs: LayoutHandle[];
}

export interface LayoutWire {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  /** Targets a `loop_back` port: not counted as straight or backward. */
  loopback: boolean;
}

export interface LayoutGraph {
  cards: LayoutCard[];
  wires: LayoutWire[];
}

export interface LayoutOptions {
  /** Gap between cards side by side. */
  gapX: number;
  /** Gap between stacked cards. */
  gapY: number;
  /** How a loopback is drawn: today's bezier, or a return lane under the loop body (decision D5). */
  loopbacks: 'curve' | 'lane';
  /**
   * Where column 0 starts. `start` (default): at the leftmost start node, so a single `column`
   * move lines a node up with what feeds it. `left`: at the leftmost card, which the sweep uses
   * because it lays out every card and translates the graph back afterwards.
   */
  columnOrigin?: 'start' | 'left';
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  gapX: DEFAULT_LAYOUT_GAP_X,
  gapY: DEFAULT_LAYOUT_GAP_Y,
  loopbacks: 'curve'
};
