<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Segmented from './Segmented.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Primitives/Segmented',
    component: Segmented,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { size: { control: 'select', options: ['sm', 'md'] } },
    args: { size: 'md', ariaLabel: 'View', onchange: fn() }
  });

  const plain = [
    { value: 'a', label: 'Day' },
    { value: 'b', label: 'Week' },
    { value: 'c', label: 'Month' }
  ];
  const modes = [
    { value: 'edit', label: 'Edit', icon: 'mdi:pencil', title: 'Edit the workflow' },
    { value: 'test', label: 'Test', icon: 'mdi:play', title: 'Run and inspect' }
  ];
  const sizes = ['sm', 'md'] as const;
</script>

{#snippet matrix()}
  <div style="display: grid; gap: 1rem; justify-items: start;">
    {#each sizes as size (size)}
      <Segmented {size} ariaLabel="View {size}" options={plain} value="b" />
      <Segmented {size} ariaLabel="Mode {size}" options={modes} value="edit" />
      <Segmented {size} ariaLabel="Mode {size} (test)" options={modes} value="test" />
    {/each}
  </div>
{/snippet}

<Story name="Default" asChild>
  <Segmented ariaLabel="View" options={plain} value="a" />
</Story>

<Story name="EditTestMode" asChild>
  <Segmented ariaLabel="Editor mode" options={modes} value="edit" />
</Story>

<Story name="Small" asChild>
  <Segmented size="sm" ariaLabel="Editor mode" options={modes} value="test" />
</Story>

<Story name="Matrix" parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

<Story name="MatrixDark" globals={{ theme: 'dark' }} parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>
