/**
 * Batch retry feedback for the AI Assistant.
 *
 * When a batch of DSL commands finishes with failures — some couldn't be
 * parsed, or one failed to execute and the batch rolled back — the assistant
 * needs concrete, specific feedback to self-correct. This module builds that
 * message.
 *
 * Specificity is the point: the parse-error feedback names the offending text
 * and the exact parser reason. The old generic "provide corrected commands"
 * ask is what made auto-retry on parse errors loop on the same malformed shape
 * — so it was disabled. Pinpointing the failure makes re-enabling it safe.
 *
 * @module chat/batchFeedback
 */

/** A command that could not be parsed, with the reason and its raw text. */
export interface ParseFailure {
  raw: string;
  error: string;
}

/** Summary of how a batch finished, used to build retry feedback. */
export interface BatchOutcome {
  /** Number of commands that executed successfully before stopping. */
  completedCount: number;
  /** Error from the first command that failed to execute, if any. */
  executionError?: string;
  /** Whether the executed commands were rolled back (atomic execution failure). */
  rolledBack: boolean;
  /** Commands that could not be parsed and were skipped. */
  parseErrors: ParseFailure[];
}

/**
 * Build feedback for the assistant after a batch finished with failures.
 *
 * Pinpoints *what* went wrong — the specific parser error and offending text
 * for unparseable commands, and/or the execution error — so the assistant has
 * a concrete, different target to correct.
 */
export function buildRetryFeedback(outcome: BatchOutcome): string {
  const { completedCount, executionError, rolledBack, parseErrors } = outcome;
  const lines: string[] = [];

  if (executionError) {
    lines.push(`A command failed to execute: ${executionError}`);
    lines.push(
      rolledBack && completedCount > 0
        ? `The ${completedCount} command(s) that had succeeded were rolled back, so no changes were applied.`
        : 'No changes were applied.'
    );
  } else if (completedCount > 0) {
    lines.push(`${completedCount} command(s) were applied successfully.`);
  }

  if (parseErrors.length > 0) {
    lines.push(`\n${parseErrors.length} command(s) could not be parsed and were skipped:`);
    for (const pe of parseErrors) {
      const firstLine = pe.raw.split('\n')[0];
      const preview = pe.raw.includes('\n') ? `${firstLine} …` : firstLine;
      lines.push(`  • ${preview}\n    reason: ${pe.error}`);
    }
    lines.push(
      '\nNote: a multiline value must be closed by a matching """ (on its own line or at the end of the last content line). Escape a literal triple-quote inside the value as \\""".'
    );
  }

  if (rolledBack) {
    lines.push('\nPlease re-send the full corrected batch to achieve the original goal.');
  } else {
    lines.push(
      '\nThe successful changes are reflected in the current workflow state. Re-send only corrected versions of the skipped command(s).'
    );
  }

  return lines.join('\n');
}
