/**
 * Compare two versions of a workflow: yours and the saved one.
 *
 * Pure. Steps (nodes) match by id, wires (edges) by their four endpoints.
 */

import { nodeCanvasLabel } from './workflowInterface.js';
import type { Workflow, WorkflowNode, WorkflowEdge } from '$lib/types/index.js';

export interface WorkflowComparison {
  name?: { mine: string; theirs: string };
  description?: { mine: string | undefined; theirs: string | undefined };
  nodesOnlyMine: { id: string; label: string }[];
  nodesOnlyTheirs: { id: string; label: string }[];
  nodesChanged: { id: string; label: string; what: ('settings' | 'label' | 'position')[] }[];
  edgesOnlyMine: number;
  edgesOnlyTheirs: number;
  interfaceChanged: boolean;
  chatChanged: boolean;
  same: boolean;
}

/** JSON with object keys sorted at every depth, so key order never counts as a change. */
function stable(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, (v as Record<string, unknown>)[k]])
      );
    }
    return v;
  });
}

function nodeLabel(node: WorkflowNode): string {
  return nodeCanvasLabel(node);
}

function edgeKey(edge: WorkflowEdge): string {
  return [edge.source, edge.sourceHandle ?? '', edge.target, edge.targetHandle ?? ''].join(
    '\u0000'
  );
}

function countOnlyIn(from: WorkflowEdge[], other: WorkflowEdge[]): number {
  const keys = new Set(other.map(edgeKey));
  return from.filter((e) => !keys.has(edgeKey(e))).length;
}

export function compareWorkflows(mine: Workflow, theirs: Workflow): WorkflowComparison {
  const myNodes = new Map((mine.nodes ?? []).map((n) => [n.id, n]));
  const theirNodes = new Map((theirs.nodes ?? []).map((n) => [n.id, n]));

  const nodesOnlyMine = [...myNodes.values()]
    .filter((n) => !theirNodes.has(n.id))
    .map((n) => ({ id: n.id, label: nodeLabel(n) }));
  const nodesOnlyTheirs = [...theirNodes.values()]
    .filter((n) => !myNodes.has(n.id))
    .map((n) => ({ id: n.id, label: nodeLabel(n) }));

  const nodesChanged: WorkflowComparison['nodesChanged'] = [];
  for (const [id, a] of myNodes) {
    const b = theirNodes.get(id);
    if (!b) continue;
    const what: ('settings' | 'label' | 'position')[] = [];
    if (stable(a.data?.config) !== stable(b.data?.config)) what.push('settings');
    if ((a.data?.label ?? '') !== (b.data?.label ?? '')) what.push('label');
    if (
      Math.abs((a.position?.x ?? 0) - (b.position?.x ?? 0)) > 1 ||
      Math.abs((a.position?.y ?? 0) - (b.position?.y ?? 0)) > 1
    ) {
      what.push('position');
    }
    if (what.length > 0) nodesChanged.push({ id, label: nodeLabel(a), what });
  }

  const edgesOnlyMine = countOnlyIn(mine.edges ?? [], theirs.edges ?? []);
  const edgesOnlyTheirs = countOnlyIn(theirs.edges ?? [], mine.edges ?? []);
  const interfaceChanged = stable(mine.interface) !== stable(theirs.interface);
  const chatChanged = stable(mine.playground) !== stable(theirs.playground);

  const result: WorkflowComparison = {
    nodesOnlyMine,
    nodesOnlyTheirs,
    nodesChanged,
    edgesOnlyMine,
    edgesOnlyTheirs,
    interfaceChanged,
    chatChanged,
    same: false
  };
  if (mine.name !== theirs.name) result.name = { mine: mine.name, theirs: theirs.name };
  if ((mine.description ?? '') !== (theirs.description ?? '')) {
    result.description = { mine: mine.description, theirs: theirs.description };
  }
  result.same =
    !result.name &&
    !result.description &&
    nodesOnlyMine.length === 0 &&
    nodesOnlyTheirs.length === 0 &&
    nodesChanged.length === 0 &&
    edgesOnlyMine === 0 &&
    edgesOnlyTheirs === 0 &&
    !interfaceChanged &&
    !chatChanged;
  return result;
}
