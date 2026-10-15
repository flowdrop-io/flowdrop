<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import Icon from '@iconify/svelte';
  import Button from './Button.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Button',
    component: Button,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      variant: {
        control: 'select',
        options: ['primary', 'secondary', 'ghost', 'danger', 'destructive', 'danger-ghost']
      },
      size: { control: 'select', options: ['sm', 'md', 'lg'] },
      disabled: { control: 'boolean' },
      loading: { control: 'boolean' }
    },
    args: { variant: 'secondary', size: 'sm', disabled: false, loading: false, onclick: fn() }
  });

  const variants = [
    'primary',
    'secondary',
    'ghost',
    'danger',
    'destructive',
    'danger-ghost'
  ] as const;
  const sizes = ['sm', 'md'] as const;
</script>

{#snippet template(args: Omit<ComponentProps<typeof Button>, 'children'>)}
  <Button {...args}>Run</Button>
{/snippet}

<Story
  name="In the editor"
  args={{ variant: 'primary', size: 'sm' }}
  {template}
  parameters={{
    docs: {
      description: {
        story: 'The editor uses the small size almost everywhere: primary, secondary and ghost.'
      }
    }
  }}
/>

<Story
  name="Danger variants"
  parameters={{
    docs: {
      description: {
        story:
          '`danger` follows the theme. `destructive` is always the red fill, for a final confirm. `danger-ghost` is red text with no fill, for a quiet delete.'
      }
    }
  }}
  asChild
>
  <div style="display: flex; gap: 0.75rem; align-items: center;">
    <Button size="sm" variant="danger">Delete</Button>
    <Button size="sm" variant="destructive">Delete</Button>
    <Button size="sm" variant="danger-ghost">Delete</Button>
  </div>
</Story>

<Story name="With icons" asChild>
  <div style="display: flex; gap: 0.75rem; align-items: center;">
    <Button size="sm" variant="primary">
      {#snippet leadingIcon()}<Icon icon="mdi:play" />{/snippet}
      Run
    </Button>
    <Button size="sm">
      Options
      {#snippet trailingIcon()}<Icon icon="mdi:chevron-down" />{/snippet}
    </Button>
  </div>
</Story>

<Story
  name="Loading and disabled"
  parameters={{
    docs: {
      description: {
        story:
          'A loading button shows a spinner and ignores clicks, but stays focusable. A disabled button cannot be focused.'
      }
    }
  }}
  asChild
>
  <div style="display: flex; gap: 0.75rem; align-items: center;">
    <Button size="sm" variant="primary" loading>Running</Button>
    <Button size="sm" variant="primary" disabled>Disabled</Button>
  </div>
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div
    style="display: grid; grid-template-columns: auto repeat(4, auto); gap: 0.75rem; align-items: center; justify-items: start;"
  >
    {#each variants as variant (variant)}
      {#each sizes as size (size)}
        <code style="font-size: var(--fd-text-xs);">{variant} / {size}</code>
        <Button {variant} {size}>Label</Button>
        <Button {variant} {size} disabled>Disabled</Button>
        <Button {variant} {size} loading>Loading</Button>
        <Button {variant} {size}>
          {#snippet leadingIcon()}<Icon icon="mdi:play" />{/snippet}
          Icon
        </Button>
      {/each}
    {/each}
  </div>
</Story>
