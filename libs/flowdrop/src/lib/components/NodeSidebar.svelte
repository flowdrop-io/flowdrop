<!--
  Node Sidebar Component
  Displays available node types organized by category with accordion-style groups
  Styled with BEM syntax
-->

<script lang="ts">
	import type { NodeMetadata, NodeCategory, WorkflowFormat } from '../types/index.js';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import Icon from '@iconify/svelte';
	import { getNodeIcon, getCategoryIcon } from '../utils/icons.js';
	import { getCategoryColorToken } from '../utils/colors.js';
	import { getCategoryLabel } from '../stores/categoriesStore.svelte.js';
	import { SvelteSet } from 'svelte/reactivity';
	import { getUiSettings, updateSettings } from '../stores/settingsStore.svelte.js';

	interface Props {
		nodes: NodeMetadata[];
		selectedCategory?: NodeCategory;
		activeFormat?: WorkflowFormat;
	}

	let props: Props = $props();
	let searchInput = $state('');
	// svelte-ignore state_referenced_locally — initial default, user selects interactively
	let selectedCategory = $state(props.selectedCategory || 'all');

	/**
	 * Toggle the sidebar collapsed state
	 * Persists the new state to settings
	 */
	function toggleSidebar(): void {
		updateSettings({ ui: { sidebarCollapsed: !getUiSettings().sidebarCollapsed } });
	}

	/**
	 * Check if a node is compatible with the active workflow format.
	 * Nodes without formats are universal (compatible with all formats).
	 */
	function isNodeCompatibleWithFormat(node: NodeMetadata): boolean {
		if (!props.activeFormat) return true;
		if (!node.formats || node.formats.length === 0) return true;
		return node.formats.includes(props.activeFormat);
	}

	/** Nodes filtered by format compatibility */
	let formatCompatibleNodes = $derived((props.nodes || []).filter(isNodeCompatibleWithFormat));

	let filteredNodes = $derived(getFilteredNodes());
	let categories = $derived(getCategories());

	/**
	 * Get all unique categories from node types, preserving API order
	 * Categories appear in the order their first node appears in the API response
	 */
	function getCategories(): NodeCategory[] {
		if (formatCompatibleNodes.length === 0) return [];
		// Use a Set to track uniqueness while preserving insertion order
		const seen = new SvelteSet<NodeCategory>();
		const orderedCategories: NodeCategory[] = [];
		for (const node of formatCompatibleNodes) {
			if (!seen.has(node.category)) {
				seen.add(node.category);
				orderedCategories.push(node.category);
			}
		}
		return orderedCategories;
	}

	/**
	 * Filter node types based on search query and selected category
	 * Preserves the API order - no client-side sorting applied
	 */
	function getFilteredNodes(): NodeMetadata[] {
		// Start with format-compatible nodes
		let filtered = formatCompatibleNodes;

		// Filter by category
		if (selectedCategory !== 'all') {
			filtered = filtered.filter((node) => node.category === selectedCategory);
		}

		// Filter by search query
		if (searchInput.trim()) {
			const query = searchInput.toLowerCase();
			filtered = filtered.filter(
				(node) =>
					node.name.toLowerCase().includes(query) ||
					node.description.toLowerCase().includes(query) ||
					node.tags?.some((tag) => tag.toLowerCase().includes(query))
			);
		}

		// Return filtered results preserving API order
		return filtered;
	}

	/**
	 * Handle node type drag start - creates a new node instance
	 */
	function handleNodeDragStart(event: DragEvent, nodeType: NodeMetadata): void {
		if (!event.dataTransfer) return;

		// Extract initial config from configSchema with proper null checks
		let initialConfig: Record<string, unknown> = {};
		if (
			nodeType.configSchema &&
			typeof nodeType.configSchema === 'object' &&
			nodeType.configSchema.properties &&
			typeof nodeType.configSchema.properties === 'object'
		) {
			// JSON Schema format - extract defaults
			Object.entries(nodeType.configSchema.properties).forEach(([key, prop]) => {
				if (prop && typeof prop === 'object' && 'default' in prop) {
					initialConfig[key] = prop.default;
				}
			});
		}

		// Create a new node instance from the node type
		const newNodeData = {
			type: 'node',
			nodeType: nodeType.id,
			nodeData: {
				label: nodeType.name,
				config: initialConfig,
				metadata: nodeType
			}
		};

		const jsonData = JSON.stringify(newNodeData);

		// Set the data that SvelteFlow will receive
		event.dataTransfer.setData('application/json', jsonData);
		event.dataTransfer.setData('text/plain', nodeType.name);
		event.dataTransfer.effectAllowed = 'copy';

		// Set drag image
		if (event.target) {
			const rect = (event.target as HTMLElement).getBoundingClientRect();
			event.dataTransfer.setDragImage(event.target as HTMLElement, rect.width / 2, rect.height / 2);
		}
	}

	/**
	 * Handle search input change
	 */
	function handleSearchChange(): void {
		// Search is handled reactively through the derived filteredNodes
	}

	/**
	 * Handle node click
	 */
	function handleNodeClick(nodeType: NodeMetadata): void {
		// Handle node click - could be used for preview or configuration
	}

	/**
	 * Get category display name from the categories store.
	 * Falls back to auto-capitalizing the category machine name.
	 */
	function getCategoryDisplayName(category: NodeCategory): string {
		return getCategoryLabel(category);
	}

	/**
	 * Get node types for category
	 * Preserves the API order - no client-side sorting applied
	 */
	function getNodesForCategory(category: NodeCategory): NodeMetadata[] {
		return formatCompatibleNodes.filter((node) => node.category === category);
	}

	/**
	 * Get filtered nodes for category
	 */
	function getFilteredNodesForCategory(category: NodeCategory): NodeMetadata[] {
		let nodes = getNodesForCategory(category);

		// Filter by search query
		if (searchInput.trim()) {
			const query = searchInput.toLowerCase();
			nodes = nodes.filter(
				(node) =>
					node.name.toLowerCase().includes(query) ||
					node.description.toLowerCase().includes(query) ||
					node.tags?.some((tag) => tag.toLowerCase().includes(query))
			);
		}

		return nodes;
	}
</script>

<!-- Components Sidebar - Always Visible -->
<aside
	class="flowdrop-sidebar flowdrop-sidebar--container"
	class:flowdrop-sidebar--collapsed={getUiSettings().sidebarCollapsed}
	class:flowdrop-sidebar--compact={getUiSettings().compactMode}
	style:width="{getUiSettings().sidebarCollapsed ? 48 : getUiSettings().sidebarWidth}px"
	aria-label="Components sidebar"
>
	<!-- Header -->
	<div class="flowdrop-sidebar__header">
		<button
			class="flowdrop-sidebar__toggle"
			onclick={toggleSidebar}
			aria-label={getUiSettings().sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			title={getUiSettings().sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			<Icon icon={getUiSettings().sidebarCollapsed ? 'mdi:chevron-right' : 'mdi:chevron-left'} />
		</button>
		{#if !getUiSettings().sidebarCollapsed}
			<div class="flowdrop-sidebar__title">
				<h2 class="flowdrop-text--lg flowdrop-font--bold">Components</h2>
			</div>
		{/if}
	</div>

	{#if !getUiSettings().sidebarCollapsed}
		<!-- Search Section -->
		<div class="flowdrop-sidebar__search">
			<div class="flowdrop-join flowdrop-w--full">
				<div class="flowdrop-join__item flowdrop-flex--1">
					<input
						type="text"
						placeholder="Search components..."
						class="flowdrop-input flowdrop-join__item flowdrop-w--full"
						bind:value={searchInput}
						oninput={handleSearchChange}
					/>
				</div>
				<button class="flowdrop-btn flowdrop-join__item" aria-label="Search components">
					<Icon icon="mdi:magnify" class="flowdrop-icon" />
				</button>
			</div>
		</div>

		<!-- Node Types List -->
		<div class="flowdrop-sidebar__content">
			{#if props.nodes?.length === 0}
				<!-- No node types available -->
				<div class="flowdrop-hero">
					<div class="flowdrop-hero__content">
						<div class="flowdrop-hero__icon">📦</div>
						<h3 class="flowdrop-hero__title">No node types available</h3>
						<p class="flowdrop-hero__description">Node type definitions will appear here</p>
						<div class="flowdrop-mb--4">
							<LoadingSpinner size="md" text="Loading from server..." />
						</div>
					</div>
				</div>
			{:else if searchInput.trim()}
				<!-- Search Results -->
				<div class="flowdrop-p--4">
					<div class="flowdrop-divider">
						<h3 class="flowdrop-divider__text">Search Results</h3>
					</div>
					{#if filteredNodes.length === 0}
						<div class="flowdrop-hero">
							<div class="flowdrop-hero__content">
								<div class="flowdrop-hero__icon">🔍</div>
								<h3 class="flowdrop-hero__title">No components found</h3>
								<p class="flowdrop-hero__description">Try adjusting your search</p>
								{#if props.nodes?.length === 0}
									<div class="flowdrop-mb--4">
										<LoadingSpinner size="sm" text="Loading components..." />
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<div class="flowdrop-node-list">
							{#each filteredNodes as nodeType (nodeType.id)}
								<div
									class="flowdrop-card flowdrop-card--compact flowdrop-node-item"
									draggable="true"
									ondragstart={(e) => handleNodeDragStart(e, nodeType)}
									role="button"
									tabindex="0"
								>
									<div class="flowdrop-card__body flowdrop-p--1 flowdrop-py--1">
										<div class="flowdrop-flex flowdrop-gap--2 flowdrop-items--center">
											<!-- Node Type Icon with Squircle Background -->
											<span
												class="flowdrop-node-icon"
												style="--_icon-color: {getCategoryColorToken(nodeType.category)}"
											>
												<Icon icon={getNodeIcon(nodeType.icon, nodeType.category)} />
											</span>

											<!-- Node Type Info - Icon and Title only -->
											<h4
												class="flowdrop-text--sm flowdrop-font--medium flowdrop-truncate flowdrop-flex--1"
											>
												{nodeType.name}
											</h4>
										</div>
										<p
											class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate flowdrop-mt--1 flowdrop-ml--0"
										>
											{nodeType.description}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<!-- Show categories with details when no search is active -->
				<div class="flowdrop-p--4">
					<!-- Category-specific details -->
					<div class="flowdrop-category-list">
						{#each categories as category (category)}
							{@const categoryNodes = getFilteredNodesForCategory(category)}
							{#if categoryNodes.length > 0}
								<details class="flowdrop-details">
									<summary class="flowdrop-details__summary">
										<div class="flowdrop-flex flowdrop-gap--2 flowdrop-items--center">
											<span
												class="flowdrop-node-icon"
												style="--_icon-color: {getCategoryColorToken(category)}"
											>
												<Icon icon={getCategoryIcon(category)} />
											</span>
											<span>{getCategoryDisplayName(category)}</span>
										</div>
										<div class="flowdrop-badge flowdrop-badge--secondary">
											{categoryNodes.length}
										</div>
									</summary>
									<div class="flowdrop-details__content">
										<div class="flowdrop-node-list">
											{#each categoryNodes as nodeType (nodeType.id)}
												<div
													class="flowdrop-card flowdrop-card--compact flowdrop-node-item"
													draggable="true"
													ondragstart={(e) => handleNodeDragStart(e, nodeType)}
													onclick={() => handleNodeClick(nodeType)}
													role="button"
													tabindex="0"
													onkeydown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															handleNodeClick(nodeType);
														}
													}}
												>
													<div class="flowdrop-card__body flowdrop-p--1 flowdrop-py--1">
														<div class="flowdrop-flex flowdrop-gap--2 flowdrop-items--center">
															<!-- Node Type Icon with Squircle Background -->
															<span
																class="flowdrop-node-icon"
																style="--_icon-color: {getCategoryColorToken(nodeType.category)}"
															>
																<Icon icon={getNodeIcon(nodeType.icon, nodeType.category)} />
															</span>

															<!-- Node Type Info - Icon and Title only -->
															<h4
																class="flowdrop-text--sm flowdrop-font--medium flowdrop-truncate flowdrop-flex--1"
															>
																{nodeType.name}
															</h4>
														</div>
														<p
															class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate flowdrop-mt--1 flowdrop-ml--0"
														>
															{nodeType.description}
														</p>
													</div>
												</div>
											{/each}
										</div>
									</div>
								</details>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flowdrop-sidebar__footer">
			<div class="flowdrop-flex flowdrop-gap--4">
				<div class="flowdrop-flex flowdrop-gap--4">
					{#if props.nodes?.length === 0}
						<span class="flowdrop-text--xs flowdrop-text--gray">Loading components...</span>
					{:else}
						<span class="flowdrop-text--xs flowdrop-text--gray"
							>Total: {props.nodes?.length || 0} components</span
						>
						<span class="flowdrop-text--xs flowdrop-text--gray"
							>Showing: {filteredNodes.length}</span
						>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</aside>

<style>
	/* Components Sidebar - Always Visible */
	.flowdrop-sidebar {
		height: calc(100vh - var(--fd-navbar-height)); /* Account for navbar height */
		background-color: var(--fd-background);
		border-right: 1px solid var(--fd-border);
		display: flex;
		flex-direction: column;
		box-shadow: var(--fd-shadow-md);
		flex-shrink: 0;
		transition: width 0.2s ease;
	}

	.flowdrop-sidebar--container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	/* Collapsed state */
	.flowdrop-sidebar--collapsed {
		overflow: hidden;
	}

	.flowdrop-sidebar--collapsed .flowdrop-sidebar__header {
		justify-content: center;
		padding: 0.75rem 0.5rem;
	}

	/* Compact mode styles */
	.flowdrop-sidebar--compact .flowdrop-sidebar__header {
		padding: 0.5rem 0.75rem;
	}

	.flowdrop-sidebar--compact .flowdrop-sidebar__search {
		padding: 0.5rem 0.75rem;
	}

	.flowdrop-sidebar--compact .flowdrop-sidebar__content {
		padding-bottom: 2rem;
	}

	.flowdrop-sidebar--compact .flowdrop-sidebar__footer {
		padding: 0.375rem 0.5rem;
		height: 32px;
	}

	.flowdrop-sidebar--compact .flowdrop-node-icon {
		width: 1.5rem;
		height: 1.5rem;
		font-size: var(--fd-text-xs);
	}

	.flowdrop-sidebar--compact .flowdrop-node-list {
		gap: 0.25rem;
	}

	.flowdrop-sidebar--compact .flowdrop-category-list {
		gap: 0.25rem;
	}

	/* Toggle button */
	.flowdrop-sidebar__toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		background: transparent;
		color: var(--fd-muted-foreground);
		border-radius: var(--fd-radius-md);
		cursor: pointer;
		transition:
			color var(--fd-transition-fast),
			background-color var(--fd-transition-fast);
		flex-shrink: 0;
	}

	.flowdrop-sidebar__toggle:hover {
		color: var(--fd-foreground);
		background-color: var(--fd-subtle);
	}

	.flowdrop-sidebar__toggle:focus {
		outline: none;
		box-shadow: 0 0 0 2px var(--fd-ring);
	}

	.flowdrop-sidebar__header {
		background: var(--fd-header);
		border-bottom: 1px solid var(--fd-border);
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.flowdrop-sidebar__title {
		display: flex;
		align-items: center;
	}

	.flowdrop-sidebar__title h2 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: var(--fd-foreground);
	}

	.flowdrop-sidebar__search {
		padding: 0.75rem 1rem;
		background-color: var(--fd-background);
		border-bottom: 1px solid var(--fd-border);
	}

	.flowdrop-sidebar__content {
		flex: 1;
		overflow-y: scroll; /* Changed from auto to scroll to always show scrollbar */
		scrollbar-width: thin;
		scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
		padding-bottom: 4rem; /* Add padding to ensure content is scrollable above footer */
		min-height: 0; /* Allow flex item to shrink below content size */
	}

	.flowdrop-sidebar__content::-webkit-scrollbar {
		width: 8px;
		display: block; /* Ensure scrollbar is always visible */
	}

	.flowdrop-sidebar__content::-webkit-scrollbar-track {
		background: var(--fd-scrollbar-track);
	}

	.flowdrop-sidebar__content::-webkit-scrollbar-thumb {
		background: var(--fd-scrollbar-thumb);
		border-radius: 4px;
		min-height: 20px; /* Ensure thumb has minimum height for visibility */
	}

	.flowdrop-sidebar__content::-webkit-scrollbar-thumb:hover {
		background: var(--fd-scrollbar-thumb-hover);
	}

	.flowdrop-sidebar__footer {
		background-color: var(--fd-backdrop);
		backdrop-filter: var(--fd-backdrop-blur);
		border-top: 1px solid var(--fd-border);
		padding: 0.5rem 0.75rem;
		flex-shrink: 0; /* Prevent footer from shrinking */
		position: relative;
		z-index: 10; /* Ensure footer stays on top */
		height: 40px;
		display: flex;
		align-items: center;
	}

	.flowdrop-node-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.flowdrop-node-item {
		cursor: grab;
		transition: all var(--fd-transition-fast);
		border-radius: var(--fd-radius-md);
		border: 1px solid transparent;
		background-color: var(--fd-card);
	}

	.flowdrop-node-item:hover {
		border-color: var(--fd-border);
		background-color: var(--fd-muted);
		box-shadow: var(--fd-shadow-sm);
		transform: translateY(-1px);
	}

	.flowdrop-node-item:active {
		cursor: grabbing;
		transform: translateY(0);
		box-shadow: none;
	}

	/* Squircle icon wrapper - Apple-style rounded square background */
	.flowdrop-node-icon {
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--_icon-color) var(--fd-node-icon-bg-opacity), transparent);
		color: var(--fd-node-icon);
		font-size: var(--fd-text-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all var(--fd-transition-normal);
	}

	.flowdrop-node-item:hover .flowdrop-node-icon,
	.flowdrop-details__summary:hover .flowdrop-node-icon {
		background: color-mix(
			in srgb,
			var(--_icon-color) var(--fd-node-icon-bg-opacity-hover),
			transparent
		);
		transform: scale(1.05);
	}

	.flowdrop-category-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.flowdrop-items--center {
		align-items: center;
	}

	.flowdrop-truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.flowdrop-card__body h4 {
		margin: 0;
		line-height: 1;
		color: var(--fd-foreground);
	}

	.flowdrop-p--4 {
		padding: 1rem;
	}

	.flowdrop-py--1 {
		padding-top: 0.25rem;
		padding-bottom: 0.25rem;
	}

	.flowdrop-ml--0 {
		margin-left: 0;
	}

	/* Form Elements - Matching App Design System */
	.flowdrop-input {
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--fd-border-strong);
		border-radius: var(--fd-radius-md);
		font-size: var(--fd-text-sm);
		color: var(--fd-foreground);
		background-color: var(--fd-background);
		transition:
			border-color var(--fd-transition-normal),
			box-shadow var(--fd-transition-normal);
		width: 100%;
		height: 2.5rem;
		box-sizing: border-box;
	}

	.flowdrop-input:focus {
		outline: none;
		border-color: var(--fd-ring);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--fd-ring) 20%, transparent);
	}

	.flowdrop-input::placeholder {
		color: var(--fd-muted-foreground);
	}

	.flowdrop-btn {
		padding: 0.625rem 0.75rem;
		border-radius: var(--fd-radius-md);
		font-size: var(--fd-text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		border: 1px solid var(--fd-border-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background-color: var(--fd-muted);
		color: var(--fd-foreground);
		height: 2.5rem;
		min-width: 2.5rem;
		box-sizing: border-box;
	}

	.flowdrop-btn:hover {
		background-color: var(--fd-subtle);
		border-color: var(--fd-border-strong);
	}

	.flowdrop-btn:active {
		background-color: var(--fd-border);
		border-color: var(--fd-muted-foreground);
	}

	.flowdrop-btn:focus {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--fd-ring) 20%, transparent);
	}

	.flowdrop-btn:disabled {
		background-color: var(--fd-muted-foreground);
		border-color: var(--fd-muted-foreground);
		cursor: not-allowed;
		opacity: 0.6;
	}

	/* Join component styles - Seamless integration */
	.flowdrop-join {
		display: flex;
		width: 100%;
		border-radius: var(--fd-radius-md);
		overflow: hidden;
		border: 1px solid var(--fd-border-strong);
		background-color: var(--fd-background);
	}

	.flowdrop-join__item {
		border: none;
		border-radius: 0;
		background-color: transparent;
	}

	.flowdrop-join__item:first-child {
		border-right: 1px solid var(--fd-border-strong);
		flex: 1;
	}

	.flowdrop-join__item:last-child {
		border-left: none;
		background-color: var(--fd-muted);
		color: var(--fd-foreground);
	}

	.flowdrop-join__item:last-child:hover {
		background-color: var(--fd-subtle);
	}

	.flowdrop-join:focus-within {
		border-color: var(--fd-ring);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--fd-ring) 20%, transparent);
	}

	/* Utility classes */
	.flowdrop-w--full {
		width: 100%;
	}

	.flowdrop-flex--1 {
		flex: 1;
	}
</style>
