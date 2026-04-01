<!--
  CanvasController Component
  Provides viewport control methods (fitView, zoom, pan) via useSvelteFlow().
  Must be rendered inside SvelteFlowProvider context.
-->

<script lang="ts">
  import { useSvelteFlow } from "@xyflow/svelte";
  import { getEditorSettings } from "../stores/settingsStore.svelte.js";

  const { fitView, zoomIn, zoomOut, setZoom, setCenter, setViewport } =
    useSvelteFlow();

  export function canvasFitView(): void {
    fitView({ padding: 0.2, duration: 300 });
  }

  export function canvasZoomIn(): void {
    zoomIn({ duration: 300 });
  }

  export function canvasZoomOut(): void {
    zoomOut({ duration: 300 });
  }

  export function canvasZoomTo(level: number): void {
    setZoom(level, { duration: 300 });
  }

  export function canvasPanTo(x: number, y: number): void {
    setCenter(x, y, { duration: 300 });
  }

  export function canvasResetView(): void {
    const defaultZoom = getEditorSettings().defaultZoom;
    setViewport({ x: 0, y: 0, zoom: defaultZoom }, { duration: 300 });
  }
</script>
