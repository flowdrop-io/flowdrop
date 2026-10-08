<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Icon from '@iconify/svelte';
  import Button from './Button.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Primitives/Button',
    component: Button,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
      size: { control: 'select', options: ['sm', 'md'] },
      disabled: { control: 'boolean' },
      loading: { control: 'boolean' }
    },
    args: { variant: 'secondary', size: 'md', disabled: false, loading: false, onclick: fn() }
  });

  const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
  const sizes = ['sm', 'md'] as const;
</script>

{#snippet matrix()}
  <div
    style="display: grid; grid-template-columns: auto repeat(5, auto); gap: 0.75rem; align-items: center;"
  >
    {#each sizes as size (size)}
      {#each variants as variant (variant)}
        <code>{variant} / {size}</code>
        <Button {variant} {size}>Label</Button>
        <Button {variant} {size} disabled>Disabled</Button>
        <Button {variant} {size} loading>Loading</Button>
        <Button {variant} {size}>
          {#snippet leadingIcon()}<Icon icon="mdi:play" />{/snippet}
          Leading
        </Button>
        <Button {variant} {size}>
          Trailing
          {#snippet trailingIcon()}<Icon icon="mdi:chevron-down" />{/snippet}
        </Button>
      {/each}
    {/each}
  </div>
{/snippet}

<Story name="Default" asChild>
  <Button>Button</Button>
</Story>

<Story name="Primary" asChild>
  <Button variant="primary">Primary</Button>
</Story>

<Story name="Danger" asChild>
  <Button variant="danger">Delete</Button>
</Story>

<Story name="Disabled" asChild>
  <Button variant="primary" disabled>Disabled</Button>
</Story>

<Story name="Loading" asChild>
  <Button variant="primary" loading>Running</Button>
</Story>

<Story name="WithIcons" asChild>
  <Button variant="primary">
    {#snippet leadingIcon()}<Icon icon="mdi:play" />{/snippet}
    Run
  </Button>
</Story>

<Story name="Matrix" parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

<Story name="MatrixDark" globals={{ theme: 'dark' }} parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>
