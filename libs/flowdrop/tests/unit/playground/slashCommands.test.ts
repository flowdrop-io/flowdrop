import { describe, it, expect, vi } from 'vitest';
import {
  parseSlashCommand,
  isCommandInput,
  isKnownCommand,
  getAvailableCommands,
  isCommandAvailable,
  dispatchCommand,
  tokenize,
  parseArgs,
  COMMAND_NAMES,
  type CommandMessages,
  type CommandHandlers
} from '../../../src/lib/playground/commands/index.js';
import { defaultEndpointConfig } from '../../../src/lib/config/endpoints.js';
import type { EndpointConfig } from '../../../src/lib/config/endpoints.js';
import { defaultMessages } from '../../../src/lib/messages/defaults.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A config with the optional reset endpoint removed. */
function configWithoutReset(): EndpointConfig {
  const config = structuredClone(defaultEndpointConfig);
  delete config.endpoints.playground.resetSession;
  return config;
}

/** A config with the optional signal plane removed. */
function configWithoutSignals(): EndpointConfig {
  const config = structuredClone(defaultEndpointConfig);
  delete config.endpoints.signals;
  return config;
}

const messages: CommandMessages = {
  // Real catalog, not a stub: /help renders these, and the point of the test
  // below is which commands appear — not what they are called.
  catalog: defaultMessages.playground.commands.catalog,
  unavailable: ({ name }) => `unavailable:${name}`,
  needsSession: ({ name }) => `needsSession:${name}`,
  helpHeading: 'HELP',
  helpEscapeHint: 'ESCAPE',
  stopped: 'stopped',
  reset: 'reset',
  created: 'created',
  deleted: 'deleted',
  failed: ({ name, error }) => `failed:${name}:${error}`,
  runStarted: 'runStarted',
  runInvalidInput: ({ error }) => `runInvalidInput:${error}`,
  runInvalidWorkflow: ({ error }) => `runInvalidWorkflow:${error}`,
  runInvalidWorkflowDetail: ({ locator, message }) => `detail:${locator}:${message}`,
  needsRun: ({ name }) => `needsRun:${name}`,
  signalPending: ({ signal }) => `signalPending:${signal}`,
  pauseRequested: 'pauseRequested',
  resumeRequested: 'resumeRequested',
  cancelRequested: 'cancelRequested',
  refusedTerminal: ({ name }) => `refusedTerminal:${name}`,
  refusedDuplicate: 'refusedDuplicate',
  refusedNotPaused: 'refusedNotPaused',
  refusedNotFound: 'refusedNotFound',
  refusedForbidden: ({ name }) => `refusedForbidden:${name}`,
  refusedOther: ({ name, error }) => `refusedOther:${name}:${error}`
};

function makeHandlers(
  overrides: {
    createSession?: () => Promise<void>;
    stopExecution?: () => Promise<void>;
    resetSession?: () => Promise<void>;
    sendSignal?: CommandHandlers['sendSignal'];
    launchWorkflow?: CommandHandlers['launchWorkflow'];
  } = {}
): CommandHandlers {
  return {
    createSession: vi.fn(overrides.createSession ?? (() => Promise.resolve())),
    deleteSession: vi.fn(() => Promise.resolve()),
    stopExecution: vi.fn(overrides.stopExecution ?? (() => Promise.resolve())),
    resetSession: vi.fn(overrides.resetSession ?? (() => Promise.resolve())),
    sendSignal: vi.fn(
      overrides.sendSignal ??
        ((signal, pipelineId) =>
          Promise.resolve({ status: 'accepted' as const, signal, pipelineId }))
    ),
    launchWorkflow: vi.fn(
      overrides.launchWorkflow ??
        (() => Promise.resolve({ status: 'launched' as const, pipelineId: 'new-pipeline' }))
    )
  };
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

describe('parseSlashCommand', () => {
  it('treats plain text as a message', () => {
    expect(parseSlashCommand('hello world')).toEqual({
      kind: 'message',
      content: 'hello world'
    });
  });

  it('reports empty input', () => {
    expect(parseSlashCommand('   ')).toEqual({ kind: 'empty' });
  });

  it.each(COMMAND_NAMES)('parses /%s', (name) => {
    const result = parseSlashCommand(`/${name}`);
    expect(result.kind).toBe('command');
    if (result.kind !== 'command') return;
    expect(result.command.name).toBe(name);
    expect(result.command.args).toEqual([]);
  });

  it('lower-cases the command name but preserves raw input', () => {
    const result = parseSlashCommand('/STOP');
    expect(result.kind).toBe('command');
    if (result.kind !== 'command') return;
    expect(result.command.name).toBe('stop');
    expect(result.command.raw).toBe('/STOP');
  });

  it('collects positional arguments', () => {
    const result = parseSlashCommand('/delete  abc-123   extra');
    expect(result.kind).toBe('command');
    if (result.kind !== 'command') return;
    expect(result.command.args).toEqual(['abc-123', 'extra']);
  });

  // -- the escape rule ------------------------------------------------------

  it('unescapes a doubled slash into a literal message', () => {
    expect(parseSlashCommand('//deploy the thing')).toEqual({
      kind: 'message',
      content: '/deploy the thing'
    });
  });

  it('consumes exactly one slash, so the escape composes', () => {
    expect(parseSlashCommand('///x')).toEqual({ kind: 'message', content: '//x' });
  });

  it('does not treat an escaped command name as a command', () => {
    const result = parseSlashCommand('//stop');
    expect(result.kind).toBe('message');
    if (result.kind !== 'message') return;
    expect(result.content).toBe('/stop');
  });

  // -- unknown commands -----------------------------------------------------

  it('does NOT forward an unknown command as a message', () => {
    // A typo must never launch a pipeline with "/stpo" as its input.
    const result = parseSlashCommand('/stpo');
    expect(result.kind).toBe('unknown');
  });

  it('suggests by prefix', () => {
    const result = parseSlashCommand('/re');
    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') return;
    expect(result.suggestions).toContain('reset');
  });

  it('suggests transpositions — the most common typo', () => {
    const result = parseSlashCommand('/stpo');
    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') return;
    expect(result.suggestions).toContain('stop');
  });

  it('suggests substitutions, insertions and deletions', () => {
    const cases: Array<[string, string]> = [
      ['/stap', 'stop'], // substitution
      ['/stopp', 'stop'], // insertion
      ['/stp', 'stop'], // deletion
      ['/dlete', 'delete'] // deletion, mid-word
    ];

    for (const [input, expected] of cases) {
      const result = parseSlashCommand(input);
      expect(result.kind, input).toBe('unknown');
      if (result.kind !== 'unknown') continue;
      expect(result.suggestions, input).toContain(expected);
    }
  });

  it('offers no suggestions for input nothing like a command', () => {
    const result = parseSlashCommand('/xyzzyplughplover');
    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') return;
    expect(result.suggestions).toEqual([]);
  });

  it('treats a bare slash as unknown and lists everything', () => {
    const result = parseSlashCommand('/');
    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') return;
    expect(result.suggestions).toEqual([...COMMAND_NAMES]);
  });
});

describe('isCommandInput', () => {
  it('is true for commands and typos, false for messages', () => {
    expect(isCommandInput('/stop')).toBe(true);
    // A typo still belongs to the control lane — it must not be sent as text.
    expect(isCommandInput('/stpo')).toBe(true);
    expect(isCommandInput('hello')).toBe(false);
    expect(isCommandInput('//stop')).toBe(false);
    expect(isCommandInput('')).toBe(false);
  });
});

describe('isKnownCommand', () => {
  it('narrows known names only', () => {
    expect(isKnownCommand('stop')).toBe(true);
    expect(isKnownCommand('nope')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Registry — the genericity contract
// ---------------------------------------------------------------------------

describe('command availability', () => {
  it('offers /reset when the backend configures the endpoint', () => {
    expect(isCommandAvailable('reset', defaultEndpointConfig)).toBe(true);
  });

  it('withholds /reset when the backend omits the endpoint', () => {
    expect(isCommandAvailable('reset', configWithoutReset())).toBe(false);
  });

  it('still offers commands whose endpoints are required keys', () => {
    const config = configWithoutReset();
    const names = getAvailableCommands(config).map((d) => d.name);
    expect(names).toEqual(expect.arrayContaining(['stop', 'new', 'delete']));
    expect(names).not.toContain('reset');
  });

  it('offers /help with no configuration at all', () => {
    expect(isCommandAvailable('help', null)).toBe(true);
    expect(getAvailableCommands(null).map((d) => d.name)).toEqual(['help']);
  });
});

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

describe('dispatchCommand', () => {
  const baseContext = (overrides: Partial<Parameters<typeof dispatchCommand>[1]> = {}) => ({
    config: defaultEndpointConfig,
    sessionId: 'session-1',
    pipelineId: 'pipeline-1',
    pendingSignal: null,
    handlers: makeHandlers(),
    messages,
    ...overrides
  });

  it('routes /stop to the stop handler', async () => {
    const context = baseContext();
    const outcome = await dispatchCommand({ name: 'stop', args: [], raw: '/stop' }, context);

    expect(context.handlers.stopExecution).toHaveBeenCalledOnce();
    expect(outcome).toEqual({ status: 'ok', message: 'stopped' });
  });

  it('routes /reset to the reset handler', async () => {
    const context = baseContext();
    await dispatchCommand({ name: 'reset', args: [], raw: '/reset' }, context);
    expect(context.handlers.resetSession).toHaveBeenCalledOnce();
  });

  it('routes /new without needing a session', async () => {
    const context = baseContext({ sessionId: null });
    const outcome = await dispatchCommand({ name: 'new', args: [], raw: '/new' }, context);

    expect(context.handlers.createSession).toHaveBeenCalledOnce();
    expect(outcome.status).toBe('ok');
  });

  it('passes the current session id to /delete', async () => {
    const context = baseContext();
    await dispatchCommand({ name: 'delete', args: [], raw: '/delete' }, context);
    expect(context.handlers.deleteSession).toHaveBeenCalledWith('session-1');
  });

  it('refuses session-scoped commands with no session', async () => {
    const context = baseContext({ sessionId: null });
    const outcome = await dispatchCommand({ name: 'stop', args: [], raw: '/stop' }, context);

    expect(context.handlers.stopExecution).not.toHaveBeenCalled();
    expect(outcome).toEqual({ status: 'error', message: 'needsSession:stop' });
  });

  it('refuses an unavailable command without calling its endpoint', async () => {
    const context = baseContext({ config: configWithoutReset() });
    const outcome = await dispatchCommand({ name: 'reset', args: [], raw: '/reset' }, context);

    expect(context.handlers.resetSession).not.toHaveBeenCalled();
    expect(outcome).toEqual({ status: 'error', message: 'unavailable:reset' });
  });

  it('reports handler failure instead of throwing', async () => {
    const context = baseContext({
      handlers: makeHandlers({ stopExecution: () => Promise.reject(new Error('boom')) })
    });

    const outcome = await dispatchCommand({ name: 'stop', args: [], raw: '/stop' }, context);
    expect(outcome).toEqual({ status: 'error', message: 'failed:stop:boom' });
  });

  it('builds /help from what is available, not the full command list', async () => {
    const context = baseContext({ config: configWithoutReset() });
    const outcome = await dispatchCommand({ name: 'help', args: [], raw: '/help' }, context);

    expect(outcome.status).toBe('info');
    expect(outcome.message).toContain('/stop');
    expect(outcome.message).not.toContain('/reset');
    expect(outcome.message).toContain('ESCAPE');
  });
});

// ---------------------------------------------------------------------------
// Tokenizing and argument parsing
// ---------------------------------------------------------------------------

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('a b  c')).toEqual(['a', 'b', 'c']);
  });

  it('keeps quoted runs together', () => {
    expect(tokenize('run --topic="Q2 revenue"')).toEqual(['run', '--topic=Q2 revenue']);
  });

  it('accepts either quote style so values can contain the other', () => {
    expect(tokenize(`run --note="it's fine"`)).toEqual(['run', "--note=it's fine"]);
    expect(tokenize(`run --note='say "hi"'`)).toEqual(['run', '--note=say "hi"']);
  });

  it('keeps an empty quoted value as a token', () => {
    expect(tokenize('run --topic=""')).toEqual(['run', '--topic=']);
  });

  it('runs an unterminated quote to end of input rather than failing', () => {
    // The user is mid-typing; refusing to parse would make the composer feel broken.
    expect(tokenize('run --topic="Q2 rev')).toEqual(['run', '--topic=Q2 rev']);
  });
});

describe('parseArgs', () => {
  it('reads --key=value flags', () => {
    expect(parseArgs(['--topic=foo', '--tone=formal'])).toEqual({
      inputs: { topic: 'foo', tone: 'formal' },
      rest: ''
    });
  });

  it('reads --key value pairs', () => {
    expect(parseArgs(['--topic', 'foo'])).toEqual({ inputs: { topic: 'foo' }, rest: '' });
  });

  it('treats a bare flag as true', () => {
    expect(parseArgs(['--verbose'])).toEqual({ inputs: { verbose: 'true' }, rest: '' });
  });

  it('does not swallow a following flag as a value', () => {
    expect(parseArgs(['--verbose', '--topic=x'])).toEqual({
      inputs: { verbose: 'true', topic: 'x' },
      rest: ''
    });
  });

  it('collects non-flag tokens as free text', () => {
    expect(parseArgs(['checking', 'the', 'draft'])).toEqual({
      inputs: {},
      rest: 'checking the draft'
    });
  });

  it('preserves values containing an equals sign', () => {
    expect(parseArgs(['--query=a=b'])).toEqual({ inputs: { query: 'a=b' }, rest: '' });
  });
});

// ---------------------------------------------------------------------------
// /run — launch
// ---------------------------------------------------------------------------

describe('/run', () => {
  const baseContext = (overrides: Partial<Parameters<typeof dispatchCommand>[1]> = {}) => ({
    config: defaultEndpointConfig,
    sessionId: 'session-1',
    pipelineId: 'pipeline-1',
    pendingSignal: null,
    handlers: makeHandlers(),
    messages,
    ...overrides
  });

  it('launches with no inputs when given none', async () => {
    const context = baseContext();
    const outcome = await dispatchCommand({ name: 'run', args: [], raw: '/run' }, context);

    expect(context.handlers.launchWorkflow).toHaveBeenCalledWith({});
    expect(outcome).toEqual({ status: 'ok', message: 'runStarted' });
  });

  it('passes named inputs through', async () => {
    const context = baseContext();
    await dispatchCommand(
      { name: 'run', args: ['--topic=Q2 revenue', '--tone=formal'], raw: '/run …' },
      context
    );

    expect(context.handlers.launchWorkflow).toHaveBeenCalledWith({
      topic: 'Q2 revenue',
      tone: 'formal'
    });
  });

  it('ignores loose words rather than smuggling them in as a message', async () => {
    // /run exists precisely so that starting a run posts no chat message.
    const context = baseContext();
    await dispatchCommand({ name: 'run', args: ['do', 'the', 'thing'], raw: '/run …' }, context);

    expect(context.handlers.launchWorkflow).toHaveBeenCalledWith({});
  });

  it('reports bad inputs as the caller-fixable problem', async () => {
    const context = baseContext({
      handlers: makeHandlers({
        launchWorkflow: () =>
          Promise.resolve({ status: 'invalid-input' as const, message: 'unknown key "topik"' })
      })
    });

    const outcome = await dispatchCommand({ name: 'run', args: [], raw: '/run' }, context);
    expect(outcome).toEqual({
      status: 'error',
      message: 'runInvalidInput:unknown key "topik"'
    });
  });

  it('surfaces per-error locators for an invalid stored workflow', async () => {
    const context = baseContext({
      handlers: makeHandlers({
        launchWorkflow: () =>
          Promise.resolve({
            status: 'invalid-workflow' as const,
            message: 'Workflow validation failed',
            errors: [
              { code: 'E1', message: 'missing port', locator: 'llm.1.prompt' },
              { code: 'E2', message: 'orphan node' }
            ]
          })
      })
    });

    const outcome = await dispatchCommand({ name: 'run', args: [], raw: '/run' }, context);

    expect(outcome.status).toBe('error');
    // The locator is the actionable part — it names the offending parameter.
    expect(outcome.message).toContain('detail:llm.1.prompt:missing port');
    // An error without a locator still reports.
    expect(outcome.message).toContain('detail::orphan node');
  });

  it('is withheld when the backend has no launch verb', async () => {
    const config = structuredClone(defaultEndpointConfig);
    delete config.endpoints.workflows.run;

    expect(isCommandAvailable('run', config)).toBe(false);

    const context = baseContext({ config });
    const outcome = await dispatchCommand({ name: 'run', args: [], raw: '/run' }, context);

    expect(context.handlers.launchWorkflow).not.toHaveBeenCalled();
    expect(outcome).toEqual({ status: 'error', message: 'unavailable:run' });
  });
});

// ---------------------------------------------------------------------------
// Pipeline signals
// ---------------------------------------------------------------------------

describe('pipeline signal commands', () => {
  const baseContext = (overrides: Partial<Parameters<typeof dispatchCommand>[1]> = {}) => ({
    config: defaultEndpointConfig,
    sessionId: 'session-1',
    pipelineId: 'pipeline-1',
    pendingSignal: null,
    handlers: makeHandlers(),
    messages,
    ...overrides
  });

  it.each(['pause', 'resume', 'cancel'] as const)(
    'routes /%s to the signal handler',
    async (name) => {
      const context = baseContext();
      await dispatchCommand({ name, args: [], raw: `/${name}` }, context);

      expect(context.handlers.sendSignal).toHaveBeenCalledWith(name, 'pipeline-1', undefined);
    }
  );

  it('passes trailing words as the audit reason', async () => {
    const context = baseContext();
    await dispatchCommand(
      { name: 'pause', args: ['checking', 'the', 'draft'], raw: '/pause checking the draft' },
      context
    );

    expect(context.handlers.sendSignal).toHaveBeenCalledWith(
      'pause',
      'pipeline-1',
      'checking the draft'
    );
  });

  // -- accepted is not applied ---------------------------------------------

  it('reports an accepted pause as REQUESTED, not done', async () => {
    const context = baseContext();
    const outcome = await dispatchCommand({ name: 'pause', args: [], raw: '/pause' }, context);

    // The backend acknowledges before acting; claiming "Paused" here would be a
    // lie exactly when the current step is slow.
    expect(outcome).toEqual({ status: 'info', message: 'pauseRequested' });
  });

  it('reports an accepted cancel as requested', async () => {
    const context = baseContext();
    const outcome = await dispatchCommand({ name: 'cancel', args: [], raw: '/cancel' }, context);
    expect(outcome).toEqual({ status: 'info', message: 'cancelRequested' });
  });

  // -- targeting ------------------------------------------------------------

  it('refuses when there is no active run to target', async () => {
    const context = baseContext({ pipelineId: null });
    const outcome = await dispatchCommand({ name: 'pause', args: [], raw: '/pause' }, context);

    expect(context.handlers.sendSignal).not.toHaveBeenCalled();
    expect(outcome).toEqual({ status: 'error', message: 'needsRun:pause' });
  });

  it('does not require a session-scoped guard — signals target a run', async () => {
    const context = baseContext({ sessionId: null });
    const outcome = await dispatchCommand({ name: 'pause', args: [], raw: '/pause' }, context);

    expect(outcome.status).toBe('info');
  });

  // -- duplicate guard ------------------------------------------------------

  it('refuses a second signal on the same pipeline client-side', async () => {
    const context = baseContext({
      pendingSignal: { pipelineId: 'pipeline-1', signal: 'pause' }
    });
    const outcome = await dispatchCommand({ name: 'cancel', args: [], raw: '/cancel' }, context);

    // The backend would 409; do not fire a request guaranteed to be refused.
    expect(context.handlers.sendSignal).not.toHaveBeenCalled();
    expect(outcome).toEqual({ status: 'error', message: 'signalPending:pause' });
  });

  it('allows a signal when the pending one targets a different pipeline', async () => {
    const context = baseContext({
      pendingSignal: { pipelineId: 'other-pipeline', signal: 'pause' }
    });
    const outcome = await dispatchCommand({ name: 'pause', args: [], raw: '/pause' }, context);

    expect(context.handlers.sendSignal).toHaveBeenCalled();
    expect(outcome.status).toBe('info');
  });

  // -- refusals map to distinct explanations --------------------------------

  it.each([
    ['terminal', 'refusedTerminal:pause'],
    ['duplicate', 'refusedDuplicate'],
    ['not-paused', 'refusedNotPaused'],
    ['not-found', 'refusedNotFound'],
    ['forbidden', 'refusedForbidden:pause'],
    ['rejected', 'refusedOther:pause:nope']
  ] as const)('explains a %s refusal distinctly', async (reason, expected) => {
    const context = baseContext({
      handlers: makeHandlers({
        sendSignal: () => Promise.resolve({ status: 'refused' as const, reason, message: 'nope' })
      })
    });

    const outcome = await dispatchCommand({ name: 'pause', args: [], raw: '/pause' }, context);
    expect(outcome).toEqual({ status: 'error', message: expected });
  });

  it('reports an unsupported signal plane as unavailable', async () => {
    const context = baseContext({
      handlers: makeHandlers({
        sendSignal: () => Promise.resolve({ status: 'unsupported' as const })
      })
    });

    const outcome = await dispatchCommand({ name: 'pause', args: [], raw: '/pause' }, context);
    expect(outcome).toEqual({ status: 'error', message: 'unavailable:pause' });
  });

  // -- availability ---------------------------------------------------------

  it('withholds signal commands when the backend has no signal plane', async () => {
    const config = configWithoutSignals();

    expect(isCommandAvailable('pause', config)).toBe(false);
    expect(getAvailableCommands(config).map((d) => d.name)).not.toContain('cancel');

    const context = baseContext({ config });
    const outcome = await dispatchCommand({ name: 'pause', args: [], raw: '/pause' }, context);

    expect(context.handlers.sendSignal).not.toHaveBeenCalled();
    expect(outcome).toEqual({ status: 'error', message: 'unavailable:pause' });
  });

  it('offers signal commands when the plane is configured', () => {
    expect(isCommandAvailable('pause', defaultEndpointConfig)).toBe(true);
    expect(isCommandAvailable('resume', defaultEndpointConfig)).toBe(true);
    expect(isCommandAvailable('cancel', defaultEndpointConfig)).toBe(true);
  });
});
