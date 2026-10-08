<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Icon from '@iconify/svelte';
  import IconButton from './IconButton.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Primitives/IconButton',
    component: IconButton,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      variant: { control: 'select', options: ['ghost', 'secondary', 'primary', 'danger'] },
      size: { control: 'select', options: ['sm', 'md'] },
      disabled: { control: 'boolean' },
      active: { control: 'boolean' }
    },
    args: { variant: 'ghost', size: 'md', ariaLabel: 'Settings', onclick: fn() }
  });

  const variants = ['ghost', 'secondary', 'primary', 'danger'] as const;
  const sizes = ['sm', 'md'] as const;
</script>

{#snippet matrix()}
  <div
    style="display: grid; grid-template-columns: auto repeat(3, auto); gap: 0.75rem; align-items: center;"
  >
    {#each sizes as size (size)}
      {#each variants as variant (variant)}
        <code>{variant} / {size}</code>
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
{/snippet}

<Story name="Default" asChild>
  <IconButton ariaLabel="Settings" title="Settings"><Icon icon="mdi:cog" /></IconButton>
</Story>

<Story name="Active" asChild>
  <IconButton ariaLabel="Console" active><Icon icon="mdi:console" /></IconButton>
</Story>

<Story name="Danger" asChild>
  <IconButton variant="danger" ariaLabel="Delete"><Icon icon="mdi:delete-outline" /></IconButton>
</Story>

<Story name="Matrix" parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

<Story name="MatrixDark" globals={{ theme: 'dark' }} parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>
