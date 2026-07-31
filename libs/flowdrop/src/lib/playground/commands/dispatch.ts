/**
 * Playground Slash Command Dispatch
 *
 * Maps a parsed command onto the session operations the host already provides.
 *
 * Two invariants live here:
 *
 * 1. **Commands never become session messages.** A `/stop` that posted a user
 *    message would pollute the `history` the backend feeds into the next turn's
 *    chat input — control traffic would come back as conversation. Feedback is
 *    returned to the caller as a {@link CommandOutcome} for transient display.
 * 2. **Availability is checked before dispatch.** An unavailable command
 *    reports that it is unsupported rather than calling an endpoint the host
 *    never configured.
 *
 * @module playground/commands/dispatch
 */

import type { EndpointConfig } from '../../config/endpoints.js';
import type { SignalResult } from '../../services/pipelineSignalService.js';
import type { LaunchResult } from '../../services/workflowLaunchService.js';
import type { CommandLabels, CommandOutcome, SlashCommand } from './types.js';
import { getAvailableCommands, isCommandAvailable, SIGNAL_COMMANDS } from './registry.js';
import { parseArgs } from './args.js';

/**
 * The session operations a command can invoke.
 *
 * Deliberately expressed as callbacks rather than a service import: the host
 * component already owns error handling, polling teardown and store updates for
 * each of these, and duplicating that here would create a second, subtly
 * different code path for the same operations.
 */
export interface CommandHandlers {
  createSession: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  stopExecution: () => Promise<void>;
  resetSession: () => Promise<void>;
  /** Send an operator signal to a specific pipeline. */
  sendSignal: (
    signal: 'pause' | 'resume' | 'cancel',
    pipelineId: string,
    reason?: string
  ) => Promise<SignalResult>;
  /** Launch a run with named inputs and no chat message. */
  launchWorkflow: (inputs: Record<string, string>) => Promise<LaunchResult>;
}

/** Everything dispatch needs to know about the current surface. */
export interface CommandContext {
  config: EndpointConfig | null;
  /** Current session id, or null when none is active. */
  sessionId: string | null;
  /**
   * The pipeline signals should target — the run the user means by "this run".
   *
   * Resolved by the caller from the active run (pinned if the user pinned one,
   * otherwise the latest *main* run). Sub-flow runs must never appear here:
   * pausing what looks like "the run" has to pause the root, not whichever
   * inner iteration happens to be on screen.
   */
  pipelineId: string | null;
  /**
   * A signal already awaiting acknowledgement on {@link pipelineId}, if any.
   *
   * Backends reject a second signal on the same pipeline, so the client
   * disables rather than firing a request that is guaranteed to be refused —
   * a slash command is exactly the frantic-double-submit surface that guard
   * exists for.
   */
  pendingSignal?: { pipelineId: string; signal: string } | null;
  handlers: CommandHandlers;
  /** Message accessors, passed in so this module stays free of Svelte context. */
  messages: CommandMessages;
}

/** The message shapes dispatch needs. Mirrors `m().playground.commands`. */
export interface CommandMessages {
  /** Display text per command, for `/help`. */
  catalog: CommandLabels;
  unavailable: (p: { name: string }) => string;
  needsSession: (p: { name: string }) => string;
  helpHeading: string;
  helpEscapeHint: string;
  stopped: string;
  reset: string;
  created: string;
  deleted: string;
  failed: (p: { name: string; error: string }) => string;
  // -- pipeline signals ----------------------------------------------------
  needsRun: (p: { name: string }) => string;
  signalPending: (p: { signal: string }) => string;
  pauseRequested: string;
  resumeRequested: string;
  cancelRequested: string;
  refusedTerminal: (p: { name: string }) => string;
  refusedDuplicate: string;
  refusedNotPaused: string;
  refusedNotFound: string;
  refusedForbidden: (p: { name: string }) => string;
  refusedOther: (p: { name: string; error: string }) => string;
  // -- launch --------------------------------------------------------------
  runStarted: string;
  runInvalidInput: (p: { error: string }) => string;
  runInvalidWorkflow: (p: { error: string }) => string;
  runInvalidWorkflowDetail: (p: { locator: string; message: string }) => string;
}

/** Commands that cannot do anything useful without an active session. */
const REQUIRES_SESSION = new Set(['stop', 'reset', 'delete']);

/**
 * Execute a parsed command.
 *
 * Never throws: every failure is reported as an `error` outcome so the composer
 * has something to show. Callers render the outcome transiently and discard it.
 */
export async function dispatchCommand(
  command: SlashCommand,
  context: CommandContext
): Promise<CommandOutcome> {
  const { name } = command;
  const { config, sessionId, pipelineId, pendingSignal, handlers, messages } = context;

  if (!isCommandAvailable(name, config)) {
    return { status: 'error', message: messages.unavailable({ name }) };
  }

  if (REQUIRES_SESSION.has(name) && !sessionId) {
    return { status: 'error', message: messages.needsSession({ name }) };
  }

  if (SIGNAL_COMMANDS.has(name)) {
    if (!pipelineId) {
      return { status: 'error', message: messages.needsRun({ name }) };
    }

    if (pendingSignal && pendingSignal.pipelineId === pipelineId) {
      return {
        status: 'error',
        message: messages.signalPending({ signal: pendingSignal.signal })
      };
    }
  }

  try {
    switch (name) {
      case 'help':
        return { status: 'info', message: buildHelp(config, messages) };

      case 'new':
        await handlers.createSession();
        return { status: 'ok', message: messages.created };

      case 'stop':
        await handlers.stopExecution();
        return { status: 'ok', message: messages.stopped };

      case 'reset':
        await handlers.resetSession();
        return { status: 'ok', message: messages.reset };

      case 'delete':
        await handlers.deleteSession(sessionId!);
        return { status: 'ok', message: messages.deleted };

      case 'run': {
        // Named inputs only; loose words are ignored rather than smuggled in as
        // a fake message. `/run` exists precisely to not post one.
        const { inputs } = parseArgs(command.args);
        return describeLaunchResult(await handlers.launchWorkflow(inputs), messages);
      }

      case 'pause':
      case 'resume':
      case 'cancel': {
        const result = await handlers.sendSignal(
          name,
          pipelineId!,
          command.args.join(' ') || undefined
        );
        return describeSignalResult(name, result, messages);
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { status: 'error', message: messages.failed({ name, error }) };
  }
}

/**
 * Turn a signal result into user-facing feedback.
 *
 * Accepted signals report **requested**, never done. Backends observe signals
 * cooperatively — the reference implementation polls between job steps, so the
 * step in flight always finishes first. Rendering "Paused" on acceptance would
 * be a lie precisely when the current step is slow, which is exactly when
 * someone reaches for `/pause`. The status poll flips it to the real state.
 */
function describeSignalResult(
  name: 'pause' | 'resume' | 'cancel',
  result: SignalResult,
  messages: CommandMessages
): CommandOutcome {
  if (result.status === 'unsupported') {
    return { status: 'error', message: messages.unavailable({ name }) };
  }

  if (result.status === 'accepted') {
    const requested = {
      pause: messages.pauseRequested,
      resume: messages.resumeRequested,
      cancel: messages.cancelRequested
    }[name];
    return { status: 'info', message: requested };
  }

  switch (result.reason) {
    case 'terminal':
      return { status: 'error', message: messages.refusedTerminal({ name }) };
    case 'duplicate':
      return { status: 'error', message: messages.refusedDuplicate };
    case 'not-paused':
      return { status: 'error', message: messages.refusedNotPaused };
    case 'not-found':
      return { status: 'error', message: messages.refusedNotFound };
    case 'forbidden':
      return { status: 'error', message: messages.refusedForbidden({ name }) };
    default:
      return {
        status: 'error',
        message: messages.refusedOther({ name, error: result.message })
      };
  }
}

/**
 * Turn a launch result into user-facing feedback.
 *
 * The two failure modes are kept apart deliberately: bad *inputs* are the
 * caller's to fix, while an invalid stored *workflow* is an authoring problem
 * nothing about the command can address. Collapsing them would send users
 * hunting through their arguments for a fault that is in the graph.
 *
 * Exported because the Run button and auto-run launch through the same service
 * and must report identically — a launch failure should not look like one thing
 * from a command and another from a button.
 */
export function describeLaunchResult(
  result: LaunchResult,
  messages: CommandMessages
): CommandOutcome {
  switch (result.status) {
    case 'launched':
      return { status: 'ok', message: messages.runStarted };

    case 'unsupported':
      return { status: 'error', message: messages.unavailable({ name: 'run' }) };

    case 'invalid-input':
      return { status: 'error', message: messages.runInvalidInput({ error: result.message }) };

    case 'invalid-workflow': {
      // Surface the backend's own per-error locators rather than a summary —
      // they name the offending parameter, which is the only actionable part.
      const details = result.errors.map((e) =>
        messages.runInvalidWorkflowDetail({ locator: e.locator ?? '', message: e.message })
      );
      return {
        status: 'error',
        message: [messages.runInvalidWorkflow({ error: result.message }), ...details].join('\n')
      };
    }

    case 'failed':
      return { status: 'error', message: messages.failed({ name: 'run', error: result.message }) };
  }
}

/**
 * Build help text from what is actually available here, not from the full
 * command list — so a backend without session reset never advertises `/reset`.
 */
function buildHelp(config: EndpointConfig | null, messages: CommandMessages): string {
  const lines = getAvailableCommands(config).map(
    (d) => `${messages.catalog[d.name].usage} — ${messages.catalog[d.name].summary}`
  );
  return [messages.helpHeading, ...lines, '', messages.helpEscapeHint].join('\n');
}
