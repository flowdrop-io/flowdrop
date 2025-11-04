<!--
  FlowDrop Workflow Create Page
  Allows users to create a new workflow from scratch
  - Shows an empty workflow editor
  - Users can drag and drop components to build their workflow
  - Save functionality to persist the new workflow
-->

<script lang="ts">
	import App from '$lib/components/App.svelte';

	// Canvas dimensions - now using full viewport since no top navbar
	let canvasHeight = $state<string>('100vh'); // Full viewport height
	let canvasWidth = $state<string>('100%'); // Full width
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
