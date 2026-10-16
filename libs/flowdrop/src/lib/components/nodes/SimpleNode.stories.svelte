<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createSampleNodeData } from '../../stories/utils.js';
  import type { NodePort } from '../../types/index.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import SimpleNode from './SimpleNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Simple node',
    component: SimpleNode,
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

  const textInput = () =>
    createSampleNodeData({
      label: 'Text input',
      metadata: {
        node_type_id: 'text_input',
        name: 'Text input',
        description: 'A text the user types in.',
        category: 'inputs',
        type: 'simple',
        icon: 'mdi:text',
        inputs: [],
        outputs: [output('text', 'Text', 'string')]
      }
    });
</script>

<Story
  asChild
  name="A simple node"
  parameters={{
    docs: {
      description: {
        story:
          'The compact card. The editor draws it for a node type that declares `type: "simple"`; other types get the default card.'
      }
    }
  }}
>
  <NodeDecorator data={textInput()} />
</Story>

<Story asChild name="Selected">
  <NodeDecorator data={textInput()} selected />
</Story>

<Story
  asChild
  name="Inputs and outputs"
  parameters={{
    docs: { description: { story: 'Inputs sit on the left edge and outputs on the right.' } }
  }}
>
  <NodeDecorator
    data={createSampleNodeData({
      label: 'Notification template',
      metadata: {
        node_type_id: 'notification_template',
        name: 'Notification template',
        description: 'Builds a notification from an event.',
        category: 'outputs',
        type: 'simple',
        icon: 'mdi:bell-ring',
        inputs: [input('event', 'Event data', 'json'), input('trigger', 'Trigger', 'trigger')],
        outputs: [output('notification', 'Notification', 'json')]
      }
    })}
  />
</Story>

<Story
  asChild
  name="Dynamic ports"
  parameters={{
    docs: {
      description: {
        story: 'Ports the user added in the node config. They draw like the declared ports.'
      }
    }
  }}
>
  <NodeDecorator
    data={createSampleNodeData({
      label: 'Custom function',
      config: {
        dynamicInputs: [
          { name: 'param_a', label: 'Parameter A', dataType: 'string', required: true },
          { name: 'param_b', label: 'Parameter B', dataType: 'number' }
        ],
        dynamicOutputs: [{ name: 'result', label: 'Result', dataType: 'json' }]
      },
      metadata: {
        node_type_id: 'custom_function',
        name: 'Custom function',
        description: 'Runs a function with inputs the user defines.',
        category: 'processing',
        type: 'simple',
        icon: 'mdi:function-variant',
        inputs: [input('trigger', 'Trigger', 'trigger')],
        outputs: [output('done', 'Done', 'trigger')]
      }
    })}
  />
</Story>
