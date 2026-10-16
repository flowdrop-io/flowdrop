<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createSampleNodeData } from '../../stories/utils.js';
  import type { NodePort } from '../../types/index.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import SquareNode from './SquareNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Square node',
    component: SquareNode,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const textOutput = () =>
    createSampleNodeData({
      label: 'Text output',
      metadata: {
        node_type_id: 'text_output',
        name: 'Text output',
        description: 'Shows a text to the user.',
        category: 'outputs',
        type: 'square',
        icon: 'mdi:text-box',
        inputs: [{ id: 'text', name: 'Text', type: 'input', dataType: 'string' } as NodePort],
        outputs: []
      }
    });
</script>

<Story
  asChild
  name="A square node"
  parameters={{
    docs: {
      description: {
        story:
          'A node that shows only its icon. The editor draws it for a node type that declares `type: "square"`.'
      }
    }
  }}
>
  <NodeDecorator data={textOutput()} />
</Story>

<Story asChild name="Selected">
  <NodeDecorator data={textOutput()} selected />
</Story>

<Story
  asChild
  name="Dynamic ports"
  parameters={{
    docs: {
      description: {
        story: 'Ports the user added in the node config. They sit on the square the same way.'
      }
    }
  }}
>
  <NodeDecorator
    data={createSampleNodeData({
      label: 'Data mapper',
      config: {
        dynamicInputs: [{ name: 'source', label: 'Source data', dataType: 'json', required: true }],
        dynamicOutputs: [
          { name: 'mapped', label: 'Mapped output', dataType: 'json' },
          { name: 'errors', label: 'Errors', dataType: 'string' }
        ]
      },
      metadata: {
        node_type_id: 'data_mapper',
        name: 'Data mapper',
        description: 'Maps data between formats.',
        category: 'processing',
        type: 'square',
        icon: 'mdi:swap-horizontal',
        inputs: [],
        outputs: []
      }
    })}
  />
</Story>
