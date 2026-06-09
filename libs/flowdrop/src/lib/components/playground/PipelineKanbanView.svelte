<script module lang="ts">
  import type { KanbanColumnDef } from '$lib/types/index.js';

  const DEFAULT_COLUMNS: KanbanColumnDef[] = [
    {
      key: 'pending',
      label: 'Pending',
      statuses: ['idle', 'pending'],
      icon: 'mdi:clock-outline',
      color: 'var(--fd-muted-foreground)'
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      statuses: ['running', 'paused', 'interrupted'],
      icon: 'mdi:play-circle-outline',
      color: 'var(--fd-warning)'
    },
    {
      key: 'done',
      label: 'Done',
      statuses: ['completed', 'skipped'],
      icon: 'mdi:check-circle',
      color: 'var(--fd-success)'
    },
    {
      key: 'failed',
      label: 'Failed',
      statuses: ['failed', 'cancelled'],
      icon: 'mdi:alert-circle',
      color: 'var(--fd-error)'
    }
  ];
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import { createPipelineDataFetcher, resolveStatus } from './pipelineViewUtils.svelte.js';
  import {
    getStatusLabel,
    getStatusTextColor,
    getStatusBackgroundColor
  } from '$lib/utils/nodeStatus.js';
  import { formatMicroseconds } from '$lib/utils/duration.js';
  import type { NodeStatus } from './pipelineViewUtils.svelte.js';
  import type { Workflow, WorkflowNode } from '$lib/types/index.js';
  import type { EndpointConfig } from '$lib/config/endpoints.js';
  import type { AuthProvider } from '$lib/types/auth.js';

  interface Props {
    pipelineId: string;
    workflow: Workflow;
    endpointConfig: EndpointConfig;
    authProvider?: AuthProvider;
    refreshTrigger?: number;
  }

  let { pipelineId, workflow, endpointConfig, authProvider, refreshTrigger = 0 }: Props = $props();

  // endpointConfig is consumed once to build the API client; it must be stable
  // svelte-ignore state_referenced_locally
  const fetcher = createPipelineDataFetcher(() => pipelineId, endpointConfig, authProvider);

  $effect(() => {
    if (refreshTrigger <= 0) return;
    const timer = setTimeout(() => fetcher.fetchData(), 300);
    return () => clearTimeout(timer);
  });

  interface CardItem {
    /** Stable key: job id, or node id for nodes without a job yet */
    key: string;
    label: string;
    typeId: string;
    status: NodeStatus;
    /** Duration in microseconds, for finished jobs */
    durationUs?: number | null;
  }

  const columnedNodes = $derived.by(() => {
    const columns = fetcher.kanbanConfig ?? DEFAULT_COLUMNS;

    const statusToColumn = new Map<string, string>();
    for (const col of columns) {
      for (const status of col.statuses) {
        statusToColumn.set(status, col.key);
      }
    }
    const fallbackKey = columns[0]?.key ?? 'pending';

    const nodesByColumn = new Map<string, CardItem[]>();
    for (const col of columns) {
      nodesByColumn.set(col.key, []);
    }

    const nodesById = new Map<string, WorkflowNode>(workflow.nodes.map((node) => [node.id, node]));

    // One card per job: loop iterations create multiple jobs for the same
    // node, and each deserves its own card (label carries the #N suffix).
    const nodesWithJobs = new Set<string>();
    for (const job of fetcher.jobs) {
      const node = nodesById.get(job.nodeId);
      if (!node) continue;
      nodesWithJobs.add(job.nodeId);
      const status = resolveStatus({ status: job.status });
      const colKey = statusToColumn.get(status) ?? fallbackKey;
      nodesByColumn.get(colKey)?.push({
        key: job.id,
        label: job.label || node.data.label,
        typeId: node.data.metadata.id,
        status,
        durationUs: job.executionTimeUs
      });
    }

    // Nodes without a job yet keep a single card (pending / not reached).
    for (const node of workflow.nodes) {
      if (nodesWithJobs.has(node.id)) continue;
      const status = resolveStatus(fetcher.nodeStatusMap[node.id]);
      const colKey = statusToColumn.get(status) ?? fallbackKey;
      nodesByColumn.get(colKey)?.push({
        key: node.id,
        label: node.data.label,
        typeId: node.data.metadata.id,
        status
      });
    }

    return { columns, nodesByColumn };
  });

  onMount(() => {
    fetcher.fetchData();
  });
</script>

<div class="pipeline-kanban">
  {#if fetcher.isError}
    <div class="pipeline-kanban__error">Could not refresh status data</div>
  {/if}
  {#if fetcher.isLoading && Object.keys(fetcher.nodeStatusMap).length === 0}
    <div class="pipeline-kanban__loading">
      <Icon icon="mdi:loading" class="pipeline-kanban__spinner" />
    </div>
  {:else}
    <div class="pipeline-kanban__board">
      {#each columnedNodes.columns as col (col.key)}
        {@const items = columnedNodes.nodesByColumn.get(col.key) ?? []}
        {@const showStatusPill = col.statuses.length > 1}
        <div
          class="pipeline-kanban__column"
          style="--col-color: {col.color ?? 'var(--fd-muted-foreground)'}"
        >
          <div class="pipeline-kanban__column-header">
            <Icon icon={col.icon ?? 'mdi:circle-outline'} class="pipeline-kanban__col-icon" />
            <span class="pipeline-kanban__col-label">{col.label}</span>
            <span class="pipeline-kanban__col-count">{items.length}</span>
          </div>
          <div class="pipeline-kanban__cards">
            {#each items as { key, label, typeId, status, durationUs } (key)}
              <div class="pipeline-kanban__card">
                <div class="pipeline-kanban__card-body">
                  <div class="pipeline-kanban__card-top">
                    <span class="pipeline-kanban__card-label">{label}</span>
                    {#if showStatusPill}
                      <span
                        class="pipeline-kanban__card-status"
                        style="color: {getStatusTextColor(
                          status
                        )}; background-color: {getStatusBackgroundColor(status)}"
                        >{getStatusLabel(status)}</span
                      >
                    {/if}
                  </div>
                  <div class="pipeline-kanban__card-meta">
                    <span class="pipeline-kanban__card-type">{typeId}</span>
                    {#if durationUs != null}
                      <span class="pipeline-kanban__card-duration"
                        >{formatMicroseconds(durationUs)}</span
                      >
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
            {#if items.length === 0}
              <div class="pipeline-kanban__empty">—</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .pipeline-kanban {
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: var(--fd-space-sm);
  }

  .pipeline-kanban__error {
    padding: var(--fd-space-xs) var(--fd-space-md);
    font-size: var(--fd-text-2xs);
    color: var(--fd-error);
    background-color: color-mix(in srgb, var(--fd-error) 8%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--fd-error) 20%, transparent);
    flex-shrink: 0;
  }

  .pipeline-kanban__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--fd-muted-foreground);
  }

  :global(.pipeline-kanban__spinner) {
    font-size: 1.5rem;
    animation: kanban-spin 1s linear infinite;
  }

  @keyframes kanban-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .pipeline-kanban__board {
    display: flex;
    gap: var(--fd-space-sm);
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .pipeline-kanban__column {
    display: flex;
    flex-direction: column;
    min-width: 160px;
    flex: 1;
    background-color: var(--fd-background);
    border-radius: var(--fd-radius-md);
    border: 1px solid var(--fd-border);
    overflow: hidden;
  }

  .pipeline-kanban__column-header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-sm) var(--fd-space-md);
    border-bottom: 1px solid var(--fd-border);
    flex-shrink: 0;
  }

  .pipeline-kanban__col-label {
    font-size: var(--fd-text-xs);
    font-weight: 600;
    flex: 1;
    color: var(--fd-foreground);
  }

  .pipeline-kanban__col-count {
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    padding: 1px var(--fd-space-xs);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-muted);
    color: var(--fd-muted-foreground);
    min-width: 18px;
    text-align: center;
  }

  :global(.pipeline-kanban__col-icon) {
    font-size: var(--fd-text-sm);
    flex-shrink: 0;
    color: var(--col-color, var(--fd-muted-foreground));
  }

  .pipeline-kanban__cards {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs);
    overflow-y: auto;
    flex: 1;
  }

  .pipeline-kanban__card {
    display: flex;
    align-items: flex-start;
    padding: var(--fd-space-sm);
    border-radius: var(--fd-radius-sm);
    border: 1px solid var(--fd-border);
    border-left-width: 3px;
    border-left-color: var(--col-color, var(--fd-border));
    background-color: var(--fd-card);
    font-size: var(--fd-text-xs);
  }

  .pipeline-kanban__card-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .pipeline-kanban__card-top {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
  }

  .pipeline-kanban__card-label {
    font-weight: 500;
    color: var(--fd-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .pipeline-kanban__card-status {
    display: inline-block;
    font-size: var(--fd-text-2xs);
    font-weight: 500;
    padding: 1px var(--fd-space-xs);
    border-radius: var(--fd-radius-sm);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .pipeline-kanban__card-meta {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
  }

  .pipeline-kanban__card-type {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-2xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .pipeline-kanban__card-duration {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-2xs);
    font-family: var(--fd-font-mono, monospace);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .pipeline-kanban__empty {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    text-align: center;
    padding: var(--fd-space-md);
  }
</style>
