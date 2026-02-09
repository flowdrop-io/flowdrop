/**
 * Proximity Connect Helper
 *
 * Provides type-aware proximity connect logic for the workflow editor.
 * When a node is dragged near another node, this helper finds the best
 * compatible port pair and creates a preview/permanent edge.
 */

import type {
	WorkflowNode as WorkflowNodeType,
	WorkflowEdge,
	NodePort,
	DynamicPort
} from '../types/index.js';
import { dynamicPortToNodePort } from '../types/index.js';
import { getPortCompatibilityChecker } from '../utils/connections.js';
import { v4 as uuidv4 } from 'uuid';

/** A candidate proximity edge before it is finalized */
export interface ProximityEdgeCandidate {
	id: string;
	source: string;
	target: string;
	sourceHandle: string;
	targetHandle: string;
	sourcePortDataType: string;
	targetPortDataType: string;
}

/** CSS class applied to proximity preview edges */
const PROXIMITY_EDGE_CLASS = 'flowdrop--edge--proximity-preview';

export class ProximityConnectHelper {
	/**
	 * Get ALL ports (static + dynamic + gateway branches) for a node.
	 */
	static getAllPorts(node: WorkflowNodeType, direction: 'input' | 'output'): NodePort[] {
		// Static ports from metadata
		const staticPorts: NodePort[] =
			direction === 'output'
				? (node.data?.metadata?.outputs ?? [])
				: (node.data?.metadata?.inputs ?? []);

		// Dynamic ports from config
		const dynamicKey = direction === 'output' ? 'dynamicOutputs' : 'dynamicInputs';
		const rawDynamic = (node.data?.config?.[dynamicKey] as DynamicPort[] | undefined) ?? [];
		const dynamicPorts: NodePort[] = rawDynamic.map((p) => dynamicPortToNodePort(p, direction));

		// Gateway branches (output only, dataType = 'trigger')
		if (direction === 'output') {
			const branches = node.data?.config?.branches as Array<{ name: string }> | undefined;
			const nodeType = node.data?.metadata?.type || node.type;
			if (nodeType === 'gateway' && branches?.length) {
				const branchPorts: NodePort[] = branches
					.filter((b) => !staticPorts.some((sp) => sp.id === b.name))
					.map((b) => ({
						id: b.name,
						name: b.name,
						type: 'output' as const,
						dataType: 'trigger'
					}));
				return [...staticPorts, ...dynamicPorts, ...branchPorts];
			}
		}

		return [...staticPorts, ...dynamicPorts];
	}

	/**
	 * Build handle ID in the standard format.
	 */
	static buildHandleId(nodeId: string, direction: 'input' | 'output', portId: string): string {
		return `${nodeId}-${direction}-${portId}`;
	}

	/**
	 * Calculate center-to-center Euclidean distance between two nodes.
	 */
	static getNodeDistance(
		nodeA: {
			position: { x: number; y: number };
			measured?: { width?: number; height?: number };
		},
		nodeB: {
			position: { x: number; y: number };
			measured?: { width?: number; height?: number };
		}
	): number {
		const ax = nodeA.position.x + (nodeA.measured?.width ?? 0) / 2;
		const ay = nodeA.position.y + (nodeA.measured?.height ?? 0) / 2;
		const bx = nodeB.position.x + (nodeB.measured?.width ?? 0) / 2;
		const by = nodeB.position.y + (nodeB.measured?.height ?? 0) / 2;
		return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
	}

	/**
	 * Find the single best compatible edge between a dragged node and nearby nodes.
	 *
	 * Algorithm:
	 * 1. Find the closest node within minDistance
	 * 2. Check both directions (dragged->nearby and nearby->dragged)
	 * 3. Return the first exact-type match, or first compatible match
	 * 4. Skip pairs where an edge already exists or input handle is already connected
	 *
	 * @returns Array with at most ONE ProximityEdgeCandidate
	 */
	static findCompatibleEdges(
		draggedNode: WorkflowNodeType,
		allNodes: WorkflowNodeType[],
		existingEdges: WorkflowEdge[],
		minDistance: number
	): ProximityEdgeCandidate[] {
		const checker = getPortCompatibilityChecker();

		// Build lookup sets for O(1) duplicate/connected checks
		const existingEdgeSet = new Set(
			existingEdges.map((e) => `${e.source}:${e.sourceHandle}->${e.target}:${e.targetHandle}`)
		);
		const connectedTargetHandles = new Set(
			existingEdges.map((e) => `${e.target}:${e.targetHandle}`)
		);

		// Find the closest node within distance
		let closestNode: WorkflowNodeType | null = null;
		let closestDistance = Infinity;

		for (const node of allNodes) {
			if (node.id === draggedNode.id) continue;
			const dist = this.getNodeDistance(draggedNode, node);
			if (dist < minDistance && dist < closestDistance) {
				closestDistance = dist;
				closestNode = node;
			}
		}

		if (!closestNode) return [];

		const draggedOutputs = this.getAllPorts(draggedNode, 'output');
		const draggedInputs = this.getAllPorts(draggedNode, 'input');
		const nearbyInputs = this.getAllPorts(closestNode, 'input');
		const nearbyOutputs = this.getAllPorts(closestNode, 'output');

		// Collect all compatible pairs, then pick the best one
		let exactMatch: ProximityEdgeCandidate | null = null;
		let compatibleMatch: ProximityEdgeCandidate | null = null;

		// Direction A: dragged (source) -> nearby (target)
		for (const outPort of draggedOutputs) {
			for (const inPort of nearbyInputs) {
				if (!checker.areDataTypesCompatible(outPort.dataType, inPort.dataType)) continue;

				const sourceHandle = this.buildHandleId(draggedNode.id, 'output', outPort.id);
				const targetHandle = this.buildHandleId(closestNode.id, 'input', inPort.id);
				const edgeKey = `${draggedNode.id}:${sourceHandle}->${closestNode.id}:${targetHandle}`;
				const targetHandleKey = `${closestNode.id}:${targetHandle}`;

				if (existingEdgeSet.has(edgeKey)) continue;
				if (connectedTargetHandles.has(targetHandleKey)) continue;

				const candidate: ProximityEdgeCandidate = {
					id: `proximity-${uuidv4()}`,
					source: draggedNode.id,
					target: closestNode.id,
					sourceHandle,
					targetHandle,
					sourcePortDataType: outPort.dataType,
					targetPortDataType: inPort.dataType
				};

				if (outPort.dataType === inPort.dataType) {
					if (!exactMatch) exactMatch = candidate;
				} else {
					if (!compatibleMatch) compatibleMatch = candidate;
				}

				// Early exit if we found an exact match
				if (exactMatch) break;
			}
			if (exactMatch) break;
		}

		// Direction B: nearby (source) -> dragged (target)
		if (!exactMatch) {
			for (const outPort of nearbyOutputs) {
				for (const inPort of draggedInputs) {
					if (!checker.areDataTypesCompatible(outPort.dataType, inPort.dataType)) continue;

					const sourceHandle = this.buildHandleId(closestNode.id, 'output', outPort.id);
					const targetHandle = this.buildHandleId(draggedNode.id, 'input', inPort.id);
					const edgeKey = `${closestNode.id}:${sourceHandle}->${draggedNode.id}:${targetHandle}`;
					const targetHandleKey = `${draggedNode.id}:${targetHandle}`;

					if (existingEdgeSet.has(edgeKey)) continue;
					if (connectedTargetHandles.has(targetHandleKey)) continue;

					const candidate: ProximityEdgeCandidate = {
						id: `proximity-${uuidv4()}`,
						source: closestNode.id,
						target: draggedNode.id,
						sourceHandle,
						targetHandle,
						sourcePortDataType: outPort.dataType,
						targetPortDataType: inPort.dataType
					};

					if (outPort.dataType === inPort.dataType) {
						if (!exactMatch) exactMatch = candidate;
					} else {
						if (!compatibleMatch) compatibleMatch = candidate;
					}

					if (exactMatch) break;
				}
				if (exactMatch) break;
			}
		}

		const best = exactMatch ?? compatibleMatch;
		return best ? [best] : [];
	}

	/**
	 * Convert candidates to temporary (preview) WorkflowEdge objects with dashed styling.
	 */
	static createPreviewEdges(candidates: ProximityEdgeCandidate[]): WorkflowEdge[] {
		return candidates.map((c) => ({
			id: c.id,
			source: c.source,
			target: c.target,
			sourceHandle: c.sourceHandle,
			targetHandle: c.targetHandle,
			class: PROXIMITY_EDGE_CLASS,
			style: 'stroke-dasharray: 5 5; opacity: 0.6;',
			animated: true,
			selectable: false,
			deletable: false,
			data: {
				metadata: {
					edgeType: 'data' as const,
					sourcePortDataType: c.sourcePortDataType,
					isProximityPreview: true
				}
			}
		}));
	}

	/**
	 * Convert candidates to permanent WorkflowEdge objects.
	 */
	static createPermanentEdges(candidates: ProximityEdgeCandidate[]): WorkflowEdge[] {
		return candidates.map((c) => ({
			id: uuidv4(),
			source: c.source,
			target: c.target,
			sourceHandle: c.sourceHandle,
			targetHandle: c.targetHandle
		}));
	}

	/**
	 * Check if an edge is a temporary proximity preview edge.
	 */
	static isProximityPreviewEdge(edge: WorkflowEdge): boolean {
		return (
			edge.id.startsWith('proximity-') ||
			(edge.data?.metadata as Record<string, unknown>)?.isProximityPreview === true
		);
	}

	/**
	 * Remove all proximity preview edges from an edge array.
	 */
	static removePreviewEdges(edges: WorkflowEdge[]): WorkflowEdge[] {
		return edges.filter((e) => !this.isProximityPreviewEdge(e));
	}
}
