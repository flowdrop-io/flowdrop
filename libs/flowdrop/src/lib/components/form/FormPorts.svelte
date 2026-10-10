<!--
  Unified port widget — order + exposure

  Renders one flat row per port of the node being configured on a fixed grid:
  drag grip (on hover/focus) · lane dot · name · lane name (mono, muted) ·
  interface menu · eye button that shows or hides the port. Every cell is always
  rendered (an empty one is `visibility: hidden`), so columns never stagger.
  Rows reorder by drag or by Alt+Up / Alt+Down on the focused row. A gateway's
  branches (`config.branches`) are listed too, read-only: they are authored in
  Config and always drawn. Binds to the injected
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
    Branch,
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
  import { isTriggerEventInput } from '$lib/utils/reservedPorts.js';
  import {
    entryAtPort,
    exposableCandidate,
    exposePortAsEntry,
    inputHasIncomingEdge,
    removeInterfaceEntry,
    renameInterfaceEntry,
    validateInterfaceId,
    type InterfaceDirection
  } from '$lib/utils/interfaceTags.js';
  import { m } from '$lib/messages/index.js';
  import {
    getDataTypeColorToken,
    getDataTypeDisplayText,
    getPortColorToken
  } from '$lib/utils/colors.js';
  import IconButton from '../primitives/IconButton.svelte';
  import Menu, { type MenuEntry } from '../primitives/Menu.svelte';
  import InterfaceTag from '../InterfaceTag.svelte';
  import InterfaceNameInput from '../InterfaceNameInput.svelte';
  import Icon from '@iconify/svelte';
  import { tick } from 'svelte';

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

  // ---- Workflow interface: the same actions as the canvas tag menu ----
  // A name being typed for one row (a new entry, or a rename).
  let nameEdit = $state<{
    direction: Direction;
    portId: string;
    mode: 'expose' | 'rename';
    value: string;
    entryId?: string;
  } | null>(null);

  const entryDirection = (direction: Direction): InterfaceDirection =>
    direction === 'inputs' ? 'input' : 'output';

  function interfaceMenu(direction: Direction, port: NodePort): MenuEntry[] {
    const workflow = fd.workflow.current;
    if (!workflow || !node || disabled) return [];
    const dir = entryDirection(direction);
    const entry = entryAtPort(workflow, node.id, dir, port.id);
    if (entry) {
      return [
        {
          label: m().contextMenu.renameInterfaceEntry,
          icon: 'mdi:pencil-outline',
          testId: 'port-interface-rename',
          onselect: () =>
            (nameEdit = {
              direction,
              portId: port.id,
              mode: 'rename',
              value: entry.id,
              entryId: entry.id
            })
        },
        {
          label: m().contextMenu.removeInterfaceEntry,
          icon: 'mdi:link-off',
          testId: 'port-interface-remove',
          onselect: () => {
            const result = removeInterfaceEntry(workflow, dir, entry.id);
            if (result) fd.workflow.editInterface(result.interface, result.edit);
          }
        }
      ];
    }
    if (!exposableCandidate(workflow, node.id, dir, port.id)) return [];
    return [
      {
        label: dir === 'input' ? m().contextMenu.exposeInput : m().contextMenu.exposeOutput,
        icon: 'mdi:tag-arrow-right-outline',
        testId: 'port-interface-expose',
        disabled: dir === 'input' && inputHasIncomingEdge(workflow, node.id, port.id),
        onselect: () => (nameEdit = { direction, portId: port.id, mode: 'expose', value: port.id })
      }
    ];
  }

  const nameError = $derived.by((): string | null => {
    if (!nameEdit) return null;
    const dir = entryDirection(nameEdit.direction);
    const reason = validateInterfaceId(
      nameEdit.value,
      dir,
      fd.workflow.current?.interface,
      nameEdit.entryId
    );
    if (reason === 'empty') return m().workflowInterface.tagIdEmpty;
    if (reason === 'duplicate') {
      return m().workflowInterface.tagIdDuplicate({ id: nameEdit.value.trim(), direction: dir });
    }
    return null;
  });

  function submitName(): void {
    const edit = nameEdit;
    const workflow = fd.workflow.current;
    if (!edit || !workflow || !node || nameError) return;
    const dir = entryDirection(edit.direction);
    nameEdit = null;
    const result =
      edit.mode === 'expose'
        ? exposePortAsEntry(
            workflow,
            { nodeId: node.id, direction: dir, portId: edit.portId },
            edit.value
          )
        : renameInterfaceEntry(workflow, dir, edit.entryId ?? '', edit.value);
    if (result) fd.workflow.editInterface(result.interface, result.edit);
  }

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

  /**
   * A gateway's branches are output ports authored in Config (`config.branches`).
   * They are listed after the other outputs but are not part of the ordered /
   * hideable list: the canvas always draws them in authored order.
   */
  const branchPorts = $derived<NodePort[]>(
    Array.isArray(node?.data.config?.branches)
      ? (node.data.config.branches as Branch[])
          // Unique names only: the id keys the rows (two unnamed branches share '').
          .filter(
            (b, i, all) =>
              typeof b?.name === 'string' && all.findIndex((o) => o?.name === b.name) === i
          )
          .map((b) => ({
            id: b.name,
            name: b.label || b.name,
            type: 'output' as const,
            dataType: 'branch',
            required: false
          }))
      : []
  );

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

  /** Move the port at `from` to position `to` (the rows in between shift). */
  function moveTo(direction: Direction, from: number, to: number): void {
    const ordered = orderedPorts(direction);
    if (from === to || to < 0 || to >= ordered.length || from < 0 || from >= ordered.length) return;
    const [port] = ordered.splice(from, 1);
    ordered.splice(to, 0, port);
    commit(direction, ordered, (p) => isPortExposed(p, portsConfig[direction]));
  }

  function move(direction: Direction, index: number, delta: -1 | 1): void {
    moveTo(direction, index, index + delta);
  }

  let root: HTMLDivElement | undefined = $state();

  /** A keyed row can lose focus when its node is moved; put it back. */
  async function refocusRow(direction: Direction, portId: string): Promise<void> {
    await tick();
    root
      ?.querySelector<HTMLElement>(`[data-port-row="${direction}:${CSS.escape(portId)}"]`)
      ?.focus();
  }

  function onRowKeydown(event: KeyboardEvent, direction: Direction, index: number, id: string) {
    if (disabled || !event.altKey) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    move(direction, index, event.key === 'ArrowUp' ? -1 : 1);
    void refocusRow(direction, id);
  }

  // Drag to reorder (HTML5 drag and drop, within one direction).
  let dragging: { direction: Direction; index: number } | null = $state(null);
  let dropTarget: { direction: Direction; index: number } | null = $state(null);

  function onDragStart(event: DragEvent, direction: Direction, index: number): void {
    if (disabled) return;
    dragging = { direction, index };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  function onDragOver(event: DragEvent, direction: Direction, index: number): void {
    if (!dragging || dragging.direction !== direction) return;
    event.preventDefault();
    dropTarget = { direction, index };
  }

  function onDrop(event: DragEvent, direction: Direction, index: number): void {
    if (!dragging || dragging.direction !== direction) return;
    event.preventDefault();
    moveTo(direction, dragging.index, index);
    dragging = null;
    dropTarget = null;
  }

  function onDragEnd(): void {
    dragging = null;
    dropTarget = null;
  }
</script>

<div class="fd-ports" {id} aria-describedby={ariaDescribedBy} bind:this={root}>
  {#each [{ key: 'inputs', label: 'Inputs' }, { key: 'outputs', label: 'Outputs' }] as group (group.key)}
    {@const direction = group.key as Direction}
    {@const ordered = orderedPorts(direction)}
    {@const branches = direction === 'outputs' ? branchPorts : []}
    {#if ordered.length > 0 || branches.length > 0}
      <div class="fd-ports__group">
        <span class="fd-ports__group-label" id={`${id}-${direction}-label`}>{group.label}</span>
        <ul class="fd-ports__list" aria-labelledby={`${id}-${direction}-label`}>
          {#each ordered as port, i (port.id)}
            {@const exposed = isPortExposed(port, portsConfig[direction])}
            {@const boundEntry = node
              ? boundHandles.get(
                  buildHandleId(node.id, direction === 'inputs' ? 'input' : 'output', port.id)
                )
              : undefined}
            {@const ifaceItems = interfaceMenu(direction, port)}
            {@const laneName = checker.getDataTypeConfig(port.dataType)?.name ?? port.dataType}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
            <li
              class="fd-ports__item"
              class:fd-ports__item--hidden={!exposed}
              class:fd-ports__item--naming={nameEdit?.direction === direction &&
                nameEdit.portId === port.id}
              class:fd-ports__item--dragging={dragging?.direction === direction &&
                dragging.index === i}
              class:fd-ports__item--drop={dropTarget?.direction === direction &&
                dropTarget.index === i &&
                dragging?.index !== i}
              data-port-row={`${direction}:${port.id}`}
              tabindex="0"
              draggable={!disabled}
              aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              ondragstart={(e) => onDragStart(e, direction, i)}
              ondragover={(e) => onDragOver(e, direction, i)}
              ondrop={(e) => onDrop(e, direction, i)}
              ondragend={onDragEnd}
              onkeydown={(e) => onRowKeydown(e, direction, i, port.id)}
            >
              <span class="fd-ports__handle" aria-hidden="true">
                <Icon icon="heroicons:ellipsis-vertical" />
              </span>
              <span
                class="fd-ports__dot"
                aria-hidden="true"
                style="--fd-ports-dot: {getPortColorToken(checker, port)}"
              ></span>
              <span class="fd-ports__label">
                <span class="fd-ports__name" title={port.name}>{port.name}</span>
                {#if nameEdit && nameEdit.direction === direction && nameEdit.portId === port.id}
                  <InterfaceTag
                    id={nameEdit.value}
                    color={getDataTypeColorToken(checker, port.dataType)}
                    ghost
                  >
                    <InterfaceNameInput
                      value={nameEdit.value}
                      error={nameError}
                      onchange={(value) => nameEdit && (nameEdit = { ...nameEdit, value })}
                      onsubmit={submitName}
                      oncancel={() => (nameEdit = null)}
                    />
                  </InterfaceTag>
                {:else if boundEntry}
                  <InterfaceTag
                    id={boundEntry.id}
                    typeText={boundEntry.dataType !== port.dataType
                      ? `${getDataTypeDisplayText(checker, boundEntry.dataType)} ≠ ${laneName}`
                      : undefined}
                    color={getDataTypeColorToken(checker, boundEntry.dataType)}
                    mismatch={boundEntry.dataType !== port.dataType}
                    data-testid="port-interface-tag"
                  />
                {/if}
              </span>
              <span class="fd-ports__type" title={port.dataType}>{laneName}</span>
              <span class="fd-ports__iface" class:fd-ports__cell--empty={ifaceItems.length === 0}>
                {#if ifaceItems.length > 0}
                  <Menu
                    size="sm"
                    align="end"
                    label={m().workflowInterface.portActions({ port: port.name })}
                    testId={`port-interface-menu-${direction}-${port.id}`}
                    items={ifaceItems}
                  />
                {/if}
              </span>
              <!-- A trigger's event input is always exposed (SCH-47): no toggle. -->
              {#if !(direction === 'inputs' && isTriggerEventInput(node, port.id))}
                <IconButton
                  size="sm"
                  class="fd-ports__eye"
                  id={`${id}-${direction}-${port.id}`}
                  ariaLabel={exposed ? `Hide port ${port.name}` : `Show port ${port.name}`}
                  title={exposed ? 'Shown on the canvas' : 'Hidden from the canvas'}
                  {disabled}
                  onclick={() => setExposed(direction, port.id, !exposed)}
                >
                  <Icon icon={exposed ? 'heroicons:eye' : 'heroicons:eye-slash'} />
                </IconButton>
              {:else}
                <span class="fd-ports__eye-slot" aria-hidden="true"></span>
              {/if}
            </li>
          {/each}
          {#each branches as branch (branch.id)}
            <li class="fd-ports__item fd-ports__item--fixed" data-port-row={`outputs:${branch.id}`}>
              <span class="fd-ports__handle fd-ports__cell--empty" aria-hidden="true"></span>
              <span
                class="fd-ports__dot"
                aria-hidden="true"
                style="--fd-ports-dot: {getPortColorToken(checker, {
                  ...branch,
                  dataType: 'trigger'
                })}"
              ></span>
              <span class="fd-ports__name" title={branch.name}>{branch.name}</span>
              <span class="fd-ports__type">branch</span>
              <span class="fd-ports__iface fd-ports__cell--empty" aria-hidden="true"></span>
              <span class="fd-ports__eye-slot" aria-hidden="true"></span>
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
    gap: var(--fd-space-xl);
  }

  .fd-ports__group {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
  }

  .fd-ports__group-label {
    font-size: var(--fd-text-xs);
    font-weight: 400;
    color: var(--fd-muted-foreground);
  }

  .fd-ports__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  /* Flat row on a fixed grid: grip · dot · name · type · interface menu · eye.
     Every cell is always present, so columns line up whatever a row offers. */
  .fd-ports__item {
    display: grid;
    grid-template-columns:
      var(--fd-space-md) var(--fd-space-xs) minmax(0, 1fr) 4rem var(--fd-control-sm)
      var(--fd-control-sm);
    align-items: center;
    column-gap: var(--fd-space-xs);
    min-height: var(--fd-control-md);
    /* The grip column hangs in the panel gutter: dots line up with the labels. */
    margin: 0 calc(-1 * var(--fd-space-3xs)) 0 calc(-1 * var(--fd-space-2xl));
    padding-left: var(--fd-space-3xs);
    border-radius: var(--fd-radius-md);
    font-size: var(--fd-text-sm);
    color: var(--fd-foreground);
  }

  .fd-ports__item:hover,
  .fd-ports__item:focus-within {
    background-color: var(--fd-subtle);
  }

  /* An empty cell keeps its column. */
  .fd-ports__cell--empty {
    visibility: hidden;
  }

  .fd-ports__eye-slot {
    width: var(--fd-control-sm);
  }

  /* Room for the hint or error under the tag being typed. */
  .fd-ports__item--naming {
    margin-bottom: var(--fd-space-xl);
  }

  .fd-ports__item--dragging {
    opacity: 0.5;
  }

  .fd-ports__item--drop {
    outline: 2px solid var(--fd-primary);
    outline-offset: -2px;
  }

  /* A hidden port keeps its layout: name struck through and muted, dot faded,
     the eye shows the off state in the accent colour. */
  .fd-ports__item--hidden .fd-ports__name {
    color: var(--fd-muted-foreground);
    text-decoration: line-through;
  }

  .fd-ports__item--hidden .fd-ports__type {
    opacity: 0.6;
  }

  .fd-ports__item--hidden .fd-ports__dot {
    opacity: 0.35;
  }

  .fd-ports__item--hidden :global(.fd-ports__eye) {
    color: var(--fd-primary);
  }

  .fd-ports__handle {
    display: inline-flex;
    color: var(--fd-muted-foreground);
    cursor: grab;
    opacity: 0;
    transition: opacity var(--fd-transition-fast);
  }

  .fd-ports__item:hover .fd-ports__handle,
  .fd-ports__item:focus-within .fd-ports__handle {
    opacity: 1;
  }

  .fd-ports__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: var(--fd-radius-full);
    background-color: var(--fd-ports-dot);
  }

  .fd-ports__label {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
  }

  /* min-width:0 so a long port name ellipsizes instead of widening the row. */
  .fd-ports__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fd-ports__type {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .fd-ports__item :global(.fd-ports__eye) {
    color: var(--fd-muted-foreground);
  }

  /* The interface actions show on hover / focus, keeping their cell. */
  .fd-ports__iface {
    opacity: 0;
    transition: opacity var(--fd-transition-fast);
  }

  .fd-ports__item:hover .fd-ports__iface,
  .fd-ports__item:focus-within .fd-ports__iface {
    opacity: 1;
  }
</style>
