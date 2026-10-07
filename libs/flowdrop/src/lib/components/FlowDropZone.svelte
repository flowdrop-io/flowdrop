<!--
  Flow Drop Zone Component
  Handles drag and drop with proper coordinate transformation.
  It wraps the canvas, so it sits outside <SvelteFlow>'s context: the parent
  passes the screen-to-flow conversion in as `toFlowPosition`.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { m } from '$lib/messages/index.js';

  interface Props {
    ondrop: (nodeTypeData: string, position: { x: number; y: number }) => void;
    /** Optional callback invoked when a JSON file is dropped onto the canvas. */
    onfiledrop?: (file: File) => void;
    /**
     * Convert a viewport (client) point to flow coordinates, accounting for
     * zoom and pan. Returns null while no canvas is mounted; the drop is then
     * ignored.
     */
    toFlowPosition: (point: { x: number; y: number }) => { x: number; y: number } | null;
    children: Snippet;
  }

  let props: Props = $props();

  /**
   * Handle drag over event
   */
  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  /**
   * Handle drop event with proper coordinate transformation.
   *
   * If the drag event carries a JSON file (e.g. a workflow file dragged from the OS),
   * the `onfiledrop` callback is invoked with the file.
   * Otherwise the node-type drop path is used as before.
   */
  function handleDrop(e: DragEvent): void {
    e.preventDefault();

    // Check if the drop contains files (e.g. a workflow JSON file from the OS)
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (props.onfiledrop && (file.type === 'application/json' || file.name.endsWith('.json'))) {
        props.onfiledrop(file);
      }
      return;
    }

    // Get the data from the drag event (node type dropped from sidebar)
    const nodeTypeData = e.dataTransfer?.getData('application/json');
    if (nodeTypeData) {
      // Convert screen coordinates to flow coordinates (accounts for zoom and pan)
      const position = props.toFlowPosition({
        x: e.clientX,
        y: e.clientY
      });
      if (!position) return;

      // Call the parent handler with the converted position
      props.ondrop(nodeTypeData, position);
    }
  }
</script>

<div
  class="flow-drop-zone"
  role="application"
  aria-label={m().layout.workflowCanvas}
  ondragover={handleDragOver}
  ondrop={handleDrop}
>
  {@render props.children()}
</div>

<style>
  .flow-drop-zone {
    width: 100%;
    height: 100%;
  }
</style>
