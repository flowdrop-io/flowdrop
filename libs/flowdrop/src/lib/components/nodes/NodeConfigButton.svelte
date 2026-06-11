<script lang="ts">
  import CogIcon from '../icons/CogIcon.svelte';

  interface Props {
    /** Click handler — typically opens the node's config sidebar. */
    onclick: (event: MouseEvent) => void;
    /** Accessible label / tooltip. */
    title?: string;
    /**
     * Where the button sits relative to the node.
     * - `corner` (default): top-right corner, used by most nodes.
     * - `top-center`: circular badge above the node, used by TerminalNode.
     */
    placement?: 'corner' | 'top-center';
  }

  let { onclick, title = 'Configure node', placement = 'corner' }: Props = $props();
</script>

<!--
  tabindex="-1" keeps the gear out of the Tab order: the parent node is already
  keyboard-focusable and opens config on Enter/Space, so tabbing moves straight
  from node to node instead of stopping on the gear. The button stays clickable
  and is revealed on node hover via the --fd-config-btn-opacity custom property
  the parent sets.
-->
<button
  class="flowdrop-node-config-btn"
  class:flowdrop-node-config-btn--top-center={placement === 'top-center'}
  {onclick}
  {title}
  tabindex="-1"
>
  <CogIcon />
</button>

<style>
  .flowdrop-node-config-btn {
    position: absolute;
    top: var(--fd-space-xs);
    right: var(--fd-space-xs);
    width: 24px;
    height: 24px;
    background-color: var(--fd-backdrop);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    color: var(--fd-muted-foreground);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: var(--fd-config-btn-opacity, 0);
    transition: all var(--fd-transition-normal);
    backdrop-filter: var(--fd-backdrop-blur);
    z-index: 15;
    font-size: var(--fd-text-sm);
  }

  .flowdrop-node-config-btn :global(svg) {
    width: 14px;
    height: 14px;
  }

  .flowdrop-node-config-btn:hover {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
    color: var(--fd-foreground);
    transform: scale(1.05);
  }

  /* TerminalNode: circular badge centered above the node. */
  .flowdrop-node-config-btn--top-center {
    top: -24px;
    right: auto;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 50%;
    font-size: var(--fd-text-xs);
    box-shadow: var(--fd-shadow-sm);
  }

  /* Keep the centering translate while scaling on hover. */
  .flowdrop-node-config-btn--top-center:hover {
    transform: translateX(-50%) scale(1.1);
  }
</style>
