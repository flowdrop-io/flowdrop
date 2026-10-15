<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Scale from './Scale.svelte';
  import TokenReference from './TokenReference.svelte';
  // The page is Spacing.mdx; these stories are its live parts.
  const { Story } = defineMeta({
    title: 'Foundations/Spacing and sizes',
    parameters: { layout: 'fullscreen' }
  });
</script>

<Story name="Spacing" exportName="SpacingScale">
  {#snippet template()}<Scale kind="spacing" />{/snippet}
</Story>

<Story name="Control heights" exportName="ControlHeights">
  {#snippet template()}<Scale kind="control" />{/snippet}
</Story>

<Story name="All spacing and size tokens" exportName="AllSpacingTokens">
  {#snippet template()}<TokenReference categories={['spacing', 'size']} />{/snippet}
</Story>
