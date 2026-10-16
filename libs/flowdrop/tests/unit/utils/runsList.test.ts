import { describe, it, expect } from 'vitest';
import {
  appendRuns,
  canCancelRun,
  canRerunRun,
  expandAdminUrl,
  formatRunDuration,
  formatRunTime,
  hasMoreRuns,
  pageQuery,
  parseRuns,
  runDurationMs,
  runPillStatus,
  type RunSummary
} from '$lib/utils/runsList.js';

const run = (over: Partial<RunSummary> = {}): RunSummary => ({
  id: '1',
  status: 'completed',
  createdAt: '2026-10-09T11:00:00Z',
  lastExecuted: '2026-10-09T11:01:04Z',
  executionCount: 3,
  jobSummary: null,
  ...over
});

describe('runDurationMs', () => {
  it('is lastExecuted minus createdAt for a finished run', () => {
    expect(runDurationMs(run())).toBe(64_000);
  });
  it('is blank while the run has not finished', () => {
    expect(runDurationMs(run({ status: 'running', lastExecuted: null }))).toBeNull();
    expect(runDurationMs(run({ status: 'paused' }))).toBeNull();
  });
  it('is blank for missing, unreadable or negative times', () => {
    expect(runDurationMs(run({ createdAt: null }))).toBeNull();
    expect(runDurationMs(run({ lastExecuted: 'nope' }))).toBeNull();
    expect(runDurationMs(run({ lastExecuted: '2026-10-09T10:00:00Z' }))).toBeNull();
  });
});

describe('formatRunDuration', () => {
  it('formats in the admin pages tiers', () => {
    expect(formatRunDuration(12_000)).toBe('12s');
    expect(formatRunDuration(150_000)).toBe('2m 30s');
    expect(formatRunDuration(null)).toBe('');
  });
});

describe('formatRunTime', () => {
  const now = new Date(2026, 9, 9, 15, 0);
  const labels = { today: 'Today', yesterday: 'Yesterday' };
  const local = (d: number, h: number, m: number) => new Date(2026, 9, d, h, m).toISOString();
  it('names today and yesterday', () => {
    expect(formatRunTime(local(9, 11, 29), now, labels, 'en-GB')).toBe('Today 11:29');
    expect(formatRunTime(local(8, 21, 35), now, labels, 'en-GB')).toBe('Yesterday 21:35');
  });
  it('gives the date for anything older', () => {
    expect(formatRunTime(local(2, 8, 5), now, labels, 'en-GB')).toBe('2 Oct 08:05');
  });
  it('is blank for a missing or unreadable time', () => {
    expect(formatRunTime(null, now, labels)).toBe('');
    expect(formatRunTime('x', now, labels)).toBe('');
  });
});

describe('status helpers', () => {
  it('offers Cancel before the end and Re-run after it', () => {
    for (const s of ['pending', 'running', 'paused', 'interrupted']) {
      expect(canCancelRun(s)).toBe(true);
      expect(canRerunRun(s)).toBe(false);
    }
    for (const s of ['completed', 'failed', 'cancelled']) {
      expect(canCancelRun(s)).toBe(false);
      expect(canRerunRun(s)).toBe(true);
    }
  });
  it('maps statuses onto pills', () => {
    expect(runPillStatus('completed')).toBe('completed');
    expect(runPillStatus('cancelled')).toBe('skipped');
    expect(runPillStatus('paused')).toBe('waiting');
    expect(runPillStatus('running')).toBe('running');
  });
});

describe('paging', () => {
  it('builds a clamped query', () => {
    expect(pageQuery(0)).toBe('limit=20&offset=0');
    expect(pageQuery(40, 500)).toBe('limit=100&offset=40');
    expect(pageQuery(-3, 0)).toBe('limit=1&offset=0');
  });
  it('treats a short page as the end', () => {
    expect(hasMoreRuns(20)).toBe(true);
    expect(hasMoreRuns(19)).toBe(false);
    expect(hasMoreRuns(100, 500)).toBe(true);
  });
  it('appends a page without repeating runs', () => {
    const merged = appendRuns(
      [run({ id: '3' }), run({ id: '2' })],
      [run({ id: '2' }), run({ id: '1' })]
    );
    expect(merged.map((r) => r.id)).toEqual(['3', '2', '1']);
  });
});

describe('parseRuns', () => {
  it('reads the list response', () => {
    const rows = parseRuns({
      pipelines: [
        {
          id: 7,
          status: 'failed',
          createdAt: '2026-10-09T11:00:00+00:00',
          lastExecuted: null,
          executionCount: 2,
          job_status_summary: { total: 2, failed: 1 }
        },
        { nope: true }
      ]
    });
    expect(rows).toEqual([
      {
        id: '7',
        status: 'failed',
        createdAt: '2026-10-09T11:00:00+00:00',
        lastExecuted: null,
        executionCount: 2,
        jobSummary: { total: 2, failed: 1 }
      }
    ]);
    expect(parseRuns(null)).toEqual([]);
  });
});

describe('expandAdminUrl', () => {
  it('fills the placeholders', () => {
    expect(
      expandAdminUrl('/admin/flowdrop/pipelines/{pipelineId}?w={workflowId}', {
        workflowId: 'a b',
        pipelineId: '5'
      })
    ).toBe('/admin/flowdrop/pipelines/5?w=a%20b');
  });
  it('is null without a template or a value', () => {
    expect(expandAdminUrl(undefined, { workflowId: '1' })).toBeNull();
    expect(expandAdminUrl('/x/{pipelineId}', { workflowId: '1' })).toBeNull();
  });
});
