<!--
  Node Sidebar Component
  Displays available node types organized by category with accordion-style groups
  Styled with BEM syntax
-->

<script lang="ts">
	import type { NodeMetadata, NodeCategory } from '../types/index.js';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import Icon from '@iconify/svelte';
	import { getNodeIcon, getCategoryIcon } from '../utils/icons.js';
	import { getCategoryColorToken } from '../utils/colors.js';

	interface Props {
		nodes: NodeMetadata[];
		selectedCategory?: NodeCategory;
	}

	let props: Props = $props();
	let searchInput = $state('');
	let selectedCategory = $state(props.selectedCategory || 'all');

	let filteredNodes = $derived(getFilteredNodes());
	let categories = $derived(getCategories());

	/**
	 * Get all unique categories from node types
	 */
	function getCategories(): NodeCategory[] {
		const nodes = props.nodes || [];
		if (nodes.length === 0) return [];
		const categories = new Set<NodeCategory>();
		nodes.forEach((node) => categories.add(node.category));
		return Array.from(categories).sort();
	}

	/**
	 * Filter node types based on search query and selected category
	 */
	function getFilteredNodes(): NodeMetadata[] {
		// Use actual node types from props
		let filtered = props.nodes || [];

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

		// Create a new array and sort it to avoid mutating the original
		return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Handle node type drag start - creates a new node instance
	 */
	function handleNodeDragStart(event: DragEvent, nodeType: NodeMetadata): void {
		if (!event.dataTransfer) return;

		// Extract initial config from configSchema with proper null checks
		let initialConfig = {};
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
	 * Get category display name
	 */
	function getCategoryDisplayName(category: NodeCategory): string {
		const names: Record<NodeCategory, string> = {
			inputs: 'Inputs',
			outputs: 'Outputs',
			prompts: 'Prompts',
			models: 'Models',
			processing: 'Processing',
			logic: 'Logic',
			data: 'Data',
			tools: 'Tools',
			helpers: 'Helpers',
			'vector stores': 'Vector Stores',
			embeddings: 'Embeddings',
			memories: 'Memories',
			agents: 'Agents',
			bundles: 'Bundles'
		};
		return names[category] || category;
	}

	/**
	 * Get node types for category
	 */
	function getNodesForCategory(category: NodeCategory): NodeMetadata[] {
		const nodes = props.nodes || [];
		return [...nodes]
			.filter((node) => node.category === category)
			.sort((a, b) => a.name.localeCompare(b.name));
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
<div class="flowdrop-sidebar flowdrop-sidebar--container" role="complementary" aria-label="Components sidebar">
	<!-- Header -->
	<div class="flowdrop-sidebar__header">
		<div class="flowdrop-sidebar__title">
			<h2 class="flowdrop-text--lg flowdrop-font--bold">Components</h2>
		</div>
	</div>

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
				<svg class="flowdrop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					></path>
				</svg>
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
										<!-- Node Type Icon -->
										<div
											class="flowdrop-node-icon"
											style="background-color: {getCategoryColorToken(nodeType.category)}"
										>
											<Icon icon={getNodeIcon(nodeType.icon, nodeType.category)} />
										</div>

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
											style="background-color: {getCategoryColorToken(category)}"
										>
											<Icon icon={getCategoryIcon(category)} />
										</span>
										<span>{getCategoryDisplayName(category)}</span>
									</div>
									<div class="flowdrop-badge flowdrop-badge--secondary">{categoryNodes.length}</div>
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
														<!-- Node Type Icon -->
														<div
															class="flowdrop-node-icon"
															style="background-color: {getCategoryColorToken(nodeType.category)}"
														>
															<Icon icon={getNodeIcon(nodeType.icon, nodeType.category)} />
														</div>

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
					<span class="flowdrop-text--xs flowdrop-text--gray">Showing: {filteredNodes.length}</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Components Sidebar - Always Visible */
	.flowdrop-sidebar {
		width: 320px;
		height: 100vh; /* Use viewport height to ensure fixed height */
		background-color: #ffffff;
		border-right: 1px solid #e5e7eb;
		display: flex;
		flex-direction: column;
		box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
	}

	.flowdrop-sidebar--container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.flowdrop-sidebar__header {
		background-color: #f8fafc;
		border-bottom: 1px solid #e5e7eb;
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

	/* Close button styles removed - no longer needed */

	.flowdrop-sidebar__title h2 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.flowdrop-sidebar__search {
		padding: 0.75rem 1rem;
		background-color: #ffffff;
		border-bottom: 1px solid #e5e7eb;
	}

	.flowdrop-sidebar__content {
		flex: 1;
		overflow-y: scroll; /* Changed from auto to scroll to always show scrollbar */
		scrollbar-width: thin;
		scrollbar-color: #d1d5db #f3f4f6;
		padding-bottom: 4rem; /* Add padding to ensure content is scrollable above footer */
		min-height: 0; /* Allow flex item to shrink below content size */
	}

	.flowdrop-sidebar__content::-webkit-scrollbar {
		width: 8px;
		display: block; /* Ensure scrollbar is always visible */
	}

	.flowdrop-sidebar__content::-webkit-scrollbar-track {
		background: #f3f4f6;
	}

	.flowdrop-sidebar__content::-webkit-scrollbar-thumb {
		background: #d1d5db;
		border-radius: 4px;
		min-height: 20px; /* Ensure thumb has minimum height for visibility */
	}

	.flowdrop-sidebar__content::-webkit-scrollbar-thumb:hover {
		background: #9ca3af;
	}

	.flowdrop-sidebar__footer {
		background-color: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(8px);
		border-top: 1px solid #e5e7eb;
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
		transition: all 0.2s ease-in-out;
		border-radius: 0.375rem;
		border: 1px solid transparent;
	}

	.flowdrop-node-item:hover {
		border-color: #d1d5db;
		background-color: #f9fafb;
	}

	.flowdrop-node-item:active {
		cursor: grabbing;
	}

	.flowdrop-node-icon {
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		color: #ffffff;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.flowdrop-category-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.flowdrop-icon {
		width: 1rem;
		height: 1rem;
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
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		color: #111827;
		background-color: #ffffff;
		transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
		width: 100%;
		height: 2.5rem;
		box-sizing: border-box;
	}

	.flowdrop-input:focus {
		outline: none;
		border-color: #6b7280;
		box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
	}

	.flowdrop-input::placeholder {
		color: #9ca3af;
	}

	.flowdrop-btn {
		padding: 0.625rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		border: 1px solid #d1d5db;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background-color: #f9fafb;
		color: #374151;
		height: 2.5rem;
		min-width: 2.5rem;
		box-sizing: border-box;
	}

	.flowdrop-btn:hover {
		background-color: #f3f4f6;
		border-color: #9ca3af;
	}

	.flowdrop-btn:active {
		background-color: #e5e7eb;
		border-color: #6b7280;
	}

	.flowdrop-btn:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
	}

	.flowdrop-btn:disabled {
		background-color: #9ca3af;
		border-color: #9ca3af;
		cursor: not-allowed;
		opacity: 0.6;
	}

	/* Join component styles - Seamless integration */
	.flowdrop-join {
		display: flex;
		width: 100%;
		border-radius: 0.375rem;
		overflow: hidden;
		border: 1px solid #d1d5db;
		background-color: #ffffff;
	}

	.flowdrop-join__item {
		border: none;
		border-radius: 0;
		background-color: transparent;
	}

	.flowdrop-join__item:first-child {
		border-right: 1px solid #d1d5db;
		flex: 1;
	}

	.flowdrop-join__item:last-child {
		border-left: none;
		background-color: #f9fafb;
		color: #374151;
	}

	.flowdrop-join__item:last-child:hover {
		background-color: #f3f4f6;
	}

	.flowdrop-join:focus-within {
		border-color: #6b7280;
		box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
	}

	/* Utility classes */
	.flowdrop-w--full {
		width: 100%;
	}

	.flowdrop-flex--1 {
		flex: 1;
	}
</style>
