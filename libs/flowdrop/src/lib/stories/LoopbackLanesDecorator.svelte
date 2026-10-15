<!--
  LoopbackLanesDecorator: a small graph with loopbacks on a canvas set up like the
  editor's. Loopbacks are drawn as return lanes, as in the editor: the story registers
  the canvas measurement the lanes need, and the wires are styled with
  `applyConnectionStyling`. Seed run state with `statuses` / `testMode`, and open at a
  `zoom`, as in NodeDecorator.
-->
<script lang="ts">
  import { SvelteFlow } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import UniversalNode from '$lib/components/UniversalNode.svelte';
  import FlowDropEdge from '$lib/components/FlowDropEdge.svelte';
  import LoopbackLanes from '$lib/components/LoopbackLanes.svelte';
  import CanvasController from '$lib/components/CanvasController.svelte';
  import { provideInstance } from '$lib/stores/getInstance.svelte.js';
  import { applyConnectionStyling } from '$lib/utils/edgeStyling.js';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import type { WorkflowEdge, WorkflowNode } from '$lib/types/index.js';
  import CanvasChrome from './CanvasChrome.svelte';
  import { useColorMode } from './colorMode.svelte.js';
  import {
    createNodeMetadata,
    createStoryInstance,
    seedRunState,
    type StoryStatuses
  } from './utils.js';

  interface Props {
    /** Cards by id with their top-left corner. */
    cards: Array<{ id: string; x: number; y: number }>;
    /** Forward wires, `[source, target]`. */
    wires: Array<[string, string]>;
    /** Loopbacks, `[source, loop]`: the source wires back into the loop's `loop_back`. */
    loops: Array<[string, string]>;
    /** Run status by card id. */
    statuses?: StoryStatuses;
    testMode?: boolean;
    /** Zoom the canvas opens at. Without it the view fits the graph (up to 70%). */
    zoom?: number;
  }

  let { cards, wires, loops, statuses, testMode = false, zoom }: Props = $props();

  const fd = createStoryInstance();
  provideInstance(fd);
  $effect(() => seedRunState(fd, statuses, testMode));

  // The lanes read the canvas's measurement, which the editor registers; here the story does.
  let controller: CanvasController | undefined = $state();
  $effect(() => {
    const canvas = controller;
    if (!canvas) return;
    const measure = (nodeId: string) => canvas.canvasMeasureNode(nodeId);
    fd.measureNode = measure;
    return () => {
      if (fd.measureNode === measure) fd.measureNode = null;
    };
  });

  const nodeTypes = { universalNode: UniversalNode };
  const edgeTypes = { default: FlowDropEdge };

  const metadata = createNodeMetadata({
    node_type_id: 'step',
    name: 'Step',
    description: 'A step',
    inputs: [
      { id: 'in', name: 'In', type: 'input', dataType: 'string', required: false },
      { id: 'loop_back', name: 'Loop back', type: 'input', dataType: 'string', required: false }
    ],
    outputs: [{ id: 'out', name: 'Out', type: 'output', dataType: 'string' }]
  });

  // The story props are fixed for its lifetime: the canvas starts from them.
  // svelte-ignore state_referenced_locally
  let nodes = $state.raw<WorkflowNode[]>(
    cards.map(({ id, x, y }) => ({
      id,
      type: 'universalNode',
      position: { x, y },
      data: { label: id.toUpperCase(), config: {}, metadata }
    }))
  );

  const edge = (source: string, target: string, port: string): WorkflowEdge => {
    const wire: WorkflowEdge = {
      id: `${source}>${target}.${port}`,
      source,
      target,
      sourceHandle: buildHandleId(source, 'output', 'out'),
      targetHandle: buildHandleId(target, 'input', port)
    };
    const from = nodes.find((n) => n.id === source);
    const to = nodes.find((n) => n.id === target);
    if (from && to) applyConnectionStyling(wire, from, to);
    return wire;
  };

  // svelte-ignore state_referenced_locally
  let edges = $state.raw<WorkflowEdge[]>([
    ...wires.map(([s, t]) => edge(s, t, 'in')),
    ...loops.map(([s, t]) => edge(s, t, 'loop_back'))
  ]);

  const color = useColorMode();
  // svelte-ignore state_referenced_locally
  const fitViewOptions =
    zoom === undefined
      ? { maxZoom: 0.7, padding: 0.1 }
      : { minZoom: zoom, maxZoom: zoom, padding: 0.1 };
</script>

<div class="lanes-decorator-wrapper">
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    {edgeTypes}
    fitView
    {fitViewOptions}
    minZoom={0.2}
    maxZoom={3}
    colorMode={color.current}
  >
    <CanvasController bind:this={controller} />
    <CanvasChrome nodeCount={nodes.length} edgeCount={edges.length} />
    <LoopbackLanes {nodes} {edges} />
  </SvelteFlow>
</div>

<style>
  .lanes-decorator-wrapper {
    width: 1100px;
    height: 460px;
    position: relative;
  }
</style>
