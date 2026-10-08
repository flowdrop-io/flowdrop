<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Icon from '@iconify/svelte';
  import Toolbar from './Toolbar.svelte';
  import ToolbarSeparator from './ToolbarSeparator.svelte';
  import Segmented from './Segmented.svelte';
  import IconButton from './IconButton.svelte';
  import Chip from './Chip.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/Toolbar',
    component: Toolbar,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { orientation: { control: 'select', options: ['horizontal', 'vertical'] } },
    args: { ariaLabel: 'Canvas controls', orientation: 'horizontal' }
  });

  const modes = [
    { value: 'edit', label: 'Edit', icon: 'mdi:pencil' },
    { value: 'test', label: 'Test', icon: 'mdi:play' }
  ];
</script>

{#snippet composed(orientation: 'horizontal' | 'vertical')}
  <Toolbar ariaLabel="Canvas controls" {orientation}>
    <Segmented ariaLabel="Editor mode" options={modes} value="edit" />
    <ToolbarSeparator {orientation} />
    <Chip tone="success">Run 3 done</Chip>
    <IconButton ariaLabel="Zoom to fit"><Icon icon="mdi:fit-to-screen-outline" /></IconButton>
    <IconButton ariaLabel="Console" active><Icon icon="mdi:console" /></IconButton>
    <IconButton ariaLabel="More"><Icon icon="mdi:dots-horizontal" /></IconButton>
  </Toolbar>
{/snippet}

<Story name="Default" asChild>
  {@render composed('horizontal')}
</Story>

<Story name="Vertical" asChild>
  {@render composed('vertical')}
</Story>

<Story name="Dark" globals={{ theme: 'dark' }} asChild>
  {@render composed('horizontal')}
</Story>
