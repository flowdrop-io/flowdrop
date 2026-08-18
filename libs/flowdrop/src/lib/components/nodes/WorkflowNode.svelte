<!--
  Workflow Node Component
  Renders individual nodes in the workflow editor with full functionality
  Uses SvelteFlow's Handle for connection ports
  Styled with BEM syntax
  
  Port rendering:
  - Exposure (data.config.ports, falling back to each port's exposedByDefault)
    decides which ports render — a not-exposed port is hidden.
  - Order: data.config.ports order overrides the metadata default (displayOrder);
    cosmetic only, no effect on execution.
-->

<script lang="ts">
  import { Position, Handle } from '@xyflow/svelte';
  import type { WorkflowNode, DynamicPort, PortsConfig } from '../../types/index.js';
  import { dynamicPortToNodePort } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import { getNodeIcon } from '../../utils/icons.js';
  import NodeConfigButton from './NodeConfigButton.svelte';
  import {
    getCategoryColorToken,
    getPortColorToken,
    getPortBackgroundColorForPort
  } from '../../utils/colors.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { orderPortsFor, isPortVisible } from '../../utils/portUtils.js';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import { interfaceBoundTooltip } from '$lib/utils/workflowInterface.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    id: string;
    data: WorkflowNode['data'] & {
      onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
    };
    selected?: boolean;
  }

  let props: Props = $props();
  let isHandleInteraction = $state(false);

  const fd = getInstance();
  const checker = fd.portCompatibility;

  /** Handle ids bound to a `workflow.interface` entry — see workflowStore. */
  const boundHandles = $derived(fd.workflow.interfaceBoundHandles);

  // Hoist the graph branch — three reads in the template, two of them inside
  // {#each port} loops where N×M reads add up. One getter walk per render.
  const graph = $derived(m().nodes.graph);

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
    (props.data.config?.instanceDescription as string) || props.data.metadata.description
  );

  /**
   * Per-instance port order + exposure, in config. Order overrides the metadata
   * default; exposure is semantic (a not-exposed port is hidden, not wireable,
   * not runtime-overridable).
   */
  const portsConfig = $derived((props.data.config?.ports as PortsConfig | undefined) ?? {});

  /**
   * Dynamic inputs from config - user-defined input ports
   * Similar to how branches work in GatewayNode
   */
  const dynamicInputs = $derived(
    ((props.data.config?.dynamicInputs as DynamicPort[]) || []).map((port) =>
      dynamicPortToNodePort(port, 'input')
    )
  );

  /**
   * Dynamic outputs from config - user-defined output ports
   * Similar to how branches work in GatewayNode
   */
  const dynamicOutputs = $derived(
    ((props.data.config?.dynamicOutputs as DynamicPort[]) || []).map((port) =>
      dynamicPortToNodePort(port, 'output')
    )
  );

  /**
   * Combined input ports: static metadata inputs + dynamic config inputs,
   * in effective order (metadata default, then config override; cosmetic).
   */
  const allInputPorts = $derived(
    orderPortsFor([...props.data.metadata.inputs, ...dynamicInputs], portsConfig.inputs)
  );

  /**
   * Combined output ports: static metadata outputs + dynamic config outputs,
   * in effective order (metadata default, then config override; cosmetic).
   */
  const allOutputPorts = $derived(
    orderPortsFor([...props.data.metadata.outputs, ...dynamicOutputs], portsConfig.outputs)
  );

  /**
   * Derived list of exposed input ports (static + dynamic).
   */
  const visibleInputPorts = $derived(
    allInputPorts.filter((port) => isPortVisible(port, 'input', portsConfig))
  );

  /**
   * Derived list of exposed output ports (static + dynamic).
   */
  const visibleOutputPorts = $derived(
    allOutputPorts.filter((port) => isPortVisible(port, 'output', portsConfig))
  );

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
        id: props.id,
        type: 'workflowNode',
        data: props.data
      };
      props.data.onConfigOpen(nodeForConfig);
    }
  }
</script>

<!-- Node Container -->
<!-- Presentational: focus, keyboard and selection live on xyflow's node
     wrapper (see UniversalNode). double-click is a mouse convenience. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flowdrop-workflow-node"
  class:flowdrop-workflow-node--selected={props.selected}
  ondblclick={handleDoubleClick}
  onmouseup={() => {
    isHandleInteraction = false;
  }}
  data-handle-interaction={isHandleInteraction}
  aria-label={graph.workflowNode({ name: props.data.metadata.name })}
  aria-describedby="node-description-{props.id}"
>
  <!-- Default Node Header: expands in multiples of 10 (title row 40px + gap 10px + description 20px per line) -->
  <div class="flowdrop-workflow-node__header">
    <div class="flowdrop-workflow-node__header-title">
      <!-- Squircle icon — visibility controlled by --fd-node-icon-display -->
      <div
        class="flowdrop-workflow-node__icon-wrapper"
        style="--_icon-color: {getCategoryColorToken(fd.categories, props.data.metadata.category)}"
      >
        <Icon
          icon={getNodeIcon(fd.categories, props.data.metadata.icon, props.data.metadata.category)}
          class="flowdrop-workflow-node__icon"
        />
      </div>
      <!-- Circle dot — visibility controlled by --fd-node-circle-display -->
      <span
        class="flowdrop-workflow-node__color-dot"
        style="background: {getCategoryColorToken(fd.categories, props.data.metadata.category)}"
      ></span>

      <!-- Node Title - Icon and Title on same line -->
      <h3 class="flowdrop-text--sm flowdrop-font--medium flowdrop-flex--1">
        {displayTitle}
      </h3>

      <!-- Status Indicators -->
      <div class="flowdrop-flex flowdrop-gap--2 flowdrop-items--center"></div>
    </div>
    <!-- Node Description - line-height 20px so header grows in steps of 10 -->
    <p class="flowdrop-workflow-node__header-desc" id="node-description-{props.id}">
      {displayDescription}
    </p>
  </div>

  <!-- Input Ports Container -->
  {#if visibleInputPorts.length > 0}
    <div class="flowdrop-workflow-node__ports">
      <div class="flowdrop-workflow-node__ports-list">
        {#each visibleInputPorts as port (port.id)}
          {@const boundEntry = boundHandles.get(buildHandleId(props.id, 'input', port.id))}
          <div class="flowdrop-workflow-node__port">
            <!-- Input Handle: one grid row (20px) from the top so it aligns with the label, at node edge -->
            <Handle
              type="target"
              position={Position.Left}
              id={`${props.id}-input-${port.id}`}
              class="flowdrop-workflow-node__handle {boundEntry ? 'flowdrop-handle--bound' : ''}"
              title={interfaceBoundTooltip(boundEntry)}
              style="top: var(--fd-node-port-row-height); transform: translateY(-50%); --fd-handle-fill: var(--fd-port-skin-color, {getPortColorToken(
                checker,
                port
              )}); --fd-handle-border-color: var(--fd-handle-border);"
              tabindex={-1}
            />

            <!-- Port Info: padding lives here so handle position is simple -->
            <div class="flowdrop-workflow-node__port-content flowdrop-flex--1 flowdrop-min-w--0">
              <div class="flowdrop-flex flowdrop-gap--2">
                <span class="flowdrop-text--xs flowdrop-font--medium">{port.name}</span>
                <span
                  class="flowdrop-badge flowdrop-badge--sm"
                  style="background-color: {getPortBackgroundColorForPort(
                    checker,
                    port,
                    15
                  )}; color: {getPortColorToken(
                    checker,
                    port
                  )}; border: 1px solid {getPortBackgroundColorForPort(checker, port, 30)};"
                >
                  {port.dataType}
                </span>
                {#if port.required}
                  <span class="flowdrop-badge flowdrop-badge--error flowdrop-badge--sm"
                    >Required</span
                  >
                {/if}
              </div>
              {#if port.description}
                <p class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate">
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
          {@const boundEntry = boundHandles.get(buildHandleId(props.id, 'output', port.id))}
          <div class="flowdrop-workflow-node__port">
            <!-- Port Info: padding lives here so handle position is simple -->
            <div
              class="flowdrop-workflow-node__port-content flowdrop-flex--1 flowdrop-min-w--0 flowdrop-text--right"
            >
              <div class="flowdrop-flex flowdrop-gap--2 flowdrop-justify--end">
                <span class="flowdrop-text--xs flowdrop-font--medium">{port.name}</span>
                <span
                  class="flowdrop-badge flowdrop-badge--sm"
                  style="background-color: {getPortBackgroundColorForPort(
                    checker,
                    port,
                    15
                  )}; color: {getPortColorToken(
                    checker,
                    port
                  )}; border: 1px solid {getPortBackgroundColorForPort(checker, port, 30)};"
                >
                  {port.dataType}
                </span>
              </div>
              {#if port.description}
                <p class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate">
                  {port.description}
                </p>
              {/if}
            </div>

            <!-- Output Handle: one grid row (20px) from the top so it aligns with the label, at node edge -->
            <Handle
              type="source"
              position={Position.Right}
              id={`${props.id}-output-${port.id}`}
              class="flowdrop-workflow-node__handle {boundEntry ? 'flowdrop-handle--bound' : ''}"
              title={interfaceBoundTooltip(boundEntry)}
              style="top: var(--fd-node-port-row-height); transform: translateY(-50%); --fd-handle-fill: var(--fd-port-skin-color, {getPortColorToken(
                checker,
                port
              )}); --fd-handle-border-color: var(--fd-handle-border);"
              tabindex={-1}
            />
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Config button -->
  <NodeConfigButton onclick={openConfigSidebar} title="Configure node" />
</div>

<style>
  .flowdrop-workflow-node {
    position: relative;
    background-color: var(--fd-node-bg);
    backdrop-filter: var(--fd-node-backdrop-filter);
    border: var(--fd-node-border-width) solid var(--fd-node-border);
    border-radius: var(--fd-node-radius);
    box-shadow: var(--fd-node-shadow);
    width: var(--fd-node-default-width);
    z-index: 10;
    color: var(--fd-foreground);
    transition: all var(--fd-transition-fast);
  }

  .flowdrop-workflow-node:hover {
    box-shadow: var(--fd-node-shadow-hover);
    border-color: var(--fd-node-border-hover);
  }

  .flowdrop-workflow-node--selected {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-primary);
  }

  .flowdrop-workflow-node--selected:hover {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-primary);
  }

  /* Focus ring is centralized in base.css (drawn on the .svelte-flow__node
     wrapper, which is the focusable element). */

  .flowdrop-workflow-node__header {
    box-sizing: border-box;
    /* Bottom padding absorbs BOTH the node's own top border and the header
       divider, so the body below the header lands on the 20px grid measured
       from the node's outer top edge: node-border + header = 100/120/140. */
    padding: var(--fd-node-header-gap) var(--fd-space-xl)
      calc(
        var(--fd-node-header-gap) - var(--fd-node-border-width) -
          var(--fd-node-header-divider-width)
      );
    border-bottom: var(--fd-node-header-divider-width) solid var(--fd-node-header-divider-color);
    background: var(--fd-node-header-bg);
    border-top-left-radius: var(--fd-node-radius);
    border-top-right-radius: var(--fd-node-radius);
    display: flex;
    flex-direction: column;
    gap: calc(var(--fd-node-header-gap) * 2);
    /* node-border (1.5) + header = 100/120/140. Header itself is
       4*gap + title + desc-line - node-border; each extra desc line adds 20. */
    min-height: calc(
      var(--fd-node-header-gap) * 4 + var(--fd-node-header-title-height) +
        var(--fd-node-header-desc-line) - var(--fd-node-border-width)
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
    /* px (not rem) so the icon stays grid-locked regardless of root font-size */
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--_icon-color) var(--fd-node-icon-bg-opacity), transparent);
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
    width: 20px;
    height: 20px;
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
    /* half the title block so two lines fill it exactly on the 20px grid */
    line-height: calc(var(--fd-node-header-title-height) / 2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-width: 0;
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
    gap: 0;
    /* No vertical padding: sections stack flush and node height stays a
       multiple of 20. The one exception is the clearance below the header
       divider, applied to the first section only (below). */
    padding: 0;
  }

  /* The first port section sits directly below the header divider; give it a
     full 20px grid row of clearance so the first port lands on the grid. */
  .flowdrop-workflow-node__header
    + .flowdrop-workflow-node__ports
    .flowdrop-workflow-node__ports-list {
    padding-top: calc(var(--fd-node-header-gap) * 2);
  }

  .flowdrop-workflow-node__port {
    display: flex;
    align-items: flex-start;
    gap: 0;
    /* Fixed three-row (60px) height for every port — node height stays
       predictable whether or not a port carries a description. */
    height: calc(var(--fd-node-port-row-height) * 3);
    padding: 0;
    position: relative;
  }

  .flowdrop-workflow-node__port-content {
    padding: var(--fd-node-header-gap) var(--fd-space-xl) 0;
  }

  /* Each line in a port occupies one 20px grid row: a label-only port
     centers its single row, a label + description fills both. */
  .flowdrop-workflow-node__port-content > div {
    min-height: var(--fd-node-port-row-height);
    align-items: center;
  }

  .flowdrop-workflow-node__port-content > p {
    min-height: var(--fd-node-port-row-height);
    line-height: var(--fd-node-port-row-height);
  }

  .flowdrop-badge {
    padding: 2px 4px;
    border-radius: var(--fd-radius-sm);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .flowdrop-badge--error {
    background-color: var(--fd-error);
    color: var(--fd-error-foreground);
  }

  .flowdrop-badge--sm {
    font-size: 10px;
    padding: 2px 4px;
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
    line-height: 16px;
  }

  .flowdrop-text--sm {
    font-size: var(--fd-text-sm);
    line-height: 20px;
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

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-workflow-node:hover {
    --fd-config-btn-opacity: 1;
  }
</style>
