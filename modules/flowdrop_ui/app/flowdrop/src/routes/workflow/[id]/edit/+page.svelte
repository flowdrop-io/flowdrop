<script lang="ts">
	import App from '$lib/components/App.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { defaultApiConfig, getEndpointUrl, type ApiConfig } from '$lib/config/apiConfig';
	import { apiToasts, workflowToasts, dismissToast } from '$lib/services/toastService.js';

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

	// Canvas dimensions - now using full viewport since no top navbar
	let canvasHeight = $state<string>('100vh'); // Full viewport height
	let canvasWidth = $state<string>('100%'); // Full width

	/**
	 * Calculate optimal canvas dimensions
	 * Now uses full viewport since we removed the top navbar
	 */
	function calculateCanvasDimensions() {
		// Use full viewport height since no top navbar
		const availableHeight = window.innerHeight;

		// Set minimum and maximum constraints for optimal experience
		const minHeight = 400; // Minimum usable height
		const maxHeight = 1200; // Maximum height to prevent excessive scrolling

		// Calculate optimal height within constraints
		const optimalHeight = Math.max(minHeight, Math.min(maxHeight, availableHeight));

		// Set dimensions
		canvasHeight = `${optimalHeight}px`;
		canvasWidth = '100%'; // Use full available width

		console.log('Canvas dimensions calculated:', {
			viewportHeight: window.innerHeight,
			availableHeight,
			optimalHeight,
			canvasHeight,
			canvasWidth
		});
	}

	// Fetch workflow data from API
	async function fetchWorkflow() {
		if (!workflowId) return;
		// Show loading toast
		const loadingToast = apiToasts.loading('Loading workflow');

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

			// Extract the workflow data from the nested structure
			const workflowData = data.data;

			// Fetch fresh node metadata from the API
			let refreshedNodes = workflowData.nodes || [];
			if (refreshedNodes.length > 0) {
				try {
					const nodesUrl = getEndpointUrl(apiConfig, apiConfig.endpoints.nodes.list);
					const nodesResponse = await fetch(nodesUrl);
					if (nodesResponse.ok) {
						const nodesData = await nodesResponse.json();
						const availableNodes = nodesData.data || [];

						// Refresh metadata for each node
						refreshedNodes = refreshedNodes.map((node: any) => {
							const nodeMetadataId = node.data?.metadata?.id;
							if (nodeMetadataId) {
								const freshMetadata = availableNodes.find((n: any) => n.id === nodeMetadataId);
								if (freshMetadata) {
									console.log(`🔄 Refreshing metadata for node: ${nodeMetadataId}`, {
										oldSupportedTypes: node.data.metadata.supportedTypes,
										newSupportedTypes: freshMetadata.supportedTypes
									});
									return {
										...node,
										data: {
											...node.data,
											metadata: freshMetadata
										}
									};
								}
							}
							return node;
						});
					}
				} catch (nodesErr) {
					console.warn('Failed to refresh node metadata:', nodesErr);
					// Continue with original nodes if refresh fails
				}
			}

			// Map API response to workflow data
			workflow = {
				id: workflowData.id,
				name: workflowData.name,
				description: workflowData.description,
				status: workflowData.status || 'Active',
				nodes: refreshedNodes,
				edges: workflowData.edges || [],
				created: workflowData.created,
				changed: workflowData.changed
			};

			// Dismiss loading toast and show success toast
			dismissToast(loadingToast);
		} catch (err) {
			// Dismiss loading toast and show error toast
			dismissToast(loadingToast);
			error = err instanceof Error ? err.message : 'Failed to fetch workflow';
			apiToasts.error('Load workflow', err instanceof Error ? err.message : 'Unknown error');
		} finally {
			loading = false;
		}
	}

	// Load workflow on mount
	onMount(() => {
		// Calculate optimal canvas dimensions
		calculateCanvasDimensions();

		// Fetch workflow data
		fetchWorkflow();

		// Recalculate dimensions on window resize
		const handleResize = () => {
			calculateCanvasDimensions();
		};

		window.addEventListener('resize', handleResize);

		// Cleanup
		return () => {
			window.removeEventListener('resize', handleResize);
		};
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
		<App workflow={workflow as any} height={canvasHeight} width={canvasWidth} showNavbar={true} />
	{:else}
		<div class="no-workflow">
			<h3>Workflow Not Found</h3>
			<p>The requested workflow could not be found.</p>
		</div>
	{/if}
</div>

<style>
	.workflow-edit-page {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - var(--flowdrop-navbar-height, 60px));
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
