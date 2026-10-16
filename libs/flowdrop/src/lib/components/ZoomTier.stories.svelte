<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../stories/NodeDecorator.svelte';
  import { typicalNodeData } from '../stories/nodeFixtures.js';
  import {
    createSampleNodeData,
    createTerminalNodeData,
    ZOOM_LEVELS,
    type StoryNode
  } from '../stories/utils.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import ZoomTier from './ZoomTier.svelte';

  // Each story opens a real canvas at a zoom level. The zoom tier (set by ZoomTier, as in the
  // editor) switches the drawing of the nodes, wires and status marks.
  const { Story } = defineMeta({
    title: 'Editor/Nodes/Zoom levels',
    component: ZoomTier,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const gateway = createSampleNodeData({
    label: 'Is it urgent?',
    config: {
      branches: [
        { name: 'true', label: 'True' },
        { name: 'false', label: 'False' }
      ]
    },
    metadata: {
      node_type_id: 'if_else',
      name: 'If / else',
      description: 'Sends the run down one of two branches.',
      category: 'logic',
      type: 'gateway',
      icon: 'mdi:source-branch',
      inputs: [{ id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger' }],
      outputs: []
    }
  });

  const tool = createSampleNodeData({
    label: 'Search the web',
    metadata: {
      node_type_id: 'web_search',
      name: 'Search the web',
      description: 'Lets an agent search the web.',
      category: 'tools',
      type: 'tool',
      icon: 'mdi:magnify',
      badge: 'TOOL',
      inputs: [],
      outputs: [{ id: 'tool', name: 'Tool', type: 'output', dataType: 'tool' }]
    }
  });

  const note = createSampleNodeData({
    label: 'Notes',
    config: { content: '## Remember\n\nThe gateway reads the subject line.', noteType: 'info' },
    metadata: {
      node_type_id: 'notes',
      name: 'Notes',
      description: 'Documentation on the canvas.',
      category: 'helpers',
      type: 'note',
      inputs: [],
      outputs: []
    }
  });

  const caption = createSampleNodeData({
    label: 'Triage',
    metadata: {
      node_type_id: 'caption',
      name: 'Caption',
      description: 'A label.',
      category: 'tools',
      type: 'caption',
      inputs: [],
      outputs: []
    }
  });

  /** One of each kind of card. */
  const nodes: StoryNode[] = [
    { id: 'typical', data: typicalNodeData(), x: 0, y: 0 },
    { id: 'gateway', data: gateway, x: 360, y: 0 },
    { id: 'tool', data: tool, x: 720, y: 0 },
    { id: 'start', data: createTerminalNodeData('start'), x: 0, y: 300 },
    { id: 'note', data: note, x: 200, y: 300 },
    { id: 'caption', data: caption, x: 560, y: 340 }
  ];
</script>

<Story
  asChild
  name="Full (75% and up)"
  parameters={{
    docs: {
      description: {
        story: 'The whole card: header, description and every port with its name.'
      }
    }
  }}
>
  <NodeDecorator {nodes} width={1100} height={620} zoom={ZOOM_LEVELS.full} />
</Story>

<Story
  asChild
  name="Outline (45% to 75%)"
  parameters={{
    docs: {
      description: {
        story:
          'The description goes and the ports shrink to small pills. The title stays, larger, so it can still be read.'
      }
    }
  }}
>
  <NodeDecorator {nodes} width={900} height={440} zoom={ZOOM_LEVELS.outline} />
</Story>

<Story
  asChild
  name="Glyph (25% to 45%)"
  parameters={{
    docs: {
      description: {
        story:
          'The card becomes its icon tile in a block, with the title under it. Wires get thicker.'
      }
    }
  }}
>
  <NodeDecorator {nodes} width={700} height={360} zoom={ZOOM_LEVELS.glyph} />
</Story>

<Story
  asChild
  name="Map (below 25%)"
  parameters={{
    docs: {
      description: {
        story:
          'Each card is one flat block, to show the shape of the whole graph. Wires are thick and one neutral colour.'
      }
    }
  }}
>
  <NodeDecorator {nodes} width={700} height={360} zoom={ZOOM_LEVELS.map} />
</Story>
