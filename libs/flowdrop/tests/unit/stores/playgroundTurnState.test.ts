/**
 * Turn state the store holds for the Playground and any Run control: the
 * interface form's values, what a turn would send from them, and the
 * sessions door's answer to the last turn.
 */

import { describe, it, expect } from 'vitest';
import { PlaygroundStore } from '$lib/stores/playgroundStore.svelte.js';
import type { PlaygroundSession, PlaygroundTurnResult } from '$lib/types/playground.js';
import type { Workflow, WorkflowInterface } from '$lib/types/index.js';

function workflow(id: string, iface?: WorkflowInterface): Workflow {
  return {
    id,
    name: id,
    nodes: [],
    edges: [],
    metadata: { schemaVersion: '1', createdAt: '', updatedAt: '' },
    ...(iface ? { interface: iface } : {})
  };
}

function session(id: string): PlaygroundSession {
  return {
    id,
    workflowId: 'wf',
    name: id,
    status: 'idle',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    executions: []
  };
}

const formInterface: WorkflowInterface = {
  inputs: [
    { id: 'topic', dataType: 'string', bindings: [], required: true },
    { id: 'reply', dataType: 'string', bindings: [], turn: 'history' }
  ]
};

const turnResult: PlaygroundTurnResult = {
  sessionId: 's1',
  userMessageId: 'u1',
  pipelineId: 'p1',
  status: 'running'
};

describe('PlaygroundStore form values and turnInputs', () => {
  it('derives the missing required inputs, then the inputs once filled', () => {
    const store = new PlaygroundStore();
    store.setWorkflow(workflow('wf', formInterface));

    const before = store.turnInputs;
    expect(before.ok).toBe(false);
    if (!before.ok) expect(before.missing.map((e) => e.id)).toEqual(['topic']);

    store.setFormValues({ topic: 'cats' });
    expect(store.turnInputs).toEqual({ ok: true, inputs: { topic: 'cats' } });
  });

  it('keeps the values when the same workflow is set again (interface loaded late)', () => {
    const store = new PlaygroundStore();
    store.setWorkflow(workflow('wf', formInterface));
    store.setFormValues({ topic: 'cats' });
    store.setWorkflow(workflow('wf', formInterface));
    expect(store.formValues).toEqual({ topic: 'cats' });
  });

  it('clears the values when a different workflow is set, and on reset', () => {
    const store = new PlaygroundStore();
    store.setWorkflow(workflow('wf', formInterface));
    store.setFormValues({ topic: 'cats' });
    store.setWorkflow(workflow('other', formInterface));
    expect(store.formValues).toEqual({});

    store.setFormValues({ topic: 'dogs' });
    store.reset();
    expect(store.formValues).toEqual({});
  });
});

describe('PlaygroundStore lastTurn', () => {
  it('holds the turn result until the session changes', () => {
    const store = new PlaygroundStore();
    store.setSessions([session('s1'), session('s2')]);
    store.setCurrentSession(session('s1'));
    store.setLastTurn(turnResult);
    expect(store.lastTurn).toEqual(turnResult);

    store.setCurrentSession(session('s1'));
    expect(store.lastTurn).toEqual(turnResult);

    store.switchSession('s2');
    expect(store.lastTurn).toBeNull();
  });

  it('is cleared by reset and through the actions facade', () => {
    const store = new PlaygroundStore();
    store.actions.setLastTurn(turnResult);
    store.actions.setFormValues({ a: 1 });
    expect(store.lastTurn).toEqual(turnResult);
    expect(store.formValues).toEqual({ a: 1 });
    store.reset();
    expect(store.lastTurn).toBeNull();
  });
});
