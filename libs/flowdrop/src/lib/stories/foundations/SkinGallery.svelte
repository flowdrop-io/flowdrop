<!--
  @component
  The four built-in themes side by side, each drawing the same slice of the
  editor. The samples follow the light/dark switch in the toolbar; the frame
  around them stays light.
-->
<script lang="ts">
  import SkinSample from './SkinSample.svelte';
  import { resolveTheme } from '../../themes/index.js';
  import type { FlowDropThemeName } from '../../types/theme.js';
  import './docsChrome.css';

  const THEMES: Array<{ name: FlowDropThemeName; label: string }> = [
    { name: 'graphite', label: 'Graphite (editor default)' },
    { name: 'classic', label: 'Classic' },
    { name: 'minimal', label: 'Minimal' },
    { name: 'drafter', label: 'Drafter' }
  ];
</script>

<div class="gallery docs-chrome">
  {#each THEMES as t (t.name)}
    <SkinSample scope={`gallery-${t.name}`} theme={resolveTheme(t.name)} label={t.label} />
  {/each}
</div>

<style>
  .gallery {
    /* Docs chrome stays light in either scheme; only the samples follow the toolbar. */
    background: var(--docs-bg);
    border-radius: var(--fd-radius-lg);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    padding: 24px;
  }
</style>
