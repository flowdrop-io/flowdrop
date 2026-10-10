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
  import type { WorkflowNode, DynamicPort, PortsConfig } from '../../types/index.js';
  import { dynamicPortToNodePort } from '../../types/index.js';
  import { getNodeIcon } from '../../utils/icons.js';
  import NodeCard from './NodeCard.svelte';
  import { getCategoryColorToken } from '../../utils/colors.js';
  import { getEditorSettings } from '../../stores/settingsStore.svelte.js';
  import { computeNodeGeometry } from '../../utils/nodeGeometry.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { orderPortsFor, isPortVisible } from '../../utils/portUtils.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    id: string;
    data: WorkflowNode['data'] & {
      onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
    };
    selected?: boolean;
  }

  let props: Props = $props();

  const fd = getInstance();

  // Hoist the graph branch: one getter walk per render.
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

  const categoryColor = $derived(
    getCategoryColorToken(fd.categories, props.data.metadata.category)
  );
  const kindLine = $derived(
    props.data.metadata.category
      ? `${fd.categories.getLabel(props.data.metadata.category)} · ${props.id}`
      : props.id
  );

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

<NodeCard
  id={props.id}
  selected={props.selected}
  {geometry}
  title={displayTitle}
  {kindLine}
  description={displayDescription}
  icon={getNodeIcon(fd.categories, props.data.metadata.icon, props.data.metadata.category)}
  color={categoryColor}
  ariaLabel={graph.workflowNode({ name: props.data.metadata.name })}
  onconfig={openConfigSidebar}
/>
