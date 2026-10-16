import { describe, it, expect } from 'vitest';
import { playgroundInputRuns, summarizeRunInputs } from '$lib/utils/playgroundInputRuns.js';
import type { PlaygroundMessage } from '$lib/types/playground.js';
import type { WorkflowInterfaceEntry } from '$lib/types/index.js';

const entries: WorkflowInterfaceEntry[] = [
  { id: 'topic', name: 'Topic', dataType: 'string', bindings: [] },
  { id: 'tags', dataType: 'array', bindings: [] }
];

const message = (
  id: string,
  role: PlaygroundMessage['role'],
  metadata?: PlaygroundMessage['metadata']
): PlaygroundMessage => ({
  id,
  sessionId: 's',
  role,
  content: '',
  timestamp: '2026-10-06T10:00:00Z',
  sequenceNumber: 1,
  metadata
});

describe('playgroundInputRuns', () => {
  it('lists user turns that carried inputs, newest first', () => {
    const runs = playgroundInputRuns(
      [
        message('a', 'user', { inputs: { topic: 'dogs' } }),
        message('b', 'assistant', { inputs: { topic: 'ignored' } }),
        message('c', 'user'),
        message('d', 'user', { inputs: {} }),
        message('e', 'user', { inputs: { topic: 'cats' } })
      ],
      entries
    );
    expect(runs.map((run) => run.id)).toEqual(['e', 'a']);
    expect(runs[0].inputs).toEqual({ topic: 'cats' });
  });

  it('drops inputs the interface no longer has, and runs left with none', () => {
    const runs = playgroundInputRuns(
      [
        message('a', 'user', { inputs: { gone: 1 } }),
        message('b', 'user', { inputs: { topic: 'x', gone: 1 } })
      ],
      entries
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].inputs).toEqual({ topic: 'x' });
  });

  it('caps the list', () => {
    const messages = Array.from({ length: 9 }, (_, i) =>
      message(`m${i}`, 'user', { inputs: { topic: String(i) } })
    );
    expect(playgroundInputRuns(messages, entries, 3).map((run) => run.id)).toEqual([
      'm8',
      'm7',
      'm6'
    ]);
  });
});

describe('summarizeRunInputs', () => {
  it('names inputs by their label and shortens long values to one line', () => {
    const summary = summarizeRunInputs({ topic: 'cats', tags: ['a', 'b'] }, entries);
    expect(summary).toBe('Topic: cats · tags: ["a","b"]');
    expect(summarizeRunInputs({ topic: 'x'.repeat(80) }, entries).length).toBeLessThan(60);
  });
});
