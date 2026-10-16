import { describe, it, expect } from 'vitest';
import { summarizeSteps, parseStepContent } from '$lib/components/playground/stepSummary.js';
import type { PlaygroundMessage } from '$lib/types/playground.js';

let seq = 0;
function log(content: string, extra: Partial<PlaygroundMessage> = {}): PlaygroundMessage {
  seq += 1;
  return {
    id: `l-${seq}`,
    sessionId: 's',
    role: 'log',
    content,
    timestamp: '2026-10-06T10:00:00Z',
    ...extra
  };
}

describe('parseStepContent', () => {
  it('reads outcome and duration from the server wording', () => {
    expect(parseStepContent(log('completed in 42ms'))).toMatchObject({
      status: 'completed',
      durationMs: 42
    });
    expect(parseStepContent(log('completed'))).toMatchObject({
      status: 'completed',
      durationMs: null
    });
    expect(parseStepContent(log('failed: boom'))).toMatchObject({
      status: 'failed',
      error: 'boom'
    });
    expect(parseStepContent(log('paused after 1.5s'))).toMatchObject({
      status: 'waiting',
      durationMs: 1500
    });
  });

  it('keeps unrecognised text as a detail without a status', () => {
    expect(parseStepContent(log('Processing item 1/5'))).toMatchObject({
      status: null,
      detail: 'Processing item 1/5'
    });
  });

  it('prefers structured metadata', () => {
    expect(
      parseStepContent(log('completed in 9ms', { metadata: { status: 'skipped', duration: 3 } }))
    ).toMatchObject({ status: 'skipped', durationMs: 3 });
  });
});

describe('summarizeSteps', () => {
  it('counts steps, sums time and finds the worst status', () => {
    const s = summarizeSteps([
      log('completed in 1ms', { nodeId: 'a' }),
      log('failed: no', { nodeId: 'b', metadata: { nodeLabel: 'B' } }),
      log('paused', { nodeId: 'c' })
    ]);
    expect(s.total).toBe(3);
    expect(s.durationMs).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.waiting).toBe(1);
    expect(s.worst).toBe('failed');
    expect(s.errors).toHaveLength(1);
  });

  it('merges loop repeats into one row with a count and summed time', () => {
    const s = summarizeSteps([
      log('completed in 2ms', { nodeId: 'g', metadata: { nodeLabel: 'Greeter' } }),
      log('completed in 3ms', { nodeId: 'g', metadata: { nodeLabel: 'Greeter' } }),
      log('completed in 4ms', { nodeId: 'g', metadata: { nodeLabel: 'Greeter' } })
    ]);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0]).toMatchObject({ label: 'Greeter', count: 3, durationMs: 9 });
    expect(s.total).toBe(3);
  });

  it('indents nested steps and keeps the parent in the path', () => {
    const s = summarizeSteps([
      log('completed in 1ms', {
        nodeId: 'x',
        metadata: { nodeLabel: 'Greeter' },
        hierarchy: [
          { id: 'w', label: 'Parent' },
          { id: 'g', label: 'Greeter' }
        ]
      })
    ]);
    expect(s.rows[0]).toMatchObject({ depth: 1, path: ['Parent'] });
  });

  it('adds a waiting row for a pending interrupt', () => {
    const s = summarizeSteps(
      [log('completed in 1ms', { nodeId: 'a' })],
      [{ key: 'm1', label: 'Ask' }]
    );
    expect(s.waiting).toBe(1);
    expect(s.rows.at(-1)).toMatchObject({ label: 'Ask', status: 'waiting' });
  });
});
