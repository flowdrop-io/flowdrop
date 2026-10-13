<!--
  LoopbackLanesDecorator: a small graph with loopbacks on a SvelteFlow canvas,
  with the "Draw loopbacks as return lanes" setting on while it is mounted.
-->
<script lang="ts">
  import { SvelteFlow, MarkerType } from '@xyflow/svelte';
  import type { ColorMode } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import UniversalNode from '$lib/components/UniversalNode.svelte';
  import FlowDropEdge from '$lib/components/FlowDropEdge.svelte';
  import LoopbackLanes from '$lib/components/LoopbackLanes.svelte';
  import { getDefaultInstance } from '$lib/stores/instanceContainer.svelte.js';
  import { provideInstance } from '$lib/stores/getInstance.svelte.js';
  import { getEditorSettings, updateSettings } from '$lib/stores/settingsStore.svelte.js';
  import { EDGE_MARKER_SIZES } from '$lib/config/constants.js';
  import type { WorkflowEdge, WorkflowNode } from '$lib/types/index.js';

  interface Props {
    /** Cards by id with their top-left corner. */
    cards: Array<{ id: string; x: number; y: number }>;
    /** Forward wires, `[source, target]`. */
    wires: Array<[string, string]>;
    /** Loopbacks, `[source, loop]`: the source wires back into the loop's `loop_back`. */
    loops: Array<[string, string]>;
  }

  let { cards, wires, loops }: Props = $props();

  provideInstance(getDefaultInstance());

  const nodeTypes = { universalNode: UniversalNode };
  const edgeTypes = { default: FlowDropEdge };

  const metadata = {
    id: 'step',
    name: 'Step',
    description: 'A step',
    category: 'processing',
    version: '1.0.0',
    type: 'default',
    inputs: [
      { id: 'in', name: 'In', type: 'input', dataType: 'string', required: false },
      { id: 'loop_back', name: 'Loop back', type: 'input', dataType: 'string', required: false }
    ],
    outputs: [{ id: 'out', name: 'Out', type: 'output', dataType: 'string' }]
  };

  // The story props are fixed for its lifetime: the canvas starts from them.
  // svelte-ignore state_referenced_locally
  let nodes = $state.raw<WorkflowNode[]>(
    cards.map(
      ({ id, x, y }) =>
        ({
          id,
          type: 'universalNode',
          position: { x, y },
          data: { label: id.toUpperCase(), config: {}, metadata, nodeId: id }
        }) as unknown as WorkflowNode
    )
  );

  const edge = (source: string, target: string, port: string, loop: boolean): WorkflowEdge =>
    ({
      id: `${source}>${target}.${port}`,
      source,
      target,
      sourceHandle: `${source}-output-out`,
      targetHandle: `${target}-input-${port}`,
      style: loop
        ? 'stroke: var(--fd-edge-loopback, #8b5cf6); stroke-dasharray: 5 3;'
        : 'stroke: var(--fd-edge-data, #64748b);',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        ...EDGE_MARKER_SIZES.data,
        color: loop ? '#8b5cf6' : '#64748b'
      }
    }) as unknown as WorkflowEdge;

  // svelte-ignore state_referenced_locally
  let edges = $state.raw<WorkflowEdge[]>([
    ...wires.map(([s, t]) => edge(s, t, 'in', false)),
    ...loops.map(([s, t]) => edge(s, t, 'loop_back', true))
  ]);

  // The lanes are opt in: turn the setting on while the story is shown, then put it back.
  $effect(() => {
    const before = getEditorSettings().loopbackLanes;
    updateSettings({ editor: { loopbackLanes: true } as never });
    return () => updateSettings({ editor: { loopbackLanes: before } as never });
  });

  let colorMode = $state<ColorMode>(
    (document.documentElement.getAttribute('data-theme') as ColorMode) || 'light'
  );
</script>

<div class="lanes-decorator-wrapper">
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    {edgeTypes}
    fitView
    fitViewOptions={{ maxZoom: 0.7, padding: 0.1 }}
    {colorMode}
  >
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
