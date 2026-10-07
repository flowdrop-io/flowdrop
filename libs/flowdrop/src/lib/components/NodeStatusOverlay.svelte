<!--
  Node Status Overlay Component
  Compact status badge on a node's top-right corner: the status icon, coloured
  from the theme tokens, and nothing else. Durations, counts, errors and job
  history are not drawn on the canvas: their one home is the inspector's Last
  run tab. The badge keeps a tooltip and an accessible name with the status
  word. Styled with BEM syntax
-->

<script lang="ts">
  import type { NodeExecutionInfo } from '../types/index.js';
  import Icon from '@iconify/svelte';
  import { getStatusIcon, getStatusLabel } from '../utils/nodeStatus.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    nodeId?: string;
    executionInfo?: NodeExecutionInfo;
    size?: 'sm' | 'md' | 'lg';
  }

  let props: Props = $props();

  // Default values
  let size = $derived(props.size || 'md');

  // Badge diameter and icon size per size variant
  const sizeConfig = {
    sm: { badge: '16px', icon: '10px' },
    md: { badge: '20px', icon: '12px' },
    lg: { badge: '24px', icon: '14px' }
  };

  const config = $derived(sizeConfig[size]);

  // Get execution info or default
  let executionInfo = $derived(
    props.executionInfo || {
      status: 'idle' as const,
      executionCount: 0,
      isExecuting: false
    }
  );

  // Show overlay if there's meaningful status information
  let shouldShow = $derived(
    executionInfo.status !== 'idle' || executionInfo.executionCount > 0 || executionInfo.isExecuting
  );

  // Hoist the overlay branch.
  const overlay = $derived(m().status.overlay);
</script>

{#if shouldShow}
  <div
    class="node-status-overlay node-status-overlay--{executionInfo.status}"
    data-node-id={props.nodeId}
    data-status={executionInfo.status}
    class:node-status-overlay--sm={size === 'sm'}
    class:node-status-overlay--md={size === 'md'}
    class:node-status-overlay--lg={size === 'lg'}
    style="--badge-size: {config.badge}; --icon-size: {config.icon};"
    title={overlay.tooltip({ status: getStatusLabel(executionInfo.status) })}
    role="status"
    aria-label={overlay.ariaLabel({ status: getStatusLabel(executionInfo.status) })}
  >
    <!-- The badge: status icon only, no text and no numbers -->
    <div class="node-status-overlay__badge">
      <Icon icon={getStatusIcon(executionInfo.status)} class="node-status-overlay__icon" />
    </div>
  </div>
{/if}

<style>
  /* Status colours come from the theme tokens, so dark mode follows. */
  .node-status-overlay {
    --status-color: var(--fd-muted-foreground);
    position: absolute;
    top: calc(var(--badge-size) / -2);
    right: calc(var(--badge-size) / -2);
    z-index: 1000;
    /* The tooltip needs the pointer; nothing else lives here. */
    pointer-events: auto;
  }

  .node-status-overlay--completed {
    --status-color: var(--fd-success);
  }

  .node-status-overlay--failed {
    --status-color: var(--fd-error);
  }

  .node-status-overlay--running {
    --status-color: var(--fd-primary);
  }

  .node-status-overlay--pending,
  .node-status-overlay--paused,
  .node-status-overlay--interrupted {
    --status-color: var(--fd-warning);
  }

  /* idle, cancelled and skipped keep the muted colour */

  .node-status-overlay__badge {
    box-sizing: border-box;
    width: var(--badge-size);
    height: var(--badge-size);
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1.5px solid var(--status-color);
    background: var(--fd-background);
    color: var(--status-color);
    box-shadow: var(--fd-shadow-sm);
  }

  .node-status-overlay :global(.node-status-overlay__icon) {
    width: var(--icon-size);
    height: var(--icon-size);
  }

  /* Motion only for a running or waiting node, and never under reduced motion. */
  @media (prefers-reduced-motion: no-preference) {
    .node-status-overlay--running :global(.node-status-overlay__icon) {
      animation: node-status-spin 1.2s linear infinite;
    }

    .node-status-overlay--interrupted .node-status-overlay__badge,
    .node-status-overlay--paused .node-status-overlay__badge {
      animation: node-status-pulse 1.8s ease-in-out infinite;
    }
  }

  @keyframes node-status-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes node-status-pulse {
    50% {
      box-shadow: 0 0 0 5px color-mix(in srgb, var(--status-color) 25%, transparent);
    }
  }
</style>
