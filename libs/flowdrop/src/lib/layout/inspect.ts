/**
 * Node layout: `inspect`, the report that tells a person or an agent what is wrong around one
 * node before anything is changed.
 *
 * ```
 * compose  y=160  inputs: contact, label  outputs: reply
 *   in  contact ← lookup.contact   off by 40   crosses classify.label → compose.label
 *   out reply   → loop.items       straight
 *   overlaps none · spacing ok
 * ```
 *
 * An unknown node id throws (`Unknown node "x"`); the command layer turns that into its error.
 *
 * @module layout/inspect
 */

import { cardIndex } from './geometry.js';
import { measure, type LayoutMetrics } from './measure.js';
import type { LayoutGraph, LayoutOptions, LayoutWire } from './types.js';

const wireLabel = (wire: LayoutWire): string =>
  `${wire.source}.${wire.sourcePort} → ${wire.target}.${wire.targetPort}`;

/** `overlaps none · spacing ok`, or the conflicts of one card (`overlap with lookup · spacing with cap1`). */
function conflictsLine(graph: LayoutGraph, metrics: LayoutMetrics, nodeId: string): string {
  const wires = new Map(graph.wires.map((w) => [w.id, w]));
  const parts: string[] = [];
  for (const c of metrics.conflicts) {
    if (c.card !== nodeId && !(c.kind !== 'lane' && c.with === nodeId)) continue;
    if (c.kind === 'lane') {
      const wire = wires.get(c.with);
      parts.push(`lane with ${wire ? `${wire.source} → ${wire.target}` : c.with}`);
    } else {
      parts.push(`${c.kind} with ${c.card === nodeId ? c.with : c.card}`);
    }
  }
  return parts.length ? parts.join(' · ') : 'overlaps none · spacing ok';
}

/** The report lines for one node. */
export function inspect(graph: LayoutGraph, nodeId: string, options: LayoutOptions): string[] {
  const card = cardIndex(graph).get(nodeId);
  if (!card) throw new Error(`Unknown node "${nodeId}"`);
  const metrics = measure(graph, options);

  if (card.kind !== 'card') {
    return [
      `${card.id}  ${card.kind}  y=${card.y}  fixed obstacle`,
      `  ${conflictsLine(graph, metrics, nodeId)}`
    ];
  }

  const ids = (handles: Array<{ portId: string }>) =>
    handles.map((h) => h.portId).join(', ') || '—';
  const lines = [
    `${card.id}  y=${card.y}  inputs: ${ids(card.inputs)}  outputs: ${ids(card.outputs)}`
  ];

  const mine = metrics.wires.filter((p) => p.wire.source === nodeId || p.wire.target === nodeId);
  const pad = Math.max(
    0,
    ...mine.map((p) => (p.wire.target === nodeId ? p.wire.targetPort : p.wire.sourcePort).length)
  );
  const crossingsOf = (wireId: string): string[] =>
    metrics.crossings
      .filter((c) => c.a === wireId || c.b === wireId)
      .map((c) => {
        const other = metrics.wires.find((p) => p.wire.id === (c.a === wireId ? c.b : c.a));
        return other ? wireLabel(other.wire) : '';
      })
      .filter(Boolean);

  for (const path of mine) {
    const { wire } = path;
    const incoming = wire.target === nodeId;
    const head = incoming
      ? `in  ${wire.targetPort.padEnd(pad)} ← ${wire.source}.${wire.sourcePort}`
      : `out ${wire.sourcePort.padEnd(pad)} → ${wire.target}.${wire.targetPort}`;
    const gap = Math.abs(path.sy - path.ty);
    const level = gap < 0.5;
    let state: string;
    if (wire.loopback) state = 'loopback';
    else if (path.tx < path.sx) state = level ? 'backward' : `backward, off by ${gap}`;
    else state = level ? 'straight' : `off by ${gap}`;
    const crosses = crossingsOf(wire.id);
    lines.push(`  ${head}   ${state}${crosses.length ? `   crosses ${crosses.join(', ')}` : ''}`);
  }
  lines.push(`  ${conflictsLine(graph, metrics, nodeId)}`);
  return lines;
}
