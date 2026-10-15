<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TokenReference from './TokenReference.svelte';

  // Every token in one searchable list, for when you know what you are looking for.
  const { Story } = defineMeta({
    title: 'Foundations/All tokens',
    component: TokenReference,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    argTypes: {
      showInternal: { control: 'boolean' },
      collapsed: { control: 'boolean' }
    }
  });
</script>

<Story name="All tokens" args={{ collapsed: true }} />
