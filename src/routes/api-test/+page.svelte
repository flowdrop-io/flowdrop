<!--
  API Test Page
  Demonstrates the workflow and node API functionality
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { api, setEndpointConfig } from '$lib/services/api.js';
	import { createEndpointConfig } from '$lib/config/endpoints.js';
	import { getDevConfig, getDevConfigSync } from '../devConfig';
	import type { NodeMetadata, Workflow } from '$lib/types/index.js';

	// Initialize API service with development config
	// Initialize with sync config, will be updated on mount
	const devConfig = getDevConfigSync();
	let endpointConfig = $state(
		createEndpointConfig(devConfig.apiBaseUrl, {
			auth: { type: devConfig.authType, token: devConfig.authToken },
			timeout: devConfig.timeout
		})
	);
	setEndpointConfig(endpointConfig);

	let nodes = $state<NodeMetadata[]>([]);
	let workflows = $state<Workflow[]>([]);
	let loading = $state(false);
	let error = $state('');
	let testResults = $state<string[]>([]);

	/**
	 * Test node API
	 */
	async function testNodeApi(): Promise<void> {
		try {
			testResults.push('Testing Node API...');

			// Get all nodes
			const allNodes = await api.nodes.getNodes();
			testResults.push(`✓ Found ${allNodes.length} nodes`);

			// Get nodes by category
			const llmNodes = await api.nodes.getNodes({ category: 'llm' });
			testResults.push(`✓ Found ${llmNodes.length} LLM nodes`);

			// Get specific node
			if (allNodes.length > 0) {
				const firstNode = await api.nodes.getNode(allNodes[0].id);
				testResults.push(`✓ Retrieved node: ${firstNode.name}`);
			}

			nodes = allNodes;
		} catch (err) {
			testResults.push(`✗ Node API error: ${err instanceof Error ? err.message : 'Unknown error'}`);
			error = err instanceof Error ? err.message : 'Unknown error';
		}
	}

	/**
	 * Test workflow API
	 */
	async function testWorkflowApi(): Promise<void> {
		try {
			testResults.push('Testing Workflow API...');

			// Get all workflows
			const allWorkflows = await api.workflows.getWorkflows();
			testResults.push(`✓ Found ${allWorkflows.length} workflows`);

			// Create a test workflow
			const testWorkflow: Omit<Workflow, 'id'> = {
				name: 'Test Workflow',
				description: 'A test workflow created via API',
				nodes: [],
				edges: [],
				metadata: {
					version: '1.0.0',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					author: 'API Test',
					tags: ['test', 'api']
				}
			};

			const createdWorkflow = await api.workflows.createWorkflow(testWorkflow);
			testResults.push(`✓ Created workflow: ${createdWorkflow.name} (ID: ${createdWorkflow.id})`);

			// Update the workflow
			const updatedWorkflow = await api.workflows.updateWorkflow(createdWorkflow.id, {
				description: 'Updated test workflow'
			});
			testResults.push(`✓ Updated workflow: ${updatedWorkflow.description}`);

			// Get the updated workflow
			const retrievedWorkflow = await api.workflows.getWorkflow(createdWorkflow.id);
			testResults.push(`✓ Retrieved workflow: ${retrievedWorkflow.name}`);

			// Delete the test workflow
			await api.workflows.deleteWorkflow(createdWorkflow.id);
			testResults.push(`✓ Deleted test workflow`);

			workflows = await api.workflows.getWorkflows();
		} catch (err) {
			testResults.push(
				`✗ Workflow API error: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
			error = err instanceof Error ? err.message : 'Unknown error';
		}
	}

	/**
	 * Run all tests
	 */
	async function runAllTests(): Promise<void> {
		loading = true;
		error = '';
		testResults = [];

		try {
			await testNodeApi();
			await testWorkflowApi();
			testResults.push('🎉 All tests completed successfully!');
		} catch (err) {
			testResults.push(
				`💥 Test suite failed: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		runAllTests();
	});
</script>

<svelte:head>
	<title>API Test - FlowDrop</title>
</svelte:head>

<div class="container mx-auto p-6 max-w-4xl">
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h1 class="card-title text-2xl mb-6">FlowDrop API Test</h1>

			<!-- Test Controls -->
			<div class="flex gap-4 mb-6">
				<button class="btn btn-primary" onclick={runAllTests} disabled={loading}>
					{loading ? 'Running Tests...' : 'Run All Tests'}
				</button>

				<button class="btn btn-outline" onclick={testNodeApi} disabled={loading}>
					Test Node API
				</button>

				<button class="btn btn-outline" onclick={testWorkflowApi} disabled={loading}>
					Test Workflow API
				</button>
			</div>

			<!-- Error Display -->
			{#if error}
				<div class="alert alert-error mb-6">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Error: {error}</span>
				</div>
			{/if}

			<!-- Test Results -->
			<div class="space-y-6">
				<!-- Test Log -->
				<div class="card bg-base-200">
					<div class="card-body">
						<h2 class="card-title text-lg">Test Results</h2>
						<div class="bg-base-300 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
							{#each testResults as result, index (index)}
								<div class="mb-1">{result}</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Node Types -->
				<div class="card bg-base-200">
					<div class="card-body">
						<h2 class="card-title text-lg">Available Node Types ({nodes.length})</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each nodes as node (node.id)}
								<div class="card bg-base-100 shadow-sm">
									<div class="card-body p-4">
										<div class="flex items-center gap-2 mb-2">
											<div class="badge badge-primary">{node.category}</div>
											<h3 class="font-semibold">{node.name}</h3>
										</div>
										<p class="text-sm opacity-70">{node.description}</p>
										<div class="flex gap-1 mt-2">
											{#each node.tags || [] as tag (tag)}
												<div class="badge badge-outline badge-sm">{tag}</div>
											{/each}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Workflows -->
				<div class="card bg-base-200">
					<div class="card-body">
						<h2 class="card-title text-lg">Saved Workflows ({workflows.length})</h2>
						<div class="space-y-4">
							{#each workflows as workflow (workflow.id)}
								<div class="card bg-base-100 shadow-sm">
									<div class="card-body p-4">
										<div class="flex items-center justify-between">
											<div>
												<h3 class="font-semibold">{workflow.name}</h3>
												<p class="text-sm opacity-70">{workflow.description}</p>
												<div class="flex gap-2 mt-2">
													<span class="text-xs opacity-60">
														{workflow.nodes.length} nodes, {workflow.edges.length} edges
													</span>
													<span class="text-xs opacity-60">
														Updated: {new Date(
															workflow.metadata?.updatedAt || ''
														).toLocaleDateString()}
													</span>
												</div>
											</div>
											<div class="flex gap-1">
												{#each workflow.metadata?.tags || [] as tag (tag)}
													<div class="badge badge-outline badge-sm">{tag}</div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
