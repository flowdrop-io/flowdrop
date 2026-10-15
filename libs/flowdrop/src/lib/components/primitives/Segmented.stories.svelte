<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Segmented from './Segmented.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Segmented',
    component: Segmented,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { size: { control: 'select', options: ['sm', 'md'] }, float: { control: 'boolean' } },
    args: { size: 'md', ariaLabel: 'Editor mode', onchange: fn() }
  });

  const plain = [
    { value: 'a', label: 'Day' },
    { value: 'b', label: 'Week' },
    { value: 'c', label: 'Month' }
  ];
  const modes = [
    { value: 'edit', label: 'Edit', icon: 'mdi:pencil', title: 'Edit the workflow (T)' },
    { value: 'test', label: 'Test', icon: 'mdi:flask-outline', title: 'Test the workflow (T)' }
  ];
  const sizes = ['sm', 'md'] as const;
</script>

<Story
  name="In the editor"
  args={{ float: true, options: modes, value: 'edit' }}
  parameters={{
    docs: {
      description: {
        story:
          'The Edit | Test switch as the canvas toolbar draws it: medium size and `float`, so it is a floating control of its own. Use the arrow keys to change it.'
      }
    }
  }}
/>

<Story
  name="In a form"
  args={{ ariaLabel: 'Range', options: plain, value: 'b' }}
  parameters={{
    docs: {
      description: {
        story: 'Without `float` it sits inside a panel or form, as the settings rows do.'
      }
    }
  }}
/>

<Story name="Small" args={{ size: 'sm', options: modes, value: 'test' }} />

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div
    style="display: grid; grid-template-columns: auto auto; gap: 0.75rem 1rem; align-items: center; justify-items: start;"
  >
    {#each sizes as size (size)}
      <code style="font-size: var(--fd-text-xs);">{size}</code>
      <Segmented {size} ariaLabel="View {size}" options={plain} value="b" />
      <code style="font-size: var(--fd-text-xs);">{size} with icons</code>
      <Segmented {size} ariaLabel="Mode {size}" options={modes} value="edit" />
      <code style="font-size: var(--fd-text-xs);">{size} float</code>
      <Segmented {size} float ariaLabel="Mode {size} (float)" options={modes} value="test" />
    {/each}
  </div>
</Story>
