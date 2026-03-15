<!--
  EdgeDecorator: Renders two connected nodes inside a SvelteFlow canvas
  to showcase edge rendering with arrowhead markers.
-->
<script lang="ts">
  import { SvelteFlow, Controls, MarkerType } from "@xyflow/svelte";
  import type { Node, Edge, ColorMode } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import UniversalNode from "$lib/components/UniversalNode.svelte";
  import FlowDropEdge from "$lib/components/FlowDropEdge.svelte";
  import { registerBuiltinNodes } from "$lib/registry/builtinNodes.js";
  import { EDGE_MARKER_SIZES } from "$lib/config/constants.js";

  interface Props {
    sourceData: Record<string, unknown>;
    targetData: Record<string, unknown>;
    edgeStyle?: string;
    edgeClass?: string;
    edgeMarkerColor?: string;
    edgeMarkerSize?: { width: number; height: number };
    sourceHandleId?: string;
    targetHandleId?: string;
  }

  let {
    sourceData,
    targetData,
    edgeStyle = "stroke: #64748b;",
    edgeClass = "flowdrop--edge--data",
    edgeMarkerColor = "#64748b",
    edgeMarkerSize = EDGE_MARKER_SIZES.data,
    sourceHandleId = "output",
    targetHandleId = "input",
  }: Props = $props();

  registerBuiltinNodes();

  const nodeTypes = {
    universalNode: UniversalNode,
  };

  const edgeTypes = {
    default: FlowDropEdge,
  };

  const SOURCE_ID = "source-node";
  const TARGET_ID = "target-node";

  let nodes = $derived<Node[]>([
    {
      id: SOURCE_ID,
      type: "universalNode",
      position: { x: 0, y: 0 },
      data: { ...sourceData, nodeId: SOURCE_ID },
    },
    {
      id: TARGET_ID,
      type: "universalNode",
      position: { x: 350, y: 0 },
      data: { ...targetData, nodeId: TARGET_ID },
    },
  ]);

  // Handle IDs follow the format: {nodeId}-{input|output}-{portId}
  let edges = $derived<Edge[]>([
    {
      id: "edge-1",
      source: SOURCE_ID,
      target: TARGET_ID,
      sourceHandle: `${SOURCE_ID}-output-${sourceHandleId}`,
      targetHandle: `${TARGET_ID}-input-${targetHandleId}`,
      style: edgeStyle,
      class: edgeClass,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        ...edgeMarkerSize,
        color: edgeMarkerColor,
      },
    },
  ]);

  let colorMode = $state<ColorMode>(
    (document.documentElement.getAttribute("data-theme") as ColorMode) ||
      "light",
  );

  $effect(() => {
    const observer = new MutationObserver(() => {
      colorMode =
        (document.documentElement.getAttribute("data-theme") as ColorMode) ||
        "light";
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  });
</script>

<div class="edge-decorator-wrapper">
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    fitView
    fitViewOptions={{ maxZoom: 0.85, padding: 0.3 }}
    {colorMode}
  >
    <Controls />
  </SvelteFlow>
</div>

<style>
  .edge-decorator-wrapper {
    width: 900px;
    height: 400px;
    position: relative;
  }

  .edge-decorator-wrapper :global(.svelte-flow.dark) {
    --background-color-default: var(--xy-background-color-default);
  }
</style>
