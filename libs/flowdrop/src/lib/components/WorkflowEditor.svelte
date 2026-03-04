<!--
  Workflow Editor Component
  Main workflow editor with sidebar and flow canvas
  Styled with BEM syntax
-->

<script lang="ts">
	import {
		SvelteFlow,
		ConnectionLineType,
		Controls,
		Background,
		BackgroundVariant,
		MiniMap,
		SvelteFlowProvider,
		type ColorMode
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { getResolvedTheme, getEditorSettings, getBehaviorSettings } from '../stores/settingsStore.svelte.js';
	import type {
		WorkflowNode as WorkflowNodeType,
		NodeMetadata,
		Workflow,
		WorkflowEdge
	} from '../types/index.js';
	import CanvasBanner from './CanvasBanner.svelte';
	import FlowDropZone from './FlowDropZone.svelte';
	import EdgeRefresher from './EdgeRefresher.svelte';
	import { tick } from 'svelte';
	import type { EndpointConfig } from '../config/endpoints.js';
	import ConnectionLine from './ConnectionLine.svelte';
	import { getWorkflowStore, workflowActions } from '../stores/workflowStore.svelte.js';
	import { historyActions, setOnRestoreCallback } from '../stores/historyStore.svelte.js';
	import UniversalNode from './UniversalNode.svelte';
	import {
		EdgeStylingHelper,
		NodeOperationsHelper,
		WorkflowOperationsHelper,
		ConfigurationHelper
	} from '../helpers/workflowEditorHelper.js';
	import type { NodeExecutionInfo } from '../types/index.js';
	import { throttle } from '../utils/performanceUtils.js';
	import { Toaster } from 'svelte-5-french-toast';
	import { flowdropToastOptions, FLOWDROP_TOASTER_CLASS, apiToasts } from '../services/toastService.js';
	import {
		ProximityConnectHelper,
		type ProximityEdgeCandidate
	} from '../helpers/proximityConnect.js';
	import PortCoordinateTracker from './PortCoordinateTracker.svelte';
	import { getPortCoordinateSnapshot } from '../stores/portCoordinateStore.svelte.js';
	import { logger } from '../utils/logger.js';
	import { validateWorkflowData } from '../utils/validation.js';

	interface Props {
		nodes?: NodeMetadata[];
		endpointConfig?: EndpointConfig;
		height?: string | number;
		width?: string | number;
		isConfigSidebarOpen?: boolean;
		selectedNodeForConfig?: WorkflowNodeType | null;
		openConfigSidebar?: (node: WorkflowNodeType) => void;
		closeConfigSidebar?: () => void;
		// New configuration options for pipeline status mode
		lockWorkflow?: boolean;
		readOnly?: boolean;
		nodeStatuses?: Record<string, 'pending' | 'running' | 'completed' | 'error'>;
		// Pipeline ID for fetching node execution info from jobs
		pipelineId?: string;
	}

	let props: Props = $props();

	// Create a local currentWorkflow variable that we can control directly
	// Must be $state.raw to prevent deep proxy leaking into flowNodes/flowEdges
	// (SvelteFlow mutates node internals during drag, which triggers the proxy
	// and creates an infinite reactive loop if currentWorkflow is deep-proxied)
	let currentWorkflow = $state.raw<Workflow | null>(null);

	// Track if we're currently dragging a node (for history debouncing)
	let isDraggingNode = $state(false);

	// Proximity connect state
	let currentProximityCandidates = $state<ProximityEdgeCandidate[]>([]);

	// Port coordinate tracker state
	let portCoordNodeToUpdate = $state<WorkflowNodeType | null>(null);
	let portCoordRebuildTrigger = $state(0);

	// Track the workflow ID we're currently editing to detect workflow switches
	let currentWorkflowId: string | null = null;

	// Track the last store value written by this editor to distinguish
	// external programmatic changes from our own echoed writes
	let lastEditorStoreValue: Workflow | null = null;

	// Initialize currentWorkflow from global store
	// Sync on workflow ID change (new workflow loaded) or external programmatic changes
	$effect(() => {
		const storeValue = getWorkflowStore();
		if (storeValue) {
			const storeWorkflowId = storeValue.id;

			if (currentWorkflowId !== storeWorkflowId) {
				// New workflow loaded
				currentWorkflow = storeValue;
				currentWorkflowId = storeWorkflowId;
				lastEditorStoreValue = null;
			} else if (storeValue !== lastEditorStoreValue) {
				// External programmatic change (e.g. addEdge, updateNode, updateEdges)
				// The store value differs from what this editor last wrote, so sync it
				currentWorkflow = storeValue;
			}
		} else if (currentWorkflow !== null) {
			// Store was cleared
			currentWorkflow = null;
			currentWorkflowId = null;
		}
	});

	// Set up the history restore callback to update workflow when undo/redo is triggered
	$effect(() => {
		setOnRestoreCallback((restoredWorkflow: Workflow) => {
			// Directly update local state (bypass store sync effect)
			currentWorkflow = restoredWorkflow;
			// Also update the store without triggering history
			workflowActions.restoreFromHistory(restoredWorkflow);
			// Read back the proxy so sync effect identity check works
			lastEditorStoreValue = getWorkflowStore();
		});

		// Cleanup on unmount
		return () => {
			setOnRestoreCallback(null);
		};
	});

	// Create local reactive variables that sync with currentWorkflow
	let flowNodes = $state.raw<WorkflowNodeType[]>([]);
	let flowEdges = $state.raw<WorkflowEdge[]>([]);

	// Sync local state with currentWorkflow
	let loadExecutionInfoTimeout: number | null = null;
	let executionInfoAbortController: AbortController | null = null;
	// Track previous workflow ID to detect when we need to reload execution info
	let previousWorkflowId: string | null = null;
	let previousPipelineId: string | undefined = undefined;

	/**
	 * Key for SvelteFlow component - changes when workflow ID changes
	 * This forces SvelteFlow to remount with fresh state, allowing fitView to work correctly
	 */
	let svelteFlowKey = $derived(currentWorkflow?.id ?? 'default');

	/**
	 * Derive snap grid configuration from editor settings
	 * Returns [gridSize, gridSize] tuple when snapToGrid is enabled, undefined otherwise
	 */
	let snapGrid = $derived(
		getEditorSettings().snapToGrid
			? ([getEditorSettings().gridSize, getEditorSettings().gridSize] as [number, number])
			: undefined
	);

	/**
	 * Derive initial viewport configuration from editor settings
	 * Sets initial zoom level based on user preferences
	 */
	let initialViewport = $derived({
		zoom: getEditorSettings().defaultZoom,
		x: 0,
		y: 0
	});

	$effect(() => {
		if (currentWorkflow) {
			const nodesWithCallbacks = currentWorkflow.nodes.map((node) => ({
				...node,
				data: {
					...node.data,
					onConfigOpen: props.openConfigSidebar
				}
			}));
			flowNodes = nodesWithCallbacks;

			// Apply edge styling based on source port data type when loading workflow
			const styledEdges = EdgeStylingHelper.updateEdgeStyles(
				currentWorkflow.edges,
				nodesWithCallbacks
			);
			flowEdges = styledEdges;

			// Trigger port coordinate rebuild after workflow load
			// (PortCoordinateTracker will wait for SvelteFlow to render before reading handleBounds)
			// Note: Using Date.now() instead of ++ to avoid reading the old value,
			// which would make this effect depend on portCoordRebuildTrigger and loop.
			if (getEditorSettings().proximityConnect) {
				portCoordRebuildTrigger = Date.now();
			}

			// Only load execution info if we have a pipelineId (pipeline status mode)
			// and if the workflow or pipeline has changed
			const workflowChanged = currentWorkflow.id !== previousWorkflowId;
			const pipelineChanged = props.pipelineId !== previousPipelineId;

			if (props.pipelineId && (workflowChanged || pipelineChanged)) {
				// Cancel any pending timeout
				if (loadExecutionInfoTimeout) {
					clearTimeout(loadExecutionInfoTimeout);
					loadExecutionInfoTimeout = null;
				}

				// Cancel any in-flight request
				if (executionInfoAbortController) {
					executionInfoAbortController.abort();
					executionInfoAbortController = null;
				}

				// Update tracking variables
				previousWorkflowId = currentWorkflow.id;
				previousPipelineId = props.pipelineId;

				// Use requestIdleCallback for non-critical updates (falls back to setTimeout)
				if (typeof requestIdleCallback !== 'undefined') {
					loadExecutionInfoTimeout = requestIdleCallback(
						() => {
							loadNodeExecutionInfo();
						},
						{ timeout: 500 }
					) as unknown as number;
				} else {
					// Fallback to setTimeout with longer delay for better performance
					loadExecutionInfoTimeout = setTimeout(() => {
						loadNodeExecutionInfo();
					}, 300) as unknown as number;
				}
			}
		}
	});

	/**
	 * Throttled function to update the global store
	 * Reduces update frequency during rapid changes (e.g., node dragging)
	 * Uses 16ms throttle (~60fps) for smooth performance
	 */
	const updateGlobalStore = throttle((): void => {
		if (currentWorkflow) {
			workflowActions.updateWorkflow(currentWorkflow);
			// Read back the store value (which is a $state proxy) so that the
			// sync effect's identity check (storeValue !== lastEditorStoreValue)
			// correctly recognises our own writes and skips re-syncing.
			lastEditorStoreValue = getWorkflowStore();
		}
	}, 16);

	/**
	 * Load node execution information for all nodes in the workflow
	 * Optimized to reduce processing time and prevent blocking the main thread
	 */
	async function loadNodeExecutionInfo(): Promise<void> {
		if (!currentWorkflow?.nodes || !props.pipelineId) return;

		try {
			// Create abort controller for this request
			executionInfoAbortController = new AbortController();

			// Fetch execution info with abort signal
			const executionInfo = await NodeOperationsHelper.loadNodeExecutionInfo(
				currentWorkflow,
				props.pipelineId
			);

			// Check if request was aborted
			if (executionInfoAbortController?.signal.aborted) {
				return;
			}

			// Default execution info for nodes without data
			const defaultExecutionInfo: NodeExecutionInfo = {
				status: 'idle' as const,
				executionCount: 0,
				isExecuting: false
			};

			// Optimize: Single pass through nodes instead of multiple maps
			// This reduces processing time from ~100ms to ~10-20ms for large workflows
			const updatedNodes = currentWorkflow.nodes.map((node) => ({
				...node,
				data: {
					...node.data,
					executionInfo: executionInfo[node.id] || defaultExecutionInfo,
					onConfigOpen: props.openConfigSidebar
				}
			}));

			// Update state in a single operation (replace reference since currentWorkflow is $state.raw)
			flowNodes = updatedNodes;
			currentWorkflow = { ...currentWorkflow, nodes: updatedNodes };

			// Clear abort controller
			executionInfoAbortController = null;
		} catch (error) {
			// Only log if it's not an abort error
			if (error instanceof Error && error.name !== 'AbortError') {
				logger.error('Failed to load node execution info:', error);
			}
		}
	}

	// Function to update currentWorkflow when SvelteFlow changes nodes/edges
	function updateCurrentWorkflowFromSvelteFlow(): void {
		if (currentWorkflow) {
			currentWorkflow = WorkflowOperationsHelper.updateWorkflow(
				currentWorkflow,
				flowNodes,
				flowEdges
			);

			// Update the global store
			updateGlobalStore();
		}
	}

	// The global store should be initialized by the parent App component

	// Sidebar is now always visible - removed toggle functionality

	// Node types for Svelte Flow - using UniversalNode for all node types
	// All nodes use 'universalNode' type, and UniversalNode handles internal switching
	const nodeTypes = {
		universalNode: UniversalNode
	};

	// Handle arrows in our custom connection handler
	const defaultEdgeOptions = {};

	/**
	 * Handle node drag start
	 *
	 * Marks the beginning of a drag operation.
	 */
	function handleNodeDragStart(): void {
		isDraggingNode = true;
		// Clear any leftover proximity previews
		currentProximityCandidates = [];
	}

	/**
	 * Handle node drag - compute proximity connect preview edges
	 * Called continuously during drag if proximity connect is enabled.
	 * Uses port-to-port distance via the port coordinate store.
	 */
	function handleNodeDrag({
		targetNode
	}: {
		targetNode: WorkflowNodeType | null;
		nodes: WorkflowNodeType[];
		event: MouseEvent | TouchEvent;
	}): void {
		if (!getEditorSettings().proximityConnect || !targetNode || props.readOnly || props.lockWorkflow) {
			if (currentProximityCandidates.length > 0) {
				flowEdges = ProximityConnectHelper.removePreviewEdges(flowEdges);
				currentProximityCandidates = [];
			}
			portCoordNodeToUpdate = null;
			return;
		}

		// Update the dragged node's port coordinates (position changed during drag)
		portCoordNodeToUpdate = targetNode;

		// Remove previous preview edges
		const baseEdges = ProximityConnectHelper.removePreviewEdges(flowEdges);

		// Find the best compatible edge using port-to-port distance
		const portCoordinates = getPortCoordinateSnapshot();
		const candidates =
			portCoordinates.size > 0
				? ProximityConnectHelper.findCompatibleEdgesByPortCoordinates(
						targetNode.id,
						portCoordinates,
						baseEdges,
						getEditorSettings().proximityConnectDistance
					)
				: ProximityConnectHelper.findCompatibleEdges(
						targetNode,
						flowNodes,
						baseEdges,
						getEditorSettings().proximityConnectDistance
					);

		// Create preview edges
		const previews = ProximityConnectHelper.createPreviewEdges(candidates);

		// Update state
		currentProximityCandidates = candidates;
		flowEdges = [...baseEdges, ...previews];
	}

	/**
	 * Handle node drag stop
	 *
	 * Push the NEW state (after drag) to history.
	 * Undo will then restore to the previous state (before drag).
	 */
	function handleNodeDragStop(): void {
		isDraggingNode = false;
		portCoordNodeToUpdate = null;

		// Finalize proximity connect if there are candidates
		if (getEditorSettings().proximityConnect && currentProximityCandidates.length > 0) {
			// Remove all preview edges
			const baseEdges = ProximityConnectHelper.removePreviewEdges(flowEdges);

			// Create permanent edges from candidates
			const permanentEdges = ProximityConnectHelper.createPermanentEdges(
				currentProximityCandidates
			);

			// Apply proper styling to each new permanent edge
			for (const edge of permanentEdges) {
				const sourceNode = flowNodes.find((n) => n.id === edge.source);
				const targetNode = flowNodes.find((n) => n.id === edge.target);
				if (sourceNode && targetNode) {
					EdgeStylingHelper.applyConnectionStyling(edge, sourceNode, targetNode);
				}
			}

			// Set final edges
			flowEdges = [...baseEdges, ...permanentEdges];

			// Clear proximity state
			currentProximityCandidates = [];

			// Update workflow
			if (currentWorkflow) {
				updateCurrentWorkflowFromSvelteFlow();
			}
		} else {
			// No proximity connect — sync position changes from drag
			updateCurrentWorkflowFromSvelteFlow();
		}

		// Push the current state AFTER the drag completed
		if (currentWorkflow) {
			workflowActions.pushHistory('Move node', currentWorkflow);
		}
	}

	/**
	 * Handle new connections between nodes
	 * Let SvelteFlow handle edge creation, styling will be applied via reactive effects
	 */
	async function handleConnect(connection: {
		source: string;
		target: string;
		sourceHandle?: string;
		targetHandle?: string;
	}): Promise<void> {
		// SvelteFlow will automatically create the edge due to bind:edges
		// Wait for DOM update before applying styling
		await tick();

		// Apply styling to the new edge (including arrows)
		updateExistingEdgeStyles();

		// Update currentWorkflow with the new edge
		if (currentWorkflow) {
			updateCurrentWorkflowFromSvelteFlow();
		}

		// Push to history AFTER the connection is made
		// This way undo will restore to the state before the connection
		if (currentWorkflow) {
			workflowActions.pushHistory('Add connection', currentWorkflow);
		}
	}

	/**
	 * Handle before delete - show confirmation dialog if enabled in settings
	 *
	 * This callback is called before nodes/edges are deleted.
	 * Return true to proceed with deletion, false to cancel.
	 *
	 * @param params - Object containing nodes and edges to be deleted
	 * @returns Promise resolving to true if deletion should proceed, false to cancel
	 */
	async function handleBeforeDelete(params: {
		nodes: WorkflowNodeType[];
		edges: WorkflowEdge[];
	}): Promise<boolean> {
		// If confirmDelete setting is enabled, show confirmation dialog
		if (getBehaviorSettings().confirmDelete) {
			const nodeCount = params.nodes.length;
			const edgeCount = params.edges.length;

			// Build a descriptive message
			let message = 'Are you sure you want to delete ';
			const parts: string[] = [];

			if (nodeCount > 0) {
				parts.push(`${nodeCount} node${nodeCount > 1 ? 's' : ''}`);
			}
			if (edgeCount > 0) {
				parts.push(`${edgeCount} connection${edgeCount > 1 ? 's' : ''}`);
			}

			message += parts.join(' and ') + '?';

			// Show native confirmation dialog
			const confirmed = window.confirm(message);
			if (!confirmed) {
				return false;
			}
		}

		// Don't push to history here - we'll push AFTER deletion in handleNodesDelete
		// This ensures undo will restore the state before deletion
		return true;
	}

	/**
	 * Handle node deletion - automatically remove connected edges and push to history
	 */
	function handleNodesDelete(params: { nodes: WorkflowNodeType[]; edges: WorkflowEdge[] }): void {
		const deletedNodeIds = new Set(params.nodes.map((node) => node.id));

		// Filter out edges connected to deleted nodes
		flowEdges = flowEdges.filter(
			(edge) => !deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target)
		);

		// Update currentWorkflow
		if (currentWorkflow) {
			updateCurrentWorkflowFromSvelteFlow();
		}

		// Push to history AFTER the deletion so undo restores the previous state
		const nodeCount = params.nodes.length;
		const edgeCount = params.edges.length;
		let description = 'Delete';
		if (nodeCount > 0 && edgeCount > 0) {
			description = `Delete ${nodeCount} node${nodeCount > 1 ? 's' : ''} and ${edgeCount} connection${edgeCount > 1 ? 's' : ''}`;
		} else if (nodeCount > 0) {
			description = `Delete ${nodeCount} node${nodeCount > 1 ? 's' : ''}`;
		} else if (edgeCount > 0) {
			description = `Delete ${edgeCount} connection${edgeCount > 1 ? 's' : ''}`;
		}
		if (currentWorkflow) {
			workflowActions.pushHistory(description, currentWorkflow);
		}
	}

	/**
	 * Update existing edges with our custom styling rules
	 * This ensures all edges (including existing ones) follow our rules
	 */
	async function updateExistingEdgeStyles(): Promise<void> {
		// Wait for any pending DOM updates
		await tick();

		const updatedEdges = EdgeStylingHelper.updateEdgeStyles(flowEdges, flowNodes);

		// Update currentWorkflow with the styled edges
		if (currentWorkflow) {
			currentWorkflow = WorkflowOperationsHelper.updateWorkflow(
				currentWorkflow,
				flowNodes,
				updatedEdges
			);

			// Update the global store
			updateGlobalStore();
		}
	}

	// Edge styling will be handled when edges are first created or manually updated

	// Configure endpoints when props change
	$effect(() => {
		if (props.endpointConfig) {
			ConfigurationHelper.configureEndpoints(props.endpointConfig);
		}
	});

	/**
	 * Check if workflow has cycles
	 */
	function checkWorkflowCycles(): boolean {
		return WorkflowOperationsHelper.checkWorkflowCycles(flowNodes, flowEdges);
	}

	/**
	 * Handle drop event and add new node to canvas
	 * This will be called from the inner DropZone component
	 */
	async function handleNodeDrop(
		nodeTypeData: string,
		position: { x: number; y: number }
	): Promise<void> {
		// Create the node using the helper, passing existing nodes for ID generation
		const newNode = NodeOperationsHelper.createNodeFromDrop(nodeTypeData, position, flowNodes);

		if (newNode && currentWorkflow) {
			// Add the node first
			currentWorkflow = WorkflowOperationsHelper.addNode(currentWorkflow, newNode);

			// Update the global store
			updateGlobalStore();

			// Wait for DOM update to ensure SvelteFlow updates
			await tick();

			// Push to history AFTER adding the node
			// This way undo will restore to the state before the add
			workflowActions.pushHistory('Add node', currentWorkflow);
		} else if (!currentWorkflow) {
			logger.warn('No currentWorkflow available for new node');
		}
	}

	/**
	 * Handle a workflow JSON file dropped directly onto the canvas.
	 *
	 * Validates the JSON against the minimum required Workflow fields and, if valid,
	 * loads it into the workflow store. Shows a toast on validation failure or read error.
	 */
	function handleWorkflowFileDrop(file: File): void {
		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const text = event.target?.result;
				if (typeof text !== 'string') {
					throw new Error('Could not read file contents.');
				}
				const data = JSON.parse(text);
				const validation = validateWorkflowData(data);
				if (!validation.valid) {
					apiToasts.error('Import workflow', validation.error ?? 'Invalid workflow JSON');
					logger.warn('Workflow file drop validation failed:', validation.error);
					return;
				}
				workflowActions.initialize(data as Workflow);
			} catch (error) {
				const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');
				logger.error('Workflow file drop import failed:', errorObj);
				apiToasts.error('Import workflow', errorObj.message);
			}
		};
		reader.onerror = () => {
			const message = 'Failed to read the dropped file.';
			logger.error(message);
			apiToasts.error('Import workflow', message);
		};
		reader.readAsText(file);
	}

	/**
	 * Node ID that needs edge refresh - used to trigger EdgeRefresher component
	 */
	let nodeIdToRefresh = $state<string | null>(null);

	/**
	 * Update a node's data in the local editor state.
	 * This should be called after updating the node in the global store to ensure
	 * the visual representation is updated immediately (e.g., for nodeType changes).
	 *
	 * @param nodeId - The ID of the node to update
	 * @param dataUpdates - Partial data updates to merge into the node's data
	 */
	export function updateNodeData(
		nodeId: string,
		dataUpdates: Partial<WorkflowNodeType['data']>
	): void {
		flowNodes = flowNodes.map((node) => {
			if (node.id === nodeId) {
				return {
					...node,
					data: {
						...node.data,
						...dataUpdates
					}
				};
			}
			return node;
		});

		// Explicitly sync to currentWorkflow (no longer handled by reactive effect)
		updateCurrentWorkflowFromSvelteFlow();
	}

	/**
	 * Force edge position recalculation after node config changes
	 * This should be called after saving gateway/switch node configs where branches are reordered
	 * Svelte Flow doesn't automatically recalculate edge paths when handle positions change
	 * @param nodeId - The ID of the node whose handles have changed position
	 */
	export async function refreshEdgePositions(nodeId: string): Promise<void> {
		// Wait for DOM to update with new handle positions
		await tick();

		// Trigger the EdgeRefresher component to call updateNodeInternals
		nodeIdToRefresh = nodeId;
	}

	/**
	 * Callback when edge refresh is complete
	 */
	function handleEdgeRefreshComplete(): void {
		nodeIdToRefresh = null;
	}

	/**
	 * Handle keyboard shortcuts for undo/redo
	 *
	 * - Ctrl+Z (or Cmd+Z on Mac): Undo
	 * - Ctrl+Shift+Z (or Cmd+Shift+Z): Redo
	 * - Ctrl+Y (or Cmd+Y): Redo (Windows convention)
	 */
	function handleKeydown(event: KeyboardEvent): void {
		// Check for Ctrl (Windows/Linux) or Cmd (Mac)
		const isModifierPressed = event.ctrlKey || event.metaKey;

		if (!isModifierPressed) {
			return;
		}

		// Don't handle shortcuts if user is typing in an input, textarea, or contenteditable
		const target = event.target as HTMLElement;
		const isInputElement =
			target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

		if (isInputElement) {
			return;
		}

		// Undo: Ctrl+Z (without Shift)
		if (event.key === 'z' && !event.shiftKey) {
			event.preventDefault();
			historyActions.undo();
			return;
		}

		// Redo: Ctrl+Shift+Z or Ctrl+Y
		if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
			event.preventDefault();
			historyActions.redo();
			return;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<SvelteFlowProvider>
	<!-- EdgeRefresher component - handles updateNodeInternals calls -->
	<EdgeRefresher {nodeIdToRefresh} onRefreshComplete={handleEdgeRefreshComplete} />

	<!-- Port Coordinate Tracker - maintains port positions for proximity connect -->
	<PortCoordinateTracker
		nodeToUpdate={portCoordNodeToUpdate}
		rebuildTrigger={portCoordRebuildTrigger}
		nodes={flowNodes}
	/>

	<div class="flowdrop-workflow-editor">
		<!-- Main Editor Area -->
		<div class="flowdrop-workflow-editor__main">
			<!-- Flow Canvas -->
			<div class="flowdrop-canvas">
				<FlowDropZone ondrop={handleNodeDrop} onfiledrop={handleWorkflowFileDrop}>
					{#key svelteFlowKey}
						<SvelteFlow
							bind:nodes={flowNodes}
							bind:edges={flowEdges}
							{nodeTypes}
							{defaultEdgeOptions}
							onconnect={(connection) => void handleConnect({ source: connection.source, target: connection.target, sourceHandle: connection.sourceHandle ?? undefined, targetHandle: connection.targetHandle ?? undefined })}
							onbeforedelete={handleBeforeDelete}
							ondelete={handleNodesDelete}
							onnodedragstart={handleNodeDragStart}
							onnodedrag={handleNodeDrag}
							onnodedragstop={handleNodeDragStop}
							minZoom={0.2}
							maxZoom={3}
							clickConnect={true}
							elevateEdgesOnSelect={true}
							connectionLineType={ConnectionLineType.Bezier}
							connectionLineComponent={ConnectionLine}
							{snapGrid}
							{initialViewport}
							colorMode={getResolvedTheme() as ColorMode}
							fitView={getEditorSettings().fitViewOnLoad}
						>
							<Controls />
							<!-- Always render Background for consistent bg color in dark/light mode -->
							<Background
								gap={getEditorSettings().gridSize}
								bgColor="var(--fd-background)"
								variant={BackgroundVariant.Dots}
								patternColor={getEditorSettings().showGrid ? undefined : 'transparent'}
							/>
							{#if getEditorSettings().showMinimap}
								<MiniMap />
							{/if}
						</SvelteFlow>
					{/key}
					<!-- Drop Zone Indicator -->
					{#if flowNodes.length === 0}
						<CanvasBanner
							title="Drag components here to start building"
							description="Use the sidebar to add components to your workflow"
							iconName="mdi:graph"
						/>
					{/if}
				</FlowDropZone>
			</div>

			<!-- Status Bar: aria-live announces dynamic changes (node/edge counts, cycle warnings) -->
			<div class="flowdrop-status-bar" aria-live="polite" aria-atomic="true">
				<div class="flowdrop-status-bar__content">
					<div class="flowdrop-flex flowdrop-gap--4">
						<span class="flowdrop-text--xs flowdrop-text--gray">{flowNodes.length} nodes</span>
						<span class="flowdrop-text--xs flowdrop-text--gray">•</span>
						<span class="flowdrop-text--xs flowdrop-text--gray">{flowEdges.length} connections</span
						>

						{#if checkWorkflowCycles()}
							<span class="flowdrop-text--xs flowdrop-text--gray">•</span>
							<span class="flowdrop-text--xs flowdrop-font--medium flowdrop-text--error"
								>⚠️ Cycles detected</span
							>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</SvelteFlowProvider>

<!-- Toast notifications container -->
<!-- aria-live="polite" ensures screen readers announce toast messages without interrupting -->
<div aria-live="polite" aria-atomic="true">
	<Toaster
		position="bottom-center"
		containerClassName={FLOWDROP_TOASTER_CLASS}
		toastOptions={flowdropToastOptions}
	/>
</div>

<style>
	.flowdrop-workflow-editor {
		display: flex;
		flex-direction: row; /* Side by side layout */
		height: 100%;
		position: relative;
	}

	.flowdrop-workflow-editor__main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		transition: margin-left 0.3s ease-in-out;
	}

	.flowdrop-text--error {
		color: var(--fd-error);
	}

	.flowdrop-canvas {
		flex: 1;
		min-height: 0;
		position: relative;
		background: transparent;
	}

	.flowdrop-status-bar {
		background-color: var(--fd-backdrop);
		backdrop-filter: var(--fd-backdrop-blur);
		border-top: 1px solid var(--fd-border);
		padding: 0.75rem;
		height: 40px;
		min-height: 40px;
		max-height: 40px;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.flowdrop-status-bar__content {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	:global(.flowdrop-workflow-editor .svelte-flow__node:hover) {
		transform: translateY(-2px);
	}

	:global(.flowdrop-workflow-editor .svelte-flow__edge) {
		stroke-width: 2 !important;
		cursor: pointer;
		pointer-events: all;
	}

	:global(.flowdrop-workflow-editor .svelte-flow__edge path) {
		stroke-width: 2 !important;
	}

	:global(.flowdrop-workflow-editor .svelte-flow__edge:hover) {
		stroke: var(--fd-primary) !important;
		stroke-width: 3 !important;
	}

	:global(.flowdrop-workflow-editor .svelte-flow__edge:hover path) {
		stroke-width: 3 !important;
	}

	:global(.flowdrop-workflow-editor .svelte-flow__edge.selected) {
		stroke: var(--fd-primary) !important;
		stroke-width: 3 !important;
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--fd-primary) 50%, transparent));
	}

	:global(.flowdrop-workflow-editor .svelte-flow__edge.selected path) {
		stroke-width: 3 !important;
	}

	/* Ensure edge paths are clickable */
	:global(.flowdrop-workflow-editor .svelte-flow__edge path) {
		pointer-events: all;
		cursor: pointer;
	}

	/* Enhanced arrow markers for input ports */
	:global(.flowdrop-workflow-editor .svelte-flow__edge-marker) {
		fill: currentColor;
	}

	/* Handle size/position only; colors come from inline --fd-handle-fill and base.css ::before */
	:global(.flowdrop-workflow-editor .svelte-flow__handle) {
		width: var(--fd-handle-size);
		height: var(--fd-handle-size);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		z-index: 20;
	}

	/* Ensure our custom handles are clickable */
	:global(.flowdrop-workflow-editor .svelte-flow__handle) {
		pointer-events: all;
		cursor: crosshair;
		background-color: var(--fd-handle-fill);
		border-color: var(--fd-handle-border-color);
	}

	/**
	 * Edge Styling Based on Source Port Data Type
	 * Uses CSS tokens from base.css for consistent theming
	 * - Trigger edges: solid dark line (control flow)
	 * - Tool edges: dashed amber line (tool connections)
	 * - Data edges: normal gray line (data flow)
	 */

	/* Trigger Edge: Solid dark line for control flow */
	:global(.flowdrop--edge--trigger path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-trigger);
		stroke-width: var(--fd-edge-trigger-width);
	}

	:global(.flowdrop--edge--trigger:hover path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-trigger-hover);
		stroke-width: var(--fd-edge-trigger-width-hover);
	}

	:global(.flowdrop--edge--trigger.selected path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-trigger-selected);
		stroke-width: var(--fd-edge-trigger-width-hover);
	}

	/* Tool Edge: Dashed amber line for tool connections */
	:global(.flowdrop--edge--tool path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-tool);
		stroke-dasharray: 5 3;
	}

	:global(.flowdrop--edge--tool:hover path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-tool-hover);
		stroke-width: 2;
	}

	:global(.flowdrop--edge--tool.selected path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-tool-selected);
		stroke-dasharray: 5 3;
		stroke-width: 2;
	}

	/* Data Edge: Normal gray line for data flow (default) */
	:global(.flowdrop--edge--data path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-data);
	}

	:global(.flowdrop--edge--data:hover path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-data-hover);
		stroke-width: 2;
	}

	:global(.flowdrop--edge--data.selected path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-data-selected);
		stroke-width: 2;
	}

	/* Loopback Edge: Dashed gray line for loop iteration connections */
	:global(.flowdrop--edge--loopback path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-loopback);
		stroke-width: var(--fd-edge-loopback-width);
		stroke-dasharray: var(--fd-edge-loopback-dasharray);
		opacity: var(--fd-edge-loopback-opacity);
	}

	:global(.flowdrop--edge--loopback:hover path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-loopback-hover);
		stroke-width: var(--fd-edge-loopback-width-hover);
		opacity: 1;
	}

	:global(.flowdrop--edge--loopback.selected path.svelte-flow__edge-path) {
		stroke: var(--fd-edge-loopback-selected);
		stroke-width: var(--fd-edge-loopback-width-hover);
		stroke-dasharray: var(--fd-edge-loopback-dasharray);
		filter: drop-shadow(0 0 3px rgba(139, 92, 246, 0.4));
		opacity: 1;
	}

	/* Proximity Connect Preview Edge: animated dashed line */
	:global(.flowdrop--edge--proximity-preview path.svelte-flow__edge-path) {
		stroke: var(--fd-primary);
		stroke-width: 2;
		stroke-dasharray: 5 5;
		opacity: 0.6;
		animation: flowdrop-proximity-dash 0.5s linear infinite;
	}

	@keyframes flowdrop-proximity-dash {
		to {
			stroke-dashoffset: -10;
		}
	}
</style>
