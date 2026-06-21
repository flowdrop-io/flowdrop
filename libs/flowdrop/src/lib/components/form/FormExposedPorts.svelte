<!--
  Port exposure widget

  Renders one expose/hide toggle per port of the node being configured. Binds to
  the injected `exposedPorts` reserved config property (an ExposedPortsConfig
  map). In v2 exposure is semantic: a not-exposed port is hidden on the canvas,
  not wireable, and not runtime-overridable.

  The map is kept sparse — a toggle that lands back on the port's
  `exposedByDefault` removes its key, so only genuine overrides are stored.

  @see .claude/plans/exposed-ports.md
-->

<script lang="ts">
  import type {
    DynamicPort,
    ExposedPortsConfig,
    NodePort,
    WorkflowNode
  } from '../../types/index.js';
  import { dynamicPortToNodePort } from '../../types/index.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { getPortColorToken, getPortBackgroundColorForPort } from '$lib/utils/colors.js';
  import FormToggle from './FormToggle.svelte';

  interface Props {
    id: string;
    value: unknown;
    ariaDescribedBy?: string;
    disabled?: boolean;
    onChange: (value: unknown) => void;
    /** The node being configured, source of the port list + exposedByDefault. */
    node?: WorkflowNode;
  }

  let { id, value, ariaDescribedBy, disabled = false, onChange, node }: Props = $props();

  const fd = getInstance();
  const checker = fd.portCompatibility;

  const exposedPorts = $derived((value as ExposedPortsConfig | undefined) ?? {});

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

  /** Effective exposure: explicit override, else the port's default. */
  function isExposed(port: NodePort, direction: 'inputs' | 'outputs'): boolean {
    const override = exposedPorts[direction]?.[port.id];
    if (override !== undefined) return override;
    return port.exposedByDefault ?? true;
  }

  /**
   * Set a port's exposure, keeping the stored map sparse: an override equal to
   * the port's default is dropped rather than stored.
   */
  function setExposed(port: NodePort, direction: 'inputs' | 'outputs', exposed: boolean): void {
    const next: ExposedPortsConfig = {
      inputs: { ...exposedPorts.inputs },
      outputs: { ...exposedPorts.outputs }
    };
    const bucket = next[direction] as Record<string, boolean>;
    if (exposed === (port.exposedByDefault ?? true)) {
      delete bucket[port.id];
    } else {
      bucket[port.id] = exposed;
    }
    // Drop empty buckets so the value stays minimal.
    if (Object.keys(next.inputs ?? {}).length === 0) delete next.inputs;
    if (Object.keys(next.outputs ?? {}).length === 0) delete next.outputs;
    onChange(Object.keys(next).length === 0 ? undefined : next);
  }
</script>

<div class="exposed-ports" {id} aria-describedby={ariaDescribedBy}>
  {#each [{ key: 'inputs', label: 'Inputs', ports: inputPorts }, { key: 'outputs', label: 'Outputs', ports: outputPorts }] as group (group.key)}
    {#if group.ports.length > 0}
      <div class="exposed-ports__group">
        <span class="exposed-ports__group-label">{group.label}</span>
        <ul class="exposed-ports__list">
          {#each group.ports as port (port.id)}
            {@const direction = group.key as 'inputs' | 'outputs'}
            <li class="exposed-ports__item">
              <span class="exposed-ports__name">{port.name}</span>
              <span
                class="exposed-ports__badge"
                style="background-color:{getPortBackgroundColorForPort(
                  checker,
                  port,
                  15
                )};color:{getPortColorToken(
                  checker,
                  port
                )};border:1px solid {getPortBackgroundColorForPort(checker, port, 30)}"
              >
                {port.dataType}
              </span>
              <FormToggle
                id={`${id}-${direction}-${port.id}`}
                value={isExposed(port, direction)}
                onLabel="Exposed"
                offLabel="Hidden"
                {disabled}
                onChange={(exposed) => setExposed(port, direction, exposed)}
              />
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/each}
</div>

<style>
  .exposed-ports {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3, 0.75rem);
  }

  .exposed-ports__group {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-1, 0.25rem);
  }

  .exposed-ports__group-label {
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .exposed-ports__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-1, 0.25rem);
  }

  .exposed-ports__item {
    display: flex;
    align-items: center;
    gap: var(--fd-space-2, 0.5rem);
    padding: var(--fd-space-1, 0.25rem) var(--fd-space-2, 0.5rem);
    border-radius: var(--fd-radius-md, 6px);
    border: 1px solid var(--fd-border-muted);
  }

  .exposed-ports__name {
    flex: 1;
    font-size: var(--fd-text-xs);
    font-weight: 500;
  }

  .exposed-ports__badge {
    font-size: var(--fd-text-2xs, 0.625rem);
    padding: 0 var(--fd-space-1, 0.25rem);
    border-radius: var(--fd-radius-sm, 4px);
    white-space: nowrap;
  }
</style>
