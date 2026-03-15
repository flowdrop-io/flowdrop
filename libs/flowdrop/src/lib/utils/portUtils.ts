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
