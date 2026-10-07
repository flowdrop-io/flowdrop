<!--
  Node Status Overlay Component
  Compact status badge on a node's top-right corner: the status icon, coloured
  from the theme tokens, and nothing else. Durations, counts and errors are
  not drawn on the canvas; they appear in the hover details (and in the
  inspector's Last run tab). Styled with BEM syntax
-->

<script lang="ts">
  import type { NodeExecutionInfo } from '../types/index.js';
  import Icon from '@iconify/svelte';
  import {
    getStatusColor,
    getStatusIcon,
    getStatusLabel,
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
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
  }

  let props: Props = $props();

  // Default values
  let size = $derived(props.size || 'md');
  let showDetails = $derived(props.showDetails || false);
  let isHovered = $state(false);

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

  // Hoist the overlay branch — seven reads in the template.
  const overlay = $derived(m().status.overlay);
</script>

{#if shouldShow}
  <div
    class="node-status-overlay node-status-overlay--{executionInfo.status}"
    data-node-id={props.nodeId}
    data-status={executionInfo.status}
    class:node-status-overlay--hovered={isHovered}
    class:node-status-overlay--sm={size === 'sm'}
    class:node-status-overlay--md={size === 'md'}
    class:node-status-overlay--lg={size === 'lg'}
    style="--badge-size: {config.badge}; --icon-size: {config.icon};"
    onmouseenter={() => (isHovered = true)}
    onmouseleave={() => (isHovered = false)}
    title={overlay.tooltip({
      status: getStatusLabel(executionInfo.status),
      count: executionInfo.executionCount
    })}
    role="status"
    aria-label={overlay.ariaLabel({ status: getStatusLabel(executionInfo.status) })}
  >
    <!-- The badge: status icon only, no text and no numbers -->
    <div class="node-status-overlay__badge">
      <Icon icon={getStatusIcon(executionInfo.status)} class="node-status-overlay__icon" />
    </div>

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
  /* Status colours come from the theme tokens, so dark mode follows. */
  .node-status-overlay {
    --status-color: var(--fd-muted-foreground);
    position: absolute;
    top: calc(var(--badge-size) / -2);
    right: calc(var(--badge-size) / -2);
    z-index: 1000;
    /* Must receive pointer events at rest: the hover details panel (and
       per-job history) is only reachable if mouseenter can fire here. */
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

  .node-status-overlay__details {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background-color: var(--fd-card);
    color: var(--fd-card-foreground);
    border: 1px solid var(--fd-border);
    border-radius: 0.5rem;
    padding: 0.75rem;
    box-shadow: var(--fd-shadow-md);
    min-width: 200px;
    z-index: 1001;
    pointer-events: auto;
  }

  .node-status-overlay__detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .node-status-overlay__detail-item:last-child {
    margin-bottom: 0;
  }

  .node-status-overlay__detail-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--fd-muted-foreground);
  }

  .node-status-overlay__detail-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--fd-foreground);
    text-align: right;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-status-overlay__detail-item--error .node-status-overlay__detail-value {
    color: var(--fd-error);
  }

  .node-status-overlay__history {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--fd-border);
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
    color: var(--fd-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-status-overlay__history-status {
    font-weight: 600;
    white-space: nowrap;
  }

  .node-status-overlay__history-duration {
    color: var(--fd-muted-foreground);
    white-space: nowrap;
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
