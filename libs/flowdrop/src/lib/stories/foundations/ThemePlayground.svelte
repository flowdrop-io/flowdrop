<!--
  @component
  Try a theme: pick a base theme, change a few tokens, and see the editor slice
  update. The code under the preview is what you pass to the editor.
-->
<script lang="ts">
  import SkinSample from './SkinSample.svelte';
  import { resolveTheme } from '../../themes/index.js';
  import type { FlowDropThemeName } from '../../types/theme.js';

  let base: FlowDropThemeName = $state('graphite');
  let primary = $state('#7c3aed');
  let accent = $state('#7c3aed');
  let radius = $state(8);
  let usePrimary = $state(true);
  let useAccent = $state(false);
  let useRadius = $state(false);

  const tokens = $derived({
    ...(usePrimary ? { primary, 'primary-foreground': '#ffffff' } : {}),
    ...(useAccent ? { accent, ring: accent } : {}),
    ...(useRadius
      ? {
          'radius-lg': `${radius}px`,
          'control-radius': `${Math.max(2, radius - 2)}px`,
          'node-radius': `${radius + 2}px`
        }
      : {})
  });

  // The same values in dark: a base theme's dark palette would otherwise win there.
  const theme = $derived(resolveTheme({ name: base, skin: { tokens, darkTokens: tokens } }));

  const code = $derived.by(() => {
    return [
      `const tokens = ${JSON.stringify(tokens, null, 2)};`,
      '',
      'mountFlowDropApp(container, {',
      `  theme: { name: '${base}', skin: { tokens, darkTokens: tokens } }`,
      '});'
    ].join('\n');
  });
</script>

<div class="play">
  <form class="play__controls" onsubmit={(e) => e.preventDefault()}>
    <label class="play__field">
      <span>Base theme</span>
      <select bind:value={base}>
        <option value="graphite">Graphite</option>
        <option value="classic">Classic</option>
        <option value="minimal">Minimal</option>
        <option value="drafter">Drafter</option>
      </select>
    </label>
    <label class="play__field">
      <span><input type="checkbox" bind:checked={usePrimary} /> Primary</span>
      <input type="color" bind:value={primary} disabled={!usePrimary} />
    </label>
    <label class="play__field">
      <span><input type="checkbox" bind:checked={useAccent} /> Accent and focus</span>
      <input type="color" bind:value={accent} disabled={!useAccent} />
    </label>
    <label class="play__field">
      <span><input type="checkbox" bind:checked={useRadius} /> Corner radius {radius}px</span>
      <input type="range" min="0" max="16" bind:value={radius} disabled={!useRadius} />
    </label>
  </form>
  <SkinSample scope="theme-playground" {theme} label="Preview" />
  <pre class="play__code"><code>{code}</code></pre>
</div>

<style>
  .play {
    /* Its own surface: the docs page around it stays light in dark mode. */
    background: var(--fd-background);
    border-radius: var(--fd-radius-lg);
    display: grid;
    grid-template-columns: minmax(200px, 260px) minmax(240px, 320px);
    grid-template-areas: 'controls sample' 'code code';
    gap: 16px;
    padding: 24px;
    font-family: var(--fd-font-sans);
    color: var(--fd-foreground);
  }
  .play__controls {
    grid-area: controls;
    display: grid;
    gap: 14px;
    align-content: start;
  }
  .play__field {
    display: grid;
    gap: 6px;
    font-size: var(--fd-text-sm);
  }
  .play__field span {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
  .play__field select {
    height: var(--fd-control-md);
    border: 1px solid var(--fd-border-strong);
    border-radius: var(--fd-control-radius);
    background: var(--fd-background);
    color: var(--fd-foreground);
    font: inherit;
  }
  .play__code {
    grid-area: code;
    margin: 0;
    padding: 12px 14px;
    border-radius: var(--fd-radius-lg);
    background: var(--fd-muted);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    overflow-x: auto;
  }
  @media (max-width: 640px) {
    .play {
      grid-template-columns: 1fr;
      grid-template-areas: 'controls' 'sample' 'code';
    }
  }
</style>
