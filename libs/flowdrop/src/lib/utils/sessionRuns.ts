/**
 * Session runs, workflow versions and the sessions the Playground owns.
 *
 * Pure functions over what the server sends: no store, no fetch, never
 * throw, never mutate their arguments.
 *
 *  - {@link isPlaygroundSession} / {@link playgroundSessionsOf}: which sessions
 *    the Playground created (the third-party mark it stamps on its sessions);
 *  - {@link versionDividersFromRuns}: where the conversation feed shows a
 *    "Saved, new version" divider, rebuilt from the runs endpoint;
 *  - {@link placeVersionDividers}: which rendered message a divider follows.
 *
 * @module utils/sessionRuns
 */

import type {
  PlaygroundMessage,
  PlaygroundSession,
  SessionRunsResult,
  VersionDivider
} from '../types/playground.js';

/**
 * The third-party setting the Playground stamps on a session it creates:
 * `thirdPartySettings.flowdrop_playground.created === true`. The server stamps
 * it (the Playground's create-session door); the client only reads it.
 */
export const PLAYGROUND_SESSION_MARK = { module: 'flowdrop_playground', key: 'created' } as const;

/** Whether a session carries the Playground's mark. */
export function isPlaygroundSession(session: PlaygroundSession): boolean {
  const settings = session.thirdPartySettings;
  if (!settings || typeof settings !== 'object') return false;
  const own = settings[PLAYGROUND_SESSION_MARK.module];
  return (
    own !== null &&
    typeof own === 'object' &&
    (own as Record<string, unknown>)[PLAYGROUND_SESSION_MARK.key] === true
  );
}

/**
 * The sessions the Playground created.
 *
 * A server that does not expose third-party settings (no session carries the
 * key at all) cannot say which sessions are the Playground's, so the list is
 * returned as it is: showing every session beats showing none. As soon as one
 * session carries the key, the server is known to expose it and unmarked
 * sessions are left out.
 */
export function playgroundSessionsOf(sessions: PlaygroundSession[]): PlaygroundSession[] {
  const exposed = sessions.some((s) => s.thirdPartySettings !== undefined);
  return exposed ? sessions.filter(isPlaygroundSession) : sessions;
}

/**
 * Whether a run ran on a different workflow version than the current one.
 * An unknown version on either side is never stale.
 */
export function isRunStale(runVersion: string | null | undefined, current: string | null): boolean {
  return runVersion != null && current != null && runVersion !== current;
}

/**
 * The dividers a conversation shows, from its runs.
 *
 * A divider goes above a run whose version differs from the last known version
 * before it (runs with an unknown version are skipped, never compared), and at
 * the end when the workflow's current version differs from the last run's. The
 * runs are oldest first, as the endpoint sends them.
 */
export function versionDividersFromRuns(result: SessionRunsResult): VersionDivider[] {
  const dividers: VersionDivider[] = [];
  let last: string | null = null;
  for (const run of result.runs) {
    const version = run.workflowVersion ?? null;
    if (version === null) continue;
    if (last !== null && version !== last) {
      dividers.push({ id: `run:${run.id}`, anchor: { kind: 'before-run', runId: run.id } });
    }
    last = version;
  }
  if (isRunStale(last, result.workflowVersion)) {
    dividers.push({ id: 'end', anchor: { kind: 'end' } });
  }
  return dividers;
}

/**
 * Which rendered message each divider follows.
 *
 * Returns divider lists keyed by the id of the visible message they come
 * after. A divider whose anchor is not in the loaded messages (a run older than
 * the page, a message not yet arrived) or that would sit above everything is
 * left out; several dividers at one place collapse to one.
 *
 * @param all Every message of the session, in order (hidden and log rows too).
 * @param visible The messages actually rendered, in the same order.
 */
export function placeVersionDividers(
  dividers: VersionDivider[],
  all: PlaygroundMessage[],
  visible: PlaygroundMessage[]
): Map<string, VersionDivider> {
  const placed = new Map<string, VersionDivider>();
  if (dividers.length === 0 || visible.length === 0) return placed;

  const indexOf = new Map<string, number>();
  all.forEach((message, i) => indexOf.set(message.id, i));
  const visibleIndex = visible.map((message) => indexOf.get(message.id) ?? -1);

  for (const divider of dividers) {
    const anchor = divider.anchor;
    let after = -1;
    if (anchor.kind === 'end') {
      after = all.length - 1;
    } else if (anchor.kind === 'after-message') {
      after = indexOf.get(anchor.messageId) ?? -1;
    } else {
      const first = all.findIndex(
        (message) => message.executionId === anchor.runId || message.rootPipelineId === anchor.runId
      );
      after = first - 1;
    }
    if (after < 0) continue;

    let host = -1;
    for (let i = 0; i < visible.length; i++) {
      if (visibleIndex[i] <= after) host = i;
      else break;
    }
    if (host < 0) continue;
    const key = visible[host].id;
    if (!placed.has(key)) placed.set(key, divider);
  }
  return placed;
}
