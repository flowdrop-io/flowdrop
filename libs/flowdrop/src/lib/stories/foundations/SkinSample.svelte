<!--
  @component
  A small slice of the editor built from the real primitives, drawn inside its
  own skin scope. Used to compare skins and to try token changes.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../../components/primitives/Button.svelte';
  import Segmented from '../../components/primitives/Segmented.svelte';
  import StatusPill from '../../components/primitives/StatusPill.svelte';
  import { SCOPE_ATTR, buildScopedSkinCss } from '../../themes/scopedSkinCss.js';
  import type { FlowDropTheme } from '../../types/theme.js';
  import tokensCss from '../../styles/tokens.css?raw';
  import { parseTokens } from '../tokens/parseTokens.js';
  import { baseTokensCss } from './probe.js';

  const BASE = parseTokens(tokensCss);

  interface Props {
    /** Scope id, unique on the page. */
    scope: string;
    /** Fully resolved theme (see `resolveTheme`). */
    theme: FlowDropTheme;
    /** Caption above the sample. */
    label?: string;
  }

  let { scope, theme, label }: Props = $props();

  const css = $derived(
    baseTokensCss(scope, BASE) + buildScopedSkinCss(scope, theme.skin, theme.config?.display)
  );
  let scheme = $state('light');
  let mode = $state('edit');

  onMount(() => {
    const read = () => (scheme = document.body.getAttribute('data-theme') || 'light');
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- built by buildScopedSkinCss from theme objects -->
  {@html `<style data-sample="${scope}">${css}</style>`}
</svelte:head>

<figure class="sample" {...{ [SCOPE_ATTR]: scope }} data-theme={scheme}>
  {#if label}<figcaption class="sample__label">{label}</figcaption>{/if}
  <div class="sample__canvas">
    <Segmented
      size="md"
      float
      ariaLabel="Editor mode"
      options={[
        { value: 'edit', label: 'Edit', icon: 'mdi:pencil-outline' },
        { value: 'test', label: 'Test', icon: 'mdi:flask-outline' }
      ]}
      bind:value={mode}
    />
    <div class="sample__node">
      <div class="sample__node-title">Summarise ticket</div>
      <div class="sample__node-meta">AI · 2 inputs</div>
      <span class="sample__pill"><StatusPill status="completed" /></span>
    </div>
  </div>
  <div class="sample__panel">
    <div class="sample__panel-title">Run settings</div>
    <p class="sample__panel-text">Runs use the saved version of the workflow.</p>
    <div class="sample__actions">
      <Button variant="secondary" size="sm">Cancel</Button>
      <Button variant="primary" size="sm">Run</Button>
    </div>
  </div>
</figure>

<style>
  .sample {
    margin: 0;
    display: grid;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    overflow: hidden;
    font-family: var(--fd-font-sans);
    color: var(--fd-foreground);
    background: var(--fd-background);
  }
  .sample__label {
    padding: 8px 12px;
    font-size: var(--fd-text-xs);
    font-weight: 600;
    border-bottom: 1px solid var(--fd-border-muted);
  }
  .sample__canvas {
    position: relative;
    display: grid;
    gap: 22px;
    justify-items: start;
    padding: 14px 14px 18px;
    background-color: var(--fd-canvas-bg);
    background-image: radial-gradient(var(--fd-grid-pattern-color) 1px, transparent 1px);
    background-size: 14px 14px;
  }
  .sample__node {
    position: relative;
    width: min(180px, 100%);
    box-sizing: border-box;
    padding: 12px;
    border-radius: var(--fd-node-radius, var(--fd-radius-lg));
    background: var(--fd-node-bg, var(--fd-card));
    border: var(--fd-node-border-width, 1px) solid var(--fd-node-border, var(--fd-border));
    box-shadow: var(--fd-node-shadow);
  }
  .sample__node-title {
    font-size: var(--fd-text-sm);
    font-weight: 600;
  }
  .sample__node-meta {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }
  .sample__pill {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .sample__panel {
    display: grid;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid var(--fd-border);
  }
  .sample__panel-title {
    font-size: var(--fd-text-sm);
    font-weight: 600;
  }
  .sample__panel-text {
    margin: 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }
  .sample__actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
</style>
