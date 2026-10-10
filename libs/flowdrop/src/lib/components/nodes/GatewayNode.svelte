<!--
  Gateway Node Component
  Branching control flow on the card v2 geometry (see NodeCard): the same
  header, the completion trigger as a header pin, input ports as rows on the
  left, and the branches as output rows on the right (their triggers stay rows).
  Shows active branches and execution paths.

  Port rendering:
  - Input-port exposure (data.config.ports, falling back to each port's
    exposedByDefault) decides which input ports render, in effective order.
    Branches are authored output paths and always render.
  - Branches are not NodePorts: each becomes a trigger-lane output row whose
    port id is the branch name. Rows are keyed by index, so two branches with
    the same (or an empty) name draw two rows instead of crashing.
-->

<script lang="ts">
  import type { WorkflowNode, Branch, NodePort, PortsConfig } from '../../types/index.js';
  import NodeCard from './NodeCard.svelte';
  import { getNodeIcon } from '../../utils/icons.js';
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

  // Hoist the graph branch — read in the template and the card.
  const graph = $derived(m().nodes.graph);

  /**
   * Instance-specific title override from config.
   * Falls back to the original label if not set.
   */
  const displayTitle = $derived((props.data.config?.instanceTitle as string) || props.data.label);

  /**
   * Instance-specific description override from config.
   * Falls back to the metadata description if not set.
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
   * Derived list of exposed input ports, in effective order.
   */
  const visibleInputPorts = $derived(
    orderPortsFor(props.data.metadata.inputs, portsConfig.inputs).filter((port) =>
      isPortVisible(port, 'input', portsConfig)
    )
  );

  // Gateway-specific data - branches are calculated at runtime from config
  const branches = $derived((props.data.config?.branches as Branch[]) || []);
  const activeBranches = $derived(
    ((fd.playground.nodeStatusFor(props.id) ?? props.data.executionInfo)?.output
      ?.active_branches as string[]) || []
  );

  /**
   * What a branch row draws: an authored control-flow path, not a `NodePort`. It
   * has no port id of its own (the branch name is its id) and it always carries
   * the trigger lane, so a branch named `error` cannot trip the reserved-error
   * colour exception the way a real `error` output does. An unnamed branch is
   * labelled by its position.
   */
  const branchPorts = $derived<NodePort[]>(
    branches.map((branch, index) => ({
      id: branch.name,
      name: branch.label || branch.name || String(index + 1),
      type: 'output',
      dataType: 'trigger'
    }))
  );

  /** The node's geometry. Only the input trigger is a pin: a branch named `trigger` stays a row. */
  const geometry = $derived(
    computeNodeGeometry({
      inputs: visibleInputPorts,
      outputs: branchPorts,
      showDescriptions: getEditorSettings().showNodeDescriptions,
      execPins: 'input'
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
    props.data.onConfigOpen?.({ id: props.id, type: 'gateway', data: props.data });
  }
</script>

<NodeCard
  id={props.id}
  selected={props.selected}
  variant="gateway"
  {geometry}
  title={displayTitle}
  {kindLine}
  description={displayDescription}
  icon={getNodeIcon(fd.categories, props.data.metadata.icon, props.data.metadata.category)}
  color={categoryColor}
  ariaLabel={graph.gatewayNode({ title: displayTitle })}
  activeOutputs={activeBranches}
  emptyNote={branches.length === 0 && visibleInputPorts.every((p) => p.id === 'trigger')
    ? 'No branches configured'
    : undefined}
  onconfig={openConfigSidebar}
/>
