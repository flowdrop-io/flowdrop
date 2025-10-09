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
		// @ts-expect-error - Controls is not properly typed in @xyflow/svelte
		Controls,
		// @ts-expect-error - Background is not properly typed in @xyflow/svelte
		Background,
		// @ts-expect-error - MiniMap is not properly typed in @xyflow/svelte
		MiniMap,
		// @ts-expect-error - SvelteFlowProvider is not properly typed in @xyflow/svelte
		SvelteFlowProvider
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import NodeSidebar from './NodeSidebar.svelte';
	import ConfigSidebar from './ConfigSidebar.svelte';
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

	interface Props {
		nodes?: NodeMetadata[];
		workflow?: Workflow;
		apiBaseUrl?: string;
		endpointConfig?: EndpointConfig;
	}

	let props: Props = $props();

	// Initialize from props only once, not on every re-render
	let isInitialized = $state(false);
	let flowNodes = $state<WorkflowNodeType[]>([]);
	let flowEdges = $state<WorkflowEdge[]>([]);
	let availableNodes = $state<NodeMetadata[]>([]);

	$effect(() => {
		if (!isInitialized) {
			if (props.workflow) {
				flowNodes = props.workflow.nodes || [];
				flowEdges = props.workflow.edges || [];
			} else {
				flowNodes = [];
				flowEdges = [];
			}
			isInitialized = true;
		}
	});

	// Update flowNodes and flowEdges when workflow prop changes
	$effect(() => {
		if (isInitialized && props.workflow) {
			console.log('🔄 WorkflowEditor: Updating nodes and edges from workflow prop');
			console.log('📊 Workflow nodes:', props.workflow.nodes?.length || 0);
			console.log('🔗 Workflow edges:', props.workflow.edges?.length || 0);

			flowNodes = props.workflow.nodes || [];
			flowEdges = props.workflow.edges || [];
		}
	});

	let workflowName = $state(props.workflow?.name || 'Untitled Workflow');
	let isEditingTitle = $state(false);
	// Sidebar is now always visible - removed toggle functionality

	// Global ConfigSidebar state
	let isConfigSidebarOpen = $state(false);
	let selectedNodeForConfig = $state<WorkflowNodeType | null>(null);

	// Update workflow name when props change
	$effect(() => {
		if (props.workflow?.name) {
			workflowName = props.workflow.name;
		}
	});

	// Node types for Svelte Flow
	const nodeTypes = {
		workflowNode: WorkflowNode,
		note: NotesNode,
		simple: SimpleNode,
		square: SquareNode,
		tool: ToolNode
	};

	// Remove default edge options to prevent arrow overlap
	// We'll handle arrows in our custom connection handler
	const defaultEdgeOptions = {};

	/**
	 * Handle new connections between nodes
	 * Let SvelteFlow handle edge creation, styling will be applied via reactive effects
	 */
	function handleConnect(connection: {
		source: string;
		target: string;
		sourceHandle?: string;
		targetHandle?: string;
	}): void {
		// SvelteFlow will automatically create the edge due to bind:edges
		// Our updateExistingEdgeStyles effect will apply styling automatically
		console.log('Connection created:', connection);
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
			edge.style = {
				'stroke-dasharray': '0 4 0',
				stroke: 'amber !important'
			} as Record<string, string>;
			edge.class = 'flowdrop--edge--tool';
		} else {
			edge.style = {
				stroke: 'grey'
			} as Record<string, string>;
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
	function updateExistingEdgeStyles(): void {
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

		// Update all edges at once
		flowEdges = updatedEdges;
	}

	// Apply styling to all edges when edges change
	$effect(() => {
		if (flowNodes.length > 0 && flowEdges.length > 0 && availableNodes.length > 0) {
			// Always update edge styles to ensure new edges get styled
			updateExistingEdgeStyles();
		}
	});

	$effect(() => {
		if (props.endpointConfig) {
			setEndpointConfig(props.endpointConfig);
		} else if (props.apiBaseUrl) {
			setApiBaseUrl(props.apiBaseUrl);
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

	// Load nodes when component mounts, when endpoint config changes, or when props.nodes changes
	$effect(() => {
		if (props.endpointConfig || props.apiBaseUrl || props.nodes) {
			loadNodesFromApi();
		}
	});

	/**
	 * Clear workflow
	 */
	function clearWorkflow(): void {
		flowNodes = [];
		flowEdges = [];
	}

	/**
	 * Global ConfigSidebar functions
	 */
	function openConfigSidebar(node: WorkflowNodeType): void {
		// If a different node's config sidebar is already open, close it first
		if (selectedNodeForConfig && selectedNodeForConfig.id !== node.id) {
			closeConfigSidebar();
		}

		selectedNodeForConfig = node;
		isConfigSidebarOpen = true;
	}

	function closeConfigSidebar(): void {
		isConfigSidebarOpen = false;
		selectedNodeForConfig = null;
	}

	// Removed hardcoded mapNodeType function - now using resolveComponentName from utils/nodeTypes.js

	function handleConfigSave(newConfig: Record<string, unknown>): void {
		if (selectedNodeForConfig) {
			// Update the node's config
			selectedNodeForConfig.data.config = { ...newConfig };

			// Determine node type based on configuration and supported types
			const newComponentName = resolveComponentName(
				selectedNodeForConfig.data.metadata,
				newConfig.nodeType
			);

			// Update the flowNodes array to trigger reactivity
			flowNodes = flowNodes.map((node) =>
				node.id === selectedNodeForConfig?.id
					? {
							...node,
							type: newComponentName, // Update node type based on configuration and supportedTypes
							data: { ...node.data, config: { ...newConfig } }
						}
					: node
			);
		}
		closeConfigSidebar();
	}

	/**
	 * Save workflow
	 */
	async function saveWorkflow(): Promise<void> {
		try {
			// Determine the workflow ID based on whether we have an existing workflow
			let workflowId: string;
			if (props.workflow?.id) {
				// Use the existing workflow ID
				workflowId = props.workflow.id;
			} else {
				// Generate a new UUID for a new workflow
				workflowId = uuidv4();
			}

			const workflow: Workflow = {
				id: workflowId,
				name: workflowName,
				nodes: flowNodes,
				edges: flowEdges,
				metadata: {
					version: '1.0.0',
					createdAt: props.workflow?.metadata?.createdAt || new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			};

			const savedWorkflow = await workflowApi.saveWorkflow(workflow);

			// Note: Notes node configurations (content, noteType) are automatically
			// saved as part of the node.data.config object and will be restored
			// when the workflow is loaded.

			// Update the workflow ID if it was a new workflow
			if (!props.workflow?.id) {
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
	function exportWorkflow(): void {
		// Use the same ID logic as saveWorkflow
		const workflowId = props.workflow?.id || uuidv4();

		const workflow: Workflow = {
			id: workflowId,
			name: workflowName,
			nodes: flowNodes,
			edges: flowEdges,
			metadata: {
				version: '1.0.0',
				createdAt: props.workflow?.metadata?.createdAt || new Date().toISOString(),
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

	/**
	 * Handle title editing
	 */
	function startTitleEdit(): void {
		isEditingTitle = true;
		// Focus the input on next tick
		setTimeout(() => {
			const input = document.querySelector('#workflow-title') as HTMLInputElement;
			if (input) input.focus();
		}, 0);
	}

	/**
	 * Save title changes
	 */
	function saveTitle(): void {
		isEditingTitle = false;
		// Update the workflow name in the save/export functions
	}

	/**
	 * Cancel title editing
	 */
	function cancelTitleEdit(): void {
		isEditingTitle = false;
		workflowName = props.workflow?.name || 'Untitled Workflow';
	}

	// Removed sidebar toggle functions - sidebar is now always visible

	/**
	 * Handle title input keydown
	 */
	function handleTitleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			saveTitle();
		} else if (event.key === 'Escape') {
			cancelTitleEdit();
		}
	}
</script>

<SvelteFlowProvider>
	<div class="flowdrop-workflow-editor">
		<!-- Components Sidebar - Always Visible -->
		<NodeSidebar nodes={availableNodes} />

		<!-- Main Editor Area -->
		<div class="flowdrop-workflow-editor__main">
			<!-- Toolbar -->
			<div class="flowdrop-toolbar">
				<div class="flowdrop-toolbar__content">
					<!-- Left side - Workflow info -->
					<div class="flowdrop-toolbar__info">
						{#if isEditingTitle}
							<div class="flowdrop-flex flowdrop-gap--2">
								<input
									id="workflow-title"
									type="text"
									class="flowdrop-input flowdrop-input--lg"
									bind:value={workflowName}
									onkeydown={handleTitleKeydown}
									onblur={saveTitle}
								/>
								<button
									class="flowdrop-btn flowdrop-btn--ghost flowdrop-btn--sm"
									onclick={saveTitle}
									type="button"
								>
									✓
								</button>
								<button
									class="flowdrop-btn flowdrop-btn--ghost flowdrop-btn--sm"
									onclick={cancelTitleEdit}
									type="button"
								>
									✕
								</button>
							</div>
						{:else}
							<button class="flowdrop-workflow-title" onclick={startTitleEdit} type="button">
								{workflowName}
							</button>
						{/if}
					</div>

					<!-- Right side - Actions -->
					<div class="flowdrop-toolbar__actions">
						<!-- Workflow Actions -->
						<div class="flowdrop-join">
							<button
								class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline flowdrop-join__item"
								onclick={clearWorkflow}
								type="button"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="flowdrop-icon"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
									/>
								</svg>

								Clear
							</button>
							<button
								class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline flowdrop-join__item"
								onclick={exportWorkflow}
								type="button"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="flowdrop-icon"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
									/>
								</svg>

								Export
							</button>
							<button
								class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline flowdrop-join__item"
								onclick={saveWorkflow}
								type="button"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="flowdrop-icon"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
									/>
								</svg>

								Save
							</button>
						</div>
					</div>
				</div>
			</div>

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
								nodeData.config?.nodeType
							);

							const newNode: WorkflowNodeType = {
								id: newNodeId,
								type: svelteFlowNodeType,
								position, // Use the position calculated from the drop event
								deletable: true,
								data: {
									...nodeData,
									nodeId: newNodeId, // Use the same ID
									onConfigOpen: openConfigSidebar // Pass the global config sidebar function
								}
							};

							// Add node with proper reactivity trigger
							flowNodes = [...flowNodes, newNode];

							// Force a tick to ensure SvelteFlow updates
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
				<Background gap={10} />
				<MiniMap />

				<!-- Drop Zone Indicator -->
				{#if flowNodes.length === 0}
					<CanvasBanner
						title="Drag components here to start building"
						description="Use the sidebar to add components to your workflow"
						iconName="mdi:graph"
					/>
				{/if}

				<!-- Floating button removed - sidebar is now always visible -->
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

	<!-- Global Configuration Sidebar -->
	{#if selectedNodeForConfig}
		<ConfigSidebar
			isOpen={isConfigSidebarOpen}
			title={selectedNodeForConfig.data.label}
			configSchema={selectedNodeForConfig.data.metadata?.configSchema}
			configValues={selectedNodeForConfig.data.config}
			nodeDetails={{
				type: selectedNodeForConfig.data.metadata?.type || selectedNodeForConfig.type,
				category: selectedNodeForConfig.data.metadata?.category || 'general',
				description: selectedNodeForConfig.data.metadata?.description || 'Node configuration',
				version: selectedNodeForConfig.data.metadata?.version,
				tags: selectedNodeForConfig.data.metadata?.tags,
				inputs: selectedNodeForConfig.data.metadata?.inputs,
				outputs: selectedNodeForConfig.data.metadata?.outputs
			}}
			onSave={handleConfigSave}
			onCancel={closeConfigSidebar}
			onClose={closeConfigSidebar}
		/>
	{/if}
</SvelteFlowProvider>

<style>
	.flowdrop-workflow-editor {
		display: flex;
		flex-direction: row; /* Side by side layout */
		height: 100%;
		background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
		position: relative;
	}

	/* Sidebar container styles removed - now using always-visible NodeSidebar */

	.flowdrop-workflow-editor__main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		transition: margin-left 0.3s ease-in-out;
	}

	.flowdrop-toolbar {
		background-color: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid #e5e7eb;
		padding: 1rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.flowdrop-toolbar__content {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.flowdrop-toolbar__info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.flowdrop-workflow-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #111827;
		cursor: pointer;
		transition: color 0.2s ease-in-out;
		background: transparent;
		border: none;
		padding: 0;
	}

	.flowdrop-workflow-title:hover {
		color: #3b82f6;
	}

	.flowdrop-text--error {
		color: #dc2626;
	}

	.flowdrop-toolbar__actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.flowdrop-icon {
		width: 1.5rem;
		height: 1.5rem;
	}

	.flowdrop-canvas {
		flex: 1;
		min-height: 0;
		position: relative;
	}

	.flowdrop-status-bar {
		background-color: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(8px);
		border-top: 1px solid #e5e7eb;
		padding: 0.75rem;
	}

	.flowdrop-status-bar__content {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	:global(.flowdrop-workflow-editor .svelte-flow) {
		background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
		background-image: radial-gradient(circle, #d1d5db 1px, transparent 1px);
		background-size: 20px 20px;
		background-position:
			0 0,
			10px 10px;
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
	/* Floating button styles removed - sidebar is now always visible */
</style>
