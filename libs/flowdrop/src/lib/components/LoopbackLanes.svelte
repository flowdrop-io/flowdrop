<!--
  LoopbackLanes Component
  Renderless. Computes the return lane of every loopback in one pass (track
  assignment needs the whole graph) whenever the nodes, edges or measured sizes
  change, and hands them to the edges through the instance's loopbackLanes
  store. Does nothing, and leaves the store empty, while the setting is off.
  Must be rendered inside <SvelteFlow> so it can read xyflow's measurement.
-->

<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';
  import { untrack } from 'svelte';
  import type { WorkflowEdge, WorkflowNode } from '../types/index.js';
  import { fromWorkflow, type MeasuredCard } from '../layout/fromWorkflow.js';
  import { loopbackLanes, type LoopbackLane } from '../layout/geometry.js';
  import { getEditorSettings } from '../stores/settingsStore.svelte.js';
  import { getInstance } from '../stores/getInstance.svelte.js';
  import { resolveComponentName } from '../utils/nodeTypes.js';
  import { extractPortId } from '../utils/handleIds.js';
  import { isLoopbackEdge } from '../utils/connections.js';

  interface Props {
    nodes: readonly WorkflowNode[];
    edges: readonly WorkflowEdge[];
  }

  let { nodes, edges }: Props = $props();

  const fd = getInstance();
  const { getInternalNode } = useSvelteFlow();

  /** A node as xyflow measured it, or undefined until it is. */
  function measure(nodeId: string): MeasuredCard | undefined {
    const internal = getInternalNode(nodeId);
    const width = internal?.measured.width;
    const height = internal?.measured.height;
    const bounds = internal?.internals.handleBounds;
    if (!width || !height || !bounds) return undefined;
    const centres = (handles: typeof bounds.source) =>
      (handles ?? []).flatMap((h) => {
        const portId = extractPortId(h.id ?? undefined);
        return portId
          ? [{ portId, dx: Math.round(h.x + h.width / 2), dy: Math.round(h.y + h.height / 2) }]
          : [];
      });
    return { width, height, inputs: centres(bounds.target), outputs: centres(bounds.source) };
  }

  $effect(() => {
    const enabled = getEditorSettings().loopbackLanes;
    const flowNodes = nodes;
    const flowEdges = edges;
    const lanes = new Map<string, LoopbackLane>();
    if (enabled && flowEdges.some(isLoopbackEdge)) {
      const graph = fromWorkflow(flowNodes, flowEdges, {
        measured: measure,
        visualType: (node) => {
          const metadata = node.data?.metadata;
          return metadata
            ? resolveComponentName(fd.nodes, metadata, node.data?.config?.nodeType as string)
            : 'workflowNode';
        },
        showDescriptions: getEditorSettings().showNodeDescriptions
      });
      for (const [id, lane] of loopbackLanes(graph)) {
        // A lane needs every card it runs under measured; otherwise the edge stays a bezier.
        const known = [...lane.body].every((cardId) => measure(cardId));
        if (known) lanes.set(id, lane);
      }
    }
    untrack(() => fd.loopbackLanes.set(lanes));
  });
</script>
