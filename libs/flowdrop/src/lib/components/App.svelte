<!--
  FlowDrop App Component
  Main application wrapper with navbar, sidebars, and workflow editor
  Styled with BEM syntax
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import MainLayout from '$lib/components/layouts/MainLayout.svelte';
	import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
	import NodeSidebar from '$lib/components/NodeSidebar.svelte';
	import ConfigForm from '$lib/components/ConfigForm.svelte';
	import ConfigPanel from '$lib/components/ConfigPanel.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import { api, setEndpointConfig } from '$lib/services/api.js';
	import { EnhancedFlowDropApiClient } from '$lib/api/enhanced-client.js';
	import type {
		NodeMetadata,
		Workflow,
		WorkflowNode,
		ConfigSchema,
		NodeUIExtensions
	} from '$lib/types/index.js';
	import { DEFAULT_WORKFLOW_FORMAT } from '$lib/types/index.js';
	import { createEndpointConfig } from '$lib/config/endpoints.js';
	import type { EndpointConfig } from '$lib/config/endpoints.js';
	import type { AuthProvider } from '$lib/types/auth.js';
	import type { FlowDropEventHandlers, FlowDropFeatures } from '$lib/types/events.js';
	import { mergeFeatures } from '$lib/types/events.js';
	import {
		getWorkflowStore,
		workflowActions,
		getWorkflowName,
		getWorkflowFormat,
		markAsSaved
	} from '../stores/workflowStore.svelte.js';
	import { globalSaveWorkflow, globalExportWorkflow } from '$lib/services/globalSave.js';
	import { apiToasts, dismissToast } from '$lib/services/toastService.js';
	import { initAutoSave } from '$lib/services/autoSaveService.js';
	import { getUiSettings } from '../stores/settingsStore.svelte.js';
	import { initializePortCompatibility } from '$lib/utils/connections.js';
	import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
	import { workflowFormatRegistry } from '../registry/workflowFormatRegistry.js';
	import { logger } from '../utils/logger.js';
	import { validateWorkflowData } from '../utils/validation.js';

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
		/** Show settings gear icon in navbar */
		showSettings?: boolean;
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
		showSettings = true,
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
		const wfName = getWorkflowName();
		if (!wfName || wfName === 'Untitled Workflow') {
			return 'Workflow / New Workflow';
		}
		return `Workflow / ${wfName}`;
	});

	let nodes = $state<NodeMetadata[]>([]);
	// Remove workflow prop - use global store directly
	// let workflow = $derived($workflowStore || initialWorkflow);
	let error = $state<string | null>(null);
	let endpointConfig = $state<EndpointConfig | null>(null);

	/**
	 * Enhanced API client with authProvider support
	 * Used when authProvider is provided; otherwise falls back to legacy api service
	 */
	let apiClient = $state<EnhancedFlowDropApiClient | null>(null);

	// ConfigSidebar state
	let isConfigSidebarOpen = $state(false);
	let selectedNodeId = $state<string | null>(null);

	// Workflow settings sidebar state
	let isWorkflowSettingsOpen = $state(false);

	// Workflow configuration schema (derived to pick up dynamic format options)
	let workflowConfigSchema: ConfigSchema = $derived({
		type: 'object' as const,
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
				format: 'multiline',
				default: ''
			},
			format: {
				type: 'string',
				title: 'Workflow Format',
				description: 'The specification format for this workflow',
				oneOf: workflowFormatRegistry.getOneOfOptions(),
				default: 'flowdrop'
			}
		},
		required: ['name']
	});

	// Workflow configuration values
	let workflowConfigValues = $derived({
		name: getWorkflowName() || '',
		description: getWorkflowStore()?.description || '',
		format: getWorkflowStore()?.metadata?.format || 'flowdrop'
	});

	// Get the current node from the workflow store
	let selectedNodeForConfig = $derived(() => {
		const wf = getWorkflowStore();
		if (!selectedNodeId || !wf) return null;
		return wf.nodes.find((node) => node.id === selectedNodeId) || null;
	});

	// WorkflowEditor reference for save functionality
	let workflowEditorRef: WorkflowEditor | null = null;

	/**
	 * Fetch node types from the server
	 *
	 * If propNodes is provided, uses those instead of fetching from API.
	 * Uses enhanced API client with authProvider support when available.
	 */
	async function fetchNodeTypes(): Promise<void> {
		// If nodes were provided as props, use them directly (skip API fetch)
		if (propNodes && propNodes.length > 0) {
			// Merge format-provided nodes with prop nodes (deduplicate by ID, props take priority)
			const formatNodes = workflowFormatRegistry.getAllFormatNodes();
			const existingIds = new Set(propNodes.map((n) => n.id));
			const uniqueFormatNodes = formatNodes.filter((n) => !existingIds.has(n.id));
			nodes = [...propNodes, ...uniqueFormatNodes];
			return;
		}

		// Show loading toast (if toasts are enabled)
		const loadingToast = features.showToasts ? apiToasts.loading('Loading node types') : null;
		try {
			error = null;

			// Use enhanced client with authProvider if available, otherwise fall back to legacy api
			let fetchedNodes: NodeMetadata[];
			if (apiClient) {
				fetchedNodes = await apiClient.getAvailableNodes();
			} else {
				fetchedNodes = await api.nodes.getNodes();
			}

			// Merge format-provided nodes with API nodes (deduplicate by ID, API takes priority)
			const formatNodes = workflowFormatRegistry.getAllFormatNodes();
			const existingIds = new Set(fetchedNodes.map((n) => n.id));
			const uniqueFormatNodes = formatNodes.filter((n) => !existingIds.has(n.id));
			nodes = [...fetchedNodes, ...uniqueFormatNodes];
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
					// Parent handled the error, keep nodes empty
					nodes = [];
					return;
				}
			}

			// Show error and set empty nodes array (no fallback to sample data)
			error = `API Error: ${errorMessage}. No node types available.`;
			if (features.showToasts) {
				apiToasts.error('Load node types', errorMessage);
			}

			// Set empty nodes array instead of fallback data
			nodes = [];
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
	 * Initialize API endpoints and create enhanced client if authProvider is available
	 * Priority: propEndpointConfig > existingConfig > apiBaseUrl > default
	 */
	async function initializeApiEndpoints(): Promise<void> {
		// First priority: Use endpointConfig prop if provided (from mountFlowDropApp)
		if (propEndpointConfig) {
			setEndpointConfig(propEndpointConfig);
			endpointConfig = propEndpointConfig;

			// Create enhanced API client with authProvider support if provided
			if (authProvider) {
				apiClient = new EnhancedFlowDropApiClient(propEndpointConfig, authProvider);
			}
			return;
		}

		// Second priority: Check if endpoint config is already set (e.g., by parent layout)
		const { getEndpointConfig } = await import('$lib/services/api.js');
		const existingConfig = getEndpointConfig();

		// If config already exists and no override provided, use existing
		if (existingConfig && !apiBaseUrl) {
			endpointConfig = existingConfig;

			// Create enhanced API client with authProvider support if provided
			if (authProvider) {
				apiClient = new EnhancedFlowDropApiClient(existingConfig, authProvider);
			}
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

		// Create enhanced API client with authProvider support if provided
		if (authProvider) {
			apiClient = new EnhancedFlowDropApiClient(config, authProvider);
		}
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
	async function handleWorkflowSave(config: Record<string, unknown>): Promise<void> {
		// Update the workflow store
		if (getWorkflowStore()) {
			workflowActions.batchUpdate({
				name: config.name as string | undefined,
				description: config.description as string | undefined
			});
		}

		// Close the sidebar
		isWorkflowSettingsOpen = false;

		// Also save the workflow to the backend
		try {
			await saveWorkflow();
		} catch (error) {
			logger.error('Failed to save workflow to backend:', error);
			// Note: We don't throw the error here to avoid breaking the UI flow
			// The user can still manually save via the main Save button if needed
		}
	}

	/**
	 * Save workflow - thin wrapper that delegates to globalSaveWorkflow().
	 *
	 * All save logic (blur flush, metadata construction, API call, event hooks,
	 * toast notifications) lives in globalSave.ts — the single source of truth.
	 */
	async function saveWorkflow(): Promise<void> {
		await globalSaveWorkflow({
			apiClient: apiClient ?? undefined,
			eventHandlers,
			features,
			onMarkAsSaved: markAsSaved
		});
	}

	/**
	 * Export workflow - thin wrapper that delegates to globalExportWorkflow().
	 *
	 * All export logic (flush, metadata construction, file download) lives
	 * in globalSave.ts — the single source of truth.
	 */
	async function exportWorkflow(): Promise<void> {
		await globalExportWorkflow({ features });
	}

	/**
	 * Import workflow from a JSON file
	 *
	 * Reads the selected file, validates its structure, and loads it into the workflow store.
	 */
	function importWorkflow(file: File): void {
		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const text = event.target?.result;
				if (typeof text !== 'string') {
					throw new Error('Could not read file contents.');
				}
				const data = JSON.parse(text);
				const validation = validateWorkflowData(data);
				if (!validation.valid) {
					if (features.showToasts) {
						apiToasts.error('Import workflow', validation.error ?? 'Invalid workflow JSON');
					}
					logger.warn('Workflow import validation failed:', validation.error);
					return;
				}
				workflowActions.initialize(data as Workflow);
				if (features.showToasts) {
					apiToasts.success('Import workflow', 'Workflow imported successfully');
				}
				if (eventHandlers?.onWorkflowLoad) {
					eventHandlers.onWorkflowLoad(data as Workflow);
				}
			} catch (error) {
				const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');
				logger.error('Workflow import failed:', errorObj);
				if (features.showToasts) {
					apiToasts.error('Import workflow', errorObj.message);
				}
			}
		};
		reader.onerror = () => {
			const message = 'Failed to read the selected file.';
			logger.error(message);
			if (features.showToasts) {
				apiToasts.error('Import workflow', message);
			}
		};
		reader.readAsText(file);
	}

	/**
	 * Handle file input change event for workflow import
	 */
	function handleImportFileChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			importWorkflow(file);
		}
		// Reset input so same file can be re-imported
		input.value = '';
	}

	// Function to handle clicks outside the sidebar
	function handleCanvasClick(event: MouseEvent): void {
		// Check if the click is outside the right sidebar
		const rightSidebar = document.querySelector('.flowdrop-main-layout__sidebar--right');
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

			// Ensure port compatibility checker is initialized (needed for proximity connect, etc.)
			// mountFlowDropApp initializes this before mounting, but SvelteKit routes need it here.
			initializePortCompatibility(DEFAULT_PORT_CONFIG);

			await fetchNodeTypes();

			// Initialize the workflow store
			if (initialWorkflow) {
				workflowActions.initialize(initialWorkflow);

				// Emit onWorkflowLoad event
				if (eventHandlers?.onWorkflowLoad) {
					eventHandlers.onWorkflowLoad(initialWorkflow);
				}
			} else {
				// Initialize with a default empty workflow so the editor is functional
				// (e.g., drag-and-drop requires a non-null workflow in the store)
				const defaultWorkflow: Workflow = {
					id: '',
					name: 'Untitled Workflow',
					nodes: [],
					edges: [],
					metadata: {
						version: '1.0.0',
						format: DEFAULT_WORKFLOW_FORMAT,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				};
				workflowActions.initialize(defaultWorkflow);
			}
		})();

		// Listen for workflow settings toggle from main navbar
		const handleWorkflowSettingsToggle = () => {
			toggleWorkflowSettings();
		};

		window.addEventListener('workflow-settings-toggle', handleWorkflowSettingsToggle);

		// Initialize auto-save based on user settings
		const cleanupAutoSave = initAutoSave({
			onSave: async () => {
				await saveWorkflow();
			},
			onError: (error) => {
				// Don't show toast for auto-save errors to avoid noise
				logger.warn('Auto-save failed:', error);
			},
			onSuccess: () => {
				logger.debug('Auto-saved workflow');
			}
		});

		return () => {
			window.removeEventListener('workflow-settings-toggle', handleWorkflowSettingsToggle);
			cleanupAutoSave();
		};
	});

	// Monitor workflow store changes for testing node drag updates
	$effect(() => {
		const currentWorkflow = getWorkflowStore();
		if (currentWorkflow) {
			// Workflow store updated
		}
	});

	/**
	 * Derived value for showing the right config panel
	 * Config panel always appears on the right side
	 */
	const hasConfigPanelOpen = $derived(isWorkflowSettingsOpen || !!selectedNodeForConfig());
	const showRightPanel = $derived(!disableSidebar && hasConfigPanelOpen);

	/**
	 * Calculate left sidebar width based on collapsed state
	 * When collapsed, use 48px; otherwise use user-configured width
	 */
	const leftSidebarWidth = $derived(
		getUiSettings().sidebarCollapsed ? 48 : getUiSettings().sidebarWidth
	);

	// File input reference for workflow import
	let fileInputRef = $state<HTMLInputElement | null>(null);
</script>

<svelte:head>
	<title>FlowDrop - Visual Workflow Manager</title>
	<meta name="description" content="A modern drag-and-drop workflow editor for LLM applications" />
</svelte:head>

<!-- Hidden file input for workflow JSON import -->
<input
	bind:this={fileInputRef}
	type="file"
	accept=".json,application/json"
	style="display: none;"
	onchange={handleImportFileChange}
/>

<!-- MainLayout wrapper for workflow editor -->
<MainLayout
	showHeader={showNavbar}
	showLeftSidebar={!disableSidebar}
	showRightSidebar={showRightPanel}
	showBottomPanel={false}
	showFooter={false}
	headerHeight={60}
	{leftSidebarWidth}
	rightSidebarWidth={400}
	leftSidebarMinWidth={getUiSettings().sidebarCollapsed ? 48 : 280}
	leftSidebarMaxWidth={getUiSettings().sidebarCollapsed ? 48 : 450}
	rightSidebarMinWidth={320}
	rightSidebarMaxWidth={550}
	enableLeftSplitPane={false}
	enableRightSplitPane={true}
	class="flowdrop-app-layout"
>
	<!-- Header: Navbar -->
	{#snippet header()}
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
							label: 'Import',
							href: '#import',
							icon: 'heroicons:arrow-up-tray',
							variant: 'outline',
							onclick: (e) => {
								e.preventDefault();
								fileInputRef?.click();
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
			{showSettings}
		/>
	{/snippet}

	<!-- Left Sidebar: Node Components -->
	{#snippet leftSidebar()}
		<NodeSidebar {nodes} activeFormat={getWorkflowFormat()} />
	{/snippet}

	<!-- Right Sidebar: Configuration or Workflow Settings -->
	{#snippet rightSidebar()}
		{#if isWorkflowSettingsOpen}
			<ConfigPanel
				title="Workflow Settings"
				id={getWorkflowStore()?.id}
				details={[
					{ label: 'Nodes', value: String(getWorkflowStore()?.nodes?.length ?? 0) },
					{ label: 'Connections', value: String(getWorkflowStore()?.edges?.length ?? 0) }
				]}
				configTitle="Settings"
				onClose={() => (isWorkflowSettingsOpen = false)}
			>
				<ConfigForm
					{authProvider}
					schema={workflowConfigSchema}
					values={workflowConfigValues}
					showUIExtensions={false}
					onChange={(config) => {
						// Sync workflow settings changes immediately on field blur
						const wf = getWorkflowStore();
						if (wf) {
							const newFormat = (config.format as string) || DEFAULT_WORKFLOW_FORMAT;
							const currentFormat = wf.metadata?.format || DEFAULT_WORKFLOW_FORMAT;

							// Warn about incompatible nodes when format changes
							if (newFormat !== currentFormat) {
								const incompatibleNodes = wf.nodes?.filter((node) => {
									const formats = node.data?.metadata?.formats;
									return formats && formats.length > 0 && !formats.includes(newFormat);
								});
								if (incompatibleNodes && incompatibleNodes.length > 0) {
									logger.warn(
										`Format changed to '${newFormat}'. ${incompatibleNodes.length} node(s) are not compatible with this format and may not export correctly:`,
										incompatibleNodes.map((n) => n.data?.label || n.type)
									);
								}
							}

							workflowActions.batchUpdate({
								name: config.name as string,
								description: config.description as string | undefined,
								metadata: {
									...wf.metadata,
									format: newFormat
								}
							});
						}
					}}
				/>
			</ConfigPanel>
		{:else if selectedNodeForConfig()}
			{@const currentNode = selectedNodeForConfig()!}
			<ConfigPanel
				title={currentNode.data.label}
				id={currentNode.id}
				description={currentNode.data.metadata?.description || 'Node configuration'}
				details={[
					{ label: 'Type', value: currentNode.data.metadata?.type || currentNode.type },
					{ label: 'Category', value: currentNode.data.metadata?.category || 'general' }
				]}
				onClose={closeConfigSidebar}
			>
				<ConfigForm
					{authProvider}
					node={currentNode}
					workflowId={getWorkflowStore()?.id}
					workflowNodes={getWorkflowStore()?.nodes}
					workflowEdges={getWorkflowStore()?.edges}
					onChange={async (updatedConfig, uiExtensions) => {
						// Sync config changes to workflow immediately on field blur
						if (selectedNodeId && currentNode) {
							// Build the updated node data
							const updatedData = {
								...currentNode.data,
								config: updatedConfig
							};

							// Include UI extensions if provided
							if (uiExtensions) {
								updatedData.extensions = {
									...currentNode.data.extensions,
									ui: uiExtensions
								};
							}

							// Update the node in the workflow store
							const nodeUpdates: Record<string, unknown> = {
								data: updatedData
							};

							workflowActions.updateNode(selectedNodeId, nodeUpdates);

							// Update the local editor state to reflect config changes immediately
							// This is needed for nodeType changes to take effect visually
							workflowEditorRef?.updateNodeData(selectedNodeId, updatedData);

							// Refresh edge positions in case config changes affect handles
							await workflowEditorRef?.refreshEdgePositions(selectedNodeId);
						}
					}}
				/>
			</ConfigPanel>
		{/if}
	{/snippet}

	<!-- Main Content: Workflow Editor with Error Status -->
	<!-- Status Display: aria-live announces API errors dynamically without requiring focus -->
	{#if error}
		<div class="flowdrop-status flowdrop-status--error" aria-live="polite" aria-atomic="true">
			<div class="flowdrop-status__content">
				<div class="flowdrop-flex flowdrop-gap--3">
					<div class="flowdrop-status__indicator flowdrop-status__indicator--error"></div>
					<span class="flowdrop-text--sm flowdrop-font--medium">Error: {error}</span>
				</div>
				<div class="flowdrop-flex flowdrop-gap--2">
					<button
						class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--primary"
						onclick={retryLoad}
						type="button"
					>
						Retry
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

	<!-- Main Editor Area -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions — interactive workflow canvas region with keyboard support -->
	<div
		class="flowdrop-editor-main"
		class:pipeline-view={!!pipelineId}
		onclick={handleCanvasClick}
		onkeydown={(e) => e.key === 'Escape' && closeConfigSidebar()}
		role="region"
		aria-label="Workflow canvas"
	>
		<WorkflowEditor
			bind:this={workflowEditorRef}
			{nodes}
			{height}
			{width}
			endpointConfig={endpointConfig ?? undefined}
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
</MainLayout>

<style>
	/* Status bar styles */
	.flowdrop-status {
		background-color: var(--fd-info-muted);
		border-bottom: 1px solid var(--fd-info);
		padding: 1rem;
	}

	.flowdrop-status--error {
		background-color: var(--fd-error-muted);
		border-bottom: 1px solid var(--fd-error);
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
		background-color: var(--fd-error);
	}

	/* Button styles */
	.flowdrop-btn {
		padding: 0.375rem 0.75rem;
		border-radius: var(--fd-radius-md);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all var(--fd-transition-fast);
	}

	.flowdrop-btn--sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.625rem;
	}

	.flowdrop-btn--outline {
		background-color: transparent;
		border-color: var(--fd-border);
		color: var(--fd-foreground);
	}

	.flowdrop-btn--outline:hover {
		background-color: var(--fd-muted);
		border-color: var(--fd-border-strong);
	}

	.flowdrop-btn--primary {
		background-color: var(--fd-primary);
		border-color: var(--fd-primary);
		color: var(--fd-primary-foreground);
	}

	.flowdrop-btn--primary:hover {
		background-color: var(--fd-primary-hover);
		border-color: var(--fd-primary-hover);
	}

	.flowdrop-btn--ghost {
		background-color: transparent;
		border-color: transparent;
		color: var(--fd-muted-foreground);
	}

	.flowdrop-btn--ghost:hover {
		background-color: var(--fd-muted);
		color: var(--fd-foreground);
	}

	/* Utility classes */
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

	/* Main editor area */
	.flowdrop-editor-main {
		flex: 1;
		position: relative;
		min-width: 0;
		height: 100%;
		overflow: hidden;
		background: var(--fd-layout-background);
	}
</style>
