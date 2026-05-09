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
  import ExecutionList from './ExecutionList.svelte';
  import type { Workflow } from '../../types/index.js';
  import type { EndpointConfig } from '../../config/endpoints.js';
  import type { PlaygroundMode, PlaygroundConfig } from '../../types/playground.js';
  import { playgroundService } from '../../services/playgroundService.js';
  import { interruptService } from '../../services/interruptService.js';
  import { setEndpointConfig } from '../../services/api.js';
  import {
    getCurrentSession,
    getSessions,
    getIsExecuting,
    getIsLoading,
    getError,
    playgroundActions,
    getInputFields,
    applyServerResponse,
    getCanSendMessage,
    getLatestSequenceNumber,
    getActiveExecutionId,
    getLatestExecutionId,
    getPinnedExecutionId,
  } from '../../stores/playgroundStore.svelte.js';
  import { interruptActions } from '../../stores/interruptStore.svelte.js';
  import { logger } from '../../utils/logger.js';
  import { m } from '$lib/messages/index.js';

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
    /** Callback to toggle the pipeline panel (if undefined, toggle button is hidden) */
    onTogglePanel?: () => void;
    /** Whether the pipeline panel is currently open (for toggle button active state) */
    isPipelinePanelOpen?: boolean;
    /** When provided, session switches and creation navigate to a URL instead of mutating store state */
    onSessionNavigate?: (sessionId: string) => void;
  }

  let {
    workflowId,
    workflow,
    mode = 'standalone',
    initialSessionId,
    endpointConfig,
    config = {},
    onClose,
    onTogglePanel,
    isPipelinePanelOpen = false,
    onSessionNavigate,
  }: Props = $props();

  /** Current input values from InputCollector */
  let inputValues = $state<Record<string, unknown>>({});

  /** Track session being edited for rename */
  let editingSessionId = $state<string | null>(null);

  /** Track which session's dropdown menu is open */
  let openMenuId = $state<string | null>(null);

  /** Whether the runs sub-section is expanded under the active session */
  let runsExpanded = $state(false);

  /** Track if initial session has been loaded to prevent duplicate loads */
  let initialSessionLoaded = $state(false);

  /** Track the session ID that was loaded to detect prop changes */
  let loadedInitialSessionId = $state<string | undefined>(undefined);

  /** Track if auto-run has already been triggered to prevent duplicate executions */
  let autoRunTriggered = $state(false);

  /** Whether log messages are visible in the chat panel */
  let showLogs = $state(true);

  /** Whether a manual refresh is in flight */
  let isRefreshing = $state(false);

  /** Whether the session switcher popover is open (standalone mode) */
  let sessionDropdownOpen = $state(false);

  // Close session popover on outside click
  $effect(() => {
    if (!sessionDropdownOpen) return;
    function handleOutside(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.playground__session-chip-wrap')) {
        sessionDropdownOpen = false;
      }
    }
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  });

  /**
   * Initialize the playground on mount
   */
  onMount(() => {
    if (endpointConfig) setEndpointConfig(endpointConfig);
    if (workflow) playgroundActions.setWorkflow(workflow);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && playgroundService.isPolling()) {
        const sessionId = getCurrentSession()?.id;
        if (sessionId) {
          void playgroundService
            .getMessages(sessionId, playgroundService.getLastSequenceNumber() ?? undefined)
            .then((response) => applyServerResponse(response))
            .catch((err) => logger.error('[Playground] Visibility catchup failed:', err));
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleRefreshStatus = () => void refreshFromServer();
    document.addEventListener('flowdrop:refresh-status', handleRefreshStatus);

    void initializePlayground();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('flowdrop:refresh-status', handleRefreshStatus);
    };
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

    // Skip if this session was already loaded or is currently loading.
    // loadedInitialSessionId is set synchronously at the start of loadInitialSession,
    // so this prevents the effect from spawning concurrent loads when isLoading changes.
    if (loadedInitialSessionId === initialSessionId) {
      return;
    }

    // Skip if sessions haven't been loaded yet (will be handled by onMount)
    const sessionList = getSessions();
    if (sessionList.length === 0 && getIsLoading()) {
      return;
    }

    // Load the initial session if sessions are available
    if (sessionList.length > 0) {
      void loadInitialSession(initialSessionId);
    }
  });

  /**
   * Initialize the playground: load sessions, load initial session, handle auto-run
   */
  async function initializePlayground(): Promise<void> {
    try {
      await loadSessions();

      if (initialSessionId) {
        await loadInitialSession(initialSessionId);
      }

      if (config.autoRun && !autoRunTriggered) {
        autoRunTriggered = true;
        const predefinedMessage = config.predefinedMessage ?? 'Run workflow';
        logger.debug('[Playground] Auto-run triggered with message:', predefinedMessage);
        await handleSendMessage(predefinedMessage);
      }
    } catch (err) {
      logger.error('[Playground] Initialization error:', err);
    }
  }

  /**
   * Load the initial session with validation and error handling
   *
   * @param sessionId - The session ID to load
   */
  async function loadInitialSession(sessionId: string): Promise<void> {
    // Set immediately (before any await) so the $effect guard sees it synchronously
    // and won't spawn a second concurrent load when isLoading changes.
    loadedInitialSessionId = sessionId;

    // Validate session exists in loaded sessions
    const sessionList = getSessions();
    const sessionExists = sessionList.some((s) => s.id === sessionId);

    if (!sessionExists) {
      logger.warn(
        `[Playground] Initial session "${sessionId}" not found in available sessions. ` +
          `Available sessions: ${sessionList.map((s) => s.id).join(', ') || 'none'}`
      );
      initialSessionLoaded = true;
      return;
    }

    try {
      await loadSession(sessionId);
      initialSessionLoaded = true;
    } catch (err) {
      logger.error('[Playground] Failed to load initial session:', err);
      initialSessionLoaded = true;
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
      const session = await playgroundService.getSession(sessionId);
      playgroundActions.setCurrentSession(session);

      const response = await playgroundService.getMessages(sessionId);
      applyServerResponse(response);

      if (session.status === 'running') {
        startPolling(sessionId, true);
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
      const sessionName = `Session ${getSessions().length + 1}`;
      const session = await playgroundService.createSession(workflowId, sessionName);

      if (onSessionNavigate) {
        // URL-based routing: navigate to the new session; page remount handles store init
        onSessionNavigate(session.id);
        return;
      }

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
    playgroundActions.pinExecution(null);
    runsExpanded = false;
    const currentSessionId = getCurrentSession()?.id;
    if (currentSessionId === sessionId) {
      return;
    }

    playgroundService.stopPolling();
    playgroundActions.updateSessionStatus('idle');
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
      if (getCurrentSession()?.id === sessionId) {
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
    const sessionId = getCurrentSession()?.id;
    if (sessionId) {
      interruptActions.clearSessionInterrupts(sessionId);
    }
  }

  /**
   * Send a message
   */
  async function handleSendMessage(content: string): Promise<void> {
    if (getIsExecuting()) return;

    const session = getCurrentSession();
    if (!session) {
      await handleCreateSession();
      const newSession = getCurrentSession();
      if (!newSession) {
        return;
      }
    }

    const sessionId = getCurrentSession()!.id;

    playgroundActions.updateSessionStatus('running');
    playgroundActions.setError(null);

    try {
      const inputs: Record<string, unknown> = {};
      const fields = getInputFields();

      fields.forEach((field) => {
        const key = `${field.nodeId}:${field.fieldId}`;
        if (inputValues[key] !== undefined) {
          if (!inputs[field.nodeId]) {
            inputs[field.nodeId] = {};
          }
          (inputs[field.nodeId] as Record<string, unknown>)[field.fieldId] = inputValues[key];
        }
      });

      const message = await playgroundService.sendMessage(sessionId, content, inputs);
      playgroundActions.addMessage(message);
      startPolling(sessionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      playgroundActions.setError(errorMessage);
      playgroundActions.updateSessionStatus('idle');
      logger.error('Failed to send message:', err);
    }
  }

  /**
   * Stop execution
   */
  async function handleStopExecution(): Promise<void> {
    const sessionId = getCurrentSession()?.id;
    if (!sessionId) {
      return;
    }

    try {
      await playgroundService.stopExecution(sessionId);
      playgroundService.stopPolling();
      playgroundActions.updateSessionStatus('idle');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop execution';
      playgroundActions.setError(errorMessage);
      playgroundService.stopPolling();
      playgroundActions.updateSessionStatus('idle');
      logger.error('Failed to stop execution:', err);
    }
  }

  /**
   * Start polling for messages
   */
  function startPolling(sessionId: string, seedSequence = false): void {
    const pollingInterval = config.pollingInterval ?? 1500;
    const initialSequenceNumber = seedSequence ? getLatestSequenceNumber() : null;

    playgroundService.startPolling(
      sessionId,
      (response) => applyServerResponse(response),
      pollingInterval,
      config.shouldStopPolling,
      initialSequenceNumber
    );
  }

  /**
   * Fetch the latest messages and session status from the server.
   * Resumes polling if the session is running but polling had stopped.
   */
  async function refreshFromServer(): Promise<void> {
    const sessionId = getCurrentSession()?.id;
    if (!sessionId || isRefreshing) return;
    isRefreshing = true;
    try {
      const response = await playgroundService.getMessages(
        sessionId,
        playgroundService.getLastSequenceNumber() ?? undefined
      );
      applyServerResponse(response);
      if (response.sessionStatus === 'running' && !playgroundService.isPolling()) {
        startPolling(sessionId, true);
      }
    } catch (err) {
      logger.error('[Playground] Status refresh failed:', err);
    } finally {
      isRefreshing = false;
    }
  }

  /**
   * Refresh messages for the current session
   * Called after interrupt resolution when polling has stopped
   */
  async function handleInterruptResolved(): Promise<void> {
    const sessionId = getCurrentSession()?.id;
    if (!sessionId) return;

    try {
      const response = await playgroundService.getMessages(sessionId);
      applyServerResponse(response);

      if (response.sessionStatus === 'running') {
        startPolling(sessionId, true);
      }
    } catch (err) {
      logger.error('[Playground] Failed to refresh after interrupt:', err);
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
    <!-- Sidebar — hidden in standalone mode (session switcher lives in the header chip instead) -->
    {#if config.showSidebar === true || (config.showSidebar !== false && mode !== 'standalone')}
      <aside
        class="playground__sidebar"
        style={config.sidebarWidth ? `--fd-playground-sidebar-width: ${config.sidebarWidth}` : ''}
      >
        <!-- Sidebar Header -->
        <div class="playground__sidebar-header">
          <div class="playground__sidebar-title">
            <span>Playground</span>
          </div>
          <a
            href="/workflow/{workflowId}/edit"
            class="playground__edit-link"
            title="Edit workflow"
          >
            <Icon icon="mdi:pencil-outline" />
          </a>
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

        <!-- Sessions Section -->
        <div class="playground__section">
          <!-- Section header with inline add button -->
          <div class="playground__section-header">
            <span class="playground__section-label">Sessions</span>
            <button
              type="button"
              class="playground__section-add"
              onclick={handleCreateSession}
              disabled={getIsLoading()}
              title="New session"
            >
              <Icon icon="mdi:plus" />
            </button>
          </div>

          <!-- Sessions List -->
          <div class="playground__sessions-wrap">
            <div class="playground__sessions">
              {#if getSessions().length === 0 && !getIsLoading()}
                <div class="playground__sessions-empty">
                  <span>No sessions yet</span>
                </div>
              {:else}
                {#each getSessions() as session (session.id)}
                  {@const isActive = getCurrentSession()?.id === session.id}
                  <div class="playground__session-group">
                    <div
                      class="playground__session"
                      class:playground__session--active={isActive}
                      role="button"
                      tabindex="0"
                      title="Click to load this session"
                      aria-label={m().layout.loadSession({ name: session.name })}
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
                    <!-- Collapsible runs sub-section under active session -->
                    {#if isActive && getCurrentSession()?.executions?.length}
                      <div class="playground__runs-section">
                        <button
                          type="button"
                          class="playground__runs-toggle"
                          onclick={() => (runsExpanded = !runsExpanded)}
                        >
                          <Icon icon={runsExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'} />
                          <span>Runs</span>
                          <span class="playground__runs-count">{getCurrentSession()!.executions!.length}</span>
                        </button>
                        {#if runsExpanded}
                          <div class="playground__executions-inline">
                            <ExecutionList
                              executions={getCurrentSession()!.executions!}
                              activeExecutionId={getActiveExecutionId()}
                              latestExecutionId={getLatestExecutionId()}
                              onSelect={(id) => {
                                if (id === getLatestExecutionId()) {
                                  playgroundActions.pinExecution(null);
                                } else {
                                  playgroundActions.pinExecution(id);
                                }
                              }}
                            />
                          </div>
                        {/if}
                      </div>
                    {/if}
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
      <!-- Session Header -->
      {#if mode === 'standalone' || (getCurrentSession() && config.showSessionHeader !== false)}
        <header class="playground__header">
          {#if mode === 'standalone'}
            <!-- Panel icon + label (mirrors PipelinePanel header) -->
            <Icon icon="mdi:message-text-outline" class="playground__header-icon" />
            <span class="playground__header-label">Sessions</span>

            <!-- Session chip — switches sessions via popover -->
            <div class="playground__session-chip-wrap">
              <button
                type="button"
                class="playground__session-chip"
                class:playground__session-chip--open={sessionDropdownOpen}
                onclick={() => (sessionDropdownOpen = !sessionDropdownOpen)}
                title="Switch session"
              >
                <span class="playground__session-chip-name">
                  {getCurrentSession()?.name ?? 'No session'}
                </span>
                <Icon icon={sessionDropdownOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} class="playground__session-chip-chevron" />
              </button>

              {#if sessionDropdownOpen}
                <div class="playground__session-popover">
                  <button
                    type="button"
                    class="playground__session-popover-item playground__session-popover-item--new"
                    disabled={getIsLoading()}
                    onclick={() => { sessionDropdownOpen = false; void handleCreateSession(); }}
                  >
                    <Icon icon="mdi:plus" />
                    <span>New session</span>
                  </button>
                  {#if getSessions().length > 0}
                    <div class="playground__session-popover-divider"></div>
                    {#each getSessions() as session (session.id)}
                      {@const isActive = getCurrentSession()?.id === session.id}
                      <div class="playground__session-popover-row">
                        <button
                          type="button"
                          class="playground__session-popover-item"
                          class:playground__session-popover-item--active={isActive}
                          onclick={() => {
                            sessionDropdownOpen = false;
                            if (onSessionNavigate) {
                              onSessionNavigate(session.id);
                            } else {
                              void handleSelectSession(session.id);
                            }
                          }}
                        >
                          {#if isActive}
                            <Icon icon="mdi:check" class="playground__session-popover-check" />
                          {:else}
                            <Icon icon="mdi:message-outline" />
                          {/if}
                          <span>{session.name}</span>
                        </button>
                        <button
                          type="button"
                          class="playground__session-popover-delete"
                          onclick={(e) => { handleMenuDelete(e, session.id); sessionDropdownOpen = false; }}
                          title="Delete session"
                        >
                          <Icon icon="mdi:delete-outline" />
                        </button>
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          {:else}
            <!-- Embedded / modal: original title + close -->
            <div class="playground__header-group">
              <h2 class="playground__header-title">{getCurrentSession()?.name}</h2>
              <button
                type="button"
                class="playground__header-close"
                onclick={handleCloseSession}
                title="Close session"
              >
                <Icon icon="mdi:close" />
              </button>
            </div>
          {/if}

          <div class="playground__header-actions">
            {#if mode === 'standalone' && onTogglePanel}
              <button
                type="button"
                class="playground__log-toggle"
                class:playground__log-toggle--active={isPipelinePanelOpen}
                onclick={onTogglePanel}
                title={isPipelinePanelOpen ? 'Hide pipeline' : 'Show pipeline'}
              >
                <Icon icon="mdi:source-branch" />
                Pipeline
              </button>
            {/if}
            {#if getCurrentSession()}
              <button
                type="button"
                class="playground__log-toggle"
                class:playground__refresh--spinning={isRefreshing}
                onclick={() => void refreshFromServer()}
                disabled={isRefreshing}
                title="Refresh status"
              >
                <Icon icon="mdi:refresh" />
                Refresh
              </button>
            {/if}
            <button
              type="button"
              class="playground__log-toggle"
              class:playground__log-toggle--active={showLogs}
              onclick={() => (showLogs = !showLogs)}
              title={showLogs ? 'Hide log messages' : 'Show log messages'}
            >
              <Icon icon="mdi:console" />
              Logs
            </button>
          </div>
        </header>
      {/if}

      <!-- Error Banner -->
      {#if getError()}
        <div class="playground__error">
          <Icon icon="mdi:alert-circle" />
          <span>{getError()}</span>
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
        {#if getIsLoading() && !getCurrentSession()}
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
            bind:showLogs
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
    box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
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

  .playground__edit-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--fd-playground-icon-btn-size);
    height: var(--fd-playground-icon-btn-size);
    border-radius: var(--fd-radius-md);
    color: var(--fd-muted-foreground);
    text-decoration: none;
    transition: all var(--fd-transition-fast);
    flex-shrink: 0;
  }

  .playground__edit-link:hover {
    background-color: var(--fd-muted);
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
    padding: 0 var(--fd-space-md);
  }

  /* Section header: label + add icon */
  .playground__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--fd-space-md) var(--fd-space-xs) var(--fd-space-xs);
  }

  .playground__section-label {
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .playground__section-add {
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

  .playground__section-add:hover:not(:disabled) {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
  }

  .playground__section-add:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Session group wraps session row + its inline runs */
  .playground__session-group {
    margin-bottom: var(--fd-space-3xs);
  }

  /* Collapsible runs sub-section under active session */
  .playground__runs-section {
    margin-bottom: var(--fd-space-3xs);
  }

  .playground__runs-toggle {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    width: 100%;
    padding: var(--fd-space-3xs) var(--fd-space-sm);
    padding-left: calc(var(--fd-space-md) + var(--fd-space-3xs));
    border: none;
    border-radius: var(--fd-radius-sm);
    background: transparent;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: all var(--fd-transition-fast);
  }

  .playground__runs-toggle:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
  }

  .playground__runs-toggle :global(svg) {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
  }

  .playground__runs-count {
    margin-left: auto;
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
    background: var(--fd-muted);
    border-radius: 999px;
    padding: 1px var(--fd-space-xs);
    min-width: 1.4em;
    text-align: center;
    line-height: 1.4;
  }

  /* Inline runs tree under active session */
  .playground__executions-inline {
    margin-left: calc(var(--fd-space-md) + var(--fd-space-xs));
    margin-bottom: var(--fd-space-xs);
    border-left: 2px solid var(--fd-border);
    padding-left: var(--fd-space-xs);
  }

  .playground__executions-inline :global(.execution-list__item) {
    padding: var(--fd-space-xs) var(--fd-space-sm);
    font-size: var(--fd-text-xs);
    border-radius: var(--fd-radius-sm);
    border-left-width: 2px;
  }

  .playground__executions-inline :global(.execution-list) {
    gap: 1px;
    padding: var(--fd-space-3xs) 0;
  }

  /* Sessions */
  .playground__sessions-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .playground__sessions {
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--fd-space-3xs) var(--fd-space-xl);
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
    gap: var(--fd-space-xs);
    height: var(--fd-playground-header-height);
    padding: 0 var(--fd-space-xl);
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-background);
    box-sizing: border-box;
    flex-shrink: 0;
  }

  :global(.playground__header-icon) {
    font-size: var(--fd-text-base);
    color: var(--fd-muted-foreground);
    flex-shrink: 0;
  }

  .playground__header-label {
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
    flex-shrink: 0;
  }

  .playground__header-group {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
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

  .playground__header-actions {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin-left: auto;
  }

  .playground__log-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-3xs) var(--fd-space-sm);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: transparent;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    line-height: 1;
  }

  .playground__log-toggle :global(svg) {
    font-size: var(--fd-text-xs);
  }

  .playground__log-toggle:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
    border-color: var(--fd-border-strong);
  }

  .playground__log-toggle--active {
    background-color: var(--fd-primary-muted);
    border-color: var(--fd-primary);
    color: var(--fd-primary);
  }

  .playground__refresh--spinning :global(svg) {
    animation: spin 0.8s linear infinite;
  }

  /* Session chip (standalone mode) */
  .playground__session-chip-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .playground__session-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-3xs) var(--fd-space-sm) var(--fd-space-3xs) var(--fd-space-xs);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    max-width: 220px;
    line-height: 1;
  }

  .playground__session-chip :global(svg) {
    flex-shrink: 0;
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
  }

  .playground__session-chip:hover {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
  }

  .playground__session-chip--open {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
  }

  .playground__session-chip-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  :global(.playground__session-chip-chevron) {
    color: var(--fd-muted-foreground);
    flex-shrink: 0;
  }

  /* Session switcher popover */
  .playground__session-popover {
    position: absolute;
    top: calc(100% + var(--fd-space-xs));
    left: 0;
    z-index: 50;
    min-width: 220px;
    max-width: 300px;
    padding: var(--fd-space-xs);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    box-shadow: var(--fd-shadow-lg);
  }

  .playground__session-popover-divider {
    height: 1px;
    background-color: var(--fd-border-muted);
    margin: var(--fd-space-xs) 0;
  }

  .playground__session-popover-row {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .playground__session-popover-item {
    display: flex;
    align-items: center;
    gap: var(--fd-space-sm);
    flex: 1;
    min-width: 0;
    padding: var(--fd-space-sm) var(--fd-space-sm);
    border: none;
    border-radius: var(--fd-radius-sm);
    background: transparent;
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .playground__session-popover-item :global(svg) {
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
  }

  .playground__session-popover-item span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .playground__session-popover-item:hover {
    background-color: var(--fd-muted);
  }

  .playground__session-popover-item:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .playground__session-popover-item--new {
    color: var(--fd-primary);
    font-weight: 500;
  }

  .playground__session-popover-item--new :global(svg) {
    color: var(--fd-primary);
  }

  .playground__session-popover-item--active {
    font-weight: 500;
  }

  :global(.playground__session-popover-check) {
    color: var(--fd-primary) !important;
  }

  .playground__session-popover-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--fd-size-icon-btn);
    height: var(--fd-size-icon-btn);
    border: none;
    border-radius: var(--fd-radius-sm);
    background: transparent;
    color: var(--fd-muted-foreground);
    cursor: pointer;
    opacity: 0;
    transition: all var(--fd-transition-fast);
  }

  .playground__session-popover-row:hover .playground__session-popover-delete {
    opacity: 1;
  }

  .playground__session-popover-delete:hover {
    background-color: var(--fd-error-muted);
    color: var(--fd-error);
    opacity: 1;
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
