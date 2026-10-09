<!--
  CanvasController Component
  Provides viewport control methods (fitView, zoom, pan) via useSvelteFlow().
  Must be rendered inside <SvelteFlow> (not beside it under a provider).
-->

<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';
  import { useNodesInitialized } from '@xyflow/svelte';
  import { boundsWithTags, fitPadding, type FitBox } from '../utils/canvasFit.js';
  import { getEditorSettings } from '../stores/settingsStore.svelte.js';

  interface Props {
    /** Room each node's interface tags need beside it (flow px), read at fit time. */
    tagReserve?: () => ReadonlyMap<string, { left: number; right: number }>;
    /** How much of the canvas's right side an open sheet covers (px), read at fit time. */
    fitInset?: () => number;
    /** Fit once when the nodes are first measured (the `fitViewOnLoad` setting). */
    fitOnLoad?: boolean;
  }

  let { tagReserve, fitInset, fitOnLoad = false }: Props = $props();

  const nodesInitialized = useNodesInitialized();

  const {
    fitView,
    fitBounds,
    getNodes,
    getInternalNode,
    zoomIn,
    zoomOut,
    setZoom,
    setCenter,
    setViewport,
    screenToFlowPosition,
    deleteElements
  } = useSvelteFlow();

  /**
   * Fit the graph and its interface tags into the part of the canvas an open
   * sheet leaves free. Own bounds + `fitBounds`, because `fitView` knows only
   * node boxes and would clip the tags.
   */
  export function canvasFitView(duration = 300): void {
    const boxes: Array<FitBox & { id: string }> = [];
    for (const node of getNodes()) {
      if (node.hidden) continue;
      const internal = getInternalNode(node.id);
      const width = internal?.measured.width ?? node.width;
      const height = internal?.measured.height ?? node.height;
      if (!internal || !width || !height) continue;
      boxes.push({
        id: node.id,
        x: internal.internals.positionAbsolute.x,
        y: internal.internals.positionAbsolute.y,
        width,
        height
      });
    }
    const bounds = boundsWithTags(boxes, tagReserve?.());
    if (!bounds) return;
    // xyflow types `fitBounds` padding as a number, but it parses the same
    // padding object `fitView` takes (px, % and per-side values).
    const padding = fitPadding(fitInset?.() ?? 0) as unknown as number;
    void fitBounds(bounds, { padding, duration });
  }

  // The initial fit, once per mount (the editor remounts this on a workflow swap).
  let didInitialFit = false;
  $effect(() => {
    if (!fitOnLoad || didInitialFit || !nodesInitialized.current) return;
    didInitialFit = true;
    canvasFitView(0);
  });

  /**
   * Bring one node into view. Keeps the current zoom unless the node would be
   * tiny or cut off; asked for by a person (a message link), never by a run.
   */
  export function canvasFocusNode(nodeId: string): void {
    void fitView({ nodes: [{ id: nodeId }], padding: 0.6, maxZoom: 1.25, duration: 300 });
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

  /** Convert a viewport (client) point to flow coordinates. */
  export function canvasScreenToFlow(point: { x: number; y: number }): { x: number; y: number } {
    return screenToFlowPosition(point);
  }

  /**
   * Delete nodes through xyflow so `onbeforedelete` (confirm setting) and
   * `ondelete` (edge removal + history entry) run exactly as for the Delete key.
   */
  export async function canvasDeleteNodes(ids: string[]): Promise<void> {
    await deleteElements({ nodes: ids.map((id) => ({ id })) });
  }
</script>
