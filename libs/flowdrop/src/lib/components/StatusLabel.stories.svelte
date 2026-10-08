<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import StatusLabel from './StatusLabel.svelte';

  const { Story } = defineMeta({
    title: 'Patterns/Display/StatusLabel',
    component: StatusLabel,
    tags: ['autodocs'],
    argTypes: {
      label: { control: 'text' }
    }
  });
</script>

<Story name="Default" args={{ label: 'Ready' }} />

<Story name="Long Text" args={{ label: 'Processing workflow execution...' }} />
