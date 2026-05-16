<script module lang="ts">
  import type { NodeStatus } from './pipelineViewUtils.svelte.js';

  const STATUS_ORDER: Record<NodeStatus, number> = {
    running: 0,
    pending: 1,
    completed: 2,
    failed: 3
  };

  const STATUS_ICON: Record<NodeStatus, string> = {
    running: 'mdi:play-circle-outline',
    completed: 'mdi:check-circle',
    failed: 'mdi:alert-circle',
    pending: 'mdi:clock-outline'
  };
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

  interface NodeRow {
    node: WorkflowNode;
    status: NodeStatus;
  }

  const fetcher = createPipelineDataFetcher(
    () => pipelineId,
    () => endpointConfig
  );

  fetcher.connectRefreshTrigger(() => refreshTrigger);

  const sortedRows = $derived.by((): NodeRow[] =>
    workflow.nodes
      .map((node) => ({ node, status: resolveStatus(fetcher.nodeStatusMap[node.id]) }))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  );

  onMount(() => {
    fetcher.fetchData();
  });
</script>

<div class="pipeline-table">
  {#if fetcher.isError}
    <div class="pipeline-table__error">Could not refresh status data</div>
  {/if}
  {#if fetcher.isLoading && Object.keys(fetcher.nodeStatusMap).length === 0}
    <div class="pipeline-table__loading">
      <Icon icon="mdi:loading" class="pipeline-table__spinner" />
    </div>
  {:else}
    <div class="pipeline-table__wrap">
      <table class="pipeline-table__table">
        <thead class="pipeline-table__thead">
          <tr>
            <th class="pipeline-table__th">Node</th>
            <th class="pipeline-table__th">Type</th>
            <th class="pipeline-table__th">Status</th>
            <th class="pipeline-table__th pipeline-table__th--id">ID</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedRows as row (row.node.id)}
            <tr class="pipeline-table__row">
              <td class="pipeline-table__td pipeline-table__td--label" title={row.node.data.label}>{row.node.data.label}</td>
              <td class="pipeline-table__td pipeline-table__td--muted" title={row.node.type}>{row.node.type}</td>
              <td class="pipeline-table__td">
                <span class="pipeline-table__status pipeline-table__status--{row.status}">
                  <Icon
                    icon={STATUS_ICON[row.status]}
                    class="pipeline-table__status-icon"
                  />
                  {row.status}
                </span>
              </td>
              <td class="pipeline-table__td pipeline-table__td--id" title={row.node.id}>{row.node.id}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .pipeline-table {
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .pipeline-table__error {
    padding: var(--fd-space-xs) var(--fd-space-md);
    font-size: var(--fd-text-2xs);
    color: var(--fd-error);
    background-color: color-mix(in srgb, var(--fd-error) 8%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--fd-error) 20%, transparent);
    flex-shrink: 0;
  }

  .pipeline-table__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--fd-muted-foreground);
  }

  :global(.pipeline-table__spinner) {
    font-size: 1.5rem;
    animation: table-spin 1s linear infinite;
  }

  @keyframes table-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .pipeline-table__wrap {
    flex: 1;
    overflow-y: auto;
  }

  .pipeline-table__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fd-text-xs);
  }

  .pipeline-table__thead {
    position: sticky;
    top: 0;
    background-color: var(--fd-muted);
    z-index: 1;
  }

  .pipeline-table__th {
    text-align: left;
    padding: var(--fd-space-sm) var(--fd-space-md);
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fd-muted-foreground);
    border-bottom: 1px solid var(--fd-border);
    white-space: nowrap;
  }

  .pipeline-table__th--id {
    font-family: var(--fd-font-mono, monospace);
  }

  .pipeline-table__row:hover {
    background-color: var(--fd-muted);
  }

  .pipeline-table__td {
    padding: var(--fd-space-sm) var(--fd-space-md);
    color: var(--fd-foreground);
    border-bottom: 1px solid var(--fd-border);
  }

  .pipeline-table__td--label,
  .pipeline-table__td--muted {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pipeline-table__td--muted {
    color: var(--fd-muted-foreground);
  }

  .pipeline-table__td--id {
    font-family: var(--fd-font-mono, monospace);
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
  }

  .pipeline-table__status {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    font-weight: 500;
    text-transform: capitalize;
  }

  .pipeline-table__status--pending {
    color: var(--fd-muted-foreground);
  }

  .pipeline-table__status--running {
    color: var(--fd-warning);
  }

  .pipeline-table__status--completed {
    color: var(--fd-success);
  }

  .pipeline-table__status--failed {
    color: var(--fd-error);
  }

  :global(.pipeline-table__status-icon) {
    font-size: var(--fd-text-sm);
    flex-shrink: 0;
  }
</style>
