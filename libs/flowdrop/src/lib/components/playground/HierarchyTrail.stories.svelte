<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import HierarchyTrail from './HierarchyTrail.svelte';
  import { hierarchy } from '../../stories/playgroundFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Message path',
    component: HierarchyTrail,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });
</script>

<Story
  name="In the editor"
  args={{ items: hierarchy }}
  parameters={{
    docs: {
      description: {
        story:
          'Under a message from a sub-workflow: the workflow it belongs to, then the step that ran. Screen readers read the whole path once.'
      }
    }
  }}
/>

<Story
  name="Inside a loop"
  args={{
    items: [
      { id: 'main', label: 'Support chat', icon: 'mdi:graph' },
      { id: 'each', label: 'For each order', icon: 'mdi:repeat' },
      { id: 'iter', label: 'Item 2 of 5' }
    ]
  }}
  parameters={{
    docs: { description: { story: 'A message from the second pass of a loop.' } }
  }}
/>
