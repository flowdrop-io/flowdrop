import { describe, it, expect } from 'vitest';
import {
  isPlaygroundSession,
  playgroundSessionsOf,
  isRunStale,
  versionDividersFromRuns,
  placeVersionDividers
} from '$lib/utils/sessionRuns.js';
import type {
  PlaygroundMessage,
  PlaygroundSession,
  SessionRun,
  VersionDivider
} from '$lib/types/playground.js';

function session(
  id: string,
  settings?: PlaygroundSession['thirdPartySettings']
): PlaygroundSession {
  return {
    id,
    workflowId: 'wf',
    name: id,
    status: 'idle',
    createdAt: '',
    updatedAt: '',
    ...(settings !== undefined && { thirdPartySettings: settings })
  };
}

function run(id: string, workflowVersion: string | null): SessionRun {
  return {
    id,
    startedAt: null,
    completedAt: null,
    status: 'completed',
    workflowVersion,
    message: null,
    inputs: {},
    inputsTruncated: false
  };
}

function msg(id: string, executionId?: string): PlaygroundMessage {
  return {
    id,
    sessionId: 's',
    role: 'assistant',
    content: id,
    timestamp: '',
    executionId
  };
}

describe('the Playground mark', () => {
  it('reads flowdrop_playground.created === true', () => {
    expect(isPlaygroundSession(session('a', { flowdrop_playground: { created: true } }))).toBe(
      true
    );
    expect(isPlaygroundSession(session('a', { flowdrop_playground: { created: false } }))).toBe(
      false
    );
    expect(isPlaygroundSession(session('a', { other: { created: true } }))).toBe(false);
    expect(isPlaygroundSession(session('a', {}))).toBe(false);
    expect(isPlaygroundSession(session('a'))).toBe(false);
  });

  it('keeps marked sessions once the server exposes the settings', () => {
    const list = [
      session('a', { flowdrop_playground: { created: true } }),
      session('b', {}),
      session('c', { flowdrop_session: { x: 1 } })
    ];
    expect(playgroundSessionsOf(list).map((s) => s.id)).toEqual(['a']);
  });

  it('keeps everything from a server that sends no settings at all', () => {
    expect(playgroundSessionsOf([session('a'), session('b')]).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('returns nothing for an empty list', () => {
    expect(playgroundSessionsOf([])).toEqual([]);
  });
});

describe('isRunStale', () => {
  it('is stale only when both versions are known and differ', () => {
    expect(isRunStale('v1', 'v2')).toBe(true);
    expect(isRunStale('v1', 'v1')).toBe(false);
    expect(isRunStale(null, 'v2')).toBe(false);
    expect(isRunStale(undefined, 'v2')).toBe(false);
    expect(isRunStale('v1', null)).toBe(false);
  });
});

describe('versionDividersFromRuns', () => {
  const anchors = (d: VersionDivider[]) => d.map((x) => x.anchor);

  it('puts a divider above a run whose version differs from the one before', () => {
    const dividers = versionDividersFromRuns({
      workflowVersion: 'v3',
      runs: [run('a', 'v1'), run('b', 'v1'), run('c', 'v2'), run('d', 'v3')]
    });
    expect(anchors(dividers)).toEqual([
      { kind: 'before-run', runId: 'c' },
      { kind: 'before-run', runId: 'd' }
    ]);
  });

  it('shows none when every run ran on the current version', () => {
    expect(
      versionDividersFromRuns({ workflowVersion: 'v1', runs: [run('a', 'v1'), run('b', 'v1')] })
    ).toEqual([]);
  });

  it('never compares an unknown version: nothing around null makes a divider', () => {
    expect(
      versionDividersFromRuns({ workflowVersion: null, runs: [run('a', null), run('b', null)] })
    ).toEqual([]);
    expect(
      versionDividersFromRuns({ workflowVersion: 'v1', runs: [run('a', null), run('b', 'v1')] })
    ).toEqual([]);
  });

  it('skips an unknown run between two known ones and compares across it', () => {
    const dividers = versionDividersFromRuns({
      workflowVersion: 'v2',
      runs: [run('a', 'v1'), run('b', null), run('c', 'v2')]
    });
    expect(anchors(dividers)).toEqual([{ kind: 'before-run', runId: 'c' }]);
  });

  it('adds one at the end when the workflow changed since the last run', () => {
    expect(
      anchors(versionDividersFromRuns({ workflowVersion: 'v2', runs: [run('a', 'v1')] }))
    ).toEqual([{ kind: 'end' }]);
  });

  it('adds no end divider when the current version is unknown or there are no runs', () => {
    expect(versionDividersFromRuns({ workflowVersion: null, runs: [run('a', 'v1')] })).toEqual([]);
    expect(versionDividersFromRuns({ workflowVersion: 'v1', runs: [] })).toEqual([]);
  });
});

describe('placeVersionDividers', () => {
  const all = [msg('m1', 'p1'), msg('m2', 'p1'), msg('m3', 'p2'), msg('m4', 'p2')];

  it('puts a before-run divider after the message preceding the run', () => {
    const placed = placeVersionDividers(
      [{ id: 'd', anchor: { kind: 'before-run', runId: 'p2' } }],
      all,
      all
    );
    expect([...placed.keys()]).toEqual(['m2']);
  });

  it('puts an after-message divider after that message, and an end divider last', () => {
    const placed = placeVersionDividers(
      [
        { id: 'a', anchor: { kind: 'after-message', messageId: 'm1' } },
        { id: 'e', anchor: { kind: 'end' } }
      ],
      all,
      all
    );
    expect([...placed.keys()].sort()).toEqual(['m1', 'm4']);
  });

  it('follows the last visible message when the anchor is hidden', () => {
    const visible = [all[0], all[2], all[3]];
    const placed = placeVersionDividers(
      [{ id: 'a', anchor: { kind: 'after-message', messageId: 'm2' } }],
      all,
      visible
    );
    expect([...placed.keys()]).toEqual(['m1']);
  });

  it('leaves out a divider whose run is not loaded, or that would sit above everything', () => {
    const placed = placeVersionDividers(
      [
        { id: 'x', anchor: { kind: 'before-run', runId: 'gone' } },
        { id: 'y', anchor: { kind: 'before-run', runId: 'p1' } },
        { id: 'z', anchor: { kind: 'after-message', messageId: 'nope' } }
      ],
      all,
      all
    );
    expect(placed.size).toBe(0);
  });

  it('collapses dividers at one place into one', () => {
    const placed = placeVersionDividers(
      [
        { id: 'a', anchor: { kind: 'after-message', messageId: 'm4' } },
        { id: 'e', anchor: { kind: 'end' } }
      ],
      all,
      all
    );
    expect(placed.size).toBe(1);
  });

  it('finds a run through its root pipeline too (sub-flow messages)', () => {
    const sub = [msg('m1', 'p1'), { ...msg('m2', 'child'), rootPipelineId: 'p2' }];
    const placed = placeVersionDividers(
      [{ id: 'd', anchor: { kind: 'before-run', runId: 'p2' } }],
      sub,
      sub
    );
    expect([...placed.keys()]).toEqual(['m1']);
  });
});
