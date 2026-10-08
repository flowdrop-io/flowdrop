<!--
  PlaygroundSurface

  The Playground's conversation surface: ExecutionConsole (top) and
  ControlPanel (bottom, or on top for a form-first workflow) and the session
  and run wiring around them. It holds no layout opinion of its
  own beyond that: no pipeline panel, no minimum width.

  Two kinds of caller:
   - the standalone Playground (`Playground.svelte`, used by PlaygroundStudio,
     PlaygroundModal and the /workflow/[id]/playground/[sessionId] route),
     which is deprecated in favour of Test mode and removed in 3.0;
   - the docked Playground of the editor's Test mode (`DockedPlayground.svelte`),
     which must keep working when the standalone one goes. Everything both
     need lives here.
-->

<script lang="ts">
  import { onMount, onDestroy, untrack, type Snippet } from 'svelte';
  import Icon from '@iconify/svelte';
  import ExecutionConsole from './ExecutionConsole.svelte';
  import ControlPanel from './ControlPanel.svelte';
  import PlaygroundHeader from './PlaygroundHeader.svelte';
  import type { Workflow } from '../../types/index.js';
  import type { EndpointConfig } from '../../config/endpoints.js';
  import type { AuthProvider } from '../../types/auth.js';
  import type { PlaygroundMode, PlaygroundConfig } from '../../types/playground.js';
  import { provideInstance } from '../../stores/getInstance.svelte.js';
  import type { FlowDropInstance } from '../../stores/instanceContainer.svelte.js';
  import { logger } from '../../utils/logger.js';
  import { getMessages } from '$lib/messages/index.js';
  import {
    parseSlashCommand,
    dispatchCommand,
    type CommandOutcome
  } from '../../playground/commands/index.js';
  import { isPlaygroundChatHalfSet, isPlaygroundChatSet } from '../../utils/playgroundChat.js';

  interface Props {
    workflowId: string;
    workflow?: Workflow;
    mode?: PlaygroundMode;
    initialSessionId?: string;
    endpointConfig?: EndpointConfig;
    /** Auth provider applied to this instance's API requests. */
    authProvider?: AuthProvider;
    config?: PlaygroundConfig;
    onClose?: () => void;
    onTogglePanel?: () => void;
    isPipelinePanelOpen?: boolean;
    onSessionNavigate?: (sessionId: string) => void;
    instance?: FlowDropInstance;
    /**
     * Keep the instance's session, messages and polling when this surface goes
     * away. The editor's Test mode unmounts the Playground when you switch
     * back to Edit; the run must go on and be there when you come back. A
     * session left by a different workflow is dropped on mount.
     * @default false
     */
    retainSession?: boolean;
    /**
     * `workflow` is the caller's live copy (the editor's): follow it when its
     * interface or Playground settings change, so an edit to the chat binding
     * takes effect without a remount.
     * @default false
     */
    followWorkflow?: boolean;
    /**
     * Where the workflow's Playground settings are, for a caller that has such
     * a place (the editor). Offered in the history header's ⋯ menu.
     */
    onOpenSettings?: () => void;
    /**
     * The first send creates the session, so the composer works with none and
     * nothing asks for a session to be created first (Test mode: the test
     * session is created on the first run).
     * @default false
     */
    sessionOptional?: boolean;
    /**
     * Save the workflow through the caller's own save path (the editor's).
     * With it, Send reads "Save & send" while the workflow has unsaved edits,
     * saves first, and sends nothing when the save fails; the conversation
     * shows a divider where a save made a new version. Resolves `true` when it
     * was written, `false` when nothing was saved; throws on failure.
     */
    onSave?: () => Promise<boolean>;
    /**
     * List only the sessions the Playground created (the editor's Playground),
     * not every session of the workflow.
     * @default false
     */
    playgroundSessionsOnly?: boolean;
    /**
     * The docked Playground's header: a history chip (Conversations and Runs)
     * and a ⋯ menu, on top, in place of the session header the control panel
     * carries (session chip, Refresh, Logs).
     * @default false
     */
    historyHeader?: boolean;
    /**
     * Extra entries at the end of the ⋯ menu of the history header. See
     * PlaygroundHeader's `menuItems`.
     */
    menuItems?: Snippet<[{ close: () => void }]>;
  }

  let {
    workflowId,
    workflow,
    mode = 'standalone',
    initialSessionId,
    endpointConfig,
    authProvider,
    config = {},
    onClose,
    onTogglePanel,
    isPipelinePanelOpen = false,
    onSessionNavigate,
    instance,
    retainSession = false,
    followWorkflow = false,
    onOpenSettings,
    sessionOptional = false,
    onSave,
    playgroundSessionsOnly = false,
    historyHeader = false,
    menuItems
  }: Props = $props();

  // Resolve/provide once at init; the instance prop is a fixed mount-time choice.
  // svelte-ignore state_referenced_locally
  const fd = provideInstance(instance);

  // The messages getter is read from context here, at init: `m()` calls
  // getContext, which throws outside component initialisation, and every
  // read below happens in an event handler or after an await.
  const messages = getMessages();

  /**
   * One line in the empty conversation when the chat binding cannot chat: nothing
   * set up, or a stored binding that no longer binds anything (its inputs
   * were removed) — the form or Run still work — or a message input with no
   * reply, which would take what the person types and never answer.
   */
  const chatNotice = $derived.by(() => {
    const resolved = fd.playground.chatBinding;
    if (resolved === null) return undefined;
    if (!isPlaygroundChatSet(resolved.binding)) return messages().playground.chatNotSetUp;
    if (isPlaygroundChatHalfSet(resolved.binding)) return messages().playground.chatHalfSet;
    return undefined;
  });

  /** The form shown as JSON (the header menu's JSON view). */
  let jsonView = $state(false);

  let loadedInitialSessionId = $state<string | undefined>(undefined);
  let autoRunTriggered = $state(false);
  /**
   * Transient result of the last slash command. Deliberately component state,
   * not a session message — see runCommand.
   */
  let commandFeedback = $state<CommandOutcome | null>(null);

  // The session/run executors live in the instance's run controller. The
  // props that steer them are handed over at init and kept in sync below.
  const runOptions = () => ({
    workflowId,
    workflow,
    messagePageSize: config.messagePageSize,
    pollingInterval: config.pollingInterval,
    shouldStopPolling: config.shouldStopPolling,
    onSessionNavigate,
    predefinedMessage: config.predefinedMessage,
    saveWorkflow: onSave,
    playgroundSessionsOnly,
    messages
  });
  fd.runs.configure(runOptions());
  $effect(() => {
    fd.runs.configure(runOptions());
  });

  /**
   * How a turn is collected, from the workflow interface's turn ports.
   * `legacy` (no interface, or no `turn` declared) keeps the host-configured
   * behaviour exactly; the other modes follow the interface:
   *  - `chat`: the chat box (unless the host hides it with showChatInput:
   *    false), plus a form for any other interface inputs;
   *  - `form`: a form and Run; the turn sends `inputs` and no content;
   *  - `run`: Run alone; the turn sends neither.
   * In `form` and `run` the chat box and predefinedMessage are ignored: the
   * server refuses content for a workflow with no `message` port.
   */
  const inputMode = $derived(fd.playground.inputMode);
  const showChatBox = $derived(
    inputMode === 'legacy'
      ? (config.showChatInput ?? true)
      : inputMode === 'chat' && config.showChatInput !== false
  );

  // A live workflow (the editor's): the chat binding and form follow its
  // interface and Playground settings. Tracked by those two keys only, so a
  // node drag does not reach the store, nor trigger a load.
  const liveInterface = $derived(followWorkflow ? workflow?.interface : undefined);
  const livePlayground = $derived(followWorkflow ? workflow?.playground : undefined);
  let followedOnce = false;
  $effect(() => {
    void liveInterface;
    void livePlayground;
    if (!followWorkflow) return;
    if (!followedOnce) {
      followedOnce = true;
      return;
    }
    untrack(() => {
      if (!workflow) return;
      fd.playground.setWorkflow(workflow);
      void fd.runs.ensureWorkflowInterface();
    });
  });

  onMount(() => {
    if (endpointConfig) fd.api.configure(endpointConfig, authProvider);
    // A retained session belongs to the workflow it was started on.
    const held = fd.playground.currentWorkflow;
    if (retainSession && held && workflow && held.id !== workflow.id) {
      fd.playgroundService.stopPolling();
      fd.playground.reset();
      fd.interrupts.reset();
      fd.runs.clearNodeStatuses();
    }
    if (workflow) fd.playground.setWorkflow(workflow);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && fd.runs.isPolling) {
        void fd.runs.catchUp();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleRefreshStatus = () => void fd.runs.refresh();
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

    const sessionList = fd.playground.sessions;
    if (sessionList.length === 0) return;

    void loadInitialSession(initialSessionId);
  });

  async function initializePlayground(): Promise<void> {
    try {
      await Promise.all([fd.runs.loadSessions(), fd.runs.ensureWorkflowInterface()]);

      if (initialSessionId) {
        await loadInitialSession(initialSessionId);
      }

      if (config.autoRun && !autoRunTriggered) {
        autoRunTriggered = true;
        logger.debug('[Playground] Auto-run triggered');
        await startRun();
      }
    } catch (err) {
      logger.error('[Playground] Initialization error:', err);
    }
  }

  async function loadInitialSession(sessionId: string): Promise<void> {
    const sessionList = fd.playground.sessions;
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
      await fd.runs.loadSession(sessionId);
    } catch (err) {
      logger.error('[Playground] Failed to load initial session:', err);
    }
  }

  onDestroy(() => {
    if (!retainSession) {
      // Only this instance's poller. interruptService polling is page-wide and
      // never started by the library; a host that starts it stops it.
      fd.playgroundService.stopPolling();
      fd.playground.reset();
      fd.interrupts.reset();
    }
    // Drop the props this mount handed the controller: they close over it.
    fd.runs.configure({});
  });

  /**
   * Start a run from the Run button or auto-run; a refused launch is reported
   * as transient composer feedback.
   */
  async function startRun(): Promise<void> {
    const feedback = await fd.runs.startRun();
    if (feedback) commandFeedback = feedback;
  }

  /**
   * Run a slash command and surface its outcome as transient composer feedback.
   *
   * Commands are never posted as session messages — control traffic must not
   * enter conversation history, or it returns as the next turn's chat input.
   */
  async function runCommand(input: string): Promise<void> {
    const parsed = parseSlashCommand(input);
    const msgs = messages().playground.commands;

    if (parsed.kind === 'unknown') {
      commandFeedback = {
        status: 'error',
        message: parsed.suggestions.length
          ? msgs.unknownWithSuggestions({
              name: parsed.name,
              suggestions: parsed.suggestions.map((s) => `/${s}`).join(', ')
            })
          : msgs.unknown({ name: parsed.name })
      };
      return;
    }

    if (parsed.kind !== 'command') return;

    commandFeedback = await dispatchCommand(parsed.command, {
      config: fd.api.config,
      sessionId: fd.playground.currentSession?.id ?? null,
      // The active run: pinned if the user pinned one, else the latest main
      // run. Sub-flows are excluded upstream, so `/pause` targets the run the
      // user means rather than whichever inner iteration is on screen.
      pipelineId: fd.playground.activeExecutionId,
      pendingSignal: fd.runs.pendingSignal,
      handlers: fd.runs.commandHandlers(),
      messages: msgs
    });
  }

  async function handleSendMessage(content: string): Promise<boolean> {
    // Commands are intercepted *before* the executing guard: /stop is only
    // useful while a run is in flight, which is exactly when plain text is
    // refused.
    const parsed = parseSlashCommand(content);
    if (parsed.kind === 'command' || parsed.kind === 'unknown') {
      await runCommand(content);
      return true;
    }

    commandFeedback = null;

    // An escaped message (`//foo`) is sent as its literal text (`/foo`).
    const messageContent = parsed.kind === 'message' ? parsed.content : content;

    return fd.runs.takeTurn({ content: messageContent });
  }
</script>

<div
  class="flowdrop-scope playground"
  class:playground--embedded={mode === 'embedded'}
  class:playground--standalone={mode === 'standalone'}
  class:playground--modal={mode === 'modal'}
>
  <main class="playground__main">
    {#if historyHeader}
      <PlaygroundHeader
        hasForm={fd.playground.interfaceFormEntries.length > 0}
        {jsonView}
        onToggleJsonView={() => (jsonView = !jsonView)}
        {onOpenSettings}
        {menuItems}
      />
    {/if}

    {#if fd.playground.error}
      <div class="playground__error">
        <Icon icon="mdi:alert-circle" />
        <span>{fd.playground.error}</span>
        <button
          type="button"
          class="playground__error-dismiss"
          onclick={() => fd.playground.setError(null)}
        >
          <Icon icon="mdi:close" />
        </button>
      </div>
    {/if}

    <div class="playground__content">
      {#if fd.playground.isLoading && !fd.playground.currentSession}
        <div class="playground__loading">
          <Icon icon="mdi:loading" class="playground__loading-icon" />
          <span>Loading...</span>
        </div>
      {:else}
        <ExecutionConsole
          showTimestamps={config.showTimestamps ?? true}
          autoScroll={config.autoScroll ?? true}
          enableMarkdown={config.enableMarkdown ?? true}
          onInterruptResolved={() => fd.runs.catchUp({ restartPolling: true })}
          {sessionOptional}
          notice={chatNotice}
          {onOpenSettings}
          onCreateSession={fd.playground.sessions.length === 0 && !sessionOptional
            ? () => fd.runs.createSession()
            : undefined}
          onLoadOlder={() => fd.runs.loadOlderMessages()}
        />

        <ControlPanel
          {isPipelinePanelOpen}
          {onTogglePanel}
          isRefreshing={fd.runs.isRefreshing}
          {onSessionNavigate}
          onCreateSession={() => fd.runs.createSession()}
          onSelectSession={(sessionId) => fd.runs.selectSession(sessionId)}
          onDeleteSession={(sessionId) => fd.runs.deleteSession(sessionId)}
          onSendMessage={handleSendMessage}
          onStopExecution={() => fd.runs.stopExecution()}
          onRunWorkflow={startRun}
          awaitEnableRun={inputMode === 'legacy'}
          onRefresh={() => fd.runs.refresh()}
          enableCommands
          {commandFeedback}
          onDismissCommandFeedback={() => (commandFeedback = null)}
          showChatInput={showChatBox}
          showRunButton={config.showRunButton ?? true}
          predefinedMessage={inputMode === 'form' || inputMode === 'run'
            ? undefined
            : config.predefinedMessage}
          formEntries={fd.playground.interfaceFormEntries}
          {sessionOptional}
          beforeSend={onSave ? () => fd.runs.saveFirst() : undefined}
          saveFirst={fd.runs.needsSave}
          formJson={jsonView}
          formValues={fd.playground.formValues}
          onFormChange={(values) => fd.playground.setFormValues(values)}
          showSessionHeader={historyHeader ? false : (config.showSessionHeader ?? true)}
          showNewSessionButton={config.showNewSessionButton ?? true}
          showSessionList={config.showSessionList ?? true}
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

  /* A form-first panel (the inputs card) sits above the conversation. */
  .playground__content > :global(.control-panel--form) {
    order: -1;
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
