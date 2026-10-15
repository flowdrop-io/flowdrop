<!--
  CanvasChrome: the parts of the editor canvas that every story canvas needs,
  mounted the way WorkflowEditor mounts them: the zoom tier (which sets
  `data-fd-zoom` and so switches the outline, glyph and map drawings), the zoom
  controls with the node count, and the dotted background.

  Render it inside <SvelteFlow>.
-->
<script lang="ts">
  import { Background, BackgroundVariant } from '@xyflow/svelte';
  import CanvasZoomControls from '$lib/components/CanvasZoomControls.svelte';
  import ZoomTier from '$lib/components/ZoomTier.svelte';
  // The editor's canvas rules (handles, edge hover and selected strokes, the edge widths
  // of each zoom tier) are global CSS inside WorkflowEditor. Loading the module loads them.
  import '$lib/components/WorkflowEditor.svelte';

  let { nodeCount = 0, edgeCount = 0 }: { nodeCount?: number; edgeCount?: number } = $props();
</script>

<ZoomTier />
<CanvasZoomControls {nodeCount} {edgeCount} />
<Background
  gap={20}
  bgColor="var(--fd-canvas-bg)"
  variant={BackgroundVariant.Dots}
  lineWidth={1}
  patternColor="var(--fd-grid-pattern-color)"
/>
