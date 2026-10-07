/**
 * Run Controller
 *
 * The session and run executors of one FlowDrop instance: load, create,
 * select, delete and reset sessions, take a turn, launch a run, signal a
 * pipeline, stop, poll, refresh. They used to live inside `Playground.svelte`;
 * moving them here lets any surface of the instance drive the same code path
 * (the Playground, the editor's Command Console, and later a canvas Test mode)
 * instead of each growing a second, subtly different copy.
 *
 * Constructor injection only: the controller is handed the instance's
 * `PlaygroundStore`, `PlaygroundService`, `ApiContext` and `WorkflowStore`.
 * It never reads Svelte context (`getContext` throws outside component
 * initialisation); whoever configures it supplies a messages getter instead.
 *
 * @module stores/runController
 */

import type { Workflow } from '../types/index.js';
import type {
  PlaygroundMessageRequest,
  PlaygroundMessagesApiResponse,
  PlaygroundSessionStatus
} from '../types/playground.js';
import type { PlaygroundStore } from './playgroundStore.svelte.js';
import type { WorkflowStore } from './workflowStore.svelte.js';
import type { ApiContext } from './apiContext.js';
import type { PlaygroundService } from '../services/playgroundService.js';
import { nodeExecutionService } from '../services/nodeExecutionService.js';
import { pipelineSignalService } from '../services/pipelineSignalService.js';
import { workflowLaunchService, type LaunchResult } from '../services/workflowLaunchService.js';
import type { CommandHandlers } from '../playground/commands/dispatch.js';
import { describeLaunchResult, type CommandOutcome } from '../playground/commands/index.js';
import { resolveRunAction } from '../playground/runAction.js';
import { defaultMessages } from '../messages/defaults.js';
import type { Messages } from '../messages/types.js';
import { logger } from '../utils/logger.js';
import type { HostHooks } from '../webmcp/types.js';

/**
 * API base URLs whose server sent a workflow without `playground` (before
 * FlowDrop 2.7.0). Such a server sends none for any workflow, so once one
 * load has said so, a caller that passes the interface needs no further
 * load. Keyed by base URL, not by client: mounting with `endpointConfig`
 * rebuilds the client every time. Lasts for the page; an upgraded server
 * is seen on the next page load.
 */
const serversWithoutPlaygroundSettings = new Set<string>();

/**
 * Where a run stands, as the Edit-mode run bar words it. `waiting` is a run
 * paused for a person (an approval or input); `stopped` is a run someone
 * cancelled.
 */
export type ActiveRunStatus = 'running' | 'waiting' | 'failed' | 'done' | 'stopped';

/** Statuses a run does not leave. */
export const TERMINAL_RUN_STATUSES: readonly ActiveRunStatus[] = ['failed', 'done', 'stopped'];

/**
 * The run the instance is showing: the last one started through `fd.runs`
 * (Console `session run` / `session send`, the Playground) or reported through
 * the host's `onRun` (the Assistant, WebMCP). There is at most one.
 */
export interface ActiveRun {
  /** `session`: a turn or launch in the test session. `host`: started through `host.onRun`. */
  origin: 'session' | 'host';
  /** The pipeline to read node status from; `null` until a session run's pipeline is known. */
  runId: string | null;
  status: ActiveRunStatus;
  startedAt: number;
  /** When the run reached a terminal status (ms epoch), `null` while it is live. */
  endedAt: number | null;
}

interface TrackedRun {
  origin: 'session' | 'host';
  runId: string | null;
  sessionId: string | null;
  startedAt: number;
  stopped: boolean;
  hostStatus: ActiveRunStatus;
}

function sessionRunStatus(status: PlaygroundSessionStatus, stopped: boolean): ActiveRunStatus {
  switch (status) {
    case 'running':
      return 'running';
    case 'awaiting_input':
      return 'waiting';
    case 'failed':
      return 'failed';
    case 'completed':
      return 'done';
    default:
      // idle: the poller's resting state. A stop lands here; so does a run that
      // finished while nobody was looking.
      return stopped ? 'stopped' : 'done';
  }
}

/** A host's run status vocabulary ({@link import('../webmcp/types.js').RunStatus}) in the bar's. */
function hostRunStatus(status: string | undefined): ActiveRunStatus {
  switch (status) {
    case 'paused':
    case 'interrupted':
      return 'waiting';
    case 'completed':
      return 'done';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'stopped';
    default:
      return 'running';
  }
}

/** What a {@link RunController} is built from: the instance's own pieces. */
export interface RunControllerDeps {
  playground: PlaygroundStore;
  service: PlaygroundService;
  api: ApiContext;
  workflow: WorkflowStore;
}

/**
 * Options a surface passes through {@link RunController.configure}. All of
 * them are optional: a surface with no Playground mounted (the editor
 * Console) configures nothing and the controller follows the editor's
 * workflow.
 */
export interface RunControllerOptions {
  /** The workflow whose sessions this controller drives. */
  workflowId?: string;
  /**
   * The caller's live copy of the workflow, when it has one. Used only by
   * {@link RunController.ensureWorkflowInterface}: a key the caller passed is
   * never replaced by the saved one.
   */
  workflow?: Workflow;
  /** Messages per page when loading a session. Default 50. */
  messagePageSize?: number;
  /** Polling interval in milliseconds. Default 1500. */
  pollingInterval?: number;
  /** Overrides when polling stops for a session status. */
  shouldStopPolling?: (status: PlaygroundSessionStatus) => boolean;
  /** Called with a new session's id instead of switching to it in place. */
  onSessionNavigate?: (sessionId: string) => void;
  /** Host-configured opening message for Run. */
  predefinedMessage?: string;
  /**
   * Message getter, read at call time so a locale switch is picked up. Default
   * `() => defaultMessages`. Never resolved from Svelte context here.
   */
  messages?: () => Messages;
}

/**
 * Per-instance run controller, `fd.runs`.
 *
 * This is the controller Test mode builds on: every way of starting, stopping
 * and following a run in an instance goes through it.
 */
export class RunController {
  readonly #playground: PlaygroundStore;
  readonly #service: PlaygroundService;
  readonly #api: ApiContext;
  readonly #workflow: WorkflowStore;

  #options: RunControllerOptions = {};
  // Monotonic token so a slow session load can't overwrite a newer one when
  // the user switches sessions faster than the network responds (last-load
  // wins).
  #loadToken = 0;

  // Same idea as #loadToken, for node status loads.
  #statusToken = 0;
  // requestNodeStatuses(): one load in flight, and whether another was asked for meanwhile.
  #statusLoading = false;
  #statusAgain = false;

  #pendingSignal = $state<{ pipelineId: string; signal: string } | null>(null);

  // The run the instance shows (see ActiveRun). Replaced, never mutated.
  #tracked = $state.raw<TrackedRun | null>(null);
  #endedAt = $state<number | null>(null);
  #unsubscribeSessionStatus: (() => void) | null = null;
  #hostStatusHook: HostHooks['onRunStatus'] | undefined;
  #hostPoll: ReturnType<typeof setTimeout> | null = null;

  /**
   * Milliseconds between status reads of a host run (`onRunStatus`). A public
   * field, like a timeout in a client: tests and slow backends set it.
   */
  hostPollInterval = 2000;
  #isRefreshing = $state(false);

  constructor(deps: RunControllerDeps) {
    this.#playground = deps.playground;
    this.#service = deps.service;
    this.#api = deps.api;
    this.#workflow = deps.workflow;
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  /**
   * Replace the options. Called at init and again whenever the caller's
   * props change; it replaces, it does not merge, so a key left out falls
   * back to its default.
   */
  configure(options: RunControllerOptions): void {
    this.#options = options;
  }

  /**
   * A signal accepted but not yet observed as effective.
   *
   * Backends refuse a second signal on the same pipeline, so we hold this to
   * disable rather than fire a request guaranteed to be rejected. Cleared when
   * the session status changes — see {@link clearPendingSignal}.
   */
  get pendingSignal(): { pipelineId: string; signal: string } | null {
    return this.#pendingSignal;
  }

  /** Whether a status refresh is in flight. */
  get isRefreshing(): boolean {
    return this.#isRefreshing;
  }

  /** The instance's playground store, for surfaces that read what a run produced. */
  get playground(): PlaygroundStore {
    return this.#playground;
  }

  /** The instance's workflow store: the editor's workflow and its dirty state. */
  get editor(): WorkflowStore {
    return this.#workflow;
  }

  /** Whether the instance has a backend to talk to. */
  get isConfigured(): boolean {
    return this.#api.isConfigured();
  }

  /** Whether the backend can launch a run without a chat message. */
  get canLaunch(): boolean {
    return workflowLaunchService.isSupported(this.#api.config);
  }

  /** A launch result as feedback text, in the configured messages. */
  describeLaunch(result: LaunchResult): CommandOutcome {
    return describeLaunchResult(result, this.#messages.playground.commands);
  }

  /** The configured messages, falling back to the English defaults. */
  get #messages(): Messages {
    return (this.#options.messages ?? (() => defaultMessages))();
  }

  get #messagePageSize(): number {
    return this.#options.messagePageSize ?? 50;
  }

  /** Whether a surface told us which workflow to drive. */
  get #hasConfiguredWorkflow(): boolean {
    return this.#options.workflowId !== undefined;
  }

  /**
   * The workflow id in effect: the configured one, else the editor's current
   * workflow (the Console has no Playground mounted), else `null` — an
   * unsaved new workflow.
   */
  get workflowId(): string | null {
    return this.#options.workflowId ?? this.#workflow.current?.id ?? null;
  }

  #requireWorkflowId(): string {
    const id = this.workflowId;
    if (!id) throw new Error('Save the workflow first');
    return id;
  }

  // -----------------------------------------------------------------------
  // Editor fallback
  // -----------------------------------------------------------------------

  /**
   * Make the playground store reflect the editor's workflow, for a surface
   * with no Playground mounted. A no-op when a surface configured a workflow
   * id (the Playground sets its own workflow) or the editor has none.
   *
   * The same workflow is re-adopted when the editor holds a newer copy, so a
   * binding edited since the last turn is the one the next turn uses. When the
   * store holds a different workflow, its sessions belong to that one and are
   * dropped, so a turn from the Console never lands in another workflow's
   * session.
   */
  adoptEditorWorkflow(): void {
    if (this.#hasConfiguredWorkflow) return;
    const editorWorkflow = this.#workflow.current;
    if (!editorWorkflow) return;
    const held = this.#playground.currentWorkflow;
    if (held === editorWorkflow) return;

    if (held && held.id !== editorWorkflow.id) {
      this.#service.stopPolling();
      this.#playground.setSessions([]);
      this.#playground.setCurrentSession(null);
      this.#playground.clearMessages();
    }
    this.#playground.setWorkflow(editorWorkflow);
  }

  // -----------------------------------------------------------------------
  // Interface
  // -----------------------------------------------------------------------

  /**
   * Make sure the playground knows the workflow's interface and chat binding.
   *
   * The mode (chat box, form, Run) is read from the workflow's Playground
   * settings, else from its interface's deprecated turn ports. A workflow
   * passed in with both an `interface` and a `playground` key is used as is;
   * when either is missing, the workflow is loaded through the workflows API
   * (`workflows.get`) and only the missing keys are taken from there: a key
   * the caller passed is its live copy (the editor's, unsaved edits and all)
   * and never gives way to the saved one. Any failure
   * leaves the playground in `legacy` mode, which is the behaviour it had
   * before turn ports.
   */
  async ensureWorkflowInterface(): Promise<void> {
    if (!this.#api.config) return;
    const workflow = this.#options.workflow;
    const workflowId = this.#requireWorkflowId();
    const server = this.#api.config.baseUrl;
    if (
      workflow?.interface !== undefined &&
      (workflow.playground !== undefined || serversWithoutPlaygroundSettings.has(server))
    ) {
      return;
    }
    try {
      const loaded = await this.#api.client.loadWorkflow(workflowId);
      if (loaded.playground === undefined) serversWithoutPlaygroundSettings.add(server);
      if (!workflow) {
        if (loaded.interface !== undefined || loaded.playground !== undefined) {
          this.#playground.setWorkflow(loaded);
        }
        return;
      }
      const missingInterface = workflow.interface === undefined && loaded.interface !== undefined;
      const missingPlayground =
        workflow.playground === undefined && loaded.playground !== undefined;
      if (!missingInterface && !missingPlayground) return;
      this.#playground.setWorkflow({
        ...workflow,
        ...(missingInterface && { interface: loaded.interface }),
        ...(missingPlayground && { playground: loaded.playground })
      });
    } catch (err) {
      logger.debug('[Playground] Workflow interface unavailable, keeping legacy input:', err);
    }
  }

  // -----------------------------------------------------------------------
  // Sessions
  // -----------------------------------------------------------------------

  async loadSessions(): Promise<void> {
    this.#playground.setLoading(true);
    this.#playground.setError(null);

    try {
      const sessionList = await this.#service.listSessions(
        this.#api.config,
        this.#requireWorkflowId(),
        undefined,
        this.#api.authProvider
      );
      this.#playground.setSessions(sessionList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions';
      this.#playground.setError(errorMessage);
      logger.error('Failed to load sessions:', err);
    } finally {
      this.#playground.setLoading(false);
    }
  }

  async loadSession(sessionId: string): Promise<void> {
    this.#playground.setLoading(true);
    this.#playground.setError(null);
    const token = ++this.#loadToken;

    try {
      const session = await this.#service.getSession(
        this.#api.config,
        sessionId,
        this.#api.authProvider
      );
      if (token !== this.#loadToken) return; // a newer session load superseded us
      this.#playground.setCurrentSession(session);

      // Load only the most recent page; older messages load on demand when the
      // user scrolls up (loadOlderMessages). Clear right before applying the
      // fresh page — not before the await — so switching sessions doesn't blank
      // the view for the duration of the fetch.
      const response = await this.#service.getMessages(
        this.#api.config,
        sessionId,
        {
          latest: true,
          limit: this.#messagePageSize
        },
        this.#api.authProvider
      );
      if (token !== this.#loadToken) return;
      this.#playground.clearMessages();
      this.#playground.applyServerResponse(response, sessionId);
      this.#playground.setHasOlder(this.deriveHasOlder(response));

      if (session.status !== 'idle') {
        // Seed polling from the newest loaded message so it tails live updates
        // instead of crawling forward from the start of the conversation.
        this.startPolling(sessionId, true);
      }
    } catch (err) {
      if (token !== this.#loadToken) return; // don't surface a superseded load's error
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
      this.#playground.setError(errorMessage);
      logger.error('Failed to load session:', err);
    } finally {
      if (token === this.#loadToken) this.#playground.setLoading(false);
    }
  }

  /**
   * Load the page of messages immediately older than the oldest one currently
   * shown. Triggered by scroll-up in MessageStream, which serializes calls and
   * owns the in-flight/anchoring state. Bypasses applyServerResponse so a
   * historical fetch never disturbs the live polling cursor or pipeline view.
   */
  async loadOlderMessages(): Promise<void> {
    const sessionId = this.#playground.currentSession?.id;
    const before = this.#playground.oldestSequenceNumber;
    if (!sessionId || before === null) return;

    try {
      const response = await this.#service.getMessages(
        this.#api.config,
        sessionId,
        {
          before,
          limit: this.#messagePageSize
        },
        this.#api.authProvider
      );
      // The session may have changed while the fetch was in flight — don't
      // splice an old session's page into the new session's store.
      if (this.#playground.currentSession?.id !== sessionId) return;
      if (response.data && response.data.length > 0) {
        this.#playground.addMessages(response.data);
      }
      this.#playground.setHasOlder(this.deriveHasOlder(response));
    } catch (err) {
      logger.error('[Playground] Failed to load older messages:', err);
    }
  }

  /**
   * Whether older messages remain after a backward-pagination response. Prefer
   * the server's explicit `hasOlder` flag; fall back to inferring from page
   * fullness for backends that haven't adopted the field yet.
   */
  deriveHasOlder(response: PlaygroundMessagesApiResponse): boolean {
    if (typeof response.hasOlder === 'boolean') return response.hasOlder;
    return (response.data?.length ?? 0) >= this.#messagePageSize;
  }

  async createSession(): Promise<void> {
    this.#playground.setLoading(true);
    this.#playground.setError(null);

    try {
      const sessionName = `Session ${this.#playground.sessions.length + 1}`;
      const session = await this.#service.createSession(
        this.#api.config,
        this.#requireWorkflowId(),
        sessionName,
        undefined,
        this.#api.authProvider
      );

      // Stop polling the previous (possibly running) session before switching,
      // mirroring selectSession. Otherwise its next poll keeps the old
      // 'running' status alive and the new session's chat input stays disabled.
      this.#service.stopPolling();

      if (this.#options.onSessionNavigate) {
        this.#options.onSessionNavigate(session.id);
        return;
      }

      this.#playground.addSession(session);
      this.#playground.setCurrentSession(session);
      this.#playground.clearMessages();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      this.#playground.setError(errorMessage);
      logger.error('Failed to create session:', err);
    } finally {
      this.#playground.setLoading(false);
    }
  }

  async selectSession(sessionId: string): Promise<void> {
    this.#playground.pinExecution(null);
    const currentSessionId = this.#playground.currentSession?.id;
    if (currentSessionId === sessionId) return;

    this.#service.stopPolling();
    this.#playground.updateSessionStatus('idle');
    await this.loadSession(sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.#service.deleteSession(this.#api.config, sessionId, this.#api.authProvider);
      this.#playground.removeSession(sessionId);

      if (this.#playground.currentSession?.id === sessionId) {
        this.#service.stopPolling();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      this.#playground.setError(errorMessage);
      logger.error('Failed to delete session:', err);
    }
  }

  /**
   * Reset a stuck session to idle.
   *
   * Mirrors stopExecution: tear down polling and force the local status
   * back to idle even on failure, since the point of reset is to escape a state
   * the client and server disagree about.
   */
  async resetSession(): Promise<void> {
    const sessionId = this.#playground.currentSession?.id;
    if (!sessionId) return;

    try {
      await this.#service.resetSession(this.#api.config, sessionId, this.#api.authProvider);
      this.#service.stopPolling();
      this.#playground.updateSessionStatus('idle');
      this.#playground.setError(null);
    } catch (err) {
      this.#service.stopPolling();
      this.#playground.updateSessionStatus('idle');
      logger.error('Failed to reset session:', err);
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Runs and turns
  // -----------------------------------------------------------------------

  /**
   * Launch a run with named inputs and no chat message.
   *
   * Creates a session first when there is none, so the run has a conversation
   * to report into — the launch endpoint accepts a session id precisely so its
   * messages land somewhere the user is looking.
   */
  async launchWorkflow(inputs: Record<string, string>): Promise<LaunchResult> {
    this.adoptEditorWorkflow();
    if (!this.#playground.currentSession) {
      await this.createSession();
    }

    const sessionId = this.#playground.currentSession?.id;

    const result = await workflowLaunchService.launch(
      this.#api.config,
      this.#requireWorkflowId(),
      { inputs, sessionId },
      this.#api.authProvider
    );

    if (result.status === 'launched' && sessionId) {
      // Mirror a turn: reflect the run optimistically and tail it.
      this.#playground.updateSessionStatus('running');
      this.#playground.pinExecution(null);
      this.#playground.setError(null);
      if (!this.#service.isPolling()) {
        this.startPolling(sessionId, true);
      }
      this.#beginSessionRun(sessionId);
    }

    return result;
  }

  /**
   * Start a run from a button or auto-run, without posting a chat message.
   *
   * Falls back to sending `predefinedMessage` only where the backend has no
   * launch verb — there a message is genuinely the only way to start a run, so
   * the fabricated turn is the lesser evil. Everywhere else this is what stops
   * "Run workflow" appearing in the conversation as though a user typed it.
   *
   * @returns Feedback for a refused launch, for the caller to show; `null`
   *   when nothing needs reporting.
   */
  async startRun(): Promise<CommandOutcome | null> {
    this.adoptEditorWorkflow();
    const inputMode = this.#playground.inputMode;

    // A workflow that declares turn ports but no message port runs as a turn
    // on its inputs: no fabricated message, which its server would refuse.
    if (inputMode === 'form' || inputMode === 'run') {
      await this.takeTurn({});
      return null;
    }

    const action = resolveRunAction({
      canLaunch: workflowLaunchService.isSupported(this.#api.config),
      predefinedMessage: this.#options.predefinedMessage,
      defaultMessage: this.#messages.playground.chat.predefinedRun
    });

    if (action.kind === 'message') {
      logger.debug('[Playground] Starting run by message:', action.content);
      await this.sendMessage(action.content);
      return null;
    }

    const result = await this.launchWorkflow({});

    // Only failures need reporting: a successful launch is evident from the run
    // itself appearing in the console.
    if (result.status !== 'launched') {
      // A refused launch never sends the `enableRun` message that would
      // otherwise bring Run back.
      this.#playground.releaseRunLock();
      return this.describeLaunch(result);
    }
    return null;
  }

  /**
   * Send a chat message as a turn. Slash commands are not handled here; the
   * Playground intercepts them before calling this.
   */
  sendMessage(content: string): Promise<boolean> {
    return this.takeTurn({ content });
  }

  /**
   * Send an operator signal to a specific pipeline.
   *
   * Records the signal as pending on acceptance so a second one is refused
   * client-side rather than by the backend.
   */
  async sendSignal(signal: 'pause' | 'resume' | 'cancel', pipelineId: string, reason?: string) {
    const result = await pipelineSignalService[signal](
      this.#api.config,
      pipelineId,
      { reason },
      this.#api.authProvider
    );

    if (result.status === 'accepted') {
      this.#pendingSignal = { pipelineId, signal };
    }

    return result;
  }

  /**
   * Clear a pending signal once the session status moves.
   *
   * The status transition is the observable consequence of the signal landing
   * — or of the run ending by itself, which equally means the signal is moot.
   */
  clearPendingSignal(): void {
    if (this.#pendingSignal) this.#pendingSignal = null;
  }

  /**
   * Take one turn: post the request to the session's turn door and tail the
   * session. The interface form's values ride along as `inputs` (none in
   * legacy mode). A refusal (a 400 naming the fix, a 409, …) is shown with the
   * server's own message and leaves the session idle.
   *
   * @returns Whether the turn was accepted
   */
  async takeTurn(request: PlaygroundMessageRequest): Promise<boolean> {
    const playground = this.#playground;
    this.adoptEditorWorkflow();

    // Not `canRun`: a Run click has already taken the run lock by now.
    if (playground.isExecuting || playground.turnPending) {
      playground.releaseRunLock();
      return false;
    }
    playground.setTurnPending(true);

    try {
      // In legacy mode there are no interface form entries, so `inputs` is
      // `{}` — exactly what the legacy door was always sent.
      const turnInputs = playground.turnInputs;
      if (!turnInputs.ok) {
        playground.setError(
          this.#messages.playground.inputForm.missingRequired({
            names: turnInputs.missing.map((entry) => entry.name ?? entry.id).join(', ')
          })
        );
        playground.releaseRunLock();
        return false;
      }
      const body: PlaygroundMessageRequest = { ...request, inputs: turnInputs.inputs };

      if (!playground.currentSession) {
        await this.createSession();
      }
      const sessionId = playground.currentSession?.id;
      if (!sessionId) {
        playground.releaseRunLock();
        return false;
      }

      playground.updateSessionStatus('running');
      playground.pinExecution(null);
      playground.setError(null);

      try {
        const response = await this.#service.sendTurn(
          this.#api.config,
          sessionId,
          body,
          this.#api.authProvider
        );
        // The legacy door answers with the user's row; the turn door with a
        // turn result, and the row arrives with the poll started below.
        if (response.kind === 'turn') {
          playground.setLastTurn(response.result);
        } else {
          playground.addMessage(response.message);
          playground.setLastTurn(null);
        }
        // Only start polling if not already active — avoids resetting the cursor
        // mid-session and re-fetching messages that are already in the store.
        // Seed from the newest loaded message so polling tails live updates
        // rather than crawling forward from the start of the conversation.
        if (!this.#service.isPolling()) {
          this.startPolling(sessionId, true);
        }
        this.#beginSessionRun(sessionId);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        playground.setError(errorMessage);
        playground.updateSessionStatus('idle');
        playground.releaseRunLock();
        logger.error('Failed to send message:', err);
        return false;
      }
    } finally {
      playground.setTurnPending(false);
    }
  }

  async stopExecution(): Promise<void> {
    const sessionId = this.#playground.currentSession?.id;
    if (!sessionId) return;

    // Whoever stops (the bar, the Playground, `session stop`), the run reads
    // as stopped, not as done, once the session goes idle.
    const tracked = this.#tracked;
    if (tracked?.origin === 'session' && tracked.sessionId === sessionId) {
      this.#tracked = { ...tracked, stopped: true };
    }

    try {
      await this.#service.stopExecution(this.#api.config, sessionId, this.#api.authProvider);
      this.#service.stopPolling();
      this.#playground.updateSessionStatus('idle');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop execution';
      this.#playground.setError(errorMessage);
      this.#service.stopPolling();
      this.#playground.updateSessionStatus('idle');
      logger.error('Failed to stop execution:', err);
    }
  }

  // -----------------------------------------------------------------------
  // Following a run
  // -----------------------------------------------------------------------

  startPolling(
    sessionId: string,
    seedSequence = false,
    overrideShouldStopPolling?: (status: PlaygroundSessionStatus) => boolean
  ): void {
    const pollingInterval = this.#options.pollingInterval ?? 1500;
    const initialSequenceNumber = seedSequence ? this.#playground.latestSequenceNumber : null;

    this.#service.startPolling(
      this.#api.config,
      sessionId,
      (response) => this.#playground.applyServerResponse(response, sessionId),
      pollingInterval,
      overrideShouldStopPolling ?? this.#options.shouldStopPolling,
      initialSequenceNumber,
      this.#api.authProvider
    );
  }

  /** Stop this instance's poller. */
  stopPolling(): void {
    this.#service.stopPolling();
  }

  /**
   * Load one run's per-node status into `fd.playground` (`nodeStatuses`).
   *
   * The node status overlay draws from that store, so the result survives
   * edits to the graph. Without arguments it follows the session's active run
   * and the editor's workflow. A newer call, or {@link clearNodeStatuses},
   * discards the result of one still in flight. Without a run or a saved
   * workflow it clears instead.
   */
  async loadNodeStatuses(pipelineId?: string | null, workflow?: Workflow | null): Promise<void> {
    const runId = pipelineId ?? this.#playground.activeExecutionId;
    const target = workflow ?? this.#workflow.current;
    const token = ++this.#statusToken;
    if (!runId || !target?.id) {
      this.#playground.clearNodeStatuses();
      return;
    }
    try {
      const statuses = await nodeExecutionService.getMultipleNodeExecutionInfo(
        this.#api.config,
        target.nodes.map((node) => node.id),
        runId
      );
      if (token !== this.#statusToken) return;
      this.#playground.setNodeStatuses(statuses, { workflowId: target.id, pipelineId: runId });
    } catch (error) {
      if (token === this.#statusToken) {
        logger.error('Failed to load node execution info:', error);
      }
    }
  }

  /**
   * Ask for the shown run's node statuses to be (re)loaded, for a caller that
   * asks on every poll tick: one load runs at a time, and any number of asks
   * made while it runs coalesce into one more load afterwards. The request
   * rate therefore follows the network, not the poll interval, and the last
   * state is always the one loaded.
   */
  requestNodeStatuses(): void {
    if (this.#statusLoading) {
      this.#statusAgain = true;
      return;
    }
    this.#statusLoading = true;
    void (async () => {
      try {
        do {
          this.#statusAgain = false;
          await this.loadNodeStatuses();
        } while (this.#statusAgain);
      } finally {
        this.#statusLoading = false;
      }
    })();
  }

  /** Drop the node statuses and any load still in flight. */
  clearNodeStatuses(): void {
    this.#statusToken++;
    this.#statusAgain = false;
    this.#playground.clearNodeStatuses();
  }

  /**
   * Whether the current session has a run that is going or waiting for
   * someone (running, or awaiting input). The one fact "a run needs
   * watching" is read from here: the dot on the Test switch, and the
   * badges that follow a run in Edit mode.
   */
  get isLive(): boolean {
    const status = this.#playground.sessionStatus;
    return status === 'running' || status === 'awaiting_input';
  }

  /** Fetch what is new for the current session and tail it when it is running. */
  async refresh(): Promise<void> {
    const sessionId = this.#playground.currentSession?.id;
    if (!sessionId || this.#isRefreshing) return;
    this.#isRefreshing = true;
    try {
      const response = await this.#service.getMessages(
        this.#api.config,
        sessionId,
        {
          since: this.#service.getLastSequenceNumber() ?? undefined
        },
        this.#api.authProvider
      );
      this.#playground.applyServerResponse(response, sessionId);
      if (response.sessionStatus === 'running' && !this.#service.isPolling()) {
        this.startPolling(sessionId, true);
      }
    } catch (err) {
      logger.error('[Playground] Status refresh failed:', err);
    } finally {
      this.#isRefreshing = false;
    }
  }

  /**
   * Catch up immediately rather than waiting for the next poll interval, using
   * the service's sequence cursor so only new messages are fetched. Shared by
   * the interrupt-resolved handler (which also restarts polling, as
   * `restartPolling`) and the tab-visible catch-up (which only fetches).
   */
  async catchUp(options: { restartPolling?: boolean } = {}): Promise<void> {
    const sessionId = this.#playground.currentSession?.id;
    if (!sessionId) return;

    try {
      const response = await this.#service.getMessages(
        this.#api.config,
        sessionId,
        {
          since: this.#service.getLastSequenceNumber() ?? undefined
        },
        this.#api.authProvider
      );
      this.#playground.applyServerResponse(response, sessionId);
    } catch (err) {
      logger.error(
        options.restartPolling
          ? '[Playground] Failed to refresh after interrupt:'
          : '[Playground] Visibility catchup failed:',
        err
      );
    }

    // Polling continues through awaiting_input now, but restart defensively
    // in case it stopped for any reason (e.g. component re-mount).
    if (options.restartPolling && !this.#service.isPolling()) {
      this.startPolling(sessionId, true);
    }
  }

  /** Whether this instance's service is polling a session. */
  get isPolling(): boolean {
    return this.#service.isPolling();
  }

  // -----------------------------------------------------------------------
  // The run being shown
  // -----------------------------------------------------------------------

  /**
   * The run the instance is showing, or `null`. Reactive. A session run's
   * status follows the session; a host run's follows `onRunStatus`.
   */
  get activeRun(): ActiveRun | null {
    const tracked = this.#tracked;
    if (!tracked) return null;
    let status: ActiveRunStatus;
    let runId = tracked.runId;
    if (tracked.origin === 'session') {
      // Another conversation took over: that run is not the one we followed.
      if (this.#playground.currentSession?.id !== tracked.sessionId) return null;
      status = sessionRunStatus(this.#playground.sessionStatus, tracked.stopped);
      runId = this.#playground.activeExecutionId;
    } else {
      status = tracked.hostStatus;
    }
    return {
      origin: tracked.origin,
      runId,
      status,
      startedAt: tracked.startedAt,
      endedAt: TERMINAL_RUN_STATUSES.includes(status) ? (this.#endedAt ?? Date.now()) : null
    };
  }

  /**
   * Stop the run being shown: the session's stop for a session run, a cancel
   * signal on the pipeline for a host run (the next status read reports it).
   */
  async stopRun(): Promise<void> {
    const tracked = this.#tracked;
    if (!tracked) return;
    if (tracked.origin === 'session') {
      await this.stopExecution();
      return;
    }
    if (!tracked.runId) return;
    const result = await this.sendSignal('cancel', tracked.runId);
    if (result.status === 'accepted') this.#scheduleHostPoll(tracked.runId, 0);
  }

  /**
   * Forget the shown run and its node statuses. The run bar calls it when it
   * fades; the statuses go with it so the Edit canvas is back to normal.
   */
  dismissRun(): void {
    this.#clearHostPoll();
    this.#tracked = null;
    this.#endedAt = null;
    this.clearNodeStatuses();
  }

  /**
   * The host's `onRun` / `onRunStatus` routed through this controller: runs
   * they start become the shown run, and the status they report moves it.
   * Hands back hooks that behave exactly as the given ones (same arguments,
   * same envelopes, same rejections); use them wherever the originals went.
   * A run is followed only when the host also supplies `onRunStatus`: without
   * it there is no way to know the run ended.
   */
  wrapHostHooks(hooks: HostHooks): HostHooks {
    const { onRun, onRunStatus } = hooks;
    const out: HostHooks = { ...hooks };
    if (onRunStatus) {
      this.#hostStatusHook = onRunStatus;
      out.onRunStatus = async (runId) => {
        const envelope = await onRunStatus(runId);
        this.#applyHostStatus(runId, envelope.ok ? envelope.data?.status : undefined);
        return envelope;
      };
    }
    if (onRun) {
      out.onRun = async (inputs) => {
        const envelope = await onRun(inputs);
        if (envelope.ok && envelope.data?.runId) {
          this.#beginHostRun(envelope.data.runId, envelope.data.status);
        }
        return envelope;
      };
    }
    return out;
  }

  /** Stop the timers and subscriptions this controller started. */
  dispose(): void {
    this.#clearHostPoll();
    this.#unsubscribeSessionStatus?.();
    this.#unsubscribeSessionStatus = null;
  }

  #beginSessionRun(sessionId: string): void {
    this.#clearHostPoll();
    this.#tracked = {
      origin: 'session',
      runId: null,
      sessionId,
      startedAt: Date.now(),
      stopped: false,
      hostStatus: 'running'
    };
    this.#endedAt = null;
    // The moment a run ends is the one thing the session status cannot say on
    // its own; note it as the status moves.
    this.#unsubscribeSessionStatus ??= this.#playground.subscribeToSessionStatus((status) => {
      const tracked = this.#tracked;
      if (tracked?.origin !== 'session') return;
      const next = sessionRunStatus(status, tracked.stopped);
      this.#endedAt = TERMINAL_RUN_STATUSES.includes(next) ? Date.now() : null;
    });
  }

  #beginHostRun(runId: string, status: string | undefined): void {
    if (!this.#hostStatusHook) return;
    const hostStatus = hostRunStatus(status);
    this.#clearHostPoll();
    this.#tracked = {
      origin: 'host',
      runId,
      sessionId: null,
      startedAt: Date.now(),
      stopped: false,
      hostStatus
    };
    this.#endedAt = TERMINAL_RUN_STATUSES.includes(hostStatus) ? Date.now() : null;
    if (!TERMINAL_RUN_STATUSES.includes(hostStatus)) {
      this.#scheduleHostPoll(runId, this.hostPollInterval);
    }
  }

  #applyHostStatus(runId: string, status: string | undefined): void {
    const tracked = this.#tracked;
    if (tracked?.origin !== 'host' || tracked.runId !== runId || status === undefined) return;
    const next = hostRunStatus(status);
    if (next === tracked.hostStatus) return;
    this.#tracked = { ...tracked, hostStatus: next };
    if (TERMINAL_RUN_STATUSES.includes(next)) {
      this.#endedAt = Date.now();
      this.#clearHostPoll();
    } else {
      this.#endedAt = null;
    }
  }

  #scheduleHostPoll(runId: string, delay: number): void {
    this.#clearHostPoll();
    this.#hostPoll = setTimeout(() => {
      this.#hostPoll = null;
      void this.#pollHost(runId);
    }, delay);
  }

  async #pollHost(runId: string): Promise<void> {
    const hook = this.#hostStatusHook;
    const tracked = this.#tracked;
    if (!hook || tracked?.origin !== 'host' || tracked.runId !== runId) return;
    try {
      const envelope = await hook(runId);
      this.#applyHostStatus(runId, envelope.ok ? envelope.data?.status : undefined);
    } catch (err) {
      logger.error('Failed to read host run status:', err);
    }
    const now = this.#tracked;
    if (
      now?.origin === 'host' &&
      now.runId === runId &&
      !TERMINAL_RUN_STATUSES.includes(now.hostStatus)
    ) {
      this.#scheduleHostPoll(runId, this.hostPollInterval);
    }
  }

  #clearHostPoll(): void {
    if (this.#hostPoll !== null) clearTimeout(this.#hostPoll);
    this.#hostPoll = null;
  }

  // -----------------------------------------------------------------------
  // Slash-command adapter
  // -----------------------------------------------------------------------

  /** The adapter for `playground/commands/dispatch.ts`. */
  commandHandlers(): CommandHandlers {
    return {
      createSession: () => this.createSession(),
      deleteSession: (sessionId) => this.deleteSession(sessionId),
      stopExecution: () => this.stopExecution(),
      resetSession: () => this.resetSession(),
      sendSignal: (signal, pipelineId, reason) => this.sendSignal(signal, pipelineId, reason),
      launchWorkflow: (inputs) => this.launchWorkflow(inputs)
    };
  }
}
