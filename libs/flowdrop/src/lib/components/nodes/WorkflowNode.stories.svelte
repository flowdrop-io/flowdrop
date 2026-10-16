<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { typicalNodeData } from '../../stories/nodeFixtures.js';
  import { createSampleNodeData } from '../../stories/utils.js';
  import type { NodePort } from '../../types/index.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import WorkflowNode from './WorkflowNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Workflow node',
    component: WorkflowNode,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const input = (id: string, name: string, dataType: string, extra: Partial<NodePort> = {}) =>
    ({ id, name, type: 'input', dataType, ...extra }) as NodePort;
  const output = (id: string, name: string, dataType: string) =>
    ({ id, name, type: 'output', dataType }) as NodePort;
</script>

<Story
  asChild
  name="A typical node"
  parameters={{
    docs: {
      description: {
        story:
          'The card the editor draws most. Data ports are rows. The trigger ports are pins in the header; they show when you hover the card.'
      }
    }
  }}
>
  <NodeDecorator data={typicalNodeData()} />
</Story>

<Story
  asChild
  name="Selected"
  parameters={{
    docs: { description: { story: 'A node you clicked. The border and the config gear show.' } }
  }}
>
  <NodeDecorator data={typicalNodeData()} selected />
</Story>

<Story
  asChild
  name="Dynamic ports"
  parameters={{
    docs: {
      description: {
        story:
          'Ports a user adds to one node in its config (`dynamicInputs`, `dynamicOutputs`). They draw like any other port.'
      }
    }
  }}
>
  <NodeDecorator
    data={createSampleNodeData({
      label: 'Custom function',
      config: {
        dynamicInputs: [
          { name: 'input_1', label: 'First input', dataType: 'string', required: true },
          { name: 'input_2', label: 'Second input', dataType: 'number' }
        ],
        dynamicOutputs: [{ name: 'output_1', label: 'Result', dataType: 'string' }]
      },
      metadata: {
        node_type_id: 'custom_function',
        name: 'Custom function',
        description: 'Runs a function with inputs and outputs the user defines.',
        category: 'processing',
        icon: 'mdi:function-variant',
        inputs: [input('trigger', 'Trigger', 'trigger')],
        outputs: [output('done', 'Done', 'trigger')]
      }
    })}
  />
</Story>

<Story
  asChild
  name="Hidden ports"
  parameters={{
    docs: {
      description: {
        story:
          'A port the user switched off in the Ports tab is not drawn and cannot be wired. Here `Style` is hidden.'
      }
    }
  }}
>
  <NodeDecorator
    data={{
      ...typicalNodeData(),
      config: { ports: { inputs: [{ id: 'style', exposed: false }] } }
    }}
  />
</Story>

<Story
  asChild
  name="Every port shape"
  parameters={{
    docs: {
      description: {
        story:
          'One port for each shape a port can have, to check that they stay apart on a crowded node.'
      }
    }
  }}
>
  <NodeDecorator
    height={720}
    data={createSampleNodeData({
      label: 'Everything node',
      metadata: {
        node_type_id: 'everything',
        name: 'Everything node',
        description: 'One port per shape.',
        category: 'processing',
        icon: 'mdi:shape-outline',
        inputs: [
          input('prompt', 'Prompt', 'string', { required: true }),
          input('temperature', 'Temperature', 'number'),
          input('stream', 'Stream', 'boolean'),
          input('tags', 'Tags', 'string[]'),
          input('history', 'Chat history', 'messages'),
          input('options', 'Options', 'json'),
          input('payload', 'Payload', 'mixed'),
          input('order', 'Order', 'order'),
          input('attachment', 'Attachment', 'image'),
          input('trigger', 'Trigger', 'trigger'),
          input('tools', 'Tools', 'tool')
        ],
        outputs: [
          output('text', 'Text', 'string'),
          output('count', 'Count', 'number'),
          output('matched', 'Matched', 'boolean'),
          output('items', 'Items', 'json[]'),
          output('result', 'Result', 'json'),
          output('done', 'Done', 'trigger'),
          output('error', 'Error', 'json')
        ]
      }
    })}
  />
</Story>
