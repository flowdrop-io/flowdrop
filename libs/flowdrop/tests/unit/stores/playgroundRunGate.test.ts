/**
 * The store's Run gate: `canRun` is the one answer every Run control reads.
 * It is closed while a run is executing, while a turn request is in flight,
 * and (under the legacy protocol) between a Run click and the backend's next
 * `enableRun` message. A session change opens it again.
 */

import { describe, it, expect } from 'vitest';
import { PlaygroundStore } from '$lib/stores/playgroundStore.svelte.js';
import type {
  PlaygroundMessage,
  PlaygroundSession,
  PlaygroundSessionStatus
} from '$lib/types/playground.js';

let seq = 0;

function makeSession(id: string, status: PlaygroundSessionStatus = 'idle'): PlaygroundSession {
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

function msg(metadata?: Record<string, unknown>): PlaygroundMessage {
  seq += 1;
  return {
    id: `m-${seq}`,
    sessionId: 's1',
    role: 'assistant',
    content: 'hi',
    timestamp: '2026-01-01T00:00:00Z',
    sequenceNumber: seq,
    metadata
  } as PlaygroundMessage;
}

function storeWithSession(): PlaygroundStore {
  const store = new PlaygroundStore();
  store.setSessions([makeSession('s1'), makeSession('s2')]);
  store.setCurrentSession(makeSession('s1'));
  return store;
}

describe('PlaygroundStore.canRun', () => {
  it('is open for an idle session', () => {
    expect(storeWithSession().canRun).toBe(true);
  });

  it('is closed while a turn request is pending, and reopens after', () => {
    const store = storeWithSession();
    store.setTurnPending(true);
    expect(store.turnPending).toBe(true);
    expect(store.canRun).toBe(false);
    store.setTurnPending(false);
    expect(store.canRun).toBe(true);
  });

  it('is closed while the session is running', () => {
    const store = storeWithSession();
    store.updateSessionStatus('running');
    expect(store.canRun).toBe(false);
  });

  it('stays locked after a click until a newer enableRun message arrives', () => {
    const store = storeWithSession();
    store.addMessage(msg({ enableRun: true }));
    store.lockRunUntilEnabled();
    expect(store.runLocked).toBe(true);
    expect(store.canRun).toBe(false);

    // An unflagged message and the already-counted one do not unlock it.
    store.addMessage(msg());
    expect(store.canRun).toBe(false);

    store.addMessage(msg({ enableRun: true }));
    expect(store.runLocked).toBe(false);
    expect(store.canRun).toBe(true);
  });

  it('releaseRunLock frees Run without a message', () => {
    const store = storeWithSession();
    store.lockRunUntilEnabled();
    store.releaseRunLock();
    expect(store.canRun).toBe(true);
  });

  it('clears the lock when the session changes, but not on a same-session update', () => {
    const store = storeWithSession();
    store.lockRunUntilEnabled();
    store.setCurrentSession(makeSession('s1', 'idle'));
    expect(store.runLocked).toBe(true);

    store.switchSession('s2');
    expect(store.runLocked).toBe(false);

    store.lockRunUntilEnabled();
    store.setCurrentSession(makeSession('s1'));
    expect(store.runLocked).toBe(false);
  });

  it('reset clears the lock and the pending flag', () => {
    const store = storeWithSession();
    store.lockRunUntilEnabled();
    store.setTurnPending(true);
    store.reset();
    expect(store.runLocked).toBe(false);
    expect(store.turnPending).toBe(false);
  });

  it('exposes the new mutations on the frozen actions facade', () => {
    const store = storeWithSession();
    const { setTurnPending, lockRunUntilEnabled, releaseRunLock } = store.actions;
    lockRunUntilEnabled();
    expect(store.runLocked).toBe(true);
    releaseRunLock();
    setTurnPending(true);
    expect(store.canRun).toBe(false);
  });
});
