import { describe, it, expect } from 'vitest';
import { describeLastRun, extractTokens, hasRun, stringifyPayload } from '$lib/utils/lastRun.js';
import type { NodeExecutionInfo } from '$lib/types/index.js';

const info = (extra: Partial<NodeExecutionInfo> = {}): NodeExecutionInfo => ({
  status: 'completed',
  executionCount: 1,
  isExecuting: false,
  ...extra
});

describe('hasRun', () => {
  it('is false for no info, idle and pending', () => {
    expect(hasRun(undefined)).toBe(false);
    expect(hasRun(info({ status: 'idle' }))).toBe(false);
    expect(hasRun(info({ status: 'pending' }))).toBe(false);
  });
  it('is true once the node started', () => {
    for (const status of ['running', 'completed', 'failed', 'interrupted', 'skipped'] as const) {
      expect(hasRun(info({ status }))).toBe(true);
    }
  });
});

describe('extractTokens', () => {
  it('reads the shapes model nodes use', () => {
    expect(extractTokens({ total_tokens: 7 })).toBe(7);
    expect(extractTokens({ tokens: 3 })).toBe(3);
    expect(extractTokens({ usage: { total_tokens: 9 } })).toBe(9);
    expect(extractTokens({ usage: { input_tokens: 10, output_tokens: 32 } })).toBe(42);
    expect(extractTokens({ metadata: { usage: { prompt_tokens: 1, completion_tokens: 2 } } })).toBe(
      3
    );
  });
  it('is null when there is none', () => {
    expect(extractTokens(undefined)).toBeNull();
    expect(extractTokens('text')).toBeNull();
    expect(extractTokens({ text: 'x' })).toBeNull();
    expect(extractTokens({ tokens: 'many' })).toBeNull();
  });
});

describe('stringifyPayload', () => {
  it('keeps strings, indents objects, drops empties', () => {
    expect(stringifyPayload('hi')).toBe('hi');
    expect(stringifyPayload({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(stringifyPayload(null)).toBeNull();
    expect(stringifyPayload('')).toBeNull();
  });
});

describe('describeLastRun', () => {
  it('is null for a node that did not run', () => {
    expect(describeLastRun(undefined)).toBeNull();
    expect(describeLastRun(info({ status: 'idle', executionCount: 0 }))).toBeNull();
  });

  it('describes the node summary', () => {
    const view = describeLastRun(
      info({ lastExecuted: '2026-01-01T00:00:02Z', lastExecutionDuration: 1500 })
    )!;
    expect(view.status).toBe('completed');
    expect(view.durationLabel).toBe('1.5 s');
    expect(view.completed).toBe('2026-01-01T00:00:02Z');
    expect(view.input).toBeNull();
    expect(view.error).toBeNull();
  });

  it('prefers the last job and its precise duration', () => {
    const view = describeLastRun(
      info({
        executionCount: 2,
        lastExecutionDuration: 5,
        jobs: [
          { status: 'completed', executionTimeUs: 100, output: 'first' },
          {
            status: 'completed',
            executionTimeUs: 2500,
            started: 's',
            completed: 'c',
            input: { q: 1 },
            output: { text: 'ok', usage: { total_tokens: 12 } }
          }
        ]
      })
    )!;
    expect(view.executions).toBe(2);
    expect(view.durationLabel).toBe('2.5 ms');
    expect(view.started).toBe('s');
    expect(view.input).toContain('"q": 1');
    expect(view.tokens).toBe(12);
  });

  it('carries the error', () => {
    const view = describeLastRun(info({ status: 'failed', lastError: 'boom' }))!;
    expect(view.error).toBe('boom');
  });
});
