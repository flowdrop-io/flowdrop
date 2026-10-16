<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CanvasBanner from './CanvasBanner.svelte';
  import CanvasDecorator from '../stories/CanvasDecorator.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Empty canvas banner',
    component: CanvasBanner,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'A new workflow with no nodes. The banner disappears with the first node you drop.'
      }
    }
  }}
>
  <CanvasDecorator>
    <CanvasBanner
      title="Drag components here to start building"
      description="Use the sidebar to add components to your workflow"
    >
      {#snippet icon()}
        <!-- The same graph icon WorkflowEditor draws. -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      {/snippet}
    </CanvasBanner>
  </CanvasDecorator>
</Story>

<Story
  name="Without an icon"
  asChild
  parameters={{
    docs: { description: { story: 'A host that has no icon for its message can leave it out.' } }
  }}
>
  <CanvasDecorator>
    <CanvasBanner title="No workflows yet" description="Create your first workflow to begin" />
  </CanvasDecorator>
</Story>
