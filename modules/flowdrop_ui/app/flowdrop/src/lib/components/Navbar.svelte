<!--
  FlowDrop Navbar Component
  Reusable navigation bar with customizable primary actions
  - Logo and branding on the left
  - Primary actions in the center
  - Status indicator on the right
-->

<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';

	interface NavbarAction {
		label: string;
		href: string;
		icon?: string;
		variant?: 'primary' | 'secondary' | 'outline';
	}

	interface Props {
		primaryActions?: NavbarAction[];
		showStatus?: boolean;
	}

	let { primaryActions = [], showStatus = true }: Props = $props();

	// Get current route for active state
	let currentPath = $derived($page.url.pathname);

	function isActive(href: string): boolean {
		if (href === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(href);
	}
</script>

<div class="flowdrop-navbar">
	<div class="flowdrop-navbar__start">
		<!-- Logo and Title -->
		<a href="/" class="flowdrop-logo--container">
			<div class="flowdrop-flex flowdrop-gap--3">
				<div class="flowdrop-logo--header">
					<img src="/logo.svg" alt="FlowDrop Logo" />
				</div>
				<div>
					<h1 class="flowdrop-text--logo flowdrop-font--bold">FlowDrop</h1>
					<p class="flowdrop-text--tagline flowdrop-text--gray">Visual Workflow Manager</p>
				</div>
			</div>
		</a>
	</div>

	<div class="flowdrop-navbar__center">
		<!-- Primary Actions -->
		{#if primaryActions.length > 0}
			<div class="flowdrop-navbar__actions">
				{#each primaryActions as action (action.label)}
					<a
						href={action.href}
						class="flowdrop-navbar__action flowdrop-navbar__action--{action.variant ||
							'primary'} {isActive(action.href) ? 'flowdrop-navbar__action--active' : ''}"
					>
						{#if action.icon}
							<span class="flowdrop-navbar__action-icon">
								<Icon icon={action.icon} class="w-4 h-4" />
							</span>
						{/if}
						<span class="flowdrop-navbar__action-label">{action.label}</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<div class="flowdrop-navbar__end">
		<!-- API Status Indicator -->
		{#if showStatus}
			<div class="flowdrop-api-status">
				<div class="flowdrop-api-status__indicator flowdrop-api-status__indicator--connected"></div>
				<span class="flowdrop-text--xs flowdrop-text--gray"> API Connected </span>
			</div>
		{/if}
	</div>
</div>

<style>
	.flowdrop-navbar {
		height: var(--flowdrop-navbar-height, 60px);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		background-color: #ffffff;
		border-bottom: 1px solid #e5e7eb;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		z-index: 10;
	}

	.flowdrop-navbar__start {
		display: flex;
		align-items: center;
	}

	.flowdrop-logo--container {
		text-decoration: none;
		color: #000;
	}

	.flowdrop-logo--header {
		width: 40px;
		height: 40px;
		font-size: 1.25rem;
		padding: 2px;
	}

	.flowdrop-logo--header img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.flowdrop-navbar__center {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.flowdrop-navbar__actions {
		display: flex;
		gap: 0.5rem;
	}

	.flowdrop-navbar__action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		text-decoration: none;
		border-radius: 0.375rem;
		transition: all 0.2s ease-in-out;
		font-weight: 500;
		font-size: 0.875rem;
		border: 1px solid transparent;
	}

	.flowdrop-navbar__action--primary {
		background-color: #3b82f6;
		color: #ffffff;
		border-color: #3b82f6;
	}

	.flowdrop-navbar__action--primary:hover {
		background-color: #2563eb;
		border-color: #2563eb;
		color: #ffffff;
	}

	.flowdrop-navbar__action--secondary {
		background-color: #f3f4f6;
		color: #374151;
		border-color: #d1d5db;
	}

	.flowdrop-navbar__action--secondary:hover {
		background-color: #e5e7eb;
		color: #111827;
	}

	.flowdrop-navbar__action--outline {
		background-color: transparent;
		color: #374151;
		border-color: #d1d5db;
	}

	.flowdrop-navbar__action--outline:hover {
		background-color: #f9fafb;
		color: #111827;
		border-color: #9ca3af;
	}

	.flowdrop-navbar__action--active {
		background-color: #eff6ff;
		color: #1d4ed8;
		border-color: #93c5fd;
	}

	.flowdrop-navbar__action-icon {
		display: flex;
		align-items: center;
	}

	.flowdrop-navbar__action-icon :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.flowdrop-navbar__action-label {
		font-weight: 500;
	}

	.flowdrop-navbar__end {
		display: flex;
		align-items: center;
	}

	.flowdrop-api-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		background-color: #f3f4f6;
	}

	.flowdrop-api-status__indicator {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		transition: background-color 0.2s ease-in-out;
	}

	.flowdrop-api-status__indicator--connected {
		background-color: #10b981;
	}

	/* Utility classes */
	.flowdrop-flex {
		display: flex;
	}

	.flowdrop-gap--3 {
		gap: 0.75rem;
	}

	.flowdrop-text--logo {
		font-size: 1.125rem;
		line-height: 0;
	}

	.flowdrop-text--tagline {
		font-size: 0.75rem;
		line-height: 0.5rem;
	}

	.flowdrop-text--xs {
		font-size: 0.75rem;
		line-height: 1rem;
	}

	.flowdrop-text--gray {
		color: #6b7280;
	}

	.flowdrop-font--bold {
		font-weight: 700;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.flowdrop-navbar {
			padding: 0 0.5rem;
		}

		.flowdrop-navbar__actions {
			display: none;
		}

		.flowdrop-text--logo {
			font-size: 1rem;
		}

		.flowdrop-text--tagline {
			display: none;
		}
	}
</style>
