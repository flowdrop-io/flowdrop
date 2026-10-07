/**
 * Node fingerprints: "did this node change since a run started?"
 *
 * A fingerprint is a string per node that changes when something that can
 * change a run's result changes, and stays the same for edits that cannot:
 *
 * Counted:
 * - the node's type and the node type it was made from (`metadata.node_type_id`),
 * - its configuration (`data.config`), including dynamic ports and branches,
 * - its extension data, except the `ui` namespace,
 * - which ports feed it: the incoming edges (source node and both handles).
 *
 * Ignored (the server's WorkflowStamp ignores them as well):
 * - position and size, selection, and other canvas state,
 * - the display label (`data.label`) and the per-instance display overrides
 *   `config.instanceTitle`, `config.instanceDescription` and `config.instanceBadge`,
 * - `extensions.ui` (visual settings),
 * - run bookkeeping on the node data (`executionInfo`, `isProcessing`, `error`).
 *
 * Comparing two fingerprints of one node is all this is for; they are not a
 * stable format and are never stored or sent.
 *
 * @module utils/nodeFingerprint
 */

import type { Workflow } from '../types/index.js';

/** Per-instance display overrides inside `config` that do not change a run. */
const DISPLAY_CONFIG_KEYS = new Set(['instanceTitle', 'instanceDescription', 'instanceBadge']);

/** JSON with object keys sorted, so key order never makes two equal values differ. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) sorted[k] = (v as Record<string, unknown>)[k];
      return sorted;
    }
    return v;
  });
}

/** One fingerprint per node of the workflow, keyed by node id. */
export function fingerprintNodes(
  workflow: Pick<Workflow, 'nodes' | 'edges'> | null | undefined
): Record<string, string> {
  const prints: Record<string, string> = {};
  if (!workflow) return prints;

  const incoming = new Map<string, string[]>();
  for (const edge of workflow.edges ?? []) {
    const list = incoming.get(edge.target) ?? [];
    list.push(`${edge.source}|${edge.sourceHandle ?? ''}|${edge.targetHandle ?? ''}`);
    incoming.set(edge.target, list);
  }

  for (const node of workflow.nodes ?? []) {
    const config: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node.data?.config ?? {})) {
      if (!DISPLAY_CONFIG_KEYS.has(key)) config[key] = value;
    }
    const { ui: _ui, ...extensions } = node.data?.extensions ?? {};
    prints[node.id] = stableStringify({
      type: node.type,
      metadata: node.data?.metadata?.node_type_id ?? null,
      config,
      extensions,
      incoming: (incoming.get(node.id) ?? []).sort()
    });
  }
  return prints;
}
