import { describe, it, expect } from 'vitest';
import { historyGroups } from '$lib/utils/playgroundHistory.js';
import type { PlaygroundSession, SessionRun } from '$lib/types/playground.js';

const session = (id: string, name: string): PlaygroundSession =>
  ({ id, name, workflowId: 'wf', status: 'idle' }) as PlaygroundSession;

const run = (id: string, version: string | null, message: string | null = null): SessionRun => ({
  id,
  startedAt: null,
  completedAt: null,
  status: 'completed',
  workflowVersion: version,
  message,
  inputs: {},
  inputsTruncated: false
});

describe('historyGroups', () => {
  it('lists the conversations in order and marks the open one', () => {
    const groups = historyGroups([session('a', 'First'), session('b', 'Second')], 'b', null);

    expect(groups.conversations).toEqual([
      { id: 'a', name: 'First', current: false },
      { id: 'b', name: 'Second', current: true }
    ]);
  });

  it('has no runs without a runs result', () => {
    expect(historyGroups([], null, null).runs).toEqual([]);
    expect(historyGroups([], null, undefined).runs).toEqual([]);
  });

  it('lists the runs newest first, numbered from the oldest', () => {
    const groups = historyGroups(
      [session('a', 'A')],
      'a',
      { workflowVersion: 'v2', runs: [run('r1', 'v2'), run('r2', 'v2'), run('r3', 'v2')] },
      'r2'
    );

    expect(groups.runs.map((r) => [r.id, r.number, r.shown])).toEqual([
      ['r3', 3, false],
      ['r2', 2, true],
      ['r1', 1, false]
    ]);
  });

  it('marks runs of another workflow version as stale', () => {
    const groups = historyGroups([], 'a', {
      workflowVersion: 'v3',
      runs: [run('r1', 'v1'), run('r2', 'v3')]
    });

    expect(groups.runs.map((r) => [r.id, r.stale])).toEqual([
      ['r2', false],
      ['r1', true]
    ]);
  });

  it('never marks a run stale when either version is unknown', () => {
    const unknownRun = historyGroups([], 'a', {
      workflowVersion: 'v3',
      runs: [run('r1', null)]
    });
    const unknownCurrent = historyGroups([], 'a', {
      workflowVersion: null,
      runs: [run('r1', 'v1')]
    });

    expect(unknownRun.runs[0].stale).toBe(false);
    expect(unknownCurrent.runs[0].stale).toBe(false);
  });

  it('keeps what started a run and does not mutate its arguments', () => {
    const result = { workflowVersion: 'v1', runs: [run('r1', 'v1', 'hello'), run('r2', 'v1')] };
    const copy = JSON.parse(JSON.stringify(result));

    const groups = historyGroups([], 'a', result);

    expect(groups.runs.find((r) => r.id === 'r1')?.message).toBe('hello');
    expect(result).toEqual(copy);
  });
});
