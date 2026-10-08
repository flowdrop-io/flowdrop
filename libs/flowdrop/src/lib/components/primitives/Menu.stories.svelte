<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Menu from './Menu.svelte';
  import type { MenuEntry } from './Menu.svelte';
  import Icon from '@iconify/svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Primitives/Menu',
    component: Menu,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      size: { control: 'select', options: ['sm', 'md'] },
      align: { control: 'select', options: ['start', 'end'] }
    },
    args: { size: 'md', align: 'start', label: 'More actions' }
  });

  const onselect = fn();
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
  const sizes = ['sm', 'md'] as const;
</script>

<!-- The popup is absolutely positioned: reserve room under the trigger. -->
{#snippet matrix()}
  <div style="display:grid; grid-template-columns:repeat(2, 300px); gap:1rem 2rem;">
    {#each sizes as size (size)}
      <div style="min-height:300px;">
        <Menu {size} label="Actions {size}" {items} open />
      </div>
      <div style="min-height:300px;">
        <Menu {size} label="Plain {size}" items={plainItems} open align="start">
          {#snippet trigger()}
            <span
              style="display:inline-flex; align-items:center; gap:var(--fd-space-xs); height:var(--fd-control-{size}); padding-inline:var(--fd-space-md); border:1px solid var(--fd-border); border-radius:var(--fd-radius-full); font-size:var(--fd-text-xs);"
            >
              Support triage <Icon icon="mdi:chevron-down" />
            </span>
          {/snippet}
        </Menu>
      </div>
    {/each}
  </div>
{/snippet}

<Story name="Default" asChild>
  <div style="min-height:280px;"><Menu {items} /></div>
</Story>

<Story name="Open" asChild>
  <div style="min-height:300px; min-width:280px;"><Menu {items} open /></div>
</Story>

<Story name="CustomTrigger" asChild>
  <div style="min-height:200px; min-width:240px;">
    <Menu label="Workflow" items={plainItems} open>
      {#snippet trigger()}
        Support triage <Icon icon="mdi:chevron-down" />
      {/snippet}
    </Menu>
  </div>
</Story>

<Story name="Matrix" parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

<Story name="MatrixDark" globals={{ theme: 'dark' }} parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>
