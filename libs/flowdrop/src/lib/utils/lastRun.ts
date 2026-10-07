/**
 * The inspector's Last run tab, as data: what a node did in the run being
 * shown, drawn from the node's execution info (`fd.playground.nodeStatusFor`).
 *
 * A node that ran several times in the run (a loop) shows its last execution
 * and says how many there were. Fields the backend does not send are left out,
 * so the view shows only facts it has.
 */

import type { NodeExecutionInfo, NodeExecutionStatus } from '../types/index.js';
import { formatMicroseconds } from './duration.js';

export interface LastRunView {
  status: NodeExecutionStatus;
  /** How many times the node executed in this run. */
  executions: number;
  durationLabel: string | null;
  /** ISO timestamps of the last execution. */
  started: string | null;
  completed: string | null;
  tokens: number | null;
  input: string | null;
  output: string | null;
  error: string | null;
}

/** A node that has not run in the shown run (or is only waiting to). */
export function hasRun(info: NodeExecutionInfo | undefined): info is NodeExecutionInfo {
  return !!info && info.status !== 'idle' && info.status !== 'pending';
}

/** Text for a payload value: strings as they are, anything else as indented JSON. */
export function stringifyPayload(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Token count, if the node's output reports one. Looks for the shapes model
 * nodes use: `tokens`, `total_tokens`, `usage.total_tokens`, or
 * `usage.{input,output}_tokens` (also `prompt`/`completion`). Returns null
 * when there is none: the API has no dedicated field for it.
 */
export function extractTokens(output: unknown): number | null {
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  const walk = (value: unknown, depth: number): number | null => {
    if (!value || typeof value !== 'object' || depth > 2) return null;
    const o = value as Record<string, unknown>;
    const direct = num(o.total_tokens) ?? num(o.totalTokens) ?? num(o.tokens);
    if (direct !== null) return direct;
    const parts = [
      num(o.input_tokens) ?? num(o.prompt_tokens),
      num(o.output_tokens) ?? num(o.completion_tokens)
    ].filter((n): n is number => n !== null);
    if (parts.length > 0) return parts.reduce((a, b) => a + b, 0);
    return walk(o.usage, depth + 1) ?? walk(o.metadata, depth + 1);
  };
  return walk(output, 0);
}

/** The Last run view of one node, or null when it has not run. */
export function describeLastRun(info: NodeExecutionInfo | undefined): LastRunView | null {
  if (!hasRun(info)) return null;
  const job = info.jobs?.[info.jobs.length - 1];
  const ms = job?.executionTime ?? info.lastExecutionDuration;
  const us =
    job?.executionTimeUs ??
    info.lastExecutionDurationUs ??
    (ms !== undefined ? ms * 1000 : undefined);
  const output = job?.output ?? info.output;
  return {
    status: info.status,
    executions: Math.max(info.executionCount, info.jobs?.length ?? 0, 1),
    durationLabel: formatMicroseconds(us),
    started: job?.started ?? null,
    completed: job?.completed ?? info.lastExecuted ?? null,
    tokens: extractTokens(output),
    input: stringifyPayload(job?.input),
    output: stringifyPayload(output),
    error: job?.error ?? info.lastError ?? null
  };
}
