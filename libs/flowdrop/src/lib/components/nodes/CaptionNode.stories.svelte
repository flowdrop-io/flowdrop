<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createSampleNodeData } from '../../stories/utils.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import CaptionNode from './CaptionNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Caption',
    component: CaptionNode,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  /** Node data for a caption with the given text. */
  const caption = (label: string) =>
    createSampleNodeData({
      label,
      metadata: {
        node_type_id: 'caption',
        name: 'Caption',
        description: 'Short high-contrast text that names or marks nearby nodes',
        category: 'tools',
        type: 'caption',
        inputs: [],
        outputs: []
      }
    });
</script>

<Story
  asChild
  name="A section label"
  parameters={{
    docs: {
      description: {
        story:
          'A short line of text that names a group of nodes. It has no ports and does not run. Double-click it to edit.'
      }
    }
  }}
>
  <NodeDecorator data={caption('Inputs')} />
</Story>

<Story
  asChild
  name="Selected"
  parameters={{ docs: { description: { story: 'A caption you clicked.' } } }}
>
  <NodeDecorator data={caption('Inputs')} selected />
</Story>

<Story
  asChild
  name="Two lines"
  parameters={{ docs: { description: { story: 'Longer text wraps to a second line.' } } }}
>
  <NodeDecorator
    data={caption(
      'Everything to the right of this caption runs once per customer record, in the order they arrive'
    )}
  />
</Story>

<Story
  asChild
  name="Too long"
  parameters={{
    docs: {
      description: {
        story:
          'More than two lines are cut with an ellipsis. The full text is the tooltip, and the node does not grow taller.'
      }
    }
  }}
>
  <NodeDecorator
    data={caption(
      'This caption is far too long for two lines of a five hundred pixel wide label so the clamp has to cut it off with an ellipsis and keep the full text in the tooltip instead of growing taller'
    )}
  />
</Story>
