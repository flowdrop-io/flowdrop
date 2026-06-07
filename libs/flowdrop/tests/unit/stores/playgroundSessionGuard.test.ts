/**
 * Unit tests for applyServerResponse's session-scoped guard.
 *
 * A poll/fetch started for one session can resolve *after* the user has
 * switched to another. Without a guard the late response writes the old
 * session's status and messages onto the new current session — most visibly
 * re-disabling the chat input on a freshly created (idle) session with the
 * previous session's 'running' status. applyServerResponse now takes the
 * session the response was fetched for and drops it if that is no longer the
 * current session.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlaygroundStore } from '$lib/stores/playgroundStore.svelte.js';
import type {
  PlaygroundMessage,
  PlaygroundSession,
  PlaygroundSessionStatus
} from '$lib/types/playground.js';

let seq = 0;

function makeSession(id: string, status: PlaygroundSessionStatus): PlaygroundSession {
  return {
    id,
    workflowId: 'wf-1',
    name: id,
    status,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    executions: []
  };
}

function msg(sessionId: string): PlaygroundMessage {
  seq += 1;
  return {
    id: `m-${seq}`,
    sessionId,
    role: 'assistant',
    content: 'x',
    timestamp: `2026-01-01T00:00:${String(seq).padStart(2, '0')}Z`,
    sequenceNumber: seq
  };
}

describe('applyServerResponse — session-scoped guard', () => {
  let store: PlaygroundStore;

  beforeEach(() => {
    seq = 0;
    store = new PlaygroundStore();
    store.reset();
  });

  it('applies status when the response is for the current session', () => {
    store.setCurrentSession(makeSession('sess-1', 'idle'));

    store.applyServerResponse({ data: [], sessionStatus: 'running' }, 'sess-1');

    expect(store.isExecuting).toBe(true);
  });

  it('drops a response whose session is no longer current', () => {
    // 'old' is running; user switches to a fresh idle 'new' session.
    store.setCurrentSession(makeSession('new', 'idle'));

    // A late poll for 'old' resolves and reports 'running'.
    store.applyServerResponse({ data: [], sessionStatus: 'running' }, 'old');

    // The new session must stay idle — input enabled.
    expect(store.isExecuting).toBe(false);
  });

  it("does not splice a stale session's messages into the current session", () => {
    store.setCurrentSession(makeSession('new', 'idle'));

    store.applyServerResponse({ data: [msg('old'), msg('old')], sessionStatus: 'running' }, 'old');

    expect(store.messages).toHaveLength(0);
    expect(store.isExecuting).toBe(false);
  });

  it('still applies when the guard is explicitly opted out with null', () => {
    // pushMessages() and other generic callers pass null to opt out of the
    // guard — existing behavior must be preserved.
    store.setCurrentSession(makeSession('sess-1', 'idle'));

    store.applyServerResponse({ data: [msg('sess-1')], sessionStatus: 'running' }, null);

    expect(store.messages).toHaveLength(1);
    expect(store.isExecuting).toBe(true);
  });
});
