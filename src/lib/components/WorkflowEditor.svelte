<!--
  Workflow Editor Component
  Main workflow editor with sidebar and flow canvas
  Styled with BEM syntax
-->

<script lang="ts">
	import {
		SvelteFlow,
		ConnectionLineType,
		MarkerType,
		Controls,
		Background,
		BackgroundVariant,
		MiniMap,
		SvelteFlowProvider
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import WorkflowNode from './WorkflowNode.svelte';
	import NotesNode from './NotesNode.svelte';
	import SimpleNode from './SimpleNode.svelte';
	import SquareNode from './SquareNode.svelte';
	import ToolNode from './ToolNode.svelte';
	import type {
		WorkflowNode as WorkflowNodeType,
		NodeMetadata,
		Workflow,
		WorkflowEdge
	} from '../types/index.js';
	import CanvasBanner from './CanvasBanner.svelte';
	import { tick } from 'svelte';
	import type { EndpointConfig } from '../config/endpoints.js';
	import ConnectionLine from './ConnectionLine.svelte';
	import { workflowStore, workflowActions } from '../stores/workflowStore.js';
	import UniversalNode from './UniversalNode.svelte';
	import {
		EdgeStylingHelper,
		NodeOperationsHelper,
		WorkflowOperationsHelper,
		ConfigurationHelper
	} from '../helpers/workflowEditorHelper.js';
	import type { NodeExecutionInfo } from '../types/index.js';

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

	// Debug logging for props
	$effect(() => {
		console.log('🔧 WorkflowEditor: Props received:', {
			hasOpenConfigSidebar: !!props.openConfigSidebar,
			hasCloseConfigSidebar: !!props.closeConfigSidebar,
			selectedNodeForConfig: props.selectedNodeForConfig?.id,
			isConfigSidebarOpen: props.isConfigSidebarOpen
		});
	});

	// Initialize from props only once, not on every re-render
	let availableNodes = $state<NodeMetadata[]>([]);

	// Create a local currentWorkflow variable that we can control directly
	let currentWorkflow = $state<Workflow | null>(null);

	// Initialize currentWorkflow from global store
	$effect(() => {
		if ($workflowStore) {
			currentWorkflow = $workflowStore;
		}
	});

	// Create local reactive variables that sync with currentWorkflow
	let flowNodes = $state<WorkflowNodeType[]>([]);
	let flowEdges = $state<WorkflowEdge[]>([]);

	// Sync local state with currentWorkflow
	let loadExecutionInfoTimeout: NodeJS.Timeout | null = null;

	$effect(() => {
		if (currentWorkflow) {
			flowNodes = currentWorkflow.nodes.map((node) => ({
				...node,
				data: {
					...node.data,
					onConfigOpen: props.openConfigSidebar
				}
			}));
			flowEdges = currentWorkflow.edges;

			// Debounce node execution info loading to prevent rapid calls
			if (loadExecutionInfoTimeout) {
				clearTimeout(loadExecutionInfoTimeout);
			}
			loadExecutionInfoTimeout = setTimeout(() => {
				loadNodeExecutionInfo();
			}, 100);
		}
	});

	// Function to update the global store when currentWorkflow changes
	function updateGlobalStore(): void {
		if (currentWorkflow) {
			console.log('🔍 WorkflowEditor: Updating global store from currentWorkflow:', {
				nodeCount: currentWorkflow.nodes.length,
				edgeCount: currentWorkflow.edges.length,
				nodePositions: currentWorkflow.nodes.map((node) => ({
					id: node.id,
					position: node.position
				})),
				workflowName: currentWorkflow.name,
				versionId: currentWorkflow.metadata?.versionId,
				updateNumber: currentWorkflow.metadata?.updateNumber
			});

			workflowActions.updateWorkflow(currentWorkflow);
		}
	}

	/**
	 * Load node execution information for all nodes in the workflow
	 */
	async function loadNodeExecutionInfo(): Promise<void> {
		if (!currentWorkflow?.nodes) return;

		const executionInfo = await NodeOperationsHelper.loadNodeExecutionInfo(
			currentWorkflow,
			props.pipelineId
		);

		// Update nodes with execution information without triggering reactive updates
		const updatedNodes = currentWorkflow.nodes.map((node) => ({
			...node,
			data: {
				...node.data,
				executionInfo:
					executionInfo[node.id] ||
					({
						status: 'idle' as const,
						executionCount: 0,
						isExecuting: false
					} as NodeExecutionInfo)
			}
		}));

		// Update the flow nodes to reflect the changes
		flowNodes = updatedNodes.map((node) => ({
			...node,
			data: {
				...node.data,
				onConfigOpen: props.openConfigSidebar
			}
		}));

		// Update currentWorkflow without triggering reactive effects
		currentWorkflow.nodes = updatedNodes;
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

	// Watch for changes from SvelteFlow and update currentWorkflow
	$effect(() => {
		// Check if nodes have changed from SvelteFlow
		const nodesChanged = JSON.stringify(flowNodes) !== JSON.stringify(previousNodes);
		const edgesChanged = JSON.stringify(flowEdges) !== JSON.stringify(previousEdges);

		if ((nodesChanged || edgesChanged) && currentWorkflow) {
			console.log('🔍 WorkflowEditor: SvelteFlow changed nodes/edges, updating currentWorkflow');
			updateCurrentWorkflowFromSvelteFlow();

			// Update previous values
			previousNodes = JSON.parse(JSON.stringify(flowNodes));
			previousEdges = JSON.parse(JSON.stringify(flowEdges));
		}
	});

	// The global store should be initialized by the parent App component

	// Sidebar is now always visible - removed toggle functionality

	// Node types for Svelte Flow - using UniversalNode for all node types
	// All nodes use 'universalNode' type, and UniversalNode handles internal switching
	// Include legacy types for backward compatibility with existing workflows
	const nodeTypes = {
		universalNode: UniversalNode,
		// Legacy types for backward compatibility
		workflowNode: UniversalNode,
		note: UniversalNode,
		simple: UniversalNode,
		square: UniversalNode,
		tool: UniversalNode,
		gateway: UniversalNode
	};

	// Handle arrows in our custom connection handler
	const defaultEdgeOptions = {};

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
		console.log('Connection created:', connection);

		// Wait for DOM update before applying styling
		await tick();

		// Apply styling to the new edge (including arrows)
		updateExistingEdgeStyles();

		// Update currentWorkflow with the new edge
		if (currentWorkflow) {
			updateCurrentWorkflowFromSvelteFlow();
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

	// Configure endpoints and load nodes when props change
	$effect(() => {
		if (props.endpointConfig) {
			ConfigurationHelper.configureEndpoints(props.endpointConfig);
			// Load nodes after setting endpoint config
			loadNodesFromApi();
		} else if (props.nodes) {
			// If we have nodes prop, use them directly
			availableNodes = props.nodes;
		}
	});

	/**
	 * Load nodes from API if not provided
	 */
	async function loadNodesFromApi(): Promise<void> {
		availableNodes = await NodeOperationsHelper.loadNodesFromApi(props.nodes);
	}

	/**
	 * Clear workflow
	 */
	function clearWorkflow(): void {
		if (currentWorkflow) {
			currentWorkflow = WorkflowOperationsHelper.clearWorkflow(currentWorkflow);

			// Update the global store
			updateGlobalStore();
		}
	}

	// ConfigSidebar functions are now handled by the parent App component

	async function handleConfigSave(newConfig: Record<string, unknown>): Promise<void> {
		console.log('🔧 WorkflowEditor: handleConfigSave called with:', newConfig);

		if (props.selectedNodeForConfig) {
			console.log('🔧 WorkflowEditor: Updating config for node:', props.selectedNodeForConfig.id);

			// Wait for any pending DOM updates
			await tick();

			// Update the node's config
			props.selectedNodeForConfig.data.config = { ...newConfig };

			// Update the node in currentWorkflow
			if (currentWorkflow) {
				currentWorkflow = WorkflowOperationsHelper.updateNodeConfig(
					currentWorkflow,
					props.selectedNodeForConfig.id,
					newConfig
				);

				console.log('🔧 WorkflowEditor: Updated currentWorkflow, calling updateGlobalStore');
				// Update the global store
				updateGlobalStore();
			} else {
				console.warn('⚠️ WorkflowEditor: No currentWorkflow available for config update');
			}
		} else {
			console.warn('⚠️ WorkflowEditor: No selectedNodeForConfig available for config update');
		}
		props.closeConfigSidebar?.();
	}

	/**
	 * Save workflow
	 */
	async function saveWorkflow(): Promise<void> {
		try {
			// Wait for any pending DOM updates before saving
			await tick();

			const savedWorkflow = await WorkflowOperationsHelper.saveWorkflow(currentWorkflow);

			if (savedWorkflow) {
				console.log('🔍 WorkflowEditor: Workflow store after save:', $workflowStore);

				// Update the workflow ID if it was a new workflow
				if (!currentWorkflow?.id) {
					console.log('🆕 New workflow created with ID:', savedWorkflow.id);
				} else {
					console.log('🔄 Existing workflow updated with ID:', savedWorkflow.id);
				}
			}
		} catch (error) {
			console.error('❌ Failed to save workflow:', error);
			// Here you would typically show a user-friendly error message
		}
	}

	/**
	 * Export workflow
	 */
	async function exportWorkflow(): Promise<void> {
		// Wait for any pending DOM updates before exporting
		await tick();

		WorkflowOperationsHelper.exportWorkflow(currentWorkflow);
	}

	/**
	 * Check if workflow has cycles
	 */
	function checkWorkflowCycles(): boolean {
		return WorkflowOperationsHelper.checkWorkflowCycles(flowNodes, flowEdges);
	}
</script>

<SvelteFlowProvider>
	<div class="flowdrop-workflow-editor">
		<!-- Main Editor Area -->
		<div class="flowdrop-workflow-editor__main">
			<!-- Flow Canvas -->
			<div
				class="flowdrop-canvas"
				role="application"
				aria-label="Workflow canvas"
				ondragover={(e: DragEvent) => {
					e.preventDefault();
					e.dataTransfer!.dropEffect = 'copy';
				}}
				ondrop={async (e: DragEvent) => {
					e.preventDefault();

					// Get the data from the drag event
					const nodeTypeData = e.dataTransfer?.getData('application/json');
					if (nodeTypeData) {
						// Get the position relative to the canvas
						const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
						const position = {
							x: e.clientX - rect.left,
							y: e.clientY - rect.top
						};

						// Create the node using the helper
						const newNode = NodeOperationsHelper.createNodeFromDrop(nodeTypeData, position);

						if (newNode && currentWorkflow) {
							console.log('🔧 WorkflowEditor: Adding new node to currentWorkflow:', newNode.id);
							currentWorkflow = WorkflowOperationsHelper.addNode(currentWorkflow, newNode);

							console.log(
								'🔧 WorkflowEditor: Updated currentWorkflow with new node, calling updateGlobalStore'
							);
							// Update the global store
							updateGlobalStore();

							// Wait for DOM update to ensure SvelteFlow updates
							await tick();
						} else if (!currentWorkflow) {
							console.warn('⚠️ WorkflowEditor: No currentWorkflow available for new node');
						}
					}
				}}
			>
				<SvelteFlow
					bind:nodes={flowNodes}
					bind:edges={flowEdges}
					{nodeTypes}
					{defaultEdgeOptions}
					onconnect={handleConnect}
					minZoom={0.2}
					maxZoom={3}
					clickConnect={true}
					elevateEdgesOnSelect={true}
					connectionLineType={ConnectionLineType.Bezier}
					connectionLineComponent={ConnectionLine}
					snapGrid={[10, 10]}
					fitView
				>
					<Controls />
					<Background
						gap={10}
						bgColor="var(--flowdrop-background-color)"
						variant={BackgroundVariant.Dots}
					/>
					<MiniMap />
				</SvelteFlow>
				<!-- Drop Zone Indicator -->
				{#if flowNodes.length === 0}
					<CanvasBanner
						title="Drag components here to start building"
						description="Use the sidebar to add components to your workflow"
						iconName="mdi:graph"
					/>
				{/if}
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
		color: #dc2626;
	}

	.flowdrop-canvas {
		flex: 1;
		min-height: 0;
		position: relative;
		background: transparent;
	}

	.flowdrop-status-bar {
		background-color: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(8px);
		border-top: 1px solid #e5e7eb;
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
		stroke: #3b82f6 !important;
		stroke-width: 3 !important;
	}

	:global(.flowdrop-workflow-editor .svelte-flow__edge:hover path) {
		stroke-width: 3 !important;
	}

	:global(.flowdrop-workflow-editor .svelte-flow__edge.selected) {
		stroke: #3b82f6 !important;
		stroke-width: 3 !important;
		filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));
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

	:global(.flowdrop-workflow-editor .svelte-flow__handle) {
		width: 18px;
		height: 18px;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		z-index: 10;
	}

	/* Ensure our custom handles are clickable */
	:global(.flowdrop-workflow-editor .svelte-flow__handle) {
		pointer-events: all;
		cursor: crosshair;
	}
	:global(.flowdrop--edge--tool path.svelte-flow__edge-path) {
		stroke-dasharray: 5 5;
	}
</style>
