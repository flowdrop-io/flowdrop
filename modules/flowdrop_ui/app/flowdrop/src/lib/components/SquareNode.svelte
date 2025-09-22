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

  // Get the square icon from config or use default
  let squareIcon = $derived((props.data.config?.icon as string) || "mdi:square");
  let squareColor = $derived((props.data.config?.color as string) || "#6366f1");
  let squareLayout = $derived((props.data.config?.layout as string) || "normal");

  // Layout configurations
  const layoutConfig = {
    compact: { 
      width: "80px", 
      height: "80px", 
      iconSize: "2rem",
      showHeader: false 
    },
    normal: { 
      width: "18rem", 
      height: "auto", 
      iconSize: "1rem",
      showHeader: true 
    }
  };

  let currentLayout = $derived(layoutConfig[squareLayout as keyof typeof layoutConfig] || layoutConfig.normal);
  let isCompact = $derived(squareLayout === "compact");

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

  // Check if node has input/output ports
  let hasInput = $derived(props.data.metadata?.inputs?.length > 0);
  let hasOutput = $derived(props.data.metadata?.outputs?.length > 0);
</script>

<!-- Input Handle (optional) -->
{#if hasInput}
  <Handle
    type="target"
    position={Position.Left}
    id="input"
  />
{/if}

<!-- Square Node -->
<div
  class="flowdrop-square-node"
  class:flowdrop-square-node--compact={isCompact}
  class:flowdrop-square-node--normal={!isCompact}
  class:flowdrop-square-node--selected={props.selected}
  class:flowdrop-square-node--processing={props.isProcessing}
  class:flowdrop-square-node--error={props.isError}
  onclick={handleClick}
  ondblclick={handleDoubleClick}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
>
  {#if isCompact}
    <!-- Compact Layout: Just centered icon -->
    <div class="flowdrop-square-node__compact-content">
      <Icon 
        icon={squareIcon} 
        class="flowdrop-square-node__compact-icon"
        style="color: {squareColor}; font-size: {currentLayout.iconSize};"
      />
    </div>
  {:else}
    <!-- Normal Layout: Header with title and description -->
    <div class="flowdrop-square-node__header">
      <div class="flowdrop-square-node__header-content">
        <!-- Node Icon -->
        <div class="flowdrop-square-node__icon-container" style="background-color: {squareColor}">
          <Icon 
            icon={squareIcon} 
            class="flowdrop-square-node__icon"
          />
        </div>
        
        <!-- Node Title -->
        <h3 class="flowdrop-square-node__title">
          {props.data.label}
        </h3>
      </div>
      
      <!-- Node Description -->
      <p class="flowdrop-square-node__description">
        {props.data.metadata?.description || "A configurable square node"}
      </p>
    </div>
  {/if}


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
{#if hasOutput}
  <Handle
    type="source"
    position={Position.Right}
    id="output"
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

  /* Normal layout (default) */
  .flowdrop-square-node--normal {
    width: 18rem;
  }

  /* Compact layout */
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

  .flowdrop-square-node__header {
    padding: 1rem;
    background-color: #f9fafb;
    border-radius: 0.75rem;
  }

  .flowdrop-square-node__header-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .flowdrop-square-node__icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    flex-shrink: 0;
  }

  /* Compact layout styles */
  .flowdrop-square-node__compact-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .flowdrop-square-node__compact-icon {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }

  .flowdrop-square-node__title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flowdrop-square-node__description {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 0.25rem 0 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.flowdrop-square-node__icon) {
    color: white;
    font-size: 1rem;
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
    background-color: #6b7280 !important;
    border: 2px solid #ffffff !important;
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

  /* Handle hover effects - matching WorkflowNode but without scale to avoid moving target */
  :global(.svelte-flow__node-square .svelte-flow__handle:hover) {
    background-color: #3b82f6 !important;
    /* Removed transform: scale(1.2) to prevent moving target issue */
  }

  :global(.svelte-flow__node-square .svelte-flow__handle:focus) {
    outline: 2px solid #3b82f6 !important;
    outline-offset: 2px !important;
  }
</style>
