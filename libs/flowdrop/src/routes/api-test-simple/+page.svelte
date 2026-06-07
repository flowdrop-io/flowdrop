<!--
  Simple API Test Page
  Quick test to verify node API functionality
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { createEndpointConfig } from '$lib/config/endpoints.js';
  import { getDefaultInstance } from '$lib/stores/instanceContainer.svelte.js';
  import { NoAuthProvider, StaticAuthProvider } from '$lib/types/auth.js';
  import { getDevConfigSync } from '../devConfig';
  import type { NodeMetadata } from '$lib/types/index.js';

  // Initialize the default instance's API context with development config
  const devConfig = getDevConfigSync();
  const endpointConfig = createEndpointConfig(devConfig.apiBaseUrl, {
    timeout: devConfig.timeout
  });
  const authProvider =
    devConfig.authType && devConfig.authType !== 'none'
      ? new StaticAuthProvider({ type: devConfig.authType, token: devConfig.authToken })
      : new NoAuthProvider();
  getDefaultInstance().api.configure(endpointConfig, authProvider);
  const apiClient = getDefaultInstance().api.client;

  let nodes = $state<NodeMetadata[]>([]);
  let loading = $state(true);
  let error = $state('');
  let testResults = $state<string[]>([]);

  async function testNodeApi(): Promise<void> {
    try {
      loading = true;
      error = '';
      testResults = [];

      testResults.push('Testing Node API...');

      // Test basic fetch
      const allNodes = await apiClient.getAvailableNodes();
      testResults.push(`✅ Fetched ${allNodes.length} nodes`);

      // Test category filter
      const llmNodes = await apiClient.getNodesByCategory('llm');
      testResults.push(`✅ Found ${llmNodes.length} LLM nodes`);

      nodes = allNodes;
      testResults.push('🎉 All tests passed!');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      testResults.push(`❌ Error: ${error}`);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    testNodeApi();
  });
</script>

<svelte:head>
  <title>API Test - FlowDrop</title>
</svelte:head>

<div class="container mx-auto p-6 max-w-4xl">
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h1 class="card-title text-2xl mb-6">Simple API Test</h1>

      <!-- Test Results -->
      <div class="space-y-4">
        <!-- Status -->
        <div class="flex items-center gap-4">
          {#if loading}
            <div class="loading loading-spinner loading-sm"></div>
            <span>Testing API...</span>
          {:else if error}
            <div class="text-error">❌ Error: {error}</div>
          {:else}
            <div class="text-success">✅ Tests completed</div>
          {/if}
        </div>

        <!-- Test Log -->
        <div class="bg-base-200 p-4 rounded-lg">
          <h3 class="font-semibold mb-2">Test Results:</h3>
          <div class="space-y-1 font-mono text-sm">
            {#each testResults as result, index (index)}
              <div>{result}</div>
            {/each}
          </div>
        </div>

        <!-- Node Count -->
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Nodes</div>
            <div class="stat-value">{nodes.length}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Categories</div>
            <div class="stat-value">
              {new Set(nodes.map((n) => n.category)).size}
            </div>
          </div>
        </div>

        <!-- Retry Button -->
        <button class="btn btn-primary" onclick={testNodeApi} disabled={loading}>
          {loading ? 'Testing...' : 'Run Tests Again'}
        </button>
      </div>
    </div>
  </div>
</div>
