<!--
  Workflow Editor Component
  Main workflow editor with sidebar and flow canvas
  Styled with BEM syntax
-->

<script lang="ts">
  import {
    SvelteFlow,
    ConnectionLineType,
    // @ts-ignore
    Controls,
    // @ts-ignore
    Background,
    // @ts-ignore
    MiniMap,
    // @ts-ignore
    SvelteFlowProvider,
  } from '@xyflow/svelte';
  import "@xyflow/svelte/dist/style.css";
  import NodeSidebar from "./NodeSidebar.svelte";
  import WorkflowNode from "./WorkflowNode.svelte";
  import type { WorkflowNode as WorkflowNodeType, NodeMetadata, Workflow, WorkflowEdge } from "../types/index.js";
  import { validateConnection, hasCycles } from "../utils/connections.js";
  import CanvasBanner from "./CanvasBanner.svelte";
  import { workflowApi, nodeApi, setApiBaseUrl, setEndpointConfig } from "../services/api.js";
  import { v4 as uuidv4 } from "uuid";
  import { tick } from "svelte";
  import type { EndpointConfig } from "../config/endpoints.js";

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
  let loadingNodes = $state(false);
  let nodeLoadError = $state<string | null>(null);
  
  $effect(() => {
    console.log('WorkflowEditor: props received:', {
      nodes: props.nodes?.length || 0,
      workflow: props.workflow ? 'present' : 'none',
      apiBaseUrl: props.apiBaseUrl
    });
    console.log('WorkflowEditor: props.nodes content:', props.nodes);
    console.log('WorkflowEditor: availableNodes state:', {
      count: availableNodes.length,
      hasNodes: availableNodes.length > 0,
      firstNode: availableNodes[0]?.name || 'none'
    });
    
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

  let workflowName = $state(props.workflow?.name || "Untitled Workflow");
  let isEditingTitle = $state(false);
  
  // Update workflow name when props change
  $effect(() => {
    console.log('🔄 WorkflowEditor: props.workflow changed:', props.workflow);
    if (props.workflow?.name) {
      console.log('📝 Setting workflow name to:', props.workflow.name);
      workflowName = props.workflow.name;
    }
  });
  
  // Node types for Svelte Flow
  const nodeTypes = {
    workflowNode: WorkflowNode
  };

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
    console.log('🔄 loadNodesFromApi called:', {
      hasPropsNodes: !!props.nodes,
      propsNodesLength: props.nodes?.length || 0,
      firstPropsNode: props.nodes?.[0]?.name || 'none'
    });
    
    // If nodes are provided via props, use them
    if (props.nodes && props.nodes.length > 0) {
      console.log('✅ Using nodes from props:', props.nodes.length, 'nodes');
      availableNodes = props.nodes;
      return;
    }

    // Otherwise, load from API
    try {
      loadingNodes = true;
      nodeLoadError = null;
      
      console.log('🔄 Loading nodes from API...');
      const fetchedNodes = await nodeApi.getNodes();
      
      console.log('✅ Loaded', fetchedNodes.length, 'nodes from API');
      console.log('🔍 First fetched node:', fetchedNodes[0]);
      availableNodes = fetchedNodes;
      console.log('🔍 Updated availableNodes:', {
        count: availableNodes.length,
        firstNode: availableNodes[0]?.name || 'none'
      });
      
    } catch (error) {
      console.error('❌ Failed to load nodes from API:', error);
      nodeLoadError = error instanceof Error ? error.message : 'Failed to load nodes';
      
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
    } finally {
      loadingNodes = false;
    }
  }

  // Load nodes when component mounts, when endpoint config changes, or when props.nodes changes
  $effect(() => {
    console.log('🔄 WorkflowEditor effect triggered:', {
      hasEndpointConfig: !!props.endpointConfig,
      hasApiBaseUrl: !!props.apiBaseUrl,
      hasPropsNodes: !!props.nodes,
      propsNodesLength: props.nodes?.length || 0
    });
    
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
   * Save workflow
   */
  async function saveWorkflow(): Promise<void> {
    try {
      // Determine the workflow ID based on whether we have an existing workflow
      let workflowId: string;
      if (props.workflow?.id) {
        // Use the existing workflow ID
        workflowId = props.workflow.id;
        console.log('💾 Saving existing workflow with ID:', workflowId);
      } else {
        // Generate a new UUID for a new workflow
        workflowId = uuidv4();
        console.log('🆕 Creating new workflow with ID:', workflowId);
      }

      const workflow: Workflow = {
        id: workflowId,
        name: workflowName,
        nodes: flowNodes,
        edges: flowEdges,
        metadata: {
          version: "1.0.0",
          createdAt: props.workflow?.metadata?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      
      const savedWorkflow = await workflowApi.saveWorkflow(workflow);
      console.log("✅ Workflow saved successfully:", savedWorkflow);
      
      // Update the workflow ID if it was a new workflow
      if (!props.workflow?.id) {
        console.log("🆕 New workflow created with ID:", savedWorkflow.id);
      } else {
        console.log("🔄 Existing workflow updated with ID:", savedWorkflow.id);
      }
    } catch (error) {
      console.error("❌ Failed to save workflow:", error);
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
        version: "1.0.0",
        createdAt: props.workflow?.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
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
    workflowName = props.workflow?.name || "Untitled Workflow";
  }

  /**
   * Handle title input keydown
   */
  function handleTitleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      saveTitle();
    } else if (event.key === "Escape") {
      cancelTitleEdit();
    }
  }

</script>

<SvelteFlowProvider>
<div class="flowdrop-workflow-editor">
  <!-- Node Sidebar -->
  <NodeSidebar 
    nodes={availableNodes} 
  />

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
            <button 
              class="flowdrop-workflow-title"
              onclick={startTitleEdit}
              type="button"
            >
              {workflowName}
            </button>
          {/if}
          <div class="flowdrop-workflow-stats">
            <span class="flowdrop-text--sm flowdrop-text--gray">{flowNodes.length} nodes</span>
            <span class="flowdrop-text--sm flowdrop-text--gray">•</span>
            <span class="flowdrop-text--sm flowdrop-text--gray">{flowEdges.length} connections</span>

            {#if checkWorkflowCycles()}
              <span class="flowdrop-text--sm flowdrop-text--gray">•</span>
              <span class="flowdrop-text--sm flowdrop-font--medium flowdrop-text--error">⚠️ Cycles detected</span>
            {/if}
          </div>
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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="flowdrop-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            
              Clear
            </button>
            <button
              class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline flowdrop-join__item"
              onclick={exportWorkflow}
              type="button"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="flowdrop-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            
              Export
            </button>
            <button
              class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline flowdrop-join__item"
              onclick={saveWorkflow}
              type="button"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="flowdrop-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
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
        e.dataTransfer!.dropEffect = "copy";
      }}
      ondrop={async (e: DragEvent) => {
        e.preventDefault();
        
        // Get the data from the drag event
        const nodeTypeData = e.dataTransfer?.getData("application/json");
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
            let nodeData: any;
            
            if (parsedData.type === "node") {
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
            
            const newNode: WorkflowNodeType = {
              id: newNodeId,
              type: "workflowNode",
              position, // Use the position calculated from the drop event
              deletable: true,
              data: {
                ...nodeData,
                nodeId: newNodeId // Use the same ID
              }
            };

            // Debug logging
            console.log('🎯 Created new node:', {
              nodeId: newNodeId,
              nodeData: nodeData,
              newNode: newNode,
              metadata: nodeData.metadata,
              configSchema: nodeData.metadata?.configSchema,
              configSchemaProperties: nodeData.metadata?.configSchema?.properties
            });

            // Add node with proper reactivity trigger
            flowNodes = [...flowNodes, newNode];
            
            // Force a tick to ensure SvelteFlow updates
            await tick();
          } catch (error) {
            console.error("Error parsing node data:", error);
          }
        }
      }}
    >
      <SvelteFlow
        bind:nodes={flowNodes}
        bind:edges={flowEdges}
        {nodeTypes}
        clickConnect={true}
        elevateEdgesOnSelect={true}
        connectionLineType={ConnectionLineType.Bezier}
        fitView
      />
      <Controls />
      <Background />
      <MiniMap />
     
      <!-- Drop Zone Indicator -->
      {#if flowNodes.length === 0}
        <CanvasBanner title="Drag components here to start building" description="Use the sidebar to add components to your workflow" iconName="mdi:graph" />
      {/if}
    </div>

    <!-- Status Bar -->
    <div class="flowdrop-status-bar">
      <div class="flowdrop-status-bar__content">
        <div class="flowdrop-flex flowdrop-gap--4">
          <span class="flowdrop-text--xs flowdrop-text--gray">All systems ready. You can start building your workflow.</span>
        </div>
      </div>
    </div>
    </div>
  </div>
</SvelteFlowProvider>

<style>
  .flowdrop-workflow-editor {
    display: flex;
    height: 100%;
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  }
  
  .flowdrop-workflow-editor__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
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
  
  .flowdrop-workflow-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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
    background-image: 
      radial-gradient(circle, #d1d5db 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
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
  
  :global(.flowdrop-workflow-editor .svelte-flow__handle) {
    width: 18px;
    height: 18px;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }
  
  :global(.flowdrop-workflow-editor .svelte-flow__handle:hover) {
    transform: scale(1.2);
  }

  /* Ensure our custom handles are clickable */
  :global(.flowdrop-workflow-editor .svelte-flow__handle) {
    pointer-events: all;
    cursor: crosshair;
  }
</style> 