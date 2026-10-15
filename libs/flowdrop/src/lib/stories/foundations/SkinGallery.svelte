<!--
  @component
  The four built-in themes side by side, each drawing the same slice of the
  editor. Follows the light/dark switch in the toolbar.
-->
<script lang="ts">
  import SkinSample from './SkinSample.svelte';
  import { resolveTheme } from '../../themes/index.js';
  import type { FlowDropThemeName } from '../../types/theme.js';

  const THEMES: Array<{ name: FlowDropThemeName; label: string }> = [
    { name: 'graphite', label: 'Graphite (editor default)' },
    { name: 'classic', label: 'Classic' },
    { name: 'minimal', label: 'Minimal' },
    { name: 'drafter', label: 'Drafter' }
  ];
</script>

<div class="gallery">
  {#each THEMES as t (t.name)}
    <SkinSample scope={`gallery-${t.name}`} theme={resolveTheme(t.name)} label={t.label} />
  {/each}
</div>

<style>
  .gallery {
    /* Its own surface: the docs page around it stays light in dark mode. */
    background: var(--fd-background);
    border-radius: var(--fd-radius-lg);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    padding: 24px;
  }
</style>
