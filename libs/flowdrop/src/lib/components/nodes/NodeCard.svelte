<!--
  Node Card Component
  The card v2 body shared by the node types that follow it (Workflow, Gateway,
  Tool): one fixed geometry from utils/nodeGeometry.ts. The header is always
  60px, the completion `trigger` ports are pins in it (y = 20), every other port
  is a half-pill on a shared row (first row y = 80, pitch 40), the width is 280
  or 320 and the border is drawn inside the box, so every handle centre is a
  multiple of 20 and any output can meet any input in a straight wire. Every
  handle is placed from the geometry, never from layout.

  The node component decides WHAT is on the card (title, ports, branches); this
  component draws it. Rows are keyed by index, so two ports with the same id
  (two unnamed gateway branches) draw two rows instead of crashing the keyed
  each.

  The category glyph and the title carry `data-fd-glyph` and `data-fd-title`
  so the zoomed-out glyph view can target them.
  Styled with BEM syntax (`flowdrop-workflow-node`).
-->

<script lang="ts">
  import { Position, Handle } from '@xyflow/svelte';
  import type { NodePort } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import NodeConfigButton from './NodeConfigButton.svelte';
  import NodeTip from './NodeTip.svelte';
  import NodeProblemMark from './NodeProblemMark.svelte';
  import { getNodeProblem } from '../../utils/nodeProblem.js';
  import { glyphMetrics } from '../../utils/zoomTier.js';
  import { getPortColorToken, getDataTypeConfig } from '../../utils/colors.js';
  import type { NodeGeometry } from '../../utils/nodeGeometry.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import { m } from '$lib/messages/index.js';
  import { onMount, tick } from 'svelte';

  interface Props {
    id: string;
    selected?: boolean;
    /** Where every part of the card is (see computeNodeGeometry). */
    geometry: NodeGeometry<NodePort>;
    title: string;
    /** The "kind · id" line under the title (also the popover's code line). */
    kindLine: string;
    description: string;
    /** Iconify name of the category glyph. */
    icon: string;
    /** Any CSS colour: the header wash and the icon tile. */
    color: string;
    ariaLabel: string;
    /** Extra BEM modifier on the root, e.g. `gateway`. */
    variant?: string;
    /** Output port ids drawn as taken (a gateway's active branches). */
    activeOutputs?: readonly string[];
    /** Muted note on the first row when no row has a port. */
    emptyNote?: string;
    /** `processing` dims the card, `error` draws it in the error colour. */
    processing?: boolean;
    error?: boolean;
    configTitle?: string;
    onconfig: () => void;
  }

  let {
    id,
    selected = false,
    geometry,
    title,
    kindLine,
    description,
    icon,
    color,
    ariaLabel,
    variant,
    activeOutputs = [],
    emptyNote,
    processing = false,
    error = false,
    configTitle = 'Configure node',
    onconfig
  }: Props = $props();

  let isHandleInteraction = $state(false);

  // The Doctor's finding: a status glyph in the header; an error also takes the error border.
  const problem = getNodeProblem();
  const problemSeverity = $derived(problem?.severity ?? null);

  /** The glyph view's glyph edge, and whether the title sits beside it on a short card. */
  const glyph = $derived(glyphMetrics(geometry.width, geometry.height));

  const fd = getInstance();
  const checker = fd.portCompatibility;

  /** Handle ids bound to a `workflow.interface` entry — see workflowStore. */
  const boundHandles = $derived(fd.workflow.interfaceBoundHandles);

  // Hoist the graph branch — three reads in the template, two of them inside
  // {#each port} loops where N×M reads add up. One getter walk per render.
  const graph = $derived(m().nodes.graph);

  /** Handle ids of this node's wired ports. */
  const wiredHandles = $derived.by(() => {
    const set = new Set<string>();
    for (const edge of fd.workflow.edges) {
      if (edge.source === id && edge.sourceHandle) set.add(edge.sourceHandle);
      if (edge.target === id && edge.targetHandle) set.add(edge.targetHandle);
    }
    return set;
  });

  /** The completion trigger pins in the header, with their ports. */
  const pins = $derived(
    geometry.handles
      .filter((h) => h.kind === 'pin')
      .map((h) => {
        const handleId = buildHandleId(id, h.direction, h.portId);
        return { ...h, handleId, wired: wiredHandles.has(handleId) };
      })
  );

  /** Every row's input and output, as the handles and pills to draw. */
  const rowItems = $derived(
    geometry.rows.flatMap((row) =>
      (['input', 'output'] as const).flatMap((direction) => {
        const port = direction === 'input' ? row.input : row.output;
        if (!port) return [];
        const handleId = buildHandleId(id, direction, port.id);
        return [
          {
            key: `${row.index}-${direction}`,
            direction,
            port,
            y: row.y,
            handleId,
            wired: wiredHandles.has(handleId),
            active: direction === 'output' && activeOutputs.includes(port.id)
          }
        ];
      })
    )
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
    void title;
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
    const bound = boundHandles.get(buildHandleId(id, direction, port.id));
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
        title: title,
        code: kindLine,
        body: description || undefined,
        note: graph.configureHint
      };
    }, 400);
  }
</script>

<!-- Node Container -->
<!-- Presentational: focus, keyboard and selection live on xyflow's node
     wrapper (see UniversalNode). double-click is a mouse convenience. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flowdrop-workflow-node {variant ? `flowdrop-workflow-node--${variant}` : ''}"
  class:flowdrop-workflow-node--selected={selected}
  class:flowdrop-workflow-node--bands={geometry.descriptionBand > 0}
  class:flowdrop-workflow-node--processing={processing}
  class:flowdrop-workflow-node--error={error}
  class:flowdrop-workflow-node--problem-error={problemSeverity === 'error'}
  class:flowdrop-workflow-node--glyph-row={glyph.row}
  ondblclick={onconfig}
  onmouseup={() => {
    isHandleInteraction = false;
  }}
  data-handle-interaction={isHandleInteraction}
  aria-label={ariaLabel}
  aria-describedby="node-description-{id}"
  style="--_cat: {color}; --_gs: {glyph.size}px; width: {geometry.width}px; height: {geometry.height}px;"
>
  <!-- Header: fixed 60px. Title (2 lines at most) over "kind · id"; hovering it
       opens the node's description. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flowdrop-workflow-node__header"
    class:flowdrop-workflow-node__header--wraps={titleWraps}
    class:flowdrop-workflow-node__header--problem={problemSeverity !== null}
    onmouseenter={showNodeTip}
    onmouseleave={hideTip}
  >
    <div class="flowdrop-workflow-node__tile" data-fd-glyph>
      <Icon {icon} class="flowdrop-workflow-node__icon" />
    </div>
    <h3 class="flowdrop-workflow-node__title" bind:this={titleEl} data-fd-title>{title}</h3>
    <span class="flowdrop-workflow-node__kind">{kindLine}</span>
    <NodeProblemMark />
  </div>

  <!-- Description band: reserved on every node while the setting is on. -->
  {#if geometry.descriptionBand > 0}
    <div class="flowdrop-workflow-node__desc">
      <p class="flowdrop-workflow-node__desc-text" id="node-description-{id}">
        {description}
      </p>
    </div>
  {:else}
    <span class="flowdrop-workflow-node__sr" id="node-description-{id}">{description}</span>
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
  {#each rowItems as item (item.key)}
    {@const port = item.port}
    {@const open = !item.wired && !item.active}
    {@const portColor = `var(--fd-port-skin-color, ${getPortColorToken(checker, port)})`}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flowdrop-workflow-node__pill flowdrop-workflow-node__pill--{item.direction}"
      class:flowdrop-workflow-node__pill--open={open}
      class:flowdrop-workflow-node__pill--active={item.active}
      style="top: {item.y}px; --_c: {portColor};"
      onmouseenter={(e: Event) => showPortTip(e, port, item.direction, open, false)}
      onmouseleave={hideTip}
    >
      {#if item.active}
        <Icon icon="mdi:check-circle" class="flowdrop-workflow-node__pill-check" />
      {/if}
      <span class="flowdrop-workflow-node__pill-name">{port.name}</span>
      {#if item.direction === 'input' && port.required && !item.wired}
        <span class="flowdrop-workflow-node__pill-required" aria-hidden="true">*</span>
      {/if}
    </div>
    <Handle
      type={item.direction === 'input' ? 'target' : 'source'}
      position={item.direction === 'input' ? Position.Left : Position.Right}
      id={item.handleId}
      class="flowdrop-workflow-node__handle {open
        ? 'flowdrop-workflow-node__handle--open'
        : 'flowdrop-workflow-node__handle--wired'}"
      aria-label={item.direction === 'input'
        ? graph.connectInputPort({ name: port.name })
        : graph.connectOutputPort({ name: port.name })}
      style="top: {item.y}px; transform: translateY(-50%); --_c: {portColor};"
      tabindex={-1}
      onmouseenter={(e: Event) => showPortTip(e, port, item.direction, open, false)}
      onmouseleave={hideTip}
    />
  {/each}

  {#if emptyNote}
    <p class="flowdrop-workflow-node__empty" style="top: {geometry.rows[0].y}px">{emptyNote}</p>
  {/if}

  <!-- Config button -->
  <NodeConfigButton onclick={onconfig} title={configTitle} />
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
    --_ring: inset 0 0 0 var(--fd-node-border-width) var(--_border);
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
    box-shadow: var(--_ring);
    pointer-events: none;
    z-index: 1;
  }

  .flowdrop-workflow-node:hover {
    --_border: var(--fd-node-border-hover);
    box-shadow: var(--fd-node-shadow-hover);
  }

  .flowdrop-workflow-node--processing {
    opacity: 0.7;
  }

  .flowdrop-workflow-node--error {
    --_border: var(--fd-error);
    background-color: var(--fd-error-muted);
  }

  .flowdrop-workflow-node--problem-error {
    --_border: var(--fd-error);
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
    background: color-mix(in srgb, var(--_cat) var(--fd-node-header-wash), var(--fd-node-bg));
    border-top-left-radius: var(--fd-node-radius);
    border-top-right-radius: var(--fd-node-radius);
  }

  .flowdrop-workflow-node__header--problem {
    grid-template-columns: var(--fd-node-tile-size) minmax(0, 1fr) auto;
  }

  /* The Doctor's glyph, after the title (first row). */
  .flowdrop-workflow-node__header :global(.fd-node-problem) {
    grid-column: 3;
    grid-row: 1;
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
    padding: 10px var(--fd-node-header-pad-x);
  }

  .flowdrop-workflow-node__desc-text {
    margin: 0;
    font-size: var(--fd-text-xs);
    line-height: 20px;
    color: var(--fd-muted-foreground);
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  /* The hairline closing the band, inset like the text. */
  .flowdrop-workflow-node__desc::after {
    content: '';
    position: absolute;
    inset: auto var(--fd-node-header-pad-x) 0 var(--fd-node-header-pad-x);
    height: 1px;
    background: var(--fd-node-desc-rule);
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
    box-shadow: var(--fd-node-pill-open-ring-input);
  }

  .flowdrop-workflow-node__pill--open.flowdrop-workflow-node__pill--output {
    box-shadow: var(--fd-node-pill-open-ring-output);
  }

  .flowdrop-workflow-node__pill-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: var(--fd-node-pill-height);
  }

  .flowdrop-workflow-node__pill :global(.flowdrop-workflow-node__pill-check) {
    flex: none;
    width: 14px;
    height: 14px;
    margin: 0 4px 0 0;
    color: var(--_c);
  }

  .flowdrop-workflow-node__pill--output :global(.flowdrop-workflow-node__pill-check) {
    margin: 0 0 0 4px;
  }

  /* A note on the first row of a card that has no ports at all. */
  .flowdrop-workflow-node__empty {
    position: absolute;
    left: var(--fd-node-header-pad-x);
    right: var(--fd-node-header-pad-x);
    margin: 0;
    transform: translateY(-50%);
    font-size: var(--fd-text-xs);
    line-height: 20px;
    color: var(--fd-muted-foreground);
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

  /* ----- Zoom tiers (G8e): the same box, a different drawing -----
     At glyph (25-66%) and map (< 25%) the header grows to the whole card and
     becomes the glyph view: the category glyph centred, the title counter-scaled
     to a constant screen size, the card tinted with its category. Ports, pills,
     the description and the config button are hidden with `visibility`, never
     removed, so every handle stays where it is and no edge moves. */
  :global([data-fd-zoom='glyph']) .flowdrop-workflow-node,
  :global([data-fd-zoom='map']) .flowdrop-workflow-node {
    background-color: color-mix(in srgb, var(--_cat) var(--fd-node-zoom-wash), var(--fd-node-bg));
  }

  :global([data-fd-zoom='glyph']) .flowdrop-workflow-node__header,
  :global([data-fd-zoom='map']) .flowdrop-workflow-node__header {
    inset: 0;
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: calc(var(--fd-space-sm) / var(--fd-zoom, 1));
    padding: var(--fd-space-sm);
    background: transparent;
    border-radius: inherit;
  }

  :global([data-fd-zoom='glyph'])
    .flowdrop-workflow-node--glyph-row
    .flowdrop-workflow-node__header {
    flex-direction: row;
    gap: calc(var(--fd-space-md) / var(--fd-zoom, 1));
  }

  :global([data-fd-zoom='glyph']) .flowdrop-workflow-node__tile,
  :global([data-fd-zoom='map']) .flowdrop-workflow-node__tile {
    display: flex;
    flex: none;
    width: var(--_gs);
    height: var(--_gs);
    margin: 0;
    align-self: center;
    background: transparent;
    box-shadow: none;
  }

  :global([data-fd-zoom='glyph'])
    .flowdrop-workflow-node__tile
    :global(.flowdrop-workflow-node__icon),
  :global([data-fd-zoom='map'])
    .flowdrop-workflow-node__tile
    :global(.flowdrop-workflow-node__icon) {
    width: 100%;
    height: 100%;
    color: var(--_cat);
  }

  :global([data-fd-zoom='glyph']) .flowdrop-workflow-node__title {
    flex: 0 1 auto;
    align-self: center;
    overflow-wrap: break-word;
    max-width: 92%;
    font-size: calc(var(--fd-node-zoom-title-size) / var(--fd-zoom, 1));
    line-height: 1.2;
    text-align: center;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  :global([data-fd-zoom='glyph'])
    .flowdrop-workflow-node--glyph-row
    .flowdrop-workflow-node__title {
    max-width: 62%;
    text-align: left;
  }

  :global([data-fd-zoom='map']) .flowdrop-workflow-node__title,
  :global([data-fd-zoom='glyph']) .flowdrop-workflow-node__kind,
  :global([data-fd-zoom='map']) .flowdrop-workflow-node__kind {
    display: none;
  }

  :global([data-fd-zoom='glyph']) .flowdrop-workflow-node__pill,
  :global([data-fd-zoom='map']) .flowdrop-workflow-node__pill,
  :global([data-fd-zoom='glyph']) .flowdrop-workflow-node__desc,
  :global([data-fd-zoom='map']) .flowdrop-workflow-node__desc,
  :global([data-fd-zoom='glyph']) .flowdrop-workflow-node__empty,
  :global([data-fd-zoom='map']) .flowdrop-workflow-node__empty,
  :global([data-fd-zoom='glyph']) .flowdrop-workflow-node :global(.flowdrop-node-config-btn),
  :global([data-fd-zoom='map']) .flowdrop-workflow-node :global(.flowdrop-node-config-btn) {
    visibility: hidden;
  }

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-workflow-node:hover {
    --fd-config-btn-opacity: 1;
  }
</style>
