<!--
  EdgeDecorator: two connected nodes on a canvas set up like the editor's, with the
  wire drawn by FlowDropEdge and styled the way the editor styles a new connection
  (`applyConnectionStyling`: trigger, tool, loopback or data, from the source port).

  Seed state without a backend:
  - `selected`: the wire is selected.
  - `statuses`: run status by node id (`source-node`, `target-node`). A wire whose source
    completed and whose target was reached is "hot" and draws in the success colour.
  - `testMode`, `zoom`: as in NodeDecorator.
-->
<script lang="ts">
  import { SvelteFlow } from '@xyflow/svelte';
  import type { Node, Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import UniversalNode from '$lib/components/UniversalNode.svelte';
  import FlowDropEdge from '$lib/components/FlowDropEdge.svelte';
  import { provideInstance } from '$lib/stores/getInstance.svelte.js';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import { applyConnectionStyling } from '$lib/utils/edgeStyling.js';
  import type { WorkflowEdge, WorkflowNode } from '$lib/types/index.js';
  import CanvasChrome from './CanvasChrome.svelte';
  import { useColorMode } from './colorMode.svelte.js';
  import { createStoryInstance, seedRunState, type StoryStatuses } from './utils.js';

  interface Props {
    sourceData: WorkflowNode['data'];
    targetData: WorkflowNode['data'];
    /** Output port of the source node the wire starts at. */
    sourceHandleId?: string;
    /** Input port of the target node the wire ends at. */
    targetHandleId?: string;
    selected?: boolean;
    statuses?: StoryStatuses;
    testMode?: boolean;
    zoom?: number;
  }

  let {
    sourceData,
    targetData,
    sourceHandleId = 'output',
    targetHandleId = 'input',
    selected = false,
    statuses,
    testMode = false,
    zoom
  }: Props = $props();

  const fd = createStoryInstance();
  provideInstance(fd);
  $effect(() => seedRunState(fd, statuses, testMode));

  const nodeTypes = { universalNode: UniversalNode };
  const edgeTypes = { default: FlowDropEdge };

  const SOURCE_ID = 'source-node';
  const TARGET_ID = 'target-node';

  const workflowNode = (id: string, x: number, data: WorkflowNode['data']): WorkflowNode => ({
    id,
    type: 'universalNode',
    position: { x, y: 0 },
    data
  });

  let nodes = $derived<Node[]>([
    workflowNode(SOURCE_ID, 0, sourceData),
    workflowNode(TARGET_ID, 420, targetData)
  ]);

  let edges = $derived.by<Edge[]>(() => {
    const edge: WorkflowEdge = {
      id: 'edge-1',
      source: SOURCE_ID,
      target: TARGET_ID,
      sourceHandle: buildHandleId(SOURCE_ID, 'output', sourceHandleId),
      targetHandle: buildHandleId(TARGET_ID, 'input', targetHandleId),
      selected
    };
    applyConnectionStyling(
      edge,
      workflowNode(SOURCE_ID, 0, sourceData),
      workflowNode(TARGET_ID, 420, targetData)
    );
    return [edge];
  });

  const color = useColorMode();
  let fitViewOptions = $derived(
    zoom === undefined
      ? { maxZoom: 0.85, padding: 0.3 }
      : { minZoom: zoom, maxZoom: zoom, padding: 0.3 }
  );
</script>

<div class="edge-decorator-wrapper">
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    fitView
    {fitViewOptions}
    minZoom={0.2}
    maxZoom={3}
    elevateEdgesOnSelect={true}
    colorMode={color.current}
  >
    <CanvasChrome nodeCount={nodes.length} edgeCount={edges.length} />
  </SvelteFlow>
</div>

<style>
  .edge-decorator-wrapper {
    width: 900px;
    height: 400px;
    position: relative;
  }

  .edge-decorator-wrapper :global(.svelte-flow.dark) {
    --background-color-default: var(--xy-background-color-default);
  }
</style>
