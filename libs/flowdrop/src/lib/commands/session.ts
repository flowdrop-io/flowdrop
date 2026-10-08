/**
 * Session Commands (editor Console only)
 *
 * `session send | run | stop | new | status`: drive the editor's test session
 * from the Command Console.
 *
 * These are deliberately NOT part of the `Command` union or `executeCommand`.
 * That executor is synchronous and shared with the AI Assistant and WebMCP;
 * running a workflow is asynchronous, talks to the backend, and is a human's
 * decision in the Console (Assistant test turns are a separate, gated step).
 * So the Console routes `session` lines here, to their own parser and an
 * async executor over the instance's {@link RunController}.
 *
 * @module commands/session
 */

import type { CommandResult } from './types.js';
import type { RunController } from '../stores/runController.svelte.js';
import { countTripleQuotes } from './parser.js';
import { isPlaygroundChatSet } from '../utils/playgroundChat.js';

// ============================================================================
// Types
// ============================================================================

/** A parsed `session` command. */
export type SessionCommand =
  | { type: 'session_send'; content: string }
  | { type: 'session_run'; inputs: Record<string, string> }
  | { type: 'session_stop' }
  | { type: 'session_new' }
  | { type: 'session_status' };

export type SessionParseResult =
  | { ok: true; command: SessionCommand }
  | { ok: false; error: string; input: string };

/** Usage lines for `help session`, in the same shape as `COMMAND_HELP`. */
export const SESSION_HELP: Array<{ name: string; syntax: string; description: string }> = [
  {
    name: 'session send',
    syntax: 'session send "<message>"',
    description:
      'Send a chat turn to the test session (creates one if needed); """…""" for several lines'
  },
  {
    name: 'session run',
    syntax: 'session run [key=value …]',
    description: 'Run the workflow with inputs (values may be quoted: key="a b")'
  },
  { name: 'session stop', syntax: 'session stop', description: 'Stop the running test session' },
  {
    name: 'session new',
    syntax: 'session new',
    description: 'Start a fresh test session and make it current'
  },
  {
    name: 'session status',
    syntax: 'session status',
    description: 'Show the session, its status and the latest reply'
  }
];

const USAGE = 'Usage: session send "<message>" | run [key=value …] | stop | new | status';

// ============================================================================
// Parser
// ============================================================================

/** Whether a line belongs to the session lane: its first word is `session`. */
export function isSessionLine(input: string): boolean {
  return /^session(\s|$)/i.test(input.trim());
}

/** Unescape `\"` inside a double-quoted value. */
function unquote(raw: string): string {
  return raw.slice(1, -1).replace(/\\(["\\])/g, '$1');
}

/**
 * Parse `key=value` pairs. A value is a bare word or a double-quoted string
 * (`key="a b"`, with `\"` for a quote). Returns the first stray token as an
 * error.
 */
function parseInputs(rest: string): { ok: true; inputs: Record<string, string> } | { ok: false } {
  const inputs: Record<string, string> = {};
  const pair = /\s*([^\s=]+)=("(?:[^"\\]|\\.)*"|\S*)/y;
  let index = 0;
  const text = rest.trim();
  while (index < text.length) {
    pair.lastIndex = index;
    const match = pair.exec(text);
    if (!match) return { ok: false };
    const [whole, key, value] = match;
    inputs[key] = value.startsWith('"') && value.length >= 2 ? unquote(value) : value;
    index += whole.length;
    // A pair must be followed by whitespace or the end: `a="x"y` is malformed.
    if (index < text.length && !/\s/.test(text[index])) return { ok: false };
  }
  return { ok: true, inputs };
}

/**
 * Parse a `session …` line. Verbs are case-insensitive; message text and input
 * values are kept as typed.
 */
export function parseSessionCommand(input: string): SessionParseResult {
  const trimmed = input.trim();
  const fail = (error: string): SessionParseResult => ({ ok: false, error, input });

  if (countTripleQuotes(trimmed) % 2 === 1) {
    return fail('Unclosed """ block — no matching closing """');
  }

  const match = trimmed.match(/^session(?:\s+(\S+))?(?:\s+([\s\S]*))?$/i);
  if (!match) return fail(`Not a session command. ${USAGE}`);

  const sub = match[1]?.toLowerCase();
  const rest = (match[2] ?? '').trim();

  switch (sub) {
    case undefined:
      return fail(USAGE);

    case 'send': {
      if (!rest) return fail('session send needs a message, e.g. session send "hello"');
      const block = rest.match(/^"""([\s\S]*)"""$/);
      if (block) {
        // Same convention as `set`: drop the newline the textarea wrapper adds,
        // and unescape \""" back to """.
        const content = block[1].replace(/^\n|\n$/g, '').replace(/\\"""/g, '"""');
        if (!content.trim()) return fail('session send needs a message');
        return { ok: true, command: { type: 'session_send', content } };
      }
      if (/^"(?:[^"\\]|\\.)*"$/.test(rest)) {
        const content = unquote(rest);
        if (!content.trim()) return fail('session send needs a message');
        return { ok: true, command: { type: 'session_send', content } };
      }
      return { ok: true, command: { type: 'session_send', content: rest } };
    }

    case 'run': {
      const parsed = parseInputs(rest);
      if (!parsed.ok) {
        return fail('session run takes key=value pairs, e.g. session run topic="solar power" n=3');
      }
      return { ok: true, command: { type: 'session_run', inputs: parsed.inputs } };
    }

    case 'stop':
    case 'new':
    case 'status':
      if (rest) return fail(`session ${sub} takes no arguments`);
      return { ok: true, command: { type: `session_${sub}` } as SessionCommand };

    default:
      return fail(`Unknown session command: ${sub}. ${USAGE}`);
  }
}

// ============================================================================
// Executor
// ============================================================================

const failure = (error: string, code: 'SESSION_REFUSED' | 'SESSION_FAILED' | 'NO_WORKFLOW') =>
  ({ ok: false, error, code }) as const;

function describeSession(runs: RunController): string {
  const session = runs.playground.currentSession;
  return session ? `"${session.name}"` : 'the session';
}

/**
 * Checks shared by every command that would touch the backend. Returns an
 * error result, or `null` when it may go ahead.
 */
function preflight(runs: RunController): CommandResult | null {
  if (!runs.workflowId) {
    return failure(
      'Save the workflow first: a test session needs a saved workflow.',
      'NO_WORKFLOW'
    );
  }
  if (!runs.isConfigured) {
    return failure('No backend is configured for this editor.', 'SESSION_REFUSED');
  }
  runs.adoptEditorWorkflow();
  return null;
}

/** An error when a run or turn is already under way (or waiting on a person). */
function busy(runs: RunController): CommandResult | null {
  const { playground } = runs;
  if (playground.isExecuting || playground.turnPending) {
    return failure(
      `${describeSession(runs)} is already running. Wait for it, or stop it with session stop.`,
      'SESSION_REFUSED'
    );
  }
  if (playground.sessionStatus === 'awaiting_input') {
    return failure(
      `${describeSession(runs)} is waiting for input. Answer it in the Playground, or end it with session stop.`,
      'SESSION_REFUSED'
    );
  }
  return null;
}

/** The note appended to a success when the editor holds unsaved changes. */
function dirtyNote(runs: RunController): string {
  return runs.editor.isDirty
    ? ' The workflow has unsaved changes; this uses the last saved version.'
    : '';
}

function acceptedMessage(runs: RunController, what: string): string {
  const { playground } = runs;
  const session = playground.currentSession;
  return `${what} "${session?.name ?? 'session'}" (${playground.sessionStatus}).${dirtyNote(runs)}`;
}

/** Why a turn that was not accepted was not, in the controller's own words. */
function refusal(runs: RunController, fallback: string): CommandResult {
  return failure(runs.playground.error ?? fallback, 'SESSION_FAILED');
}

async function send(content: string, runs: RunController): Promise<CommandResult> {
  const early = preflight(runs);
  if (early) return early;
  const { playground } = runs;

  const mode = playground.inputMode;
  if (mode === 'form' || mode === 'run') {
    return failure(
      'This workflow takes inputs, not chat messages. Use session run key=value … instead.',
      'SESSION_REFUSED'
    );
  }
  const chat = playground.chatBinding;
  if (chat !== null && !isPlaygroundChatSet(chat.binding)) {
    return failure(
      'No chat is set up for this workflow. Choose its message and reply in the Playground settings first.',
      'SESSION_REFUSED'
    );
  }
  const stuck = busy(runs);
  if (stuck) return stuck;

  const turnInputs = playground.turnInputs;
  if (!turnInputs.ok) {
    return failure(missingInputs(turnInputs.missing), 'SESSION_REFUSED');
  }

  const accepted = await runs.takeTurn({ content });
  if (!accepted) return refusal(runs, 'The turn was not accepted.');
  return { ok: true, message: acceptedMessage(runs, 'Turn sent to') };
}

function missingInputs(missing: Array<{ id: string; name?: string }>): string {
  const names = missing.map((entry) => entry.name ?? entry.id).join(', ');
  return `Missing required inputs: ${names}. Pass them as session run key=value …`;
}

async function run(inputs: Record<string, string>, runs: RunController): Promise<CommandResult> {
  const early = preflight(runs);
  if (early) return early;
  const { playground } = runs;

  const stuck = busy(runs);
  if (stuck) return stuck;

  const mode = playground.inputMode;
  if (mode === 'form' || mode === 'run') {
    playground.setFormValues({ ...playground.formValues, ...inputs });
    const turnInputs = playground.turnInputs;
    if (!turnInputs.ok) {
      return failure(missingInputs(turnInputs.missing), 'SESSION_REFUSED');
    }
    const accepted = await runs.takeTurn({});
    if (!accepted) return refusal(runs, 'The run was not accepted.');
    return { ok: true, message: acceptedMessage(runs, 'Run started in') };
  }

  if (!runs.canLaunch) {
    return failure(
      'This backend cannot start a run without a message. Use session send "…" instead.',
      'SESSION_REFUSED'
    );
  }
  const result = await runs.launchWorkflow(inputs);
  if (result.status !== 'launched') {
    return failure(runs.describeLaunch(result).message ?? 'The run was refused.', 'SESSION_FAILED');
  }
  return { ok: true, message: acceptedMessage(runs, 'Run started in') };
}

async function stop(runs: RunController): Promise<CommandResult> {
  const session = runs.playground.currentSession;
  if (!session) {
    return failure('There is no test session to stop.', 'SESSION_REFUSED');
  }
  runs.playground.setError(null);
  await runs.stopExecution();
  // A failed stop leaves the run going; say that rather than "Stopped".
  const error = runs.playground.error;
  if (error) return failure(error, 'SESSION_FAILED');
  return { ok: true, message: `Stopped "${session.name}".` };
}

async function newSession(runs: RunController): Promise<CommandResult> {
  const early = preflight(runs);
  if (early) return early;
  const before = runs.playground.currentSession?.id;
  runs.playground.setError(null);
  await runs.createSession();
  const session = runs.playground.currentSession;
  if (!session || session.id === before) {
    return refusal(runs, 'Could not create a session.');
  }
  return { ok: true, message: `New session "${session.name}" is now current (${session.id}).` };
}

/** The text of the newest reply: an assistant message that is shown. */
function latestReply(runs: RunController): string | null {
  const messages = runs.playground.messages;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant' && message.display !== 'hidden' && message.content) {
      return message.content;
    }
  }
  return null;
}

const REPLY_LIMIT = 500;

function status(runs: RunController): CommandResult {
  if (runs.workflowId && runs.isConfigured) runs.adoptEditorWorkflow();
  const { playground } = runs;
  const session = playground.currentSession;
  if (!session) {
    return {
      ok: true,
      message: 'No test session yet. Start one with session send "…" or session run.'
    };
  }
  const count = playground.messageCount;
  const lines = [
    `Session "${session.name}" (${session.id})`,
    `Status: ${playground.sessionStatus}`,
    `Messages: ${count}`
  ];
  const reply = latestReply(runs);
  if (reply) {
    const shown = reply.length > REPLY_LIMIT ? `${reply.slice(0, REPLY_LIMIT)}…` : reply;
    lines.push(`Latest reply: ${shown}`);
  }
  return { ok: true, message: lines.join('\n') };
}

/**
 * Execute a parsed session command against the instance's run controller.
 *
 * Never throws: a failure is returned as an error result. Success means the
 * backend accepted the turn or run; the reply arrives through the normal
 * polling into the playground store, and `session status` reads it.
 */
export async function executeSessionCommand(
  command: SessionCommand,
  runs: RunController
): Promise<CommandResult> {
  try {
    switch (command.type) {
      case 'session_send':
        return await send(command.content, runs);
      case 'session_run':
        return await run(command.inputs, runs);
      case 'session_stop':
        return await stop(runs);
      case 'session_new':
        return await newSession(runs);
      case 'session_status':
        return status(runs);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return failure(error, 'SESSION_FAILED');
  }
}
