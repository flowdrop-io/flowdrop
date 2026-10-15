<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createSampleNodeData } from '../../stories/utils.js';
  import type { NodePort } from '../../types/index.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import ToolNode from './ToolNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Tool node',
    component: ToolNode,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const input = (id: string, name: string, dataType: string): NodePort => ({
    id,
    name,
    type: 'input',
    dataType
  });
  const output = (id: string, name: string, dataType: string): NodePort => ({
    id,
    name,
    type: 'output',
    dataType
  });

  const classifier = () =>
    createSampleNodeData({
      label: 'Content classifier',
      metadata: {
        node_type_id: 'content_classifier',
        name: 'Content classifier',
        description: 'Sorts content into support, features or sales so it can be triaged.',
        category: 'ai',
        type: 'tool',
        supportedTypes: ['tool', 'default'],
        icon: 'mdi:tag-multiple',
        badge: 'TOOL',
        inputs: [
          input('trigger', 'Trigger', 'trigger'),
          input('structured_data', 'Structured data', 'json'),
          input('submission_id', 'Submission ID', 'string')
        ],
        outputs: [
          output('tool', 'Tool', 'tool'),
          output('primary_category', 'Primary category', 'string'),
          output('confidence', 'Confidence', 'number')
        ]
      }
    });
</script>

<Story
  asChild
  name="A tool"
  parameters={{
    docs: {
      description: {
        story:
          'A node an agent can call. Its tool port is one row; wire it to the agent that may use it.'
      }
    }
  }}
>
  <NodeDecorator data={classifier()} />
</Story>

<Story asChild name="Selected">
  <NodeDecorator data={classifier()} selected />
</Story>

<Story
  asChild
  name="Only a tool port"
  parameters={{
    docs: {
      description: {
        story: 'The smallest tool: no inputs, only the tool port.'
      }
    }
  }}
>
  <NodeDecorator
    data={createSampleNodeData({
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
        outputs: [output('tool', 'Tool', 'tool')]
      }
    })}
  />
</Story>
