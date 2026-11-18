/**
 * Duplicate a node: the one builder behind the canvas "Duplicate" action and
 * the `duplicate` command. Same type, label and a copy of the config and
 * metadata, offset down-right by two grid cells; wires and interface bindings
 * are not copied.
 *
 * @module utils/duplicateNode
 */

import type { NodeMetadata, WorkflowNode } from '$lib/types/index.js';
import { generateNodeId } from '$lib/utils/nodeIds.js';

/** A deep copy that survives a reactive proxy, which `structuredClone` refuses. */
export function cloneJson<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

/** What a copy of a node carries: label, config and metadata, none shared with the source. */
export interface DuplicateNodeData {
  label: string;
  config: Record<string, unknown>;
  metadata: NodeMetadata;
}

/** The copied data, or `null` for a node with no type (it cannot be duplicated). */
export function duplicateNodeData(source: Pick<WorkflowNode, 'data'>): DuplicateNodeData | null {
  const metadata = source.data?.metadata;
  if (!metadata) return null;
  return {
    label: source.data.label,
    config: cloneJson(source.data.config ?? {}),
    metadata: cloneJson(metadata)
  };
}

/** Where a copy lands: two grid cells down and right of its source. */
export function duplicatePosition(
  source: Pick<WorkflowNode, 'position'>,
  gridSize: number
): { x: number; y: number } {
  const offset = gridSize * 2;
  return { x: source.position.x + offset, y: source.position.y + offset };
}

/** The copy as a new node with a fresh id, or `null` when the source cannot be duplicated. */
export function buildDuplicateNode(
  source: WorkflowNode,
  existingNodes: WorkflowNode[],
  gridSize: number
): WorkflowNode | null {
  const data = duplicateNodeData(source);
  if (!data) return null;
  return {
    id: generateNodeId(data.metadata.node_type_id, existingNodes),
    type: 'universalNode',
    position: duplicatePosition(source, gridSize),
    deletable: true,
    data
  };
}
