<script lang="ts">
	import App from '$lib/components/App.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { defaultApiConfig, getEndpointUrl, type ApiConfig } from '$lib/config/apiConfig';

	/**
	 * Workflow edit type (minimal structure for editing)
	 */
	interface WorkflowEdit {
		id: string;
		name: string;
		description: string;
		nodes?: unknown[];
		edges?: unknown[];
		[key: string]: unknown;
	}

	// Get workflow ID from URL
	let workflowId = $derived($page.params.id);

	// API configuration - can be customized via props or environment
	let apiConfig = $state<ApiConfig>(defaultApiConfig);

	// Workflow data state
	let workflow = $state<WorkflowEdit | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Fetch workflow data from API
	async function fetchWorkflow() {
		if (!workflowId) return;

		try {
			loading = true;
			error = null;

			// Use configured endpoint
			const url = getEndpointUrl(apiConfig, apiConfig.endpoints.workflows.get, { id: workflowId });
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log('Workflow API Response:', data);

			// Extract the workflow data from the nested structure
			const workflowData = data.data;

			// Map API response to workflow data
			workflow = {
				id: workflowData.id,
				name: workflowData.name,
				description: workflowData.description,
				status: workflowData.status || 'Active',
				nodes: workflowData.nodes || [],
				edges: workflowData.edges || [],
				created: workflowData.created,
				changed: workflowData.changed
			};

			console.log('Processed workflow:', workflow);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch workflow';
			console.error('Error fetching workflow:', err);
		} finally {
			loading = false;
		}
	}

	// Load workflow on mount
	onMount(() => {
		fetchWorkflow();
	});
</script>

<svelte:head>
	<title>Edit Workflow - FlowDrop</title>
</svelte:head>

<div class="workflow-edit-page">
	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading workflow data...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<div class="error-icon">⚠️</div>
			<h3>Error Loading Workflow</h3>
			<p>{error}</p>
			<button onclick={fetchWorkflow} class="retry-button">Retry</button>
		</div>
	{:else if workflow}
		<App workflow={workflow as any} />
	{:else}
		<div class="no-workflow">
			<h3>Workflow Not Found</h3>
			<p>The requested workflow could not be found.</p>
		</div>
	{/if}
</div>

<style>
	.workflow-edit-page {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.loading-container,
	.error-container,
	.no-workflow {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		text-align: center;
		padding: 2rem;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f4f6;
		border-top: 4px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.retry-button {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		cursor: pointer;
		margin-top: 1rem;
	}

	.retry-button:hover {
		background: #2563eb;
	}
</style>
