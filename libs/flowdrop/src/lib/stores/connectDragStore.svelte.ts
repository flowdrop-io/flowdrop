/**
 * The wire being dragged out of a port, one store per editor.
 *
 * While a connection is in progress every card asks `receives` for each of its
 * ports: the ports that take the dragged type light up ("ready to receive"),
 * the rest dull. Nothing is refused here. Types the configuration does not list
 * as compatible can still be wired (the runtime may cast), so a dull port stays
 * a valid drop.
 *
 * @module stores/connectDragStore
 */

import type { PortCompatibilityChecker } from '../utils/connections.js';

/** The port a wire is being dragged from. */
export interface ConnectDragFrom {
  nodeId: string;
  direction: 'input' | 'output';
  portId: string;
  dataType: string;
}

/** How a port reads while a wire is dragged: lit, dulled, or unchanged (the port dragged from). */
export type ConnectDragState = 'ready' | 'dull' | null;

/**
 * How one port reads while a wire is dragged from `from`.
 *
 * Ready: the opposite direction, on another node, a type the configuration
 * lists as compatible (output type first), and not a reserved input.
 * Dull: everything else, except the port the wire comes from.
 */
export function connectDragState(
  checker: PortCompatibilityChecker,
  from: ConnectDragFrom | null,
  nodeId: string,
  direction: 'input' | 'output',
  port: { id: string; dataType: string },
  reserved = false
): ConnectDragState {
  if (!from) return null;
  if (nodeId === from.nodeId && direction === from.direction && port.id === from.portId) {
    return null;
  }
  if (nodeId === from.nodeId || direction === from.direction || reserved) return 'dull';
  const compatible =
    direction === 'input'
      ? checker.areDataTypesCompatible(from.dataType, port.dataType)
      : checker.areDataTypesCompatible(port.dataType, from.dataType);
  return compatible ? 'ready' : 'dull';
}

export class ConnectDragStore {
  #from = $state<ConnectDragFrom | null>(null);

  /** The port a wire is being dragged from, or null when no drag is in progress. */
  get from(): ConnectDragFrom | null {
    return this.#from;
  }

  /** A drag started from a port (`null` when it ends or is cancelled). */
  set(from: ConnectDragFrom | null): void {
    this.#from = from;
  }
}
