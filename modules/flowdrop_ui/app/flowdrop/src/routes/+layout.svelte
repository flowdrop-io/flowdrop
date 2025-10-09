<!--
  Main Layout Component
  Provides navigation and layout structure for all pages
  Uses dedicated Navbar component with customizable actions
-->

<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	// Define primary actions based on current page
	let primaryActions = $derived(getPrimaryActionsForPage($page.url.pathname));

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
					variant: 'primary' as const
				}
			];
		} else if (pathname.startsWith('/workflow/') && pathname.includes('/edit')) {
			// Edit workflow page
			return [
				{
					label: 'Back to Workflows',
					href: '/',
					icon: 'mdi:arrow-left',
					variant: 'outline' as const
				},
				{
					label: 'Save Changes',
					href: '#',
					icon: 'mdi:content-save',
					variant: 'primary' as const
				},
				{
					label: 'Execute',
					href: '#',
					icon: 'mdi:play',
					variant: 'secondary' as const
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
</script>

<div class="flowdrop-app" style="--flowdrop-navbar-height: 60px;">
	<!-- Navigation Bar -->
	<Navbar {primaryActions} />

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
