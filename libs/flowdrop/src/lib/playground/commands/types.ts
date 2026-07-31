/**
 * Playground Slash Command Types
 *
 * The composer's out-of-band control lane. A leading `/` routes input to the
 * control plane instead of the pipeline, so plain text stops meaning exactly
 * one thing ("launch a run with this as input").
 *
 * Deliberately separate from `$lib/commands` (the workflow-editing DSL): that
 * grammar is bare-verb, synchronous, and targets the workflow store, while this
 * one is slash-prefixed, asynchronous, and targets session/pipeline services.
 * Sharing a union would force each executor to handle commands it cannot run.
 *
 * @module playground/commands/types
 */

import type { EndpointConfig } from '../../config/endpoints.js';

/**
 * Every member maps onto a door the backend already exposes; none invents
 * behaviour. Adding a member here without a corresponding endpoint would break
 * the rule that the client never mints a command the backend cannot honour.
 *
 * Two groups, deliberately distinguished:
 *
 * - **Session shell** (`new`, `delete`, `stop`, `reset`, `help`) — act on the
 *   session, which is a client-side conversation container.
 * - **Pipeline signals** (`pause`, `resume`, `cancel`) — act on a *specific
 *   running pipeline*, and therefore need a resolved target.
 */
export type SlashCommandName =
  | 'stop'
  | 'reset'
  | 'new'
  | 'delete'
  | 'help'
  | 'run'
  | 'pause'
  | 'resume'
  | 'cancel';

/** A successfully parsed command. */
export interface SlashCommand {
  /** Canonical, lower-cased command name. */
  name: SlashCommandName;
  /** Positional arguments, whitespace-separated, in source order. */
  args: string[];
  /** The raw input the command was parsed from, for logging and echo. */
  raw: string;
}

/**
 * Outcome of parsing composer input.
 *
 * `message` covers plain text *and* escaped input (`//foo` → `/foo`), so the
 * caller never has to re-apply the escape rule.
 */
export type ParseResult =
  | { kind: 'empty' }
  | { kind: 'message'; content: string }
  | { kind: 'command'; command: SlashCommand }
  | { kind: 'unknown'; name: string; suggestions: SlashCommandName[] };

/**
 * Human-readable text for one command.
 *
 * Kept out of {@link SlashCommandDescriptor} and sourced from the messages
 * module instead: every other user-facing string in the playground is
 * overridable for translation, and the palette and `/help` should not be the
 * two surfaces stuck in English.
 */
export interface CommandLabel {
  /** Short help text. Rendered by `/help` and as palette detail. */
  summary: string;
  /** Usage line, e.g. `/pause [reason]`. Rendered as the palette label. */
  usage: string;
}

/** Labels for every command, keyed by name. See `m().playground.commands.catalog`. */
export type CommandLabels = Record<SlashCommandName, CommandLabel>;

/**
 * Structural description of a command: what it is, not what it says.
 *
 * Carries only what logic branches on. Display text lives in
 * {@link CommandLabels} so it can be translated without the registry — and so
 * nothing has to infer behaviour by pattern-matching a display string.
 */
export interface SlashCommandDescriptor {
  name: SlashCommandName;
  /**
   * Whether the command accepts arguments.
   *
   * Drives the trailing space on an accepted completion, so the caret lands
   * where the argument goes. Declared rather than sniffed out of the usage
   * line: usage text is prose, and prose gets translated.
   */
  takesArgs: boolean;
  /**
   * Whether this command can run against the given endpoint configuration.
   *
   * This is the genericity contract: a command is offered only when the
   * backend it needs is configured. A host pointing FlowDrop at a backend
   * without session reset gets no `/reset`, rather than a command that 404s.
   *
   * Commands needing no backend (`/help`) return true unconditionally.
   */
  isAvailable: (config: EndpointConfig | null) => boolean;
}

/** Result of dispatching a command. Rendered as transient composer feedback. */
export type CommandOutcome =
  | { status: 'ok'; message?: string }
  | { status: 'info'; message: string }
  | { status: 'error'; message: string };
