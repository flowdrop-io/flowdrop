import type { NodePort } from "$lib/types/index.js";

/**
 * Sort ports by an ordered array of port IDs.
 * Ports not listed appear at the end in their original order.
 */
export function applyPortOrder(
  ports: NodePort[],
  orderedIds: string[] | undefined,
): NodePort[] {
  if (!orderedIds || orderedIds.length === 0) return ports;
  const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
  return [...ports].sort((a, b) => {
    const aIdx = orderMap.get(a.id) ?? Infinity;
    const bIdx = orderMap.get(b.id) ?? Infinity;
    // Guard: Infinity - Infinity = NaN, which corrupts sort for two unlisted ports
    return aIdx === bIdx ? 0 : aIdx - bIdx;
  });
}

/**
 * Compute the CSS `top` offset (px) for a port handle.
 * - 1 port: centered at 40px
 * - N ports: 20px start, 40px gap between each
 */
export function getPortTop(index: number, count: number): number {
  if (count === 1) return 40;
  return 20 + index * 40;
}

/**
 * Determine whether a port should be rendered.
 *
 * Priority:
 * 1. Manual hide (`hiddenPorts`) — always wins, regardless of connections
 * 2. `hideUnconnectedHandles` — hide if not present in the connected handles set
 * 3. Default — visible
 */
export function isPortVisible(
  port: NodePort,
  direction: "input" | "output",
  hiddenPorts: { inputs?: string[]; outputs?: string[] },
  hideUnconnectedHandles: boolean,
  connectedHandles: Set<string>,
  nodeId: string | undefined,
): boolean {
  const hiddenList =
    direction === "input" ? hiddenPorts.inputs : hiddenPorts.outputs;
  if (hiddenList?.includes(port.id)) return false;
  if (hideUnconnectedHandles) {
    return connectedHandles.has(`${nodeId}-${direction}-${port.id}`);
  }
  return true;
}
