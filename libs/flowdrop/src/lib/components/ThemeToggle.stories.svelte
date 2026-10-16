<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ThemeToggle from './ThemeToggle.svelte';

  const { Story } = defineMeta({
    title: 'Components/ThemeToggle',
    component: ThemeToggle,
    tags: ['autodocs'],
    argTypes: {
      size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
      showLabel: { control: 'boolean' }
    },
    args: { size: 'md', showLabel: false }
  });
</script>

<Story
  name="Default"
  parameters={{
    docs: {
      description: {
        story:
          'Click to cycle light, dark and auto. This changes the editor theme setting, not the Storybook light/dark switch.'
      }
    }
  }}
/>

<Story name="With label" args={{ showLabel: true }} />

<Story name="Small" args={{ size: 'sm' }} />
