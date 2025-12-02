<!--
  FlowDrop App Component
  Main application wrapper with navbar, sidebars, and workflow editor
  Styled with BEM syntax
-->

<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
	import NodeSidebar from '$lib/components/NodeSidebar.svelte';
	import ConfigSidebar from '$lib/components/ConfigSidebar.svelte';
	import ConfigForm from '$lib/components/ConfigForm.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import { api, setEndpointConfig } from '$lib/services/api.js';
	import type { NodeMetadata, Workflow, WorkflowNode, ConfigSchema } from '$lib/types/index.js';
	import { sampleNodes } from '$lib/data/samples.js';
	import { createEndpointConfig } from '$lib/config/endpoints.js';
	import type { EndpointConfig } from '$lib/config/endpoints.js';
	import type { AuthProvider } from '$lib/types/auth.js';
	import type { FlowDropEventHandlers, FlowDropFeatures } from '$lib/types/events.js';
	import { mergeFeatures } from '$lib/types/events.js';
	import {
		workflowStore,
		workflowActions,
		workflowName,
		markAsSaved
	} from '../stores/workflowStore.js';
	import { apiToasts, dismissToast } from '$lib/services/toastService.js';

	/**
	 * Configuration props for runtime customization
	 */
	interface Props {
		/** Initial workflow to load */
		workflow?: Workflow;
		/** Pre-loaded node types (if provided, skips API fetch) */
		nodes?: NodeMetadata[];
		/** Editor height */
		height?: string | number;
		/** Editor width */
		width?: string | number;
		/** Show the navbar */
		showNavbar?: boolean;
		/** Disable the node sidebar */
		disableSidebar?: boolean;
		/** Lock the workflow (prevent changes) */
		lockWorkflow?: boolean;
		/** Read-only mode */
		readOnly?: boolean;
		/** Node execution statuses */
		nodeStatuses?: Record<string, 'pending' | 'running' | 'completed' | 'error'>;
		/** Pipeline ID for fetching node execution info */
		pipelineId?: string;
		/** Custom navbar title */
		navbarTitle?: string;
		/** Custom navbar actions */
		navbarActions?: Array<{
			label: string;
			href: string;
			icon?: string;
			variant?: 'primary' | 'secondary' | 'outline';
			onclick?: (event: Event) => void;
		}>;
		/** API base URL */
		apiBaseUrl?: string;
		/** Endpoint configuration */
		endpointConfig?: EndpointConfig;
		/** Authentication provider */
		authProvider?: AuthProvider;
		/** Event handlers */
		eventHandlers?: FlowDropEventHandlers;
		/** Feature configuration */
		features?: FlowDropFeatures;
	}

	let {
		workflow: initialWorkflow,
		nodes: propNodes,
		height = '100vh',
		width = '100%',
		showNavbar = false,
		disableSidebar = false,
		lockWorkflow = false,
		readOnly = false,
		nodeStatuses = {},
		pipelineId,
		navbarTitle,
		navbarActions = [],
		apiBaseUrl,
		endpointConfig: propEndpointConfig,
		authProvider,
		eventHandlers,
		features: propFeatures
	}: Props = $props();

	// Merge features with defaults
	const features = mergeFeatures(propFeatures);

	// Create breadcrumb-style title - at top level to avoid store subscription issues
	let breadcrumbTitle = $derived(() => {
		// Use custom navbar title if provided
		if (navbarTitle) {
			return navbarTitle;
		}
		// Default workflow title logic
		if (!$workflowName || $workflowName === 'Untitled Workflow') {
			return 'Workflow / New Workflow';
		}
		return `Workflow / ${$workflowName}`;
	});

	let nodes = $state<NodeMetadata[]>([]);
	// Remove workflow prop - use global store directly
	// let workflow = $derived($workflowStore || initialWorkflow);
	let error = $state<string | null>(null);
	let endpointConfig = $state<EndpointConfig | null>(null);

	// ConfigSidebar state
	let isConfigSidebarOpen = $state(false);
	let selectedNodeId = $state<string | null>(null);

	// Workflow settings sidebar state
	let isWorkflowSettingsOpen = $state(false);

	// Workflow configuration schema
	const workflowConfigSchema: ConfigSchema = {
		type: 'object',
		properties: {
			name: {
				type: 'string',
				title: 'Workflow Name',
				description: 'The name of the workflow',
				default: ''
			},
			description: {
				type: 'string',
				title: 'Description',
				description: 'A description of the workflow',
				default: ''
			}
		},
		required: ['name']
	};

	// Workflow configuration values
	let workflowConfigValues = $derived({
		name: $workflowName || '',
		description: $workflowStore?.description || ''
	});

	// Get the current node from the workflow store
	let selectedNodeForConfig = $derived(() => {
		if (!selectedNodeId || !$workflowStore) return null;
		return $workflowStore.nodes.find((node) => node.id === selectedNodeId) || null;
	});

	// WorkflowEditor reference for save functionality
	let workflowEditorRef: WorkflowEditor | null = null;

	// Removed currentWorkflowState - no longer needed
	// The global store ($workflowStore) serves as the single source of truth

	/**
	 * Fetch node types from the server
	 *
	 * If propNodes is provided, uses those instead of fetching from API.
	 * This fixes the bug where propNodes was ignored.
	 */
	async function fetchNodeTypes(): Promise<void> {
		// If nodes were provided as props, use them directly (skip API fetch)
		if (propNodes && propNodes.length > 0) {
			nodes = propNodes;
			return;
		}

		// Show loading toast (if toasts are enabled)
		const loadingToast = features.showToasts ? apiToasts.loading('Loading node types') : null;
		try {
			error = null;

			const fetchedNodes = await api.nodes.getNodes();

			nodes = fetchedNodes;
			error = null;

			// Dismiss loading toast
			if (loadingToast) {
				dismissToast(loadingToast);
			}
		} catch (err) {
			// Dismiss loading toast and show error toast
			if (loadingToast) {
				dismissToast(loadingToast);
			}

			const errorMessage = err instanceof Error ? err.message : 'Unknown error';

			// Notify parent via event handler
			if (eventHandlers?.onApiError) {
				const suppressToast = eventHandlers.onApiError(
					err instanceof Error ? err : new Error(errorMessage),
					'fetchNodes'
				);
				if (suppressToast) {
					// Parent handled the error, don't show default toast
					nodes = sampleNodes;
					return;
				}
			}

			// Show error but don't block the UI
			error = `API Error: ${errorMessage}. Using sample data.`;
			if (features.showToasts) {
				apiToasts.error('Load node types', errorMessage);
			}

			// Fallback to sample data
			nodes = sampleNodes;
		}
	}

	/**
	 * Retry loading node types
	 */
	function retryLoad(): void {
		fetchNodeTypes();
	}

	/**
	 * Test API connection
	 */
	async function testApiConnection(): Promise<void> {
		try {
			const baseUrl = endpointConfig?.baseUrl || apiBaseUrl || '/api/flowdrop';
			const testUrl = `${baseUrl}/nodes`;

			const response = await fetch(testUrl);
			const data = await response.json();

			if (response.ok && data.success) {
				apiToasts.success('API connection test', 'Connection successful');
			} else {
				apiToasts.error('API connection test', 'Connection failed');
			}
		} catch (err) {
			apiToasts.error('API connection test', err instanceof Error ? err.message : 'Unknown error');
		}
	}

	/**
	 * Initialize API endpoints
	 * Priority: propEndpointConfig > existingConfig > apiBaseUrl > default
	 */
	async function initializeApiEndpoints(): Promise<void> {
		// First priority: Use endpointConfig prop if provided (from mountFlowDropApp)
		if (propEndpointConfig) {
			setEndpointConfig(propEndpointConfig);
			endpointConfig = propEndpointConfig;
			return;
		}

		// Second priority: Check if endpoint config is already set (e.g., by parent layout)
		const { getEndpointConfig } = await import('$lib/services/api.js');
		const existingConfig = getEndpointConfig();

		// If config already exists and no override provided, use existing
		if (existingConfig && !apiBaseUrl) {
			endpointConfig = existingConfig;
			return;
		}

		// Third priority: Use provided apiBaseUrl or default
		const baseUrl = apiBaseUrl || '/api/flowdrop';

		const config = createEndpointConfig(baseUrl, {
			auth: {
				type: 'none' // No authentication for now
			},
			timeout: 10000, // 10 second timeout
			retry: {
				enabled: true,
				maxAttempts: 2,
				delay: 1000,
				backoff: 'exponential'
			}
		});

		setEndpointConfig(config);
		// Store the configuration for passing to WorkflowEditor
		endpointConfig = config;
	}

	/**
	 * ConfigSidebar functions
	 */
	function openConfigSidebar(node: WorkflowNode): void {
		// Close if already open for the same node
		if (isConfigSidebarOpen && selectedNodeId === node.id) {
			closeConfigSidebar();
			return;
		}
		selectedNodeId = node.id;
		isConfigSidebarOpen = true;
	}

	function closeConfigSidebar(): void {
		isConfigSidebarOpen = false;
		selectedNodeId = null;
	}

	/**
	 * Toggle workflow settings sidebar
	 */
	function toggleWorkflowSettings(): void {
		isWorkflowSettingsOpen = !isWorkflowSettingsOpen;
		// Close config sidebar if opening workflow settings
		if (isWorkflowSettingsOpen) {
			closeConfigSidebar();
		}
	}

	/**
	 * Handle workflow configuration save
	 */
	async function handleWorkflowSave(config: any): Promise<void> {
		// Update the workflow store
		if ($workflowStore) {
			$workflowStore.name = config.name;
			$workflowStore.description = config.description;
		}

		// Close the sidebar
		isWorkflowSettingsOpen = false;

		// Also save the workflow to the backend
		try {
			await saveWorkflow();
		} catch (error) {
			console.error('Failed to save workflow to backend:', error);
			// Note: We don't throw the error here to avoid breaking the UI flow
			// The user can still manually save via the main Save button if needed
		}
	}

	// Removed handleWorkflowChange function - no longer needed
	// The global store serves as the single source of truth and is already reactive

	/**
	 * Save workflow - exposed API function
	 *
	 * Integrates with event handlers for enterprise customization.
	 */
	async function saveWorkflow(): Promise<void> {
		// Wait for any pending DOM updates before saving
		await tick();

		// Use current workflow from global store
		const workflowToSave = $workflowStore;

		if (!workflowToSave) {
			return;
		}

		// Call onBeforeSave if provided - allows cancellation
		if (eventHandlers?.onBeforeSave) {
			const shouldContinue = await eventHandlers.onBeforeSave(workflowToSave);
			if (shouldContinue === false) {
				// Save cancelled by event handler
				return;
			}
		}

		// Show loading toast (if enabled)
		const loadingToast = features.showToasts ? apiToasts.loading('Saving workflow') : null;

		try {
			// Import necessary modules
			const { workflowApi } = await import('$lib/services/api.js');
			const { v4: uuidv4 } = await import('uuid');

			// Determine the workflow ID
			let workflowId: string;
			if (workflowToSave.id) {
				workflowId = workflowToSave.id;
			} else {
				workflowId = uuidv4();
			}

			// Create workflow object for saving
			const finalWorkflow: Workflow = {
				id: workflowId,
				name: workflowToSave.name || 'Untitled Workflow',
				description: workflowToSave.description || '',
				nodes: workflowToSave.nodes || [],
				edges: workflowToSave.edges || [],
				metadata: {
					version: '1.0.0',
					createdAt: workflowToSave.metadata?.createdAt || new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			};

			const savedWorkflow = await workflowApi.saveWorkflow(finalWorkflow);

			// Update the workflow ID if it changed (new workflow)
			// Keep our current workflow state, only update ID and metadata from backend
			if (savedWorkflow.id && savedWorkflow.id !== finalWorkflow.id) {
				workflowActions.batchUpdate({
					nodes: finalWorkflow.nodes,
					edges: finalWorkflow.edges,
					name: finalWorkflow.name,
					metadata: {
						...finalWorkflow.metadata,
						...savedWorkflow.metadata
					}
				});
			}

			// Mark as saved (clears dirty state)
			markAsSaved();

			// Dismiss loading toast and show success
			if (loadingToast) {
				dismissToast(loadingToast);
			}
			if (features.showToasts) {
				apiToasts.success('Save workflow', 'Workflow saved successfully');
			}

			// Call onAfterSave if provided
			if (eventHandlers?.onAfterSave) {
				await eventHandlers.onAfterSave(savedWorkflow);
			}
		} catch (error) {
			// Dismiss loading toast
			if (loadingToast) {
				dismissToast(loadingToast);
			}

			const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');

			// Call onSaveError if provided
			if (eventHandlers?.onSaveError && workflowToSave) {
				await eventHandlers.onSaveError(errorObj, workflowToSave);
			}

			// Check if parent wants to handle API errors
			let suppressToast = false;
			if (eventHandlers?.onApiError) {
				suppressToast = eventHandlers.onApiError(errorObj, 'save') === true;
			}

			// Show error toast if not suppressed
			if (features.showToasts && !suppressToast) {
				apiToasts.error('Save workflow', errorObj.message);
			}

			throw error; // Re-throw to allow calling code to handle if needed
		}
	}

	/**
	 * Export workflow - exposed API function
	 */
	async function exportWorkflow(): Promise<void> {
		try {
			// Wait for any pending DOM updates before exporting
			await tick();

			// Use current workflow from global store
			const workflowToExport = $workflowStore;

			if (!workflowToExport) {
				return;
			}

			// Create workflow object for export
			const finalWorkflow = {
				id: workflowToExport.id || 'untitled-workflow',
				name: workflowToExport.name || 'Untitled Workflow',
				nodes: workflowToExport.nodes || [],
				edges: workflowToExport.edges || [],
				metadata: {
					version: '1.0.0',
					createdAt: workflowToExport.metadata?.createdAt || new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			};

			// Create and download the file
			const dataStr = JSON.stringify(finalWorkflow, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });
			const url = URL.createObjectURL(dataBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${finalWorkflow.name}.json`;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			// Export failed
		}
	}

	// Expose save and export functions globally for external access
	if (typeof window !== 'undefined') {
		window.flowdropSave = saveWorkflow;
		window.flowdropExport = exportWorkflow;
	}

	// Function to handle clicks outside the sidebar
	function handleCanvasClick(event: MouseEvent): void {
		// Check if the click is outside the right sidebar
		const rightSidebar = document.querySelector('.flowdrop-sidebar--right');
		if (rightSidebar && !rightSidebar.contains(event.target as Node)) {
			// Close sidebar when clicking outside of it
			if (isConfigSidebarOpen) {
				closeConfigSidebar();
			}
		}
	}

	// Load node types on mount
	onMount(() => {
		(async () => {
			await initializeApiEndpoints();
			await fetchNodeTypes();

			// Initialize the workflow store if we have an initial workflow
			if (initialWorkflow) {
				workflowActions.initialize(initialWorkflow);

				// Emit onWorkflowLoad event
				if (eventHandlers?.onWorkflowLoad) {
					eventHandlers.onWorkflowLoad(initialWorkflow);
				}
			}
		})();

		// Listen for workflow settings toggle from main navbar
		const handleWorkflowSettingsToggle = () => {
			toggleWorkflowSettings();
		};

		window.addEventListener('workflow-settings-toggle', handleWorkflowSettingsToggle);

		return () => {
			window.removeEventListener('workflow-settings-toggle', handleWorkflowSettingsToggle);
		};
	});

	// Monitor workflow store changes for testing node drag updates
	$effect(() => {
		const currentWorkflow = $workflowStore;
		if (currentWorkflow) {
			// Workflow store updated
		}
	});
</script>

<svelte:head>
	<title>FlowDrop - Visual Workflow Manager</title>
	<meta name="description" content="A modern drag-and-drop workflow editor for LLM applications" />
</svelte:head>

<div
	class="flowdrop-app"
	style="height: {typeof height === 'number' ? `${height}px` : height}; width: {typeof width ===
	'number'
		? `${width}px`
		: width};"
>
	<!-- Navbar (conditionally rendered) - hide on workflow edit pages -->
	{#if showNavbar && !$page.url.pathname.includes('/edit')}
		<Navbar
			title={breadcrumbTitle()}
			primaryActions={navbarActions.length > 0
				? navbarActions
				: [
						{
							label: 'Save',
							href: '#save',
							icon: 'heroicons:document-arrow-down',
							variant: 'primary',
							onclick: (e) => {
								e.preventDefault();
								saveWorkflow();
							}
						},
						{
							label: 'Export',
							href: '#export',
							icon: 'heroicons:arrow-down-tray',
							variant: 'outline',
							onclick: (e) => {
								e.preventDefault();
								exportWorkflow();
							}
						},
						{
							label: 'Workflow Settings',
							href: '#settings',
							icon: 'heroicons:cog-6-tooth',
							variant: 'outline',
							onclick: (e) => {
								e.preventDefault();
								toggleWorkflowSettings();
							}
						}
					]}
			showStatus={true}
		/>
	{/if}

	<!-- Main Content -->
	<main class="flowdrop-main">
		<!-- Status Display -->
		{#if error}
			<div class="flowdrop-status flowdrop-status--error">
				<div class="flowdrop-status__content">
					<div class="flowdrop-flex flowdrop-gap--3">
						<div class="flowdrop-status__indicator flowdrop-status__indicator--error"></div>
						<span class="flowdrop-text--sm flowdrop-font--medium">Error: {error}</span>
					</div>
					<div class="flowdrop-flex flowdrop-gap--2">
						<button
							class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline"
							onclick={retryLoad}
							type="button"
						>
							Retry
						</button>
						<button
							class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--primary"
							onclick={() => {
								nodes = sampleNodes;
								error = null;
							}}
							type="button"
						>
							Use Sample Data
						</button>
						<button
							class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline"
							onclick={() => {
								const defaultUrl = '/api/flowdrop';
								const newUrl = prompt('Enter Backend API URL:', defaultUrl);
								if (newUrl) {
									const endpointConfig = createEndpointConfig(newUrl);
									setEndpointConfig(endpointConfig);
									fetchNodeTypes();
								}
							}}
							type="button"
						>
							Set API URL
						</button>
						<button
							class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline"
							onclick={testApiConnection}
							type="button"
						>
							Test API
						</button>
						<button
							class="flowdrop-btn flowdrop-btn--ghost flowdrop-btn--sm"
							onclick={() => (error = null)}
							type="button"
						>
							✕
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Workflow Editor with Sidebars -->
		<div class="flowdrop-editor-container">
			<!-- Left Sidebar - Node Components (conditionally rendered) -->
			{#if !disableSidebar}
				<div class="flowdrop-sidebar flowdrop-sidebar--left">
					<NodeSidebar {nodes} />
				</div>
			{/if}

			<!-- Main Editor Area -->
			<div
				class="flowdrop-editor-main"
				class:pipeline-view={!!pipelineId}
				onclick={handleCanvasClick}
				onkeydown={(e) => e.key === 'Escape' && closeConfigSidebar()}
				role="button"
				tabindex="0"
				aria-label="Workflow canvas - click to close sidebar"
			>
				<WorkflowEditor
					bind:this={workflowEditorRef}
					{nodes}
					{height}
					{width}
					{endpointConfig}
					{isConfigSidebarOpen}
					selectedNodeForConfig={selectedNodeForConfig()}
					{openConfigSidebar}
					{closeConfigSidebar}
					{lockWorkflow}
					{readOnly}
					{nodeStatuses}
					{pipelineId}
				/>
			</div>

			<!-- Right Sidebar - Configuration or Workflow Settings (conditionally rendered) -->
			{#if !disableSidebar && isWorkflowSettingsOpen}
				<ConfigSidebar
					isOpen={isWorkflowSettingsOpen}
					title="Workflow Settings"
					configSchema={workflowConfigSchema}
					configValues={workflowConfigValues}
					onSave={handleWorkflowSave}
					onClose={() => (isWorkflowSettingsOpen = false)}
				/>
			{:else if !disableSidebar && selectedNodeForConfig()}
				<div class="flowdrop-sidebar flowdrop-sidebar--right">
					<div class="flowdrop-config-sidebar">
						<!-- Header -->
						<div class="flowdrop-config-sidebar__header">
							<h2 class="flowdrop-config-sidebar__title">{selectedNodeForConfig().data.label}</h2>
							<button
								class="flowdrop-config-sidebar__close"
								onclick={closeConfigSidebar}
								aria-label="Close configuration sidebar"
							>
								×
							</button>
						</div>

						<!-- Content -->
						<div class="flowdrop-config-sidebar__content">
							<!-- Node Details -->
							<div class="flowdrop-config-sidebar__section">
								<h3 class="flowdrop-config-sidebar__section-title">Node Details</h3>
								<div class="flowdrop-config-sidebar__details">
									<div class="flowdrop-config-sidebar__detail">
										<span class="flowdrop-config-sidebar__detail-label">Node ID:</span>
										<div class="flowdrop-config-sidebar__detail-value-with-copy">
											<span
												class="flowdrop-config-sidebar__detail-value"
												style="font-family: monospace;"
											>
												{selectedNodeForConfig().id}
											</span>
											<button
												class="flowdrop-config-sidebar__copy-btn"
												onclick={() => {
													navigator.clipboard.writeText(selectedNodeForConfig().id);
												}}
												title="Copy Node ID"
												aria-label="Copy node ID to clipboard"
											>
												📋
											</button>
										</div>
									</div>
									<div class="flowdrop-config-sidebar__detail">
										<span class="flowdrop-config-sidebar__detail-label">Type:</span>
										<span class="flowdrop-config-sidebar__detail-value"
											>{selectedNodeForConfig().data.metadata?.type ||
												selectedNodeForConfig().type}</span
										>
									</div>
									<div class="flowdrop-config-sidebar__detail">
										<span class="flowdrop-config-sidebar__detail-label">Category:</span>
										<span class="flowdrop-config-sidebar__detail-value"
											>{selectedNodeForConfig().data.metadata?.category || 'general'}</span
										>
									</div>
									<div class="flowdrop-config-sidebar__detail">
										<span class="flowdrop-config-sidebar__detail-label">Description:</span>
										<p class="flowdrop-config-sidebar__detail-description">
											{selectedNodeForConfig().data.metadata?.description || 'Node configuration'}
										</p>
									</div>
								</div>
							</div>

							<!-- Configuration Form -->
							<div class="flowdrop-config-sidebar__section">
								<h3 class="flowdrop-config-sidebar__section-title">Configuration</h3>
								<ConfigForm
									node={selectedNodeForConfig()}
									onSave={(updatedConfig) => {
										const currentNode = selectedNodeForConfig();
										if (selectedNodeId && currentNode) {
											// Handle nodeType switching if nodeType is in the config
											let nodeUpdates: Record<string, unknown> = {
												data: {
													...currentNode.data,
													config: updatedConfig
												}
											};

											// NOTE: We do NOT change the node's type field anymore
											// All nodes use 'universalNode' and UniversalNode handles internal switching
											workflowActions.updateNode(selectedNodeId, nodeUpdates);
										}

										closeConfigSidebar();
									}}
									onCancel={closeConfigSidebar}
								/>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	.flowdrop-app {
		background: linear-gradient(135deg, #f9fafb 0%, #e0e7ff 50%, #c7d2fe 100%);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.flowdrop-main {
		flex: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.flowdrop-status {
		background-color: #eff6ff;
		border-bottom: 1px solid #bfdbfe;
		padding: 1rem;
	}

	.flowdrop-status--error {
		background-color: #fef2f2;
		border-bottom: 1px solid #fecaca;
	}

	.flowdrop-status__content {
		max-width: 80rem;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.flowdrop-status__indicator {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.flowdrop-status__indicator--error {
		background-color: #ef4444;
	}

	.flowdrop-btn {
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.2s ease-in-out;
	}

	.flowdrop-btn--sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.625rem;
	}

	.flowdrop-btn--outline {
		background-color: transparent;
		border-color: #d1d5db;
		color: #374151;
	}

	.flowdrop-btn--outline:hover {
		background-color: #f9fafb;
		border-color: #9ca3af;
	}

	.flowdrop-btn--primary {
		background-color: #3b82f6;
		border-color: #3b82f6;
		color: #ffffff;
	}

	.flowdrop-btn--primary:hover {
		background-color: #2563eb;
		border-color: #2563eb;
	}

	.flowdrop-btn--ghost {
		background-color: transparent;
		border-color: transparent;
		color: #6b7280;
	}

	.flowdrop-btn--ghost:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	.flowdrop-flex {
		display: flex;
	}

	.flowdrop-gap--2 {
		gap: 0.5rem;
	}

	.flowdrop-gap--3 {
		gap: 0.75rem;
	}

	.flowdrop-text--sm {
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	.flowdrop-font--medium {
		font-weight: 500;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.flowdrop-editor-container {
		flex: 1;
		position: relative;
		min-height: 0;
		overflow: hidden;
		display: flex;
	}

	.flowdrop-sidebar {
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		overflow-y: auto;
		overflow-x: hidden;
		height: 100%;
		display: flex;
		flex-direction: column;
		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: #cbd5e1 #f1f5f9;
	}

	.flowdrop-sidebar::-webkit-scrollbar {
		width: 8px;
	}

	.flowdrop-sidebar::-webkit-scrollbar-track {
		background: #f1f5f9;
		border-radius: 4px;
	}

	.flowdrop-sidebar::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 4px;
	}

	.flowdrop-sidebar::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}

	.flowdrop-sidebar--left {
		width: 320px;
		min-width: 320px;
		border-right: 1px solid #e5e7eb;
		box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
	}

	.flowdrop-sidebar--right {
		border-left: 1px solid #e5e7eb;
		box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
	}

	.flowdrop-editor-main {
		flex: 1;
		position: relative;
		min-width: 0;
		overflow: hidden;
		background-color: #1f2937;
	}

	/* Configuration Sidebar Styles */
	.flowdrop-config-sidebar {
		height: 100%;
		display: flex;
		flex-direction: column;
		background-color: #ffffff;
	}

	.flowdrop-config-sidebar__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
		background-color: #f9fafb;
	}

	.flowdrop-config-sidebar__title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
	}

	.flowdrop-config-sidebar__close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition: color 0.2s;
	}

	.flowdrop-config-sidebar__close:hover {
		color: #374151;
		background-color: #f3f4f6;
	}

	.flowdrop-config-sidebar__content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.flowdrop-config-sidebar__section {
		margin-bottom: 1.5rem;
	}

	.flowdrop-config-sidebar__section-title {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.flowdrop-config-sidebar__details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.flowdrop-config-sidebar__detail {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.flowdrop-config-sidebar__detail-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.flowdrop-config-sidebar__detail-value {
		font-size: 0.875rem;
		color: #111827;
		font-weight: 500;
	}

	.flowdrop-config-sidebar__detail-value-with-copy {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: #f3f4f6;
		padding: 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid #e5e7eb;
	}

	.flowdrop-config-sidebar__detail-value-with-copy .flowdrop-config-sidebar__detail-value {
		flex: 1;
		font-size: 0.8125rem;
		word-break: break-all;
	}

	.flowdrop-config-sidebar__copy-btn {
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.flowdrop-config-sidebar__copy-btn:hover {
		background-color: #f9fafb;
		border-color: #9ca3af;
		transform: scale(1.05);
	}

	.flowdrop-config-sidebar__copy-btn:active {
		transform: scale(0.95);
	}

	.flowdrop-config-sidebar__detail-description {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.4;
	}
</style>
