<!--
  InterfaceTagAnchor

  Places an interface tag beside its port, in flow coordinates (render it
  inside a ViewportPortal, so it pans and zooms with the canvas). The tag sits
  `--fd-iface-tag-gap` from the port, linked to it by a dotted association
  line: inputs on the left of the node, outputs on the right. Edges still
  start and end on the port itself.

  The port's position comes from the node's measured handle bounds, so it
  follows a drag and a resize without any bookkeeping here. Renders nothing
  while the handle is not measured (a port that is not on the canvas).
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useInternalNode } from '@xyflow/svelte';

  interface Props {
    nodeId: string;
    handleId: string;
    direction: 'input' | 'output';
    /** Colours the association line to match the tag. */
    tone?: 'default' | 'mismatch' | 'ghost';
    children: Snippet;
  }

  const { nodeId, handleId, direction, tone = 'default', children }: Props = $props();

  // One anchor per (node, handle): the parent keys it on both.
  // svelte-ignore state_referenced_locally
  const internalNode = useInternalNode(nodeId);

  const center = $derived.by(() => {
    const node = internalNode.current;
    const bounds = node?.internals.handleBounds;
    if (!node || !bounds) return null;
    const handle = (direction === 'input' ? bounds.target : bounds.source)?.find(
      (candidate) => candidate.id === handleId
    );
    if (!handle) return null;
    return {
      x: node.internals.positionAbsolute.x + handle.x + handle.width / 2,
      y: node.internals.positionAbsolute.y + handle.y + handle.height / 2
    };
  });
</script>

{#if center}
  <div
    class="fd-iface-anchor fd-iface-anchor--{direction} fd-iface-anchor--{tone}"
    style:left="{center.x}px"
    style:top="{center.y}px"
  >
    {#if direction === 'output'}<span class="fd-iface-anchor__line" aria-hidden="true"></span>{/if}
    <div class="fd-iface-anchor__tag">{@render children()}</div>
    {#if direction === 'input'}<span class="fd-iface-anchor__line" aria-hidden="true"></span>{/if}
  </div>
{/if}

<style>
  .fd-iface-anchor {
    --_line: var(--fd-iface-tag-border);
    position: absolute;
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  /* The box's near edge sits at the port's visible edge. */
  .fd-iface-anchor--input {
    transform: translate(calc(-100% - var(--fd-handle-visual-size) / 2), -50%);
  }

  .fd-iface-anchor--output {
    transform: translate(calc(var(--fd-handle-visual-size) / 2), -50%);
  }

  .fd-iface-anchor--mismatch {
    --_line: var(--fd-warning);
  }

  .fd-iface-anchor--ghost {
    --_line: var(--fd-ring);
  }

  .fd-iface-anchor__tag {
    pointer-events: auto;
  }

  .fd-iface-anchor__line {
    flex: none;
    width: var(--fd-iface-tag-gap);
    border-top: 1.2px dotted var(--_line);
  }
</style>
