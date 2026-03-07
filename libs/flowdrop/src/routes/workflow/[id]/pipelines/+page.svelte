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
	import StatusIcon from '$lib/components/StatusIcon.svelte';
	import StatusLabel from '$lib/components/StatusLabel.svelte';
	import {
		buildEndpointUrl,
		defaultEndpointConfig,
		type EndpointConfig
	} from '$lib/config/endpoints.js';
	import { apiToasts } from '$lib/services/toastService.js';
	import type { NodeExecutionStatus } from '$lib/types/index.js';

	let { data } = $props();

	// Get API configuration from server-loaded runtime config
	// svelte-ignore state_referenced_locally — page remounts on navigation
	let endpointConfig = $state<EndpointConfig>({
		...defaultEndpointConfig,
		baseUrl: data.runtimeConfig.apiBaseUrl
	});

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
		(Array.isArray(pipelines) ? pipelines : [])
			.filter(
				(pipeline) =>
					pipeline.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
					pipeline.description?.toLowerCase().includes(searchQuery.toLowerCase())
			)
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

			const apiUrl = buildEndpointUrl(endpointConfig, '/workflow/{workflow_id}/pipelines', {
				workflow_id: workflowId
			});
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch pipelines: ${response.statusText}`);
			}

			const data = await response.json();
			pipelines = data.pipelines || [];
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
			const apiUrl = buildEndpointUrl(endpointConfig, '/workflows/{id}', { id: workflowId });
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const data = await response.json();
				workflowName = data.data?.name || data.data?.title || 'Workflow';

				// Dispatch custom event to update breadcrumbs
				window.dispatchEvent(
					new CustomEvent('page-breadcrumbs-update', {
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
					})
				);
			}
		} catch {
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
				<button class="pipelines-btn pipelines-btn--outline" onclick={fetchPipelines}>
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
			</div>
		{:else}
			<div class="pipelines-list">
				{#each filteredPipelines as pipeline (pipeline.id)}
					<div
						class="pipelines-list-item"
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
						<!-- Status Column -->
						<div class="pipelines-list-item__status-column">
							<div class="pipelines-list-item__status-badge">
								<StatusIcon
									status={pipeline.status as NodeExecutionStatus}
									size="sm"
									showBackground={true}
								/>
								<StatusLabel label={pipeline.status} />
							</div>
							<div class="pipelines-list-item__status-meta">
								<div class="pipelines-list-item__duration">
									<Icon icon="mdi:clock-outline" />
									<span>00:04:39</span>
								</div>
								<div class="pipelines-list-item__timestamp">
									<Icon icon="mdi:calendar-outline" />
									<span>{new Date(pipeline.createdAt).toLocaleDateString()}</span>
								</div>
							</div>
						</div>

						<!-- Pipeline Column -->
						<div class="pipelines-list-item__pipeline-column">
							<div class="pipelines-list-item__pipeline-title">
								Pipeline {pipeline.id}
							</div>
							<div class="pipelines-list-item__pipeline-meta">
								<span class="pipelines-list-item__commit">#{pipeline.id}</span>
								<span class="pipelines-list-item__branch">main</span>
								<span class="pipelines-list-item__tag">latest</span>
							</div>
							<div class="pipelines-list-item__description">
								{pipeline.description}
							</div>
						</div>

						<!-- Created by Column -->
						<div class="pipelines-list-item__created-by-column">
							<div class="pipelines-list-item__avatar">
								<Icon icon="mdi:account-circle" />
							</div>
							<span class="pipelines-list-item__creator">System</span>
						</div>

						<!-- Stages Column -->
						<div class="pipelines-list-item__stages-column">
							<div class="pipelines-list-item__stage">
								<Icon icon="mdi:check-circle" />
							</div>
							<div class="pipelines-list-item__stage-arrow">
								<Icon icon="mdi:arrow-right" />
							</div>
							<div class="pipelines-list-item__stage">
								<Icon icon="mdi:check-circle" />
							</div>
						</div>

						<!-- Actions Column -->
						<div class="pipelines-list-item__actions-column">
							<button
								class="pipelines-list-item__action-btn"
								onclick={(e) => {
									e.stopPropagation();
									handlePipelineSelect(pipeline.id);
								}}
								title="Monitor Pipeline"
							>
								<Icon icon="mdi:play" />
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
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--fd-layout-background);
		overflow: hidden;
	}

	.pipelines-header {
		flex-shrink: 0;
		background: var(--fd-background);
		border-bottom: 1px solid var(--fd-border);
		padding: var(--fd-space-4xl) 0;
	}

	.pipelines-header__content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--fd-space-4xl);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.pipelines-header__title {
		font-size: var(--fd-text-2xl);
		font-weight: 700;
		color: var(--fd-foreground);
		margin: 0 0 var(--fd-space-xs) 0;
	}

	.pipelines-header__subtitle {
		font-size: var(--fd-text-base);
		color: var(--fd-muted-foreground);
		margin: 0;
	}

	.pipelines-filters {
		flex-shrink: 0;
		background-color: var(--fd-background);
		border-bottom: 1px solid var(--fd-border);
		padding: var(--fd-space-xl) 0;
	}

	.pipelines-filters__content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--fd-space-4xl);
	}

	.pipelines-search {
		position: relative;
		max-width: 400px;
	}

	.pipelines-search__input {
		width: 100%;
		padding: var(--fd-space-md);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		font-size: var(--fd-text-base);
		background-color: var(--fd-background);
		color: var(--fd-foreground);
		transition: border-color var(--fd-transition-normal);
	}

	.pipelines-search__input::placeholder {
		color: var(--fd-muted-foreground);
	}

	.pipelines-search__input:focus {
		outline: none;
		border-color: var(--fd-primary);
		box-shadow: 0 0 0 3px var(--fd-primary-muted);
	}

	.pipelines-content {
		flex: 1;
		overflow-y: auto;
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--fd-space-4xl);
		width: 100%;
	}

	.pipelines-loading,
	.pipelines-error,
	.pipelines-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--fd-space-7xl) var(--fd-space-4xl);
		text-align: center;
	}

	:global(.pipelines-loading__icon) {
		font-size: 3rem;
		color: var(--fd-primary);
		animation: spin 1s linear infinite;
		margin-bottom: var(--fd-space-xl);
	}

	.pipelines-loading__text {
		font-size: var(--fd-text-lg);
		color: var(--fd-muted-foreground);
		margin: 0;
	}

	:global(.pipelines-error__icon) {
		font-size: 3rem;
		color: var(--fd-error);
		margin-bottom: var(--fd-space-xl);
	}

	.pipelines-error__text {
		font-size: var(--fd-text-lg);
		color: var(--fd-muted-foreground);
		margin: 0 0 var(--fd-space-3xl) 0;
	}

	:global(.pipelines-empty__icon) {
		font-size: 4rem;
		color: var(--fd-muted-foreground);
		margin-bottom: var(--fd-space-xl);
	}

	.pipelines-empty__title {
		font-size: var(--fd-text-2xl);
		font-weight: 600;
		color: var(--fd-foreground);
		margin: 0 0 var(--fd-space-xs) 0;
	}

	.pipelines-empty__text {
		font-size: var(--fd-text-base);
		color: var(--fd-muted-foreground);
		margin: 0 0 var(--fd-space-3xl) 0;
		max-width: 400px;
	}

	.pipelines-list {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-md);
	}

	.pipelines-list-item {
		background-color: var(--fd-card);
		border: 2px solid var(--fd-border);
		border-radius: var(--fd-radius-xl);
		padding: var(--fd-space-xl) var(--fd-space-3xl);
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		box-shadow: var(--fd-shadow-md);
		display: grid;
		grid-template-columns: 200px 1fr 120px 100px 120px;
		align-items: center;
		gap: var(--fd-space-3xl);
		min-height: 4rem;
		overflow: visible;
		z-index: 10;
	}

	.pipelines-list-item:hover {
		transform: translateY(-1px);
		box-shadow: var(--fd-shadow-lg);
		border-color: var(--fd-primary);
	}

	/* Status Column */
	.pipelines-list-item__status-column {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-xs);
	}

	.pipelines-list-item__status-badge {
		display: flex;
		align-items: center;
		gap: var(--fd-space-xs);
		font-size: var(--fd-text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: var(--fd-space-3xs) var(--fd-space-xs);
		border-radius: var(--fd-radius-md);
		background-color: var(--fd-secondary);
		color: var(--fd-foreground);
	}

	.pipelines-list-item__status-meta {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-3xs);
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
	}

	.pipelines-list-item__duration,
	.pipelines-list-item__timestamp {
		display: flex;
		align-items: center;
		gap: var(--fd-space-3xs);
	}

	/* Pipeline Column */
	.pipelines-list-item__pipeline-column {
		display: flex;
		flex-direction: column;
		gap: var(--fd-space-xs);
		min-width: 0;
	}

	.pipelines-list-item__pipeline-title {
		font-size: var(--fd-text-base);
		font-weight: 600;
		color: var(--fd-foreground);
		text-decoration: none;
		cursor: pointer;
		line-height: 1.4;
	}

	.pipelines-list-item__pipeline-title:hover {
		color: var(--fd-primary);
		text-decoration: underline;
	}

	.pipelines-list-item__pipeline-meta {
		display: flex;
		gap: var(--fd-space-xs);
		flex-wrap: wrap;
	}

	.pipelines-list-item__commit,
	.pipelines-list-item__branch,
	.pipelines-list-item__tag {
		font-size: 0.625rem;
		font-weight: 500;
		padding: 0.125rem var(--fd-space-3xs);
		border-radius: var(--fd-radius-sm);
		background-color: var(--fd-secondary);
		color: var(--fd-muted-foreground);
		font-family: monospace;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.pipelines-list-item__tag {
		background-color: var(--fd-primary-muted);
		color: var(--fd-primary);
	}

	.pipelines-list-item__description {
		font-size: var(--fd-text-sm);
		color: var(--fd-muted-foreground);
		line-height: 1.4;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Created by Column */
	.pipelines-list-item__created-by-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--fd-space-3xs);
	}

	.pipelines-list-item__avatar {
		font-size: var(--fd-text-2xl);
		color: var(--fd-muted-foreground);
	}

	.pipelines-list-item__creator {
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
		text-align: center;
	}

	/* Stages Column */
	.pipelines-list-item__stages-column {
		display: flex;
		align-items: center;
		gap: var(--fd-space-xs);
	}

	.pipelines-list-item__stage {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--fd-radius-full);
		background-color: var(--fd-success);
		color: var(--fd-success-foreground);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--fd-text-xs);
		box-shadow: var(--fd-shadow-sm);
	}

	.pipelines-list-item__stage-arrow {
		color: var(--fd-muted-foreground);
		font-size: var(--fd-text-xs);
	}

	/* Actions Column */
	.pipelines-list-item__actions-column {
		display: flex;
		gap: var(--fd-space-xs);
		align-items: center;
	}

	.pipelines-list-item__action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background-color: var(--fd-muted);
		color: var(--fd-muted-foreground);
		border: 2px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		font-size: var(--fd-text-sm);
		box-shadow: var(--fd-shadow-sm);
	}

	.pipelines-list-item__action-btn:hover {
		background-color: var(--fd-secondary);
		color: var(--fd-foreground);
		border-color: var(--fd-border-strong);
		box-shadow: var(--fd-shadow-md);
	}

	.pipelines-btn {
		display: flex;
		align-items: center;
		gap: var(--fd-space-xs);
		padding: var(--fd-space-md) var(--fd-space-3xl);
		border: 1px solid;
		border-radius: var(--fd-radius-lg);
		font-size: var(--fd-text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		text-decoration: none;
	}

	.pipelines-btn--outline {
		background-color: transparent;
		border-color: var(--fd-border);
		color: var(--fd-foreground);
	}

	.pipelines-btn--outline:hover {
		background-color: var(--fd-muted);
		border-color: var(--fd-border-strong);
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
			gap: var(--fd-space-xl);
		}

		.pipelines-list-item {
			grid-template-columns: 1fr;
			gap: var(--fd-space-xl);
		}

		.pipelines-list-item__status-column,
		.pipelines-list-item__pipeline-column,
		.pipelines-list-item__created-by-column,
		.pipelines-list-item__stages-column,
		.pipelines-list-item__actions-column {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			padding: var(--fd-space-xs) 0;
			border-bottom: 1px solid var(--fd-border-muted);
		}

		.pipelines-list-item__pipeline-column {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--fd-space-xs);
		}

		.pipelines-list-item__description {
			white-space: normal;
			overflow: visible;
			text-overflow: initial;
		}
	}
</style>
