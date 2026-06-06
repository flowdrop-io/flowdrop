import { describe, it, expect } from 'vitest';
import { buildRetryFeedback } from '$lib/chat/batchFeedback.js';

describe('buildRetryFeedback', () => {
  it('pinpoints each unparseable command with its reason (the fix for the silent refuse)', () => {
    const msg = buildRetryFeedback({
      completedCount: 2,
      executionError: undefined,
      rolledBack: false,
      parseErrors: [
        {
          raw: 'set node:prompt """\nhello',
          error: 'Unclosed """ block — missing closing """ on its own line'
        }
      ]
    });

    // Reports what applied, names the bad command + reason, and asks for a
    // targeted resend (not a full-batch redo, since the rest is applied).
    expect(msg).toContain('2 command(s) were applied successfully');
    expect(msg).toContain('1 command(s) could not be parsed and were skipped');
    expect(msg).toContain('reason: Unclosed """ block');
    expect(msg).toContain('Re-send only corrected versions');
    expect(msg).not.toContain('re-send the full corrected batch');
  });

  it('truncates multiline offending text to its first line + ellipsis', () => {
    const msg = buildRetryFeedback({
      completedCount: 0,
      rolledBack: false,
      parseErrors: [{ raw: 'set n:k """\nline two\nline three', error: 'bad' }]
    });
    expect(msg).toContain('• set n:k """ …');
    expect(msg).not.toContain('line two');
  });

  it('describes an execution rollback and asks for a full resend', () => {
    const msg = buildRetryFeedback({
      completedCount: 3,
      executionError: 'Node not found: llm_node.2',
      rolledBack: true,
      parseErrors: []
    });
    expect(msg).toContain('A command failed to execute: Node not found: llm_node.2');
    expect(msg).toContain('3 command(s) that had succeeded were rolled back');
    expect(msg).toContain('Please re-send the full corrected batch');
  });

  it('combines execution failure and parse errors into one report', () => {
    const msg = buildRetryFeedback({
      completedCount: 1,
      executionError: 'Port not found',
      rolledBack: true,
      parseErrors: [{ raw: 'connetc a to b', error: 'Unknown command: connetc' }]
    });
    expect(msg).toContain('A command failed to execute: Port not found');
    expect(msg).toContain('could not be parsed');
    expect(msg).toContain('Unknown command: connetc');
  });

  it('handles a fully-unparseable batch (nothing applied)', () => {
    const msg = buildRetryFeedback({
      completedCount: 0,
      rolledBack: false,
      parseErrors: [{ raw: 'garbage', error: 'Unknown command: garbage' }]
    });
    expect(msg).not.toContain('applied successfully');
    expect(msg).toContain('could not be parsed');
  });
});
