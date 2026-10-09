/**
 * Chat — the activity rows of the AI Assistant.
 *
 * One row pattern shows what the assistant is doing: a tool call, a note, a
 * retry. This module is the pure part — the human label of a tool call, the
 * one-line detail of its arguments, how long it took, and the summary a
 * finished turn folds into. No Svelte, no DOM.
 *
 * @module chat/activity
 */

/** How a row stands: still going, done, or how it ended. */
export type ActivityStatus = 'running' | 'ok' | 'rejected' | 'failed' | 'note';

/** One row of the activity list. */
export interface ActivityRow {
  status: ActivityStatus;
  /** The human label, shown strong: "Read workflow". For a note, the note's text. */
  verb: string;
  /** What it acted on, shown muted after the label: `"trim"`. */
  detail: string;
  /** How long the call took, in ms. Absent while running, and after a wait on the person. */
  ms?: number;
}

/** The label of one tool in its two tenses. */
export interface ToolVerb {
  running: string;
  done: string;
}

const MAX_DETAIL = 60;

/** The label of `tool`, in the tense of `phase`. Unknown tools fall back to their id. */
export function toolVerb(
  tool: string,
  phase: 'running' | 'done',
  verbs: Readonly<Record<string, ToolVerb>>,
  fallback: (tool: string, phase: 'running' | 'done') => string
): string {
  const known = Object.prototype.hasOwnProperty.call(verbs, tool) ? verbs[tool] : undefined;
  return known ? known[phase] : fallback(tool, phase);
}

/**
 * The arguments of a call as one muted line: the primitive values, joined
 * and cut at 60 characters. A search is quoted, so `"trim"` reads as the
 * thing searched for.
 */
export function describeArgs(tool: string, args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const value of Object.values(args ?? {})) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      parts.push(String(value));
    }
  }
  let text = parts.join(' ');
  if (text === '') return '';
  if (tool === 'search_types') text = `"${text}"`;
  return text.length > MAX_DETAIL ? `${text.slice(0, MAX_DETAIL - 1)}…` : text;
}

/** A duration for a row or a summary: `0.2 s`, `1.6 s`, `1 m 05 s`. Under 0.1 s it says so. */
export function formatActivityDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 50) return '<0.1 s';
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} m ${String(seconds).padStart(2, '0')} s`;
}

/** What a finished turn folds into: how many tools ran, how many went wrong, how long they took. */
export interface ActivitySummary {
  /** Tool calls, notes not counted. */
  tools: number;
  /** Calls that failed or that the person rejected. */
  problems: number;
  /** The sum of the calls' own durations. */
  totalMs: number;
}

export function summarizeActivity(rows: readonly ActivityRow[]): ActivitySummary {
  let tools = 0;
  let problems = 0;
  let totalMs = 0;
  for (const row of rows) {
    if (row.status === 'note') continue;
    tools++;
    if (row.status === 'failed' || row.status === 'rejected') problems++;
    totalMs += row.ms ?? 0;
  }
  return { tools, problems, totalMs };
}
