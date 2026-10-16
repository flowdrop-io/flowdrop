<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import Icon from '@iconify/svelte';
  import IconButton from './IconButton.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/IconButton',
    component: IconButton,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      variant: { control: 'select', options: ['ghost', 'secondary', 'primary', 'danger'] },
      size: { control: 'select', options: ['sm', 'md'] },
      disabled: { control: 'boolean' },
      active: { control: 'boolean' }
    },
    args: { variant: 'ghost', size: 'sm', ariaLabel: 'Settings', title: 'Settings', onclick: fn() }
  });

  const variants = ['ghost', 'secondary', 'primary', 'danger'] as const;
  const sizes = ['sm', 'md'] as const;
</script>

{#snippet template(args: Omit<ComponentProps<typeof IconButton>, 'children'>)}
  <IconButton {...args}><Icon icon="mdi:cog" /></IconButton>
{/snippet}

<Story
  name="In the editor"
  {template}
  parameters={{
    docs: {
      description: {
        story: 'Ghost and small, as in list rows and panel headers. Always set `ariaLabel`.'
      }
    }
  }}
/>

<Story
  name="Toggle"
  parameters={{
    docs: {
      description: {
        story:
          'Passing `active` (true or false) makes it a toggle with `aria-pressed`. Off and on are shown here.'
      }
    }
  }}
  asChild
>
  <div style="display: flex; gap: 0.5rem;">
    <IconButton size="sm" ariaLabel="Show console" active={false}>
      <Icon icon="mdi:console" />
    </IconButton>
    <IconButton size="sm" ariaLabel="Hide console" active>
      <Icon icon="mdi:console" />
    </IconButton>
  </div>
</Story>

<Story name="Delete" asChild>
  <IconButton size="sm" variant="danger" ariaLabel="Delete item" title="Delete item">
    <Icon icon="mdi:delete-outline" />
  </IconButton>
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div
    style="display: grid; grid-template-columns: auto repeat(3, auto); gap: 0.75rem; align-items: center; justify-items: start;"
  >
    {#each variants as variant (variant)}
      {#each sizes as size (size)}
        <code style="font-size: var(--fd-text-xs);">{variant} / {size}</code>
        <IconButton {variant} {size} ariaLabel="Settings"><Icon icon="mdi:cog" /></IconButton>
        <IconButton {variant} {size} ariaLabel="Settings" active>
          <Icon icon="mdi:cog" />
        </IconButton>
        <IconButton {variant} {size} ariaLabel="Settings" disabled>
          <Icon icon="mdi:cog" />
        </IconButton>
      {/each}
    {/each}
  </div>
</Story>
