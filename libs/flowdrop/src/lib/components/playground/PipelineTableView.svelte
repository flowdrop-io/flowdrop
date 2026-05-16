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

  function formatDuration(ms: number | null | undefined): string | null {
    if (ms == null) return null;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  function formatDateTime(iso: string | null | undefined): string | null {
    if (!iso) return null;
    return new Date(iso).toLocaleString();
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import { createPipelineDataFetcher, resolveStatus } from './pipelineViewUtils.svelte.js';
  import type { NodeStatusData } from './pipelineViewUtils.svelte.js';
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
    statusData: NodeStatusData | undefined;
  }

  const fetcher = createPipelineDataFetcher(
    () => pipelineId,
    () => endpointConfig
  );

  fetcher.connectRefreshTrigger(() => refreshTrigger);

  const sortedRows = $derived.by((): NodeRow[] =>
    workflow.nodes
      .map((node) => {
        const statusData = fetcher.nodeStatusMap[node.id];
        return { node, status: resolveStatus(statusData), statusData };
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  );

  let expandedIds = $state(new Set<string>());

  function hasDetails(row: NodeRow): boolean {
    return !!(row.statusData?.last_executed || row.statusData?.error);
  }

  function toggleRow(row: NodeRow) {
    if (!hasDetails(row)) return;
    const next = new Set(expandedIds);
    if (next.has(row.node.id)) {
      next.delete(row.node.id);
    } else {
      next.add(row.node.id);
    }
    expandedIds = next;
  }

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
            <th class="pipeline-table__th pipeline-table__th--expand"></th>
            <th class="pipeline-table__th">Node</th>
            <th class="pipeline-table__th">Type</th>
            <th class="pipeline-table__th">Status</th>
            <th class="pipeline-table__th pipeline-table__th--id">ID</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedRows as row (row.node.id)}
            {@const expanded = expandedIds.has(row.node.id)}
            {@const expandable = hasDetails(row)}
            <tr
              class="pipeline-table__row"
              class:pipeline-table__row--expandable={expandable}
              class:pipeline-table__row--expanded={expanded}
              onclick={() => toggleRow(row)}
            >
              <td class="pipeline-table__td pipeline-table__td--expand">
                {#if expandable}
                  <Icon
                    icon="mdi:chevron-right"
                    class="pipeline-table__chevron {expanded ? 'pipeline-table__chevron--open' : ''}"
                  />
                {/if}
              </td>
              <td class="pipeline-table__td pipeline-table__td--label" title={row.node.data.label}>{row.node.data.label}</td>
              <td class="pipeline-table__td pipeline-table__td--muted" title={row.node.data.metadata.id}>{row.node.data.metadata.id}</td>
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
            {#if expanded && expandable}
              <tr class="pipeline-table__detail-row">
                <td colspan="5" class="pipeline-table__detail-cell">
                  <dl class="pipeline-table__details">
                    {#if row.statusData?.last_executed}
                      <div class="pipeline-table__detail-item">
                        <dt>Last executed</dt>
                        <dd>{formatDateTime(row.statusData.last_executed)}</dd>
                      </div>
                    {/if}
                    {#if row.statusData?.execution_time != null}
                      <div class="pipeline-table__detail-item">
                        <dt>Duration</dt>
                        <dd>{formatDuration(row.statusData.execution_time)}</dd>
                      </div>
                    {/if}
                    {#if row.statusData?.error}
                      <div class="pipeline-table__detail-item pipeline-table__detail-item--error">
                        <dt>Error</dt>
                        <dd>{row.statusData.error}</dd>
                      </div>
                    {/if}
                  </dl>
                </td>
              </tr>
            {/if}
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

  .pipeline-table__th--expand {
    width: 1.5rem;
    padding-right: 0;
  }

  .pipeline-table__row--expandable {
    cursor: pointer;
  }

  .pipeline-table__row--expandable:hover,
  .pipeline-table__row--expanded:hover {
    background-color: var(--fd-muted);
  }

  .pipeline-table__row--expanded {
    background-color: color-mix(in srgb, var(--fd-muted) 60%, transparent);
  }

  .pipeline-table__td {
    padding: var(--fd-space-sm) var(--fd-space-md);
    color: var(--fd-foreground);
    border-bottom: 1px solid var(--fd-border);
  }

  .pipeline-table__td--expand {
    padding-right: 0;
    width: 1.5rem;
    color: var(--fd-muted-foreground);
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

  :global(.pipeline-table__chevron) {
    font-size: var(--fd-text-sm);
    transition: transform 0.15s ease;
    display: block;
  }

  :global(.pipeline-table__chevron--open) {
    transform: rotate(90deg);
  }

  .pipeline-table__detail-row {
    background-color: color-mix(in srgb, var(--fd-muted) 40%, transparent);
  }

  .pipeline-table__detail-cell {
    padding: var(--fd-space-sm) var(--fd-space-md) var(--fd-space-sm) calc(1.5rem + var(--fd-space-md));
    border-bottom: 1px solid var(--fd-border);
  }

  .pipeline-table__details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-sm) var(--fd-space-xl);
    margin: 0;
  }

  .pipeline-table__detail-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pipeline-table__detail-item dt {
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fd-muted-foreground);
  }

  .pipeline-table__detail-item dd {
    font-size: var(--fd-text-xs);
    color: var(--fd-foreground);
    margin: 0;
  }

  .pipeline-table__detail-item--error dt {
    color: var(--fd-error);
  }

  .pipeline-table__detail-item--error dd {
    color: var(--fd-error);
    font-family: var(--fd-font-mono, monospace);
    font-size: var(--fd-text-2xs);
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
