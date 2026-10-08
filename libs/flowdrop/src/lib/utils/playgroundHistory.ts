/**
 * What the Playground's history chip lists: the conversations (sessions the
 * Playground created) and the runs of the open conversation.
 *
 * Pure: no store, no fetch, never throws, never mutates its arguments.
 *
 * @module utils/playgroundHistory
 */

import type { PlaygroundSession, SessionRun, SessionRunsResult } from '../types/playground.js';
import { isRunStale } from './sessionRuns.js';

/** One conversation in the history chip. */
export interface HistoryConversation {
  id: string;
  name: string;
  /** The conversation that is open. */
  current: boolean;
}

/** One run in the history chip. */
export interface HistoryRun {
  /** Pipeline id of the run. */
  id: string;
  /** 1 for the first run of the conversation. */
  number: number;
  status: string;
  /** What started it: the person's message, when the server reports one. */
  message: string | null;
  startedAt: string | null;
  /** It ran on another version of the workflow than the current one. */
  stale: boolean;
  /** It is the run the view is on (pinned, or the latest). */
  shown: boolean;
}

/** The two groups of the history chip. */
export interface HistoryGroups {
  conversations: HistoryConversation[];
  /** Newest first. */
  runs: HistoryRun[];
}

/**
 * Group the history: conversations as the store lists them, runs of the open
 * conversation newest first with stale ones marked ({@link isRunStale}
 * against the version the runs endpoint reports as current).
 *
 * @param sessions - The sessions to list (already the Playground's own)
 * @param currentSessionId - The open conversation
 * @param runs - `GET /sessions/{id}/runs` for the open conversation, or `null`
 * @param shownRunId - The run the view is on
 */
export function historyGroups(
  sessions: readonly PlaygroundSession[],
  currentSessionId: string | null | undefined,
  runs: SessionRunsResult | null | undefined,
  shownRunId?: string | null
): HistoryGroups {
  const conversations = sessions.map((session) => ({
    id: session.id,
    name: session.name,
    current: session.id === currentSessionId
  }));
  const list: readonly SessionRun[] = runs?.runs ?? [];
  const current = runs?.workflowVersion ?? null;
  const items = list.map((run, index) => ({
    id: run.id,
    number: index + 1,
    status: run.status,
    message: run.message,
    startedAt: run.startedAt,
    stale: isRunStale(run.workflowVersion, current),
    shown: run.id === shownRunId
  }));
  return { conversations, runs: items.reverse() };
}
