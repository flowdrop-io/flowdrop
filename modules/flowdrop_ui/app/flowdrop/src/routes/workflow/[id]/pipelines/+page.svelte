<!--
  Pipeline Selection Page
  Lists available pipelines for a workflow
  Allows users to select a pipeline to monitor
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { defaultApiConfig, getEndpointUrl } from '$lib/config/apiConfig';
	import { apiToasts, pipelineToasts, dismissToast } from '$lib/services/toastService.js';

	/**
	 * Pipeline display type
	 */
	interface PipelineDisplay {
		id: string;
		name: string;
		description: string;
		status: string;
		createdAt: string;
		lastExecuted?: string;
		executionCount: number;
	}

	// Pipeline data state
	let pipelines = $state<PipelineDisplay[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let workflowId = $derived($page.params.id);
	let workflowName = $state<string>('Workflow');

	let searchQuery = $state('');
	let filteredPipelines = $derived(
		(Array.isArray(pipelines) ? pipelines : []).filter(
			(pipeline) =>
				pipeline.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				pipeline.description?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	// Fetch pipelines from API
	async function fetchPipelines() {
		if (!workflowId) {
			error = 'No workflow ID provided';
			loading = false;
			return;
		}

		try {
			loading = true;
			error = null;

			const apiUrl = getEndpointUrl(defaultApiConfig, '/workflow/{workflow_id}/pipelines', { workflow_id: workflowId });
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch pipelines: ${response.statusText}`);
			}

			const data = await response.json();
			pipelines = data.pipelines || [];
			
			// Show success toast
			if (pipelines.length > 0) {
				apiToasts.success('Pipelines loaded', `${pipelines.length} pipelines found`);
			}
		} catch (err) {
			apiToasts.error('Load pipelines', err instanceof Error ? err.message : 'Unknown error');
			error = err instanceof Error ? err.message : 'Failed to fetch pipelines';
			pipelines = [];
		} finally {
			loading = false;
		}
	}

	// Fetch workflow name
	async function fetchWorkflowName() {
		if (!workflowId) return;
		
		try {
			const apiUrl = getEndpointUrl(defaultApiConfig, '/workflows/{id}', { id: workflowId });
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const data = await response.json();
				workflowName = data.data?.name || data.data?.title || 'Workflow';
				
				// Dispatch custom event to update breadcrumbs
				window.dispatchEvent(new CustomEvent('page-breadcrumbs-update', {
					detail: {
						breadcrumbs: [
							{
								label: 'Workflows',
								href: '/',
								icon: 'mdi:view-list'
							},
							{
								label: workflowName,
								href: `/workflow/${workflowId}/edit`,
								icon: 'mdi:workflow'
							},
							{
								label: 'Pipelines',
								icon: 'mdi:source-branch'
							}
						]
					}
				}));
			}
		} catch (err) {
			// Silently fail for workflow name - don't show toast for this background operation
		}
	}

	// Load pipelines on mount
	onMount(() => {
		fetchPipelines();
		fetchWorkflowName();
	});

	function handlePipelineSelect(pipelineId: string) {
		goto(`/workflow/${workflowId}/pipelines/${pipelineId}`);
	}

	function handleCreatePipeline() {
		// TODO: Implement pipeline creation
		pipelineToasts.created('New Pipeline');
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'running': return '#3b82f6';
			case 'completed': return '#10b981';
			case 'error': return '#ef4444';
			case 'idle': return '#6b7280';
			default: return '#6b7280';
		}
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'running': return 'mdi:loading';
			case 'completed': return 'mdi:check-circle';
			case 'error': return 'mdi:alert-circle';
			case 'idle': return 'mdi:clock-outline';
			default: return 'mdi:help-circle';
		}
	}
</script>

<svelte:head>
	<title>Pipelines - Workflow {workflowId} - FlowDrop</title>
</svelte:head>

<div class="pipelines-page">
	<!-- Header Section -->
	<div class="pipelines-header">
		<div class="pipelines-header__content">
			<div class="pipelines-header__title-section">
				<h1 class="pipelines-header__title">Pipeline Monitoring</h1>
				<p class="pipelines-header__subtitle">Select a pipeline to monitor its execution status</p>
			</div>
		</div>
	</div>

	<!-- Search and Filters -->
	<div class="pipelines-filters">
		<div class="pipelines-filters__content">
			<div class="pipelines-search">
				<input
					type="text"
					placeholder="Search pipelines..."
					bind:value={searchQuery}
					class="pipelines-search__input"
				/>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="pipelines-content">
		{#if loading}
			<div class="pipelines-loading">
				<Icon icon="mdi:loading" class="pipelines-loading__icon" />
				<p class="pipelines-loading__text">Loading pipelines...</p>
			</div>
		{:else if error}
			<div class="pipelines-error">
				<Icon icon="mdi:alert-circle" class="pipelines-error__icon" />
				<p class="pipelines-error__text">{error}</p>
				<button 
					class="pipelines-btn pipelines-btn--outline"
					onclick={fetchPipelines}
				>
					<Icon icon="mdi:refresh" />
					Retry
				</button>
			</div>
		{:else if filteredPipelines.length === 0}
			<div class="pipelines-empty">
				<Icon icon="mdi:graph" class="pipelines-empty__icon" />
				<h3 class="pipelines-empty__title">No pipelines found</h3>
				<p class="pipelines-empty__text">
					{#if searchQuery}
						No pipelines match your search criteria.
					{:else}
						No pipelines have been created for this workflow yet.
					{/if}
				</p>
				{#if !searchQuery}
					<button 
						class="pipelines-btn pipelines-btn--primary"
						onclick={handleCreatePipeline}
					>
						<Icon icon="mdi:plus" />
						Create First Pipeline
					</button>
				{/if}
			</div>
		{:else}
			<div class="pipelines-grid">
				{#each filteredPipelines as pipeline (pipeline.id)}
					<div 
						class="pipelines-card"
						onclick={() => handlePipelineSelect(pipeline.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handlePipelineSelect(pipeline.id);
							}
						}}
					>
						<div class="pipelines-card__header">
							<h3 class="pipelines-card__title">{pipeline.name}</h3>
							<div 
								class="pipelines-card__status"
								style="color: {getStatusColor(pipeline.status)}"
							>
								<Icon icon={getStatusIcon(pipeline.status)} />
								{pipeline.status}
							</div>
						</div>
						
						<div class="pipelines-card__content">
							<p class="pipelines-card__description">{pipeline.description}</p>
							
							<div class="pipelines-card__meta">
								<div class="pipelines-card__meta-item">
									<Icon icon="mdi:calendar" />
									<span>Created: {new Date(pipeline.createdAt).toLocaleDateString()}</span>
								</div>
								
								{#if pipeline.lastExecuted}
									<div class="pipelines-card__meta-item">
										<Icon icon="mdi:clock" />
										<span>Last run: {new Date(pipeline.lastExecuted).toLocaleDateString()}</span>
									</div>
								{/if}
								
								<div class="pipelines-card__meta-item">
									<Icon icon="mdi:counter" />
									<span>Executions: {pipeline.executionCount}</span>
								</div>
							</div>
						</div>
						
						<div class="pipelines-card__actions">
							<button 
								class="pipelines-card__action"
								onclick={(e) => {
									e.stopPropagation();
									handlePipelineSelect(pipeline.id);
								}}
							>
								<Icon icon="mdi:eye" />
								Monitor
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.pipelines-page {
		min-height: 100vh;
		background: linear-gradient(135deg, #f9fafb 0%, #e0e7ff 50%, #c7d2fe 100%);
	}

	.pipelines-header {
		background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
		border-bottom: 1px solid #e5e7eb;
		padding: 2rem 0;
	}

	.pipelines-header__content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.pipelines-header__title {
		font-size: 2rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.pipelines-header__subtitle {
		font-size: 1rem;
		color: #6b7280;
		margin: 0;
	}


	.pipelines-filters {
		background-color: #ffffff;
		border-bottom: 1px solid #e5e7eb;
		padding: 1rem 0;
	}

	.pipelines-filters__content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
	}

	.pipelines-search {
		position: relative;
		max-width: 400px;
	}


	.pipelines-search__input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 1rem;
		background-color: #ffffff;
		transition: border-color 0.2s ease-in-out;
	}

	.pipelines-search__input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.pipelines-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.pipelines-loading,
	.pipelines-error,
	.pipelines-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	:global(.pipelines-loading__icon) {
		font-size: 3rem;
		color: #3b82f6;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.pipelines-loading__text {
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0;
	}

	:global(.pipelines-error__icon) {
		font-size: 3rem;
		color: #ef4444;
		margin-bottom: 1rem;
	}

	.pipelines-error__text {
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0 0 1.5rem 0;
	}

	:global(.pipelines-empty__icon) {
		font-size: 4rem;
		color: #9ca3af;
		margin-bottom: 1rem;
	}

	.pipelines-empty__title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.5rem 0;
	}

	.pipelines-empty__text {
		font-size: 1rem;
		color: #6b7280;
		margin: 0 0 1.5rem 0;
		max-width: 400px;
	}

	.pipelines-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.pipelines-card {
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1.5rem;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.pipelines-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		border-color: #3b82f6;
	}

	.pipelines-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.pipelines-card__title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.pipelines-card__status {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.pipelines-card__content {
		margin-bottom: 1.5rem;
	}

	.pipelines-card__description {
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.5;
		margin: 0 0 1rem 0;
	}

	.pipelines-card__meta {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pipelines-card__meta-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.pipelines-card__actions {
		display: flex;
		gap: 0.75rem;
	}

	.pipelines-card__action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: #3b82f6;
		color: #ffffff;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease-in-out;
	}

	.pipelines-card__action:hover {
		background-color: #2563eb;
	}

	.pipelines-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: 1px solid;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		text-decoration: none;
	}

	.pipelines-btn--primary {
		background-color: #3b82f6;
		border-color: #3b82f6;
		color: #ffffff;
	}

	.pipelines-btn--primary:hover {
		background-color: #2563eb;
		border-color: #2563eb;
	}

	.pipelines-btn--outline {
		background-color: transparent;
		border-color: #d1d5db;
		color: #374151;
	}

	.pipelines-btn--outline:hover {
		background-color: #f3f4f6;
		border-color: #9ca3af;
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
		.pipelines-header__content {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.pipelines-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
