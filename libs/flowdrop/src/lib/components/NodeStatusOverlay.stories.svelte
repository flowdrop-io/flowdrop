<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../stories/NodeDecorator.svelte';
  import { typicalNodeData } from '../stories/nodeFixtures.js';
  import { ZOOM_LEVELS, type StoryNode, type StoryStatuses } from '../stories/utils.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import NodeStatusOverlay from './NodeStatusOverlay.svelte';

  // Every story draws real nodes through UniversalNode, so the pill, the border and the
  // halo are what the editor draws, and a regression that paints over the ports shows here.
  const { Story } = defineMeta({
    title: 'Editor/Nodes/Run status on nodes',
    component: NodeStatusOverlay,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const labels = {
    running: 'Running',
    completed: 'Completed',
    waiting: 'Waiting for you',
    failed: 'Failed',
    skipped: 'Skipped',
    loop: 'Ran three times'
  } as const;

  /** One node per status, three to a row. */
  const grid: StoryNode[] = Object.entries(labels).map(([id, label], i) => ({
    id,
    data: typicalNodeData(label),
    x: (i % 3) * 360,
    y: Math.floor(i / 3) * 260
  }));

  const statuses: StoryStatuses = {
    running: 'running',
    completed: 'completed',
    waiting: 'interrupted',
    failed: { status: 'failed', lastError: 'Connection timeout' },
    skipped: 'skipped',
    loop: { status: 'completed', executionCount: 3 }
  };

  const one = (id: keyof typeof labels): StoryNode[] => [
    { id: 'story-node', data: typicalNodeData(labels[id]) }
  ];
  const oneStatus = (id: keyof typeof statuses): StoryStatuses => ({
    'story-node': statuses[id]
  });
</script>

<Story
  asChild
  name="In Test mode"
  parameters={{
    docs: {
      description: {
        story:
          'Test mode with a run on screen. Each node has a pill on its top edge, and its border takes the status colour. A node that waits for you also gets a soft ring. The ports stay on top of the border.'
      }
    }
  }}
>
  <NodeDecorator
    nodes={grid}
    {statuses}
    testMode
    width={1180}
    height={600}
    zoom={ZOOM_LEVELS.full}
  />
</Story>

<Story
  asChild
  name="In Edit mode"
  parameters={{
    docs: {
      description: {
        story:
          'While a run goes and you are still editing, the pill shows but the border stays as it is.'
      }
    }
  }}
>
  <NodeDecorator
    nodes={grid}
    {statuses}
    testMode={false}
    width={1180}
    height={600}
    zoom={ZOOM_LEVELS.full}
  />
</Story>

<Story
  asChild
  name="Waiting for you"
  parameters={{
    docs: {
      description: {
        story:
          'A node that stopped to ask you something. The amber ring around it must stay behind the ports on its edges.'
      }
    }
  }}
>
  <NodeDecorator nodes={one('waiting')} statuses={oneStatus('waiting')} testMode />
</Story>

<Story
  asChild
  name="Failed"
  parameters={{
    docs: {
      description: {
        story: 'A node that failed. Hover the pill to read the first line of the error.'
      }
    }
  }}
>
  <NodeDecorator nodes={one('failed')} statuses={oneStatus('failed')} testMode />
</Story>

<Story
  asChild
  name="Ran more than once"
  parameters={{
    docs: {
      description: {
        story:
          'A node inside a loop runs once per round. The pill shows how many times, here three.'
      }
    }
  }}
>
  <NodeDecorator nodes={one('loop')} statuses={oneStatus('loop')} testMode />
</Story>

<Story
  asChild
  name="Not in the run"
  parameters={{
    docs: {
      description: {
        story:
          'A node the run never reached has no pill. In Test mode, with a run on screen, it is dimmed, and it comes back on hover or when selected. A queued node has no pill yet either.'
      }
    }
  }}
>
  <NodeDecorator
    nodes={[
      { id: 'done', data: typicalNodeData('Ran'), x: 0, y: 0 },
      { id: 'queued', data: typicalNodeData('Queued'), x: 360, y: 0 },
      { id: 'never', data: typicalNodeData('Never reached'), x: 720, y: 0 }
    ]}
    statuses={{ done: 'completed', queued: 'pending' }}
    testMode
    width={1180}
    height={360}
    zoom={ZOOM_LEVELS.full}
  />
</Story>

<Story
  asChild
  name="Zoomed out a little"
  parameters={{
    docs: {
      description: {
        story:
          'Below 75% the cards drop their description and the pill grows, so it still reads. The pill and the border are the same.'
      }
    }
  }}
>
  <NodeDecorator
    nodes={grid}
    {statuses}
    testMode
    width={900}
    height={460}
    zoom={ZOOM_LEVELS.outline}
  />
</Story>

<Story
  asChild
  name="Zoomed out far"
  parameters={{
    docs: {
      description: {
        story:
          'Below 45% each card is an icon block. The pill is larger so the status can still be read.'
      }
    }
  }}
>
  <NodeDecorator
    nodes={grid}
    {statuses}
    testMode
    width={700}
    height={360}
    zoom={ZOOM_LEVELS.glyph}
  />
</Story>

<Story
  asChild
  name="Zoomed out to the map"
  parameters={{
    docs: {
      description: {
        story:
          'Below 25% the pill gives way to an outline in the status colour, with a count badge for a node that ran more than once.'
      }
    }
  }}
>
  <NodeDecorator nodes={grid} {statuses} testMode width={700} height={360} zoom={ZOOM_LEVELS.map} />
</Story>
