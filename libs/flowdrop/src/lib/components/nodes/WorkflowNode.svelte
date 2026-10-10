<!--
  Workflow Node Component
  Renders individual nodes in the workflow editor with full functionality
  Uses SvelteFlow's Handle for connection ports
  Styled with BEM syntax

  Card v2 (Graphite G8): one fixed geometry from utils/nodeGeometry.ts. The
  header is always 60px, the completion `trigger` ports are pins in it (y = 20),
  every other port is a half-pill on a shared row (first row y = 80, pitch 40),
  the width is 280 or 320 and the border is drawn inside the box, so every
  handle centre is a multiple of 20 and any output can meet any input in a
  straight wire. Every handle is placed from the geometry, never from layout.

  Port rendering:
  - Exposure (data.config.ports, falling back to each port's exposedByDefault)
    decides which ports render — a not-exposed port is hidden.
  - Order: data.config.ports order overrides the metadata default (displayOrder);
    cosmetic only, no effect on execution.
-->

<script lang="ts">
  import { Position, Handle } from '@xyflow/svelte';
  import type { WorkflowNode, DynamicPort, NodePort, PortsConfig } from '../../types/index.js';
  import { dynamicPortToNodePort } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import { getNodeIcon } from '../../utils/icons.js';
  import NodeConfigButton from './NodeConfigButton.svelte';
  import {
    getCategoryColorToken,
    getPortColorToken,
    getDataTypeConfig
  } from '../../utils/colors.js';
  import { getEditorSettings } from '../../stores/settingsStore.svelte.js';
  import { computeNodeGeometry } from '../../utils/nodeGeometry.js';
  import { onMount, tick } from 'svelte';
  import NodeTip from './NodeTip.svelte';
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

  /** The node's geometry: where the header, the band, every row and every handle is. */
  const geometry = $derived(
    computeNodeGeometry({
      inputs: visibleInputPorts,
      outputs: visibleOutputPorts,
      showDescriptions: getEditorSettings().showNodeDescriptions
    })
  );

  /** Handle ids of this node's wired ports. */
  const wiredHandles = $derived.by(() => {
    const set = new Set<string>();
    for (const edge of fd.workflow.edges) {
      if (edge.source === props.id && edge.sourceHandle) set.add(edge.sourceHandle);
      if (edge.target === props.id && edge.targetHandle) set.add(edge.targetHandle);
    }
    return set;
  });

  /** The completion trigger pins in the header, with their ports. */
  const pins = $derived(
    geometry.handles
      .filter((h) => h.kind === 'pin')
      .map((h) => {
        const list = h.direction === 'input' ? visibleInputPorts : visibleOutputPorts;
        const handleId = buildHandleId(props.id, h.direction, h.portId);
        return {
          ...h,
          port: list.find((p) => p.id === h.portId) as NodePort,
          handleId,
          wired: wiredHandles.has(handleId)
        };
      })
  );

  const categoryColor = $derived(
    getCategoryColorToken(fd.categories, props.data.metadata.category)
  );
  const kindLine = $derived(
    `${fd.categories.getLabel(props.data.metadata.category)} · ${props.id}`
  );

  // Two-line titles hide the "kind · id" line (it is in the popover). Measured,
  // because CSS cannot tell a wrapped title from a short one.
  let titleEl: HTMLElement | undefined = $state();
  let titleWraps = $state(false);

  function measureTitle(): void {
    if (titleEl) titleWraps = titleEl.scrollHeight > 30;
  }

  onMount(() => {
    void tick().then(measureTitle);
    void document.fonts?.ready.then(measureTitle);
  });
  $effect(() => {
    void displayTitle;
    void geometry.width;
    void tick().then(measureTitle);
  });

  // ---- Tooltips: the title popover and the port tooltips ----
  interface Tip {
    anchor: DOMRect;
    align: 'start' | 'end';
    variant: 'tip' | 'pop';
    title: string;
    code?: string;
    body?: string;
    note?: string;
  }
  let tip = $state<Tip | null>(null);
  let tipTimer: ReturnType<typeof setTimeout> | undefined;

  function hideTip(): void {
    clearTimeout(tipTimer);
    tip = null;
  }

  function showPortTip(
    event: Event,
    port: NodePort,
    direction: 'input' | 'output',
    open: boolean,
    pin: boolean
  ): void {
    clearTimeout(tipTimer);
    const anchor = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const bound = boundHandles.get(buildHandleId(props.id, direction, port.id));
    const typeName = getDataTypeConfig(checker, port.dataType)?.name ?? port.dataType;
    const body =
      port.description ||
      (pin ? (direction === 'input' ? graph.execIn : graph.execOut) : undefined);
    const notes = [
      open && port.required && direction === 'input' ? graph.portRequired : null,
      bound ? graph.publishedAs({ name: bound.name ?? bound.id }) : null
    ].filter(Boolean);
    tipTimer = setTimeout(
      () => {
        tip = {
          anchor,
          align: direction === 'output' ? 'end' : 'start',
          variant: 'tip',
          title: port.name,
          code: typeName,
          body,
          note: notes.join(' · ') || undefined
        };
      },
      tip ? 0 : 250
    );
  }

  function showNodeTip(event: Event): void {
    clearTimeout(tipTimer);
    const anchor = (event.currentTarget as HTMLElement).getBoundingClientRect();
    tipTimer = setTimeout(() => {
      tip = {
        anchor,
        align: 'start',
        variant: 'pop',
        title: displayTitle,
        code: kindLine,
        body: displayDescription || undefined,
        note: graph.configureHint
      };
    }, 400);
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
  class:flowdrop-workflow-node--bands={geometry.descriptionBand > 0}
  ondblclick={handleDoubleClick}
  onmouseup={() => {
    isHandleInteraction = false;
  }}
  data-handle-interaction={isHandleInteraction}
  aria-label={graph.workflowNode({ name: props.data.metadata.name })}
  aria-describedby="node-description-{props.id}"
  style="--_cat: {categoryColor}; width: {geometry.width}px; height: {geometry.height}px;"
>
  <!-- Header: fixed 60px. Title (2 lines at most) over "kind · id"; hovering it
       opens the node's description. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flowdrop-workflow-node__header"
    class:flowdrop-workflow-node__header--wraps={titleWraps}
    onmouseenter={showNodeTip}
    onmouseleave={hideTip}
  >
    <div class="flowdrop-workflow-node__tile">
      <Icon
        icon={getNodeIcon(fd.categories, props.data.metadata.icon, props.data.metadata.category)}
        class="flowdrop-workflow-node__icon"
      />
    </div>
    <h3 class="flowdrop-workflow-node__title" bind:this={titleEl}>{displayTitle}</h3>
    <span class="flowdrop-workflow-node__kind">{kindLine}</span>
  </div>

  <!-- Description band: reserved on every node while the setting is on. -->
  {#if geometry.descriptionBand > 0}
    <p class="flowdrop-workflow-node__desc" id="node-description-{props.id}">
      {displayDescription}
    </p>
  {:else}
    <span class="flowdrop-workflow-node__sr" id="node-description-{props.id}"
      >{displayDescription}</span
    >
  {/if}

  <!-- Exec pins: the completion trigger, in and out, at y = 20. -->
  {#each pins as pin (pin.handleId)}
    <Handle
      type={pin.direction === 'input' ? 'target' : 'source'}
      position={pin.direction === 'input' ? Position.Left : Position.Right}
      id={pin.handleId}
      class="flowdrop-workflow-node__handle flowdrop-workflow-node__handle--pin {pin.wired
        ? 'flowdrop-workflow-node__handle--wired'
        : 'flowdrop-workflow-node__handle--open'}"
      aria-label={pin.direction === 'input' ? graph.execIn : graph.execOut}
      style="top: {pin.y}px; transform: translateY(-50%);"
      tabindex={-1}
      onmouseenter={(e: Event) => showPortTip(e, pin.port, pin.direction, false, true)}
      onmouseleave={hideTip}
    />
  {/each}

  <!-- Port rows: inputs left, outputs right, on shared rows. -->
  {#each geometry.handles.filter((h) => h.kind === 'row') as h (h.direction + h.portId)}
    {@const port = (h.direction === 'input' ? visibleInputPorts : visibleOutputPorts).find(
      (p) => p.id === h.portId
    )}
    {#if port}
      {@const handleId = buildHandleId(props.id, h.direction, port.id)}
      {@const wired = wiredHandles.has(handleId)}
      {@const color = `var(--fd-port-skin-color, ${getPortColorToken(checker, port)})`}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flowdrop-workflow-node__pill flowdrop-workflow-node__pill--{h.direction}"
        class:flowdrop-workflow-node__pill--open={!wired}
        style="top: {h.y}px; --_c: {color};"
        onmouseenter={(e: Event) => showPortTip(e, port, h.direction, !wired, false)}
        onmouseleave={hideTip}
      >
        <span class="flowdrop-workflow-node__pill-name">{port.name}</span>
        {#if h.direction === 'input' && port.required && !wired}
          <span class="flowdrop-workflow-node__pill-required" aria-hidden="true">*</span>
        {/if}
      </div>
      <Handle
        type={h.direction === 'input' ? 'target' : 'source'}
        position={h.direction === 'input' ? Position.Left : Position.Right}
        id={handleId}
        class="flowdrop-workflow-node__handle {wired
          ? 'flowdrop-workflow-node__handle--wired'
          : 'flowdrop-workflow-node__handle--open'}"
        aria-label={h.direction === 'input'
          ? graph.connectInputPort({ name: port.name })
          : graph.connectOutputPort({ name: port.name })}
        style="top: {h.y}px; transform: translateY(-50%); --_c: {color};"
        tabindex={-1}
        onmouseenter={(e: Event) => showPortTip(e, port, h.direction, !wired, false)}
        onmouseleave={hideTip}
      />
    {/if}
  {/each}

  <!-- Config button -->
  <NodeConfigButton onclick={openConfigSidebar} title="Configure node" />
</div>

{#if tip}
  <NodeTip
    anchor={tip.anchor}
    align={tip.align}
    variant={tip.variant}
    title={tip.title}
    code={tip.code}
    body={tip.body}
    note={tip.note}
  />
{/if}

<style>
  /* The card. Its size is set inline from the geometry; the border is an inset
     ring on ::after (above the header wash), so it never adds to the box. */
  .flowdrop-workflow-node {
    --_border: var(--fd-node-border);
    position: relative;
    box-sizing: border-box;
    background-color: var(--fd-node-bg);
    backdrop-filter: var(--fd-node-backdrop-filter);
    border-radius: var(--fd-node-radius);
    box-shadow: var(--fd-node-shadow);
    z-index: 10;
    color: var(--fd-foreground);
    transition:
      box-shadow var(--fd-transition-fast),
      background-color var(--fd-transition-fast);
  }

  .flowdrop-workflow-node::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 0 var(--fd-node-border-width) var(--_border);
    pointer-events: none;
    z-index: 1;
  }

  .flowdrop-workflow-node:hover {
    --_border: var(--fd-node-border-hover);
    box-shadow: var(--fd-node-shadow-hover);
  }

  .flowdrop-workflow-node--selected,
  .flowdrop-workflow-node--selected:hover {
    --_border: var(--fd-node-selected-border);
    box-shadow:
      0 0 0 var(--fd-node-selected-edge) var(--fd-node-selected-border),
      0 0 0 calc(var(--fd-node-selected-edge) + var(--fd-node-selected-ring-width))
        var(--fd-node-selected-ring),
      var(--fd-node-shadow-hover);
  }

  /* Focus ring is centralized in base.css (drawn on the .svelte-flow__node
     wrapper, which is the focusable element). */

  /* Header: 60px, a category wash, a solid icon tile, the title over "kind · id". */
  .flowdrop-workflow-node__header {
    position: absolute;
    inset: 0 0 auto 0;
    height: 60px;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: var(--fd-node-tile-size) minmax(0, 1fr);
    grid-template-rows: 20px 20px;
    column-gap: var(--fd-space-md);
    align-items: center;
    padding: 10px var(--fd-node-header-pad-x);
    background: color-mix(
      in srgb,
      var(--_cat) var(--fd-node-header-wash),
      var(--fd-node-header-bg)
    );
    border-top-left-radius: var(--fd-node-radius);
    border-top-right-radius: var(--fd-node-radius);
  }

  .flowdrop-workflow-node__tile {
    grid-row: 1 / 3;
    align-self: start;
    margin-top: calc((40px - var(--fd-node-tile-size)) / 2);
    display: var(--fd-node-icon-display, flex);
    align-items: center;
    justify-content: center;
    width: var(--fd-node-tile-size);
    height: var(--fd-node-tile-size);
    border-radius: var(--fd-node-tile-radius);
    background: var(--_cat);
    box-shadow: var(--fd-node-tile-shadow);
  }

  .flowdrop-workflow-node__tile :global(.flowdrop-workflow-node__icon) {
    width: var(--fd-node-tile-glyph);
    height: var(--fd-node-tile-glyph);
    color: var(--fd-node-tile-fg);
  }

  .flowdrop-workflow-node__title {
    grid-column: 2;
    margin: 0;
    min-width: 0;
    font-size: var(--fd-node-title-size);
    font-weight: var(--fd-node-title-weight);
    line-height: 20px;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  /* One line: the title takes the first row and the kind line the second. A
     wrapped title takes both rows and the kind line gives way. */
  .flowdrop-workflow-node__header--wraps .flowdrop-workflow-node__title {
    grid-row: 1 / 3;
    align-self: start;
  }

  .flowdrop-workflow-node__kind {
    grid-column: 2;
    min-width: 0;
    font-size: var(--fd-node-kind-size);
    line-height: 20px;
    color: var(--fd-node-kind-fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .flowdrop-workflow-node__header--wraps .flowdrop-workflow-node__kind {
    display: none;
  }

  /* Description band: 60px (10 air, 2 lines at 12/20, 10 air, hairline). */
  .flowdrop-workflow-node__desc {
    position: absolute;
    inset: 60px 0 auto 0;
    height: 60px;
    box-sizing: border-box;
    margin: 0;
    padding: 10px var(--fd-node-header-pad-x);
    font-size: var(--fd-text-xs);
    line-height: 20px;
    color: var(--fd-muted-foreground);
    border-bottom: 1px solid var(--fd-node-desc-rule);
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .flowdrop-workflow-node__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  /* Port pills: half-pills growing out of the card edge, on the row centre. */
  .flowdrop-workflow-node__pill {
    position: absolute;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    max-width: var(--fd-node-pill-max-width);
    height: var(--fd-node-pill-height);
    box-sizing: border-box;
    font-size: var(--fd-node-pill-size);
    font-weight: var(--fd-node-pill-weight);
    color: var(--fd-foreground);
    background: color-mix(in srgb, var(--_c) var(--fd-node-pill-wired-mix), var(--fd-node-bg));
    cursor: default;
    transition: filter var(--fd-transition-fast);
  }

  .flowdrop-workflow-node__pill:hover {
    filter: var(--fd-node-pill-hover-filter);
  }

  .flowdrop-workflow-node__pill--input {
    left: 0;
    padding: 0 var(--fd-node-pill-pad-inner) 0 var(--fd-node-pill-pad-edge);
    border-radius: 0 var(--fd-node-pill-radius) var(--fd-node-pill-radius) 0;
  }

  .flowdrop-workflow-node__pill--output {
    right: 0;
    flex-direction: row-reverse;
    padding: 0 var(--fd-node-pill-pad-edge) 0 var(--fd-node-pill-pad-inner);
    border-radius: var(--fd-node-pill-radius) 0 0 var(--fd-node-pill-radius);
  }

  /* Open: outlined, grey. The outline stops at the card edge. */
  .flowdrop-workflow-node__pill--open {
    background: var(--fd-node-bg);
    color: var(--fd-node-pill-open-fg);
  }

  .flowdrop-workflow-node__pill--open.flowdrop-workflow-node__pill--input {
    box-shadow:
      inset 0 1px 0 var(--fd-node-pill-open-border),
      inset 0 -1px 0 var(--fd-node-pill-open-border),
      inset -1px 0 0 var(--fd-node-pill-open-border);
  }

  .flowdrop-workflow-node__pill--open.flowdrop-workflow-node__pill--output {
    box-shadow:
      inset 0 1px 0 var(--fd-node-pill-open-border),
      inset 0 -1px 0 var(--fd-node-pill-open-border),
      inset 1px 0 0 var(--fd-node-pill-open-border);
  }

  .flowdrop-workflow-node__pill-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: var(--fd-node-pill-height);
  }

  .flowdrop-workflow-node__pill-required {
    flex: none;
    margin-left: 1px;
    color: var(--fd-node-pill-required);
  }

  /* Handles: placed from the geometry (inline top), centred on the card edge.
     Wired = filled with the type colour; open = outlined in it. */
  :global(.svelte-flow .svelte-flow__handle.flowdrop-workflow-node__handle) {
    --fd-handle-fill: var(--_c);
    --fd-handle-border-color: var(--fd-handle-border);
  }

  :global(.svelte-flow .svelte-flow__handle.flowdrop-workflow-node__handle--open) {
    --fd-handle-fill: var(--fd-node-bg);
    --fd-handle-border-color: var(--_c);
  }

  :global(.svelte-flow .svelte-flow__handle.flowdrop-workflow-node__handle:hover::before) {
    background-color: var(--fd-handle-fill) !important;
    transform: scale(1.2);
  }

  :global(.flowdrop-workflow-node__handle:hover) {
    transform: translateY(-50%);
  }

  /* Exec pins: a chevron in a circle. Filled ink when wired, outlined grey when open. */
  :global(.svelte-flow .svelte-flow__handle.flowdrop-workflow-node__handle--pin) {
    --_c: var(--fd-node-pin-wired);
    --fd-handle-visual-size: var(--fd-node-pin-size);
  }

  :global(
    .svelte-flow
      .svelte-flow__handle.flowdrop-workflow-node__handle--pin.flowdrop-workflow-node__handle--open
  ) {
    --_c: var(--fd-node-pin-open);
  }

  :global(.svelte-flow .svelte-flow__handle.flowdrop-workflow-node__handle--pin::after) {
    content: '';
    position: absolute;
    width: 5px;
    height: 6px;
    margin-left: 1px;
    background: var(--fd-node-bg);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
    pointer-events: none;
  }

  :global(
    .svelte-flow
      .svelte-flow__handle.flowdrop-workflow-node__handle--pin.flowdrop-workflow-node__handle--open::after
  ) {
    background: var(--fd-node-pin-open);
  }

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-workflow-node:hover {
    --fd-config-btn-opacity: 1;
  }
</style>
