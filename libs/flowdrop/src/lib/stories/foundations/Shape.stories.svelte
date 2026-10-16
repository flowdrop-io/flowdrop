<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Scale from './Scale.svelte';
  // The page is Shape.mdx; these stories are its live parts.
  const { Story } = defineMeta({
    title: 'Foundations/Radius and shadow',
    parameters: { layout: 'fullscreen' }
  });
</script>

<Story name="Radius" exportName="RadiusScale">
  {#snippet template()}<Scale kind="radius" />{/snippet}
</Story>

<Story name="Shadow" exportName="ShadowScale">
  {#snippet template()}<Scale kind="shadow" />{/snippet}
</Story>
