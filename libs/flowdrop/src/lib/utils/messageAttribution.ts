/**
 * Shared chip-resolution helper for playground messages.
 *
 * Resolves the [Run #N] and [workflow] attribution chips that the playground
 * UI surfaces on every message bubble, log row, system notice, and interrupt
 * bubble. Pure functions only — store-agnostic so they can be unit tested in
 * isolation.
 *
 * Fallback semantics:
 * - Run label: execution.label > "Run #N" (1-based ordinal in executions[]) > "Run · {id-prefix}"
 * - Workflow id: message.workflowId > execution.workflowId
 * - Workflow label: message.metadata.workflowLabel > execution.workflowLabel > truncated workflowId
 *
 * Servers SHOULD omit message.workflowId when it equals the run's parent
 * workflow; clients always fall back to PlaygroundExecution.workflowId via
 * executionId lookup.
 */

import type { PlaygroundExecution, PlaygroundMessage } from '../types/playground.js';

const DEFAULT_TRUNCATE_LENGTH = 8;

/**
 * Truncate an id for display. Returns the original id unchanged if it's
 * shorter than the requested length. Length defaults to 8 characters.
 */
export function truncateId(id: string, length: number = DEFAULT_TRUNCATE_LENGTH): string {
  if (!id) return id;
  if (id.length <= length) return id;
  return id.slice(0, length);
}

/**
 * Resolved attribution data for a single playground message.
 */
export interface MessageAttribution {
  /** Pipeline run id (from message.executionId), undefined when message has no run */
  runId: string | undefined;
  /**
   * Display label for the run. Always populated when runId is present.
   * Resolution: execution.label > "Run #N" (1-based ordinal) > "Run · {id-prefix}"
   */
  runLabel: string | undefined;
  /** 1-based ordinal of the run within the session's executions array, undefined if orphan */
  runNumber: number | undefined;
  /** Workflow id (message-level wins, falls back to execution-level) */
  workflowId: string | undefined;
  /**
   * Display label for the workflow.
   * Resolution: message.metadata.workflowLabel > execution.workflowLabel > truncated workflowId
   * Undefined when no workflow can be resolved at all.
   */
  workflowLabel: string | undefined;
}

type AttributableMessage = Pick<PlaygroundMessage, 'executionId' | 'workflowId' | 'metadata'>;

/**
 * Resolve attribution chips for a single message given the session's
 * executions list. Safe to call with undefined/empty executions.
 */
export function resolveMessageAttribution(
  message: AttributableMessage,
  executions: PlaygroundExecution[] | undefined
): MessageAttribution {
  const runId = message.executionId ?? undefined;
  const execution = runId ? findExecution(runId, executions) : undefined;
  const runNumber = runId ? findRunNumber(runId, executions) : undefined;
  const runLabel = runId ? resolveRunLabel(runId, execution, runNumber) : undefined;

  const workflowId = message.workflowId ?? execution?.workflowId ?? undefined;
  const workflowLabel = resolveWorkflowLabel(message, execution, workflowId);

  return {
    runId,
    runLabel,
    runNumber,
    workflowId,
    workflowLabel
  };
}

function findExecution(
  runId: string,
  executions: PlaygroundExecution[] | undefined
): PlaygroundExecution | undefined {
  if (!executions) return undefined;
  return executions.find((e) => e.id === runId);
}

function findRunNumber(
  runId: string,
  executions: PlaygroundExecution[] | undefined
): number | undefined {
  if (!executions) return undefined;
  const index = executions.findIndex((e) => e.id === runId);
  return index >= 0 ? index + 1 : undefined;
}

function resolveRunLabel(
  runId: string,
  execution: PlaygroundExecution | undefined,
  runNumber: number | undefined
): string {
  if (execution?.label) return execution.label;
  if (runNumber !== undefined) return `Run #${runNumber}`;
  return `Run · ${truncateId(runId)}`;
}

function resolveWorkflowLabel(
  message: AttributableMessage,
  execution: PlaygroundExecution | undefined,
  workflowId: string | undefined
): string | undefined {
  const messageLabel = message.metadata?.workflowLabel;
  if (messageLabel) return messageLabel;
  if (execution?.workflowLabel) return execution.workflowLabel;
  if (workflowId) return truncateId(workflowId);
  return undefined;
}
