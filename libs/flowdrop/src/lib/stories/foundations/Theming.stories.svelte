<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ThemeLayers from './ThemeLayers.svelte';
  import SkinGallery from './SkinGallery.svelte';
  import ThemePlayground from './ThemePlayground.svelte';
  // The page is Theming.mdx; these stories are its live parts.
  const { Story } = defineMeta({
    title: 'Start here/How theming works',
    parameters: { layout: 'fullscreen' }
  });
</script>

<Story name="Token layers" exportName="Layers">
  {#snippet template()}<ThemeLayers />{/snippet}
</Story>

<Story name="Built-in themes" exportName="Themes">
  {#snippet template()}<SkinGallery />{/snippet}
</Story>

<Story name="Try a theme" exportName="TryATheme">
  {#snippet template()}<ThemePlayground />{/snippet}
</Story>
