<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Display/Button',
    component: Button,
    tags: ['autodocs'],
    parameters: {
      layout: 'centered'
    },
    argTypes: {
      variant: {
        control: { type: 'select' },
        options: ['primary', 'secondary', 'outline', 'ghost']
      },
      size: {
        control: { type: 'select' },
        options: ['sm', 'md', 'lg']
      },
      disabled: { control: 'boolean' }
    },
    args: {
      variant: 'secondary',
      size: 'md',
      disabled: false,
      onclick: fn()
    }
  });
</script>

<!-- Arg-driven template so the Controls panel can tweak variant/size/disabled live. -->
{#snippet template(args: Omit<ComponentProps<typeof Button>, 'children'>)}
  <Button {...args}>Button</Button>
{/snippet}

<Story name="Primary" args={{ variant: 'primary' }} {template} />

<Story name="Secondary" args={{ variant: 'secondary' }} {template} />

<Story name="Outline" args={{ variant: 'outline' }} {template} />

<Story name="Ghost" args={{ variant: 'ghost' }} {template} />

<Story name="Disabled" args={{ variant: 'primary', disabled: true }} {template} />

<!-- Static showcases comparing every variant / size side by side. -->
<Story name="Variants" asChild>
  <div style="display: flex; gap: 0.75rem; align-items: center;">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
  </div>
</Story>

<Story name="Sizes" asChild>
  <div style="display: flex; gap: 0.75rem; align-items: center;">
    <Button variant="primary" size="sm">Small</Button>
    <Button variant="primary" size="md">Medium</Button>
    <Button variant="primary" size="lg">Large</Button>
  </div>
</Story>
