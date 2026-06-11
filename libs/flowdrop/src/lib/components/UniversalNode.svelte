<!--
  Universal Node Component
  Renders any node type with automatic status overlay injection.
  This component can replace individual node components in SvelteFlow.

  Uses the node component registry to resolve which component to render,
  enabling custom node types to be registered and used dynamically.
-->

<script lang="ts">
  import type { WorkflowNode } from '../types/index.js';
  import { resolveBuiltinAlias } from '../registry/builtinNodes.js';
  import NodeStatusOverlay from './NodeStatusOverlay.svelte';
  import { shouldShowNodeStatus } from '../utils/nodeWrapper.js';
  import { resolveComponentName } from '../utils/nodeTypes.js';
  import { getInstance } from '../stores/getInstance.svelte.js';

  const fd = getInstance();

  // Element ref used only to reach xyflow's node wrapper (our ancestor).
  let universalNodeEl: HTMLDivElement;

  let {
    data,
    selected = false
  }: {
    data: WorkflowNode['data'] & {
      nodeId?: string;
      onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
    };
    selected?: boolean;
  } = $props();

  /**
   * Determine which node component to render based on node type.
   * Priority: config.nodeType > metadata.type
   * Explicitly track config.nodeType to ensure reactivity.
   */
  let configNodeType = $derived(data.config?.nodeType as string | undefined);

  /**
   * Resolve the component name from metadata and config.
   * This handles the logic of choosing between config.nodeType and metadata.type.
   */
  let resolvedComponentName = $derived(
    data.metadata ? resolveComponentName(fd.nodes, data.metadata, configNodeType) : 'workflowNode'
  );

  /**
   * Get the node component from the registry.
   */
  let nodeComponent = $derived(getNodeComponent(resolvedComponentName));

  /**
   * Get execution info for status overlay
   */
  let executionInfo = $derived(data.executionInfo);

  /**
   * Determine if status overlay should be shown.
   * Hide for note nodes as they have their own styling.
   */
  let shouldShowStatus = $derived(
    shouldShowNodeStatus(executionInfo) && resolvedComponentName !== 'note'
  );

  // Keyboard activation lives on xyflow's node wrapper — the single focusable,
  // arrow-movable element SvelteFlow manages. Because the wrapper is our
  // ancestor, its keydown events never bubble down into our markup, so we bind
  // directly to it. Enter/Space opens the node's config, mirroring the
  // double-click (and single-click for square/atom) mouse paths. Node selection
  // and arrow-key movement remain SvelteFlow's job.
  $effect(() => {
    const wrapper = universalNodeEl?.closest<HTMLElement>('.svelte-flow__node');
    if (!wrapper) return;

    function onWrapperKeydown(event: KeyboardEvent): void {
      // Only when the node itself is focused — not an inner field (e.g. an
      // editable note) — so we don't hijack typing.
      if (event.target !== wrapper) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        data.onConfigOpen?.({
          id: data.nodeId ?? 'unknown',
          type: resolvedComponentName,
          data
        });
      }
    }

    wrapper.addEventListener('keydown', onWrapperKeydown);
    return () => wrapper.removeEventListener('keydown', onWrapperKeydown);
  });

  /**
   * Get the node component for the given type from the registry.
   *
   * @param nodeType - The node type identifier
   * @returns The Svelte component to render
   */
  function getNodeComponent(nodeType: string) {
    // Resolve any aliases (e.g., "default" -> "workflowNode")
    const resolvedType = resolveBuiltinAlias(nodeType);

    // Get component from registry (defaults to workflowNode if not found)
    const component = fd.nodes.getComponent(resolvedType);
    if (component) {
      return component;
    }

    // Return the default component from registry
    return fd.nodes.getComponent('workflowNode');
  }

  /**
   * Get optimal status position for this node type.
   * Uses registry if available, otherwise falls back to defaults.
   */
  function getStatusPosition(): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' {
    // Try registry first
    const position = fd.nodes.getStatusPosition(resolvedComponentName);
    if (position) {
      return position;
    }

    // Fallback based on node type
    switch (resolvedComponentName) {
      case 'tool':
        return 'top-left';
      case 'note':
        return 'bottom-right';
      case 'simple':
      case 'square':
      default:
        return 'top-right';
    }
  }

  /**
   * Get optimal status size for this node type.
   * Uses registry if available, otherwise falls back to defaults.
   */
  function getStatusSize(): 'sm' | 'md' | 'lg' {
    // Try registry first
    const size = fd.nodes.getStatusSize(resolvedComponentName);
    if (size) {
      return size;
    }

    // Fallback based on node type
    switch (resolvedComponentName) {
      case 'tool':
      case 'note':
      case 'square':
        return 'sm';
      case 'simple':
      default:
        return 'md';
    }
  }
</script>

<div class="universal-node" bind:this={universalNodeEl}>
  <!-- Render the node component dynamically (Svelte 5 dynamic component syntax) -->
  {#if nodeComponent}
    <!-- Svelte 5 dynamic component limitation; reactivity maintained via $derived -->
    {@const NodeComponent = nodeComponent}
    <NodeComponent {data} {selected} />
  {/if}

  <!-- Status overlay - only show if there's meaningful status information -->
  {#if shouldShowStatus}
    <NodeStatusOverlay
      nodeId={data.nodeId ?? 'unknown'}
      {executionInfo}
      position={getStatusPosition()}
      size={getStatusSize()}
      showDetails={true}
    />
  {/if}
</div>

<style>
  .universal-node {
    position: relative;
    display: inline-block;
  }
</style>
