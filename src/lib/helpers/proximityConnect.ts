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
	DynamicPort,
	PortCoordinate,
	PortCoordinateMap
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
	 * Calculate center-to-center distance between two nodes.
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
		const aCenterX = nodeA.position.x + (nodeA.measured?.width ?? 0) / 2;
		const aCenterY = nodeA.position.y + (nodeA.measured?.height ?? 0) / 2;
		const bCenterX = nodeB.position.x + (nodeB.measured?.width ?? 0) / 2;
		const bCenterY = nodeB.position.y + (nodeB.measured?.height ?? 0) / 2;

		const dx = aCenterX - bCenterX;
		const dy = aCenterY - bCenterY;

		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * Find the single best compatible edge between a dragged node and nearby nodes.
	 *
	 * Algorithm:
	 * 1. Find the closest node within minDistance (edge-to-edge)
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
	 * Find the single best compatible edge using port-to-port distance.
	 *
	 * Unlike findCompatibleEdges() which uses node center distance,
	 * this method compares actual handle positions from the port coordinate store.
	 * This is more accurate for large nodes or nodes with many ports.
	 *
	 * Algorithm:
	 * 1. Partition ports by owner (dragged vs other) and direction (input vs output)
	 * 2. Group other-node ports by dataType for O(1) lookup of compatible groups
	 * 3. For each dragged port, only iterate compatible dataType groups
	 * 4. Return the closest compatible pair (exact type match preferred)
	 *
	 * @returns Array with at most ONE ProximityEdgeCandidate
	 */
	static findCompatibleEdgesByPortCoordinates(
		draggedNodeId: string,
		portCoordinates: PortCoordinateMap,
		existingEdges: WorkflowEdge[],
		maxDistance: number
	): ProximityEdgeCandidate[] {
		const checker = getPortCompatibilityChecker();

		// Build lookup sets for O(1) duplicate/connected checks
		const existingEdgeSet = new Set(
			existingEdges.map((e) => `${e.source}:${e.sourceHandle}->${e.target}:${e.targetHandle}`)
		);
		const connectedTargetHandles = new Set(
			existingEdges.map((e) => `${e.target}:${e.targetHandle}`)
		);

		// Partition ports by owner and direction, group other-node ports by dataType
		const draggedOutputs: PortCoordinate[] = [];
		const draggedInputs: PortCoordinate[] = [];
		const otherInputsByType = new Map<string, PortCoordinate[]>();
		const otherOutputsByType = new Map<string, PortCoordinate[]>();

		for (const coord of portCoordinates.values()) {
			if (coord.nodeId === draggedNodeId) {
				if (coord.direction === 'output') draggedOutputs.push(coord);
				else draggedInputs.push(coord);
			} else {
				const groupMap = coord.direction === 'input' ? otherInputsByType : otherOutputsByType;
				let group = groupMap.get(coord.dataType);
				if (!group) {
					group = [];
					groupMap.set(coord.dataType, group);
				}
				group.push(coord);
			}
		}

		let bestCandidate: ProximityEdgeCandidate | null = null;
		let bestDistance = Infinity;
		let bestIsExact = false;

		const evaluatePair = (sourceCoord: PortCoordinate, targetCoord: PortCoordinate) => {
			// Check for existing edge
			const edgeKey = `${sourceCoord.nodeId}:${sourceCoord.handleId}->${targetCoord.nodeId}:${targetCoord.handleId}`;
			if (existingEdgeSet.has(edgeKey)) return;

			// Check target handle not already connected (single-input rule)
			const targetHandleKey = `${targetCoord.nodeId}:${targetCoord.handleId}`;
			if (connectedTargetHandles.has(targetHandleKey)) return;

			// Calculate port-to-port distance
			const dx = sourceCoord.x - targetCoord.x;
			const dy = sourceCoord.y - targetCoord.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist > maxDistance) return;

			const isExact = sourceCoord.dataType === targetCoord.dataType;

			// Prefer exact match, then closest distance
			if ((isExact && !bestIsExact) || (isExact === bestIsExact && dist < bestDistance)) {
				bestCandidate = {
					id: `proximity-${uuidv4()}`,
					source: sourceCoord.nodeId,
					target: targetCoord.nodeId,
					sourceHandle: sourceCoord.handleId,
					targetHandle: targetCoord.handleId,
					sourcePortDataType: sourceCoord.dataType,
					targetPortDataType: targetCoord.dataType
				};
				bestDistance = dist;
				bestIsExact = isExact;
			}
		};

		// Direction A: dragged outputs → other inputs (only compatible types)
		for (const srcPort of draggedOutputs) {
			const compatibleTypes = checker.getCompatibleTypes(srcPort.dataType);
			for (const targetType of compatibleTypes) {
				const targets = otherInputsByType.get(targetType);
				if (!targets) continue;
				for (const tgtPort of targets) {
					evaluatePair(srcPort, tgtPort);
				}
			}
		}

		// Direction B: other outputs → dragged inputs (only compatible types)
		for (const tgtPort of draggedInputs) {
			for (const [srcType, sources] of otherOutputsByType) {
				if (!checker.areDataTypesCompatible(srcType, tgtPort.dataType)) continue;
				for (const srcPort of sources) {
					evaluatePair(srcPort, tgtPort);
				}
			}
		}

		return bestCandidate ? [bestCandidate] : [];
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
