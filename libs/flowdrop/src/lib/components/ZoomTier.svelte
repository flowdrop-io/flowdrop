<!--
  @component
  Publishes the canvas zoom tier as `data-fd-zoom` (`full`, `outline`, `glyph` or `map`) on the
  editor root, so nodes, status overlays and interface tags restyle themselves in CSS.

  Where each tier starts comes from the `editor.zoomTiers` setting; the tier is recomputed when
  the setting changes. The root is `.flowdrop-root`, or the canvas itself when the editor is
  mounted without one. Only the tier is published, never the zoom: every drawing is in fixed
  flow px and Svelte Flow scales the canvas.

  Renders nothing. Render it inside `<SvelteFlow>`.

  **Use it for** a canvas that should draw less detail as it zooms out.
  **Not for** the zoom buttons; those are `CanvasZoomControls`.
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
  });
</script>

<span bind:this={anchor} hidden data-testid="zoom-tier-anchor"></span>
