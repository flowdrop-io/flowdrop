/**
 * The editor Console's own commands: `session`, `mode`, `runs`, `save`, `export`.
 *
 * One registry, `{ verb, parse, execute, help }[]`, answers every question the
 * rest of the code asks about these lines: is this a Console line
 * ({@link isConsoleLine}), what does it mean ({@link parseConsoleLine}), run it
 * ({@link executeConsoleCommand}), how do I use it ({@link consoleHelp}).
 *
 * They are deliberately NOT part of the `Command` union or `executeCommand`.
 * That executor is synchronous and shared with the AI Assistant and WebMCP;
 * these commands are asynchronous, reach the backend, or need state only `App`
 * holds (can Test be entered, how to save), and are a person's decision in
 * the Console. Agents have WebMCP tools for the few that make sense for them
 * (`set_editor_mode`, `save`); a Console line given to `runCommand` is refused.
 *
 * `import` has no command on purpose: it replaces the whole workflow from a
 * file, which a typed line cannot supply.
 *
 * Errors use two codes, `CONSOLE_REFUSED` (nothing was attempted: busy, not
 * available, nothing to act on) and `CONSOLE_FAILED` (it reached the backend or
 * the editor and that failed), plus `NO_WORKFLOW`.
 *
 * @module commands/console
 */

import type { CommandResult } from './types.js';
import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import type { RunController } from '../stores/runController.svelte.js';
import { countTripleQuotes } from './parser.js';
import { resolveIdPrefix } from './helpers.js';
import { collectInterfaceInputs } from '../utils/workflowInterface.js';
import { isPlaygroundChatSet } from '../utils/playgroundChat.js';
import { resolveSessionEndpoint } from '../config/endpoints.js';
import { cancelRun, listRuns, rerunRun, runsSupport } from '../services/runsService.js';
import {
  RUNS_MAX_LIMIT,
  canCancelRun,
  canRerunRun,
  formatRunDuration,
  hasMoreRuns,
  runDurationMs,
  type RunSummary
} from '../utils/runsList.js';

// ============================================================================
// Types
// ============================================================================

/** A parsed `session` command. */
export type SessionCommand =
  | { type: 'session_send'; content: string }
  | { type: 'session_run'; inputs: Record<string, string> }
  | { type: 'session_stop' }
  | { type: 'session_new' }
  | { type: 'session_status' }
  | { type: 'session_list' }
  | { type: 'session_select'; id: string }
  | { type: 'session_reset' }
  | { type: 'session_delete'; id: string };

/** The shape of a usage row, the same as `COMMAND_HELP`'s. */
export interface ConsoleHelpRow {
  name: string;
  syntax: string;
  description: string;
}

const SESSION_ROWS: ConsoleHelpRow[] = [
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
  },
  {
    name: 'session list',
    syntax: 'session list',
    description: "List the workflow's test sessions (the current one is marked)"
  },
  {
    name: 'session select',
    syntax: 'session select <id>',
    description: 'Make a session current (a short id prefix is enough)'
  },
  {
    name: 'session reset',
    syntax: 'session reset',
    description: 'Reset a stuck current session back to idle'
  },
  {
    name: 'session delete',
    syntax: 'session delete <id>',
    description: 'Delete a session (the full id, as session list shows it)'
  }
];

const USAGE =
  'Usage: session send "<message>" | run [key=value …] | stop | new | status | list | select <id> | reset | delete <id>';

// ============================================================================
// Parser
// ============================================================================

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
function parseSession(input: string): ConsoleParseResult {
  const trimmed = input.trim();
  const fail = (error: string): ConsoleParseResult => ({ ok: false, error, input });

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

    case 'list':
    case 'reset':
      if (rest) return fail(`session ${sub} takes no arguments`);
      return { ok: true, command: { type: `session_${sub}` } as SessionCommand };

    case 'select':
    case 'delete':
      if (!rest || /\s/.test(rest)) return fail(`session ${sub} takes one session id`);
      return { ok: true, command: { type: `session_${sub}`, id: rest } as SessionCommand };

    default:
      return fail(`Unknown session command: ${sub}. ${USAGE}`);
  }
}

// ============================================================================
// Executor
// ============================================================================

const failure = (error: string, code: 'CONSOLE_REFUSED' | 'CONSOLE_FAILED' | 'NO_WORKFLOW') =>
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
    return failure('No backend is configured for this editor.', 'CONSOLE_REFUSED');
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
      'CONSOLE_REFUSED'
    );
  }
  if (playground.sessionStatus === 'awaiting_input') {
    return failure(
      `${describeSession(runs)} is waiting for input. Answer it in the Playground, or end it with session stop.`,
      'CONSOLE_REFUSED'
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
  return failure(runs.playground.error ?? fallback, 'CONSOLE_FAILED');
}

async function send(content: string, runs: RunController): Promise<CommandResult> {
  const early = preflight(runs);
  if (early) return early;
  const { playground } = runs;

  const mode = playground.inputMode;
  if (mode === 'form' || mode === 'run') {
    return failure(
      'This workflow takes inputs, not chat messages. Use session run key=value … instead.',
      'CONSOLE_REFUSED'
    );
  }
  const chat = playground.chatBinding;
  if (chat !== null && !isPlaygroundChatSet(chat.binding)) {
    return failure(
      'No chat is set up for this workflow. Choose its message and reply in the Playground settings first.',
      'CONSOLE_REFUSED'
    );
  }
  const stuck = busy(runs);
  if (stuck) return stuck;

  const turnInputs = playground.turnInputs;
  if (!turnInputs.ok) {
    return failure(refusedInputs(turnInputs), 'CONSOLE_REFUSED');
  }

  const accepted = await runs.takeTurn({ content });
  if (!accepted) return refusal(runs, 'The turn was not accepted.');
  return { ok: true, message: acceptedMessage(runs, 'Turn sent to') };
}

function refusedInputs({
  missing,
  invalid
}: {
  missing: Array<{ id: string; name?: string }>;
  invalid: Array<{ id: string; name?: string }>;
}): string {
  const names = (entries: Array<{ id: string; name?: string }>): string =>
    entries.map((entry) => entry.name ?? entry.id).join(', ');
  const lines: string[] = [];
  if (missing.length > 0) lines.push(`Missing required inputs: ${names(missing)}`);
  if (invalid.length > 0) lines.push(`Not valid JSON for its type: ${names(invalid)}`);
  return `${lines.join('. ')}. Pass them as session run key=value …`;
}

async function run(inputs: Record<string, string>, runs: RunController): Promise<CommandResult> {
  const early = preflight(runs);
  if (early) return early;
  const { playground } = runs;

  const stuck = busy(runs);
  if (stuck) return stuck;

  const mode = playground.inputMode;
  if (mode === 'form' || mode === 'run') {
    // Check against a local merge first: a refused run leaves the form as it was.
    const entries = playground.interfaceFormEntries;
    const known = new Set(entries.map((entry) => entry.id));
    const unknown = Object.keys(inputs).filter((key) => !known.has(key));
    if (unknown.length > 0) {
      return failure(
        `Not interface inputs of this workflow: ${unknown.join(', ')}. Available: ${
          entries.map((entry) => entry.id).join(', ') || 'none'
        }.`,
        'CONSOLE_REFUSED'
      );
    }
    const merged = { ...playground.formValues, ...inputs };
    const turnInputs = collectInterfaceInputs(entries, merged);
    if (!turnInputs.ok) {
      return failure(refusedInputs(turnInputs), 'CONSOLE_REFUSED');
    }
    playground.setFormValues(merged);
    const accepted = await runs.takeTurn({});
    if (!accepted) return refusal(runs, 'The run was not accepted.');
    return { ok: true, message: acceptedMessage(runs, 'Run started in') };
  }

  if (!runs.canLaunch) {
    return failure(
      'This backend cannot start a run without a message. Use session send "…" instead.',
      'CONSOLE_REFUSED'
    );
  }
  const result = await runs.launchWorkflow(inputs);
  if (result.status !== 'launched') {
    return failure(runs.describeLaunch(result).message ?? 'The run was refused.', 'CONSOLE_FAILED');
  }
  return { ok: true, message: acceptedMessage(runs, 'Run started in') };
}

async function stop(runs: RunController): Promise<CommandResult> {
  const session = runs.playground.currentSession;
  if (!session) {
    return failure('There is no test session to stop.', 'CONSOLE_REFUSED');
  }
  runs.playground.setError(null);
  await runs.stopExecution();
  // A failed stop leaves the run going; say that rather than "Stopped".
  const error = runs.playground.error;
  if (error) return failure(error, 'CONSOLE_FAILED');
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

async function listSessions(runs: RunController): Promise<CommandResult> {
  const early = preflight(runs);
  if (early) return early;
  runs.playground.setError(null);
  await runs.loadSessions();
  if (runs.playground.error) return failure(runs.playground.error, 'CONSOLE_FAILED');
  const { sessions, currentSession } = runs.playground;
  if (sessions.length === 0) {
    return { ok: true, message: 'No test sessions yet. Start one with session new.' };
  }
  const lines = sessions.map(
    (session) =>
      `${session.id === currentSession?.id ? '*' : ' '} ${session.id}  "${session.name}"  ${session.status}`
  );
  return { ok: true, message: `${sessions.length} sessions (* = current)\n${lines.join('\n')}` };
}

/**
 * Resolve a typed session id against the loaded list. The list is loaded when
 * empty, and reloaded once before a miss is reported (another tab or the
 * Playground may have made the session since). `exact` is for actions that
 * cannot be undone.
 */
async function resolveSession(
  typed: string,
  runs: RunController,
  options: { exact?: boolean } = {}
): Promise<{ ok: true; id: string } | { ok: false; result: CommandResult }> {
  const early = preflight(runs);
  if (early) return { ok: false, result: early };
  const attempt = () =>
    resolveIdPrefix(
      runs.playground.sessions.map((session) => session.id),
      typed,
      'session',
      options
    );
  let resolved = runs.playground.sessions.length === 0 ? null : attempt();
  if (!resolved?.ok) {
    runs.playground.setError(null);
    await runs.loadSessions();
    if (runs.playground.error) {
      return { ok: false, result: failure(runs.playground.error, 'CONSOLE_FAILED') };
    }
    resolved = attempt();
  }
  if (!resolved.ok) {
    return { ok: false, result: failure(resolved.error, 'CONSOLE_REFUSED') };
  }
  return resolved;
}

async function selectSession(typed: string, runs: RunController): Promise<CommandResult> {
  const resolved = await resolveSession(typed, runs);
  if (!resolved.ok) return resolved.result;
  runs.playground.setError(null);
  await runs.selectSession(resolved.id);
  if (runs.playground.currentSession?.id !== resolved.id) {
    return refusal(runs, 'Could not switch to that session.');
  }
  return { ok: true, message: `Session "${runs.playground.currentSession.name}" is now current.` };
}

async function resetSession(fd: ConsoleInstance): Promise<CommandResult> {
  const { runs } = fd;
  const session = runs.playground.currentSession;
  if (!session) return failure('There is no test session to reset.', 'CONSOLE_REFUSED');
  const early = preflight(runs);
  if (early) return early;
  // The Playground's Reset button is hidden without this endpoint. Without the
  // check, a backend that cannot reset would have the controller force a
  // running session to idle and stop its polling, and the replies would never arrive.
  const config = fd.api.config;
  if (!config || resolveSessionEndpoint(config, 'reset') == null) {
    return failure('This backend cannot reset a session.', 'CONSOLE_REFUSED');
  }
  runs.playground.setError(null);
  await runs.resetSession();
  return { ok: true, message: `Reset "${session.name}" to idle.` };
}

async function deleteSession(typed: string, runs: RunController): Promise<CommandResult> {
  const resolved = await resolveSession(typed, runs, { exact: true });
  if (!resolved.ok) return resolved.result;
  const name = runs.playground.sessions.find((session) => session.id === resolved.id)?.name;
  runs.playground.setError(null);
  await runs.deleteSession(resolved.id);
  // deleteSession reports a failure through the playground error.
  if (runs.playground.sessions.some((session) => session.id === resolved.id)) {
    return refusal(runs, 'Could not delete the session.');
  }
  return { ok: true, message: `Deleted session "${name ?? resolved.id}".` };
}

/**
 * Execute a parsed session command against the instance's run controller.
 * Success means the backend accepted the turn or run; the reply arrives through
 * the normal polling into the playground store, and `session status` reads it.
 */
async function executeSession(
  command: SessionCommand,
  fd: ConsoleInstance
): Promise<CommandResult> {
  const { runs } = fd;
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
    case 'session_list':
      return await listSessions(runs);
    case 'session_select':
      return await selectSession(command.id, runs);
    case 'session_reset':
      return await resetSession(fd);
    case 'session_delete':
      return await deleteSession(command.id, runs);
  }
}

// ============================================================================
// Mode, runs, save, export: types, parsers, rows
// ============================================================================

/** A parsed `mode`, `runs`, `save` or `export` command. */
export type EditorCommand =
  | { type: 'mode_show' }
  | { type: 'mode_set'; mode: 'edit' | 'test' }
  | { type: 'runs_list' }
  | { type: 'runs_open'; id: string }
  | { type: 'runs_rerun'; id: string }
  | { type: 'runs_cancel'; id: string }
  | { type: 'runs_dismiss'; id?: string }
  | { type: 'save' }
  | { type: 'export' };

/** Any parsed Console command. */
export type ConsoleCommand = SessionCommand | EditorCommand;

export type ConsoleParseResult =
  | { ok: true; command: ConsoleCommand }
  | { ok: false; error: string; input: string };

/**
 * What `App` offers the Console beyond the instance. Every member is read at
 * the moment a command runs, so it is always current. A member is absent when
 * the host has no such action.
 */
export interface ConsoleHost {
  /**
   * The navbar's Save. Resolves to whether the workflow was saved; when not,
   * `reason` is the one place that decided (a lock, `can.save`, a cancelled
   * save), so the Console never keeps a second rule.
   */
  save?: () => Promise<{ ok: true } | { ok: false; reason: string }>;
  /** The navbar's Export (downloads the workflow as JSON): whether the file was produced. */
  export?: () => Promise<boolean>;
}

/** What the executor needs of the editor. */
export type ConsoleInstance = Pick<FlowDropInstance, 'runs' | 'editorMode' | 'workflow' | 'api'>;

const MODE_ROWS: ConsoleHelpRow[] = [
  {
    name: 'mode',
    syntax: 'mode [edit|test]',
    description: 'Show the editor mode, or switch (Test needs a saved workflow)'
  }
];

const RUNS_ROWS: ConsoleHelpRow[] = [
  { name: 'runs', syntax: 'runs [list]', description: "List the workflow's runs, newest first" },
  {
    name: 'runs open',
    syntax: 'runs open <id>',
    description: 'Show a run on the canvas (a short id prefix is enough)'
  },
  {
    name: 'runs rerun',
    syntax: 'runs rerun <id>',
    description: 'Run a finished run again (the full id, as runs shows it)'
  },
  {
    name: 'runs cancel',
    syntax: 'runs cancel <id>',
    description: 'Cancel a run that is going (the full id, as runs shows it)'
  },
  {
    name: 'runs dismiss',
    syntax: 'runs dismiss [id]',
    description: 'Hide the shown run and its node statuses'
  }
];

const SAVE_ROWS: ConsoleHelpRow[] = [
  { name: 'save', syntax: 'save', description: 'Save the workflow, as the navbar does' }
];

const EXPORT_ROWS: ConsoleHelpRow[] = [
  { name: 'export', syntax: 'export', description: 'Download the workflow as a JSON file' }
];

const MODE_USAGE = 'Usage: mode | mode edit | mode test';
const RUNS_USAGE =
  'Usage: runs [list] | runs open <id> | runs rerun <id> | runs cancel <id> | runs dismiss [id]';

/** The words after the verb, split on whitespace. */
function words(input: string): string[] {
  const rest = input.trim().replace(/^\S+\s*/, '');
  return rest ? rest.split(/\s+/) : [];
}

function parseMode(input: string): ConsoleParseResult {
  const args = words(input);
  if (args.length === 0) return { ok: true, command: { type: 'mode_show' } };
  const target = args[0].toLowerCase();
  if (args.length > 1 || (target !== 'edit' && target !== 'test')) {
    return { ok: false, error: MODE_USAGE, input };
  }
  return { ok: true, command: { type: 'mode_set', mode: target } };
}

function parseRuns(input: string): ConsoleParseResult {
  const args = words(input);
  const fail = (error: string): ConsoleParseResult => ({ ok: false, error, input });
  const sub = args[0]?.toLowerCase();
  if (sub === undefined || sub === 'list') {
    if (args.length > 1) return fail('runs list takes no arguments');
    return { ok: true, command: { type: 'runs_list' } };
  }
  if (sub === 'dismiss') {
    if (args.length > 2) return fail('runs dismiss takes at most one run id');
    return { ok: true, command: { type: 'runs_dismiss', id: args[1] } };
  }
  if (sub === 'open' || sub === 'rerun' || sub === 'cancel') {
    if (args.length !== 2) return fail(`runs ${sub} takes one run id`);
    return { ok: true, command: { type: `runs_${sub}`, id: args[1] } };
  }
  return fail(`Unknown runs command: ${args[0]}. ${RUNS_USAGE}`);
}

/** `save` and `export` take no arguments. */
function parseBare(verb: 'save' | 'export') {
  return (input: string): ConsoleParseResult =>
    words(input).length > 0
      ? { ok: false, error: `${verb} takes no arguments`, input }
      : { ok: true, command: { type: verb } };
}

// ============================================================================
// Executor
// ============================================================================

/**
 * Why Test mode is unavailable, from the facts `App` holds. One place for the
 * wording: `App`'s `testModeAvailable` is true exactly when this returns
 * `null`, and `App` provides it to `fd.editorMode.testBlocker`, which the
 * Console's `mode` and the WebMCP mode tools read.
 */
export function testModeBlocker(facts: {
  testModeFeature: boolean;
  editable: boolean;
  isPipelineView: boolean;
  hasSavedWorkflow: boolean;
}): string | null {
  if (!facts.testModeFeature) return 'Test mode is turned off for this editor.';
  if (!facts.editable) return 'Test mode is not available while the editor is read-only.';
  if (facts.isPipelineView) return 'Test mode is not available when viewing a pipeline run.';
  if (!facts.hasSavedWorkflow) return 'Save the workflow first: Test mode needs a saved workflow.';
  return null;
}

function mode(
  command: Extract<EditorCommand, { type: 'mode_show' | 'mode_set' }>,
  fd: ConsoleInstance
): CommandResult {
  const blocker = fd.editorMode.testBlocker;
  const requested = fd.editorMode.current;
  // The requested mode may be Test while App holds it back: the real mode is Edit.
  const effective = fd.editorMode.effective;

  if (command.type === 'mode_show') {
    const test = blocker ? `Test is not available: ${blocker}` : 'Test is available.';
    return { ok: true, message: `Mode: ${effective}. ${test}` };
  }

  if (command.mode === 'test' && blocker) return failure(blocker, 'CONSOLE_REFUSED');
  if (command.mode === effective && requested === effective) {
    return { ok: true, message: `Already in ${effective} mode.` };
  }
  fd.editorMode.set(command.mode);
  // Test was asked for and held back; Edit is what the person sees. Say the
  // request is gone, so it does not spring back when the blocker clears.
  if (requested === 'test' && command.mode === 'edit' && effective === 'edit') {
    return { ok: true, message: 'Cleared the pending Test request; staying in edit mode.' };
  }
  return { ok: true, message: `Switched to ${command.mode} mode.` };
}

/** A run as one line of `runs list`. */
function describeRun(run: RunSummary, shownId: string | null): string {
  const parts = [run.id.padEnd(8), run.status.padEnd(10), run.createdAt ?? 'unknown time'];
  const duration = formatRunDuration(runDurationMs(run));
  if (duration) parts.push(duration);
  if (run.jobSummary) {
    parts.push(
      `${run.jobSummary.total} jobs${run.jobSummary.failed ? `, ${run.jobSummary.failed} failed` : ''}`
    );
  } else if (run.executionCount > 0) {
    parts.push(`${run.executionCount} jobs`);
  }
  return `${run.id === shownId ? '*' : ' '} ${parts.join('  ')}`;
}

/** Read the runs list, or say why that is not possible. */
async function readRuns(
  fd: ConsoleInstance,
  limit: number
): Promise<
  | { ok: true; runs: RunSummary[]; hasMore: boolean | undefined }
  | { ok: false; result: CommandResult }
> {
  const config = fd.api.config;
  const workflowId = fd.workflow.current?.id;
  if (!workflowId) {
    return {
      ok: false,
      result: failure('Save the workflow first: runs belong to a saved workflow.', 'NO_WORKFLOW')
    };
  }
  if (!config || !runsSupport(config).list) {
    return {
      ok: false,
      result: failure('This backend does not list runs.', 'CONSOLE_REFUSED')
    };
  }
  try {
    const page = await listRuns(config, workflowId, { offset: 0, limit }, fd.api.authProvider);
    return { ok: true, runs: page.runs, hasMore: page.hasMore };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, result: failure(`Could not read the runs: ${error}`, 'CONSOLE_FAILED') };
  }
}

async function runsList(fd: ConsoleInstance): Promise<CommandResult> {
  const read = await readRuns(fd, 20);
  if (!read.ok) return read.result;
  if (read.runs.length === 0) return { ok: true, message: 'No runs yet.' };
  const shown = fd.runs.openedRunId;
  const lines = read.runs.map((run) => describeRun(run, shown));
  const more = hasMoreRuns(read.runs.length, 20, read.hasMore)
    ? '\n(more runs exist; showing the newest 20)'
    : '';
  return {
    ok: true,
    message: `${read.runs.length} runs, newest first (* = shown on canvas)\n${lines.join('\n')}${more}`
  };
}

async function runsAct(
  command: Extract<EditorCommand, { type: 'runs_open' | 'runs_rerun' | 'runs_cancel' }>,
  fd: ConsoleInstance
): Promise<CommandResult> {
  const read = await readRuns(fd, RUNS_MAX_LIMIT);
  if (!read.ok) return read.result;
  const resolved = resolveIdPrefix(
    read.runs.map((run) => run.id),
    command.id,
    'run',
    // Cancel and re-run cannot be undone: only the full id names the run.
    { exact: command.type !== 'runs_open' }
  );
  if (!resolved.ok) return failure(resolved.error, 'CONSOLE_REFUSED');
  const run = read.runs.find((candidate) => candidate.id === resolved.id)!;
  const config = fd.api.config!;
  const support = runsSupport(config);

  if (command.type === 'runs_open') {
    fd.runs.openRun(run.id, run.status);
    return { ok: true, message: `Showing run ${run.id} (${run.status}) on the canvas.` };
  }

  if (command.type === 'runs_rerun') {
    if (!support.rerun || !canRerunRun(run.status)) {
      return failure(
        !support.rerun
          ? 'This backend cannot re-run a run.'
          : `Run ${run.id} is ${run.status}; only a finished run can be run again.`,
        'CONSOLE_REFUSED'
      );
    }
    const result = await rerunRun(config, run.id, fd.api.authProvider);
    if (!result.ok) return failure(result.message || 'The re-run failed.', 'CONSOLE_FAILED');
    if (result.pipelineId) {
      fd.runs.openRun(result.pipelineId, result.status ?? 'running');
      return { ok: true, message: `Run ${run.id} started again as ${result.pipelineId}.` };
    }
    return { ok: true, message: `Run ${run.id} started again.` };
  }

  if (!support.cancel || !canCancelRun(run.status)) {
    return failure(
      !support.cancel
        ? 'This backend cannot cancel a run.'
        : `Run ${run.id} is ${run.status}; only a run that has not finished can be cancelled.`,
      'CONSOLE_REFUSED'
    );
  }
  const result = await cancelRun(config, run.id, fd.api.authProvider);
  if (!result.ok) return failure(result.message || 'The cancel failed.', 'CONSOLE_FAILED');
  return { ok: true, message: `Cancelled run ${run.id}.` };
}

function runsDismiss(
  command: Extract<EditorCommand, { type: 'runs_dismiss' }>,
  fd: ConsoleInstance
): CommandResult {
  const shown = fd.runs.openedRunId;
  if (!shown) return failure('No run is shown on the canvas.', 'CONSOLE_REFUSED');
  if (command.id !== undefined && !resolveIdPrefix([shown], command.id, 'run').ok) {
    return failure(`Run ${command.id} is not the one shown (that is ${shown}).`, 'CONSOLE_REFUSED');
  }
  fd.runs.dismissRun();
  return { ok: true, message: `Dismissed run ${shown}.` };
}

async function save(host: ConsoleHost): Promise<CommandResult> {
  if (!host.save) return failure('Saving is not available in this editor.', 'CONSOLE_REFUSED');
  const outcome = await host.save();
  if (!outcome.ok) return failure(outcome.reason, 'CONSOLE_REFUSED');
  return { ok: true, message: 'Workflow saved.' };
}

async function exportIt(fd: ConsoleInstance, host: ConsoleHost): Promise<CommandResult> {
  if (!host.export) return failure('Export is not available in this editor.', 'CONSOLE_REFUSED');
  const workflow = fd.workflow.current;
  if (!workflow) return failure('No workflow to export.', 'NO_WORKFLOW');
  if (!(await host.export())) {
    return failure(
      'The workflow was not exported. The editor shows the reason in a notification.',
      'CONSOLE_FAILED'
    );
  }
  return { ok: true, message: `Exported "${workflow.name || 'Untitled Workflow'}" as JSON.` };
}

/** One executor for the lane's commands. */
async function executeEditor(
  command: EditorCommand,
  fd: ConsoleInstance,
  host: ConsoleHost
): Promise<CommandResult> {
  switch (command.type) {
    case 'mode_show':
    case 'mode_set':
      return mode(command, fd);
    case 'runs_list':
      return await runsList(fd);
    case 'runs_open':
    case 'runs_rerun':
    case 'runs_cancel':
      return await runsAct(command, fd);
    case 'runs_dismiss':
      return runsDismiss(command, fd);
    case 'save':
      return await save(host);
    case 'export':
      return await exportIt(fd, host);
  }
}

// ============================================================================
// The registry
// ============================================================================

/** One Console verb: how to recognise, parse, run and document its lines. */
interface ConsoleVerb {
  verb: string;
  parse: (input: string) => ConsoleParseResult;
  execute: (
    command: ConsoleCommand,
    fd: ConsoleInstance,
    host: ConsoleHost
  ) => CommandResult | Promise<CommandResult>;
  help: ConsoleHelpRow[];
  /** The WebMCP tool that does the same for an agent, when there is one. */
  tool?: string;
}

const REGISTRY: readonly ConsoleVerb[] = [
  {
    verb: 'session',
    parse: parseSession,
    execute: (command, fd) => executeSession(command as SessionCommand, fd),
    help: SESSION_ROWS
  },
  {
    verb: 'mode',
    parse: parseMode,
    execute: (command, fd, host) => executeEditor(command as EditorCommand, fd, host),
    help: MODE_ROWS,
    tool: 'set_editor_mode (get_editor_mode reads it)'
  },
  {
    verb: 'runs',
    parse: parseRuns,
    execute: (command, fd, host) => executeEditor(command as EditorCommand, fd, host),
    help: RUNS_ROWS
  },
  {
    verb: 'save',
    parse: parseBare('save'),
    execute: (command, fd, host) => executeEditor(command as EditorCommand, fd, host),
    help: SAVE_ROWS,
    tool: 'save'
  },
  {
    verb: 'export',
    parse: parseBare('export'),
    execute: (command, fd, host) => executeEditor(command as EditorCommand, fd, host),
    help: EXPORT_ROWS
  }
];

/** The first words of every Console line. */
export const CONSOLE_VERBS: readonly string[] = REGISTRY.map((entry) => entry.verb);

/** Every usage row, in verb order: the one help list. */
export const CONSOLE_HELP: readonly ConsoleHelpRow[] = REGISTRY.flatMap((entry) => entry.help);

function verbOf(input: string): ConsoleVerb | undefined {
  const first = input
    .trim()
    .match(/^(\S+)/)?.[1]
    .toLowerCase();
  return REGISTRY.find((entry) => entry.verb === first);
}

/** Whether a line belongs to the Console: its first word is one of {@link CONSOLE_VERBS}. */
export function isConsoleLine(input: string): boolean {
  return verbOf(input) !== undefined;
}

/**
 * Usage rows for `help <topic>`: `help runs` lists the verb's rows, `help runs
 * open` the one. Empty when the topic names no Console command.
 */
export function consoleHelp(topic: string): ConsoleHelpRow[] {
  const wanted = topic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!wanted) return [...CONSOLE_HELP];
  return CONSOLE_HELP.filter((row) => row.name === wanted || row.name.startsWith(`${wanted} `));
}

/**
 * The refusal for a Console line given to something that is not the Console
 * (the editing DSL, `runCommand`): it names the WebMCP tool where one exists.
 * `null` when the line is not a Console line.
 */
export function consoleRefusal(input: string): string | null {
  const entry = verbOf(input);
  if (!entry) return null;
  const tool = entry.tool ? ` An agent can use the ${entry.tool} tool.` : '';
  return `\`${entry.verb}\` runs only in the editor Console; it is not one of the editing commands.${tool}`;
}

/** Parse a Console line (case-insensitive verbs; message text and input values as typed). */
export function parseConsoleLine(input: string): ConsoleParseResult {
  const entry = verbOf(input);
  if (!entry) {
    return {
      ok: false,
      error: `Not a Console command. Console commands start with: ${CONSOLE_VERBS.join(', ')}.`,
      input
    };
  }
  return entry.parse(input);
}

/**
 * Execute a parsed Console command. Never throws: a failure is returned as an
 * error result.
 */
export async function executeConsoleCommand(
  command: ConsoleCommand,
  fd: ConsoleInstance,
  host: ConsoleHost = {}
): Promise<CommandResult> {
  const entry =
    REGISTRY.find((candidate) => command.type.startsWith(`${candidate.verb}_`)) ??
    REGISTRY.find((candidate) => candidate.verb === command.type);
  try {
    if (!entry) return failure(`Unknown Console command: ${command.type}`, 'CONSOLE_FAILED');
    return await entry.execute(command, fd, host);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return failure(error, 'CONSOLE_FAILED');
  }
}

/** Parse and execute one Console line. */
export async function runConsoleLine(
  line: string,
  fd: ConsoleInstance,
  host: ConsoleHost = {}
): Promise<CommandResult> {
  const parsed = parseConsoleLine(line);
  if (!parsed.ok) return failure(parsed.error, 'CONSOLE_REFUSED');
  return executeConsoleCommand(parsed.command, fd, host);
}
