/** Console `mode`, `runs`, `save`, `export` commands. */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/lib/services/runsService.js', () => ({
  runsSupport: vi.fn(() => ({ list: true, rerun: true, cancel: true })),
  listRuns: vi.fn(),
  rerunRun: vi.fn(),
  cancelRun: vi.fn()
}));

import {
  parseConsoleLine,
  executeConsoleCommand,
  isConsoleLine,
  testModeBlocker,
  type ConsoleHost,
  type ConsoleInstance
} from '../../../src/lib/commands/index.js';
import * as runsService from '../../../src/lib/services/runsService.js';

const runRow = (id: string, status: string) => ({
  id,
  status,
  createdAt: '2026-11-18T10:00:00Z',
  lastExecuted: null,
  executionCount: 2,
  jobSummary: null
});

function setup(
  opts: { workflowId?: string | null; mode?: 'edit' | 'test'; blocker?: string | null } = {}
) {
  const state = { mode: opts.mode ?? 'edit', opened: null as string | null };
  const fd = {
    editorMode: {
      get current() {
        return state.mode;
      },
      get testBlocker() {
        return opts.blocker ?? null;
      },
      get effective() {
        return state.mode === 'test' && opts.blocker ? 'edit' : state.mode;
      },
      set: vi.fn((m: 'edit' | 'test') => {
        state.mode = m;
      })
    },
    workflow: {
      current: opts.workflowId === null ? null : { id: opts.workflowId ?? 'wf', name: 'My flow' }
    },
    api: { config: { endpoints: {} }, authProvider: undefined },
    runs: {
      get openedRunId() {
        return state.opened;
      },
      openRun: vi.fn((id: string) => {
        state.opened = id;
      }),
      dismissRun: vi.fn(() => {
        state.opened = null;
      })
    }
  };
  const host: ConsoleHost = {
    save: vi.fn().mockResolvedValue({ ok: true }),
    export: vi.fn().mockResolvedValue(true)
  };
  return { fd, host, state };
}

const run = (input: string, s: ReturnType<typeof setup>) => {
  const parsed = parseEditorLaneCommand(input);
  if (!parsed.ok) throw new Error(parsed.error);
  return executeConsoleCommand(parsed.command, s.fd as unknown as ConsoleInstance, s.host);
};

const parseEditorLaneCommand = (input: string) => parseConsoleLine(input);

describe('parse mode, runs, save and export lines', () => {
  it('recognises lines by first word', () => {
    for (const line of ['mode', 'Mode test', 'runs list', 'save', 'EXPORT', 'session list']) {
      expect(isConsoleLine(line), line).toBe(true);
    }
    for (const line of ['saved', 'add runs', 'modes', 'sessions']) {
      expect(isConsoleLine(line), line).toBe(false);
    }
  });

  it('parses mode, runs, save and export', () => {
    expect(parseEditorLaneCommand('mode')).toMatchObject({ command: { type: 'mode_show' } });
    expect(parseEditorLaneCommand('MODE Test')).toMatchObject({
      command: { type: 'mode_set', mode: 'test' }
    });
    expect(parseEditorLaneCommand('runs')).toMatchObject({ command: { type: 'runs_list' } });
    expect(parseEditorLaneCommand('runs open 12')).toMatchObject({
      command: { type: 'runs_open', id: '12' }
    });
    expect(parseEditorLaneCommand('runs dismiss')).toMatchObject({
      command: { type: 'runs_dismiss', id: undefined }
    });
    expect(parseEditorLaneCommand('save')).toMatchObject({ command: { type: 'save' } });
    expect(parseEditorLaneCommand('export')).toMatchObject({ command: { type: 'export' } });
  });

  it('rejects malformed lines', () => {
    for (const line of [
      'mode both',
      'mode edit now',
      'runs open',
      'runs open a b',
      'runs dance',
      'runs list x',
      'save now',
      'export it'
    ]) {
      expect(parseEditorLaneCommand(line).ok, line).toBe(false);
    }
  });
});

describe('testModeBlocker', () => {
  const ok = {
    testModeFeature: true,
    editable: true,
    isPipelineView: false,
    hasSavedWorkflow: true
  };
  it('is null when every condition holds, and names the first that fails', () => {
    expect(testModeBlocker(ok)).toBeNull();
    expect(testModeBlocker({ ...ok, testModeFeature: false })).toContain('turned off');
    expect(testModeBlocker({ ...ok, editable: false })).toContain('read-only');
    expect(testModeBlocker({ ...ok, isPipelineView: true })).toContain('pipeline');
    expect(testModeBlocker({ ...ok, hasSavedWorkflow: false })).toContain('Save the workflow');
  });
});

describe('mode', () => {
  it('shows the mode and availability', async () => {
    const s = setup();
    expect(await run('mode', s)).toEqual({ ok: true, message: 'Mode: edit. Test is available.' });
    const blocked = setup({ blocker: 'Save the workflow first.' });
    const result = await run('mode', blocked);
    expect(result.ok && result.message).toContain(
      'Test is not available: Save the workflow first.'
    );
  });

  it('switches mode through the store', async () => {
    const s = setup();
    const result = await run('mode test', s);
    expect(result.ok).toBe(true);
    expect(s.fd.editorMode.set).toHaveBeenCalledWith('test');
    expect(await run('mode test', s)).toEqual({ ok: true, message: 'Already in test mode.' });
    expect(s.fd.editorMode.set).toHaveBeenCalledTimes(1);
    await run('mode edit', s);
    expect(s.state.mode).toBe('edit');
  });

  it('fails with the reason when Test is held back', async () => {
    const s = setup({ blocker: 'Save the workflow first.' });
    const result = await run('mode test', s);
    expect(result).toMatchObject({ ok: false, error: 'Save the workflow first.' });
    expect(s.fd.editorMode.set).not.toHaveBeenCalled();
  });

  it('still lets you leave a held-back Test request with mode edit', async () => {
    const s = setup({ blocker: 'nope', mode: 'test' });
    expect(await run('mode', s)).toMatchObject({
      ok: true,
      message: expect.stringMatching(/^Mode: edit\./)
    });
    const left = await run('mode edit', s);
    expect(left).toEqual({
      ok: true,
      message: 'Cleared the pending Test request; staying in edit mode.'
    });
    expect(s.fd.editorMode.set).toHaveBeenCalledWith('edit');
  });
});

describe('runs', () => {
  beforeEach(() => {
    vi.mocked(runsService.listRuns).mockResolvedValue([
      runRow('101', 'completed'),
      runRow('102', 'running'),
      runRow('2000', 'failed')
    ]);
    vi.mocked(runsService.rerunRun).mockResolvedValue({ ok: true, pipelineId: '300' });
    vi.mocked(runsService.cancelRun).mockResolvedValue({ ok: true });
  });

  it('lists runs', async () => {
    const result = await run('runs', setup());
    expect(result.ok && result.message).toContain('3 runs');
    expect(result.ok && result.message).toContain('102');
  });

  it('needs a saved workflow and a listing backend', async () => {
    expect(await run('runs', setup({ workflowId: null }))).toMatchObject({
      ok: false,
      code: 'NO_WORKFLOW'
    });
    vi.mocked(runsService.runsSupport).mockReturnValueOnce({
      list: false,
      rerun: false,
      cancel: false
    });
    expect((await run('runs', setup())).ok).toBe(false);
  });

  it('reports a failed read', async () => {
    vi.mocked(runsService.listRuns).mockRejectedValue(new Error('down'));
    const result = await run('runs list', setup());
    expect(!result.ok && result.error).toContain('down');
  });

  it('opens a run by its full id; a numeric id is never a prefix', async () => {
    const s = setup();
    expect((await run('runs open 2000', s)).ok).toBe(true);
    expect(s.fd.runs.openRun).toHaveBeenCalledWith('2000', 'failed');
    const partial = await run('runs open 20', s);
    expect(!partial.ok && partial.error).toContain('numeric id must be typed in full');
    expect((await run('runs open 9', s)).ok).toBe(false);
    // exact id wins over being a prefix of others
    expect((await run('runs open 101', s)).ok).toBe(true);
  });

  it('opens by unique prefix when the ids are not numeric', async () => {
    vi.mocked(runsService.listRuns).mockResolvedValue([
      runRow('abc-1', 'completed'),
      runRow('abd-2', 'completed')
    ]);
    const s = setup();
    expect((await run('runs open abd', s)).ok).toBe(true);
    expect(s.fd.runs.openRun).toHaveBeenCalledWith('abd-2', 'completed');
    const ambiguous = await run('runs open ab', s);
    expect(!ambiguous.ok && ambiguous.error).toContain('matches 2');
  });

  it('cancel and rerun take only the full id, even for a unique prefix', async () => {
    vi.mocked(runsService.listRuns).mockResolvedValue([
      runRow('abc-1', 'running'),
      runRow('xyz-2', 'completed')
    ]);
    const s = setup();
    const cancel = await run('runs cancel abc', s);
    expect(cancel).toMatchObject({ ok: false, code: 'CONSOLE_REFUSED' });
    expect(!cancel.ok && cancel.error).toContain('full id');
    expect((await run('runs rerun xyz', s)).ok).toBe(false);
    expect(runsService.cancelRun).not.toHaveBeenCalled();
    expect(runsService.rerunRun).not.toHaveBeenCalled();
    expect((await run('runs cancel abc-1', s)).ok).toBe(true);
  });

  it('reruns a finished run and opens the new one; refuses a live one', async () => {
    const s = setup();
    expect((await run('runs rerun 101', s)).ok).toBe(true);
    expect(runsService.rerunRun).toHaveBeenCalledWith(expect.anything(), '101', undefined);
    expect(s.fd.runs.openRun).toHaveBeenCalledWith('300', 'running');
    expect((await run('runs rerun 102', s)).ok).toBe(false);
  });

  it('cancels a live run; refuses a finished one; passes on failure', async () => {
    const s = setup();
    expect((await run('runs cancel 102', s)).ok).toBe(true);
    expect((await run('runs cancel 101', s)).ok).toBe(false);
    vi.mocked(runsService.cancelRun).mockResolvedValue({ ok: false, message: 'denied' });
    const denied = await run('runs cancel 102', s);
    expect(!denied.ok && denied.error).toBe('denied');
  });

  it('dismisses the shown run', async () => {
    const s = setup();
    expect((await run('runs dismiss', s)).ok).toBe(false);
    s.state.opened = '101';
    expect((await run('runs dismiss 555', s)).ok).toBe(false);
    expect((await run('runs dismiss 10', s)).ok).toBe(false);
    expect((await run('runs dismiss 101', s)).ok).toBe(true);
    expect(s.fd.runs.dismissRun).toHaveBeenCalled();
  });
});

describe('save and export', () => {
  it('saves and reports success or failure', async () => {
    const s = setup();
    expect(await run('save', s)).toEqual({ ok: true, message: 'Workflow saved.' });
    vi.mocked(s.host.save!).mockResolvedValue({ ok: false, reason: 'The editor is locked.' });
    const failed = await run('save', s);
    expect(failed).toMatchObject({
      ok: false,
      code: 'CONSOLE_REFUSED',
      error: 'The editor is locked.'
    });
  });

  it('reports a save that throws and a missing host function', async () => {
    const s = setup();
    vi.mocked(s.host.save!).mockRejectedValue(new Error('network'));
    expect(await run('save', s)).toMatchObject({ ok: false, error: 'network' });
    const bare = setup();
    bare.host = {};
    expect((await run('save', bare)).ok).toBe(false);
    expect((await run('export', bare)).ok).toBe(false);
  });

  it('exports', async () => {
    const s = setup();
    const result = await run('export', s);
    expect(result.ok && result.message).toContain('My flow');
    expect(s.host.export).toHaveBeenCalled();
    vi.mocked(s.host.export!).mockResolvedValue(false);
    expect(await run('export', s)).toMatchObject({ ok: false, code: 'CONSOLE_FAILED' });
    expect((await run('export', setup({ workflowId: null }))).ok).toBe(false);
  });
});
