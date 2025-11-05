<!--
  Pipeline Status Page
  Real-time monitoring of a specific pipeline execution
  Uses PipelineStatus component for visualization
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import PipelineStatus from '$lib/components/PipelineStatus.svelte';
	import { getEndpointUrl } from '$lib/config/apiConfig';
	import { getDevApiConfig } from '../../../../devConfig';
	import { setEndpointConfig, api } from '$lib/services/api.js';
	import { createEndpointConfig } from '$lib/config/endpoints.js';
	import type { Workflow, NodeMetadata } from '$lib/types/index.js';
	import Icon from '@iconify/svelte';

	// Get API configuration from development config (uses .env if available)
	const devConfig = getDevApiConfig();
	const apiConfig = devConfig;

	// Initialize API service with development config
	const endpointConfig = createEndpointConfig(devConfig.baseUrl, {
		auth: { type: 'none' },
		timeout: 30000
	});
	setEndpointConfig(endpointConfig);

	let workflowId = $derived($page.params.id);
	let pipelineId = $derived($page.params.pipelineId);

	// Data state
	let workflow = $state<Workflow | null>(null);
	let pipeline = $state<any>(null);
	let nodes = $state<NodeMetadata[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let executionStatus = $state<string>('idle');
	let executionLogs = $state<any[]>([]);

	// Fetch workflow and pipeline data
	async function fetchData() {
		if (!workflowId || !pipelineId) {
			error = 'Missing workflow or pipeline ID';
			loading = false;
			return;
		}

		try {
			loading = true;
			error = null;

			// Fetch workflow
			const workflowUrl = getEndpointUrl(apiConfig, '/workflows/{id}', { id: workflowId });
			const workflowResponse = await fetch(workflowUrl);
			if (!workflowResponse.ok) {
				throw new Error(`Failed to fetch workflow: ${workflowResponse.statusText}`);
			}
			const workflowData = await workflowResponse.json();
			// Extract the actual workflow data from the API response structure
			workflow = workflowData.success && workflowData.data ? workflowData.data : workflowData;

			// Fetch pipeline
			const pipelineUrl = getEndpointUrl(apiConfig, '/pipeline/{id}', { id: pipelineId });
			const pipelineResponse = await fetch(pipelineUrl);
			if (!pipelineResponse.ok) {
				throw new Error(`Failed to fetch pipeline: ${pipelineResponse.statusText}`);
			}
			pipeline = await pipelineResponse.json();

			// Fetch nodes
			const nodesUrl = getEndpointUrl(apiConfig, '/nodes');
			const nodesResponse = await fetch(nodesUrl);
			if (!nodesResponse.ok) {
				throw new Error(`Failed to fetch nodes: ${nodesResponse.statusText}`);
			}
			const nodesData = await nodesResponse.json();
			nodes = nodesData.nodes || [];
		} catch (err) {
			console.error('Failed to fetch data:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch data';
		} finally {
			loading = false;
		}
	}

	// Load data on mount
	onMount(() => {
		fetchData();
	});

	function handleBackToPipelines() {
		goto(`/workflow/${workflowId}/pipelines`);
	}

	function handleBackToWorkflow() {
		goto(`/workflow/${workflowId}/edit`);
	}

	// Pipeline execution handlers
	function handleExecutePipeline() {
		console.log('Execute pipeline:', pipelineId);
		executionStatus = 'running';
		// TODO: Implement actual pipeline execution
	}

	function handleStopPipeline() {
		console.log('Stop pipeline:', pipelineId);
		executionStatus = 'idle';
		// TODO: Implement actual pipeline stop
	}

	// Configure endpoints once on mount
	onMount(() => {
		setEndpointConfig({
			baseUrl: apiConfig.baseUrl,
			endpoints: {
				nodes: {
					list: '/api/flowdrop/nodes',
					get: '/api/flowdrop/nodes/{id}',
					byCategory: '/api/flowdrop/nodes/category/{category}',
					metadata: '/api/flowdrop/nodes/{id}/metadata'
				},
				portConfig: '/api/flowdrop/port-config',
				workflows: {
					list: '/api/flowdrop/workflows',
					get: '/api/flowdrop/workflows/{id}',
					create: '/api/flowdrop/workflows',
					update: '/api/flowdrop/workflows/{id}',
					delete: '/api/flowdrop/workflows/{id}',
					validate: '/api/flowdrop/workflows/{id}/validate',
					export: '/api/flowdrop/workflows/{id}/export',
					import: '/api/flowdrop/workflows/import'
				},
				executions: {
					execute: '/api/flowdrop/executions/execute',
					status: '/api/flowdrop/executions/{id}/status',
					cancel: '/api/flowdrop/executions/{id}/cancel',
					logs: '/api/flowdrop/executions/{id}/logs',
					history: '/api/flowdrop/executions/history'
				},
				templates: {
					list: '/api/flowdrop/templates',
					get: '/api/flowdrop/templates/{id}',
					create: '/api/flowdrop/templates',
					update: '/api/flowdrop/templates/{id}',
					delete: '/api/flowdrop/templates/{id}'
				},
				users: {
					profile: '/api/flowdrop/users/profile',
					preferences: '/api/flowdrop/users/preferences'
				},
				system: {
					health: '/api/flowdrop/system/health',
					config: '/api/flowdrop/system/config',
					version: '/api/flowdrop/system/version'
				},
				pipelines: {
					list: '/api/flowdrop/workflow/{workflow_id}/pipelines',
					get: '/api/flowdrop/pipeline/{id}',
					create: '/api/flowdrop/pipeline',
					update: '/api/flowdrop/pipeline/{id}',
					delete: '/api/flowdrop/pipeline/{id}',
					status: '/api/flowdrop/pipeline/{id}/status',
					logs: '/api/flowdrop/pipeline/{id}/logs',
					execute: '/api/flowdrop/pipeline/{id}/execute',
					stop: '/api/flowdrop/pipeline/{id}/stop'
				}
			}
		});
	});
</script>

<svelte:head>
	<title>Pipeline Status - {pipeline?.name || pipelineId} - FlowDrop</title>
</svelte:head>

<div class="pipeline-status-page">
	<!-- Content -->
	<div class="pipeline-status-content">
		{#if loading}
			<div class="pipeline-status-loading">
				<Icon icon="mdi:loading" class="pipeline-status-loading__icon" />
				<p class="pipeline-status-loading__text">Loading pipeline data...</p>
			</div>
		{:else if error}
			<div class="pipeline-status-error">
				<Icon icon="mdi:alert-circle" class="pipeline-status-error__icon" />
				<h3 class="pipeline-status-error__title">Failed to load pipeline</h3>
				<p class="pipeline-status-error__text">{error}</p>
				<button class="pipeline-status-error__retry" onclick={fetchData}>
					<Icon icon="mdi:refresh" />
					Retry
				</button>
			</div>
		{:else if !workflow}
			<div class="pipeline-status-empty">
				<Icon icon="mdi:graph" class="pipeline-status-empty__icon" />
				<h3 class="pipeline-status-empty__title">No workflow data</h3>
				<p class="pipeline-status-empty__text">
					The workflow for this pipeline could not be loaded.
				</p>
			</div>
		{:else}
			<!-- Pipeline Status Component -->
			<PipelineStatus {workflow} {pipelineId} />
		{/if}
	</div>
</div>

<style>
	.pipeline-status-page {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%);
	}

	/* Background is now handled by SvelteFlow Background component */

	.pipeline-status-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.pipeline-status-loading,
	.pipeline-status-error,
	.pipeline-status-empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	:global(.pipeline-status-loading__icon) {
		font-size: 3rem;
		color: #3b82f6;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.pipeline-status-loading__text {
		font-size: 1.125rem;
		color: #d1d5db;
		margin: 0;
	}

	:global(.pipeline-status-error__icon) {
		font-size: 3rem;
		color: #ef4444;
		margin-bottom: 1rem;
	}

	.pipeline-status-error__title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #f9fafb;
		margin: 0 0 0.5rem 0;
	}

	.pipeline-status-error__text {
		font-size: 1rem;
		color: #d1d5db;
		margin: 0 0 1.5rem 0;
		max-width: 400px;
	}

	.pipeline-status-error__retry {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background-color: #3b82f6;
		color: #ffffff;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease-in-out;
	}

	.pipeline-status-error__retry:hover {
		background-color: #2563eb;
	}

	:global(.pipeline-status-empty__icon) {
		font-size: 4rem;
		color: #6b7280;
		margin-bottom: 1rem;
	}

	.pipeline-status-empty__title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #f9fafb;
		margin: 0 0 0.5rem 0;
	}

	.pipeline-status-empty__text {
		font-size: 1rem;
		color: #d1d5db;
		margin: 0;
		max-width: 400px;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive design */
	@media (max-width: 768px) {
		/* Responsive styles for other components */
	}
</style>
