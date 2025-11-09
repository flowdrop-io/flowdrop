<!--
  FlowDrop Main Entry Page
  Shows a table of workflows with management operations
  - Displays workflows in a table format
  - Each row has title, description, and operations dropdown
  - Operations include: Edit, Delete, Execute, View Execution, View Execution History
  - Quick search functionality at the top
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getEndpointUrl } from '$lib/config/apiConfig';
	import { getDevApiConfig } from './devConfig';
	import Icon from '@iconify/svelte';
	import { apiToasts, workflowToasts, showConfirmation } from '$lib/services/toastService.js';

	// Get API configuration from development config (uses .env if available)
	const apiConfig = getDevApiConfig();

	/**
	 * Workflow display type
	 */
	interface WorkflowDisplay {
		id: string;
		title: string;
		description: string;
		status: string;
		lastModified: string;
		nodes: number;
		connections: number;
	}

	// Workflow data state
	let workflows = $state<WorkflowDisplay[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let searchQuery = $state('');
	let viewMode = $state<'list' | 'grid'>('list');
	let filteredWorkflows = $derived(
		(Array.isArray(workflows) ? workflows : []).filter(
			(workflow) =>
				workflow.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	// Fetch workflows from API
	async function fetchWorkflows() {
		try {
			loading = true;
			error = null;

			// Use configured endpoint
			const url = getEndpointUrl(apiConfig, apiConfig.endpoints.workflows.list);
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			// Extract workflows from the API response structure
			const apiWorkflows = data?.data || [];
			workflows = apiWorkflows.map(
				(workflow: {
					id: string;
					name: string;
					description: string;
					status?: string;
					changed?: number;
					nodes?: unknown[];
					edges?: unknown[];
				}) => ({
					id: workflow.id,
					title: workflow.name,
					description: workflow.description,
					status: workflow.status || 'Active', // Default to Active if no status
					lastModified: workflow.changed
						? new Date(workflow.changed * 1000).toISOString().split('T')[0]
						: 'Unknown',
					nodes: workflow.nodes?.length || 0,
					connections: workflow.edges?.length || 0
				})
			);

			// Show success toast if workflows were loaded
			if (workflows.length > 0) {
				apiToasts.success('Workflows loaded', `${workflows.length} workflows found`);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch workflows';
			apiToasts.error('Load workflows', err instanceof Error ? err.message : 'Unknown error');

			// Fallback to sample data
			workflows = [
				{
					id: '1',
					title: 'Content Analysis Pipeline',
					description: 'Analyze content for quality issues and provide recommendations',
					status: 'Active',
					lastModified: '2024-01-15',
					nodes: 5,
					connections: 4
				},
				{
					id: 'workflow-2',
					title: 'Multi-Agent Content Management',
					description: 'Orchestrate multiple AI agents for content management tasks',
					status: 'Draft',
					lastModified: '2024-01-14',
					nodes: 8,
					connections: 6
				}
			];
		} finally {
			loading = false;
		}
	}

	// Load workflows on mount
	onMount(() => {
		fetchWorkflows();
	});

	let selectedWorkflow = $state<string | null>(null);

	function handleOperation(workflowId: string, operation: string) {
		selectedWorkflow = null; // Close dropdown

		switch (operation) {
			case 'edit':
				goto(`/workflow/${workflowId}/edit`);
				break;
			case 'delete': {
				// Find the workflow to get its name
				const workflow = workflows.find((w) => w.id === workflowId);
				const workflowName = workflow?.title || 'Unknown';

				// Show confirmation toast
				showConfirmation(`Are you sure you want to delete "${workflowName}"?`);
				// Note: Action buttons removed due to svelte-5-french-toast limitations
				// Handle delete logic here
				workflowToasts.deleted(workflowName);
				// Remove from local state
				workflows = workflows.filter((w) => w.id !== workflowId);
				break;
			}
			case 'view-execution':
				goto(`/workflow/${workflowId}/pipelines`);
				break;
		}
	}
</script>

<svelte:head>
	<title>Workflows - FlowDrop</title>
</svelte:head>

<div class="workflows-page">
	<!-- Header Section -->
	<div class="workflows-header">
		<div class="workflows-header__content">
			<div class="workflows-header__controls">
				<div class="workflows-search">
					<div class="flowdrop-search">
						<input
							type="text"
							placeholder="Search workflows..."
							bind:value={searchQuery}
							class="flowdrop-search__input"
						/>
						<div class="flowdrop-search__icon">
							<Icon icon="mdi:magnify" class="w-4 h-4" />
						</div>
					</div>

					<div class="workflows-view-toggle">
						<button
							class="view-toggle {viewMode === 'list' ? 'view-toggle--active' : ''}"
							aria-label="List view"
							onclick={() => (viewMode = 'list')}
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style="color: #374151;">
								<path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"></path>
							</svg>
						</button>
						<button
							class="view-toggle {viewMode === 'grid' ? 'view-toggle--active' : ''}"
							aria-label="Grid view"
							onclick={() => (viewMode = 'grid')}
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style="color: #374151;">
								<path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"></path>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Workflows List -->
	<div class="workflows-content">
		{#if loading}
			<div class="workflows-loading">
				<div class="workflows-loading__content">
					<div class="workflows-loading__spinner"></div>
					<span>Loading workflows...</span>
				</div>
			</div>
		{:else if error}
			<div class="workflows-error">
				<div class="workflows-error__content">
					<div class="workflows-error__icon">
						<Icon icon="mdi:alert-circle" class="w-8 h-8" />
					</div>
					<h3>Failed to load workflows</h3>
					<p>{error}</p>
					<button class="flowdrop-btn flowdrop-btn--primary" onclick={fetchWorkflows}>
						Try Again
					</button>
				</div>
			</div>
		{:else}
			<div class="workflows-list workflows-list--{viewMode}">
				{#each filteredWorkflows as workflow (workflow.id)}
					<div
						class="workflow-card"
						role="button"
						tabindex="0"
						onclick={() => goto(`/workflow/${workflow.id}/edit`)}
						onkeydown={(e) => e.key === 'Enter' && goto(`/workflow/${workflow.id}/edit`)}
					>
						<div class="workflow-card__icon">
							<Icon icon="mdi:file-document" class="w-5 h-5" />
						</div>

						<div class="workflow-card__content">
							<div class="workflow-card__header">
								<h3 class="workflow-card__title">{workflow.title}</h3>
								<span class="workflow-card__time">Edited {workflow.lastModified}</span>
							</div>
							<p class="workflow-card__description">{workflow.description}</p>
							<div class="workflow-card__meta">
								<span class="workflow-meta workflow-meta--nodes">{workflow.nodes} nodes</span>
								<span class="workflow-meta workflow-meta--connections"
									>{workflow.connections} connections</span
								>
								<span class="workflow-status workflow-status--{workflow.status.toLowerCase()}"
									>{workflow.status}</span
								>
							</div>
						</div>

						<div class="workflow-card__actions">
							<div class="workflow-dropdown">
								<button
									class="workflow-dropdown__trigger"
									onclick={(e) => {
										e.stopPropagation();
										selectedWorkflow = selectedWorkflow === workflow.id ? null : workflow.id;
									}}
									aria-label="Open workflow options menu"
								>
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
										></path>
									</svg>
								</button>

								{#if selectedWorkflow === workflow.id}
									<div class="workflow-dropdown__menu">
										<button
											class="workflow-dropdown__item"
											onclick={() => handleOperation(workflow.id, 'edit')}
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
												></path>
											</svg>
											Edit
										</button>
										<button
											class="workflow-dropdown__item"
											onclick={() => handleOperation(workflow.id, 'view-execution')}
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
												></path>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
												></path>
											</svg>
											View Execution
										</button>
										<div class="workflow-dropdown__divider"></div>
										<button
											class="workflow-dropdown__item workflow-dropdown__item--danger"
											onclick={() => handleOperation(workflow.id, 'delete')}
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												></path>
											</svg>
											Delete
										</button>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}

				{#if filteredWorkflows.length === 0}
					<div class="workflows-empty">
						<div class="workflows-empty__content">
							<div class="workflows-empty__icon">
								<Icon icon="mdi:file-document-outline" class="w-12 h-12" />
							</div>
							<h3>No workflows found</h3>
							<p>
								{searchQuery
									? 'Try adjusting your search query'
									: 'Create your first workflow to get started'}
							</p>
							{#if !searchQuery}
								<button
									class="flowdrop-btn flowdrop-btn--primary"
									onclick={() => goto('/workflow/create')}
								>
									Create Your First Workflow
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.workflows-page {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
		background: #f8fafc;
	}

	.workflows-header {
		background: #ffffff;
		border-bottom: 1px solid #e5e7eb;
		padding: 1rem 2rem;
	}

	.workflows-header__content {
		max-width: 80rem;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.workflows-header__title p {
		color: #6b7280;
		margin: 0;
	}

	.workflows-filters {
		background: transparent;
		padding: 1.5rem 2rem 1rem 2rem;
	}

	.workflows-search {
		max-width: 80rem;
		margin: 0 auto;
	}

	.flowdrop-search {
		position: relative;
		max-width: 400px;
	}

	.flowdrop-search__input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		background: #ffffff;
	}

	.flowdrop-search__input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.flowdrop-search__icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: #6b7280;
	}

	.flowdrop-search__icon :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.workflows-content {
		flex: 1;
		padding: 1rem 2rem;
		overflow-y: auto;
	}

	.workflows-table-container {
		max-width: 80rem;
		margin: 0 auto;
		background: #ffffff;
		border-radius: 1rem;
		box-shadow:
			0 1px 3px 0 rgba(0, 0, 0, 0.1),
			0 1px 2px 0 rgba(0, 0, 0, 0.06);
		overflow: hidden;
	}

	.workflows-table {
		width: 100%;
		border-collapse: collapse;
	}

	.workflow-row {
		transition: all 0.2s ease-in-out;
	}

	.workflow-row:hover {
		background: #f8fafc;
		transform: translateY(-1px);
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.workflow-title h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 0.25rem 0;
		line-height: 1.4;
	}

	.workflow-description p {
		color: #64748b;
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
		max-width: 400px;
	}

	.status-badge {
		padding: 0.375rem 0.875rem;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.status-badge--active {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge--draft {
		background: #fef3c7;
		color: #92400e;
	}

	.workflow-date {
		color: #64748b;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.workflow-nodes,
	.workflow-connections {
		color: #64748b;
		font-size: 0.875rem;
		font-weight: 600;
		text-align: center;
		background: #f1f5f9;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		display: inline-block;
		min-width: 2rem;
	}

	.workflow-operations {
		text-align: right;
	}

	.workflow-dropdown {
		position: relative;
		display: inline-block;
	}

	.workflow-dropdown__trigger {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		padding: 0.75rem;
		cursor: pointer;
		color: #475569;
		border-radius: 0.5rem;
		transition: all 0.2s ease-in-out;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.5rem;
		min-height: 2.5rem;
	}

	.workflow-dropdown__trigger:hover {
		background: #e2e8f0;
		color: #1e293b;
		border-color: #cbd5e1;
		transform: scale(1.05);
	}

	.workflow-dropdown__trigger svg {
		width: 1rem;
		height: 1rem;
	}

	.workflow-dropdown__menu {
		position: absolute;
		right: 0;
		top: 100%;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		z-index: 50;
		min-width: 220px;
		margin-top: 0.75rem;
		overflow: hidden;
	}

	.workflow-dropdown__item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.875rem 1.25rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		color: #374151;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease-in-out;
		border-bottom: 1px solid #f1f5f9;
	}

	.workflow-dropdown__item:last-child {
		border-bottom: none;
	}

	.workflow-dropdown__item svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: #6b7280;
	}

	.workflow-dropdown__item:hover {
		background: #f1f5f9;
		color: #1e293b;
		transform: translateX(2px);
	}

	.workflow-dropdown__item:hover svg {
		color: #475569;
	}

	.workflow-dropdown__item--danger {
		color: #dc2626;
	}

	.workflow-dropdown__item--danger:hover {
		background: #fef2f2;
		color: #b91c1c;
	}

	.workflow-dropdown__item--danger svg {
		color: #dc2626;
	}

	.workflow-dropdown__item--danger:hover svg {
		color: #b91c1c;
	}

	.workflow-dropdown__divider {
		height: 1px;
		background: #e2e8f0;
		margin: 0.5rem 0;
	}

	.workflows-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
	}

	.workflows-empty__content {
		text-align: center;
		max-width: 400px;
	}

	.workflows-empty__icon {
		margin-bottom: 1rem;
		color: #9ca3af;
	}

	.workflows-empty__icon :global(svg) {
		width: 3rem;
		height: 3rem;
	}

	.workflows-empty__content h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.workflows-empty__content p {
		color: #6b7280;
		margin: 0 0 1.5rem 0;
	}

	.workflows-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
	}

	.workflows-loading__content {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: #6b7280;
	}

	.workflows-loading__spinner {
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid #e5e7eb;
		border-top: 2px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.workflows-error {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
	}

	.workflows-error__content {
		text-align: center;
		max-width: 400px;
	}

	.workflows-error__icon {
		margin-bottom: 1rem;
		color: #ef4444;
	}

	.workflows-error__content h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.workflows-error__content p {
		color: #6b7280;
		margin: 0 0 1.5rem 0;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.flowdrop-btn {
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.2s ease-in-out;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.flowdrop-btn--primary {
		background: #3b82f6;
		color: #ffffff;
		border-color: #3b82f6;
	}

	.flowdrop-btn--primary:hover {
		background: #2563eb;
		border-color: #2563eb;
	}

	.flowdrop-btn__icon {
		font-size: 1rem;
	}

	/* New Card-Based Styles */
	.workflows-header__tabs {
		display: flex;
		gap: 0.5rem;
	}

	.workflows-tab {
		padding: 0.5rem 1rem;
		border: none;
		background: none;
		color: #64748b;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s ease-in-out;
	}

	.workflows-tab--active {
		color: #1e293b;
		border-bottom-color: #1e293b;
	}

	.workflows-tab:hover {
		color: #1e293b;
	}

	.workflows-header__controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.workflows-search {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.workflows-view-toggle {
		display: flex;
		gap: 0.25rem;
		background: #f1f5f9;
		border-radius: 0.5rem;
		padding: 0.25rem;
	}

	.view-toggle {
		padding: 0.5rem;
		border: none;
		background: none;
		color: #64748b;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: all 0.2s ease-in-out;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.view-toggle--active {
		background: #ffffff;
		color: #1e293b;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}

	.view-toggle:hover {
		color: #1e293b;
	}

	.workflows-list {
		max-width: 80rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.workflows-list--grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.workflows-list--grid .workflow-card {
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
		padding: 1.25rem;
		position: relative;
	}

	.workflows-list--grid .workflow-card__icon {
		width: 2rem;
		height: 2rem;
		margin-bottom: 0.75rem;
	}

	.workflows-list--grid .workflow-card__header {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.workflows-list--grid .workflow-card__actions {
		position: absolute;
		top: 1rem;
		right: 1rem;
	}

	.workflow-card {
		background: #ffffff;
		border-radius: 0.5rem;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		transition: all 0.2s ease-in-out;
		border: 1px solid #e2e8f0;
		cursor: pointer;
	}

	.workflow-card:hover {
		border-color: #cbd5e1;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.workflow-card__icon {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		flex-shrink: 0;
	}

	.workflow-card__icon {
		background: #3b82f6;
	}

	.workflow-card__content {
		flex: 1;
		min-width: 0;
	}

	.workflow-card__header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.workflow-card__title {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.workflow-card__time {
		color: #64748b;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.workflow-card__description {
		color: #64748b;
		font-size: 0.75rem;
		line-height: 1.4;
		margin: 0 0 0.5rem 0;
		max-width: 500px;
	}

	.workflow-card__meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.workflow-meta {
		color: #64748b;
		font-size: 0.625rem;
		font-weight: 500;
		background: #f1f5f9;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.workflow-status {
		font-size: 0.625rem;
		font-weight: 500;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.workflow-status--active {
		background: #dcfce7;
		color: #166534;
	}

	.workflow-status--draft {
		background: #fef3c7;
		color: #92400e;
	}

	.workflow-card__actions {
		flex-shrink: 0;
	}
</style>
