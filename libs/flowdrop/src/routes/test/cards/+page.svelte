<!--
  Node Card Test Page

  The stress cards of the Graphite G8 review, rendered as real nodes inside a
  real SvelteFlow canvas (UniversalNode + FlowDropEdge), with the real skin.
  Used to check the straight-wire contract (tests/e2e/node-card-geometry.spec.ts)
  and to compare the card against the review prototype in screenshots.

  Query params:
    - ?theme=default|minimal|drafter|graphite   -> skin (default: graphite)
    - ?scheme=light|dark                         -> colour scheme (default: light)
    - ?descriptions=1                            -> turn on the Show descriptions setting
    - ?zoom=0.8                                  -> canvas zoom (default 1)
    - ?select=<node id>                          -> render that node selected

  Cards (ids are the data-id of the node wrapper):
    one-line      1-line title, a description, wired and open ports, a required open input
    two-line      2-line title: the "kind · id" line gives way, the header stays 60px
    clamp         3+ line title clamped at 2, long description (popover / band)
    long-ports    long port names: pills stop at 128px, the full name is in the tooltip
    types         every port state: wired, open, required, branch triggers, exec pins open
    source        a node with no inputs
    chain-a/b/c   three nodes wired row 1 to row 1: aligned tops give straight wires

  Other node types (Graphite G8d), third and fourth rows:
    switch.1      gateway with 5 branches (the last one the default), trigger pin in
    if_else.1     gateway with True / False
    unnamed.1     gateway with two empty-named branches (B1: must not crash)
    tool.1        tool node: one tool port each side, badge and version on the kind line
    simple.1/2    Simple: 1 port each side, and 2 in / 3 out
    square.1/2    Square: 1 port each side, and 3 in / 1 out
    start.1, end.1, exit.1   Terminal circles
-->

<script lang="ts">
  import { untrack } from 'svelte';
  import { page } from '$app/stores';
  import { SvelteFlow, Background, BackgroundVariant } from '@xyflow/svelte';
  import type { Edge, Node } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import '$lib/styles/fonts/inter.css';
  import UniversalNode from '$lib/components/UniversalNode.svelte';
  import FlowDropEdge from '$lib/components/FlowDropEdge.svelte';
  import { getDefaultInstance } from '$lib/stores/instanceContainer.svelte.js';
  import { provideInstance } from '$lib/stores/getInstance.svelte.js';
  import { updateSettings } from '$lib/stores/settingsStore.svelte.js';
  import { themeScope } from '$lib/utils/themeScope.svelte.js';
  import { resolveTheme } from '$lib/themes/index.js';
  import { buildScopedSkinCss, toScopeId } from '$lib/themes/scopedSkinCss.js';
  import { updateEdgeStyles } from '$lib/utils/edgeStyling.js';
  import type { NodePort, Workflow, WorkflowNode } from '$lib/types/index.js';

  const fd = getDefaultInstance();
  provideInstance(fd);

  const params = $derived($page.url.searchParams);
  const themeName = $derived((params.get('theme') ?? 'graphite') as string);
  const zoom = $derived(Number(params.get('zoom') ?? '1') || 1);
  const selectedId = $derived(params.get('select'));
  const scopeId = toScopeId('cards');

  // Settings are persisted by the store, so set both on every change rather than inherit.
  $effect(() => {
    const preference = params.get('scheme') === 'dark' ? 'dark' : 'light';
    const showNodeDescriptions = params.get('descriptions') === '1';
    untrack(() => updateSettings({ theme: { preference }, editor: { showNodeDescriptions } }));
  });

  $effect(() => {
    const resolved = resolveTheme(themeName as never);
    const css = buildScopedSkinCss(scopeId, resolved.skin, resolved.config?.display);
    if (!css) return;
    const style = document.createElement('style');
    style.setAttribute('data-fd-skin', scopeId);
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  });

  // --- Cards ---------------------------------------------------------------

  const p = (
    id: string,
    name: string,
    dataType: string,
    type: 'input' | 'output',
    extra: Partial<NodePort> = {}
  ): NodePort => ({ id, name, type, dataType, ...extra });
  const trigIn = p('trigger', 'Trigger', 'trigger', 'input', {
    description: 'Run this node when the previous one completes.'
  });
  const trigOut = p('trigger', 'Trigger', 'trigger', 'output', {
    description: 'Fires when this node completes.'
  });

  interface CardSpec {
    id: string;
    title: string;
    category: string;
    icon: string;
    description: string;
    x: number;
    y: number;
    inputs: NodePort[];
    outputs: NodePort[];
    /** Node component: `default` (the card), `gateway`, `tool`, `simple`, `square`, `terminal`. */
    type?: string;
    config?: Record<string, unknown>;
    tags?: string[];
  }

  const LONG = 'long_port_name_that_goes_on_and_on_and_on_to_fill_the_pill_and_then_some_more';

  const cards: CardSpec[] = [
    {
      id: 'data_shaper.2',
      title: 'Data Shaper',
      category: 'data',
      icon: 'mdi:database-cog',
      description:
        'Reshape mixed input data into a clean structure using field mappings and optional JSON Schema validation. Unmapped fields are dropped unless “Keep unmapped” is on.',
      x: 0,
      y: 0,
      inputs: [
        p('in', 'Input Data', 'mixed', 'input', {
          required: true,
          description: 'The source data to reshape (any type: object, array, scalar).'
        }),
        trigIn
      ],
      outputs: [
        p('data', 'data', 'mixed', 'output', { description: 'The reshaped output data.' }),
        p('valid', 'valid', 'boolean', 'output', { description: 'Whether the output is valid.' }),
        p('errors', 'errors', 'array', 'output', { description: 'Validation errors.' }),
        trigOut
      ]
    },
    {
      id: 'entity_extractor.1',
      title: 'Extract Structured Entities from Unstructured Text',
      category: 'models',
      icon: 'mdi:creation',
      description: '',
      x: 400,
      y: 0,
      inputs: [
        p('text', 'Text', 'string', 'input', { required: true }),
        p('schema', 'Entity Schema', 'json', 'input'),
        trigIn
      ],
      outputs: [
        p('entities', 'entities', 'array', 'output'),
        p('confidence', 'confidence', 'number', 'output'),
        trigOut
      ]
    },
    {
      id: 'slack_notify.1',
      title:
        'Send Notification to Slack Channel When Content Moderation Review Is Required for Published Articles',
      category: 'outputs',
      icon: 'mdi:message-text',
      description:
        'Posts a message to a Slack channel through an incoming webhook whenever a content item enters the moderation queue. The message includes the article title, author, a link to the review screen and the moderation reason, formatted with Slack blocks. Retries three times with exponential backoff before failing the run.',
      x: 800,
      y: 0,
      inputs: [
        p('message', 'Message', 'string', 'input', { required: true }),
        p('channel', 'Channel Override', 'string', 'input'),
        trigIn
      ],
      outputs: [p('ts', 'message_ts', 'string', 'output'), trigOut]
    },
    {
      id: 'workflow_executor.1',
      title: 'Workflow Executor',
      category: 'bundles',
      icon: 'mdi:sitemap',
      description: '',
      x: 1200,
      y: 0,
      inputs: [
        p('input_data', 'Input Data', 'json', 'input'),
        p('tpl', 'Confirmation Message Template Override', 'string', 'input'),
        trigIn
      ],
      outputs: [
        p('success', 'success', 'boolean', 'output'),
        p('session_id', 'session_id', 'string', 'output'),
        p('outputs', 'outputs', 'json', 'output'),
        p('error_message', 'error_message', 'string', 'output'),
        p('execution_time_ms', 'execution_time_ms', 'number', 'output'),
        p('child_workflow_revision_identifier', LONG, 'string', 'output'),
        trigOut
      ]
    },
    {
      id: 'types.1',
      title: 'Port States',
      category: 'logic',
      icon: 'mdi:source-branch',
      description: 'Wired, open and required ports; branch triggers stay rows.',
      x: 0,
      y: 440,
      inputs: [
        p('wired', 'Wired', 'string', 'input', { description: 'A wired input is filled.' }),
        p('open', 'Open', 'number', 'input', { description: 'An open input is outlined.' }),
        p('need', 'Required', 'json', 'input', {
          required: true,
          description: 'A required open input gets an asterisk.'
        }),
        p('flag', 'Flag', 'boolean', 'input'),
        trigIn
      ],
      outputs: [
        p('true', 'True', 'trigger', 'output', { description: 'Branch taken when true.' }),
        p('false', 'False', 'trigger', 'output', { description: 'Branch taken when false.' }),
        p('result', 'result', 'string', 'output'),
        trigOut
      ]
    },
    {
      id: 'node_insert.1',
      title: 'Node Insert',
      category: 'triggers',
      icon: 'mdi:lightning-bolt',
      description: 'Fires when a content entity is inserted. Event data carries the entity.',
      x: 400,
      y: 440,
      inputs: [],
      outputs: [
        p('data', 'Event Data', 'json', 'output', {
          description: 'Complete trigger data: event_type, entity_type, bundle, entity.'
        }),
        trigOut
      ]
    },
    {
      id: 'chain_a.1',
      title: 'Prompt Template',
      category: 'prompts',
      icon: 'mdi:text-box-edit',
      description: 'Create prompts using templates with variable substitution.',
      x: 800,
      y: 440,
      inputs: [p('vars', 'Variables', 'mixed', 'input'), trigIn],
      outputs: [p('prompt', 'prompt', 'string', 'output'), trigOut]
    },
    {
      id: 'chain_b.1',
      title: 'Messenger',
      category: 'outputs',
      icon: 'mdi:message-text',
      description: 'Display messages to the user.',
      x: 1200,
      y: 440,
      inputs: [p('message', 'Message', 'string', 'input', { required: true }), trigIn],
      outputs: [p('displayed', 'displayed', 'boolean', 'output'), trigOut]
    },
    // --- Other node types ---------------------------------------------------
    {
      id: 'switch.1',
      title: 'Switch',
      category: 'logic',
      icon: 'mdi:call-split',
      description: 'Route to the branch whose case matches the value.',
      x: 0,
      y: 880,
      type: 'gateway',
      config: {
        branches: [
          { name: 'draft', label: 'Draft' },
          { name: 'review', label: 'In review' },
          { name: 'published', label: 'Published' },
          { name: 'archived', label: 'Archived' },
          { name: 'default', label: 'Default' }
        ]
      },
      inputs: [p('value', 'Value', 'mixed', 'input', { required: true }), trigIn],
      outputs: []
    },
    {
      id: 'if_else.1',
      title: 'If/Else',
      category: 'logic',
      icon: 'mdi:code-braces',
      description: 'Simple conditional logic with text input, match text, and operator.',
      x: 400,
      y: 880,
      type: 'gateway',
      config: { branches: [{ name: 'True' }, { name: 'False' }] },
      inputs: [p('data', 'Input Data', 'mixed', 'input'), trigIn],
      outputs: []
    },
    {
      id: 'unnamed.1',
      title: 'Unnamed Branches',
      category: 'logic',
      icon: 'mdi:call-split',
      description: 'Two branches with an empty name.',
      x: 800,
      y: 880,
      type: 'gateway',
      config: { branches: [{ name: '' }, { name: '' }] },
      inputs: [trigIn],
      outputs: []
    },
    {
      id: 'tool.1',
      title: 'Search Knowledge Base',
      category: 'tools',
      icon: 'mdi:magnify',
      description: 'Looks passages up in the site knowledge base for an agent.',
      x: 1200,
      y: 880,
      type: 'tool',
      inputs: [p('tool', 'Tool', 'tool', 'input')],
      outputs: [p('tool', 'Tool', 'tool', 'output')]
    },
    {
      id: 'simple.1',
      title: 'Simple Node',
      category: 'data',
      icon: 'mdi:square-rounded',
      description: 'A compact node: title, description and one port each side.',
      x: 0,
      y: 1200,
      type: 'simple',
      inputs: [p('in', 'in', 'string', 'input')],
      outputs: [p('out', 'out', 'string', 'output')]
    },
    {
      id: 'simple.2',
      title: 'Simple Node With a Long Title That Has to Be Clipped',
      category: 'data',
      icon: 'mdi:square-rounded',
      description: 'Two inputs and three outputs, so the box grows to 120.',
      x: 400,
      y: 1200,
      type: 'simple',
      inputs: [p('a', 'a', 'string', 'input'), p('b', 'b', 'number', 'input')],
      outputs: [
        p('x', 'x', 'string', 'output'),
        p('y', 'y', 'json', 'output'),
        p('z', 'z', 'array', 'output')
      ]
    },
    {
      id: 'square.1',
      title: 'Square Node',
      category: 'models',
      icon: 'mdi:creation',
      description: '',
      x: 800,
      y: 1200,
      type: 'square',
      inputs: [p('in', 'in', 'string', 'input')],
      outputs: [p('out', 'out', 'string', 'output')]
    },
    {
      id: 'square.2',
      title: 'Square Node, Three Ports',
      category: 'models',
      icon: 'mdi:creation',
      description: '',
      x: 1000,
      y: 1200,
      type: 'square',
      inputs: [
        p('a', 'a', 'string', 'input'),
        p('b', 'b', 'string', 'input'),
        p('c', 'c', 'json', 'input')
      ],
      outputs: [p('out', 'out', 'string', 'output')]
    },
    {
      id: 'start.1',
      title: 'Start',
      category: 'triggers',
      icon: 'mdi:play-circle',
      description: 'Where the run begins.',
      x: 1200,
      y: 1200,
      type: 'terminal',
      tags: ['start'],
      inputs: [],
      outputs: [trigOut]
    },
    {
      id: 'end.1',
      title: 'End',
      category: 'outputs',
      icon: 'mdi:stop-circle',
      description: '',
      x: 1400,
      y: 1200,
      type: 'terminal',
      tags: ['end'],
      inputs: [trigIn],
      outputs: []
    },
    {
      id: 'exit.1',
      title: 'Exit',
      category: 'outputs',
      icon: 'mdi:close-circle',
      description: '',
      x: 1600,
      y: 1200,
      type: 'terminal',
      tags: ['exit'],
      inputs: [trigIn],
      outputs: []
    }
  ];

  const toNode = (c: CardSpec): WorkflowNode =>
    ({
      id: c.id,
      type: 'universalNode',
      position: { x: c.x, y: c.y },
      data: {
        label: c.title,
        config: c.config ?? {},
        metadata: {
          node_type_id: c.id.replace(/\.\d+$/, ''),
          name: c.title,
          description: c.description,
          category: c.category,
          version: '1.0.0',
          type: c.type ?? 'default',
          tags: c.tags,
          icon: c.icon,
          inputs: c.inputs,
          outputs: c.outputs
        }
      }
    }) as unknown as WorkflowNode;

  const edge = (
    id: string,
    source: string,
    sourcePort: string,
    target: string,
    targetPort: string
  ) => ({
    id,
    source,
    target,
    sourceHandle: `${source}-output-${sourcePort}`,
    targetHandle: `${target}-input-${targetPort}`
  });

  const baseNodes = cards.map(toNode);
  const baseEdges = updateEdgeStyles(
    [
      edge('e1', 'data_shaper.2', 'data', 'entity_extractor.1', 'text'),
      edge('e2', 'data_shaper.2', 'trigger', 'entity_extractor.1', 'trigger'),
      edge('e3', 'entity_extractor.1', 'entities', 'slack_notify.1', 'message'),
      edge('e4', 'entity_extractor.1', 'trigger', 'slack_notify.1', 'trigger'),
      edge('e5', 'slack_notify.1', 'ts', 'workflow_executor.1', 'input_data'),
      edge('e6', 'node_insert.1', 'data', 'chain_a.1', 'vars'),
      edge('e7', 'node_insert.1', 'trigger', 'chain_a.1', 'trigger'),
      edge('e8', 'chain_a.1', 'prompt', 'chain_b.1', 'message'),
      edge('e9', 'chain_a.1', 'trigger', 'chain_b.1', 'trigger'),
      edge('e13', 'switch.1', 'published', 'simple.1', 'in'),
      edge('e14', 'start.1', 'trigger', 'end.1', 'trigger'),
      edge('e10', 'types.1', 'result', 'node_insert.1', 'trigger'),
      edge('e11', 'types.1', 'true', 'node_insert.1', 'trigger')
    ].filter((e) => e.id !== 'e10' && e.id !== 'e11') as never,
    baseNodes
  );

  // The instance's workflow store decides wired / open, as in the real editor.
  fd.workflow.initialize({
    id: 'cards',
    name: 'Cards',
    nodes: baseNodes,
    edges: baseEdges,
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
  } as unknown as Workflow);

  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>(baseEdges as unknown as Edge[]);
  $effect(() => {
    nodes = (baseNodes as unknown as Node[]).map((n) => ({ ...n, selected: n.id === selectedId }));
  });

  const nodeTypes = { universalNode: UniversalNode };
  const edgeTypes = { default: FlowDropEdge };
</script>

<div class="cards-page flowdrop-root" data-fd-scope={scopeId} use:themeScope>
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    {edgeTypes}
    initialViewport={{ x: 80, y: 60, zoom }}
    minZoom={0.1}
    maxZoom={2}
    snapGrid={[20, 20]}
    nodesDraggable
    proOptions={{ hideAttribution: false }}
  >
    <Background
      gap={20}
      bgColor="var(--fd-canvas-bg)"
      variant={BackgroundVariant.Dots}
      patternColor="var(--fd-grid-pattern-color)"
    />
  </SvelteFlow>
</div>

<style>
  /* Covers the app navbar: this page is only a canvas. */
  .cards-page {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: var(--fd-canvas-bg);
  }

  .cards-page :global(.svelte-flow) {
    background: var(--fd-canvas-bg);
  }
</style>
