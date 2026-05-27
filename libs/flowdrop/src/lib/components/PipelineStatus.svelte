<!--
  Pipeline Status Component
  Displays workflow execution status using the App component in read-only mode
  Styled with BEM syntax
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import App from './App.svelte';
  import LogsSidebar from './LogsSidebar.svelte';
  import { EnhancedFlowDropApiClient } from '$lib/api/enhanced-client.js';
  import { createEndpointConfig } from '$lib/config/endpoints.js';
  import type { Workflow } from '$lib/types/index.js';
  import type { EndpointConfig } from '$lib/config/endpoints.js';
  import { logger } from '../utils/logger.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    pipelineId: string;
    workflow: Workflow;
    apiClient?: EnhancedFlowDropApiClient;
    baseUrl?: string;
    endpointConfig?: EndpointConfig;
    runLabel?: string;
    /** When true, suppresses breadcrumb and layout events (used inside playground panel) */
    isEmbedded?: boolean;
    /** Increments when new messages arrive — triggers an immediate pipeline data refresh */
    refreshTrigger?: number;
    onActionsReady?: (
      actions: Array<{
        label: string;
        href: string;
        icon?: string;
        variant?: 'primary' | 'secondary' | 'outline';
        onclick?: (event: Event) => void;
      }>
    ) => void;
  }

  let {
    pipelineId,
    workflow,
    apiClient,
    baseUrl,
    endpointConfig,
    onActionsReady,
    runLabel,
    isEmbedded = false,
    refreshTrigger = 0
  }: Props = $props();

  // Track previous trigger value so the $effect only fires on increments, not on initial mount.
  // svelte-ignore state_referenced_locally
  let _prevRefreshTrigger = refreshTrigger;

  // Initialize API client if not provided
  // svelte-ignore state_referenced_locally — client created once from props
  const client =
    apiClient ||
    new EnhancedFlowDropApiClient(
      endpointConfig ?? createEndpointConfig(baseUrl || '/api/flowdrop')
    );

  // Pipeline status and job data
  let pipelineStatus = $state<string>('unknown');
  interface PipelineNodeStatus {
    status: string;
    [key: string]: unknown;
  }

  let jobStatusData = $state<{
    jobs: Record<string, unknown>[];
    node_statuses: Record<string, PipelineNodeStatus>;
    status_summary: {
      total: number;
      pending: number;
      running: number;
      completed: number;
      failed: number;
      cancelled: number;
    };
  }>({
    jobs: [],
    node_statuses: {},
    status_summary: {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    }
  });

  // Node statuses for visual indicators
  let nodeStatuses = $state<Record<string, 'pending' | 'running' | 'completed' | 'error'>>({});

  // Loading and error states
  let isLoadingJobStatus = $state(false);

  // Logs sidebar state
  let isLogsSidebarOpen = $state(false);
  let logs = $state<Array<{ level: string; message: string; timestamp: string }>>([]);

  /**
   * Fetch pipeline data including job information
   */
  async function fetchPipelineData(): Promise<void> {
    if (!pipelineId) return;

    try {
      isLoadingJobStatus = true;
      const pipelineData = await client.getPipelineData(pipelineId);

      pipelineStatus = pipelineData.status;
      jobStatusData = {
        jobs: pipelineData.jobs || [],
        node_statuses: pipelineData.node_statuses || {},
        status_summary: pipelineData.job_status_summary || {
          total: 0,
          pending: 0,
          running: 0,
          completed: 0,
          failed: 0,
          cancelled: 0
        }
      };

      // Update node statuses based on job data — only set what the server reported
      if (jobStatusData.node_statuses) {
        const newNodeStatuses: Record<string, 'pending' | 'running' | 'completed' | 'error'> = {};

        for (const nodeId in jobStatusData.node_statuses) {
          const status = jobStatusData.node_statuses[nodeId].status;
          if (status === 'failed' || status === 'cancelled') {
            newNodeStatuses[nodeId] = 'error';
          } else if (status === 'running' || status === 'paused' || status === 'interrupted') {
            newNodeStatuses[nodeId] = 'running';
          } else if (status === 'completed' || status === 'skipped') {
            newNodeStatuses[nodeId] = 'completed';
          } else if (status === 'pending' || status === 'idle') {
            newNodeStatuses[nodeId] = 'pending';
          }
        }
        nodeStatuses = newNodeStatuses;
      }

      addLog('info', `Job status updated: ${jobStatusData.status_summary.total} total jobs`);
    } catch (error) {
      logger.error('Failed to fetch pipeline data:', error);
      addLog(
        'error',
        `Failed to fetch pipeline data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      isLoadingJobStatus = false;
    }
  }

  /**
   * Add a log entry
   */
  function addLog(level: string, message: string): void {
    logs = [
      ...logs,
      {
        level,
        message,
        timestamp: new Date().toISOString()
      }
    ];
  }

  /**
   * Toggle logs sidebar
   */
  function toggleLogsSidebar(): void {
    isLogsSidebarOpen = !isLogsSidebarOpen;
  }

  /**
   * Get pipeline actions for the parent navbar
   */
  function getPipelineActions() {
    const sp = m().status.pipeline;
    return [
      {
        label: isLoadingJobStatus ? sp.refreshing : sp.refresh,
        href: '#refresh',
        icon: isLoadingJobStatus ? 'mdi:loading' : 'mdi:refresh',
        variant: 'outline' as const,
        onclick: (e: Event) => {
          e.preventDefault();
          fetchPipelineData();
        }
      },
      {
        label: sp.viewLogs,
        href: '#logs',
        icon: 'mdi:file-document-outline',
        variant: 'outline' as const,
        onclick: (e: Event) => {
          e.preventDefault();
          toggleLogsSidebar();
        }
      }
    ];
  }

  // Fetch pipeline data on mount
  onMount(() => {
    fetchPipelineData();
    // Expose actions to parent
    if (onActionsReady) {
      onActionsReady(getPipelineActions());
    }

    // Listen for custom events from the layout navbar
    const handleRefresh = () => fetchPipelineData();
    const handleViewLogs = () => toggleLogsSidebar();

    window.addEventListener('pipeline-refresh', handleRefresh);
    window.addEventListener('pipeline-view-logs', handleViewLogs);

    return () => {
      window.removeEventListener('pipeline-refresh', handleRefresh);
      window.removeEventListener('pipeline-view-logs', handleViewLogs);
    };
  });

  // Send pipeline breadcrumbs to layout when they change (skip when embedded in playground)
  $effect(() => {
    if (isEmbedded) return;
    if (pipelineStatus && pipelineId && workflow) {
      const sp = m().status.pipeline;
      const breadcrumbs = [
        {
          label: sp.home,
          href: '/',
          icon: 'mdi:home'
        },
        {
          label: sp.workflows,
          href: '/',
          icon: 'mdi:view-list'
        },
        {
          label: workflow.name || sp.workflow,
          href: `/workflow/${workflow.id}/edit`,
          icon: 'mdi:workflow'
        },
        {
          label: sp.pipelines,
          href: `/workflow/${workflow.id}/pipelines`,
          icon: 'mdi:source-branch'
        },
        {
          label: runLabel
            ? `${runLabel} – ${pipelineStatus}`
            : sp.pipelineCrumb({ id: pipelineId, status: pipelineStatus }),
          icon: 'mdi:play-circle'
        }
      ];

      window.dispatchEvent(
        new CustomEvent('page-breadcrumbs-update', {
          detail: { breadcrumbs }
        })
      );
    }
  });

  // Update actions when loading state changes
  $effect(() => {
    if (onActionsReady) {
      onActionsReady(getPipelineActions());
    }
  });

  // Auto-refresh pipeline data every 5 seconds when pipeline is running
  let refreshInterval: NodeJS.Timeout | null = null;

  $effect(() => {
    // Clear existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }

    // Only start polling if pipeline is running
    if (pipelineStatus === 'running' && pipelineId) {
      refreshInterval = setInterval(() => {
        fetchPipelineData();
      }, 5000);
    }
  });

  // Note: Interval cleanup is handled by the $effect above.
  // In Svelte 5, $effect cleanup runs both on re-execution and component destroy.

  // Refresh pipeline data whenever new messages arrive (e.g. log messages during execution).
  // Debounced so burst arrivals collapse into one fetch.
  $effect(() => {
    const t = refreshTrigger;
    if (t <= 0 || t === _prevRefreshTrigger) return;
    _prevRefreshTrigger = t;
    const timer = setTimeout(fetchPipelineData, 300);
    return () => clearTimeout(timer);
  });
</script>

<div class="pipeline-status-container" class:pipeline-status-container--embedded={isEmbedded}>
  <!-- Workflow Visualization using App component -->
  <App
    {workflow}
    height={isEmbedded ? '100%' : '100vh'}
    width="100%"
    showNavbar={false}
    disableSidebar={true}
    lockWorkflow={true}
    readOnly={true}
    {nodeStatuses}
    {pipelineId}
    {endpointConfig}
  />

  <!-- Logs Sidebar -->
  {#if isLogsSidebarOpen}
    <LogsSidebar {logs} isOpen={isLogsSidebarOpen} onClose={() => (isLogsSidebarOpen = false)} />
  {/if}
</div>

<style>
  .pipeline-status-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--fd-layout-background, var(--fd-muted));
  }

  .pipeline-status-container--embedded {
    height: 100%;
    background: var(--fd-muted);
    --fd-layout-background: var(--fd-muted);
  }
</style>
