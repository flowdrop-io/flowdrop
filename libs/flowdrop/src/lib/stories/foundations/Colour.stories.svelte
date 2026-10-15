<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import KeyColours from './KeyColours.svelte';
  import TokenReference from './TokenReference.svelte';
  // The page is Colour.mdx; these stories are its live parts.
  const { Story } = defineMeta({
    title: 'Foundations/Colour',
    parameters: { layout: 'fullscreen' }
  });
</script>

<Story name="Key colours" exportName="KeyColoursStory">
  {#snippet template()}<KeyColours />{/snippet}
</Story>

<Story name="All colour tokens" exportName="AllColourTokens">
  {#snippet template()}<TokenReference categories={['colour']} collapsed />{/snippet}
</Story>
