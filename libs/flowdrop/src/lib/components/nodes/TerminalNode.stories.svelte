<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createTerminalNodeData } from '../../stories/utils.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import TerminalNode from './TerminalNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Terminal node',
    component: TerminalNode,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });
</script>

<Story
  asChild
  name="Start"
  parameters={{
    docs: { description: { story: 'Where a workflow begins. It has an output and no input.' } }
  }}
>
  <NodeDecorator data={createTerminalNodeData('start')} />
</Story>

<Story
  asChild
  name="End"
  parameters={{
    docs: { description: { story: 'Where a workflow finishes. It has an input and no output.' } }
  }}
>
  <NodeDecorator data={createTerminalNodeData('end')} />
</Story>

<Story
  asChild
  name="Exit"
  parameters={{
    docs: {
      description: {
        story: 'An early stop, for example on an error. It has an input and no output.'
      }
    }
  }}
>
  <NodeDecorator data={createTerminalNodeData('exit')} />
</Story>

<Story
  asChild
  name="Selected"
  parameters={{ docs: { description: { story: 'A start node you clicked.' } } }}
>
  <NodeDecorator data={createTerminalNodeData('start')} selected />
</Story>

<Story
  asChild
  name="Running in Test mode"
  parameters={{
    docs: {
      description: {
        story: 'The status frame follows the circle, not the box around it.'
      }
    }
  }}
>
  <NodeDecorator
    data={createTerminalNodeData('start')}
    testMode
    statuses={{ 'story-node': 'running' }}
  />
</Story>
