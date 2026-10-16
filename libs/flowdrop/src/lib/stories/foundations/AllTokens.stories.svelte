<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TokenReference from './TokenReference.svelte';

  // The page is AllTokens.mdx; this story is its live list.
  const { Story } = defineMeta({
    title: 'Foundations/All tokens',
    component: TokenReference,
    parameters: { layout: 'fullscreen' },
    argTypes: {
      showInternal: { control: 'boolean' },
      collapsed: { control: 'boolean' }
    }
  });
</script>

<Story name="All tokens" exportName="AllTokensStory" />
