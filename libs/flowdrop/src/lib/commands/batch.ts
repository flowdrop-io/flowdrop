/**
 * Batch Command Executor
 *
 * Executes multiple commands as a single atomic operation wrapped in a
 * transaction. A single undo reverts the entire batch.
 *
 * @module commands/batch
 */

import type { Command, CommandContext, BatchResult } from "./types.js";
import { executeCommand } from "./executor.js";

/**
 * Execute an array of commands as a single atomic transaction.
 *
 * - Calls dispatch.startTransaction() before the first command
 * - Re-reads workflow via context.getWorkflow() before each command
 * - On success of all: calls dispatch.commitTransaction()
 * - On first error: calls dispatch.cancelTransaction() and stops
 */
export function executeBatch(
  commands: Command[],
  context: CommandContext,
): BatchResult {
  const totalCount = commands.length;

  if (totalCount === 0) {
    return {
      ok: true,
      results: [],
      completedCount: 0,
      totalCount: 0,
    };
  }

  const description =
    totalCount === 1
      ? `batch: 1 command`
      : `batch: ${totalCount} commands`;

  context.dispatch.startTransaction(description);

  const results: BatchResult["results"] = [];

  for (let i = 0; i < commands.length; i++) {
    // Re-read workflow before each command to avoid stale state
    // (context.getWorkflow() is live, so this ensures fresh data)
    const result = executeCommand(commands[i], context);
    results.push(result);

    if (!result.ok) {
      context.dispatch.cancelTransaction();
      return {
        ok: false,
        results,
        completedCount: i,
        totalCount,
        error: result.error,
      };
    }
  }

  context.dispatch.commitTransaction();

  return {
    ok: true,
    results,
    completedCount: totalCount,
    totalCount,
  };
}
