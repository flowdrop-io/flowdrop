<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Icon from '@iconify/svelte';
  import Toolbar from './Toolbar.svelte';
  import ToolbarSeparator from './ToolbarSeparator.svelte';
  import Segmented from './Segmented.svelte';
  import IconButton from './IconButton.svelte';

  const { Story } = defineMeta({
    title: 'Components/Toolbar',
    component: Toolbar,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { orientation: { control: 'select', options: ['horizontal', 'vertical'] } },
    args: { ariaLabel: 'Text tools', orientation: 'horizontal' }
  });

  const align = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Centre' },
    { value: 'right', label: 'Right' }
  ];
</script>

{#snippet tools(orientation: 'horizontal' | 'vertical')}
  <Toolbar ariaLabel="Text tools" {orientation}>
    <Segmented size="sm" ariaLabel="Alignment" options={align} value="left" />
    <ToolbarSeparator {orientation} />
    <IconButton size="sm" variant="secondary" ariaLabel="Bold"
      ><Icon icon="mdi:format-bold" /></IconButton
    >
    <IconButton size="sm" variant="secondary" ariaLabel="Italic">
      <Icon icon="mdi:format-italic" />
    </IconButton>
    <IconButton size="sm" variant="secondary" ariaLabel="Link"><Icon icon="mdi:link" /></IconButton>
  </Toolbar>
{/snippet}

<Story
  name="Arrow keys across controls"
  parameters={{
    docs: {
      description: {
        story:
          'Click the first control, then press the Left and Right arrow keys, Home or End. Focus moves across the segmented switch and the buttons as one row. The real editor toolbar is `CanvasToolbar` under Editor/Canvas.'
      }
    }
  }}
  asChild
>
  <div style="display:flex; align-items:center; gap:var(--fd-space-xs);">
    {@render tools('horizontal')}
  </div>
</Story>

<Story
  name="Vertical"
  parameters={{
    docs: { description: { story: 'Vertical toolbars use the Up and Down arrow keys.' } }
  }}
  asChild
>
  {@render tools('vertical')}
</Story>
