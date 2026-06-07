/**
 * Unit tests for sub-flow-aware execution tracking in playgroundStore.
 *
 * The sidebar must keep the main pipeline in focus and never auto-follow a
 * sub-flow run. Runs are classified from each message's `parentPipelineId`
 * (authoritative), with a `hierarchy` depth >= 2 fallback for legacy runs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlaygroundStore } from '$lib/stores/playgroundStore.svelte.js';
import type { PlaygroundMessage, PlaygroundSession } from '$lib/types/playground.js';

let seq = 0;

function makeSession(): PlaygroundSession {
  return {
    id: 'sess-1',
    workflowId: 'wf-1',
    name: 'Test',
    status: 'running',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    executions: []
  };
}

function base(executionId: string): PlaygroundMessage {
  seq += 1;
  return {
    id: `m-${seq}`,
    sessionId: 'sess-1',
    role: 'log',
    content: 'x',
    timestamp: `2026-01-01T00:00:${String(seq).padStart(2, '0')}Z`,
    sequenceNumber: seq,
    executionId
  };
}

/** A top-level main-pipeline message: parentPipelineId null, root === self. */
function mainMsg(executionId: string): PlaygroundMessage {
  return { ...base(executionId), parentPipelineId: null, rootPipelineId: executionId };
}

/** A sub-flow message: parented to (and rooted at) the main run. */
function subMsg(executionId: string, rootId: string): PlaygroundMessage {
  return { ...base(executionId), parentPipelineId: rootId, rootPipelineId: rootId };
}

/** A legacy/plain run with no parent/root nesting fields. */
function plainMsg(executionId: string): PlaygroundMessage {
  return base(executionId);
}

describe('playgroundStore sub-flow execution focus', () => {
  let store: PlaygroundStore;

  beforeEach(() => {
    seq = 0;
    store = new PlaygroundStore();
    store.reset();
    store.setCurrentSession(makeSession());
  });

  it('keeps the main pipeline as latest when sub-flow messages arrive', () => {
    store.addMessages([mainMsg('main')]);
    expect(store.latestExecutionId).toBe('main');

    store.addMessages([subMsg('sub', 'main')]);
    expect(store.latestExecutionId).toBe('main');
    expect(store.activeExecutionId).toBe('main');

    expect(store.currentSession?.executions?.map((e) => e.id)).toEqual(['main', 'sub']);
  });

  it('classifies a sub-flow from its first message, even before any hierarchy logs', () => {
    // The sub-flow's leading "Execute workflow" message has no hierarchy but
    // does carry parentPipelineId — so it's never mistaken for a main run.
    store.addMessages([mainMsg('main')]);
    store.addMessages([{ ...subMsg('sub', 'main'), hierarchy: undefined }]);

    expect(store.currentSession?.executions?.find((e) => e.id === 'sub')?.isSubflow).toBe(true);
    expect(store.latestExecutionId).toBe('main');
  });

  it('does not clear an existing pin when a sub-flow run appears', () => {
    store.addMessages([mainMsg('main')]);
    store.pinExecution('main');

    store.addMessages([subMsg('sub', 'main')]);
    expect(store.pinnedExecutionId).toBe('main');
    expect(store.activeExecutionId).toBe('main');
  });

  it('excludes sub-flow runs from the run-switcher list', () => {
    store.addMessages([mainMsg('main-1'), subMsg('sub', 'main-1'), mainMsg('main-2')]);
    // All runs are tracked internally...
    expect(store.currentSession?.executions?.map((e) => e.id)).toEqual(['main-1', 'sub', 'main-2']);
    // ...but only main pipeline runs are offered for selection.
    expect(store.selectableExecutions.map((e) => e.id)).toEqual(['main-1', 'main-2']);
  });

  it('auto-follows a new main run by clearing the pin', () => {
    store.addMessages([mainMsg('main-1'), subMsg('sub', 'main-1')]);
    store.pinExecution('main-1');

    store.addMessages([mainMsg('main-2')]);
    expect(store.pinnedExecutionId).toBeNull();
    expect(store.latestExecutionId).toBe('main-2');
    expect(store.activeExecutionId).toBe('main-2');
  });

  it('never reports a sub-flow as the latest run', () => {
    // Only a sub-flow has been seen (its main run is not in this window).
    store.addMessages([subMsg('sub', 'absent-main')]);
    expect(store.latestExecutionId).toBeNull();
    expect(store.selectableExecutions).toEqual([]);
  });

  it('treats runs without parentPipelineId as main (legacy/plain not reclassified)', () => {
    // Simple workflow or pre-refactor runs carry no nesting field, so every run
    // is a selectable main run. Original behavior.
    store.addMessages([plainMsg('run-1')]);
    store.pinExecution('run-1');
    store.addMessages([plainMsg('run-2')]);

    expect(store.pinnedExecutionId).toBeNull();
    expect(store.latestExecutionId).toBe('run-2');
    expect(store.selectableExecutions.map((e) => e.id)).toEqual(['run-1', 'run-2']);
  });

  it('refreshes the panel while following the latest run', () => {
    store.addMessages([mainMsg('main')]);
    store.applyServerResponse({ data: [mainMsg('main')] }, 'sess-1');
    // Following latest → focus stays on the main run.
    expect(store.activeExecutionId).toBe('main');
  });
});
