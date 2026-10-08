<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Tabs from './Tabs.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Primitives/Tabs',
    component: Tabs,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { size: { control: 'select', options: ['sm', 'md'] } },
    args: { size: 'md', ariaLabel: 'Views', onchange: fn() }
  });

  const plain = [
    { value: 'form', label: 'Form' },
    { value: 'json', label: 'JSON' },
    { value: 'steps', label: 'Steps' }
  ];
  const rich = [
    { value: 'inputs', label: 'Inputs', icon: 'mdi:import', count: 3 },
    { value: 'outputs', label: 'Outputs', icon: 'mdi:export', count: 0 },
    { value: 'logs', label: 'Logs', icon: 'mdi:text-long' }
  ];
  const sizes = ['sm', 'md'] as const;
</script>

{#snippet matrix()}
  <div style="display:grid; gap:1rem; justify-items:start;">
    {#each sizes as size (size)}
      <Tabs {size} ariaLabel="Plain {size}" tabs={plain} value="json" />
      <Tabs {size} ariaLabel="Rich {size}" tabs={rich} value="inputs" />
      <Tabs {size} ariaLabel="Rich {size} (last)" tabs={rich} value="logs" />
    {/each}
  </div>
{/snippet}

<Story name="Default" asChild>
  <Tabs ariaLabel="Views" tabs={plain} value="form" />
</Story>

<Story name="WithIconsAndCounts" asChild>
  <Tabs ariaLabel="Sections" tabs={rich} value="inputs" />
</Story>

<Story name="Small" asChild>
  <Tabs size="sm" ariaLabel="Views" tabs={plain} value="form" />
</Story>

<Story name="Matrix" parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

<Story name="MatrixDark" globals={{ theme: 'dark' }} parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>
