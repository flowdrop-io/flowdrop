<!--
  Node Status Overlay Component
  Universal status indicator that can be overlaid on any node type
  Displays execution status, count, and other execution information
  Styled with BEM syntax
-->

<script lang="ts">
  import type { NodeExecutionInfo } from '../types/index.js';
  import Icon from '@iconify/svelte';
  import StatusLabel from './StatusLabel.svelte';
  import {
    getStatusColor,
    getStatusIcon,
    getStatusLabel,
    getStatusBackgroundColor,
    formatExecutionDuration,
    formatLastExecuted
  } from '../utils/nodeStatus.js';
  import { formatMicroseconds } from '../utils/duration.js';
  import { m } from '$lib/messages/index.js';

  /** Prefer the precise µs duration; fall back to the legacy ms value. */
  function formatDuration(us: number | null | undefined, ms: number | null | undefined): string {
    return formatMicroseconds(us) ?? formatExecutionDuration(ms ?? undefined);
  }

  interface Props {
    nodeId?: string;
    executionInfo?: NodeExecutionInfo;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
  }

  let props: Props = $props();

  // Default values
  let position = $derived(props.position || 'top-right');
  let size = $derived(props.size || 'md');
  let showDetails = $derived(props.showDetails || false);
  let isHovered = $state(false);

  // Size configurations - optimized for larger, centered overlay
  const sizeConfig = {
    sm: {
      statusSize: '18px',
      iconSize: '10px',
      labelSize: '0.75rem',
      padding: '6px 12px'
    },
    md: {
      statusSize: '24px',
      iconSize: '14px',
      labelSize: '0.875rem',
      padding: '8px 16px'
    },
    lg: {
      statusSize: '28px',
      iconSize: '16px',
      labelSize: '1rem',
      padding: '10px 20px'
    }
  };

  const config = $derived(sizeConfig[size]);

  // Position styles - horizontal center aligned with top edge of node
  const positionStyles = {
    'top-left': 'top: -24px; left: 50%; transform: translateX(-50%);',
    'top-right': 'top: -24px; left: 50%; transform: translateX(-50%);',
    'bottom-left': 'top: -24px; left: 50%; transform: translateX(-50%);',
    'bottom-right': 'top: -24px; left: 50%; transform: translateX(-50%);'
  };

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

  // Number of jobs behind this node's status. Loop iterations create
  // multiple jobs per node — including a never-started job swept to
  // "skipped" when the loop exits — so the per-job history (when known)
  // beats the started-runs count: a skipped node with an earlier completed
  // run must still flag that there is more to inspect.
  let runCount = $derived(executionInfo.jobs?.length ?? executionInfo.executionCount);

  // Hoist the overlay branch — seven reads in the template.
  const overlay = $derived(m().status.overlay);
</script>

{#if shouldShow}
  <div
    class="node-status-overlay"
    data-node-id={props.nodeId}
    class:node-status-overlay--hovered={isHovered}
    class:node-status-overlay--top-left={true}
    class:node-status-overlay--sm={size === 'sm'}
    class:node-status-overlay--md={size === 'md'}
    class:node-status-overlay--lg={size === 'lg'}
    style="
			{positionStyles[position]}
			--status-size: {config.statusSize};
			--label-size: {config.labelSize};
			--icon-size: {config.iconSize};
			--padding: {config.padding};
		"
    onmouseenter={() => (isHovered = true)}
    onmouseleave={() => (isHovered = false)}
    title={overlay.tooltip({
      status: getStatusLabel(executionInfo.status),
      count: executionInfo.executionCount
    })}
    role="status"
    aria-label={overlay.ariaLabel({ status: getStatusLabel(executionInfo.status) })}
  >
    <!-- Status Display: [icon] [label] -->
    <div
      class="node-status-overlay__status-display"
      style="background-color: {getStatusBackgroundColor(executionInfo.status)}"
    >
      <div
        class="node-status-overlay__status-icon"
        style="background-color: {getStatusColor(executionInfo.status)}"
      >
        <Icon icon={getStatusIcon(executionInfo.status)} class="node-status-overlay__icon" />
      </div>
      <StatusLabel
        label={getStatusLabel(executionInfo.status)}
        class="node-status-overlay__label"
      />
    </div>

    <!-- Run Count Badge: only meaningful when the node has more than one
         job (loop iterations) — a "1" on every executed node is noise -->
    {#if runCount > 1}
      <div class="node-status-overlay__count">
        ×{runCount}
      </div>
    {/if}

    <!-- Detailed Information (shown on hover) -->
    {#if showDetails && isHovered}
      <div class="node-status-overlay__details">
        <div class="node-status-overlay__detail-item">
          <span class="node-status-overlay__detail-label">{overlay.statusLabel}</span>
          <span class="node-status-overlay__detail-value"
            >{getStatusLabel(executionInfo.status)}</span
          >
        </div>
        <div class="node-status-overlay__detail-item">
          <span class="node-status-overlay__detail-label">{overlay.executionsLabel}</span>
          <span class="node-status-overlay__detail-value">{executionInfo.executionCount}</span>
        </div>
        {#if executionInfo.lastExecuted}
          <div class="node-status-overlay__detail-item">
            <span class="node-status-overlay__detail-label">{overlay.lastRunLabel}</span>
            <span class="node-status-overlay__detail-value"
              >{formatLastExecuted(executionInfo.lastExecuted)}</span
            >
          </div>
        {/if}
        {#if executionInfo.lastExecutionDurationUs || executionInfo.lastExecutionDuration}
          <div class="node-status-overlay__detail-item">
            <span class="node-status-overlay__detail-label">{overlay.durationLabel}</span>
            <span class="node-status-overlay__detail-value"
              >{formatDuration(
                executionInfo.lastExecutionDurationUs,
                executionInfo.lastExecutionDuration
              )}</span
            >
          </div>
        {/if}
        {#if executionInfo.lastError}
          <div class="node-status-overlay__detail-item node-status-overlay__detail-item--error">
            <span class="node-status-overlay__detail-label">{overlay.errorLabel}</span>
            <span class="node-status-overlay__detail-value">{executionInfo.lastError}</span>
          </div>
        {/if}
        <!-- Per-job history: loop iterations create multiple jobs for the
             same node; list them so earlier runs stay inspectable -->
        {#if executionInfo.jobs && executionInfo.jobs.length > 1}
          <div class="node-status-overlay__history">
            <span class="node-status-overlay__detail-label">{overlay.historyLabel}</span>
            {#each executionInfo.jobs as job, i (job.id ?? i)}
              <div class="node-status-overlay__history-item">
                <span
                  class="node-status-overlay__history-dot"
                  style="background-color: {getStatusColor(job.status)}"
                ></span>
                <span class="node-status-overlay__history-label" title={job.label}
                  >{job.label ?? `#${i + 1}`}</span
                >
                <span
                  class="node-status-overlay__history-status"
                  style="color: {getStatusColor(job.status)}">{getStatusLabel(job.status)}</span
                >
                {#if (job.executionTimeUs != null && job.executionTimeUs > 0) || (job.executionTime != null && job.executionTime > 0)}
                  <span class="node-status-overlay__history-duration"
                    >{formatDuration(job.executionTimeUs, job.executionTime)}</span
                  >
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .node-status-overlay {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    z-index: 1000;
    /* Must receive pointer events at rest — the hover details panel (and
       per-job history) is only reachable if mouseenter can fire here. */
    pointer-events: auto;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    height: 48px;
    width: auto;
    min-width: 120px;
  }

  .node-status-overlay--hovered {
    pointer-events: auto;
    transform: translateY(-2px);
  }

  .node-status-overlay--hovered .node-status-overlay__status-display {
    box-shadow:
      0 8px 25px -5px rgba(0, 0, 0, 0.15),
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transform: scale(1.02);
  }

  .node-status-overlay__status-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 1rem;
    padding: 0.5rem 1rem;
    box-shadow:
      0 6px 12px -2px rgba(0, 0, 0, 0.15),
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    height: 48px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    width: 100%;
    justify-content: flex-start;
    overflow: hidden;
  }

  .node-status-overlay__status-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    position: relative;
    margin: -0.5rem 0.5rem -0.5rem -1rem;
  }

  .node-status-overlay__count {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    color: #1f2937;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 0.75rem;
    padding: var(--padding);
    font-size: var(--label-size);
    font-weight: 700;
    min-width: 2rem;
    text-align: center;
    line-height: 1;
    box-shadow:
      0 3px 6px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .node-status-overlay__details {
    position: absolute;
    top: 100%;
    right: 0;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    min-width: 200px;
    z-index: 1001;
    pointer-events: auto;
  }

  .node-status-overlay__detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .node-status-overlay__detail-item:last-child {
    margin-bottom: 0;
  }

  .node-status-overlay__detail-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
  }

  .node-status-overlay__detail-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
    text-align: right;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-status-overlay__detail-item--error .node-status-overlay__detail-value {
    color: #ef4444;
  }

  .node-status-overlay__history {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .node-status-overlay__history-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .node-status-overlay__history-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .node-status-overlay__history-label {
    flex: 1;
    min-width: 0;
    font-weight: 500;
    color: #374151;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-status-overlay__history-status {
    font-weight: 600;
    white-space: nowrap;
  }

  .node-status-overlay__history-duration {
    color: #6b7280;
    white-space: nowrap;
  }

  /* Size variants */
  .node-status-overlay--sm {
    gap: 0.125rem;
  }

  .node-status-overlay--md {
    gap: 0.25rem;
  }

  .node-status-overlay--lg {
    gap: 0.375rem;
  }

  /* Animation for running status */
  .node-status-overlay__status-icon[style*='running'] {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
