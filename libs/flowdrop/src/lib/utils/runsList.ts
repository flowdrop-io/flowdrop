/**
 * Runs list helpers — pure functions behind the Test-mode Runs list.
 *
 * A "run" is a pipeline of the workflow, as `GET /workflow/{id}/pipelines`
 * lists it. Nothing here touches the network or the DOM.
 *
 * @module utils/runsList
 */

import { formatMicroseconds } from './duration.js';
import type { StatusPillStatus } from '../components/primitives/StatusPill.svelte';

/** One row of the Runs list. */
export interface RunSummary {
  id: string;
  /** Pipeline status as the server reports it (`pending`, `running`, `completed`, ...). */
  status: string;
  /** ISO time the run was created; `null` when the server did not say. */
  createdAt: string | null;
  /** ISO time the run finished (`lastExecuted`); `null` while it has not. */
  lastExecuted: string | null;
  /** Jobs that ran, for a one-line summary. */
  executionCount: number;
  /** Jobs per status, when the server sent a summary. */
  jobSummary: { total: number; failed: number } | null;
}

/** Runs asked for per page. */
export const RUNS_PAGE_SIZE = 20;
/** The server's ceiling for `limit`. */
export const RUNS_MAX_LIMIT = 100;

const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

/** The run has finished one way or another. */
export function isTerminalRun(status: string): boolean {
  return TERMINAL.has(status);
}

/** Cancel is offered for a run that has not finished. */
export function canCancelRun(status: string): boolean {
  return !isTerminalRun(status);
}

/** Re-run is offered for a run that has finished. */
export function canRerunRun(status: string): boolean {
  return isTerminalRun(status);
}

/** The status pill a pipeline status is drawn with. */
export function runPillStatus(status: string): StatusPillStatus {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'skipped';
    case 'paused':
    case 'interrupted':
    case 'pending':
      return 'waiting';
    default:
      return 'running';
  }
}

/**
 * How long a run took, in milliseconds. `null` while it has not finished, or
 * when either time is missing or unreadable.
 */
export function runDurationMs(run: Pick<RunSummary, 'status' | 'createdAt' | 'lastExecuted'>) {
  if (!isTerminalRun(run.status) || !run.createdAt || !run.lastExecuted) return null;
  const ms = Date.parse(run.lastExecuted) - Date.parse(run.createdAt);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

/** `45s`, `2m 30s`, `1h 30m`: the same tiers as the Drupal admin pages. `''` for no duration. */
export function formatRunDuration(ms: number | null): string {
  return ms === null ? '' : (formatMicroseconds(ms * 1000) ?? '');
}

/**
 * When a run started, for a list row: "Today 11:29", "Yesterday 21:35", or the
 * date and time for anything older. `''` for a missing or unreadable time.
 */
export function formatRunTime(
  iso: string | null,
  now: Date,
  labels: { today: string; yesterday: string },
  locale?: string
): string {
  if (!iso) return '';
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  const time = when.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayStart(now) - dayStart(when)) / 86_400_000);
  if (days === 0) return `${labels.today} ${time}`;
  if (days === 1) return `${labels.yesterday} ${time}`;
  const date = when.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return `${date} ${time}`;
}

/** Read the list response's `pipelines` into rows (newest first, as sent). */
export function parseRuns(data: unknown): RunSummary[] {
  const list = (data as { pipelines?: unknown } | null)?.pipelines;
  if (!Array.isArray(list)) return [];
  return list.flatMap((raw): RunSummary[] => {
    const p = raw as Record<string, unknown>;
    if (p.id === undefined || p.id === null) return [];
    const summary = p.job_status_summary as { total?: number; failed?: number } | undefined;
    return [
      {
        id: String(p.id),
        status: typeof p.status === 'string' ? p.status : 'pending',
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : null,
        lastExecuted: typeof p.lastExecuted === 'string' ? p.lastExecuted : null,
        executionCount: typeof p.executionCount === 'number' ? p.executionCount : 0,
        jobSummary:
          summary && typeof summary.total === 'number'
            ? { total: summary.total, failed: summary.failed ?? 0 }
            : null
      }
    ];
  });
}

/** The query for one page: `limit` is clamped to the server's 1 to 100. */
export function pageQuery(offset: number, limit: number = RUNS_PAGE_SIZE): string {
  const l = Math.min(RUNS_MAX_LIMIT, Math.max(1, Math.floor(limit)));
  const o = Math.max(0, Math.floor(offset));
  return `limit=${l}&offset=${o}`;
}

/** A full page means there may be more; a short one is the end. */
export function hasMoreRuns(receivedCount: number, limit: number = RUNS_PAGE_SIZE): boolean {
  return receivedCount >= Math.min(RUNS_MAX_LIMIT, limit);
}

/** Add a page to what is loaded, dropping any run already present (a reload overlaps). */
export function appendRuns(loaded: RunSummary[], page: RunSummary[]): RunSummary[] {
  const seen = new Set(loaded.map((r) => r.id));
  return [...loaded, ...page.filter((r) => !seen.has(r.id))];
}

/**
 * Fill `{workflowId}` and `{pipelineId}` in a host's admin URL template.
 * `null` when there is no template or a placeholder has no value.
 */
export function expandAdminUrl(
  template: string | undefined,
  values: { workflowId?: string; pipelineId?: string }
): string | null {
  if (!template) return null;
  let missing = false;
  const url = template.replace(/\{(workflowId|pipelineId)\}/g, (_, key: keyof typeof values) => {
    const v = values[key];
    if (v === undefined || v === '') {
      missing = true;
      return '';
    }
    return encodeURIComponent(v);
  });
  return missing ? null : url;
}
