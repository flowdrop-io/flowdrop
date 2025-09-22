<!--
  Square Node Component
  A simple square node with optional input and output ports
  Styled with BEM syntax
-->

<script lang="ts">
  import { 
    Position, 
    // @ts-ignore
    Handle
  } from "@xyflow/svelte";
  import type { NodeConfig } from "../types/index.js";
  import Icon from "@iconify/svelte";
  import { createEventDispatcher } from "svelte";
  import { getDataTypeColor } from "$lib/utils/colors.js";

  const dispatch = createEventDispatcher();

  const props = $props<{
    data: {
      label: string;
      config: NodeConfig;
      metadata: any;
      nodeId?: string;
      onConfigOpen?: (node: any) => void;
    };
    selected?: boolean;
    isProcessing?: boolean;
    isError?: boolean;
  }>();

  // Removed local config state - now using global ConfigSidebar

  // Prioritize metadata icon over config icon for square nodes (metadata is the node definition)
  let squareIcon = $derived(
    (props.data.metadata?.icon as string) || 
    (props.data.config?.icon as string) || 
    "mdi:square"
  );
  let squareColor = $derived(
    (props.data.metadata?.color as string) || 
    (props.data.config?.color as string) || 
    "#6366f1"
  );
  // Square nodes are always compact (square layout)
  const isCompact = true;
  
  // Layout configuration for square nodes (always compact)
  const currentLayout = {
    width: "80px", 
    height: "80px", 
    iconSize: "2rem",
    showHeader: false 
  };

  // Handle configuration sidebar - now using global ConfigSidebar
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      // Create a WorkflowNodeType-like object for the global ConfigSidebar
      const nodeForConfig = {
        id: props.data.nodeId || "unknown",
        type: "square",
        data: props.data
      };
      props.data.onConfigOpen(nodeForConfig);
    }
  }

  // Handle double-click to open config
  function handleDoubleClick(): void {
    openConfigSidebar();
  }

  // Handle single click to open config
  function handleClick(): void {
    openConfigSidebar();
  }

  // Handle keyboard events
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openConfigSidebar();
    }
  }

  // Get first input/output ports for square node representation
  let firstInputPort = $derived(props.data.metadata?.inputs?.[0]);
  let firstOutputPort = $derived(props.data.metadata?.outputs?.[0]);
  let hasInput = $derived(!!firstInputPort);
  let hasOutput = $derived(!!firstOutputPort);
</script>

<!-- Input Handle (optional) -->
{#if hasInput && firstInputPort}
  <Handle
    type="target"
    position={Position.Left}
    style="background-color: {getDataTypeColor(firstInputPort.dataType)}; border-color: '#ffffff';"
    id={`${props.data.nodeId}-${firstInputPort.id}`}
  />
{/if}

<!-- Square Node -->
<div
  class="flowdrop-square-node flowdrop-square-node--compact"
  class:flowdrop-square-node--selected={props.selected}
  class:flowdrop-square-node--processing={props.isProcessing}
  class:flowdrop-square-node--error={props.isError}
  onclick={handleClick}
  ondblclick={handleDoubleClick}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <!-- Square Layout: Always compact with centered icon -->
  <div class="flowdrop-square-node__compact-content">
    <Icon 
      icon={squareIcon} 
      class="flowdrop-square-node__compact-icon"
      style="color: {squareColor}; font-size: {currentLayout.iconSize};"
    />
  </div>


  <!-- Processing indicator -->
  {#if props.isProcessing}
    <div class="flowdrop-square-node__processing">
      <div class="flowdrop-square-node__spinner"></div>
    </div>
  {/if}

  <!-- Error indicator -->
  {#if props.isError}
    <div class="flowdrop-square-node__error">
      <Icon icon="mdi:alert-circle" class="flowdrop-square-node__error-icon" />
    </div>
  {/if}

  <!-- Config button -->
  <button
    class="flowdrop-square-node__config-btn"
    onclick={openConfigSidebar}
    title="Configure node"
  >
    <Icon icon="mdi:cog" />
  </button>
</div>

<!-- Output Handle (optional) -->
{#if hasOutput && firstOutputPort}
  <Handle
    type="source"
    position={Position.Right}
    style="background-color: {getDataTypeColor(firstOutputPort.dataType)}; border-color: '#ffffff';"
    id={`${props.data.nodeId}-${firstOutputPort.id}`}
  />
{/if}

<!-- ConfigSidebar removed - now using global ConfigSidebar in WorkflowEditor -->

<style>
  .flowdrop-square-node {
    position: relative;
    background-color: #ffffff;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    overflow: visible; /* Changed from hidden to visible to allow handles to be properly accessible */
    z-index: 10;
  }

  /* Square layout (always compact) */
  .flowdrop-square-node--compact {
    width: 80px;
    height: 80px;
    justify-content: center;
    align-items: center;
  }

  .flowdrop-square-node:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .flowdrop-square-node--selected {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border: 2px solid #3b82f6;
  }

  .flowdrop-square-node--processing {
    opacity: 0.7;
  }

  .flowdrop-square-node--error {
    border-color: #ef4444 !important;
    background-color: #fef2f2 !important;
  }


  /* Compact layout styles */
  .flowdrop-square-node__compact-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  :global(.flowdrop-square-node__compact-icon) {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }


  /* Label styling removed - now using header title */

  .flowdrop-square-node__processing {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .flowdrop-square-node__spinner {
    width: 12px;
    height: 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-top: 1px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .flowdrop-square-node__error {
    position: absolute;
    top: 4px;
    right: 4px;
    color: #ef4444;
  }

  :global(.flowdrop-square-node__error-icon) {
    width: 12px;
    height: 12px;
  }

  .flowdrop-square-node__config-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 1.5rem;
    height: 1.5rem;
    background-color: rgba(255, 255, 255, 0.9);
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    color: #6b7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s ease-in-out;
    backdrop-filter: blur(4px);
    z-index: 15;
    font-size: 0.875rem;
  }

  .flowdrop-square-node:hover .flowdrop-square-node__config-btn {
    opacity: 1;
  }

  .flowdrop-square-node__config-btn:hover {
    background-color: #f9fafb;
    border-color: #d1d5db;
    color: #374151;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Handle styles - matching WorkflowNode exactly */
  :global(.svelte-flow__node-square .svelte-flow__handle) {
    width: 18px !important;
    height: 18px !important;
    border-radius: 50% !important;
    transition: all 0.2s ease-in-out !important;
    cursor: pointer !important;
    z-index: 20 !important;
    pointer-events: auto !important;
  }

  :global(.svelte-flow__node-square .svelte-flow__handle-left) {
    left: -6px !important;
  }

  :global(.svelte-flow__node-square .svelte-flow__handle-right) {
    right: -6px !important;
  }


  :global(.svelte-flow__node-square .svelte-flow__handle:focus) {
    outline: 2px solid #3b82f6 !important;
    outline-offset: 2px !important;
  }
</style>
