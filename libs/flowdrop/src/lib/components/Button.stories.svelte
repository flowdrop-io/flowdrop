<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Legacy/Button',
    component: Button,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      variant: {
        control: { type: 'select' },
        options: ['primary', 'secondary', 'outline', 'ghost']
      },
      size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
      disabled: { control: 'boolean' }
    },
    args: { variant: 'secondary', size: 'md', disabled: false, onclick: fn() }
  });
</script>

{#snippet template(args: Omit<ComponentProps<typeof Button>, 'children'>)}
  <Button {...args}>Button</Button>
{/snippet}

<Story
  name="Old API"
  args={{ variant: 'primary' }}
  {template}
  parameters={{
    docs: {
      description: {
        story:
          'The wrapper keeps the old props. Use the Controls to try them. New code should use `Components/Button`.'
      }
    }
  }}
/>

<Story
  name="How the old props map"
  parameters={{
    docs: {
      description: {
        story:
          'Nothing here is new: `outline` is drawn as `secondary` and `lg` as `md`, so each pair looks the same.'
      }
    }
  }}
  asChild
>
  <div
    style="display: grid; grid-template-columns: auto auto auto; gap: 0.75rem; align-items: center; justify-items: start;"
  >
    <code style="font-size: var(--fd-text-xs);">secondary</code>
    <Button variant="secondary">Button</Button>
    <span style="font-size: var(--fd-text-xs);">same as</span>
    <code style="font-size: var(--fd-text-xs);">outline</code>
    <Button variant="outline">Button</Button>
    <span style="font-size: var(--fd-text-xs);">mapped to secondary</span>
    <code style="font-size: var(--fd-text-xs);">size md</code>
    <Button size="md">Button</Button>
    <span style="font-size: var(--fd-text-xs);">same as</span>
    <code style="font-size: var(--fd-text-xs);">size lg</code>
    <Button size="lg">Button</Button>
    <span style="font-size: var(--fd-text-xs);">mapped to md</span>
  </div>
</Story>
