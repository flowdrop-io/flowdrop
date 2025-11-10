<!--
  Pipeline Status Component
  Displays workflow execution status using the App component in read-only mode
  Styled with BEM syntax
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import App from './App.svelte';
	import LogsSidebar from './LogsSidebar.svelte';
	import { FlowDropApiClient } from '$lib/api/client.js';
	import type { Workflow } from '$lib/types/index.js';
	import type { EndpointConfig } from '$lib/config/endpoints.js';

	interface Props {
		pipelineId: string;
		workflow: Workflow;
		apiClient?: FlowDropApiClient;
		baseUrl?: string;
		endpointConfig?: EndpointConfig;
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

	let { pipelineId, workflow, apiClient, baseUrl, endpointConfig, onActionsReady }: Props = $props();

	// Initialize API client if not provided
	const client = apiClient || new FlowDropApiClient(endpointConfig?.baseUrl || baseUrl || "/api/flowdrop");

	// Pipeline status and job data
	let pipelineStatus = $state<string>('unknown');
	let jobStatusData = $state<{
		jobs: any[];
		node_statuses: Record<string, any>;
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

			// Update node statuses based on job data
			if (jobStatusData.node_statuses) {
				const newNodeStatuses: Record<string, 'pending' | 'running' | 'completed' | 'error'> = {};

				// Initialize all nodes as pending
				if (workflow && workflow.nodes) {
					workflow.nodes.forEach((node) => {
						newNodeStatuses[node.id] = 'pending';
					});
				}

				// Override with actual job statuses
				for (const nodeId in jobStatusData.node_statuses) {
					const status = jobStatusData.node_statuses[nodeId].status;
					if (['pending', 'running', 'completed', 'failed', 'cancelled'].includes(status)) {
						newNodeStatuses[nodeId] = status === 'failed' ? 'error' : status;
					}
				}
				nodeStatuses = newNodeStatuses;
			}

			addLog('info', `Job status updated: ${jobStatusData.status_summary.total} total jobs`);
		} catch (error) {
			console.error('Failed to fetch pipeline data:', error);
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
		return [
			{
				label: isLoadingJobStatus ? 'Refreshing...' : 'Refresh Status',
				href: '#refresh',
				icon: isLoadingJobStatus ? 'mdi:loading' : 'mdi:refresh',
				variant: 'outline' as const,
				onclick: (e: Event) => {
					e.preventDefault();
					fetchPipelineData();
				}
			},
			{
				label: 'View Logs',
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

	// Send pipeline breadcrumbs to layout when they change
	$effect(() => {
		if (pipelineStatus && pipelineId && workflow) {
			const breadcrumbs = [
				{
					label: 'Home',
					href: '/',
					icon: 'mdi:home'
				},
				{
					label: 'Workflows',
					href: '/',
					icon: 'mdi:view-list'
				},
				{
					label: workflow.name || 'Workflow',
					href: `/workflow/${workflow.id}/edit`,
					icon: 'mdi:workflow'
				},
				{
					label: 'Pipelines',
					href: `/workflow/${workflow.id}/pipelines`,
					icon: 'mdi:source-branch'
				},
				{
					label: `Pipeline ${pipelineId} - ${pipelineStatus}`,
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

	// Cleanup on unmount
	onMount(() => {
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
				refreshInterval = null;
			}
		};
	});
</script>

<div class="pipeline-status-container">
	<!-- Workflow Visualization using App component -->
	<App
		{workflow}
		height="100vh"
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
		background: #f3f4f6;
	}
</style>
