<!--
  Square Node Component
  A simple square node with optional input and output ports
  Styled with BEM syntax

  Port rendering:
  - Exposure (data.config.exposedPorts, falling back to each port's
    exposedByDefault) decides which ports render — a not-exposed port is hidden.
  - portOrder: Reorder ports by ID array (unspecified ports appear at end in original order)
-->

<script lang="ts">
  import { Position, Handle } from '@xyflow/svelte';
  import type {
    ConfigValues,
    NodeMetadata,
    NodeExtensions,
    NodePort,
    DynamicPort,
    ExposedPortsConfig
  } from '../../types/index.js';
  import { dynamicPortToNodePort } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import { getPortColorToken, getCategoryColorToken } from '$lib/utils/colors.js';
  import { getNodeIcon } from '../../utils/icons.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { applyPortOrder, getPortTop, isPortVisible } from '../../utils/portUtils.js';
  import NodeConfigButton from './NodeConfigButton.svelte';
  import AlertCircleIcon from '../icons/AlertCircleIcon.svelte';

  interface Props {
    id: string;
    data: {
      label: string;
      config: ConfigValues;
      metadata: NodeMetadata;
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
  }

  let props: Props = $props();

  const fd = getInstance();
  const checker = fd.portCompatibility;

  /**
   * Per-instance port exposure overrides (semantic: a not-exposed port is
   * hidden, not wireable, not runtime-overridable). Lives in config.
   */
  const exposedPorts = $derived(
    (props.data.config?.exposedPorts as ExposedPortsConfig | undefined) ?? {}
  );

  const portOrder = $derived(
    props.data.extensions?.ui?.portOrder ?? props.data.metadata?.extensions?.ui?.portOrder ?? {}
  );

  /**
   * Get icon using the same resolution as WorkflowNode
   * Uses getNodeIcon utility with category fallback
   */
  let squareIcon = $derived(
    getNodeIcon(fd.categories, props.data.metadata?.icon, props.data.metadata?.category)
  );

  /**
   * Get icon color using category-based color tokens for consistency
   * Falls back to primary color if category not available
   */
  let squareColor = $derived(getCategoryColorToken(fd.categories, props.data.metadata?.category));

  // Handle configuration sidebar - now using global ConfigSidebar
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      // Create a WorkflowNodeType-like object for the global ConfigSidebar
      const nodeForConfig = {
        id: props.id,
        type: 'square',
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

  const dynamicInputs = $derived(
    ((props.data.config?.dynamicInputs as DynamicPort[]) || []).map((port) =>
      dynamicPortToNodePort(port, 'input')
    )
  );

  const dynamicOutputs = $derived(
    ((props.data.config?.dynamicOutputs as DynamicPort[]) || []).map((port) =>
      dynamicPortToNodePort(port, 'output')
    )
  );

  /**
   * All visible input ports in user-defined order.
   */
  const visibleInputPorts = $derived(
    applyPortOrder(
      [...(props.data.metadata?.inputs ?? []), ...dynamicInputs],
      portOrder.inputs
    ).filter((p: NodePort) => isPortVisible(p, 'input', exposedPorts))
  );

  /**
   * All visible output ports in user-defined order.
   */
  const visibleOutputPorts = $derived(
    applyPortOrder(
      [...(props.data.metadata?.outputs ?? []), ...dynamicOutputs],
      portOrder.outputs
    ).filter((p: NodePort) => isPortVisible(p, 'output', exposedPorts))
  );

  /**
   * Dynamic node size so handles never render outside the node body.
   * Overrides the fixed CSS height/width when more than 2 ports are visible on either side.
   */
  const nodeSize = $derived(
    (() => {
      const maxPorts = Math.max(visibleInputPorts.length, visibleOutputPorts.length, 1);
      return maxPorts <= 1 ? 80 : 20 + maxPorts * 40;
    })()
  );
</script>

<!-- Input Handles: 1 port centered at 40px; N ports at 20px start, 40px gap -->
{#each visibleInputPorts as port, index (port.id)}
  <Handle
    type="target"
    position={Position.Left}
    style="--fd-handle-fill: var(--fd-port-skin-color, {getPortColorToken(
      checker,
      port
    )}); --fd-handle-border-color: var(--fd-handle-border); top: {getPortTop(
      index,
      visibleInputPorts.length
    )}px; transform: translateY(-50%); z-index: 30;"
    id={`${props.id}-input-${port.id}`}
  />
{/each}

<!-- Square Node: outer is a transparent bounding box (height grows with ports so
     handles anchor in-bounds); the visible square inside stays a fixed 80×80. -->
<!-- Presentational: focus, keyboard and selection live on xyflow's node wrapper
     (see UniversalNode, which maps Enter/Space to opening config). click/
     double-click are mouse conveniences. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="flowdrop-square-node"
  class:flowdrop-square-node--selected={props.selected}
  class:flowdrop-square-node--processing={props.isProcessing}
  class:flowdrop-square-node--error={props.isError}
  style="height: {nodeSize}px"
  onclick={handleClick}
  ondblclick={handleDoubleClick}
>
  <!-- The visible, themed square — fixed 80×80, vertically centered in the slot -->
  <div class="flowdrop-square-node__square">
    <!-- Square Layout: Always compact with centered icon in squircle wrapper -->
    <div class="flowdrop-square-node__compact-content">
      <!-- Squircle icon — visibility controlled by --fd-node-icon-display -->
      <div class="flowdrop-square-node__icon-wrapper" style="--_icon-color: {squareColor}">
        <Icon icon={squareIcon} class="flowdrop-square-node__icon" />
      </div>
      <!-- Circle dot — visibility controlled by --fd-node-circle-display -->
      <span
        class="flowdrop-square-node__color-dot"
        style="background: {getCategoryColorToken(fd.categories, props.data.metadata?.category)}"
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
    <NodeConfigButton onclick={openConfigSidebar} title="Configure node" />
  </div>
</div>

<!-- Output Handles: 1 port centered at 40px; N ports at 20px start, 40px gap -->
{#each visibleOutputPorts as port, index (port.id)}
  <Handle
    type="source"
    position={Position.Right}
    style="--fd-handle-fill: var(--fd-port-skin-color, {getPortColorToken(
      checker,
      port
    )}); --fd-handle-border-color: var(--fd-handle-border); top: {getPortTop(
      index,
      visibleOutputPorts.length
    )}px; transform: translateY(-50%); z-index: 30;"
    id={`${props.id}-output-${port.id}`}
  />
{/each}

<style>
  /* Transparent slot: defines the node's bounding box so handles anchor
     consistently (height grows with port count), while the square sits fixed
     and vertically centered inside. */
  .flowdrop-square-node {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--fd-node-square-size);
    cursor: pointer;
    z-index: 10;
    color: var(--fd-foreground);
  }

  /* The visible, themed square — fixed 80×80, never expands. */
  .flowdrop-square-node__square {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--fd-node-square-size);
    height: var(--fd-node-square-size);
    background-color: var(--fd-node-bg);
    backdrop-filter: var(--fd-node-backdrop-filter);
    border: var(--fd-node-border-width) solid var(--fd-node-border);
    border-radius: var(--fd-node-radius);
    box-shadow: var(--fd-node-shadow);
    transition: all var(--fd-transition-fast);
    color: var(--fd-foreground);
  }

  .flowdrop-square-node:hover .flowdrop-square-node__square {
    box-shadow: var(--fd-node-shadow-hover);
    border-color: var(--fd-node-border-hover);
  }

  .flowdrop-square-node--selected .flowdrop-square-node__square {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-primary);
  }

  .flowdrop-square-node--selected:hover .flowdrop-square-node__square {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-primary);
  }

  /* Focus ring is centralized in base.css (drawn on the .svelte-flow__node
     wrapper, which is the focusable element). */

  .flowdrop-square-node--processing {
    opacity: 0.7;
  }

  .flowdrop-square-node--error .flowdrop-square-node__square {
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

  /* Squircle icon wrapper - px (not rem) so the icon stays grid-locked
     regardless of root font-size */
  .flowdrop-square-node__icon-wrapper {
    display: var(--fd-node-icon-display, flex);
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--_icon-color) var(--fd-node-icon-bg-opacity), transparent);
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
    width: 28px;
    height: 28px;
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

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-square-node:hover {
    --fd-config-btn-opacity: 1;
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
