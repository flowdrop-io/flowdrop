/**
 * Maps the Doctor's remedy operations onto the editor's workflow.
 *
 * Pure: it never touches a store. `applyDoctorOperations` validates every
 * operation first and applies them, in order, to a copy; it either answers the
 * whole result or a refusal, so a remedy is never half applied. The caller then
 * commits the result with ONE store update, which is one undo step.
 *
 * @module utils/doctorOperations
 */

import type { Workflow, WorkflowEdge, WorkflowNode } from '../types/index.js';
import type { DoctorOperation } from '../types/doctor.js';

/** The workflow-level payload keys a `setWorkflowPayload` may address. */
const PAYLOAD_KEYS = ['playground'] as const;

export interface DoctorApplyInput {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export type DoctorApplyResult =
  | {
      ok: true;
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      /** Present only when an operation set it. */
      interface?: Workflow['interface'];
      playground?: Workflow['playground'];
      /** Which of the optional parts an operation set (a cleared one is `undefined` but changed). */
      touched: { interface: boolean; playground: boolean };
    }
  | { ok: false; reason: 'unknown-op' | 'bad-op' | 'missing-target'; message: string };

type Bag = Record<string, unknown>;

/**
 * Deep copy of plain data. Works on Svelte `$state` proxies too, which
 * `structuredClone` refuses.
 */
function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as T;
  if (isObject(value)) {
    const out: Bag = {};
    for (const key of Object.keys(value)) out[key] = clone(value[key]);
    return out as T;
  }
  return value;
}

const isObject = (value: unknown): value is Bag =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value !== '';
const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

/** `{patch, unset}` as the vocabulary sends them (`unset` may be left out). */
function patchOf(op: Bag): { patch: Bag; unset: string[] } | null {
  const patch = op.patch ?? {};
  const unset = op.unset ?? [];
  if (!isObject(patch) || !isStringList(unset)) return null;
  return { patch, unset };
}

/** Whether an operation has the fields its kind needs. */
function isWellFormed(op: Bag): boolean {
  switch (op.op) {
    case 'removeEdge':
      return isString(op.edgeId);
    case 'removeNode':
      return isString(op.nodeId);
    case 'addNode':
      return isObject(op.node) && isString(op.node.id);
    case 'addEdge':
      return isObject(op.edge) && isString(op.edge.id);
    case 'updateNodeConfig':
    case 'updateNodeData':
    case 'updateNode':
      return isString(op.nodeId) && patchOf(op) !== null;
    case 'updateEdge':
      return isString(op.edgeId) && patchOf(op) !== null;
    case 'setInterface':
      return isObject(op.interface);
    case 'setWorkflowPayload':
      return isString(op.key);
    default:
      return false;
  }
}

const KNOWN = new Set([
  'removeEdge',
  'removeNode',
  'addNode',
  'updateNodeConfig',
  'updateNodeData',
  'updateNode',
  'updateEdge',
  'addEdge',
  'setInterface',
  'setWorkflowPayload'
]);

/** Index of an `#<n>` address (an item the draft carried without an id), else -1. */
function indexAddress(id: string): number {
  const match = /^#(\d+)$/.exec(id);
  return match ? Number(match[1]) : -1;
}

function find<T extends { id?: string }>(list: T[], id: string): number {
  const at = indexAddress(id);
  if (at !== -1) return at < list.length ? at : -1;
  return list.findIndex((item) => item.id === id);
}

function assign(target: Bag, { patch, unset }: { patch: Bag; unset: string[] }): void {
  for (const key of unset) delete target[key];
  Object.assign(target, patch);
}

/**
 * Apply a remedy's operations to a copy of `input`.
 *
 * Refuses, without applying anything, when an operation is not in the
 * vocabulary, is malformed, names a node or edge the workflow does not have, or
 * addresses a payload key the editor does not know.
 */
export function applyDoctorOperations(
  input: DoctorApplyInput,
  operations: unknown
): DoctorApplyResult {
  if (!Array.isArray(operations)) {
    return {
      ok: false,
      reason: 'bad-op',
      message: 'The remedy did not answer a list of operations.'
    };
  }
  // Validate all first: an unknown operation anywhere aborts the whole remedy.
  for (const raw of operations) {
    const name = isObject(raw) ? raw.op : undefined;
    if (typeof name !== 'string' || !KNOWN.has(name)) {
      return {
        ok: false,
        reason: 'unknown-op',
        message: `Unknown operation "${String(name)}".`
      };
    }
    if (!isWellFormed(raw as Bag)) {
      return { ok: false, reason: 'bad-op', message: `Malformed operation "${name}".` };
    }
  }

  // Copy on write: only a node or edge an operation touches is cloned, so the
  // others keep their identity (the canvas does not re-measure them).
  const nodes = [...input.nodes];
  const edges = [...input.edges];
  const ownNodes = new Set<WorkflowNode>();
  const ownEdges = new Set<WorkflowEdge>();
  const ownNode = (at: number): WorkflowNode => {
    if (!ownNodes.has(nodes[at])) {
      nodes[at] = clone(nodes[at]);
      ownNodes.add(nodes[at]);
    }
    return nodes[at];
  };
  const ownEdge = (at: number): WorkflowEdge => {
    if (!ownEdges.has(edges[at])) {
      edges[at] = clone(edges[at]);
      ownEdges.add(edges[at]);
    }
    return edges[at];
  };
  let next: Workflow['interface'] = undefined;
  let playground: Workflow['playground'] = undefined;
  const touched = { interface: false, playground: false };

  const missing = (what: string, id: string): DoctorApplyResult => ({
    ok: false,
    reason: 'missing-target',
    message: `The workflow has no ${what} "${id}".`
  });

  for (const raw of operations as DoctorOperation[]) {
    switch (raw.op) {
      case 'removeEdge': {
        const at = find(edges, raw.edgeId);
        if (at === -1) return missing('edge', raw.edgeId);
        edges.splice(at, 1);
        break;
      }
      case 'removeNode': {
        const at = find(nodes, raw.nodeId);
        if (at === -1) return missing('node', raw.nodeId);
        nodes.splice(at, 1);
        break;
      }
      case 'addNode':
        nodes.push(clone(raw.node));
        break;
      case 'addEdge':
        edges.push(clone(raw.edge));
        break;
      case 'updateNodeConfig': {
        const at = find(nodes, raw.nodeId);
        if (at === -1) return missing('node', raw.nodeId);
        const node = ownNode(at);
        const config = { ...(node.data.config as Bag | undefined) };
        assign(config, patchOf(raw as unknown as Bag)!);
        node.data = { ...node.data, config };
        break;
      }
      case 'updateNodeData': {
        const at = find(nodes, raw.nodeId);
        if (at === -1) return missing('node', raw.nodeId);
        const node = ownNode(at);
        const data = { ...node.data } as Bag;
        assign(data, patchOf(raw as unknown as Bag)!);
        // `config` has its own operation; a data update never replaces it.
        data.config = node.data.config;
        node.data = data as WorkflowNode['data'];
        break;
      }
      case 'updateNode': {
        const at = find(nodes, raw.nodeId);
        if (at === -1) return missing('node', raw.nodeId);
        const node = ownNode(at);
        const data = node.data;
        assign(node as unknown as Bag, patchOf(raw as unknown as Bag)!);
        // `data` has its own operations; a node update never replaces it.
        node.data = data;
        break;
      }
      case 'updateEdge': {
        const at = find(edges, raw.edgeId);
        if (at === -1) return missing('edge', raw.edgeId);
        assign(ownEdge(at) as unknown as Bag, patchOf(raw as unknown as Bag)!);
        break;
      }
      case 'setInterface':
        next = clone(raw.interface);
        touched.interface = true;
        break;
      case 'setWorkflowPayload': {
        if (!(PAYLOAD_KEYS as readonly string[]).includes(raw.key)) {
          return {
            ok: false,
            reason: 'bad-op',
            message: `The editor does not know the workflow key "${raw.key}".`
          };
        }
        playground = raw.value === null ? undefined : (clone(raw.value) as Workflow['playground']);
        touched.playground = true;
        break;
      }
    }
  }

  return {
    ok: true,
    nodes,
    edges,
    ...(touched.interface && { interface: next }),
    ...(touched.playground && { playground }),
    touched
  };
}
