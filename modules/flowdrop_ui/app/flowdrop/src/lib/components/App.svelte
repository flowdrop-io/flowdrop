<!--
  FlowDrop Demo Page
  Demonstrates the FlowDrop library with sample data
  Styled with BEM syntax
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
	import { api, setEndpointConfig } from '$lib/services/api.js';
	import type { NodeMetadata, Workflow } from '$lib/types/index.js';
	import { sampleNodes } from '$lib/data/samples.js';
	import { createEndpointConfig } from '$lib/config/endpoints.js';

	// Configuration props for runtime customization
	interface Props {
		workflow?: Workflow;
	}

	let { workflow: initialWorkflow }: Props = $props();

	let nodes = $state<NodeMetadata[]>([]);
	let workflow = $state<Workflow | undefined>(initialWorkflow);
	let error = $state<string | null>(null);
	let loading = $state(true);

	/**
	 * Fetch node types from the server
	 */
	async function fetchNodeTypes(): Promise<void> {
		try {
			loading = true;
			error = null;

			console.log('Fetching node types from server...');
			const fetchedNodes = await api.nodes.getNodes();

			console.log('✅ Fetched', fetchedNodes.length, 'node types from server');
			console.log('🔍 First node:', fetchedNodes[0]);
			nodes = fetchedNodes;
			error = null;
		} catch (err) {
			console.error('❌ Failed to fetch node types:', err);
			console.log('🔄 Falling back to sample data...');

			// Show error but don't block the UI
			error = `API Error: ${err instanceof Error ? err.message : 'Unknown error'}. Using sample data.`;

			// Fallback to sample data
			nodes = sampleNodes;
		} finally {
			loading = false;
		}
	}

	/**
	 * Retry loading node types
	 */
	function retryLoad(): void {
		fetchNodeTypes();
	}

	/**
	 * Test API connection
	 */
	async function testApiConnection(): Promise<void> {
		try {
			const testUrl = '/api/flowdrop/nodes';

			console.log('🧪 Testing API connection to:', testUrl);

			const response = await fetch(testUrl);
			const data = await response.json();

			if (response.ok && data.success) {
				console.log('✅ API connection successful:', data.data.length, 'nodes found');
				alert(`API connection successful! Found ${data.data.length} nodes.`);
			} else {
				console.log('❌ API connection failed:', data);
				alert(`API connection failed: ${data.error || 'Unknown error'}`);
			}
		} catch (err) {
			console.error('❌ API connection test failed:', err);
			alert(`API connection test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	/**
	 * Initialize API endpoints
	 */
	function initializeApiEndpoints(): void {
		// Use relative paths for local development
		const apiBaseUrl = import.meta.env.VITE_DRUPAL_API_URL || '/api/flowdrop';

		console.log('🔧 Initializing API endpoints with URL:', apiBaseUrl);
		console.log('🔧 Current location:', window.location.href);

		const endpointConfig = createEndpointConfig(apiBaseUrl, {
			auth: {
				type: 'none' // No authentication for now
			},
			timeout: 10000, // 10 second timeout
			retry: {
				enabled: true,
				maxAttempts: 2,
				delay: 1000,
				backoff: 'exponential'
			}
		});

		setEndpointConfig(endpointConfig);
		console.log('✅ API endpoints configured');
	}

	// Load node types on mount
	onMount(() => {
		initializeApiEndpoints();
		fetchNodeTypes();
	});

	// Debug logging for nodes
	$effect(() => {
		console.log('🔍 App: nodes state changed:', {
			count: nodes.length,
			hasNodes: nodes.length > 0,
			firstNode: nodes[0]?.name || 'none'
		});
	});
</script>

<svelte:head>
	<title>FlowDrop - Visual Workflow Manager</title>
	<meta name="description" content="A modern drag-and-drop workflow editor for LLM applications" />
</svelte:head>

<div class="flowdrop-app">
	<!-- Main Content -->
	<main class="flowdrop-main">
		<!-- Status Display -->
		{#if loading}
			<div class="flowdrop-status flowdrop-status--loading">
				<div class="flowdrop-status__content">
					<div class="flowdrop-flex flowdrop-gap--3">
						<div class="flowdrop-spinner"></div>
						<span class="flowdrop-text--sm flowdrop-font--medium">Loading node types...</span>
					</div>
				</div>
			</div>
		{:else if error}
			<div class="flowdrop-status flowdrop-status--error">
				<div class="flowdrop-status__content">
					<div class="flowdrop-flex flowdrop-gap--3">
						<div class="flowdrop-status__indicator flowdrop-status__indicator--error"></div>
						<span class="flowdrop-text--sm flowdrop-font--medium">Error: {error}</span>
					</div>
					<div class="flowdrop-flex flowdrop-gap--2">
						<button
							class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline"
							onclick={retryLoad}
							type="button"
						>
							Retry
						</button>
						<button
							class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--primary"
							onclick={() => {
								nodes = sampleNodes;
								error = null;
							}}
							type="button"
						>
							Use Sample Data
						</button>
						<button
							class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline"
							onclick={() => {
								const defaultUrl = '/api/flowdrop';
								const newUrl = prompt('Enter Drupal API URL:', defaultUrl);
								if (newUrl) {
									const endpointConfig = createEndpointConfig(newUrl);
									setEndpointConfig(endpointConfig);
									fetchNodeTypes();
								}
							}}
							type="button"
						>
							Set API URL
						</button>
						<button
							class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline"
							onclick={testApiConnection}
							type="button"
						>
							Test API
						</button>
						<button
							class="flowdrop-btn flowdrop-btn--ghost flowdrop-btn--sm"
							onclick={() => (error = null)}
							type="button"
						>
							✕
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Workflow Editor -->
		<div class="flowdrop-editor-container">
			<WorkflowEditor {nodes} {workflow} />
		</div>
	</main>
</div>

<style>
	.flowdrop-app {
		height: 100vh;
		background: linear-gradient(135deg, #f9fafb 0%, #e0e7ff 50%, #c7d2fe 100%);
		display: flex;
		flex-direction: column;
	}

	.flowdrop-main {
		flex: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.flowdrop-status {
		background-color: #eff6ff;
		border-bottom: 1px solid #bfdbfe;
		padding: 1rem;
	}

	.flowdrop-status--error {
		background-color: #fef2f2;
		border-bottom: 1px solid #fecaca;
	}

	.flowdrop-status__content {
		max-width: 80rem;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.flowdrop-status__indicator {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.flowdrop-status__indicator--error {
		background-color: #ef4444;
	}

	.flowdrop-btn {
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.2s ease-in-out;
	}

	.flowdrop-btn--sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.625rem;
	}

	.flowdrop-btn--outline {
		background-color: transparent;
		border-color: #d1d5db;
		color: #374151;
	}

	.flowdrop-btn--outline:hover {
		background-color: #f9fafb;
		border-color: #9ca3af;
	}

	.flowdrop-btn--primary {
		background-color: #3b82f6;
		border-color: #3b82f6;
		color: #ffffff;
	}

	.flowdrop-btn--primary:hover {
		background-color: #2563eb;
		border-color: #2563eb;
	}

	.flowdrop-btn--ghost {
		background-color: transparent;
		border-color: transparent;
		color: #6b7280;
	}

	.flowdrop-btn--ghost:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	.flowdrop-flex {
		display: flex;
	}

	.flowdrop-gap--2 {
		gap: 0.5rem;
	}

	.flowdrop-gap--3 {
		gap: 0.75rem;
	}

	.flowdrop-text--sm {
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	.flowdrop-font--medium {
		font-weight: 500;
	}

	.flowdrop-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid #d1d5db;
		border-top: 2px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.flowdrop-editor-container {
		flex: 1;
		position: relative;
		min-height: 0;
		overflow: hidden;
	}
</style>
