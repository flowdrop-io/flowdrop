<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createSampleNodeData } from '../../stories/utils.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import IdeaNode from './IdeaNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Idea',
    component: IdeaNode,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const idea = (label: string, content?: string) =>
    createSampleNodeData({
      label,
      config: content ? { content } : {},
      metadata: {
        node_type_id: 'idea',
        name: 'Idea',
        description: 'A planning step that is not tied to a node type yet.',
        category: 'helpers',
        type: 'idea',
        inputs: [],
        outputs: []
      }
    });
</script>

<Story
  asChild
  name="An idea"
  parameters={{
    docs: {
      description: {
        story:
          'A planning card. It is drawn for a node type that declares `type: "idea"`; nothing in the library creates one on its own.'
      }
    }
  }}
>
  <NodeDecorator data={idea('Idea')} />
</Story>

<Story asChild name="With content">
  <NodeDecorator
    data={idea(
      'Feature idea',
      'Add batch processing support to handle multiple items in parallel.'
    )}
  />
</Story>

<Story asChild name="Selected">
  <NodeDecorator data={idea('Idea')} selected />
</Story>
