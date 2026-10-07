/**
 * The link between Playground messages and canvas nodes, one store per editor.
 *
 * Hovering a message's node link lights that node on the canvas; hovering or
 * selecting a node lights the messages that came from it. The store holds only
 * what is hovered or selected right now. It never moves the view: a click on a
 * link asks `reveal`, and whoever registered the handler (`App`) decides what
 * that means.
 *
 * @module stores/nodeHighlightStore
 */

export type RevealHandler = (nodeId: string) => boolean;

export class NodeHighlightStore {
  #linkHover = $state<string | null>(null);
  #nodeHover = $state<string | null>(null);
  #selected = $state<string | null>(null);
  #reveal: RevealHandler | null = null;

  /** The node to light on the canvas: the one whose message link is hovered. */
  get canvasNodeId(): string | null {
    return this.#linkHover;
  }

  /** The node whose messages to light: the hovered node, else the selected one. */
  get messageNodeId(): string | null {
    return this.#nodeHover ?? this.#selected;
  }

  /** Whether message links can do anything (an editor registered a handler). */
  get canReveal(): boolean {
    return this.#reveal !== null;
  }

  /** A message link is hovered (`null` when the pointer leaves it). */
  hoverLink(nodeId: string | null): void {
    this.#linkHover = nodeId;
  }

  /** A canvas node is hovered (`null` when the pointer leaves it). */
  hoverNode(nodeId: string | null): void {
    this.#nodeHover = nodeId;
  }

  /** The node open in the inspector (`null` when none). */
  setSelected(nodeId: string | null): void {
    this.#selected = nodeId;
  }

  /**
   * Show a node's last run: select it, open Last run, bring it into view.
   * Returns whether the editor did so (false: no editor, or no such node).
   */
  reveal(nodeId: string): boolean {
    return this.#reveal?.(nodeId) ?? false;
  }

  /** Register the editor's reveal handler. Returns the unregister function. */
  setRevealHandler(handler: RevealHandler): () => void {
    this.#reveal = handler;
    return () => {
      if (this.#reveal === handler) this.#reveal = null;
    };
  }
}
