<!--
  Main Layout Component
  Provides navigation and layout structure for all pages
  Uses dedicated Navbar component with customizable actions
-->

<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { initializeGlobalSave, globalSaveWorkflow, globalExportWorkflow } from '$lib/services/globalSave.js';

	let { children } = $props();

	// Initialize global save functions on mount
	onMount(() => {
		initializeGlobalSave();
		
		// Listen for breadcrumb updates
		const handleBreadcrumbs = (event: CustomEvent) => {
			pageBreadcrumbs = event.detail.breadcrumbs || [];
		};
		
		window.addEventListener('page-breadcrumbs-update', handleBreadcrumbs);
		
		return () => {
			window.removeEventListener('page-breadcrumbs-update', handleBreadcrumbs);
		};
	});

	// Define primary actions based on current page
	let primaryActions = $derived(getPrimaryActionsForPage($page.url.pathname));
	
	// Breadcrumbs for navbar
	let pageBreadcrumbs = $state<Array<{
		label: string;
		href?: string;
		icon?: string;
	}>>([]);
	
	// Generate breadcrumbs based on current page
	let currentBreadcrumbs = $derived(generateBreadcrumbsForPage($page.url.pathname));
	
	// Clear custom breadcrumbs when page changes (unless it's a pipeline detail page)
	$effect(() => {
		const pathname = $page.url.pathname;
		if (!pathname.includes('/pipelines/') || pathname.split('/').length <= 4) {
			// Clear custom breadcrumbs for non-pipeline detail pages
			pageBreadcrumbs = [];
		}
	});
	
	// Determine if we should show the navbar (show for all pages except workflow edit pages without breadcrumbs)
	let showNavbar = $derived(!$page.url.pathname.startsWith('/workflow/') || 
		$page.url.pathname.includes('/pipelines') || 
		$page.url.pathname.includes('/edit'));

	function getPrimaryActionsForPage(pathname: string) {
		if (pathname === '/') {
			// Main workflows page
			return [
				{
					label: 'Workflows',
					href: '/',
					icon: 'mdi:view-list',
					variant: 'primary' as const
				},
				{
					label: 'Create Workflow',
					href: '/workflow/create',
					icon: 'mdi:plus',
					variant: 'outline' as const
				}
			];
		} else if (pathname.startsWith('/workflow/create')) {
			// Create workflow page
			return [
				{
					label: 'Back to Workflows',
					href: '/',
					icon: 'mdi:arrow-left',
					variant: 'outline' as const
				},
				{
					label: 'Save Workflow',
					href: '#',
					icon: 'mdi:content-save',
					variant: 'primary' as const,
					onclick: (e: Event) => {
						e.preventDefault();
						globalSaveWorkflow();
					}
				}
			];
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/edit')) {
			// Edit workflow page
			return [
				{
					label: 'Save',
					href: '#',
					icon: 'mdi:content-save',
					variant: 'primary' as const,
					onclick: (e: Event) => {
						e.preventDefault();
						globalSaveWorkflow();
					}
				},
				{
					label: 'Export',
					href: '#',
					icon: 'mdi:download',
					variant: 'outline' as const,
					onclick: (e: Event) => {
						e.preventDefault();
						globalExportWorkflow();
					}
				},
				{
					label: 'Workflow Settings',
					href: '#',
					icon: 'mdi:cog',
					variant: 'outline' as const,
					onclick: (e: Event) => {
						e.preventDefault();
						// This will be handled by the App component
						window.dispatchEvent(new CustomEvent('workflow-settings-toggle'));
					}
				}
			];
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/execute')) {
			// Execute workflow page
			return [
				{
					label: 'Back to Workflow',
					href: pathname.replace('/execute', ''),
					icon: 'mdi:arrow-left',
					variant: 'outline' as const
				},
				{
					label: 'Stop Execution',
					href: '#',
					icon: 'mdi:stop',
					variant: 'primary' as const
				}
			];
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/logs')) {
			// Logs page
			return [
				{
					label: 'Back to Workflow',
					href: pathname.replace('/logs', ''),
					icon: 'mdi:arrow-left',
					variant: 'outline' as const
				},
				{
					label: 'Refresh Logs',
					href: '#',
					icon: 'mdi:refresh',
					variant: 'secondary' as const
				}
			];
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/pipelines')) {
			// Pipeline monitoring pages
			if (pathname.includes('/pipelines/') && pathname.split('/').length > 4) {
				// Individual pipeline status page
				const workflowId = pathname.split('/')[2];
				const pipelineId = pathname.split('/')[4];
				return [
					{
						label: 'Refresh Status',
						href: '#',
						icon: 'mdi:refresh',
						variant: 'outline' as const,
						onclick: (e: Event) => {
							e.preventDefault();
							// This will be handled by the PipelineStatus component
							window.dispatchEvent(new CustomEvent('pipeline-refresh'));
						}
					},
					{
						label: 'View Logs',
						href: '#',
						icon: 'mdi:file-document-outline',
						variant: 'outline' as const,
						onclick: (e: Event) => {
							e.preventDefault();
							// This will be handled by the PipelineStatus component
							window.dispatchEvent(new CustomEvent('pipeline-view-logs'));
						}
					},
					{
						label: 'Edit Workflow',
						href: `/workflow/${workflowId}/edit`,
						icon: 'mdi:pencil',
						variant: 'secondary' as const
					}
				];
			} else {
				// Pipeline selection page
				return [
					{
						label: 'Create Pipeline',
						href: '#',
						icon: 'mdi:plus',
						variant: 'primary' as const
					}
				];
			}
		}

		// Default actions for unknown pages
		return [
			{
				label: 'Workflows',
				href: '/',
				icon: 'mdi:view-list',
				variant: 'primary' as const
			}
		];
	}

	// Generate breadcrumbs based on current page
	function generateBreadcrumbsForPage(pathname: string) {
		// If we have custom breadcrumbs from components, use those
		if (pageBreadcrumbs.length > 0) {
			return pageBreadcrumbs;
		}

		// Generate default breadcrumbs based on path
		if (pathname === '/') {
			return [
				{
					label: 'Workflows',
					icon: 'mdi:view-list'
				}
			];
		} else if (pathname.startsWith('/workflow/create')) {
			return [
				{
					label: 'Workflows',
					href: '/',
					icon: 'mdi:view-list'
				},
				{
					label: 'Create Workflow',
					icon: 'mdi:plus'
				}
			];
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/edit')) {
			const workflowId = pathname.split('/')[2];
			return [
				{
					label: 'Workflows',
					href: '/',
					icon: 'mdi:view-list'
				},
				{
					label: 'Edit Workflow',
					icon: 'mdi:pencil'
				}
			];
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/pipelines')) {
			const workflowId = pathname.split('/')[2];
			if (pathname.includes('/pipelines/') && pathname.split('/').length > 4) {
				// Individual pipeline status page - this will be handled by PipelineStatus component
				return [];
			} else {
				// Pipeline list page
				return [
					{
						label: 'Workflows',
						href: '/',
						icon: 'mdi:view-list'
					},
					{
						label: 'Workflow',
						href: `/workflow/${workflowId}/edit`,
						icon: 'mdi:workflow'
					},
					{
						label: 'Pipelines',
						icon: 'mdi:source-branch'
					}
				];
			}
		}

		// Default breadcrumb for other pages
		return [
			{
				label: 'Workflows',
				href: '/',
				icon: 'mdi:view-list'
			}
		];
	}
</script>

<div class="flowdrop-app" style="--flowdrop-navbar-height: 60px;">
	<!-- Navigation Bar - only show for non-workflow pages -->
	{#if showNavbar}
		<Navbar 
			title={currentBreadcrumbs.length === 0 ? ($page.url.pathname === '/' ? 'Workflows' : 'FlowDrop') : undefined}
			breadcrumbs={currentBreadcrumbs.length > 0 ? currentBreadcrumbs : undefined}
			{primaryActions} 
		/>
	{/if}

	<!-- Main Content Area -->
	<main class="flowdrop-main">
		{@render children()}
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
</style>
