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
	import { resolvedTheme, editorSettings, behaviorSettings } from '../stores/settingsStore.js';
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
	import { workflowStore, workflowActions } from '../stores/workflowStore.js';
	import { historyActions, setOnRestoreCallback } from '../stores/historyStore.js';
	import UniversalNode from './UniversalNode.svelte';
	import {
		EdgeStylingHelper,
		NodeOperationsHelper,
		WorkflowOperationsHelper,
		ConfigurationHelper
	} from '../helpers/workflowEditorHelper.js';
	import type { NodeExecutionInfo } from '../types/index.js';
	import { areNodeArraysEqual, areEdgeArraysEqual, throttle } from '../utils/performanceUtils.js';
	import { Toaster } from 'svelte-5-french-toast';
	import { flowdropToastOptions, FLOWDROP_TOASTER_CLASS } from '../services/toastService.js';

	interface Props {
		nodes?: NodeMetadata[];
		// workflow?: Workflow; // Removed - use global store directly
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
	let currentWorkflow = $state<Workflow | null>(null);

	// Track if we're currently dragging a node (for history debouncing)
	let isDraggingNode = $state(false);

	// Track the workflow ID we're currently editing to detect workflow switches
	let currentWorkflowId: string | null = null;

	// Initialize currentWorkflow from global store
	// Only sync when workflow ID changes (new workflow loaded) or on initial load
	$effect(() => {
		if ($workflowStore) {
			const storeWorkflowId = $workflowStore.id;

			// Sync on initial load or when a different workflow is loaded
			if (currentWorkflowId !== storeWorkflowId) {
				currentWorkflow = $workflowStore;
				currentWorkflowId = storeWorkflowId;
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
		});

		// Cleanup on unmount
		return () => {
			setOnRestoreCallback(null);
		};
	});

	// Create local reactive variables that sync with currentWorkflow
	let flowNodes = $state<WorkflowNodeType[]>([]);
	let flowEdges = $state<WorkflowEdge[]>([]);

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
		$editorSettings.snapToGrid
			? ([$editorSettings.gridSize, $editorSettings.gridSize] as [number, number])
			: undefined
	);

	/**
	 * Derive initial viewport configuration from editor settings
	 * Sets initial zoom level based on user preferences
	 */
	let initialViewport = $derived({
		zoom: $editorSettings.defaultZoom,
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

			// Update state in a single operation
			flowNodes = updatedNodes;
			currentWorkflow.nodes = updatedNodes;

			// Clear abort controller
			executionInfoAbortController = null;
		} catch (error) {
			// Only log if it's not an abort error
			if (error instanceof Error && error.name !== 'AbortError') {
				console.error('Failed to load node execution info:', error);
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

	// Track previous values to detect changes from SvelteFlow
	let previousNodes = $state<WorkflowNodeType[]>([]);
	let previousEdges = $state<WorkflowEdge[]>([]);

	/**
	 * Watch for changes from SvelteFlow and update currentWorkflow
	 * Uses efficient comparison instead of expensive JSON.stringify
	 * This reduces event handler time from 290-310ms to <50ms
	 */
	$effect(() => {
		// Check if nodes have changed from SvelteFlow using fast comparison
		const nodesChanged = !areNodeArraysEqual(flowNodes, previousNodes);
		const edgesChanged = !areEdgeArraysEqual(flowEdges, previousEdges);

		if ((nodesChanged || edgesChanged) && currentWorkflow) {
			updateCurrentWorkflowFromSvelteFlow();

			// Update previous values with shallow copies
			previousNodes = [...flowNodes];
			previousEdges = [...flowEdges];
		}
	});

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
	}

	/**
	 * Handle node drag stop
	 *
	 * Push the NEW state (after drag) to history.
	 * Undo will then restore to the previous state (before drag).
	 */
	function handleNodeDragStop(): void {
		isDraggingNode = false;
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
		if ($behaviorSettings.confirmDelete) {
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
			console.warn('No currentWorkflow available for new node');
		}
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

	<div class="flowdrop-workflow-editor">
		<!-- Main Editor Area -->
		<div class="flowdrop-workflow-editor__main">
			<!-- Flow Canvas -->
			<div class="flowdrop-canvas">
				<FlowDropZone ondrop={handleNodeDrop}>
					{#key svelteFlowKey}
						<SvelteFlow
							bind:nodes={flowNodes}
							bind:edges={flowEdges}
							{nodeTypes}
							{defaultEdgeOptions}
							onconnect={handleConnect}
							onbeforedelete={handleBeforeDelete}
							ondelete={handleNodesDelete}
							onnodedragstart={handleNodeDragStart}
							onnodedragstop={handleNodeDragStop}
							minZoom={0.2}
							maxZoom={3}
							clickConnect={true}
							elevateEdgesOnSelect={true}
							connectionLineType={ConnectionLineType.Bezier}
							connectionLineComponent={ConnectionLine}
							{snapGrid}
							{initialViewport}
							colorMode={$resolvedTheme as ColorMode}
							fitView={$editorSettings.fitViewOnLoad}
						>
							<Controls />
							<!-- Always render Background for consistent bg color in dark/light mode -->
							<Background
								gap={$editorSettings.gridSize}
								bgColor="var(--fd-background)"
								variant={BackgroundVariant.Dots}
								patternColor={$editorSettings.showGrid ? undefined : 'transparent'}
							/>
							{#if $editorSettings.showMinimap}
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

			<!-- Status Bar -->
			<div class="flowdrop-status-bar">
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
<Toaster
	position="bottom-center"
	containerClassName={FLOWDROP_TOASTER_CLASS}
	toastOptions={flowdropToastOptions}
/>

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
</style>
