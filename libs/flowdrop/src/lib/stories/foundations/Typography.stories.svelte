<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Scale from './Scale.svelte';
  import TokenReference from './TokenReference.svelte';
  // The page is Typography.mdx; these stories are its live parts.
  const { Story } = defineMeta({
    title: 'Foundations/Typography',
    parameters: { layout: 'fullscreen' }
  });
</script>

<Story name="Type scale" exportName="TypeScale">
  {#snippet template()}<Scale kind="type" />{/snippet}
</Story>

<Story name="All type tokens" exportName="AllTypeTokens">
  {#snippet template()}<TokenReference categories={['text', 'leading', 'font']} />{/snippet}
</Story>
