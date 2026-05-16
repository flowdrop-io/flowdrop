<script module lang="ts">
  import type { NodeStatus } from './pipelineViewUtils.svelte.js';

  const COLUMNS: { key: NodeStatus; label: string; icon: string }[] = [
    { key: 'pending', label: 'Pending', icon: 'mdi:clock-outline' },
    { key: 'running', label: 'Running', icon: 'mdi:play-circle-outline' },
    { key: 'completed', label: 'Completed', icon: 'mdi:check-circle' },
    { key: 'failed', label: 'Failed', icon: 'mdi:alert-circle' }
  ];
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import { createPipelineDataFetcher, resolveStatus } from './pipelineViewUtils.svelte.js';
  import type { Workflow, WorkflowNode } from '$lib/types/index.js';
  import type { EndpointConfig } from '$lib/config/endpoints.js';

  interface Props {
    pipelineId: string;
    workflow: Workflow;
    endpointConfig: EndpointConfig;
    refreshTrigger?: number;
  }

  let { pipelineId, workflow, endpointConfig, refreshTrigger = 0 }: Props = $props();

  const fetcher = createPipelineDataFetcher(
    () => pipelineId,
    () => endpointConfig
  );

  fetcher.connectRefreshTrigger(() => refreshTrigger);

  const columnedNodes = $derived.by(() => {
    const result: Record<NodeStatus, WorkflowNode[]> = {
      pending: [],
      running: [],
      completed: [],
      failed: []
    };
    for (const node of workflow.nodes) {
      result[resolveStatus(fetcher.nodeStatusMap[node.id])].push(node);
    }
    return result;
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
      {#each COLUMNS as col (col.key)}
        {@const nodes = columnedNodes[col.key]}
        <div class="pipeline-kanban__column pipeline-kanban__column--{col.key}">
          <div class="pipeline-kanban__column-header">
            <Icon
              icon={col.icon}
              class="pipeline-kanban__col-icon pipeline-kanban__col-icon--{col.key}"
            />
            <span class="pipeline-kanban__col-label">{col.label}</span>
            <span class="pipeline-kanban__col-count">{nodes.length}</span>
          </div>
          <div class="pipeline-kanban__cards">
            {#each nodes as node (node.id)}
              <div class="pipeline-kanban__card pipeline-kanban__card--{col.key}">
                <div class="pipeline-kanban__card-body">
                  <span class="pipeline-kanban__card-label">{node.data.label}</span>
                  <span class="pipeline-kanban__card-type">{node.data.metadata.id}</span>
                </div>
              </div>
            {/each}
            {#if nodes.length === 0}
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
    min-width: 140px;
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
  }

  :global(.pipeline-kanban__col-icon--pending) {
    color: var(--fd-muted-foreground);
  }

  :global(.pipeline-kanban__col-icon--running) {
    color: var(--fd-warning);
  }

  :global(.pipeline-kanban__col-icon--completed) {
    color: var(--fd-success);
  }

  :global(.pipeline-kanban__col-icon--failed) {
    color: var(--fd-error);
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
    gap: var(--fd-space-xs);
    padding: var(--fd-space-sm);
    border-radius: var(--fd-radius-sm);
    border: 1px solid var(--fd-border);
    border-left-width: 3px;
    background-color: var(--fd-card);
    font-size: var(--fd-text-xs);
  }

  .pipeline-kanban__card--pending {
    border-left-color: var(--fd-border);
  }

  .pipeline-kanban__card--running {
    border-left-color: var(--fd-warning);
  }

  .pipeline-kanban__card--completed {
    border-left-color: var(--fd-success);
  }

  .pipeline-kanban__card--failed {
    border-left-color: var(--fd-error);
  }

  .pipeline-kanban__card-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .pipeline-kanban__card-label {
    font-weight: 500;
    color: var(--fd-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pipeline-kanban__card-type {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-2xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pipeline-kanban__empty {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    text-align: center;
    padding: var(--fd-space-md);
  }
</style>
