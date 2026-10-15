<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Menu from './Menu.svelte';
  import type { MenuEntry } from './Menu.svelte';
  import Icon from '@iconify/svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Menu',
    component: Menu,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      size: { control: 'select', options: ['sm', 'md'] },
      align: { control: 'select', options: ['start', 'end'] },
      minWidth: { control: { type: 'number', min: 120, max: 400 } }
    },
    args: { size: 'sm', align: 'end', label: 'Row actions', minWidth: 180 }
  });

  const onselect = fn();
  const rowItems: MenuEntry[] = [
    { label: 'Move up', icon: 'mdi:arrow-up', onselect },
    { label: 'Move down', icon: 'mdi:arrow-down', onselect },
    { type: 'separator' },
    { label: 'Delete', icon: 'mdi:delete-outline', onselect }
  ];
  const items: MenuEntry[] = [
    { label: 'Show steps', hint: 'Log every node as it runs', checked: true, onselect },
    { label: 'JSON view', checked: false, onselect },
    { type: 'separator' },
    { type: 'group', label: 'Session' },
    { label: 'Refresh', icon: 'mdi:refresh', onselect },
    { label: 'Settings', icon: 'mdi:cog-outline', hint: 'Playground settings', onselect },
    { label: 'Reset conversation', icon: 'mdi:restart', disabled: true, onselect }
  ];
  const plainItems: MenuEntry[] = [
    { label: 'Rename', onselect },
    { label: 'Duplicate', onselect },
    { label: 'Delete', disabled: true, onselect }
  ];
  let open = $state(false);
</script>

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story:
          'A row menu: the small three-dot trigger, with the popup lined up to the right edge (`align="end"`).'
      }
    }
  }}
>
  {#snippet template(args)}
    <div style="min-height:200px; min-width:240px; display:flex; justify-content:flex-end;">
      <Menu {...args} items={rowItems} />
    </div>
  {/snippet}
</Story>

<Story
  name="Checks and groups"
  parameters={{
    docs: {
      description: {
        story:
          'Items can be checkable (`checked`), carry a hint or an icon, be disabled, and be split with separators and group labels. Shown open.'
      }
    }
  }}
  asChild
>
  <div style="min-height:320px; min-width:280px;"><Menu {items} open /></div>
</Story>

<Story name="Custom trigger" asChild>
  <div style="min-height:200px; min-width:240px;">
    <Menu label="Workflow" items={plainItems} minWidth={200} open>
      {#snippet trigger()}
        Support triage <Icon icon="mdi:chevron-down" />
      {/snippet}
    </Menu>
  </div>
</Story>

<Story
  name="Controlled"
  parameters={{
    docs: {
      description: {
        story:
          '`bind:open` lets the page open and close the menu. The text shows the current state.'
      }
    }
  }}
  asChild
>
  <div style="min-height:240px; min-width:260px; display:grid; gap:var(--fd-space-sm);">
    <Menu bind:open items={plainItems} label="Actions" />
    <span style="font-size:var(--fd-text-xs); color:var(--fd-muted-foreground);">
      The menu is {open ? 'open' : 'closed'}.
    </span>
  </div>
</Story>
