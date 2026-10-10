/**
 * The handle ids of a node that have an edge on them. The zoom tiers draw a
 * wired port as a stub on the card edge and hide an open one.
 */
export function wiredHandleIds(
  edges: readonly {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }[],
  nodeId: string
): Set<string> {
  const set = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId && edge.sourceHandle) set.add(edge.sourceHandle);
    if (edge.target === nodeId && edge.targetHandle) set.add(edge.targetHandle);
  }
  return set;
}
