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
		PlaygroundConfig,
		PlaygroundMessagesApiResponse
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
		inputFields
	} from '../../stores/playgroundStore.js';
	import { interruptActions } from '../../stores/interruptStore.js';
	import { get } from 'svelte/store';

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

	/** Track session pending delete */
	let pendingDeleteId = $state<string | null>(null);

	/**
	 * Initialize the playground
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
					await loadSession(initialSessionId);
				}
			} catch (err) {
				console.error('[Playground] Initialization error:', err);
			}
		};

		// Execute initialization
		void initializePlayground();
	});

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
			console.error('Failed to load sessions:', err);
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
			console.error('Failed to load session:', err);
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
			console.error('Failed to create session:', err);
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
			pendingDeleteId = null;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
			playgroundActions.setError(errorMessage);
			console.error('Failed to delete session:', err);
		}
	}

	/**
	 * Handle delete click - show confirmation or execute
	 */
	function handleDeleteClick(event: Event, sessionId: string): void {
		event.stopPropagation();
		if (pendingDeleteId === sessionId) {
			// Confirm deletion
			void handleDeleteSession(sessionId);
		} else {
			pendingDeleteId = sessionId;
			// Auto-reset after 3 seconds
			setTimeout(() => {
				if (pendingDeleteId === sessionId) {
					pendingDeleteId = null;
				}
			}, 3000);
		}
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
			console.error('Failed to send message:', err);
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
			console.error('Failed to stop execution:', err);
		}
	}

	/**
	 * Start polling for messages
	 */
	function startPolling(sessionId: string): void {
		const pollingInterval = config.pollingInterval ?? 1500;

		playgroundService.startPolling(
			sessionId,
			(response: PlaygroundMessagesApiResponse) => {
				// Add new messages
				if (response.data && response.data.length > 0) {
					playgroundActions.addMessages(response.data);
				}

			// Update session status
			if (response.sessionStatus) {
				playgroundActions.updateSessionStatus(response.sessionStatus);

				// Stop executing if idle, completed, or failed
				// "idle" means no processing is happening (execution finished)
				if (
					response.sessionStatus === 'idle' ||
					response.sessionStatus === 'completed' ||
					response.sessionStatus === 'failed'
				) {
					playgroundActions.setExecuting(false);
				}
			}
			},
			pollingInterval
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
			
			// Add new messages (deduplicates automatically)
			if (response.data && response.data.length > 0) {
				playgroundActions.addMessages(response.data);
			}
			
			// Update session status
			if (response.sessionStatus) {
				playgroundActions.updateSessionStatus(response.sessionStatus);
				
				// Update executing state based on session status
				if (
					response.sessionStatus === 'idle' ||
					response.sessionStatus === 'completed' ||
					response.sessionStatus === 'failed'
				) {
					playgroundActions.setExecuting(false);
				}
			}
		} catch (err) {
			console.error('[Playground] Failed to refresh messages after interrupt:', err);
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
>
	<div class="playground__container">
		<!-- Sidebar -->
		<aside class="playground__sidebar">
			<!-- Sidebar Header -->
			<div class="playground__sidebar-header">
				<div class="playground__sidebar-title">
					<Icon icon="mdi:play-circle-outline" />
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

			<!-- Chat Section -->
			<div class="playground__section">
				<div class="playground__section-header">
					<div class="playground__section-title">
						<Icon icon="mdi:chat-outline" />
						<span>Chat</span>
					</div>
					<button
						type="button"
						class="playground__add-btn"
						onclick={handleCreateSession}
						disabled={$isLoading}
						title="New chat session"
					>
						<Icon icon="mdi:plus" />
					</button>
				</div>

				<!-- Sessions List -->
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
								onclick={() => handleSelectSession(session.id)}
								onkeydown={(e) => e.key === 'Enter' && handleSelectSession(session.id)}
							>
								<span class="playground__session-name" title={session.name}>
									{session.name}
								</span>
								<button
									type="button"
									class="playground__session-menu"
									class:playground__session-menu--delete={pendingDeleteId === session.id}
									onclick={(e) => handleDeleteClick(e, session.id)}
									title={pendingDeleteId === session.id
										? 'Click to confirm delete'
										: 'Delete session'}
								>
									{#if pendingDeleteId === session.id}
										<Icon icon="mdi:check" />
									{:else}
										<Icon icon="mdi:dots-horizontal" />
									{/if}
								</button>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="playground__main">
			<!-- Session Header -->
			{#if $currentSession}
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
		background-color: #f8fafc;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}

	.playground--embedded {
		border-left: 1px solid #e2e8f0;
		box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
	}

	.playground--standalone {
		height: 100vh;
	}

	.playground--modal {
		height: 100%;
		width: 100%;
	}

	/* Container */
	.playground__container {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	/* Sidebar */
	.playground__sidebar {
		width: 220px;
		background-color: #fafbfc;
		border-right: 1px solid #e5e7eb;
		display: flex;
		flex-direction: column;
	}

	.playground__sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.playground__sidebar-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 600;
		color: #1f2937;
	}

	.playground__sidebar-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.playground__sidebar-close:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	/* Section */
	.playground__section {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.playground__section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
	}

	.playground__section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #6b7280;
	}

	.playground__add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.playground__add-btn:hover:not(:disabled) {
		background-color: #e5e7eb;
		color: #374151;
	}

	.playground__add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Sessions */
	.playground__sessions {
		flex: 1;
		overflow-y: auto;
		padding: 0 0.5rem 1rem;
	}

	.playground__sessions-empty {
		padding: 1rem;
		text-align: center;
		font-size: 0.8125rem;
		color: #9ca3af;
	}

	.playground__session {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 0.75rem;
		margin-bottom: 0.25rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.playground__session:hover {
		background-color: #f3f4f6;
	}

	.playground__session--active {
		background-color: #e0e7ff;
	}

	.playground__session--active:hover {
		background-color: #c7d2fe;
	}

	.playground__session-name {
		flex: 1;
		font-size: 0.875rem;
		color: #374151;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.playground__session--active .playground__session-name {
		color: #4338ca;
		font-weight: 500;
	}

	.playground__session-menu {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: #9ca3af;
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
	}

	.playground__session:hover .playground__session-menu {
		opacity: 1;
	}

	.playground__session-menu:hover {
		background-color: #fecaca;
		color: #dc2626;
	}

	.playground__session-menu--delete {
		opacity: 1;
		background-color: #dcfce7;
		color: #16a34a;
	}

	.playground__session-menu--delete:hover {
		background-color: #bbf7d0;
		color: #15803d;
	}

	/* Main Content */
	.playground__main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0; /* Allow proper flex shrinking */
		overflow: hidden; /* Prevent scrolling - ChatPanel handles it */
		background-color: #ffffff;
	}

	/* Header */
	.playground__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.25rem;
		border-bottom: 1px solid #e5e7eb;
		background-color: #fafbfc;
	}

	.playground__header-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.playground__header-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.playground__header-close:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	/* Error */
	.playground__error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #fef2f2;
		border-bottom: 1px solid #fecaca;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.playground__error-dismiss {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: #dc2626;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.playground__error-dismiss:hover {
		background-color: #fee2e2;
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
		gap: 1rem;
		color: #6b7280;
	}

	:global(.playground__loading-icon) {
		font-size: 2rem;
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
