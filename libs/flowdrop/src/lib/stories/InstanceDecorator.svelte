<!--
  @component
  Gives a story its own FlowDrop instance, seeded without a backend.

  Editor components read their state from `getInstance()`: the workflow, the
  node types, the run being shown, the Edit | Test mode. This decorator creates
  an instance, fills it from its props, provides it to the children and tears
  it down afterwards, so two stories never share state.

  Props seed state once, when the story mounts. For anything else, pass
  `setup` and call the stores directly: `setup={(fd) => fd.workflow.updateName('x')}`.

  With `runs`, the instance is also given an endpoint config, and the browser's
  `fetch` answers the runs list and run status requests from that data (and
  nothing else) until the story is destroyed. Other requests go through.
-->

<script lang="ts" module>
  import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
  import type { EditorMode } from '../stores/editorModeStore.svelte.js';
  import type { NodeMetadata, Workflow } from '../types/index.js';

  /** A run to show in the run pill, as `fd.runs.openRun` takes it. */
  export interface SeededRun {
    runId: string;
    /** `running`, `paused`, `completed`, `failed`, `cancelled`. */
    status: string;
  }

  /** The story's fake backend base URL. Nothing listens there. */
  export const STORY_API_BASE = 'https://storybook.invalid/api/flowdrop';
</script>

<script lang="ts">
  import { onDestroy, setContext, type Snippet } from 'svelte';
  import { FLOWDROP_INSTANCE_KEY } from '../stores/getInstance.svelte.js';
  import { createFlowDropInstance } from '../stores/instanceContainer.svelte.js';
  import { createEndpointConfig } from '../config/endpoints.js';

  interface Props {
    /** The workflow open in the editor. */
    workflow?: Workflow;
    /** Node types the editor knows (the palette and the console read them). */
    nodeTypes?: NodeMetadata[];
    /** Edit or Test mode. @default 'edit' */
    editorMode?: EditorMode;
    /** The run the run pill shows. */
    run?: SeededRun;
    /**
     * The body of the runs list response (`{ success, data: { pipelines } }`).
     * Turns on the fake runs endpoints described above.
     */
    runs?: unknown;
    /** Anything else to seed, called once with the new instance. */
    setup?: (fd: FlowDropInstance) => void;
    /** Width of the wrapper. @default '100%' */
    width?: string;
    children: Snippet;
  }

  const {
    workflow,
    nodeTypes,
    editorMode,
    run,
    runs,
    setup,
    width = '100%',
    children
  }: Props = $props();

  const fd = createFlowDropInstance();
  setContext(FLOWDROP_INSTANCE_KEY, fd);

  // Seed once, from the props as they are when the story mounts.
  // svelte-ignore state_referenced_locally
  if (workflow) fd.workflow.initialize(workflow);
  // svelte-ignore state_referenced_locally
  if (nodeTypes) fd.nodeTypes.set(nodeTypes);
  // svelte-ignore state_referenced_locally
  if (editorMode) fd.editorMode.set(editorMode);

  // svelte-ignore state_referenced_locally
  const runsBody = runs;
  let restoreFetch: (() => void) | null = null;
  if (runsBody !== undefined) {
    fd.api.configure(createEndpointConfig(STORY_API_BASE));
    const realFetch = window.fetch;
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(STORY_API_BASE)) {
        const path = url.slice(STORY_API_BASE.length);
        if (/\/workflow\/[^/]+\/pipelines\?/.test(path)) return Promise.resolve(json(runsBody));
        const status = /\/pipelines\/([^/?]+)/.exec(path);
        if (status) {
          const all = (runsBody as { data?: { pipelines?: { id: string; status: string }[] } }).data
            ?.pipelines;
          const found = all?.find((p) => p.id === decodeURIComponent(status[1]));
          return Promise.resolve(json({ success: true, data: { status: found?.status } }));
        }
      }
      return realFetch(input, init);
    };
    restoreFetch = () => {
      window.fetch = realFetch;
    };
  }

  // svelte-ignore state_referenced_locally
  if (run) fd.runs.openRun(run.runId, run.status);
  // svelte-ignore state_referenced_locally
  setup?.(fd);

  onDestroy(() => {
    restoreFetch?.();
    fd.destroy();
  });
</script>

<div class="instance-decorator" style:width>
  {@render children()}
</div>

<style>
  .instance-decorator {
    position: relative;
  }
</style>
