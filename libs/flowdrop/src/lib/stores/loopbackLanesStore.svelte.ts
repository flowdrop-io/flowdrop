/**
 * The return lanes of the loopbacks on the canvas, one store per editor.
 *
 * Track assignment needs the whole graph, so the editor computes every lane
 * once per change (nodes, edges, measured sizes) and the edges only look theirs
 * up by id. Empty while the *Draw loopbacks as return lanes* setting is off, and
 * for a loopback whose cards are not measured yet: that edge stays a bezier.
 *
 * @module stores/loopbackLanesStore
 */

import type { LoopbackLane } from '../layout/geometry.js';

export class LoopbackLanesStore {
  #lanes = $state.raw<ReadonlyMap<string, LoopbackLane>>(new Map());

  /** The lane of an edge, or undefined when it is drawn as a bezier. */
  get(edgeId: string): LoopbackLane | undefined {
    return this.#lanes.get(edgeId);
  }

  /** Replace every lane. */
  set(lanes: ReadonlyMap<string, LoopbackLane>): void {
    this.#lanes = lanes;
  }
}
