<!--
  Main Layout Component
  Provides navigation and layout structure for all pages
  Uses MainLayout component with dedicated Navbar component
-->

<script lang="ts">
	import '../app.css';
	import MainLayout from '$lib/components/layouts/MainLayout.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		initializeGlobalSave,
		globalSaveWorkflow,
		globalExportWorkflow
	} from '$lib/services/globalSave.js';
	import {
		buildEndpointUrl,
		type EndpointConfig,
		defaultEndpointConfig,
		createEndpointConfig
	} from '$lib/config/endpoints.js';
	import { getDevConfig, getDevConfigSync } from './devConfig';
	import { setEndpointConfig } from '$lib/services/api.js';
	import { Toaster } from 'svelte-5-french-toast';
	import type { RuntimeConfig } from '$lib/config/runtimeConfig';
	import { initializeSettings } from '$lib/stores/settingsStore.js';

	let { data, children } = $props();

	// API configuration from server-side loaded runtime config
	// This is loaded on the server before any components render
	let endpointConfig = $state<EndpointConfig>({
		...defaultEndpointConfig,
		baseUrl: data.runtimeConfig.apiBaseUrl
	});

	// Workflow name for breadcrumbs
	let workflowName = $state<string | null>(null);

	/**
	 * Fetch workflow name for breadcrumbs
	 */
	async function fetchWorkflowName(workflowId: string) {
		try {
			const url = buildEndpointUrl(endpointConfig, endpointConfig.endpoints.workflows.get, {
				id: workflowId
			});
			const response = await fetch(url);

			if (response.ok) {
				const data = await response.json();
				workflowName = data.data?.name || null;
			}
		} catch {
			// Silently fail for breadcrumb - don't show toast for this background operation
			workflowName = null;
		}
	}

	// Initialize global save functions on mount
	onMount(() => {
		// Initialize settings system (loads from localStorage, applies theme to DOM)
		initializeSettings();

		// Initialize API service with runtime config from server
		// Config is already loaded via +layout.server.ts
		// Note: MSW is initialized in hooks.client.ts before any components mount
		const runtimeConfig = data.runtimeConfig;

		const endpointConfig = createEndpointConfig(runtimeConfig.apiBaseUrl, {
			auth: {
				type: runtimeConfig.authType,
				token: runtimeConfig.authToken
			},
			timeout: runtimeConfig.timeout
		});
		setEndpointConfig(endpointConfig);

		// Now initialize global save (will use the config we just set)
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
	let pageBreadcrumbs = $state<
		Array<{
			label: string;
			href?: string;
			icon?: string;
		}>
	>([]);

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

	// Fetch workflow name for edit pages
	$effect(() => {
		const pathname = $page.url.pathname;
		if (pathname.startsWith('/workflow/') && pathname.includes('/edit')) {
			const workflowId = pathname.split('/')[2];
			if (workflowId) {
				fetchWorkflowName(workflowId);
			}
		} else {
			// Clear workflow name when not on edit page
			workflowName = null;
		}
	});

	// Determine if we should show the navbar (show for all pages except workflow edit pages without breadcrumbs)
	let showNavbar = $derived(
		!$page.url.pathname.startsWith('/workflow/') ||
			$page.url.pathname.includes('/pipelines') ||
			$page.url.pathname.includes('/edit') ||
			$page.url.pathname.includes('/playground')
	);

	function getPrimaryActionsForPage(pathname: string) {
		if (pathname === '/') {
			// Main workflows page
			return [
				{
					label: 'Create Workflow',
					href: '/workflow/create',
					icon: 'mdi:plus',
					variant: 'primary' as const
				},
		{
			label: 'API Docs',
			href: 'https://flowdrop-io.github.io/flowdrop/',
			icon: 'mdi:api',
			variant: 'outline' as const,
			external: true
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
					label: 'Pipelines',
					href: `/workflow/${pathname.split('/')[2]}/pipelines`,
					icon: 'mdi:source-branch',
					variant: 'outline' as const
				},
				{
					label: 'Playground',
					href: `/workflow/${pathname.split('/')[2]}/playground`,
					icon: 'mdi:play-circle-outline',
					variant: 'outline' as const
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
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/playground')) {
			// Playground page
			const workflowId = pathname.split('/')[2];
			return [
				{
					label: 'Edit Workflow',
					href: `/workflow/${workflowId}/edit`,
					icon: 'mdi:pencil',
					variant: 'outline' as const
				},
				{
					label: 'Pipelines',
					href: `/workflow/${workflowId}/pipelines`,
					icon: 'mdi:source-branch',
					variant: 'outline' as const
				}
			];
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/pipelines')) {
			// Pipeline monitoring pages
			if (pathname.includes('/pipelines/') && pathname.split('/').length > 4) {
				// Individual pipeline status page
				// Extract workflowId from pathname
				const workflowId = pathname.split('/')[2];
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
				label: 'Home',
				href: '/',
				icon: 'mdi:home',
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
			// On homepage, just show "Home"
			return [
				{
					label: 'Home',
					icon: 'mdi:home'
				}
			];
		} else if (pathname.startsWith('/workflow/create')) {
			return [
				{
					label: 'Home',
					href: '/',
					icon: 'mdi:home'
				},
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
			return [
				{
					label: 'Home',
					href: '/',
					icon: 'mdi:home'
				},
				{
					label: 'Workflows',
					href: '/',
					icon: 'mdi:view-list'
				},
				{
					label: workflowName || 'Workflow',
					icon: 'mdi:pencil'
				}
			];
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/playground')) {
			// Playground page
			const workflowId = pathname.split('/')[2];
			return [
				{
					label: 'Home',
					href: '/',
					icon: 'mdi:home'
				},
				{
					label: 'Workflows',
					href: '/',
					icon: 'mdi:view-list'
				},
				{
					label: workflowName || 'Workflow',
					href: `/workflow/${workflowId}/edit`,
					icon: 'mdi:workflow'
				},
				{
					label: 'Playground',
					icon: 'mdi:play-circle-outline'
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
						label: 'Home',
						href: '/',
						icon: 'mdi:home'
					},
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
				label: 'Home',
				href: '/',
				icon: 'mdi:home'
			},
			{
				label: 'API Docs',
				href: 'https://flowdrop-io.github.io/flowdrop/',
				icon: 'mdi:api',
				variant: 'outline' as const,
				external: true
			}
		];
	}
</script>

<!-- Main Application Layout -->
<MainLayout
	showHeader={showNavbar}
	showLeftSidebar={false}
	showRightSidebar={false}
	showFooter={false}
	headerHeight={60}
	enableLeftSplitPane={false}
	enableRightSplitPane={false}
>
	{#snippet header()}
		<Navbar
			title={currentBreadcrumbs.length === 0
				? $page.url.pathname === '/'
					? 'Workflows'
					: 'FlowDrop'
				: undefined}
			breadcrumbs={currentBreadcrumbs.length > 0 ? currentBreadcrumbs : undefined}
			{primaryActions}
		/>
	{/snippet}

	<!-- Main Content Area -->
	{@render children()}
</MainLayout>

<!-- Toast Notifications (outside MainLayout for proper z-index stacking) -->
<Toaster position="bottom-center" />
