/**
 * Run Action Resolution
 *
 * Decides what pressing Run should actually do.
 *
 * Starting a run by posting a chat message fabricates a user turn: the text
 * enters the conversation, is fed to the chat input as though typed, and is
 * replayed as history on the following turn — indistinguishable downstream from
 * something a person wrote. Launching avoids all of that.
 *
 * But a message is still the correct action twice over:
 *
 * 1. **The host asked for one.** An explicitly configured `predefinedMessage`
 *    is a deliberate choice to open the run with a specific turn, and honouring
 *    it keeps that configuration meaningful.
 * 2. **Nothing else is possible.** Against a backend with no launch verb, a
 *    message is the only way to start a run at all, so the fabricated turn is
 *    the lesser evil.
 *
 * Both callers — the Run button and auto-run — route through here so the rule
 * is stated once instead of drifting between them.
 *
 * @module playground/runAction
 */

import { isCommandInput } from './commands/index.js';

/** What Run should do in the current configuration. */
export type RunAction =
  /** Start a run with no inputs and no chat message. */
  | { kind: 'launch' }
  /** Post this message, which starts a run as a side effect. */
  | { kind: 'message'; content: string };

export interface ResolveRunActionOptions {
  /** Whether launching is possible — a handler is wired and the backend supports it. */
  canLaunch: boolean;
  /**
   * Host-configured opening message. Its *presence* is the signal, so an
   * explicit empty string still counts as "the host wants a message".
   */
  predefinedMessage?: string;
  /** Message used when falling back without a configured one. */
  defaultMessage: string;
}

/** Resolve what Run should do. Pure; see the module docblock for the rules. */
export function resolveRunAction({
  canLaunch,
  predefinedMessage,
  defaultMessage
}: ResolveRunActionOptions): RunAction {
  if (canLaunch && predefinedMessage === undefined) {
    return { kind: 'launch' };
  }

  return { kind: 'message', content: predefinedMessage ?? defaultMessage };
}

export interface PerformRunOptions {
  /** The playground store's run gate (`fd.playground`). */
  playground: {
    readonly canRun: boolean;
    lockRunUntilEnabled: () => void;
    releaseRunLock: () => void;
  };
  /** `beforeSend` is already running: a second click does nothing. */
  preparing: boolean;
  /**
   * Runs before the run goes out; resolves `false` to hold it back. Absent
   * means nothing to do first. `setPreparing` brackets it for the UI.
   */
  beforeSend?: () => Promise<boolean>;
  setPreparing: (preparing: boolean) => void;
  /** Lock Run until the backend posts `enableRun` (the original protocol). */
  awaitEnableRun: boolean;
  /** Start a run without a chat turn; absent means a message is the only way. */
  onRunWorkflow?: () => void;
  onSendMessage?: (content: string) => void;
  predefinedMessage?: string;
  defaultMessage: string;
}

/**
 * The Run button's whole behaviour, shared by the composer's run-only Run
 * (ChatInput) and the form-first inputs card (ControlPanel): the gate, the
 * save-first hook, the run lock, then launch or message per {@link resolveRunAction}.
 */
export async function performRun({
  playground,
  preparing,
  beforeSend,
  setPreparing,
  awaitEnableRun,
  onRunWorkflow,
  onSendMessage,
  predefinedMessage,
  defaultMessage
}: PerformRunOptions): Promise<void> {
  if (!playground.canRun || preparing) return;
  if (beforeSend) {
    setPreparing(true);
    let proceed: boolean;
    try {
      proceed = await beforeSend();
    } finally {
      setPreparing(false);
    }
    if (!proceed || !playground.canRun) return;
  }
  if (awaitEnableRun) playground.lockRunUntilEnabled();

  const action = resolveRunAction({
    canLaunch: onRunWorkflow != null,
    predefinedMessage,
    defaultMessage
  });

  if (action.kind === 'launch') {
    onRunWorkflow?.();
    return;
  }

  onSendMessage?.(action.content);

  // A slash command (a `predefinedMessage` of `/help`, say) runs without
  // taking a turn, so no `enableRun` message will ever follow to free the lock.
  if (awaitEnableRun && isCommandInput(action.content)) playground.releaseRunLock();
}
