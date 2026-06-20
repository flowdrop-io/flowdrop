<script module lang="ts">
  import type { NodeStatus } from './pipelineViewUtils.svelte.js';

  const STATUS_ORDER: Record<NodeStatus, number> = {
    running: 0,
    paused: 1,
    interrupted: 2,
    pending: 3,
    idle: 4,
    completed: 5,
    skipped: 6,
    cancelled: 7,
    failed: 8
  };

  const STATUS_ICON: Record<NodeStatus, string> = {
    running: 'mdi:play-circle-outline',
    paused: 'mdi:pause-circle-outline',
    interrupted: 'mdi:account-clock-outline',
    completed: 'mdi:check-circle',
    skipped: 'mdi:skip-next-circle-outline',
    failed: 'mdi:alert-circle',
    cancelled: 'mdi:cancel',
    pending: 'mdi:clock-outline',
    idle: 'mdi:circle-outline'
  };

  function formatDateTime(iso: string | null | undefined): string | null {
    if (!iso) return null;
    return new Date(iso).toLocaleString();
  }

  function formatJson(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  /** Treat null/undefined and empty objects/arrays as "nothing to show". */
  function hasData(value: unknown): boolean {
    if (value == null) return false;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return value !== '';
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import { createPipelineDataFetcher, resolveStatus } from './pipelineViewUtils.svelte.js';
  import { getStatusTextColor } from '$lib/utils/nodeStatus.js';
  import { formatMicroseconds } from '$lib/utils/duration.js';
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

  interface JobRow {
    /** Stable key: job id, or node id for nodes without a job yet */
    key: string;
    label: string;
    typeId: string;
    nodeId: string;
    status: NodeStatus;
    started?: string | null;
    completed?: string | null;
    /** Duration in microseconds */
    executionTimeUs?: number | null;
    error?: string | null;
    retryCount?: number | null;
    maxRetries?: number | null;
    inputData?: unknown;
    outputData?: unknown;
  }

  // endpointConfig is consumed once to build the API client; it must be stable
  // svelte-ignore state_referenced_locally
  const fetcher = createPipelineDataFetcher(() => pipelineId, endpointConfig, authProvider);

  $effect(() => {
    if (refreshTrigger <= 0) return;
    const timer = setTimeout(() => fetcher.fetchData(), 300);
    return () => clearTimeout(timer);
  });

  // One row per job, timeline style: loop iterations create multiple jobs
  // for the same node and each shows as its own row (label carries the #N
  // suffix). Executed jobs sort by start time; never-started jobs keep
  // pipeline order at the end, followed by nodes that have no job yet.
  const sortedRows = $derived.by((): JobRow[] => {
    const nodesById = new Map<string, WorkflowNode>(workflow.nodes.map((node) => [node.id, node]));

    const jobRows: JobRow[] = [];
    const nodesWithJobs = new Set<string>();
    for (const job of fetcher.jobs) {
      const node = nodesById.get(job.nodeId);
      if (!node) continue;
      nodesWithJobs.add(job.nodeId);
      jobRows.push({
        key: job.id,
        label: job.label || node.data.label,
        typeId: node.data.metadata.node_type_id,
        nodeId: job.nodeId,
        status: resolveStatus({ status: job.status }),
        started: job.started,
        completed: job.completed,
        executionTimeUs: job.executionTimeUs,
        error: job.error,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        inputData: job.inputData,
        outputData: job.outputData
      });
    }

    const startedRows = jobRows
      .filter((row) => row.started)
      .sort((a, b) => Date.parse(a.started!) - Date.parse(b.started!));
    const neverStartedRows = jobRows.filter((row) => !row.started);

    const nodeRows: JobRow[] = workflow.nodes
      .filter((node) => !nodesWithJobs.has(node.id))
      .map((node) => {
        const statusData = fetcher.nodeStatusMap[node.id];
        return {
          key: node.id,
          label: node.data.label,
          typeId: node.data.metadata.node_type_id,
          nodeId: node.id,
          status: resolveStatus(statusData),
          started: statusData?.last_executed,
          executionTimeUs:
            statusData?.execution_time_us ??
            (statusData?.execution_time != null ? statusData.execution_time * 1000 : null),
          error: statusData?.error
        };
      })
      .sort((a, b) => (STATUS_ORDER[a.status] ?? Infinity) - (STATUS_ORDER[b.status] ?? Infinity));

    return [...startedRows, ...neverStartedRows, ...nodeRows];
  });

  let expandedIds = $state(new Set<string>());

  function hasDetails(row: JobRow): boolean {
    return !!(row.started || row.error || hasData(row.inputData) || hasData(row.outputData));
  }

  function toggleRow(row: JobRow) {
    if (!hasDetails(row)) return;
    const next = new Set(expandedIds);
    if (next.has(row.key)) {
      next.delete(row.key);
    } else {
      next.add(row.key);
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
            <th class="pipeline-table__th pipeline-table__th--duration">Duration</th>
            <th class="pipeline-table__th pipeline-table__th--id">ID</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedRows as row (row.key)}
            {@const expanded = expandedIds.has(row.key)}
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
                    class="pipeline-table__chevron {expanded
                      ? 'pipeline-table__chevron--open'
                      : ''}"
                  />
                {/if}
              </td>
              <td class="pipeline-table__td pipeline-table__td--label" title={row.label}
                >{row.label}</td
              >
              <td class="pipeline-table__td pipeline-table__td--muted" title={row.typeId}
                >{row.typeId}</td
              >
              <td class="pipeline-table__td">
                <span
                  class="pipeline-table__status"
                  style="color: {getStatusTextColor(row.status)}"
                >
                  <Icon
                    icon={STATUS_ICON[row.status] ?? 'mdi:circle-outline'}
                    class="pipeline-table__status-icon"
                  />
                  {row.status}
                </span>
              </td>
              <td class="pipeline-table__td pipeline-table__td--duration">
                {formatMicroseconds(row.executionTimeUs) ?? '—'}
              </td>
              <td class="pipeline-table__td pipeline-table__td--id" title={row.nodeId}
                >{row.nodeId}</td
              >
            </tr>
            {#if expanded && expandable}
              <tr class="pipeline-table__detail-row">
                <td colspan="6" class="pipeline-table__detail-cell">
                  <dl class="pipeline-table__details">
                    {#if row.started}
                      <div class="pipeline-table__detail-item">
                        <dt>Started</dt>
                        <dd>{formatDateTime(row.started)}</dd>
                      </div>
                    {/if}
                    {#if row.completed}
                      <div class="pipeline-table__detail-item">
                        <dt>Completed</dt>
                        <dd>{formatDateTime(row.completed)}</dd>
                      </div>
                    {/if}
                    {#if row.executionTimeUs != null}
                      <div class="pipeline-table__detail-item">
                        <dt>Duration</dt>
                        <dd>{formatMicroseconds(row.executionTimeUs)}</dd>
                      </div>
                    {/if}
                    {#if row.retryCount != null && row.retryCount > 0}
                      <div class="pipeline-table__detail-item">
                        <dt>Retries</dt>
                        <dd>
                          {row.retryCount}{row.maxRetries != null ? ` / ${row.maxRetries}` : ''}
                        </dd>
                      </div>
                    {/if}
                    {#if row.error}
                      <div class="pipeline-table__detail-item pipeline-table__detail-item--error">
                        <dt>Error</dt>
                        <dd>{row.error}</dd>
                      </div>
                    {/if}
                  </dl>
                  {#if hasData(row.inputData)}
                    <details class="pipeline-table__data">
                      <summary class="pipeline-table__data-summary">Input data</summary>
                      <pre class="pipeline-table__data-pre">{formatJson(row.inputData)}</pre>
                    </details>
                  {/if}
                  {#if hasData(row.outputData)}
                    <details class="pipeline-table__data">
                      <summary class="pipeline-table__data-summary">Output data</summary>
                      <pre class="pipeline-table__data-pre">{formatJson(row.outputData)}</pre>
                    </details>
                  {/if}
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

  .pipeline-table__th--duration,
  .pipeline-table__td--duration {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .pipeline-table__td--duration {
    font-family: var(--fd-font-mono, monospace);
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
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
    padding: var(--fd-space-sm) var(--fd-space-md) var(--fd-space-sm)
      calc(1.5rem + var(--fd-space-md));
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

  .pipeline-table__data {
    margin-top: var(--fd-space-sm);
  }

  .pipeline-table__data-summary {
    cursor: pointer;
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fd-muted-foreground);
    user-select: none;
  }

  .pipeline-table__data-summary:hover {
    color: var(--fd-foreground);
  }

  .pipeline-table__data-pre {
    margin: var(--fd-space-2xs) 0 0;
    padding: var(--fd-space-sm);
    max-height: 16rem;
    overflow: auto;
    font-family: var(--fd-font-mono, monospace);
    font-size: var(--fd-text-2xs);
    background-color: var(--fd-muted);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm, 4px);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .pipeline-table__status {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    font-weight: 500;
    text-transform: capitalize;
  }

  :global(.pipeline-table__status-icon) {
    font-size: var(--fd-text-sm);
    flex-shrink: 0;
  }
</style>
