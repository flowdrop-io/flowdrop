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
  import { m } from '../messages/index.js';
  import { getInstance } from '../stores/getInstance.svelte.js';

  const fd = getInstance();

  // Element ref used only to reach xyflow's node wrapper (our ancestor).
  let universalNodeEl: HTMLDivElement;

  let {
    id,
    data,
    selected = false
  }: {
    id: string;
    data: WorkflowNode['data'] & {
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
   * Run status for the overlay: from the instance's store, keyed by node id.
   * `data.executionInfo` is a deprecated fallback for hosts that still write it.
   */
  let executionInfo = $derived(fd.playground.nodeStatusFor(id) ?? data.executionInfo);

  /**
   * The `edited` mark: Test mode only, only on a node that has a last run
   * (a node that never ran has no result to be stale), and only when its
   * configuration changed since the shown run started.
   */
  let showEdited = $derived(
    fd.editedNodes.visible &&
      !!executionInfo &&
      executionInfo.status !== 'idle' &&
      fd.editedNodes.isEdited(id)
  );

  /**
   * Determine if status overlay should be shown.
   * Hide for note and caption nodes as they have their own styling.
   */
  let shouldShowStatus = $derived(
    shouldShowNodeStatus(executionInfo) &&
      resolvedComponentName !== 'note' &&
      resolvedComponentName !== 'caption'
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
        // Nodes that edit their text in place (caption) start typing instead.
        if (fd.nodes.editsInPlace(resolvedComponentName)) {
          fd.inlineEdit.request(id);
          return;
        }
        data.onConfigOpen?.({
          id,
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
      case 'caption':
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
    <NodeComponent {id} {data} {selected} />
  {/if}

  {#if showEdited && shouldShowStatus}
    <span
      class="universal-node__edited"
      data-testid="node-edited"
      title={m().status.overlay.editedTooltip}>{m().status.overlay.edited}</span
    >
  {/if}

  <!-- Status overlay - only show if there's meaningful status information -->
  {#if shouldShowStatus}
    <NodeStatusOverlay nodeId={id} {executionInfo} size={getStatusSize()} showDetails={true} />
  {/if}
</div>

<style>
  .universal-node {
    position: relative;
    display: inline-block;
  }

  .universal-node__edited {
    position: absolute;
    top: -9px;
    left: 8px;
    z-index: 1000;
    padding: 1px 5px;
    border-radius: 3px;
    background:
      linear-gradient(var(--fd-warning-muted), var(--fd-warning-muted)), var(--fd-background);
    color: var(--fd-foreground);
    border: 1px solid var(--fd-warning);
    font-size: 9px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: 0.02em;
    pointer-events: none;
  }
</style>
