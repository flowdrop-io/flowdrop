<!--
  Atom Node Component
  Minimalist, label-only node for "supplies a value" atoms (Constant now, Cast later).
  Renders as a pill that hugs its content with handles driven by the node's ports.

  The body text and the output port's dataType are both driven by config via
  `extensions.ui.atom` (see AtomUIConfig). This component owns no domain semantics —
  meaning comes entirely from the node's NodeMetadata.
-->

<script lang="ts">
  import { Position, Handle } from '@xyflow/svelte';
  import type {
    ConfigValues,
    ConfigSchema,
    NodeMetadata,
    NodeExtensions,
    NodePort,
    AtomUIConfig,
    WorkflowNode as WorkflowNodeType
  } from '../../types/index.js';
  import { getDataTypeColor } from '$lib/utils/colors.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { applyPortOrder, isPortVisible } from '../../utils/portUtils.js';
  import { ProximityConnectHelper } from '../../helpers/proximityConnect.js';

  interface AtomNodeData {
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
  }

  interface Props {
    data: AtomNodeData;
    selected?: boolean;
    isProcessing?: boolean;
    isError?: boolean;
  }

  let { data, selected, isProcessing, isError }: Props = $props();

  const fd = getInstance();

  const nodeId = $derived(data.nodeId ?? 'unknown');
  const nodeType = $derived(data.metadata?.type ?? 'atom');

  // Instance extensions override node-type defaults.
  const atomCfg = $derived<AtomUIConfig>(
    data.extensions?.ui?.atom ?? data.metadata?.extensions?.ui?.atom ?? {}
  );
  const hideUnconnectedHandles = $derived(
    data.extensions?.ui?.hideUnconnectedHandles ??
      data.metadata?.extensions?.ui?.hideUnconnectedHandles ??
      false
  );
  const hiddenPorts = $derived(
    data.extensions?.ui?.hiddenPorts ?? data.metadata?.extensions?.ui?.hiddenPorts ?? {}
  );
  const portOrder = $derived(
    data.extensions?.ui?.portOrder ?? data.metadata?.extensions?.ui?.portOrder ?? {}
  );

  // Optional, server-driven accent. When unset the inline custom property is
  // omitted, so CSS falls back to the neutral border — uncolored atoms are
  // unchanged. Mirrors ToolNode: node definition (metadata) wins over instance.
  const atomColor = $derived(data.metadata?.color ?? (data.config?.color as string | undefined));
  const isRect = $derived(atomCfg.shape === 'rectangle');

  // Only the dynamic bits live inline; max-width and accent both optional.
  const nodeStyle = $derived(
    [
      atomCfg.maxWidth ? `max-width: ${atomCfg.maxWidth}px` : '',
      atomColor ? `--fd-atom-node-color: ${atomColor}` : ''
    ]
      .filter(Boolean)
      .join('; ')
  );

  // The node slice getAllPorts needs — keeps port resolution in one place,
  // shared with proximity-connect and coordinate/validation logic. No cast: the
  // helper's signature documents that `type` + `data` are all it reads.
  const nodeLike = $derived<Pick<WorkflowNodeType, 'type' | 'data'>>({ type: nodeType, data });

  const inPorts = $derived(
    applyPortOrder(ProximityConnectHelper.getAllPorts(nodeLike, 'input'), portOrder.inputs).filter(
      (p: NodePort) =>
        isPortVisible(
          p,
          'input',
          hiddenPorts,
          hideUnconnectedHandles,
          fd.workflow.connectedHandles,
          nodeId
        )
    )
  );
  const outPorts = $derived(
    applyPortOrder(
      ProximityConnectHelper.getAllPorts(nodeLike, 'output'),
      portOrder.outputs
    ).filter((p: NodePort) =>
      isPortVisible(
        p,
        'output',
        hiddenPorts,
        hideUnconnectedHandles,
        fd.workflow.connectedHandles,
        nodeId
      )
    )
  );

  /** Friendly label for a value, using the field's oneOf titles when present. */
  function resolveDisplay(schema: ConfigSchema | undefined, key: string, raw: unknown): string {
    const prop = schema?.properties?.[key] as
      | { oneOf?: Array<{ const: unknown; title?: string }> }
      | undefined;
    const match = prop?.oneOf?.find((o) => o.const === raw);
    if (match?.title) return match.title;
    if (typeof raw === 'boolean') return raw ? 'true' : 'false';
    return String(raw);
  }

  // Body text: config[valueKey] (label-resolved), else node label. When neither
  // resolves, fall back to the placeholder and render it dimmed.
  const display = $derived.by(() => {
    const key = atomCfg.valueKey;
    const raw = key ? data.config?.[key] : undefined;
    if (key && raw !== undefined && raw !== null && raw !== '') {
      return { text: resolveDisplay(data.metadata?.configSchema, key, raw), empty: false };
    }
    if (data.label) return { text: data.label, empty: false };
    return { text: atomCfg.placeholder ?? '', empty: true };
  });

  // Pill height is content-driven (~28px), so fixed px offsets don't fit.
  // Distribute handles as a % of node height: 50% for one port, evenly otherwise.
  function portTopPct(index: number, count: number): number {
    return ((index + 1) / (count + 1)) * 100;
  }

  function openConfig(): void {
    data.onConfigOpen?.({ id: nodeId, type: nodeType, data });
  }
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openConfig();
    }
  }
</script>

{#each inPorts as port, index (port.id)}
  <Handle
    type="target"
    position={Position.Left}
    id={`${nodeId}-input-${port.id}`}
    style="--fd-handle-fill: var(--fd-port-skin-color, {getDataTypeColor(
      port.dataType
    )}); top: {portTopPct(index, inPorts.length)}%;"
  />
{/each}

<div
  class="flowdrop-atom-node"
  class:flowdrop-atom-node--selected={selected}
  class:flowdrop-atom-node--processing={isProcessing}
  class:flowdrop-atom-node--error={isError}
  class:flowdrop-atom-node--empty={display.empty}
  class:flowdrop-atom-node--rect={isRect}
  style={nodeStyle}
  onclick={openConfig}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
>
  {#if atomCfg.prefix && !display.empty}
    <span class="flowdrop-atom-node__prefix" aria-hidden="true">{atomCfg.prefix}</span>
  {/if}
  <span class="flowdrop-atom-node__body" title={display.text}>{display.text}</span>
</div>

{#each outPorts as port, index (port.id)}
  <Handle
    type="source"
    position={Position.Right}
    id={`${nodeId}-output-${port.id}`}
    style="--fd-handle-fill: var(--fd-port-skin-color, {getDataTypeColor(
      port.dataType
    )}); top: {portTopPct(index, outPorts.length)}%;"
  />
{/each}

<style>
  .flowdrop-atom-node {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: fit-content;
    min-width: 2rem;
    min-height: 28px;
    padding: 2px var(--fd-space-sm);
    background-color: var(--fd-card);
    /* --fd-atom-node-color is set inline only when the server provides a color;
       otherwise it falls back to the neutral border token. */
    border: 1.5px solid var(--fd-atom-node-color, var(--fd-node-border));
    border-radius: 999px;
    box-shadow: var(--fd-shadow-sm);
    color: var(--fd-foreground);
    cursor: pointer;
    transition:
      box-shadow var(--fd-transition-fast),
      border-color var(--fd-transition-fast);
    z-index: 10;
  }

  .flowdrop-atom-node--rect {
    border-radius: var(--fd-radius-md);
  }

  .flowdrop-atom-node:hover {
    box-shadow: var(--fd-shadow-md);
    border-color: var(--fd-atom-node-color, var(--fd-node-border-hover));
  }

  .flowdrop-atom-node--selected {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--fd-atom-node-color, var(--fd-primary)) 30%, transparent),
      var(--fd-shadow-md);
    border-color: var(--fd-atom-node-color, var(--fd-primary));
  }

  .flowdrop-atom-node:focus-visible {
    outline: 2px solid var(--fd-ring);
    outline-offset: 2px;
  }

  .flowdrop-atom-node--processing {
    opacity: 0.7;
  }

  .flowdrop-atom-node--error {
    border-color: var(--fd-error) !important;
    background-color: var(--fd-error-muted) !important;
  }

  .flowdrop-atom-node--empty .flowdrop-atom-node__body {
    color: var(--fd-muted-foreground);
    font-style: italic;
  }

  .flowdrop-atom-node__prefix {
    flex-shrink: 0;
    margin-right: 2px;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    line-height: 1.2;
  }

  .flowdrop-atom-node__body {
    /* min-width:0 lets the body ellipsize as a flex sibling of the prefix */
    min-width: 0;
    font-size: var(--fd-text-sm);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* `top` is set inline (dynamic, must beat svelte-flow defaults); transform and
     stacking live here so the hover rule can compose instead of fighting !important. */
  :global(.svelte-flow__node-atom .svelte-flow__handle) {
    --fd-handle-border-color: var(--fd-handle-border);
    transform: translateY(-50%);
    z-index: 20 !important;
    pointer-events: auto !important;
  }

  :global(.svelte-flow__node-atom .svelte-flow__handle:hover) {
    transform: translateY(-50%) scale(1.2);
  }
</style>
