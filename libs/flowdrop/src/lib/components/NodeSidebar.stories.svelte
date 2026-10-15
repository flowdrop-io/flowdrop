<script module lang="ts">
  // The palette sits in the editor's left column: full height, about 300px wide.
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeSidebar from './NodeSidebar.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import { nodeTypes } from '../stories/fixtures.js';
  import { resolveTheme } from '../themes/index.js';

  // The editor reads these two from the theme it is running (Graphite by default).
  const themeConfig = resolveTheme('graphite').config;

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Node palette',
    render: template,
    component: NodeSidebar,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    args: {
      nodes: nodeTypes,
      loading: false,
      activeFormat: 'flowdrop',
      categoriesDefaultOpen: themeConfig?.sidebar?.categoriesDefaultOpen ?? false,
      listStyle: themeConfig?.display?.sidebarList
    }
  });
</script>

{#snippet template(args: Record<string, unknown>)}
  <InstanceDecorator width="300px">
    <div class="palette-column">
      <NodeSidebar {...args} nodes={args.nodes as typeof nodeTypes} />
    </div>
  </InstanceDecorator>
{/snippet}

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story:
          'The palette in the left column of Edit mode. Open a category to see its nodes, drag one onto the canvas, or type in the search field.'
      }
    }
  }}
/>

<Story
  name="Categories open"
  args={{ categoriesDefaultOpen: true }}
  parameters={{
    docs: {
      description: {
        story:
          'Some skins open every category at the start so all nodes can be seen at once (the Minimal skin does).'
      }
    }
  }}
/>

<Story
  name="Cards"
  args={{ listStyle: 'cards', categoriesDefaultOpen: true }}
  parameters={{
    docs: {
      description: {
        story: 'The card list style of the Classic theme: each node is a bordered card.'
      }
    }
  }}
/>

<Story
  name="Loading"
  args={{ nodes: [], loading: true }}
  parameters={{
    docs: {
      description: {
        story: 'The editor just opened and is still fetching node types from the backend.'
      }
    }
  }}
/>

<Story
  name="No node types"
  args={{ nodes: [], loading: false }}
  parameters={{
    docs: {
      description: {
        story:
          'The fetch finished and the backend offered nothing. The red banner above the canvas (see Status bar) says why when the fetch failed.'
      }
    }
  }}
/>

<style>
  .palette-column {
    height: 560px;
    border: 1px solid var(--fd-border);
    background-color: var(--fd-background);
    display: flex;
    flex-direction: column;
  }
</style>
