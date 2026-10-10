<!--
  Zoom Tier Component
  Renderless. Publishes the canvas zoom tier as `data-fd-zoom` (full | outline |
  glyph | map; the tiers that are on come from `editor.zoomTiers`, and the tier
  is recomputed when that setting changes) and the zoom as `--fd-zoom` on the editor root, so nodes, status overlays
  and interface tags restyle themselves in CSS (see utils/zoomTier.ts). The
  root is `.flowdrop-root`, or the canvas itself when the editor is mounted
  without one. Must be rendered inside <SvelteFlow>.

  `--fd-zoom` follows the zoom in the glyph and map tiers, where the
  counter-scaled titles read it; in the full tier nothing does, so it is only
  refreshed on entering the tier (a style change on the root on every wheel
  tick would restyle the whole editor for nothing).
-->

<script lang="ts">
  import { useViewport } from '@xyflow/svelte';
  import { zoomTier, normalizeZoomTiers, type ZoomTier } from '../utils/zoomTier.js';
  import { getEditorSettings } from '../stores/settingsStore.svelte.js';

  const viewport = useViewport();

  let anchor: HTMLElement | undefined = $state();
  let root: HTMLElement | null = null;
  let tier: ZoomTier | undefined;

  // The root the attribute lives on, found once the anchor is in the DOM.
  $effect(() => {
    root =
      anchor?.closest<HTMLElement>('.flowdrop-root') ??
      anchor?.closest<HTMLElement>('.svelte-flow') ??
      null;
    const mounted = root;
    return () => {
      if (!mounted) return;
      delete mounted.dataset.fdZoom;
      mounted.style.removeProperty('--fd-zoom');
      root = null;
      tier = undefined;
    };
  });

  // The configured tiers, validated once per change of the setting.
  const config = $derived(normalizeZoomTiers(getEditorSettings().zoomTiers));

  $effect(() => {
    const zoom = viewport.current.zoom || 1;
    const tiers = config;
    void anchor;
    if (!root) return;
    const next = zoomTier(zoom, tier, tiers);
    if (next !== tier) {
      tier = next;
      root.dataset.fdZoom = next;
    }
    if (next !== 'full' || root.style.getPropertyValue('--fd-zoom') === '') {
      root.style.setProperty('--fd-zoom', String(Math.round(zoom * 10000) / 10000));
    }
  });
</script>

<span bind:this={anchor} hidden data-testid="zoom-tier-anchor"></span>
