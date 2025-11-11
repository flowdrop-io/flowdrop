<!--
  FlowDrop Workflow Create Page
  Allows users to create a new workflow from scratch
  - Shows an empty workflow editor
  - Users can drag and drop components to build their workflow
  - Save functionality to persist the new workflow
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import App from '$lib/components/App.svelte';
	import { workflowActions } from '$lib/stores/workflowStore';

	// Canvas dimensions - now using full viewport since no top navbar
	let canvasHeight = $state<string>('100vh'); // Full viewport height
	let canvasWidth = $state<string>('100%'); // Full width

	/**
	 * Initialize empty workflow on mount
	 * This ensures we start with a clean slate when creating a new workflow
	 */
	onMount(() => {
		// Initialize with an empty workflow structure
		workflowActions.initialize({
			id: '',
			name: 'Untitled Workflow',
			description: '',
			nodes: [],
			edges: [],
			metadata: {
				version: '1.0.0',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		});
	});
</script>

<svelte:head>
	<title>Create Workflow - FlowDrop</title>
</svelte:head>

<div class="workflow-create-page">
	<App height={canvasHeight} width={canvasWidth} showNavbar={true} />
</div>

<style>
	.workflow-create-page {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>
