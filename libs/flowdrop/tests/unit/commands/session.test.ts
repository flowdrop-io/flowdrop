/**
 * Console `session` commands: the parser, the executor (over a mock
 * controller) and the teaching error the editing parser gives for the verb.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseConsoleLine,
  executeConsoleCommand,
  isConsoleLine,
  parseCommand,
  type ConsoleInstance
} from '../../../src/lib/commands/index.js';
import { emptyPlaygroundChat } from '../../../src/lib/utils/playgroundChat.js';
import type { RunController } from '../../../src/lib/stores/runController.svelte.js';

const parseSessionCommand = (input: string) => parseConsoleLine(input);

describe('parse session lines', () => {
  it('parses send with a quoted, a bare and a triple-quoted message', () => {
    expect(parseSessionCommand('session send "hi there"')).toEqual({
      ok: true,
      command: { type: 'session_send', content: 'hi there' }
    });
    expect(parseSessionCommand('session send hello world')).toEqual({
      ok: true,
      command: { type: 'session_send', content: 'hello world' }
    });
    expect(parseSessionCommand('session send """\nline one\nline "two"\n"""')).toEqual({
      ok: true,
      command: { type: 'session_send', content: 'line one\nline "two"' }
    });
    expect(parseSessionCommand('session send "say \\"hi\\""')).toEqual({
      ok: true,
      command: { type: 'session_send', content: 'say "hi"' }
    });
  });

  it('keeps a message with inner quotes that is not one quoted string as typed', () => {
    expect(parseSessionCommand('session send "a" and "b"')).toEqual({
      ok: true,
      command: { type: 'session_send', content: '"a" and "b"' }
    });
  });

  it('is case-insensitive about the verbs', () => {
    expect(parseSessionCommand('SESSION Status')).toEqual({
      ok: true,
      command: { type: 'session_status' }
    });
    expect(parseSessionCommand('Session NEW')).toEqual({
      ok: true,
      command: { type: 'session_new' }
    });
  });

  it('parses run with bare and quoted values', () => {
    expect(parseSessionCommand('session run topic="solar power" n=3 empty=')).toEqual({
      ok: true,
      command: { type: 'session_run', inputs: { topic: 'solar power', n: '3', empty: '' } }
    });
    expect(parseSessionCommand('session run')).toEqual({
      ok: true,
      command: { type: 'session_run', inputs: {} }
    });
  });

  it('rejects malformed input', () => {
    const cases = [
      'session',
      'session send',
      'session send ""',
      'session run loose words',
      'session run a="x"y',
      'session stop now',
      'session dance',
      'session select',
      'session select a b',
      'session delete',
      'session list now',
      'session reset now',
      'session send """ unclosed'
    ];
    for (const input of cases) {
      expect(parseSessionCommand(input).ok, input).toBe(false);
    }
    const unknown = parseSessionCommand('session dance');
    expect(unknown.ok === false && unknown.error).toContain('Usage');
  });

  it('recognises a session line by its first word', () => {
    expect(isConsoleLine('  Session send "x"')).toBe(true);
    expect(isConsoleLine('session')).toBe(true);
    expect(isConsoleLine('sessions')).toBe(false);
    expect(isConsoleLine('add session')).toBe(false);
  });
});

describe('parseCommand teaching error', () => {
  it('says session commands are Console-only', () => {
    for (const input of ['session send "hi"', 'SESSION status', 'session']) {
      const result = parseCommand(input);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe(
        '`session` runs only in the editor Console; it is not one of the editing commands.'
      );
    }
  });

  it('still treats other verbs as before', () => {
    expect(parseCommand('sessions')).toMatchObject({
      ok: false,
      error: 'Unknown command: sessions'
    });
  });
});

// ---------------------------------------------------------------------------
// Executor, over a mock controller
// ---------------------------------------------------------------------------

type Mode = 'legacy' | 'chat' | 'form' | 'run';

function mockRuns(
  overrides: {
    workflowId?: string | null;
    mode?: Mode;
    chatBinding?: unknown;
    dirty?: boolean;
    session?: { id: string; name: string } | null;
    status?: string;
    isExecuting?: boolean;
    turnInputs?: unknown;
    messages?: Array<Record<string, unknown>>;
    canLaunch?: boolean;
    takeTurn?: boolean;
    error?: string | null;
  } = {}
) {
  const state = {
    session: 'session' in overrides ? overrides.session : { id: 's1', name: 'Session 1' },
    status: overrides.status ?? 'idle',
    formValues: {} as Record<string, unknown>,
    sessions: [
      { id: 'abc-1', name: 'One', status: 'idle' },
      { id: 'abc-2', name: 'Two', status: 'running' },
      { id: 'xyz-3', name: 'Three', status: 'idle' }
    ]
  };
  const playground = {
    get currentSession() {
      return state.session;
    },
    get sessionStatus() {
      return state.status;
    },
    inputMode: overrides.mode ?? 'chat',
    chatBinding:
      'chatBinding' in overrides
        ? overrides.chatBinding
        : {
            binding: { ...emptyPlaygroundChat(), message: 'msg', replies: ['reply'] },
            source: 'settings'
          },
    isExecuting: overrides.isExecuting ?? false,
    turnPending: false,
    turnInputs: overrides.turnInputs ?? { ok: true, inputs: {} },
    get formValues() {
      return state.formValues;
    },
    setFormValues: vi.fn((v: Record<string, unknown>) => {
      state.formValues = v;
    }),
    get sessions() {
      return state.sessions;
    },
    setError: vi.fn(),
    error: overrides.error ?? null,
    messages: overrides.messages ?? [],
    get messageCount() {
      return (overrides.messages ?? []).length;
    }
  };
  const runs = {
    workflowId: 'workflowId' in overrides ? overrides.workflowId : 'wf',
    isConfigured: true,
    canLaunch: overrides.canLaunch ?? true,
    playground,
    editor: { isDirty: overrides.dirty ?? false },
    adoptEditorWorkflow: vi.fn(),
    takeTurn: vi.fn().mockImplementation(async () => {
      if (overrides.takeTurn === false) return false;
      state.status = 'running';
      return true;
    }),
    launchWorkflow: vi.fn().mockImplementation(async () => {
      state.status = 'running';
      return { status: 'launched', pipelineId: 'p1' };
    }),
    describeLaunch: vi.fn().mockReturnValue({ status: 'error', message: 'launch refused' }),
    stopExecution: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockImplementation(async () => {
      state.session = { id: 's2', name: 'Session 2' };
    }),
    loadSessions: vi.fn().mockResolvedValue(undefined),
    selectSession: vi.fn().mockImplementation(async (id: string) => {
      state.session = state.sessions.find((x) => x.id === id) ?? state.session;
    }),
    resetSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockImplementation(async (id: string) => {
      state.sessions = state.sessions.filter((x) => x.id !== id);
    })
  };
  return { runs: runs as unknown as RunController, mock: runs, playground, state };
}

const run = (
  input: string,
  runs: RunController,
  config: unknown = { endpoints: { sessions: { reset: '/s/{id}/reset' } } }
) => {
  const parsed = parseSessionCommand(input);
  if (!parsed.ok) throw new Error(parsed.error);
  const fd = { runs, api: { config } } as unknown as ConsoleInstance;
  return executeConsoleCommand(parsed.command, fd);
};

describe('execute session commands', () => {
  describe('guards', () => {
    it('asks to save an unsaved workflow first', async () => {
      const { runs, mock } = mockRuns({ workflowId: null });
      const result = await run('session send "hi"', runs);
      expect(result).toMatchObject({ ok: false, code: 'NO_WORKFLOW' });
      expect(!result.ok && result.error).toContain('Save the workflow first');
      expect(mock.takeTurn).not.toHaveBeenCalled();
    });

    it('suggests session stop when a run is in progress', async () => {
      const { runs, mock } = mockRuns({ isExecuting: true });
      const send = await run('session send "hi"', runs);
      const go = await run('session run', runs);
      expect(!send.ok && send.error).toContain('session stop');
      expect(!go.ok && go.error).toContain('session stop');
      expect(mock.takeTurn).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('takes a chat turn and reports acceptance with the session and status', async () => {
      const { runs, mock } = mockRuns();
      const result = await run('session send "hi"', runs);
      expect(mock.adoptEditorWorkflow).toHaveBeenCalled();
      expect(mock.takeTurn).toHaveBeenCalledWith({ content: 'hi' });
      expect(result).toEqual({ ok: true, message: 'Turn sent to "Session 1" (running).' });
    });

    it('notes that a dirty workflow runs its last saved version', async () => {
      const { runs } = mockRuns({ dirty: true });
      const result = await run('session send "hi"', runs);
      expect(result.ok && result.message).toContain('last saved version');
    });

    it('points to session run in form and run mode', async () => {
      for (const mode of ['form', 'run'] as const) {
        const { runs, mock } = mockRuns({ mode });
        const result = await run('session send "hi"', runs);
        expect(!result.ok && result.error).toContain('session run key=value');
        expect(mock.takeTurn).not.toHaveBeenCalled();
      }
    });

    it('says so when no chat is set up', async () => {
      const { runs } = mockRuns({
        mode: 'legacy',
        chatBinding: { binding: emptyPlaygroundChat(), source: 'none' }
      });
      const result = await run('session send "hi"', runs);
      expect(!result.ok && result.error).toContain('No chat is set up');
    });

    it('reports a refused turn with the store error', async () => {
      const { runs } = mockRuns({ takeTurn: false, error: '409 busy' });
      const result = await run('session send "hi"', runs);
      expect(result).toMatchObject({ ok: false, error: '409 busy', code: 'CONSOLE_FAILED' });
    });
  });

  describe('run', () => {
    it('in form mode merges the values over the form and takes a turn with no content', async () => {
      const { runs, mock, playground, state } = mockRuns({ mode: 'form' });
      state.formValues = { existing: 'keep', topic: 'old' };
      const result = await run('session run topic=new', runs);
      expect(playground.setFormValues).toHaveBeenCalledWith({ existing: 'keep', topic: 'new' });
      expect(mock.takeTurn).toHaveBeenCalledWith({});
      expect(result).toEqual({ ok: true, message: 'Run started in "Session 1" (running).' });
    });

    it('names the missing required inputs', async () => {
      const { runs, mock } = mockRuns({
        mode: 'form',
        turnInputs: {
          ok: false,
          missing: [{ id: 'topic', name: 'Topic' }, { id: 'n' }],
          invalid: []
        }
      });
      const result = await run('session run', runs);
      expect(!result.ok && result.error).toContain('Topic, n');
      expect(mock.takeTurn).not.toHaveBeenCalled();
    });

    it('names the inputs whose text is not JSON of their type', async () => {
      const { runs, mock } = mockRuns({
        mode: 'form',
        turnInputs: { ok: false, missing: [], invalid: [{ id: 'values', name: 'Values' }] }
      });
      const result = await run('session run values=2,3', runs);
      expect(!result.ok && result.error).toContain('Not valid JSON for its type: Values');
      expect(!result.ok && result.error).not.toContain('Missing');
      expect(mock.takeTurn).not.toHaveBeenCalled();
    });

    it('in chat and legacy mode launches with the inputs', async () => {
      for (const mode of ['chat', 'legacy'] as const) {
        const { runs, mock } = mockRuns({ mode });
        const result = await run('session run a=1', runs);
        expect(mock.launchWorkflow).toHaveBeenCalledWith({ a: '1' });
        expect(result.ok).toBe(true);
      }
    });

    it('reports a backend that cannot launch without a message', async () => {
      const { runs, mock } = mockRuns({ mode: 'legacy', canLaunch: false });
      const result = await run('session run', runs);
      expect(!result.ok && result.error).toContain('cannot start a run without a message');
      expect(mock.launchWorkflow).not.toHaveBeenCalled();
    });

    it('reports a refused launch in the configured words', async () => {
      const { runs, mock } = mockRuns({ mode: 'chat' });
      mock.launchWorkflow.mockResolvedValue({ status: 'invalid-input', message: 'x' });
      const result = await run('session run', runs);
      expect(result).toMatchObject({ ok: false, error: 'launch refused' });
    });
  });

  describe('stop, new, status', () => {
    it('stops the current session', async () => {
      const { runs, mock } = mockRuns();
      const result = await run('session stop', runs);
      expect(mock.stopExecution).toHaveBeenCalled();
      expect(result).toEqual({ ok: true, message: 'Stopped "Session 1".' });
    });

    it('reports a failed stop instead of claiming it stopped', async () => {
      const { runs, mock, playground } = mockRuns();
      mock.stopExecution.mockImplementation(async () => {
        (playground as { error: string | null }).error = 'Server error';
      });
      const result = await run('session stop', runs);
      expect(result.ok).toBe(false);
    });

    it('has nothing to stop without a session', async () => {
      const { runs } = mockRuns({ session: null });
      expect((await run('session stop', runs)).ok).toBe(false);
    });

    it('forces a new session and makes it current', async () => {
      const { runs, mock } = mockRuns();
      const result = await run('session new', runs);
      expect(mock.createSession).toHaveBeenCalled();
      expect(result.ok && result.message).toContain('"Session 2"');
    });

    it('reports a failed new session', async () => {
      const { runs, mock } = mockRuns({ error: 'boom' });
      mock.createSession.mockResolvedValue(undefined);
      const result = await run('session new', runs);
      expect(result).toMatchObject({ ok: false, error: 'boom' });
    });

    it('reports the session, status, count and the latest reply', async () => {
      const { runs } = mockRuns({
        status: 'idle',
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'first' },
          { role: 'log', content: 'noise' },
          { role: 'assistant', content: 'the answer' },
          { role: 'assistant', content: 'secret', display: 'hidden' }
        ]
      });
      const result = await run('session status', runs);
      expect(result.ok && result.message).toBe(
        'Session "Session 1" (s1)\nStatus: idle\nMessages: 5\nLatest reply: the answer'
      );
    });

    it('says there is no session yet', async () => {
      const { runs } = mockRuns({ session: null });
      const result = await run('session status', runs);
      expect(result.ok && result.message).toContain('No test session yet');
    });
  });
});

describe('session list / select / reset / delete', () => {
  it('parses them', () => {
    expect(parseSessionCommand('session list')).toEqual({
      ok: true,
      command: { type: 'session_list' }
    });
    expect(parseSessionCommand('session select abc-1')).toEqual({
      ok: true,
      command: { type: 'session_select', id: 'abc-1' }
    });
    expect(parseSessionCommand('session reset').ok).toBe(true);
    expect(parseSessionCommand('session delete xyz')).toEqual({
      ok: true,
      command: { type: 'session_delete', id: 'xyz' }
    });
  });

  it('lists sessions and marks the current one', async () => {
    const { runs, mock } = mockRuns();
    const result = await run('session list', runs);
    expect(mock.loadSessions).toHaveBeenCalled();
    expect(result.ok && result.message).toContain('3 sessions');
    expect(result.ok && result.message).toContain('* s1'.slice(0, 0) + 'abc-1');
  });

  it('selects by unique prefix and refuses an ambiguous or unknown one', async () => {
    const { runs, mock, state } = mockRuns();
    const ok = await run('session select xyz', runs);
    expect(ok.ok).toBe(true);
    expect(mock.selectSession).toHaveBeenCalledWith('xyz-3');
    expect(state.session).toMatchObject({ id: 'xyz-3' });

    const ambiguous = await run('session select abc', runs);
    expect(!ambiguous.ok && ambiguous.error).toContain('matches 2');
    const unknown = await run('session select nope', runs);
    expect(!unknown.ok && unknown.error).toContain('No session matches');
  });

  it('resets the current session, and refuses without one', async () => {
    const { runs, mock } = mockRuns();
    expect((await run('session reset', runs)).ok).toBe(true);
    expect(mock.resetSession).toHaveBeenCalled();
    const none = mockRuns({ session: null });
    expect((await run('session reset', none.runs)).ok).toBe(false);
  });

  it('refuses a reset the backend cannot do, without touching the session', async () => {
    const { runs, mock } = mockRuns();
    const result = await run('session reset', runs, { endpoints: {} });
    expect(result).toMatchObject({ ok: false, code: 'CONSOLE_REFUSED' });
    expect(!result.ok && result.error).toContain('cannot reset');
    expect(mock.resetSession).not.toHaveBeenCalled();
  });

  it('reloads the list once before reporting a miss', async () => {
    const { runs, mock, state } = mockRuns();
    mock.loadSessions.mockImplementation(async () => {
      state.sessions = [...state.sessions, { id: 'new-9', name: 'Nine', status: 'idle' }];
    });
    const found = await run('session select new-9', runs);
    expect(found.ok).toBe(true);
    expect(mock.loadSessions).toHaveBeenCalledTimes(1);

    mock.loadSessions.mockClear();
    mock.loadSessions.mockResolvedValue(undefined);
    const miss = await run('session select nope', runs);
    expect(!miss.ok && miss.error).toContain('No session matches');
    expect(mock.loadSessions).toHaveBeenCalledTimes(1);
  });

  it('reports a reset that throws', async () => {
    const { runs, mock } = mockRuns();
    mock.resetSession.mockRejectedValue(new Error('boom'));
    const result = await run('session reset', runs);
    expect(!result.ok && result.error).toBe('boom');
  });

  it('deletes by id, and fails when the session is still there', async () => {
    const { runs, mock } = mockRuns();
    const ok = await run('session delete xyz-3', runs);
    expect(ok.ok && ok.message).toContain('Three');
    const prefix = await run('session delete abc', runs);
    expect(prefix).toMatchObject({ ok: false, code: 'CONSOLE_REFUSED' });
    expect(!prefix.ok && prefix.error).toContain('full id');
    mock.deleteSession.mockResolvedValue(undefined);
    const stuck = await run('session delete abc-1', runs);
    expect(stuck.ok).toBe(false);
  });

  it('needs a saved workflow', async () => {
    const { runs } = mockRuns({ workflowId: null });
    expect((await run('session list', runs)).ok).toBe(false);
  });
});
