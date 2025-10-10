<!--
  FlowDrop Navbar Component
  Reusable navigation bar with customizable primary actions
  - Logo and branding on the left
  - Primary actions in the center
  - Status indicator on the right
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import Logo from './Logo.svelte';

	interface NavbarAction {
		label: string;
		href: string;
		icon?: string;
		variant?: 'primary' | 'secondary' | 'outline';
		onclick?: (event: Event) => void;
	}

	interface Props {
		primaryActions?: NavbarAction[];
		showStatus?: boolean;
		title?: string;
	}

	let { primaryActions = [], showStatus = true, title }: Props = $props();

	// Simple current path tracking without SvelteKit dependency
	let currentPath = $state(typeof window !== 'undefined' ? window.location.pathname : '/');
	
	// Dropdown state
	let isDropdownOpen = $state(false);

	function isActive(href: string): boolean {
		if (href === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(href);
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.flowdrop-navbar__dropdown')) {
			isDropdownOpen = false;
		}
	}

	// Add event listener for click outside
	if (typeof window !== 'undefined') {
		document.addEventListener('click', handleClickOutside);
	}
</script>

<div class="flowdrop-navbar">
	<div class="flowdrop-navbar__start">
		<!-- Logo and Title -->
		<a href="/" class="flowdrop-logo--container">
			<div class="flowdrop-flex flowdrop-gap--3">
				<div class="flowdrop-logo--header">
					<Logo />
				</div>
				<div>
					<h1 class="flowdrop-text--logo flowdrop-font--bold">FlowDrop</h1>
					<p class="flowdrop-text--tagline flowdrop-text--gray">Visual Workflow Manager</p>
				</div>
			</div>
		</a>
	</div>

	<div class="flowdrop-navbar__center">
		<div class="flowdrop-navbar__center-content">
			<!-- Status Indicator on top -->
			{#if showStatus}
				<div class="flowdrop-navbar__status-container">
					<div class="flowdrop-navbar__status">
						<div class="flowdrop-navbar__status-indicator"></div>
						<span class="flowdrop-navbar__status-text">Connected</span>
					</div>
				</div>
			{/if}
			
			<!-- Title on bottom -->
			{#if title}
				<div class="flowdrop-navbar__title-container">
					<div class="flowdrop-navbar__title">
						<h2 class="flowdrop-navbar__title-text">{title}</h2>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="flowdrop-navbar__actions">
		{#if primaryActions.length > 0}
			<!-- Primary Action Button -->
			{#if primaryActions[0]}
				{@const primaryAction = primaryActions[0]}
				<a
					href={primaryAction.href}
					class="flowdrop-navbar__primary-action flowdrop-navbar__action--{primaryAction.variant || 'primary'}"
					onclick={primaryAction.onclick}
				>
					{#if primaryAction.icon}
						<span class="flowdrop-navbar__action-icon">
							<Icon icon={primaryAction.icon} class="w-4 h-4" />
						</span>
					{/if}
					<span class="flowdrop-navbar__action-label">{primaryAction.label}</span>
				</a>
			{/if}

			<!-- Dropdown for Additional Actions -->
			{#if primaryActions.length > 1}
				<div class="flowdrop-navbar__dropdown">
					<button 
						class="flowdrop-navbar__dropdown-trigger"
						onclick={() => isDropdownOpen = !isDropdownOpen}
						aria-expanded={isDropdownOpen}
						aria-haspopup="true"
					>
						<Icon icon="heroicons:chevron-down" class="w-4 h-4" />
					</button>
					
					{#if isDropdownOpen}
						<div class="flowdrop-navbar__dropdown-menu">
							{#each primaryActions.slice(1) as action (action.label)}
								<a
									href={action.href}
									class="flowdrop-navbar__dropdown-item"
									onclick={(e) => {
										action.onclick?.(e);
										isDropdownOpen = false;
									}}
								>
									{#if action.icon}
										<Icon icon={action.icon} class="w-4 h-4" />
									{/if}
									<span>{action.label}</span>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>

	<div class="flowdrop-navbar__end">
		<!-- Additional actions or content can go here -->
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
		width: 320px;
		min-width: 320px;
		flex-shrink: 0;
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

	.flowdrop-navbar__center {
		flex: 1;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		padding-left: 1rem;
	}

	.flowdrop-navbar__center-content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 0.25rem;
	}

	.flowdrop-navbar__title-container {
		display: flex;
		justify-content: flex-start;
		align-items: center;
	}

	.flowdrop-navbar__title {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
	}

	.flowdrop-navbar__title-text {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 500px;
		text-align: left;
		line-height: 1.2;
	}

	.flowdrop-navbar__status-container {
		display: flex;
		justify-content: flex-start;
		align-items: center;
	}

	.flowdrop-navbar__status {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.125rem 0.5rem;
		background-color: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.flowdrop-navbar__status-indicator {
		width: 0.375rem;
		height: 0.375rem;
		background-color: #22c55e;
		border-radius: 50%;
		animation: pulse 2s infinite;
	}

	.flowdrop-navbar__status-text {
		color: #166534;
		font-size: 0.75rem;
		font-weight: 500;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.flowdrop-navbar__actions {
		display: flex;
		align-items: center;
		gap: 0;
		margin-left: auto;
		position: relative;
	}

	.flowdrop-navbar__primary-action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		text-decoration: none;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem 0 0 0.375rem;
		transition: all 0.2s ease-in-out;
		font-weight: 500;
		font-size: 0.875rem;
		height: 2.5rem;
		box-sizing: border-box;
		background-color: #ffffff;
		color: #374151;
		border-right: none;
	}

	.flowdrop-navbar__primary-action:hover {
		background-color: #f9fafb;
		color: #111827;
	}

	.flowdrop-navbar__dropdown {
		position: relative;
		display: flex;
		align-items: center;
		height: 2.5rem;
	}

	.flowdrop-navbar__dropdown-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2.5rem;
		border: 1px solid #d1d5db;
		border-left: none;
		border-radius: 0 0.375rem 0.375rem 0;
		background-color: #ffffff;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		box-sizing: border-box;
	}

	.flowdrop-navbar__dropdown-trigger:hover {
		background-color: #f9fafb;
		color: #111827;
	}

	.flowdrop-navbar__dropdown-trigger[aria-expanded="true"] {
		background-color: #f3f4f6;
		color: #111827;
	}

	.flowdrop-navbar__dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 50;
		margin-top: 0.25rem;
		min-width: 12rem;
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}

	.flowdrop-navbar__dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		text-decoration: none;
		color: #374151;
		font-size: 0.875rem;
		font-weight: 500;
		transition: background-color 0.2s ease-in-out;
		border: none;
		width: 100%;
		text-align: left;
	}

	.flowdrop-navbar__dropdown-item:hover {
		background-color: #f9fafb;
		color: #111827;
	}

	.flowdrop-navbar__dropdown-item:first-child {
		border-top: none;
	}

	.flowdrop-navbar__dropdown-item:last-child {
		border-bottom: none;
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

		.flowdrop-navbar__start {
			width: 280px;
			min-width: 280px;
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

		.flowdrop-navbar__title-text {
			font-size: 0.875rem;
			max-width: 300px;
		}

		.flowdrop-navbar__status {
			font-size: 0.625rem;
			padding: 0.125rem 0.375rem;
		}
	}

	@media (max-width: 480px) {
		.flowdrop-navbar__start {
			width: 240px;
			min-width: 240px;
		}

		.flowdrop-navbar__title-text {
			font-size: 0.75rem;
			max-width: 200px;
		}
	}
</style>
