<!--
  LoopbackLanes Component
  Renderless. Derives the return lane of every loopback in one pass (track
  assignment needs the whole graph) whenever the nodes, edges or measured sizes
  change, and lets the edges read them through the instance's loopbackLanes
  store. Yields no lanes while the setting is off or the canvas has no measurement.
  Must be rendered inside <SvelteFlow> so the canvas measurement is registered.
-->

<script lang="ts">
  import type { WorkflowEdge, WorkflowNode } from '../types/index.js';
  import { fromWorkflow } from '../layout/fromWorkflow.js';
  import { loopbackLanes, type LoopbackLane } from '../layout/geometry.js';
  import { getEditorSettings } from '../stores/settingsStore.svelte.js';
  import { getInstance } from '../stores/getInstance.svelte.js';
  import { resolveComponentName } from '../utils/nodeTypes.js';
  import { isLoopbackEdge } from '../utils/connections.js';

  interface Props {
    nodes: readonly WorkflowNode[];
    edges: readonly WorkflowEdge[];
  }

  let { nodes, edges }: Props = $props();

  const fd = getInstance();

  // Reads the nodes, edges and settings, and the xyflow measurement through the canvas's
  // `measureNode`, so a stale size saved with the workflow never reaches the lanes.
  const lanes = $derived.by(() => {
    const result = new Map<string, LoopbackLane>();
    const measure = fd.measureNode;
    if (!measure || !getEditorSettings().loopbackLanes || !edges.some(isLoopbackEdge)) {
      return result;
    }
    const graph = fromWorkflow(nodes, edges, {
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
      if ([...lane.body].every((cardId) => measure(cardId))) result.set(id, lane);
    }
    return result;
  });

  $effect(() => fd.loopbackLanes.connect(() => lanes));
</script>
