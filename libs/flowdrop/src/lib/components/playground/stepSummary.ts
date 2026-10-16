/**
 * Pure helpers behind the Playground's steps row: fold the log rows of one
 * turn into a summary ("4 steps · 46 ms · 1 waiting") and the table rows
 * behind it (node · status · count · ms).
 *
 * The server posts one `log` row per finished node with plain-English
 * content (`completed in 42ms`, `failed: <message>`, `completed`). Structured
 * `metadata.status` / `metadata.duration` (ms) win when a server sends them;
 * otherwise the content is read. A log row that matches neither is kept as
 * a step without a status, its text shown as the detail.
 */

import type { PlaygroundMessage } from '../../types/playground.js';
import type { StatusPillStatus } from '../primitives/StatusPill.svelte';
import { parseDurationMs } from '../../utils/duration.js';

export type StepStatus = StatusPillStatus;

export interface StepRow {
  /** Stable key: the node (and where it sits) plus, for free text, the text. */
  key: string;
  /** Node label shown in the node column. */
  label: string;
  /** Ancestor labels, outermost first (the hierarchy minus the node itself). */
  path: string[];
  /** Indent level for nested (sub-workflow) steps. */
  depth: number;
  /** Worst status across the executions; null for a free-text log line. */
  status: StepStatus | null;
  /** How many times the node ran in the turn (loops). */
  count: number;
  /** Summed duration in ms, or null when no execution reported one. */
  durationMs: number | null;
  /** Free-text log content that is not a recognised outcome. */
  detail?: string;
  /** The first failure message, when a run of the node failed with one. */
  error?: string;
}

export interface StepsSummary {
  rows: StepRow[];
  /** Executions in the turn (a node that ran 5 times counts 5). */
  total: number;
  /** Summed duration in ms, or null when nothing reported one. */
  durationMs: number | null;
  waiting: number;
  failed: number;
  /** Worst status of the turn, or null when no step has a status. */
  worst: StepStatus | null;
  /** Failure lines to keep visible while the table is folded. */
  errors: { key: string; label: string; message: string }[];
}

/** A node waiting on a person, taken from a pending interrupt. */
export interface PendingStep {
  key: string;
  label: string;
}

const SEVERITY: Record<StepStatus, number> = {
  skipped: 0,
  completed: 1,
  running: 2,
  waiting: 3,
  failed: 4
};

export function worseStatus(a: StepStatus | null, b: StepStatus | null): StepStatus | null {
  if (a === null) return b;
  if (b === null) return a;
  return SEVERITY[b] > SEVERITY[a] ? b : a;
}

const STATUSES: ReadonlySet<string> = new Set<StepStatus>([
  'running',
  'completed',
  'waiting',
  'failed',
  'skipped'
]);

interface ParsedStep {
  status: StepStatus | null;
  durationMs: number | null;
  detail?: string;
  error?: string;
}

/** What one log row says about its node. */
export function parseStepContent(message: PlaygroundMessage): ParsedStep {
  const meta = message.metadata;
  const content = message.content.trim();
  let status: StepStatus | null = null;
  let durationMs: number | null = null;
  let error: string | undefined;
  let detail: string | undefined;

  let match: RegExpMatchArray | null;
  if ((match = content.match(/^completed(?:\s+in\s+(.+))?$/i))) {
    status = 'completed';
    durationMs = parseDurationMs(match[1]);
  } else if ((match = content.match(/^failed(?::\s*([\s\S]*)|\s+after\s+(.+))?$/i))) {
    status = 'failed';
    error = match[1]?.trim() || undefined;
    durationMs = parseDurationMs(match[2]);
  } else if ((match = content.match(/^(?:paused|waiting)(?:\s+after\s+(.+))?$/i))) {
    status = 'waiting';
    durationMs = parseDurationMs(match[1]);
  } else if ((match = content.match(/^cancel+ed(?:\s+after\s+(.+))?$/i))) {
    status = 'skipped';
    durationMs = parseDurationMs(match[1]);
  } else if (content !== '') {
    detail = content;
    if (meta?.level === 'error') {
      status = 'failed';
      error = content;
    }
  }

  if (typeof meta?.status === 'string' && STATUSES.has(meta.status)) {
    status = meta.status as StepStatus;
  }
  if (typeof meta?.duration === 'number' && Number.isFinite(meta.duration)) {
    durationMs = meta.duration;
  }
  if (status === 'failed' && error === undefined && typeof meta?.error === 'string') {
    error = meta.error;
  }
  return { status, durationMs, detail: status === null ? detail : undefined, error };
}

/**
 * Fold the log rows of one turn into the summary and its table rows. Repeats
 * of one node (a loop) merge into one row with a count and a summed duration.
 */
export function summarizeSteps(
  logs: readonly PlaygroundMessage[],
  pending: readonly PendingStep[] = []
): StepsSummary {
  const byKey = new Map<string, StepRow>();
  let total = 0;
  let durationMs: number | null = null;
  const errors: StepsSummary['errors'] = [];

  const rowFor = (key: string, init: () => StepRow): StepRow => {
    let row = byKey.get(key);
    if (!row) {
      row = init();
      byKey.set(key, row);
    }
    return row;
  };

  for (const log of logs) {
    const parsed = parseStepContent(log);
    const hierarchy = (log.hierarchy ?? []).map((h) => h.label);
    const label = log.metadata?.nodeLabel ?? log.nodeId ?? hierarchy.at(-1) ?? '';
    // The server's trail may end with the node itself; the path is the rest.
    const path = hierarchy.at(-1) === label ? hierarchy.slice(0, -1) : hierarchy;
    const key = `${log.nodeId ?? label}|${path.join('/')}|${parsed.status === null ? parsed.detail : ''}`;

    const row = rowFor(key, () => ({
      key,
      label,
      path,
      depth: Math.max(0, hierarchy.length - 1),
      status: null,
      count: 0,
      durationMs: null,
      detail: parsed.detail
    }));
    row.count += 1;
    row.status = worseStatus(row.status, parsed.status);
    if (parsed.durationMs !== null) {
      row.durationMs = (row.durationMs ?? 0) + parsed.durationMs;
      durationMs = (durationMs ?? 0) + parsed.durationMs;
    }
    if (parsed.error !== undefined && row.error === undefined) row.error = parsed.error;
    if (parsed.status === 'failed') {
      errors.push({ key: log.id, label, message: parsed.error ?? '' });
    }
    total += 1;
  }

  for (const step of pending) {
    const key = `pending|${step.key}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      key,
      label: step.label,
      path: [],
      depth: 0,
      status: 'waiting',
      count: 1,
      durationMs: null
    });
    total += 1;
  }

  const rows = [...byKey.values()];
  let waiting = 0;
  let failed = 0;
  let worst: StepStatus | null = null;
  for (const row of rows) {
    if (row.status === 'waiting') waiting += 1;
    if (row.status === 'failed') failed += 1;
    worst = worseStatus(worst, row.status);
  }
  return { rows, total, durationMs, waiting, failed, worst, errors };
}
