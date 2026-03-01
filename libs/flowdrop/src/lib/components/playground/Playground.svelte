<!--
  Playground Component
  
  Main component for the Playground feature.
  Clean, conversational interface similar to Langflow.
  Supports both embedded (panel) and standalone (page) modes.
  Styled with BEM syntax.
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';
	import ChatPanel from './ChatPanel.svelte';
	import type { Workflow } from '../../types/index.js';
	import type { EndpointConfig } from '../../config/endpoints.js';
	import type {
		PlaygroundMode,
		PlaygroundConfig
	} from '../../types/playground.js';
	import { playgroundService } from '../../services/playgroundService.js';
	import { interruptService } from '../../services/interruptService.js';
	import { setEndpointConfig } from '../../services/api.js';
	import {
		currentSession,
		sessions,
		messages,
		isExecuting,
		isLoading,
		error,
		playgroundActions,
		inputFields,
		createPollingCallback
	} from '../../stores/playgroundStore.js';
	import { interruptActions } from '../../stores/interruptStore.js';
	import { get } from 'svelte/store';
	import { logger } from '../../utils/logger.js';

	/**
	 * Component props
	 */
	interface Props {
		/** Target workflow ID */
		workflowId: string;
		/** Pre-loaded workflow (optional, will be fetched if not provided) */
		workflow?: Workflow;
		/** Display mode: embedded (panel) or standalone (page) */
		mode?: PlaygroundMode;
		/** Resume a specific session */
		initialSessionId?: string;
		/** API endpoint configuration */
		endpointConfig?: EndpointConfig;
		/** Playground configuration options */
		config?: PlaygroundConfig;
		/** Callback when playground is closed (for embedded mode) */
		onClose?: () => void;
	}

	let {
		workflowId,
		workflow,
		mode = 'standalone',
		initialSessionId,
		endpointConfig,
		config = {},
		onClose
	}: Props = $props();

	/** Current input values from InputCollector */
	let inputValues = $state<Record<string, unknown>>({});

	/** Track session being edited for rename */
	let editingSessionId = $state<string | null>(null);

	/** Track which session's dropdown menu is open */
	let openMenuId = $state<string | null>(null);

	/** Track if initial session has been loaded to prevent duplicate loads */
	let initialSessionLoaded = $state(false);

	/** Track the session ID that was loaded to detect prop changes */
	let loadedInitialSessionId = $state<string | undefined>(undefined);

	/** Track if auto-run has already been triggered to prevent duplicate executions */
	let autoRunTriggered = $state(false);

	/**
	 * Initialize the playground on mount
	 */
	onMount(() => {
		// Set endpoint config if provided
		if (endpointConfig) {
			setEndpointConfig(endpointConfig);
		}

		// Set workflow in store
		if (workflow) {
			playgroundActions.setWorkflow(workflow);
		}

		// Async initialization
		const initializePlayground = async (): Promise<void> => {
			try {
				// Load sessions
				await loadSessions();

				// Resume initial session if provided
				if (initialSessionId) {
					await loadInitialSession(initialSessionId);
				}

				// Handle auto-run after initialization is complete
				if (config.autoRun && !autoRunTriggered) {
					autoRunTriggered = true;
					const predefinedMessage = config.predefinedMessage ?? 'Run workflow';
					logger.debug('[Playground] Auto-run triggered with message:', predefinedMessage);
					await handleSendMessage(predefinedMessage);
				}
			} catch (err) {
				logger.error('[Playground] Initialization error:', err);
			}
		};

		// Execute initialization
		void initializePlayground();
	});

	/**
	 * Handle reactive changes to initialSessionId prop
	 * This allows the initial session to be set after mount
	 */
	$effect(() => {
		// Skip if no initialSessionId provided
		if (!initialSessionId) {
			return;
		}

		// Skip if this session was already loaded
		if (initialSessionLoaded && loadedInitialSessionId === initialSessionId) {
			return;
		}

		// Skip if sessions haven't been loaded yet (will be handled by onMount)
		const sessionList = get(sessions);
		if (sessionList.length === 0 && get(isLoading)) {
			return;
		}

		// Load the initial session if sessions are available
		if (sessionList.length > 0 && !initialSessionLoaded) {
			void loadInitialSession(initialSessionId);
		}
	});

	/**
	 * Load the initial session with validation and error handling
	 *
	 * @param sessionId - The session ID to load
	 */
	async function loadInitialSession(sessionId: string): Promise<void> {
		// Validate session exists in loaded sessions
		const sessionList = get(sessions);
		const sessionExists = sessionList.some((s) => s.id === sessionId);

		if (!sessionExists) {
			logger.warn(
				`[Playground] Initial session "${sessionId}" not found in available sessions. ` +
					`Available sessions: ${sessionList.map((s) => s.id).join(', ') || 'none'}`
			);
			// Don't set error - just log warning and let user pick a session
			initialSessionLoaded = true;
			loadedInitialSessionId = sessionId;
			return;
		}

		try {
			await loadSession(sessionId);
			initialSessionLoaded = true;
			loadedInitialSessionId = sessionId;
		} catch (err) {
			logger.error('[Playground] Failed to load initial session:', err);
			// Mark as attempted to prevent retry loops
			initialSessionLoaded = true;
			loadedInitialSessionId = sessionId;
		}
	}

	/**
	 * Cleanup on destroy
	 */
	onDestroy(() => {
		playgroundService.stopPolling();
		interruptService.stopPolling();
		playgroundActions.reset();
		interruptActions.reset();
	});

	/**
	 * Close dropdown menu when clicking outside
	 */
	$effect(() => {
		if (!openMenuId) return;

		function onDocumentClick() {
			openMenuId = null;
		}

		document.addEventListener('click', onDocumentClick);
		return () => document.removeEventListener('click', onDocumentClick);
	});

	/**
	 * Load sessions for the workflow
	 */
	async function loadSessions(): Promise<void> {
		playgroundActions.setLoading(true);
		playgroundActions.setError(null);

		try {
			const sessionList = await playgroundService.listSessions(workflowId);
			playgroundActions.setSessions(sessionList);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions';
			playgroundActions.setError(errorMessage);
			logger.error('Failed to load sessions:', err);
		} finally {
			playgroundActions.setLoading(false);
		}
	}

	/**
	 * Load a specific session and its messages
	 */
	async function loadSession(sessionId: string): Promise<void> {
		playgroundActions.setLoading(true);
		playgroundActions.setError(null);

		try {
			// Get session details
			const session = await playgroundService.getSession(sessionId);
			playgroundActions.setCurrentSession(session);

			// Get messages
			const response = await playgroundService.getMessages(sessionId);
			playgroundActions.setMessages(response.data ?? []);

			// Start polling if session is running
			if (session.status === 'running') {
				startPolling(sessionId);
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
			playgroundActions.setError(errorMessage);
			logger.error('Failed to load session:', err);
		} finally {
			playgroundActions.setLoading(false);
		}
	}

	/**
	 * Create a new session
	 */
	async function handleCreateSession(): Promise<void> {
		playgroundActions.setLoading(true);
		playgroundActions.setError(null);

		try {
			const sessionName = `Session ${get(sessions).length + 1}`;
			const session = await playgroundService.createSession(workflowId, sessionName);
			playgroundActions.addSession(session);
			playgroundActions.setCurrentSession(session);
			playgroundActions.clearMessages();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
			playgroundActions.setError(errorMessage);
			logger.error('Failed to create session:', err);
		} finally {
			playgroundActions.setLoading(false);
		}
	}

	/**
	 * Select a session
	 */
	async function handleSelectSession(sessionId: string): Promise<void> {
		const currentSessionId = get(currentSession)?.id;
		if (currentSessionId === sessionId) {
			return;
		}

		// Stop polling for current session
		playgroundService.stopPolling();

		await loadSession(sessionId);
	}

	/**
	 * Delete a session
	 */
	async function handleDeleteSession(sessionId: string): Promise<void> {
		try {
			await playgroundService.deleteSession(sessionId);
			playgroundActions.removeSession(sessionId);

			// If we deleted the current session, clear it
			if (get(currentSession)?.id === sessionId) {
				playgroundService.stopPolling();
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
			playgroundActions.setError(errorMessage);
			logger.error('Failed to delete session:', err);
		}
	}

	/**
	 * Toggle session dropdown menu
	 */
	function handleMenuToggle(event: Event, sessionId: string): void {
		event.stopPropagation();
		openMenuId = openMenuId === sessionId ? null : sessionId;
	}

	/**
	 * Handle delete from dropdown menu
	 */
	function handleMenuDelete(event: Event, sessionId: string): void {
		event.stopPropagation();
		openMenuId = null;
		void handleDeleteSession(sessionId);
	}

	/**
	 * Close current session (go back to welcome)
	 */
	function handleCloseSession(): void {
		playgroundService.stopPolling();
		interruptService.stopPolling();
		playgroundActions.setCurrentSession(null);
		playgroundActions.clearMessages();
		// Clear interrupts for this session
		const sessionId = get(currentSession)?.id;
		if (sessionId) {
			interruptActions.clearSessionInterrupts(sessionId);
		}
	}

	/**
	 * Send a message
	 */
	async function handleSendMessage(content: string): Promise<void> {
		const session = get(currentSession);
		if (!session) {
			// Create a session first if none exists
			await handleCreateSession();
			const newSession = get(currentSession);
			if (!newSession) {
				return;
			}
		}

		const sessionId = get(currentSession)?.id;
		if (!sessionId) {
			return;
		}

		playgroundActions.setExecuting(true);
		playgroundActions.setError(null);

		try {
			// Prepare inputs from the input collector
			const inputs: Record<string, unknown> = {};
			const fields = get(inputFields);

			fields.forEach((field) => {
				const key = `${field.nodeId}:${field.fieldId}`;
				if (inputValues[key] !== undefined) {
					// Map to node ID and field ID for the backend
					if (!inputs[field.nodeId]) {
						inputs[field.nodeId] = {};
					}
					(inputs[field.nodeId] as Record<string, unknown>)[field.fieldId] = inputValues[key];
				}
			});

			// Send message
			const message = await playgroundService.sendMessage(sessionId, content, inputs);
			playgroundActions.addMessage(message);

			// Update session status
			playgroundActions.updateSessionStatus('running');

			// Start polling for responses
			startPolling(sessionId);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
			playgroundActions.setError(errorMessage);
			playgroundActions.setExecuting(false);
			logger.error('Failed to send message:', err);
		}
	}

	/**
	 * Stop execution
	 */
	async function handleStopExecution(): Promise<void> {
		const sessionId = get(currentSession)?.id;
		if (!sessionId) {
			return;
		}

		try {
			await playgroundService.stopExecution(sessionId);
			playgroundService.stopPolling();
			playgroundActions.setExecuting(false);
			playgroundActions.updateSessionStatus('idle');
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to stop execution';
			playgroundActions.setError(errorMessage);
			logger.error('Failed to stop execution:', err);
		}
	}

	/** Shared polling callback created from config lifecycle hooks */
	const pollingCallback = createPollingCallback(config.isTerminalStatus);

	/**
	 * Start polling for messages
	 */
	function startPolling(sessionId: string): void {
		const pollingInterval = config.pollingInterval ?? 1500;

		playgroundService.startPolling(
			sessionId,
			pollingCallback,
			pollingInterval,
			config.shouldStopPolling
		);
	}

	/**
	 * Refresh messages for the current session
	 * Called after interrupt resolution when polling has stopped
	 */
	async function handleInterruptResolved(): Promise<void> {
		const sessionId = get(currentSession)?.id;
		if (!sessionId) return;

		try {
			const response = await playgroundService.getMessages(sessionId);
			pollingCallback(response);
		} catch (err) {
			logger.error('[Playground] Failed to refresh messages after interrupt:', err);
		}
	}

	/**
	 * Format date for display
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) {
			return 'Just now';
		}
		if (diffMins < 60) {
			return `${diffMins}m ago`;
		}
		if (diffHours < 24) {
			return `${diffHours}h ago`;
		}
		if (diffDays < 7) {
			return `${diffDays}d ago`;
		}
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div
	class="playground"
	class:playground--embedded={mode === 'embedded'}
	class:playground--standalone={mode === 'standalone'}
	class:playground--modal={mode === 'modal'}
	class:playground--no-sidebar={config.showSidebar === false}
>
	<div class="playground__container">
		<!-- Sidebar (conditionally rendered based on config.showSidebar) -->
		{#if config.showSidebar !== false}
			<aside class="playground__sidebar">
				<!-- Sidebar Header -->
				<div class="playground__sidebar-header">
					<div class="playground__sidebar-title">
						<span>Playground</span>
					</div>
					{#if (mode === 'embedded' || mode === 'modal') && onClose}
						<button
							type="button"
							class="playground__sidebar-close"
							onclick={onClose}
							title="Close playground"
						>
							{#if mode === 'modal'}
								<Icon icon="mdi:close" />
							{:else}
								<Icon icon="mdi:dock-right" />
							{/if}
						</button>
					{/if}
				</div>

				<!-- New Session Section -->
				<div class="playground__section">
					<button
						type="button"
						class="playground__new-session-btn"
						onclick={handleCreateSession}
						disabled={$isLoading}
						title="Start a new session"
					>
						<Icon icon="mdi:plus" />
						<span>New Session</span>
					</button>

					<!-- Sessions List - click a session to load it -->
					<div class="playground__sessions-wrap">
						{#if $sessions.length > 0}
							<p class="playground__sessions-hint">Click a session to load it</p>
						{/if}
						<div class="playground__sessions">
							{#if $sessions.length === 0 && !$isLoading}
								<div class="playground__sessions-empty">
									<span>No sessions yet</span>
								</div>
							{:else}
								{#each $sessions as session (session.id)}
									<div
										class="playground__session"
										class:playground__session--active={$currentSession?.id === session.id}
										role="button"
										tabindex="0"
										title="Click to load this session"
										aria-label="Load session: {session.name}"
										onclick={() => handleSelectSession(session.id)}
										onkeydown={(e) => e.key === 'Enter' && handleSelectSession(session.id)}
									>
										<span class="playground__session-name" title={session.name}>
											{session.name}
										</span>
										<div class="playground__session-actions">
											<button
												type="button"
												class="playground__session-menu"
												class:playground__session-menu--open={openMenuId === session.id}
												onclick={(e) => handleMenuToggle(e, session.id)}
												title="Session options"
											>
												<Icon icon="mdi:dots-vertical" />
											</button>
											{#if openMenuId === session.id}
												<div class="playground__session-dropdown">
													<button
														type="button"
														class="playground__session-dropdown-item playground__session-dropdown-item--danger"
														onclick={(e) => handleMenuDelete(e, session.id)}
													>
														<Icon icon="mdi:delete-outline" />
														<span>Delete</span>
													</button>
												</div>
											{/if}
										</div>
									</div>
								{/each}
							{/if}
						</div>
					</div>
				</div>
			</aside>
		{/if}

		<!-- Main Content -->
		<main class="playground__main">
			<!-- Session Header (conditionally rendered based on config.showSessionHeader) -->
			{#if $currentSession && config.showSessionHeader !== false}
				<header class="playground__header">
					<h2 class="playground__header-title">{$currentSession.name}</h2>
					<button
						type="button"
						class="playground__header-close"
						onclick={handleCloseSession}
						title="Close session"
					>
						<Icon icon="mdi:close" />
					</button>
				</header>
			{/if}

			<!-- Error Banner -->
			{#if $error}
				<div class="playground__error">
					<Icon icon="mdi:alert-circle" />
					<span>{$error}</span>
					<button
						type="button"
						class="playground__error-dismiss"
						onclick={() => playgroundActions.setError(null)}
					>
						<Icon icon="mdi:close" />
					</button>
				</div>
			{/if}

			<!-- Chat Content -->
			<div class="playground__content">
				{#if $isLoading && !$currentSession}
					<div class="playground__loading">
						<Icon icon="mdi:loading" class="playground__loading-icon" />
						<span>Loading...</span>
					</div>
				{:else}
					<ChatPanel
						showTimestamps={config.showTimestamps ?? true}
						autoScroll={config.autoScroll ?? true}
						showLogsInline={config.logDisplayMode === 'inline'}
						enableMarkdown={config.enableMarkdown ?? true}
						showChatInput={config.showChatInput ?? true}
						showRunButton={config.showRunButton ?? true}
						predefinedMessage={config.predefinedMessage ?? 'Run workflow'}
						onSendMessage={handleSendMessage}
						onStopExecution={handleStopExecution}
						onInterruptResolved={handleInterruptResolved}
					/>
				{/if}
			</div>
		</main>
	</div>
</div>

<style>
	.playground {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden; /* Prevent playground-level scrolling */
		background-color: var(--fd-muted);
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}

	.playground--embedded {
		border-left: 1px solid var(--fd-border);
		box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
	}

	.playground--standalone {
		height: 100vh;
		background: var(--fd-layout-background, var(--fd-muted));
	}

	/* Dark mode override for standalone */
	:global([data-theme='dark']) .playground--standalone {
		background: linear-gradient(135deg, #141418 0%, #1a1a2e 50%, #16162a 100%);
	}

	.playground--modal {
		height: 100%;
		width: 100%;
	}

	/* No sidebar mode - minimal chat widget experience */
	.playground--no-sidebar .playground__main {
		border-left: none;
	}

	/* Container */
	.playground__container {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	/* Sidebar */
	.playground__sidebar {
		width: var(--fd-playground-sidebar-width);
		background-color: var(--fd-background);
		border-right: 1px solid var(--fd-border);
		display: flex;
		flex-direction: column;
	}

	/* Fixed height so sidebar and main session header align on same horizontal line */
	.playground__sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--fd-playground-header-height);
		padding: 0 var(--fd-space-xl);
		border-bottom: 1px solid var(--fd-border);
		box-sizing: border-box;
		flex-shrink: 0;
	}

	.playground__sidebar-title {
		display: flex;
		align-items: center;
		gap: var(--fd-space-xs);
		font-size: var(--fd-text-md);
		font-weight: 600;
		line-height: 1.25;
		color: var(--fd-foreground);
	}

	.playground__sidebar-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--fd-playground-icon-btn-size);
		height: var(--fd-playground-icon-btn-size);
		border: none;
		border-radius: var(--fd-radius-md);
		background: transparent;
		color: var(--fd-muted-foreground);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
	}

	.playground__sidebar-close:hover {
		background-color: var(--fd-muted);
		color: var(--fd-foreground);
	}

	/* Section */
	.playground__section {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: var(--fd-space-md) var(--fd-space-xs) 0;
	}

	/* New Session – neutral full-width button with icon */
	.playground__new-session-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--fd-space-xs);
		width: 100%;
		padding: var(--fd-space-sm) var(--fd-space-xl);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
		background-color: var(--fd-background);
		color: var(--fd-foreground);
		font-size: var(--fd-text-sm);
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color var(--fd-transition-fast),
			border-color var(--fd-transition-fast),
			transform 0.1s ease;
		box-sizing: border-box;
	}

	.playground__new-session-btn:hover:not(:disabled) {
		background-color: var(--fd-muted);
		border-color: var(--fd-border);
		transform: translateY(-1px);
	}

	.playground__new-session-btn:focus {
		outline: none;
		box-shadow: 0 0 0 2px var(--fd-ring);
	}

	.playground__new-session-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.playground__new-session-btn :global(svg) {
		width: 1.125rem;
		height: 1.125rem;
	}

	/* Sessions */
	.playground__sessions-wrap {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.playground__sessions-hint {
		font-size: var(--fd-text-2xs);
		color: var(--fd-muted-foreground);
		margin: var(--fd-space-md) 0 var(--fd-space-2xs) var(--fd-space-md);
		line-height: 1.3;
	}

	.playground__sessions {
		flex: 1;
		overflow-y: auto;
		padding: 0 var(--fd-space-xs) var(--fd-space-xl);
		min-height: 0;
	}

	.playground__sessions-empty {
		padding: var(--fd-space-xl);
		text-align: center;
		font-size: var(--fd-text-xsm);
		color: var(--fd-muted-foreground);
	}

	/* Session row - clickable to load session; clear hover/active affordance */
	.playground__session {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--fd-space-sm) var(--fd-space-md);
		margin-bottom: var(--fd-space-3xs);
		border-radius: var(--fd-radius-md);
		border-left: 3px solid transparent;
		cursor: pointer;
		transition:
			background-color var(--fd-transition-fast),
			border-left-color var(--fd-transition-fast);
	}

	.playground__session:hover {
		background-color: var(--fd-muted);
		border-left-color: var(--fd-border);
	}

	.playground__session--active {
		background-color: var(--fd-primary-muted);
		border-left-color: var(--fd-primary);
	}

	.playground__session--active:hover {
		background-color: var(--fd-primary-muted);
		border-left-color: var(--fd-primary);
	}

	.playground__session-name {
		flex: 1;
		font-size: var(--fd-text-sm);
		color: var(--fd-foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.playground__session--active .playground__session-name {
		color: var(--fd-primary);
		font-weight: 500;
	}

	.playground__session-menu {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--fd-space-3xl);
		height: var(--fd-space-3xl);
		border: none;
		border-radius: var(--fd-radius-sm);
		background: transparent;
		color: var(--fd-muted-foreground);
		cursor: pointer;
		opacity: 0;
		transition: all var(--fd-transition-fast);
	}

	.playground__session:hover .playground__session-menu {
		opacity: 1;
	}

	.playground__session-menu:hover {
		background-color: var(--fd-muted);
		color: var(--fd-foreground);
	}

	.playground__session-menu--open {
		opacity: 1;
		background-color: var(--fd-muted);
		color: var(--fd-foreground);
	}

	.playground__session-actions {
		position: relative;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.playground__session-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 50;
		min-width: 140px;
		padding: var(--fd-space-xs);
		background-color: var(--fd-background);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
		box-shadow: var(--fd-shadow-lg);
	}

	.playground__session-dropdown-item {
		display: flex;
		align-items: center;
		gap: var(--fd-space-sm);
		width: 100%;
		padding: var(--fd-space-sm) var(--fd-space-md);
		border: none;
		border-radius: var(--fd-radius-sm);
		background: transparent;
		color: var(--fd-foreground);
		font-size: var(--fd-text-sm);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
		white-space: nowrap;
	}

	.playground__session-dropdown-item:hover {
		background-color: var(--fd-muted);
	}

	.playground__session-dropdown-item--danger {
		color: var(--fd-error);
	}

	.playground__session-dropdown-item--danger:hover {
		background-color: var(--fd-error-muted);
		color: var(--fd-error);
	}

	/* Main Content */
	.playground__main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0; /* Allow proper flex shrinking */
		overflow: hidden; /* Prevent scrolling - ChatPanel handles it */
		background-color: var(--fd-background);
	}

	/* Header - exact same height as playground__sidebar-header for alignment */
	.playground__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--fd-playground-header-height);
		padding: 0 var(--fd-space-2xl);
		border-bottom: 1px solid var(--fd-border);
		background-color: var(--fd-background);
		box-sizing: border-box;
		flex-shrink: 0;
	}

	.playground__header-title {
		font-size: var(--fd-text-md);
		font-weight: 600;
		line-height: 1.25;
		color: var(--fd-foreground);
		margin: 0;
	}

	.playground__header-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--fd-playground-icon-btn-size);
		height: var(--fd-playground-icon-btn-size);
		border: none;
		border-radius: var(--fd-radius-md);
		background: transparent;
		color: var(--fd-muted-foreground);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
	}

	.playground__header-close:hover {
		background-color: var(--fd-muted);
		color: var(--fd-foreground);
	}

	/* Error */
	.playground__error {
		display: flex;
		align-items: center;
		gap: var(--fd-space-xs);
		padding: var(--fd-space-md) var(--fd-space-xl);
		background-color: var(--fd-error-muted);
		border-bottom: 1px solid var(--fd-error);
		color: var(--fd-error);
		font-size: var(--fd-text-sm);
	}

	.playground__error-dismiss {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--fd-space-3xl);
		height: var(--fd-space-3xl);
		border: none;
		border-radius: var(--fd-radius-sm);
		background: transparent;
		color: var(--fd-error);
		cursor: pointer;
		transition: background-color var(--fd-transition-fast);
	}

	.playground__error-dismiss:hover {
		background-color: var(--fd-error-muted);
	}

	/* Content */
	.playground__content {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	/* Loading */
	.playground__loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: var(--fd-space-xl);
		color: var(--fd-muted-foreground);
	}

	:global(.playground__loading-icon) {
		font-size: var(--fd-text-2xl);
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.playground__sidebar {
			width: 180px;
		}
	}

	@media (max-width: 640px) {
		.playground__sidebar {
			position: absolute;
			left: 0;
			top: 0;
			bottom: 0;
			z-index: 20;
			box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
		}
	}
</style>
