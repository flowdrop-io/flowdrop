<!--
  Simple Node Component
  A simple node with optional input and output ports
  Styled with BEM syntax

  Port rendering:
  - Exposure (data.config.ports, falling back to each port's exposedByDefault)
    decides which ports render — a not-exposed port is hidden.
  - Order: data.config.ports order overrides the metadata default (displayOrder);
    unlisted ports follow in default order.
-->

<script lang="ts">
  import { Position, Handle } from '@xyflow/svelte';
  import type {
    ConfigValues,
    NodeMetadata,
    NodeExtensions,
    NodePort,
    DynamicPort,
    PortsConfig
  } from '../../types/index.js';
  import { dynamicPortToNodePort } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import { getPortColorToken, getCategoryColorToken } from '$lib/utils/colors.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { orderPortsFor, isPortVisible } from '../../utils/portUtils.js';
  import { computeShapeGeometry } from '../../utils/nodeGeometry.js';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import { interfaceBoundTooltip } from '$lib/utils/workflowInterface.js';
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

  /** Handle ids bound to a `workflow.interface` entry — see workflowStore. */
  const boundHandles = $derived(fd.workflow.interfaceBoundHandles);

  /**
   * Per-instance port order + exposure, in config. Order overrides the metadata
   * default; exposure is semantic (a not-exposed port is hidden, not wireable,
   * not runtime-overridable).
   */
  const portsConfig = $derived((props.data.config?.ports as PortsConfig | undefined) ?? {});

  // Prioritize metadata icon over config icon for simple nodes (metadata is the node definition)
  let nodeIcon = $derived(
    (props.data.metadata?.icon as string) || (props.data.config?.icon as string) || 'mdi:square'
  );
  let nodeColor = $derived(
    (props.data.metadata?.color as string) || (props.data.config?.color as string) || '#6366f1'
  );

  /**
   * Instance-specific title override from config.
   * Falls back to the original label if not set.
   * This allows users to customize the node title per-instance via config.
   */
  const displayTitle = $derived((props.data.config?.instanceTitle as string) || props.data.label);

  /**
   * Instance-specific description override from config.
   * Falls back to the metadata description if not set.
   * This allows users to customize the node description per-instance via config.
   */
  const displayDescription = $derived(
    (props.data.config?.instanceDescription as string) || props.data.metadata?.description || null
  );

  // Handle configuration sidebar - now using global ConfigSidebar
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      // Create a WorkflowNodeType-like object for the global ConfigSidebar
      const nodeForConfig = {
        id: props.id,
        type: 'simple',
        data: props.data
      };
      props.data.onConfigOpen(nodeForConfig);
    }
  }

  // Handle double-click to open config
  function handleDoubleClick(): void {
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
    orderPortsFor(
      [...(props.data.metadata?.inputs ?? []), ...dynamicInputs],
      portsConfig.inputs
    ).filter((p: NodePort) => isPortVisible(p, 'input', portsConfig))
  );

  /**
   * All visible output ports in user-defined order.
   */
  const visibleOutputPorts = $derived(
    orderPortsFor(
      [...(props.data.metadata?.outputs ?? []), ...dynamicOutputs],
      portsConfig.outputs
    ).filter((p: NodePort) => isPortVisible(p, 'output', portsConfig))
  );

  /**
   * The box and the handles, from the shared geometry: 280 wide, a multiple of
   * 40 tall, every handle centre a multiple of 20 from the top. The description
   * is clamped to what fits, so the box never grows with it.
   */
  const geometry = $derived(
    computeShapeGeometry({ inputs: visibleInputPorts, outputs: visibleOutputPorts })
  );
  const inputHandles = $derived(geometry.handles.filter((h) => h.direction === 'input'));
  const outputHandles = $derived(geometry.handles.filter((h) => h.direction === 'output'));
</script>

<!-- Input Handles: 1 port centered at 40px; N ports at 20px start, 40px gap -->
{#each inputHandles as h (h.portId)}
  {@const port = h.port}
  {@const boundEntry = boundHandles.get(buildHandleId(props.id, 'input', port.id))}
  <Handle
    type="target"
    position={Position.Left}
    title={interfaceBoundTooltip(boundEntry)}
    style="--fd-handle-fill: var(--fd-port-skin-color, {getPortColorToken(
      checker,
      port
    )}); --fd-handle-border-color: var(--fd-handle-border); top: {h.y}px; transform: translateY(-50%); z-index: 30;"
    id={`${props.id}-input-${port.id}`}
  />
{/each}

<!-- Simple Node -->
<!-- Presentational: focus, keyboard and selection live on xyflow's node
     wrapper (see UniversalNode). double-click is a mouse convenience. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flowdrop-simple-node flowdrop-simple-node--normal"
  class:flowdrop-simple-node--selected={props.selected}
  class:flowdrop-simple-node--processing={props.isProcessing}
  class:flowdrop-simple-node--error={props.isError}
  style="width: {geometry.width}px; height: {geometry.height}px; --_desc-lines: {geometry.height / 20 - 3};"
  ondblclick={handleDoubleClick}
>
  <div class="flowdrop-simple-node__header">
    <div class="flowdrop-simple-node__header-content">
      <!-- Node Icon (squircle) — visibility controlled by --fd-node-icon-display -->
      <div
        class="flowdrop-simple-node__icon-wrapper"
        style="--_icon-color: {nodeColor}"
        data-fd-glyph
      >
        <Icon icon={nodeIcon} class="flowdrop-simple-node__icon" />
      </div>
      <!-- Node Icon (circle dot) — visibility controlled by --fd-node-circle-display -->
      <span
        class="flowdrop-simple-node__color-dot"
        style="background: {getCategoryColorToken(fd.categories, props.data.metadata?.category)}"
      ></span>

      <!-- Node Title -->
      <h3
        class="flowdrop-simple-node__title"
        title={displayDescription || undefined}
        data-fd-title
      >
        {displayTitle}
      </h3>
    </div>

    <!-- Node Description -->
    {#if displayDescription}
      <p class="flowdrop-simple-node__description">
        {displayDescription}
      </p>
    {/if}
  </div>

  <!-- Processing indicator -->
  {#if props.isProcessing}
    <div class="flowdrop-simple-node__processing">
      <div class="flowdrop-simple-node__spinner"></div>
    </div>
  {/if}

  <!-- Error indicator -->
  {#if props.isError}
    <div class="flowdrop-simple-node__error">
      <AlertCircleIcon />
    </div>
  {/if}

  <!-- Config button -->
  <NodeConfigButton onclick={openConfigSidebar} title="Configure node" />
</div>

<!-- Output Handles: 1 port centered at 40px; N ports at 20px start, 40px gap -->
{#each outputHandles as h (h.portId)}
  {@const port = h.port}
  {@const boundEntry = boundHandles.get(buildHandleId(props.id, 'output', port.id))}
  <Handle
    type="source"
    position={Position.Right}
    title={interfaceBoundTooltip(boundEntry)}
    style="--fd-handle-fill: var(--fd-port-skin-color, {getPortColorToken(
      checker,
      port
    )}); --fd-handle-border-color: var(--fd-handle-border); top: {h.y}px; transform: translateY(-50%); z-index: 30;"
    id={`${props.id}-output-${port.id}`}
  />
{/each}

<style>
  /* The box is sized inline from the geometry (280 × a multiple of 40) and the
     border is an inset ring on ::after, so it never adds to the box. */
  .flowdrop-simple-node {
    --_border: var(--fd-node-border);
    position: relative;
    box-sizing: border-box;
    background-color: var(--fd-node-bg);
    backdrop-filter: var(--fd-node-backdrop-filter);
    border-radius: var(--fd-node-radius);
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    box-shadow: var(--fd-node-shadow);
    overflow: hidden;
    z-index: 10;
    color: var(--fd-foreground);
  }

  .flowdrop-simple-node::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 0 var(--fd-node-border-width) var(--_border);
    pointer-events: none;
  }

  .flowdrop-simple-node:hover {
    --_border: var(--fd-node-border-hover);
    box-shadow: var(--fd-node-shadow-hover);
  }

  .flowdrop-simple-node--selected,
  .flowdrop-simple-node--selected:hover {
    --_border: var(--fd-node-selected-border);
    box-shadow:
      0 0 0 var(--fd-node-selected-edge) var(--fd-node-selected-border),
      0 0 0 calc(var(--fd-node-selected-edge) + var(--fd-node-selected-ring-width))
        var(--fd-node-selected-ring),
      var(--fd-node-shadow-hover);
  }

  /* Focus ring is centralized in base.css (drawn on the .svelte-flow__node
     wrapper, which is the focusable element). */

  .flowdrop-simple-node--processing {
    opacity: 0.7;
  }

  .flowdrop-simple-node--error {
    --_border: var(--fd-error);
    background-color: var(--fd-error-muted) !important;
  }

  .flowdrop-simple-node__header {
    /* px (not rem) on the 20px grid: 10px vertical, 20px horizontal. The box is
       fixed, so the title takes one 20px line and the description the rest. */
    box-sizing: border-box;
    padding: 10px 20px;
    background: var(--fd-node-header-bg);
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .flowdrop-simple-node__header-content {
    min-height: 40px;
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
  }

  /* Squircle icon wrapper - Apple-style rounded square background */
  .flowdrop-simple-node__icon-wrapper {
    display: var(--fd-node-icon-display, flex);
    align-items: center;
    justify-content: center;
    /* px (not rem) so the icon stays grid-locked regardless of root font-size */
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--_icon-color) var(--fd-node-icon-bg-opacity), transparent);
    flex-shrink: 0;
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-simple-node:hover .flowdrop-simple-node__icon-wrapper {
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity-hover),
      transparent
    );
    transform: scale(1.05);
  }

  .flowdrop-simple-node__title {
    font-size: var(--fd-text-sm);
    font-weight: 500;
    color: var(--fd-foreground);
    margin: 0;
    flex: 1;
    min-width: 0;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .flowdrop-simple-node__description {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    margin: 0;
    line-height: 20px;
    /* whole lines only: what is left under the 40px icon row */
    max-height: calc(var(--_desc-lines) * 20px);
    overflow: hidden;
    display: var(--fd-node-desc-block-display);
  }

  .flowdrop-simple-node__icon-wrapper :global(.flowdrop-simple-node__icon) {
    width: 20px;
    height: 20px;
    color: var(--fd-node-icon);
  }

  .flowdrop-simple-node__processing {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .flowdrop-simple-node__spinner {
    width: 12px;
    height: 12px;
    border: 1px solid color-mix(in srgb, var(--fd-foreground) 30%, transparent);
    border-top: 1px solid var(--fd-foreground);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .flowdrop-simple-node__error {
    position: absolute;
    top: 4px;
    right: 4px;
    color: var(--fd-error);
  }

  .flowdrop-simple-node__error :global(svg) {
    width: 12px;
    height: 12px;
  }

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-simple-node:hover {
    --fd-config-btn-opacity: 1;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Handle: 20px/12px from base.css; position offsets for 20px handle */
  :global(.svelte-flow__node-simple .svelte-flow__handle) {
    z-index: 20 !important;
    pointer-events: auto !important;
  }

  :global(.svelte-flow__node-simple .svelte-flow__handle:hover) {
    transform: translateY(-50%) scale(1.2) !important;
  }

  /* Circle dot icon — shown in minimal skin via --fd-node-circle-display */
  .flowdrop-simple-node__color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    display: var(--fd-node-circle-display, none);
  }
</style>
