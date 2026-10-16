<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import LoadingSpinner from './LoadingSpinner.svelte';

  const { Story } = defineMeta({
    title: 'Components/LoadingSpinner',
    component: LoadingSpinner,
    tags: ['autodocs'],
    argTypes: {
      size: { control: { type: 'select' }, options: ['xs', 'sm', 'md', 'lg'] },
      text: { control: 'text' },
      showText: { control: 'boolean' }
    }
  });

  const sizes = ['xs', 'sm', 'md', 'lg'] as const;
</script>

<Story
  name="In the editor"
  args={{ size: 'md', text: 'Loading from server...' }}
  parameters={{
    docs: {
      description: { story: 'The node sidebar shows it while the node list loads.' }
    }
  }}
/>

<Story name="Without text" args={{ showText: false }} />

<Story name="All variants" asChild>
  <div style="display: flex; gap: 2rem; align-items: flex-end;">
    {#each sizes as size (size)}
      <div style="display: grid; gap: 0.5rem; justify-items: center;">
        <LoadingSpinner {size} showText={false} />
        <code style="font-size: var(--fd-text-xs);">{size}</code>
      </div>
    {/each}
  </div>
</Story>
