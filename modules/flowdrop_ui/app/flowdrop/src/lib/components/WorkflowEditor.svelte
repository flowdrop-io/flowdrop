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
	import { hasCycles } from '../utils/connections.js';
	import CanvasBanner from './CanvasBanner.svelte';
	import { workflowApi, nodeApi, setApiBaseUrl, setEndpointConfig } from '../services/api.js';
	import { v4 as uuidv4 } from 'uuid';
	import { tick } from 'svelte';
	import type { EndpointConfig } from '../config/endpoints.js';
	import ConnectionLine from './ConnectionLine.svelte';
	import { resolveComponentName } from '../utils/nodeTypes.js';
	import { workflowStore, workflowActions } from '../stores/workflowStore.js';
	import { nodeExecutionService } from '../services/nodeExecutionService.js';
	import type { NodeExecutionInfo } from '../types/index.js';
	import UniversalNode from './UniversalNode.svelte';

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

		// Only load execution info if we have a pipelineId (for pipeline status mode)
		if (!props.pipelineId) return;

		try {
			const nodeIds = currentWorkflow.nodes.map((node) => node.id);
			const executionInfo = await nodeExecutionService.getMultipleNodeExecutionInfo(
				nodeIds,
				props.pipelineId
			);

			// Update nodes with execution information without triggering reactive updates
			const updatedNodes = currentWorkflow.nodes.map((node) => ({
				...node,
				data: {
					...node.data,
					executionInfo: executionInfo[node.id] || {
						status: 'idle',
						executionCount: 0,
						isExecuting: false
					}
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
		} catch (error) {
			console.error('Failed to load node execution info:', error);
		}
	}

	// Function to update currentWorkflow when SvelteFlow changes nodes/edges
	function updateCurrentWorkflowFromSvelteFlow(): void {
		if (currentWorkflow) {
			currentWorkflow = {
				...currentWorkflow,
				nodes: flowNodes,
				edges: flowEdges,
				metadata: {
					...currentWorkflow.metadata,
					updatedAt: new Date().toISOString(),
					versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					updateNumber: (currentWorkflow.metadata?.updateNumber || 0) + 1
				}
			};

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

	// Node types for Svelte Flow - using UniversalNode for automatic status overlay
	const nodeTypes = {
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
	 * Apply custom styling to connection edges based on rules:
	 * - Dashed lines for connections to tool nodes
	 * - Arrow markers pointing towards input ports
	 */
	function applyConnectionStyling(
		edge: WorkflowEdge,
		sourceNode: WorkflowNodeType,
		targetNode: WorkflowNodeType
	): void {
		// Rule 1: Dashed lines for tool nodes
		// A node is a tool node when it uses the ToolNode component,
		// which happens when sourceNode.type === 'tool'
		const isToolNode = sourceNode.type === 'tool';

		// Use inline styles for dashed lines (more reliable than CSS classes)
		if (isToolNode) {
			edge.style = 'stroke-dasharray: 0 4 0; stroke: amber !important;';
			edge.class = 'flowdrop--edge--tool';
		} else {
			edge.style = 'stroke: grey;';
		}

		// Store metadata in edge data for debugging
		edge.data = {
			...edge.data,
			isToolConnection: isToolNode,
			targetNodeType: targetNode.type,
			targetCategory: targetNode.data.metadata.category
		};

		// Rule 2: Always add arrow pointing towards input port
		// This replaces the default arrows we removed
		if (!isToolNode) {
			edge.markerEnd = {
				type: MarkerType.ArrowClosed,
				width: 16,
				height: 16,
				color: 'grey'
			};
		}
	}

	/**
	 * Update existing edges with our custom styling rules
	 * This ensures all edges (including existing ones) follow our rules
	 */
	async function updateExistingEdgeStyles(): Promise<void> {
		// Wait for any pending DOM updates
		await tick();

		const updatedEdges = flowEdges.map((edge) => {
			// Find source and target nodes
			const sourceNode = flowNodes.find((node) => node.id === edge.source);
			const targetNode = flowNodes.find((node) => node.id === edge.target);

			if (!sourceNode || !targetNode) {
				console.warn('Could not find nodes for edge:', edge.id);
				return edge;
			}

			// Create a copy of the edge and apply styling
			const updatedEdge = { ...edge };
			applyConnectionStyling(updatedEdge, sourceNode, targetNode);

			return updatedEdge;
		});

		// Update currentWorkflow with the styled edges
		if (currentWorkflow) {
			currentWorkflow = {
				...currentWorkflow,
				edges: updatedEdges,
				metadata: {
					...currentWorkflow.metadata,
					updatedAt: new Date().toISOString(),
					versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					updateNumber: (currentWorkflow.metadata?.updateNumber || 0) + 1
				}
			};

			// Update the global store
			updateGlobalStore();
		}
	}

	// Edge styling will be handled when edges are first created or manually updated

	// Configure endpoints and load nodes when props change
	$effect(() => {
		if (props.endpointConfig) {
			setEndpointConfig(props.endpointConfig);
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
		// If nodes are provided via props, use them
		if (props.nodes && props.nodes.length > 0) {
			availableNodes = props.nodes;
			return;
		}

		// Otherwise, load from API
		try {
			const fetchedNodes = await nodeApi.getNodes();

			availableNodes = fetchedNodes;
		} catch (error) {
			console.error('❌ Failed to load nodes from API:', error);

			// Use fallback sample nodes
			availableNodes = [
				{
					id: 'text-input',
					name: 'Text Input',
					category: 'inputs',
					description: 'Simple text input field',
					version: '1.0.0',
					icon: 'mdi:text-box',
					inputs: [],
					outputs: [{ id: 'text', name: 'text', type: 'output', dataType: 'string' }]
				},
				{
					id: 'text-output',
					name: 'Text Output',
					category: 'outputs',
					description: 'Display text output',
					version: '1.0.0',
					icon: 'mdi:text-box-outline',
					inputs: [{ id: 'text', name: 'text', type: 'input', dataType: 'string' }],
					outputs: []
				}
			];
		}
	}

	/**
	 * Clear workflow
	 */
	function clearWorkflow(): void {
		if (currentWorkflow) {
			currentWorkflow = {
				...currentWorkflow,
				nodes: [],
				edges: [],
				metadata: {
					...currentWorkflow.metadata,
					updatedAt: new Date().toISOString(),
					versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					updateNumber: (currentWorkflow.metadata?.updateNumber || 0) + 1
				}
			};

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

			// Determine node type based on configuration and supported types
			const newComponentName = resolveComponentName(
				props.selectedNodeForConfig.data.metadata,
				newConfig.nodeType as string
			);

			console.log('🔧 WorkflowEditor: New component name:', newComponentName);

			// Update the node in currentWorkflow
			if (currentWorkflow) {
				currentWorkflow = {
					...currentWorkflow,
					nodes: currentWorkflow.nodes.map((node) =>
						node.id === props.selectedNodeForConfig.id
							? {
									...node,
									type: newComponentName as string,
									data: { ...node.data, config: { ...newConfig } }
								}
							: node
					),
					metadata: {
						...currentWorkflow.metadata,
						updatedAt: new Date().toISOString(),
						versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						updateNumber: (currentWorkflow.metadata?.updateNumber || 0) + 1
					}
				};

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

			// Use current workflow from local variable
			if (!currentWorkflow) {
				console.warn('⚠️ No workflow data available to save');
				return;
			}

			// Determine the workflow ID based on whether we have an existing workflow
			let workflowId: string;
			if (currentWorkflow.id) {
				// Use the existing workflow ID
				workflowId = currentWorkflow.id;
			} else {
				// Generate a new UUID for a new workflow
				workflowId = uuidv4();
			}

			const workflow: Workflow = {
				id: workflowId,
				name: currentWorkflow.name || 'Untitled Workflow',
				nodes: currentWorkflow.nodes || [],
				edges: currentWorkflow.edges || [],
				metadata: {
					version: '1.0.0',
					createdAt: currentWorkflow.metadata?.createdAt || new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			};

			console.log('💾 WorkflowEditor: Saving workflow to Drupal:');
			console.log('   - ID:', workflow.id);
			console.log('   - Name:', workflow.name);
			console.log('   - Nodes count:', workflow.nodes.length);
			console.log('   - Edges count:', workflow.edges.length);
			console.log('   - Full workflow object:', JSON.stringify(workflow, null, 2));

			const savedWorkflow = await workflowApi.saveWorkflow(workflow);

			console.log('✅ WorkflowEditor: Received workflow from Drupal:');
			console.log('   - ID:', savedWorkflow.id);
			console.log('   - Name:', savedWorkflow.name);
			console.log('   - Nodes count:', savedWorkflow.nodes?.length || 0);
			console.log('   - Edges count:', savedWorkflow.edges?.length || 0);

			// Update the workflow ID if it changed (new workflow)
			// Keep our current workflow state, only update ID and metadata from Drupal
			if (savedWorkflow.id && savedWorkflow.id !== workflow.id) {
				console.log('🔄 Updating workflow ID from', workflow.id, 'to', savedWorkflow.id);
				workflowActions.batchUpdate({
					nodes: workflow.nodes,
					edges: workflow.edges,
					name: workflow.name,
					metadata: {
						...workflow.metadata,
						...savedWorkflow.metadata
					}
				});
			}

			console.log('🔍 WorkflowEditor: Workflow store after save:', $workflowStore);

			// Note: Notes node configurations (content, noteType) are automatically
			// saved as part of the node.data.config object and will be restored
			// when the workflow is loaded.

			// Update the workflow ID if it was a new workflow
			if (!currentWorkflow.id) {
				console.log('🆕 New workflow created with ID:', savedWorkflow.id);
			} else {
				console.log('🔄 Existing workflow updated with ID:', savedWorkflow.id);
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

		// Use current workflow from local variable
		if (!currentWorkflow) {
			console.warn('⚠️ No workflow data available to export');
			return;
		}

		// Use the same ID logic as saveWorkflow
		const workflowId = currentWorkflow.id || uuidv4();

		const workflow: Workflow = {
			id: workflowId,
			name: currentWorkflow.name || 'Untitled Workflow',
			nodes: currentWorkflow.nodes || [],
			edges: currentWorkflow.edges || [],
			metadata: {
				version: '1.0.0',
				createdAt: currentWorkflow.metadata?.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		};

		const dataStr = JSON.stringify(workflow, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${workflow.name}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	/**
	 * Check if workflow has cycles
	 */
	function checkWorkflowCycles(): boolean {
		return hasCycles(flowNodes, flowEdges);
	}
</script>

<SvelteFlowProvider>
	<div
		class="flowdrop-workflow-editor"
	>
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

						// Create the node manually since SvelteFlow isn't receiving the event
						try {
							const parsedData = JSON.parse(nodeTypeData);

							// Handle both old format (with type: "node") and new format (direct NodeMetadata)
							let nodeType: NodeMetadata;
							let nodeData: {
								label: string;
								config: Record<string, unknown>;
								metadata: NodeMetadata;
							};

							if (parsedData.type === 'node') {
								// Old format from sidebar
								nodeType = parsedData.nodeData.metadata;
								nodeData = parsedData.nodeData;
							} else {
								// New format (direct NodeMetadata)
								nodeType = parsedData;

								// Extract initial config from configSchema
								let initialConfig = {};
								if (nodeType.configSchema && typeof nodeType.configSchema === 'object') {
									// If configSchema is a JSON Schema, extract default values
									if (nodeType.configSchema.properties) {
										// JSON Schema format - extract defaults
										Object.entries(nodeType.configSchema.properties).forEach(([key, prop]) => {
											if (prop && typeof prop === 'object' && 'default' in prop) {
												initialConfig[key] = prop.default;
											}
										});
									} else {
										// Simple object format - use as is
										initialConfig = { ...nodeType.configSchema };
									}
								}

								nodeData = {
									label: nodeType.name,
									config: initialConfig,
									metadata: nodeType
								};
							}

							const newNodeId = uuidv4();

							// Determine node type based on configuration and supported types
							const svelteFlowNodeType = resolveComponentName(
								nodeData.metadata,
								(nodeData.config?.nodeType as string) || 'default'
							);

							const newNode: WorkflowNodeType = {
								id: newNodeId,
								type: svelteFlowNodeType as string,
								position, // Use the position calculated from the drop event
								deletable: true,
								data: {
									...nodeData,
									nodeId: newNodeId // Use the same ID
								}
							};

							// Add node to currentWorkflow
							if (currentWorkflow) {
								console.log('🔧 WorkflowEditor: Adding new node to currentWorkflow:', newNode.id);
								currentWorkflow = {
									...currentWorkflow,
									nodes: [...currentWorkflow.nodes, newNode],
									metadata: {
										...currentWorkflow.metadata,
										updatedAt: new Date().toISOString(),
										versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
										updateNumber: (currentWorkflow.metadata?.updateNumber || 0) + 1
									}
								};

								console.log(
									'🔧 WorkflowEditor: Updated currentWorkflow with new node, calling updateGlobalStore'
								);
								// Update the global store
								updateGlobalStore();
							} else {
								console.warn('⚠️ WorkflowEditor: No currentWorkflow available for new node');
							}

							// Wait for DOM update to ensure SvelteFlow updates
							await tick();
						} catch (error) {
							console.error('Error parsing node data:', error);
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
				/>
				<Controls />
				<Background gap={20} variant={BackgroundVariant.Dots} />
				<MiniMap />

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
