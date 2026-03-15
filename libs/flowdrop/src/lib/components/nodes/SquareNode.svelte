<!--
  Square Node Component
  A simple square node with optional input and output ports
  Styled with BEM syntax

  UI Extensions Support:
  - hideUnconnectedHandles: Hides ports that are not connected to reduce visual clutter
  - hiddenPorts: Manually hide individual ports (visual-only, no effect on execution)
  - portOrder: Reorder ports by ID array (unspecified ports appear at end in original order)
-->

<script lang="ts">
  import { Position, Handle } from "@xyflow/svelte";
  import type {
    ConfigValues,
    NodeMetadata,
    NodeExtensions,
    NodePort,
  } from "../../types/index.js";
  import Icon from "@iconify/svelte";
  import {
    getDataTypeColor,
    getCategoryColorToken,
  } from "$lib/utils/colors.js";
  import { getNodeIcon } from "../../utils/icons.js";
  import { getConnectedHandles } from "../../stores/workflowStore.svelte.js";
  import {
    applyPortOrder,
    getPortTop,
    isPortVisible,
  } from "../../utils/portUtils.js";
  import CogIcon from "../icons/CogIcon.svelte";
  import AlertCircleIcon from "../icons/AlertCircleIcon.svelte";

  const props = $props<{
    data: {
      label: string;
      config: ConfigValues;
      metadata: NodeMetadata;
      nodeId?: string;
      extensions?: NodeExtensions;
      onConfigOpen?: (node: {
        id: string;
        type: string;
        data: { label: string; config: ConfigValues; metadata: NodeMetadata };
      }) => void;
    };
    selected?: boolean;
    isProcessing?: boolean;
    isError?: boolean;
  }>();

  /**
   * Get UI extension settings from extensions, merging node type defaults with instance overrides.
   */
  const hideUnconnectedHandles = $derived(
    props.data.extensions?.ui?.hideUnconnectedHandles ??
      props.data.metadata?.extensions?.ui?.hideUnconnectedHandles ??
      false,
  );

  const hiddenPorts = $derived(
    props.data.extensions?.ui?.hiddenPorts ??
      props.data.metadata?.extensions?.ui?.hiddenPorts ??
      {},
  );

  const portOrder = $derived(
    props.data.extensions?.ui?.portOrder ??
      props.data.metadata?.extensions?.ui?.portOrder ??
      {},
  );

  /**
   * Get icon using the same resolution as WorkflowNode
   * Uses getNodeIcon utility with category fallback
   */
  let squareIcon = $derived(
    getNodeIcon(props.data.metadata?.icon, props.data.metadata?.category),
  );

  /**
   * Get icon color using category-based color tokens for consistency
   * Falls back to primary color if category not available
   */
  let squareColor = $derived(
    getCategoryColorToken(props.data.metadata?.category),
  );

  // Handle configuration sidebar - now using global ConfigSidebar
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      // Create a WorkflowNodeType-like object for the global ConfigSidebar
      const nodeForConfig = {
        id: props.data.nodeId || "unknown",
        type: "square",
        data: props.data,
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
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openConfigSidebar();
    }
  }
  /**
   * All visible input ports in user-defined order.
   */
  const visibleInputPorts = $derived(
    applyPortOrder(props.data.metadata?.inputs ?? [], portOrder.inputs).filter(
      (p: NodePort) =>
        isPortVisible(
          p,
          "input",
          hiddenPorts,
          hideUnconnectedHandles,
          getConnectedHandles(),
          props.data.nodeId,
        ),
    ),
  );

  /**
   * All visible output ports in user-defined order.
   */
  const visibleOutputPorts = $derived(
    applyPortOrder(
      props.data.metadata?.outputs ?? [],
      portOrder.outputs,
    ).filter((p: NodePort) =>
      isPortVisible(
        p,
        "output",
        hiddenPorts,
        hideUnconnectedHandles,
        getConnectedHandles(),
        props.data.nodeId,
      ),
    ),
  );

  /**
   * Dynamic node size so handles never render outside the node body.
   * Overrides the fixed CSS height/width when more than 2 ports are visible on either side.
   */
  const nodeSize = $derived(
    (() => {
      const maxPorts = Math.max(
        visibleInputPorts.length,
        visibleOutputPorts.length,
        1,
      );
      return maxPorts <= 1 ? 80 : 20 + maxPorts * 40;
    })(),
  );
</script>

<!-- Input Handles: 1 port centered at 40px; N ports at 20px start, 40px gap -->
{#each visibleInputPorts as port, index}
  <Handle
    type="target"
    position={Position.Left}
    style="--fd-handle-fill: var(--fd-port-skin-color, {getDataTypeColor(
      port.dataType,
    )}); --fd-handle-border-color: var(--fd-handle-border); top: {getPortTop(
      index,
      visibleInputPorts.length,
    )}px; transform: translateY(-50%); z-index: 30;"
    id={`${props.data.nodeId}-input-${port.id}`}
  />
{/each}

<!-- Square Node -->
<div
  class="flowdrop-square-node flowdrop-square-node--compact"
  class:flowdrop-square-node--selected={props.selected}
  class:flowdrop-square-node--processing={props.isProcessing}
  class:flowdrop-square-node--error={props.isError}
  style="height: {nodeSize}px; width: {nodeSize}px"
  onclick={handleClick}
  ondblclick={handleDoubleClick}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <!-- Square Layout: Always compact with centered icon in squircle wrapper -->
  <div class="flowdrop-square-node__compact-content">
    <!-- Squircle icon — visibility controlled by --fd-node-icon-display -->
    <div
      class="flowdrop-square-node__icon-wrapper"
      style="--_icon-color: {squareColor}"
    >
      <Icon icon={squareIcon} class="flowdrop-square-node__icon" />
    </div>
    <!-- Circle dot — visibility controlled by --fd-node-circle-display -->
    <span
      class="flowdrop-square-node__color-dot"
      style="background: {getCategoryColorToken(props.data.metadata?.category)}"
    ></span>
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
      <AlertCircleIcon />
    </div>
  {/if}

  <!-- Config button -->
  <button
    class="flowdrop-square-node__config-btn"
    onclick={openConfigSidebar}
    title="Configure node"
  >
    <CogIcon />
  </button>
</div>

<!-- Output Handles: 1 port centered at 40px; N ports at 20px start, 40px gap -->
{#each visibleOutputPorts as port, index}
  <Handle
    type="source"
    position={Position.Right}
    style="--fd-handle-fill: var(--fd-port-skin-color, {getDataTypeColor(
      port.dataType,
    )}); --fd-handle-border-color: var(--fd-handle-border); top: {getPortTop(
      index,
      visibleOutputPorts.length,
    )}px; transform: translateY(-50%); z-index: 30;"
    id={`${props.data.nodeId}-output-${port.id}`}
  />
{/each}

<style>
  .flowdrop-square-node {
    position: relative;
    background-color: var(--fd-card);
    border: 1.5px solid var(--fd-node-border);
    border-radius: var(--fd-radius-xl);
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    box-shadow: var(--fd-shadow-md);
    overflow: visible; /* Changed from hidden to visible to allow handles to be properly accessible */
    z-index: 10;
    color: var(--fd-foreground);
  }

  /* Square layout (always compact) */
  .flowdrop-square-node--compact {
    width: var(--fd-node-square-size);
    height: var(--fd-node-square-size);
    justify-content: center;
    align-items: center;
  }

  .flowdrop-square-node:hover {
    box-shadow: var(--fd-shadow-lg);
    border-color: var(--fd-node-border-hover);
  }

  .flowdrop-square-node--selected {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-shadow-lg);
    border-color: var(--fd-primary);
  }

  .flowdrop-square-node--selected:hover {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-shadow-lg);
    border-color: var(--fd-primary);
  }

  .flowdrop-square-node:focus-visible {
    outline: 2px solid var(--fd-ring);
    outline-offset: 2px;
  }

  .flowdrop-square-node--processing {
    opacity: 0.7;
  }

  .flowdrop-square-node--error {
    border-color: var(--fd-error) !important;
    background-color: var(--fd-error-muted) !important;
  }

  /* Compact layout styles */
  .flowdrop-square-node__compact-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  /* Squircle icon wrapper - matching WorkflowNode style */
  .flowdrop-square-node__icon-wrapper {
    display: var(--fd-node-icon-display, flex);
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.625rem;
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity),
      transparent
    );
    flex-shrink: 0;
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-square-node:hover .flowdrop-square-node__icon-wrapper {
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity-hover),
      transparent
    );
    transform: scale(1.05);
  }

  .flowdrop-square-node__icon-wrapper :global(.flowdrop-square-node__icon) {
    width: 1.75rem;
    height: 1.75rem;
    color: var(--fd-node-icon);
  }

  /* Circle dot icon — shown in minimal skin via --fd-node-circle-display */
  .flowdrop-square-node__color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    display: var(--fd-node-circle-display, none);
  }

  .flowdrop-square-node__processing {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .flowdrop-square-node__spinner {
    width: 12px;
    height: 12px;
    border: 1px solid color-mix(in srgb, var(--fd-foreground) 30%, transparent);
    border-top: 1px solid var(--fd-foreground);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .flowdrop-square-node__error {
    position: absolute;
    top: 4px;
    right: 4px;
    color: var(--fd-error);
  }

  .flowdrop-square-node__error :global(svg) {
    width: 12px;
    height: 12px;
  }

  .flowdrop-square-node__config-btn :global(svg) {
    width: 14px;
    height: 14px;
  }

  .flowdrop-square-node__config-btn {
    position: absolute;
    top: var(--fd-space-xs);
    right: var(--fd-space-xs);
    width: 1.5rem;
    height: 1.5rem;
    background-color: var(--fd-backdrop);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    color: var(--fd-muted-foreground);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all var(--fd-transition-normal);
    backdrop-filter: var(--fd-backdrop-blur);
    z-index: 15;
    font-size: var(--fd-text-sm);
  }

  .flowdrop-square-node:hover .flowdrop-square-node__config-btn {
    opacity: 1;
  }

  .flowdrop-square-node__config-btn:hover {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
    color: var(--fd-foreground);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Handle: 20px/12px from base.css; position offsets for 20px handle */
  :global(.svelte-flow__node-square .svelte-flow__handle) {
    z-index: 20 !important;
    pointer-events: auto !important;
  }

  :global(.svelte-flow__node-square .svelte-flow__handle:hover) {
    transform: translateY(-50%) scale(1.2) !important;
  }
</style>
