<!--
  Workflow Node Component
  Renders individual nodes in the workflow editor with full functionality
  Uses SvelteFlow's Handle for connection ports
  Styled with BEM syntax
  
  UI Extensions Support:
  - hideUnconnectedHandles: Hides ports that are not connected to reduce visual clutter
  - portOrder: Visual-only reordering of input/output ports (no effect on execution)
  - hiddenPorts: Manually hidden ports per direction (required ports cannot be hidden)
-->

<script lang="ts">
  import { Position, Handle } from "@xyflow/svelte";
  import type {
    WorkflowNode,
    NodePort,
    DynamicPort,
  } from "../../types/index.js";
  import { dynamicPortToNodePort } from "../../types/index.js";
  import Icon from "@iconify/svelte";
  import { getNodeIcon } from "../../utils/icons.js";
  import CogIcon from "../icons/CogIcon.svelte";
  import {
    getDataTypeColorToken,
    getCategoryColorToken,
    getPortBackgroundColor,
  } from "../../utils/colors.js";
  import { getConnectedHandles } from "../../stores/workflowStore.svelte.js";
  import { applyPortOrder } from "../../utils/portUtils.js";

  interface Props {
    data: WorkflowNode["data"] & {
      nodeId?: string;
      onConfigOpen?: (node: {
        id: string;
        type: string;
        data: WorkflowNode["data"];
      }) => void;
    };
    selected?: boolean;
  }

  let props: Props = $props();
  let isHandleInteraction = $state(false);

  /**
   * Instance-specific title override from config.
   * Falls back to the original label if not set.
   * This allows users to customize the node title per-instance via config.
   */
  const displayTitle = $derived(
    (props.data.config?.instanceTitle as string) || props.data.label,
  );

  /**
   * Instance-specific description override from config.
   * Falls back to the metadata description if not set.
   * This allows users to customize the node description per-instance via config.
   */
  const displayDescription = $derived(
    (props.data.config?.instanceDescription as string) ||
      props.data.metadata.description,
  );

  /**
   * Get the hideUnconnectedHandles setting from extensions
   * Merges node type defaults with instance overrides
   */
  const hideUnconnectedHandles = $derived(
    props.data.extensions?.ui?.hideUnconnectedHandles ??
    props.data.metadata?.extensions?.ui?.hideUnconnectedHandles ??
    false,
  );

  /**
   * Get the portOrder setting from extensions (visual-only, no effect on execution)
   * Merges node type defaults with instance overrides
   */
  const portOrder = $derived(
    props.data.extensions?.ui?.portOrder ??
    props.data.metadata?.extensions?.ui?.portOrder ??
    {},
  );

  /**
   * Get the hiddenPorts setting from extensions (visual-only, no effect on execution)
   * Merges node type defaults with instance overrides
   */
  const hiddenPorts = $derived(
    props.data.extensions?.ui?.hiddenPorts ??
    props.data.metadata?.extensions?.ui?.hiddenPorts ??
    {},
  );

  /**
   * Dynamic inputs from config - user-defined input ports
   * Similar to how branches work in GatewayNode
   */
  const dynamicInputs = $derived(
    ((props.data.config?.dynamicInputs as DynamicPort[]) || []).map((port) =>
      dynamicPortToNodePort(port, "input"),
    ),
  );

  /**
   * Dynamic outputs from config - user-defined output ports
   * Similar to how branches work in GatewayNode
   */
  const dynamicOutputs = $derived(
    ((props.data.config?.dynamicOutputs as DynamicPort[]) || []).map((port) =>
      dynamicPortToNodePort(port, "output"),
    ),
  );

  /**
   * Combined input ports: static metadata inputs + dynamic config inputs,
   * sorted by portOrder if set (visual-only)
   */
  const allInputPorts = $derived(
    applyPortOrder(
      [...props.data.metadata.inputs, ...dynamicInputs],
      portOrder.inputs,
    ),
  );

  /**
   * Combined output ports: static metadata outputs + dynamic config outputs,
   * sorted by portOrder if set (visual-only)
   */
  const allOutputPorts = $derived(
    applyPortOrder(
      [...props.data.metadata.outputs, ...dynamicOutputs],
      portOrder.outputs,
    ),
  );

  /**
   * Check if a port should be visible based on connection state and settings
   * @param port - The port to check
   * @param type - Whether this is an 'input' or 'output' port
   * @returns true if the port should be visible
   */
  function isPortVisible(port: NodePort, type: "input" | "output"): boolean {
    // Manual hide takes precedence (required ports are prevented from being hidden in ConfigForm)
    const manuallyHidden =
      type === "input"
        ? hiddenPorts.inputs?.includes(port.id)
        : hiddenPorts.outputs?.includes(port.id);
    if (manuallyHidden) return false;

    // Always show if hideUnconnectedHandles is disabled
    if (!hideUnconnectedHandles) {
      return true;
    }

    // Always show required ports
    if (port.required) {
      return true;
    }

    // Check if port is connected
    const handleId = `${props.data.nodeId}-${type}-${port.id}`;
    return getConnectedHandles().has(handleId);
  }

  /**
   * Derived list of visible input ports based on hideUnconnectedHandles setting
   * Now includes both static and dynamic inputs
   */
  const visibleInputPorts = $derived(
    allInputPorts.filter((port) => isPortVisible(port, "input")),
  );

  /**
   * Derived list of visible output ports based on hideUnconnectedHandles setting
   * Now includes both static and dynamic outputs
   */
  const visibleOutputPorts = $derived(
    allOutputPorts.filter((port) => isPortVisible(port, "output")),
  );

  /**
   * Handle node click - only handle selection, no config opening
   */
  function handleNodeClick(): void {
    // Node selection is handled by Svelte Flow
  }

  /**
   * Handle double-click to open config
   */
  function handleDoubleClick(): void {
    openConfigSidebar();
  }

  /**
   * Handle configuration sidebar - now using global ConfigSidebar
   */
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      // Create a WorkflowNodeType-like object for the global ConfigSidebar
      const nodeForConfig = {
        id: props.data.nodeId || "unknown",
        type: "workflowNode",
        data: props.data,
      };
      props.data.onConfigOpen(nodeForConfig);
    }
  }
</script>

<!-- Node Container -->
<div
  class="flowdrop-workflow-node"
  class:flowdrop-workflow-node--selected={props.selected}
  onclick={handleNodeClick}
  ondblclick={handleDoubleClick}
  onmouseup={() => {
    isHandleInteraction = false;
  }}
  data-handle-interaction={isHandleInteraction}
  role="button"
  tabindex="0"
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDoubleClick();
    }
  }}
  aria-label="Workflow node: {props.data.metadata.name}"
  aria-describedby="node-description-{props.data.nodeId || 'unknown'}"
>
  <!-- Default Node Header: expands in multiples of 10 (title row 40px + gap 10px + description 20px per line) -->
  <div class="flowdrop-workflow-node__header">
    <div class="flowdrop-workflow-node__header-title">
      <!-- Squircle icon — visibility controlled by --fd-node-icon-display -->
      <div
        class="flowdrop-workflow-node__icon-wrapper"
        style="--_icon-color: {getCategoryColorToken(
          props.data.metadata.category,
        )}"
      >
        <Icon
          icon={getNodeIcon(
            props.data.metadata.icon,
            props.data.metadata.category,
          )}
          class="flowdrop-workflow-node__icon"
        />
      </div>
      <!-- Circle dot — visibility controlled by --fd-node-circle-display -->
      <span
        class="flowdrop-workflow-node__color-dot"
        style="background: {getCategoryColorToken(
          props.data.metadata.category,
        )}"
      ></span>

      <!-- Node Title - Icon and Title on same line -->
      <h3
        class="flowdrop-text--sm flowdrop-font--medium flowdrop-truncate flowdrop-flex--1"
      >
        {displayTitle}
      </h3>

      <!-- Status Indicators -->
      <div class="flowdrop-flex flowdrop-gap--2 flowdrop-items--center"></div>
    </div>
    <!-- Node Description - line-height 20px so header grows in steps of 10 -->
    <p
      class="flowdrop-workflow-node__header-desc"
      id="node-description-{props.data.nodeId || 'unknown'}"
    >
      {displayDescription}
    </p>
  </div>

  <!-- Input Ports Container -->
  {#if visibleInputPorts.length > 0}
    <div class="flowdrop-workflow-node__ports">
      <div class="flowdrop-workflow-node__ports-list">
        {#each visibleInputPorts as port (port.id)}
          <div class="flowdrop-workflow-node__port">
            <!-- Input Handle: centered in row, at node edge (ports have no padding) -->
            <Handle
              type="target"
              position={Position.Left}
              id={`${props.data.nodeId}-input-${port.id}`}
              class="flowdrop-workflow-node__handle"
              style="top: 50%; transform: translateY(-50%); --fd-handle-fill: var(--fd-port-skin-color, {getDataTypeColorToken(
                port.dataType,
              )}); --fd-handle-border-color: var(--fd-handle-border);"
              role="button"
              tabindex={0}
              aria-label="Connect to {port.name} input port"
            />

            <!-- Port Info: padding lives here so handle position is simple -->
            <div
              class="flowdrop-workflow-node__port-content flowdrop-flex--1 flowdrop-min-w--0"
            >
              <div class="flowdrop-flex flowdrop-gap--2">
                <span class="flowdrop-text--xs flowdrop-font--medium"
                  >{port.name}</span
                >
                <span
                  class="flowdrop-badge flowdrop-badge--sm"
                  style="background-color: {getPortBackgroundColor(
                    port.dataType,
                    15,
                  )}; color: {getDataTypeColorToken(
                    port.dataType,
                  )}; border: 1px solid {getPortBackgroundColor(
                    port.dataType,
                    30,
                  )};"
                >
                  {port.dataType}
                </span>
                {#if port.required}
                  <span
                    class="flowdrop-badge flowdrop-badge--error flowdrop-badge--sm"
                    >Required</span
                  >
                {/if}
              </div>
              {#if port.description}
                <p
                  class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate"
                >
                  {port.description}
                </p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Output Ports Container -->
  {#if visibleOutputPorts.length > 0}
    <div class="flowdrop-workflow-node__ports">
      <div class="flowdrop-workflow-node__ports-list">
        {#each visibleOutputPorts as port (port.id)}
          <div class="flowdrop-workflow-node__port">
            <!-- Port Info: padding lives here so handle position is simple -->
            <div
              class="flowdrop-workflow-node__port-content flowdrop-flex--1 flowdrop-min-w--0 flowdrop-text--right"
            >
              <div class="flowdrop-flex flowdrop-gap--2 flowdrop-justify--end">
                <span class="flowdrop-text--xs flowdrop-font--medium"
                  >{port.name}</span
                >
                <span
                  class="flowdrop-badge flowdrop-badge--sm"
                  style="background-color: {getPortBackgroundColor(
                    port.dataType,
                    15,
                  )}; color: {getDataTypeColorToken(
                    port.dataType,
                  )}; border: 1px solid {getPortBackgroundColor(
                    port.dataType,
                    30,
                  )};"
                >
                  {port.dataType}
                </span>
              </div>
              {#if port.description}
                <p
                  class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate"
                >
                  {port.description}
                </p>
              {/if}
            </div>

            <!-- Output Handle: centered in row, at node edge (ports have no padding) -->
            <Handle
              type="source"
              position={Position.Right}
              id={`${props.data.nodeId}-output-${port.id}`}
              class="flowdrop-workflow-node__handle"
              style="top: 50%; transform: translateY(-50%); --fd-handle-fill: var(--fd-port-skin-color, {getDataTypeColorToken(
                port.dataType,
              )}); --fd-handle-border-color: var(--fd-handle-border);"
              role="button"
              tabindex={0}
              aria-label="Connect from {port.name} output port"
            />
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Config button -->
  <button
    class="flowdrop-workflow-node__config-btn"
    onclick={openConfigSidebar}
    title="Configure node"
  >
    <CogIcon />
  </button>
</div>

<style>
  .flowdrop-workflow-node {
    position: relative;
    background-color: var(--fd-card);
    border: 1.5px solid var(--fd-node-border);
    border-radius: var(--fd-radius-xl);
    box-shadow: var(--fd-shadow-md);
    width: var(--fd-node-default-width);
    z-index: 10;
    color: var(--fd-foreground);
    transition: all var(--fd-transition-fast);
  }

  .flowdrop-workflow-node:hover {
    box-shadow: var(--fd-shadow-lg);
    border-color: var(--fd-node-border-hover);
  }

  .flowdrop-workflow-node--selected {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-shadow-lg);
    border-color: var(--fd-primary);
  }

  .flowdrop-workflow-node--selected:hover {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-shadow-lg);
    border-color: var(--fd-primary);
  }

  .flowdrop-workflow-node:focus-visible {
    outline: 2px solid var(--fd-ring);
    outline-offset: 2px;
  }

  .flowdrop-workflow-node__header {
    box-sizing: border-box;
    padding: var(--fd-node-header-gap) var(--fd-space-xl);
    border-bottom: 1px solid var(--fd-border-muted);
    background: var(--fd-header);
    border-top-left-radius: var(--fd-radius-xl);
    border-top-right-radius: var(--fd-radius-xl);
    display: flex;
    flex-direction: column;
    gap: var(--fd-node-header-gap);
    min-height: calc(
      var(--fd-node-header-gap) * 2 + var(--fd-node-header-title-height) +
        var(--fd-node-header-desc-line)
    );
  }

  .flowdrop-workflow-node__header-title {
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
    min-height: var(--fd-node-header-title-height);
    flex-shrink: 0;
  }

  .flowdrop-workflow-node__header-desc {
    margin: 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    line-height: var(--fd-node-header-desc-line);
    min-height: var(--fd-node-header-desc-line);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  /* Squircle icon wrapper - Apple-style rounded square background */
  .flowdrop-workflow-node__icon-wrapper {
    display: var(--fd-node-icon-display, flex);
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity),
      transparent
    );
    flex-shrink: 0;
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-workflow-node:hover .flowdrop-workflow-node__icon-wrapper {
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity-hover),
      transparent
    );
    transform: scale(1.05);
  }

  .flowdrop-workflow-node__icon-wrapper :global(.flowdrop-workflow-node__icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--fd-node-icon);
  }

  /* Circle dot icon — shown in minimal skin via --fd-node-circle-display */
  .flowdrop-workflow-node__color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    display: var(--fd-node-circle-display, none);
  }

  .flowdrop-workflow-node__header-title h3 {
    margin: 0;
    line-height: 1;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .flowdrop-workflow-node__ports {
    padding: 0;
  }

  .flowdrop-workflow-node__ports-list {
    display: flex;
    flex-direction: column;
    gap: var(--fd-node-header-gap);
    padding: var(--fd-node-header-gap) 0;
  }

  .flowdrop-workflow-node__port {
    display: flex;
    align-items: center;
    gap: 0;
    min-height: var(--fd-node-port-row-height);
    padding: var(--fd-space-3xs) 0;
    position: relative;
  }

  .flowdrop-workflow-node__port-content {
    padding: 0 var(--fd-space-xl);
  }

  .flowdrop-badge {
    padding: 0.125rem var(--fd-space-3xs);
    border-radius: var(--fd-radius-sm);
    font-size: 0.625rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .flowdrop-badge--error {
    background-color: var(--fd-error);
    color: var(--fd-error-foreground);
  }

  .flowdrop-badge--sm {
    font-size: 0.625rem;
    padding: 0.125rem var(--fd-space-3xs);
  }

  /* Handle overrides: hover scale (base 20px/12px from base.css) */
  :global(.flowdrop-workflow-node__handle:hover) {
    transform: translateY(-50%) scale(1.2);
  }

  /* Utility classes */
  .flowdrop-flex {
    display: flex;
  }

  .flowdrop-flex--1 {
    flex: 1;
  }

  .flowdrop-gap--2 {
    gap: var(--fd-space-xs);
  }

  .flowdrop-items--center {
    align-items: center;
  }

  .flowdrop-justify--end {
    justify-content: flex-end;
  }

  .flowdrop-min-w--0 {
    min-width: 0;
  }

  .flowdrop-text--xs {
    font-size: var(--fd-text-xs);
    line-height: 1rem;
  }

  .flowdrop-text--sm {
    font-size: var(--fd-text-sm);
    line-height: 1.25rem;
  }

  .flowdrop-text--gray {
    color: var(--fd-muted-foreground);
  }

  .flowdrop-font--medium {
    font-weight: 500;
  }

  .flowdrop-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flowdrop-text--right {
    text-align: right;
  }

  .flowdrop-workflow-node__config-btn :global(svg) {
    width: 14px;
    height: 14px;
  }

  .flowdrop-workflow-node__config-btn {
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

  .flowdrop-workflow-node:hover .flowdrop-workflow-node__config-btn {
    opacity: 1;
  }

  .flowdrop-workflow-node__config-btn:hover {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
    color: var(--fd-foreground);
  }
</style>
