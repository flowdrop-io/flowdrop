<!--
  Unified port widget — order + exposure

  Renders one row per port of the node being configured, each carrying a
  reorder control (up/down) and an expose/hide toggle. Binds to the injected
  `ports` reserved config property (a PortsConfig: a per-direction ordered list
  of {id, exposed?} entries).

  Order is cosmetic — the engine ignores it. Exposure is semantic in v2: a
  not-exposed port is hidden on the canvas, not wireable, and not
  runtime-overridable.

  The stored value is materialized as the FULL ordered list on the first edit
  (so order + exposure stay independent inside one positional array), and reset
  to `undefined` when it lands back on the metadata default order with no
  exposure override.
-->

<script lang="ts">
  import type {
    DynamicPort,
    NodePort,
    PortConfigEntry,
    PortsConfig,
    WorkflowNode
  } from '../../types/index.js';
  import { dynamicPortToNodePort } from '../../types/index.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { byDefaultOrder, isPortExposed, orderPortsFor } from '$lib/utils/portUtils.js';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import { interfaceBoundTooltip } from '$lib/utils/workflowInterface.js';
  import PortShapeSymbol from '../ports/PortShapeSymbol.svelte';
  import PortLaneChip from '../ports/PortLaneChip.svelte';
  import FormToggle from './FormToggle.svelte';
  import Icon from '@iconify/svelte';

  interface Props {
    id: string;
    value: unknown;
    ariaDescribedBy?: string;
    disabled?: boolean;
    onChange: (value: unknown) => void;
    /** The node being configured, source of the port list + metadata defaults. */
    node?: WorkflowNode;
  }

  let { id, value, ariaDescribedBy, disabled = false, onChange, node }: Props = $props();

  const fd = getInstance();
  const checker = fd.portCompatibility;

  const portsConfig = $derived((value as PortsConfig | undefined) ?? {});

  /** Handle ids bound to a `workflow.interface` entry — see workflowStore. */
  const boundHandles = $derived(fd.workflow.interfaceBoundHandles);

  // Mirror the canvas: static metadata ports plus user-defined dynamic ports.
  const inputPorts = $derived<NodePort[]>([
    ...(node?.data.metadata?.inputs ?? []),
    ...((node?.data.config?.dynamicInputs as DynamicPort[]) ?? []).map((p) =>
      dynamicPortToNodePort(p, 'input')
    )
  ]);
  const outputPorts = $derived<NodePort[]>([
    ...(node?.data.metadata?.outputs ?? []),
    ...((node?.data.config?.dynamicOutputs as DynamicPort[]) ?? []).map((p) =>
      dynamicPortToNodePort(p, 'output')
    )
  ]);

  type Direction = 'inputs' | 'outputs';

  function portsFor(direction: Direction): NodePort[] {
    return direction === 'inputs' ? inputPorts : outputPorts;
  }

  /** Ports in the order the widget renders them (default order, then override). */
  function orderedPorts(direction: Direction): NodePort[] {
    return orderPortsFor(portsFor(direction), portsConfig[direction]);
  }

  /**
   * Write a direction's desired ordered list (each port carrying its effective
   * exposure) back to the bound value, keeping it minimal: an entry's `exposed`
   * flag is dropped when it equals the port's default, the whole direction is
   * dropped when it carries neither a reorder nor an exposure override, and the
   * value collapses to `undefined` when empty — so an untouched node stores
   * nothing.
   */
  function commit(
    direction: Direction,
    ordered: NodePort[],
    exposureOf: (port: NodePort) => boolean
  ): void {
    const entries: PortConfigEntry[] = ordered.map((port) => {
      const entry: PortConfigEntry = { id: port.id };
      const exposed = exposureOf(port);
      if (exposed !== (port.exposedByDefault ?? true)) entry.exposed = exposed;
      return entry;
    });

    const defaultOrder = byDefaultOrder(portsFor(direction)).map((p) => p.id);
    const orderChanged = entries.some((e, i) => e.id !== defaultOrder[i]);
    const hasExposureOverride = entries.some((e) => e.exposed !== undefined);

    const next: PortsConfig = { ...portsConfig };
    if (orderChanged || hasExposureOverride) next[direction] = entries;
    else delete next[direction];

    // We carry the untouched direction over verbatim from `portsConfig`, but an
    // earlier edit there may have left an empty array; prune it so an all-default
    // node collapses to `undefined` below rather than persisting `{inputs: []}`.
    const other: Direction = direction === 'inputs' ? 'outputs' : 'inputs';
    if (!next[other] || next[other]?.length === 0) delete next[other];
    onChange(Object.keys(next).length === 0 ? undefined : next);
  }

  function setExposed(direction: Direction, portId: string, exposed: boolean): void {
    commit(direction, orderedPorts(direction), (port) =>
      port.id === portId ? exposed : isPortExposed(port, portsConfig[direction])
    );
  }

  function move(direction: Direction, index: number, delta: -1 | 1): void {
    const ordered = orderedPorts(direction);
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    commit(direction, ordered, (port) => isPortExposed(port, portsConfig[direction]));
  }
</script>

<div class="fd-ports" {id} aria-describedby={ariaDescribedBy}>
  {#each [{ key: 'inputs', label: 'Inputs' }, { key: 'outputs', label: 'Outputs' }] as group (group.key)}
    {@const direction = group.key as Direction}
    {@const ordered = orderedPorts(direction)}
    {#if ordered.length > 0}
      <div class="fd-ports__group">
        <span class="fd-ports__group-label">{group.label}</span>
        <ul class="fd-ports__list">
          {#each ordered as port, i (port.id)}
            {@const exposed = isPortExposed(port, portsConfig[direction])}
            {@const boundEntry = node
              ? boundHandles.get(
                  buildHandleId(node.id, direction === 'inputs' ? 'input' : 'output', port.id)
                )
              : undefined}
            <li class="fd-ports__item" class:fd-ports__item--hidden={!exposed}>
              <div class="fd-ports__reorder">
                <button
                  type="button"
                  disabled={disabled || i === 0}
                  onclick={() => move(direction, i, -1)}
                  title="Move up"
                  aria-label={`Move ${port.name} up`}
                >
                  <Icon icon="heroicons:chevron-up" />
                </button>
                <button
                  type="button"
                  disabled={disabled || i === ordered.length - 1}
                  onclick={() => move(direction, i, 1)}
                  title="Move down"
                  aria-label={`Move ${port.name} down`}
                >
                  <Icon icon="heroicons:chevron-down" />
                </button>
              </div>
              <PortShapeSymbol {checker} {port} />
              <span class="fd-ports__name" title={port.name}>{port.name}</span>
              <PortLaneChip {checker} {port} />
              {#if boundEntry}
                <span
                  class="fd-ports__bound"
                  title={interfaceBoundTooltip(boundEntry)}
                  aria-label={interfaceBoundTooltip(boundEntry)}
                >
                  <Icon icon="heroicons:link" />
                </span>
              {/if}
              <FormToggle
                id={`${id}-${direction}-${port.id}`}
                value={exposed}
                onLabel="Exposed"
                offLabel="Hidden"
                {disabled}
                hideLabel
                onChange={(exposed) => setExposed(direction, port.id, exposed)}
              />
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/each}
</div>

<style>
  .fd-ports {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3, 0.75rem);
  }

  .fd-ports__group {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-1, 0.25rem);
  }

  .fd-ports__group-label {
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .fd-ports__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-1, 0.25rem);
  }

  .fd-ports__item {
    display: flex;
    align-items: center;
    gap: var(--fd-space-2, 0.5rem);
    padding: var(--fd-space-1, 0.25rem) var(--fd-space-2, 0.5rem);
    border-radius: var(--fd-radius-md, 6px);
    border: 1px solid var(--fd-border-muted);
  }

  /* The switch alone carries the state now that its label is screen-reader
     only, so dim the row to keep "hidden" legible at a glance. The chips are
     child components, so their halves of the rule have to be :global. */
  .fd-ports__item--hidden .fd-ports__name,
  .fd-ports__item--hidden :global(.flowdrop-port-symbol),
  .fd-ports__item--hidden :global(.flowdrop-badge) {
    opacity: 0.55;
  }

  .fd-ports__reorder {
    display: flex;
    flex-direction: column;
  }

  .fd-ports__reorder button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: none;
    color: var(--fd-text-muted);
    cursor: pointer;
    line-height: 1;
  }

  .fd-ports__reorder button:disabled {
    opacity: 0.3;
    cursor: default;
  }

  /* min-width:0 so a long port name ellipsizes instead of widening the row. */
  .fd-ports__name {
    flex: 1;
    min-width: 0;
    font-size: var(--fd-text-xs);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Keep a long lane name from pushing the toggle off the row — "String Array"
     is already 12ch, and a site may name a lane anything. The chip is a child
     component, so the rule has to be :global. */
  .fd-ports__item :global(.flowdrop-badge) {
    max-width: 12ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Interface-bound marker: same --fd-ring token as the canvas handle ring
     (see styles/base.css .flowdrop-handle--bound), so the two affordances
     read as one system in both light and dark skins. */
  .fd-ports__bound {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.25em;
    height: 1.25em;
    border-radius: 50%;
    color: var(--fd-ring);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--fd-ring) 55%, transparent);
  }
</style>
