<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';

  const { Story } = defineMeta({
    title: 'Patterns/Nodes/CaptionNode',
    tags: ['autodocs'],
    parameters: {
      layout: 'centered'
    }
  });

  /** Node data for a caption with the given text. */
  function caption(label: string) {
    return {
      label,
      config: {},
      metadata: {
        node_type_id: 'caption',
        name: 'Caption',
        description: 'Short high-contrast text that names or marks nearby nodes',
        category: 'tools',
        version: '1.0.0',
        type: 'caption',
        supportedTypes: ['caption'],
        inputs: [],
        outputs: []
      }
    };
  }
</script>

<Story name="Tiny">
  <NodeDecorator data={caption('A')} />
</Story>

<Story name="Section">
  <NodeDecorator data={caption('Inputs')} />
</Story>

<Story name="Reminder">
  <NodeDecorator data={caption('TODO: retry on 429')} />
</Story>

<Story name="Two lines">
  <NodeDecorator
    data={caption(
      'Everything to the right of this caption runs once per customer record, in the order they arrive'
    )}
  />
</Story>

<Story name="Too long (clamped)">
  <NodeDecorator
    data={caption(
      'This caption is far too long for two lines of a five hundred pixel wide label so the clamp has to cut it off with an ellipsis and keep the full text in the tooltip instead of growing taller'
    )}
  />
</Story>

<Story name="Dark theme">
  <div data-theme="dark" style="background: #1a1a1e; padding: 8px;">
    <NodeDecorator data={caption('Inputs')} />
  </div>
</Story>
