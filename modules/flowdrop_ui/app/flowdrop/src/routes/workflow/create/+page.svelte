<!--
  FlowDrop Workflow Create Page
  Allows users to create a new workflow from scratch
  - Shows an empty workflow editor
  - Users can drag and drop components to build their workflow
  - Save functionality to persist the new workflow
-->

<script lang="ts">
	import App from '$lib/components/App.svelte';

	// Configuration for the workflow editor
	const config = {
		api: {
			baseUrl: '/api/flowdrop',
			endpoints: {},
			timeout: 30000,
			retry: {
				enabled: true,
				maxAttempts: 3,
				delay: 1000
			}
		}
	};
</script>

<svelte:head>
	<title>Create Workflow - FlowDrop</title>
</svelte:head>

<div class="workflow-create-page">
	<App {config} />
</div>

<style>
	.workflow-create-page {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>
