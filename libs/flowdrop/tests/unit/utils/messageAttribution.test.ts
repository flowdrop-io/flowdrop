/**
 * Unit Tests - Playground Message Attribution Helper
 *
 * Covers the resolveMessageAttribution() fallback chain and truncateId()
 * edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveMessageAttribution,
  truncateId
} from '$lib/utils/messageAttribution.js';
import type { PlaygroundExecution, PlaygroundMessage } from '$lib/types/playground.js';

function makeExecution(overrides: Partial<PlaygroundExecution> = {}): PlaygroundExecution {
  return {
    id: 'exec-1',
    startedAt: '2026-01-01T00:00:00Z',
    status: 'completed',
    ...overrides
  };
}

function makeMessage(overrides: Partial<PlaygroundMessage> = {}): PlaygroundMessage {
  return {
    id: 'msg-1',
    sessionId: 'sess-1',
    role: 'assistant',
    content: 'hello',
    timestamp: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

describe('truncateId', () => {
  it('returns the original id when shorter than length', () => {
    expect(truncateId('short')).toBe('short');
  });

  it('returns the original id when equal to length', () => {
    expect(truncateId('abcdefgh')).toBe('abcdefgh');
  });

  it('truncates ids longer than the default length', () => {
    expect(truncateId('abcdefghij')).toBe('abcdefgh');
  });

  it('respects a custom length', () => {
    expect(truncateId('abcdefghij', 4)).toBe('abcd');
  });

  it('handles empty string without throwing', () => {
    expect(truncateId('')).toBe('');
  });
});

describe('resolveMessageAttribution', () => {
  describe('run resolution', () => {
    it("prefers execution.label over the computed 'Run #N'", () => {
      const executions = [makeExecution({ id: 'exec-1', label: 'My Custom Run' })];
      const result = resolveMessageAttribution(makeMessage({ executionId: 'exec-1' }), executions);
      expect(result.runLabel).toBe('My Custom Run');
      expect(result.runNumber).toBe(1);
    });

    it("computes 'Run #N' from 1-based ordinal in executions[]", () => {
      const executions = [
        makeExecution({ id: 'exec-1' }),
        makeExecution({ id: 'exec-2' }),
        makeExecution({ id: 'exec-3' })
      ];
      const result = resolveMessageAttribution(makeMessage({ executionId: 'exec-2' }), executions);
      expect(result.runLabel).toBe('Run #2');
      expect(result.runNumber).toBe(2);
    });

    it("falls back to 'Run · {prefix}' when executionId isn't in executions[]", () => {
      const result = resolveMessageAttribution(
        makeMessage({ executionId: 'orphan-exec-id-12345' }),
        [makeExecution({ id: 'exec-1' })]
      );
      expect(result.runLabel).toBe('Run · orphan-e');
      expect(result.runNumber).toBeUndefined();
      expect(result.runId).toBe('orphan-exec-id-12345');
    });

    it('returns undefined runId/runLabel when the message has no executionId', () => {
      const result = resolveMessageAttribution(makeMessage({ executionId: null }), [
        makeExecution()
      ]);
      expect(result.runId).toBeUndefined();
      expect(result.runLabel).toBeUndefined();
      expect(result.runNumber).toBeUndefined();
    });

    it('handles undefined executions[] safely', () => {
      const result = resolveMessageAttribution(makeMessage({ executionId: 'exec-1' }), undefined);
      expect(result.runId).toBe('exec-1');
      expect(result.runLabel).toBe('Run · exec-1');
      expect(result.runNumber).toBeUndefined();
    });

    it('handles empty executions[] safely', () => {
      const result = resolveMessageAttribution(makeMessage({ executionId: 'exec-1' }), []);
      expect(result.runLabel).toBe('Run · exec-1');
      expect(result.runNumber).toBeUndefined();
    });
  });

  describe('workflow resolution', () => {
    it('uses explicit message.workflowId over execution.workflowId', () => {
      const executions = [
        makeExecution({ id: 'exec-1', workflowId: 'parent-wf', workflowLabel: 'Parent' })
      ];
      const result = resolveMessageAttribution(
        makeMessage({ executionId: 'exec-1', workflowId: 'sub-wf' }),
        executions
      );
      expect(result.workflowId).toBe('sub-wf');
    });

    it("falls back to execution.workflowId when message doesn't have one", () => {
      const executions = [makeExecution({ id: 'exec-1', workflowId: 'parent-wf' })];
      const result = resolveMessageAttribution(makeMessage({ executionId: 'exec-1' }), executions);
      expect(result.workflowId).toBe('parent-wf');
    });

    it('returns undefined workflow fields when nothing resolves', () => {
      const result = resolveMessageAttribution(makeMessage({ executionId: 'exec-1' }), [
        makeExecution({ id: 'exec-1' })
      ]);
      expect(result.workflowId).toBeUndefined();
      expect(result.workflowLabel).toBeUndefined();
    });

    it('prefers message.metadata.workflowLabel over execution.workflowLabel', () => {
      const executions = [
        makeExecution({ id: 'exec-1', workflowId: 'wf-1', workflowLabel: 'Execution Label' })
      ];
      const result = resolveMessageAttribution(
        makeMessage({
          executionId: 'exec-1',
          workflowId: 'sub-wf',
          metadata: { workflowLabel: 'Message Label' }
        }),
        executions
      );
      expect(result.workflowLabel).toBe('Message Label');
    });

    it('falls back to execution.workflowLabel when message has none', () => {
      const executions = [
        makeExecution({ id: 'exec-1', workflowId: 'wf-1', workflowLabel: 'Execution Label' })
      ];
      const result = resolveMessageAttribution(makeMessage({ executionId: 'exec-1' }), executions);
      expect(result.workflowLabel).toBe('Execution Label');
    });

    it('falls back to truncated workflowId when no label is available', () => {
      const executions = [makeExecution({ id: 'exec-1', workflowId: 'long-workflow-id-12345' })];
      const result = resolveMessageAttribution(makeMessage({ executionId: 'exec-1' }), executions);
      expect(result.workflowLabel).toBe('long-wor');
    });

    it('still resolves workflow when execution is missing but message has one', () => {
      const result = resolveMessageAttribution(
        makeMessage({ executionId: 'exec-1', workflowId: 'sub-wf' }),
        []
      );
      expect(result.workflowId).toBe('sub-wf');
      expect(result.workflowLabel).toBe('sub-wf');
    });
  });
});
