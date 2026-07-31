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
