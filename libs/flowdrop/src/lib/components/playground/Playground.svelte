<!--
  Playground Component

  Three-pane interactive workflow runtime. Hosts session and execution logic
  for the playground feature; delegates rendering to ExecutionConsole (top
  right) and ControlPanel (bottom right) with a draggable vertical resizer
  between them.

  Used by PlaygroundStudio (standalone), PlaygroundModal (modal), and the
  /workflow/[id]/playground/[sessionId] route.
-->

<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import Icon from '@iconify/svelte';
  import ExecutionConsole from './ExecutionConsole.svelte';
  import ControlPanel from './ControlPanel.svelte';
  import type { Workflow } from '../../types/index.js';
  import type { EndpointConfig } from '../../config/endpoints.js';
  import type {
    PlaygroundMode,
    PlaygroundConfig,
    PlaygroundSessionStatus
  } from '../../types/playground.js';
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
    applyServerResponse,
    getLatestSequenceNumber
  } from '../../stores/playgroundStore.svelte.js';
  import { interruptActions } from '../../stores/interruptStore.svelte.js';
  import { logger } from '../../utils/logger.js';

  interface Props {
    workflowId: string;
    workflow?: Workflow;
    mode?: PlaygroundMode;
    initialSessionId?: string;
    endpointConfig?: EndpointConfig;
    config?: PlaygroundConfig;
    onClose?: () => void;
    onTogglePanel?: () => void;
    isPipelinePanelOpen?: boolean;
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
    onSessionNavigate
  }: Props = $props();

  let loadedInitialSessionId = $state<string | undefined>(undefined);
  let autoRunTriggered = $state(false);
  let isRefreshing = $state(false);

  // Vertical resizer state for the ExecutionConsole ↔ ControlPanel split.
  let playgroundContentEl = $state<HTMLElement | null>(null);
  let controlPanelHeight = $state(280);
  let isVerticalResizing = $state(false);
  let containerHeight = $state(0);
  let dragContainerBottom = 0;

  $effect(() => {
    if (!playgroundContentEl) return;
    const observer = new ResizeObserver(([entry]) => {
      containerHeight = entry.contentRect.height;
    });
    observer.observe(playgroundContentEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (containerHeight > 0) {
      controlPanelHeight = clampControlPanelHeight(untrack(() => controlPanelHeight));
    }
  });

  const maxControlPanelHeight = $derived(
    containerHeight ? Math.round(containerHeight * 0.6) : 600
  );

  function clampControlPanelHeight(h: number): number {
    return Math.min(Math.max(h, 140), maxControlPanelHeight);
  }

  function handleVerticalResizerPointerDown(e: PointerEvent) {
    if (playgroundContentEl) dragContainerBottom = playgroundContentEl.getBoundingClientRect().bottom;
    isVerticalResizing = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleVerticalResizerPointerMove(e: PointerEvent) {
    if (!isVerticalResizing) return;
    controlPanelHeight = clampControlPanelHeight(dragContainerBottom - e.clientY);
  }

  function handleVerticalResizerPointerUp() {
    isVerticalResizing = false;
  }

  function handleVerticalResizerKeyDown(e: KeyboardEvent) {
    const step = e.shiftKey ? 50 : 20;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      controlPanelHeight = clampControlPanelHeight(controlPanelHeight + step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      controlPanelHeight = clampControlPanelHeight(controlPanelHeight - step);
    }
  }

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
   */
  $effect(() => {
    if (!initialSessionId) return;
    if (loadedInitialSessionId === initialSessionId) return;

    const sessionList = getSessions();
    if (sessionList.length === 0) return;

    void loadInitialSession(initialSessionId);
  });

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

  async function loadInitialSession(sessionId: string): Promise<void> {
    const sessionList = getSessions();
    const sessionExists = sessionList.some((s) => s.id === sessionId);

    if (!sessionExists) {
      logger.warn(
        `[Playground] Initial session "${sessionId}" not found. ` +
          `Available: ${sessionList.map((s) => s.id).join(', ') || 'none'}`
      );
      return;
    }

    loadedInitialSessionId = sessionId;

    try {
      await loadSession(sessionId);
    } catch (err) {
      logger.error('[Playground] Failed to load initial session:', err);
    }
  }

  onDestroy(() => {
    playgroundService.stopPolling();
    interruptService.stopPolling();
    playgroundActions.reset();
    interruptActions.reset();
  });

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

  async function loadSession(sessionId: string): Promise<void> {
    playgroundActions.setLoading(true);
    playgroundActions.setError(null);

    try {
      const session = await playgroundService.getSession(sessionId);
      playgroundActions.setCurrentSession(session);

      const response = await playgroundService.getMessages(sessionId);
      applyServerResponse(response);

      if (session.status !== 'idle') {
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

  async function handleCreateSession(): Promise<void> {
    playgroundActions.setLoading(true);
    playgroundActions.setError(null);

    try {
      const sessionName = `Session ${getSessions().length + 1}`;
      const session = await playgroundService.createSession(workflowId, sessionName);

      if (onSessionNavigate) {
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

  async function handleSelectSession(sessionId: string): Promise<void> {
    playgroundActions.pinExecution(null);
    const currentSessionId = getCurrentSession()?.id;
    if (currentSessionId === sessionId) return;

    playgroundService.stopPolling();
    playgroundActions.updateSessionStatus('idle');
    await loadSession(sessionId);
  }

  async function handleDeleteSession(sessionId: string): Promise<void> {
    try {
      await playgroundService.deleteSession(sessionId);
      playgroundActions.removeSession(sessionId);

      if (getCurrentSession()?.id === sessionId) {
        playgroundService.stopPolling();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      playgroundActions.setError(errorMessage);
      logger.error('Failed to delete session:', err);
    }
  }

  async function handleSendMessage(content: string): Promise<void> {
    if (getIsExecuting()) return;

    if (!getCurrentSession()) {
      await handleCreateSession();
      if (!getCurrentSession()) return;
    }

    const sessionId = getCurrentSession()!.id;

    playgroundActions.updateSessionStatus('running');
    playgroundActions.pinExecution(null);
    playgroundActions.setError(null);

    try {
      const message = await playgroundService.sendMessage(sessionId, content, {});
      playgroundActions.addMessage(message);
      // Only start polling if not already active — avoids resetting the cursor
      // mid-session and re-fetching messages that are already in the store.
      if (!playgroundService.isPolling()) {
        startPolling(sessionId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      playgroundActions.setError(errorMessage);
      playgroundActions.updateSessionStatus('idle');
      logger.error('Failed to send message:', err);
    }
  }

  async function handleStopExecution(): Promise<void> {
    const sessionId = getCurrentSession()?.id;
    if (!sessionId) return;

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

  function startPolling(
    sessionId: string,
    seedSequence = false,
    overrideShouldStopPolling?: (status: PlaygroundSessionStatus) => boolean
  ): void {
    const pollingInterval = config.pollingInterval ?? 1500;
    const initialSequenceNumber = seedSequence ? getLatestSequenceNumber() : null;

    playgroundService.startPolling(
      sessionId,
      (response) => applyServerResponse(response),
      pollingInterval,
      overrideShouldStopPolling ?? config.shouldStopPolling,
      initialSequenceNumber
    );
  }

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

  async function handleInterruptResolved(): Promise<void> {
    const sessionId = getCurrentSession()?.id;
    if (!sessionId) return;

    try {
      // Catch up immediately rather than waiting for the next poll interval.
      // Use the service's sequence cursor so we only fetch new messages.
      const response = await playgroundService.getMessages(
        sessionId,
        playgroundService.getLastSequenceNumber() ?? undefined
      );
      applyServerResponse(response);
    } catch (err) {
      logger.error('[Playground] Failed to refresh after interrupt:', err);
    }

    // Polling continues through awaiting_input now, but restart defensively
    // in case it stopped for any reason (e.g. component re-mount).
    if (!playgroundService.isPolling()) {
      startPolling(sessionId, true);
    }
  }
</script>

<div
  class="playground"
  class:playground--embedded={mode === 'embedded'}
  class:playground--standalone={mode === 'standalone'}
  class:playground--modal={mode === 'modal'}
>
  <main class="playground__main">
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

    <div
      class="playground__content"
      bind:this={playgroundContentEl}
    >
      {#if getIsLoading() && !getCurrentSession()}
        <div class="playground__loading">
          <Icon icon="mdi:loading" class="playground__loading-icon" />
          <span>Loading...</span>
        </div>
      {:else}
        <ExecutionConsole
          showTimestamps={config.showTimestamps ?? true}
          autoScroll={config.autoScroll ?? true}
          enableMarkdown={config.enableMarkdown ?? true}
          showLogsInline={config.logDisplayMode === 'inline'}
          onInterruptResolved={handleInterruptResolved}
          onCreateSession={getSessions().length === 0 ? handleCreateSession : undefined}
        />

        <div
          class="playground__vertical-resizer"
          class:playground__vertical-resizer--active={isVerticalResizing}
          role="separator"
          aria-orientation="horizontal"
          aria-valuenow={Math.round(controlPanelHeight)}
          aria-valuemin={140}
          aria-valuemax={maxControlPanelHeight}
          aria-label="Resize execution console"
          tabindex="0"
          onpointerdown={handleVerticalResizerPointerDown}
          onpointermove={handleVerticalResizerPointerMove}
          onpointerup={handleVerticalResizerPointerUp}
          onpointercancel={handleVerticalResizerPointerUp}
          onkeydown={handleVerticalResizerKeyDown}
        >
          <div class="playground__vertical-resizer-handle"></div>
        </div>

        <ControlPanel
          style="height: {controlPanelHeight}px; flex-shrink: 0;"
          {isPipelinePanelOpen}
          {onTogglePanel}
          {isRefreshing}
          {onSessionNavigate}
          onCreateSession={handleCreateSession}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onSendMessage={handleSendMessage}
          onStopExecution={handleStopExecution}
          onRefresh={refreshFromServer}
          showChatInput={config.showChatInput ?? true}
          showRunButton={config.showRunButton ?? true}
          predefinedMessage={config.predefinedMessage}
        />
      {/if}
    </div>
  </main>

  {#if (mode === 'embedded' || mode === 'modal') && onClose}
    <button
      type="button"
      class="playground__floating-close"
      onclick={onClose}
      title="Close playground"
      aria-label="Close playground"
    >
      <Icon icon={mode === 'modal' ? 'mdi:close' : 'mdi:dock-right'} />
    </button>
  {/if}
</div>

<style>
  .playground {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: clip; /* clip avoids the BFC that overflow:hidden creates, which breaks position:sticky inside */
    background-color: var(--fd-muted);
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  .playground--embedded {
    border-left: 1px solid var(--fd-border);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
  }

  .playground--standalone {
    background: var(--fd-layout-background, var(--fd-muted));
  }

  :global([data-theme='dark']) .playground--standalone {
    background: linear-gradient(135deg, #141418 0%, #1a1a2e 50%, #16162a 100%);
  }

  .playground--modal {
    width: 100%;
  }

  .playground__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: clip; /* clip avoids the BFC that overflow:hidden creates, which breaks position:sticky inside */
    background-color: var(--fd-background);
  }

  .playground__error {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-xl);
    background-color: var(--fd-error-muted);
    border-bottom: 1px solid var(--fd-error);
    color: var(--fd-error);
    font-size: var(--fd-text-sm);
    flex-shrink: 0;
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

  .playground__content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .playground__vertical-resizer {
    height: 8px;
    flex-shrink: 0;
    cursor: row-resize;
    background-color: var(--fd-background);
    border-top: 1px solid var(--fd-border);
    border-bottom: 1px solid var(--fd-border);
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
    z-index: 1;
    transition: background-color var(--fd-transition-normal);
  }

  .playground__vertical-resizer:hover,
  .playground__vertical-resizer--active {
    background-color: var(--fd-primary-muted);
  }

  .playground__vertical-resizer-handle {
    width: 48px;
    height: 4px;
    background-color: var(--fd-border-strong);
    border-radius: var(--fd-radius-sm);
    transition:
      background-color var(--fd-transition-normal),
      transform var(--fd-transition-normal);
  }

  .playground__vertical-resizer:hover .playground__vertical-resizer-handle {
    background-color: var(--fd-primary);
    transform: scaleX(1.1);
  }

  .playground__vertical-resizer--active .playground__vertical-resizer-handle {
    background-color: var(--fd-primary-hover);
    transform: scaleX(1.2);
  }

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
    animation: playground-spin 1s linear infinite;
  }

  @keyframes playground-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .playground__floating-close {
    position: absolute;
    top: var(--fd-space-md);
    right: var(--fd-space-md);
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--fd-playground-icon-btn-size, 2rem);
    height: var(--fd-playground-icon-btn-size, 2rem);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-background);
    color: var(--fd-muted-foreground);
    cursor: pointer;
    transition: all var(--fd-transition-fast);
  }

  .playground__floating-close:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
  }

  .playground--modal .playground__floating-close {
    display: none;
  }
</style>
