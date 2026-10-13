/**
 * The return lanes of the loopbacks on the canvas, one store per editor.
 *
 * Track assignment needs the whole graph, so the LoopbackLanes component derives every
 * lane once per change (nodes, edges, measured sizes) and the edges only look theirs
 * up by id. Empty until the canvas is measured, and
 * for a loopback whose cards are not measured yet: that edge stays a bezier.
 *
 * @module stores/loopbackLanesStore
 */

import type { LoopbackLane } from '../layout/geometry.js';

export class LoopbackLanesStore {
  #source = $state.raw<(() => ReadonlyMap<string, LoopbackLane>) | null>(null);

  /** The lane of an edge, or undefined when it is drawn as a bezier. */
  get(edgeId: string): LoopbackLane | undefined {
    return this.#source?.().get(edgeId);
  }

  /** Read the lanes through `source` (a derived in the component). Returns the disconnect. */
  connect(source: () => ReadonlyMap<string, LoopbackLane>): () => void {
    this.#source = source;
    return () => {
      if (this.#source === source) this.#source = null;
    };
  }
}
