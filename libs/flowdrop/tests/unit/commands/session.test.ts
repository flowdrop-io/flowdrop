/**
 * Console `session` commands: the parser, the executor (over a mock
 * controller) and the teaching error the editing parser gives for the verb.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseSessionCommand,
  executeSessionCommand,
  isSessionLine,
  parseCommand
} from '../../../src/lib/commands/index.js';
import { emptyPlaygroundChat } from '../../../src/lib/utils/playgroundChat.js';
import type { RunController } from '../../../src/lib/stores/runController.svelte.js';

describe('parseSessionCommand', () => {
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
      'session send """ unclosed'
    ];
    for (const input of cases) {
      expect(parseSessionCommand(input).ok, input).toBe(false);
    }
    const unknown = parseSessionCommand('session dance');
    expect(unknown.ok === false && unknown.error).toContain('Usage');
  });

  it('recognises a session line by its first word', () => {
    expect(isSessionLine('  Session send "x"')).toBe(true);
    expect(isSessionLine('session')).toBe(true);
    expect(isSessionLine('sessions')).toBe(false);
    expect(isSessionLine('add session')).toBe(false);
  });
});

describe('parseCommand teaching error', () => {
  it('says session commands are Console-only', () => {
    for (const input of ['session send "hi"', 'SESSION status', 'session']) {
      const result = parseCommand(input);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe(
        '`session` commands run only in the editor Console; they are not part of the editing commands.'
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
    formValues: {} as Record<string, unknown>
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
    })
  };
  return { runs: runs as unknown as RunController, mock: runs, playground, state };
}

const run = (input: string, runs: RunController) => {
  const parsed = parseSessionCommand(input);
  if (!parsed.ok) throw new Error(parsed.error);
  return executeSessionCommand(parsed.command, runs);
};

describe('executeSessionCommand', () => {
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
      expect(result).toMatchObject({ ok: false, error: '409 busy', code: 'SESSION_FAILED' });
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
        turnInputs: { ok: false, missing: [{ id: 'topic', name: 'Topic' }, { id: 'n' }] }
      });
      const result = await run('session run', runs);
      expect(!result.ok && result.error).toContain('Topic, n');
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
