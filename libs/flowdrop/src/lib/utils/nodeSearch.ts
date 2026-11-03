/**
 * Palette search for node types: matches name, tags (keywords) and description,
 * and orders matches so exact name and keyword hits come first.
 */
import type { NodeMetadata } from '../types/index.js';

/** Lower is better; null means no match. */
function scoreNode(node: NodeMetadata, query: string): number | null {
  const name = node.name.toLowerCase();
  const tags = (node.tags ?? []).map((tag) => tag.toLowerCase());

  if (name === query) return 0;
  if (tags.includes(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (name.split(/\s+/).some((word) => word.startsWith(query))) return 3;
  if (name.includes(query)) return 4;
  if (tags.some((tag) => tag.includes(query))) return 5;
  if ((node.description ?? '').toLowerCase().includes(query)) return 6;
  return null;
}

/**
 * Filter and rank node types for a search query. A blank query returns the
 * input unchanged. Equal scores keep the input (API) order.
 */
export function searchNodeTypes(nodes: NodeMetadata[], query: string): NodeMetadata[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return nodes;

  const scored: { node: NodeMetadata; score: number; index: number }[] = [];
  nodes.forEach((node, index) => {
    const score = scoreNode(node, needle);
    if (score !== null) scored.push({ node, score, index });
  });
  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.map((entry) => entry.node);
}
