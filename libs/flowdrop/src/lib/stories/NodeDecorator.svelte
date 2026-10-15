<!--
  NodeDecorator: node cards as real SvelteFlow nodes on a canvas set up like the
  editor's (zoom tier, zoom controls, background), each drawn through
  UniversalNode, so the status pill, the Test mode border and the zoom-tier
  drawings are the real ones.

  Pass one node with `data`, or several with `nodes`. Seed state without a backend:
  - `statuses`: run status by node id (a single `data` node has the id `story-node`).
  - `testMode`: Test mode, which also draws the status border and dims nodes the run did not reach.
  - `zoom`: the zoom the canvas opens at (see `ZOOM_LEVELS` in utils.ts for the tier of each).
  - `problems`: the Doctor's findings (see `seedDoctor` in utils.ts).
  - `header`: drawn above the canvas with the same instance, e.g. the Navbar with the
    Problems indicator.
-->
<script lang="ts">
  import { SvelteFlow } from '@xyflow/svelte';
  import type { Node } from '@xyflow/svelte';
  import { onDestroy, type Snippet } from 'svelte';
  import '@xyflow/svelte/dist/style.css';
  import UniversalNode from '$lib/components/UniversalNode.svelte';
  import { provideInstance } from '$lib/stores/getInstance.svelte.js';
  import type { WorkflowNode } from '$lib/types/index.js';
  import type { DoctorProblem } from '$lib/types/doctor.js';
  import CanvasChrome from './CanvasChrome.svelte';
  import { useColorMode } from './colorMode.svelte.js';
  import {
    createStoryInstance,
    seedDoctor,
    seedRunState,
    type StoryNode,
    type StoryStatuses
  } from './utils.js';

  interface Props {
    /** A single node, with the id `story-node`. */
    data?: WorkflowNode['data'];
    /** Several nodes; used instead of `data`. */
    nodes?: StoryNode[];
    /** Whether the single node is selected. */
    selected?: boolean;
    /** Run status by node id. */
    statuses?: StoryStatuses;
    /** Test mode: the status border is drawn and nodes without a status are dimmed. */
    testMode?: boolean;
    /** Zoom the canvas opens at. Without it the view fits the nodes (up to 100%). */
    zoom?: number;
    /** The Doctor's findings: node badges, and the Problems indicator if `header` draws it. */
    problems?: DoctorProblem[];
    /** Drawn above the canvas, inside the same instance. */
    header?: Snippet;
    width?: number;
    height?: number;
  }

  let {
    data,
    nodes: given,
    selected = false,
    statuses,
    testMode = false,
    zoom,
    problems,
    header,
    width = 800,
    height = 400
  }: Props = $props();

  // One instance per story: seeded run state must not reach other stories.
  const fd = createStoryInstance();
  provideInstance(fd);
  $effect(() => seedRunState(fd, statuses, testMode));

  const nodeTypes = { universalNode: UniversalNode };

  let nodes = $derived<Node[]>(
    (given ?? (data ? [{ id: 'story-node', data, selected } satisfies StoryNode] : [])).map(
      (n) => ({
        id: n.id,
        type: 'universalNode',
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        selected: n.selected,
        data: n.data
      })
    )
  );

  // svelte-ignore state_referenced_locally
  if (problems) {
    const stop = seedDoctor(fd, given ?? [{ id: 'story-node', data: data!, selected }], problems);
    onDestroy(stop);
  }

  const color = useColorMode();
  let fitViewOptions = $derived(
    zoom === undefined
      ? { maxZoom: 1, padding: 0.2 }
      : { minZoom: zoom, maxZoom: zoom, padding: 0.2 }
  );
</script>

{#if header}
  <div style:width="{width}px">{@render header()}</div>
{/if}
<div class="node-decorator-wrapper" style:width="{width}px" style:height="{height}px">
  <SvelteFlow
    {nodes}
    edges={[]}
    {nodeTypes}
    fitView
    {fitViewOptions}
    minZoom={0.2}
    maxZoom={3}
    colorMode={color.current}
  >
    <CanvasChrome nodeCount={nodes.length} />
  </SvelteFlow>
</div>

<style>
  .node-decorator-wrapper {
    position: relative;
  }

  /* Fix: SvelteFlow's scoped styles use non-prefixed --background-color-default
	   which doesn't update with colorMode="dark". Map the --xy- themed value. */
  .node-decorator-wrapper :global(.svelte-flow.dark) {
    --background-color-default: var(--xy-background-color-default);
  }
</style>
