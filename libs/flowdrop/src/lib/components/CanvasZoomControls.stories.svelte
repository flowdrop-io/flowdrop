<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import CanvasZoomControls from './CanvasZoomControls.svelte';
  import FlowFrame from '../stories/FlowFrame.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import { chatWorkflow } from '../stories/fixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Zoom controls',
    render: template,
    component: CanvasZoomControls,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    args: {
      nodeCount: chatWorkflow.nodes.length,
      edgeCount: chatWorkflow.edges.length,
      onfit: fn(),
      ontidy: fn()
    }
  });
</script>

{#snippet template(args: Record<string, unknown>)}
  <InstanceDecorator workflow={chatWorkflow}>
    <FlowFrame>
      <CanvasZoomControls
        nodeCount={args.nodeCount as number}
        edgeCount={args.edgeCount as number}
        hasCycles={args.hasCycles as boolean | undefined}
        onfit={args.onfit as (() => void) | undefined}
        ontidy={args.ontidy as (() => void) | undefined}
      />
    </FlowFrame>
  </InstanceDecorator>
{/snippet}

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story:
          'The bottom-left corner of an editable canvas: zoom in and out, fit, lock, Tidy up, and how much is on the canvas. Hover the count for the number of connections.'
      }
    }
  }}
/>

<Story
  name="Loop in the graph"
  args={{ hasCycles: true }}
  parameters={{
    docs: {
      description: {
        story: 'When the graph loops back on itself, a cycle warning appears next to the count.'
      }
    }
  }}
/>

<Story
  name="Read-only canvas"
  args={{ ontidy: undefined }}
  parameters={{
    docs: {
      description: {
        story:
          'A canvas that cannot be changed has no Tidy up button; the rest of the controls stay.'
      }
    }
  }}
/>

<Story
  name="Empty canvas"
  args={{ nodeCount: 0, edgeCount: 0 }}
  parameters={{
    docs: { description: { story: 'A new workflow, before the first node is dropped.' } }
  }}
/>
