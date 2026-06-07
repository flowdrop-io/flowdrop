/**
 * Multi-instance isolation tests.
 *
 * Phase 1 spike: proves the store-class pattern the multi-instance refactor
 * rests on — `$state` and sibling-chained `$derived` as `#` private class
 * fields in a `.svelte.ts` module — using the real derived chain from
 * playgroundStore (`selectableExecutions → latestExecutionId →
 * activeExecutionId`). If this file fails, the class conversion strategy is
 * wrong and nothing else should proceed.
 *
 * The `.svelte.test.ts` filename is load-bearing: vite-plugin-svelte only
 * compiles runes in files matching the `.svelte.` infix.
 */

import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import {
  createFlowDropInstance,
  getDefaultInstance,
  DEFAULT_DRAFT_PREFIX
} from '$lib/stores/instanceContainer.svelte.js';
import { createTestWorkflow } from '../../utils/index.js';

// ---------------------------------------------------------------------------
// Spike: the exact reactive shape PlaygroundStore will use in Phase 2 —
// $state class fields plus a chain of $derived fields referencing each other
// through `this.#...`, mirroring playgroundStore.svelte.ts lines 83-100.
// ---------------------------------------------------------------------------

interface TrialExecution {
  id: string;
  isSubflow?: boolean;
}

interface TrialSession {
  executions: TrialExecution[];
  status: string;
}

class TrialPlaygroundStore {
  #currentSession = $state<TrialSession | null>(null);
  #pinnedExecutionId = $state<string | null>(null);

  #selectableExecutions = $derived(
    (this.#currentSession?.executions ?? []).filter((e) => !e.isSubflow)
  );
  #latestExecutionId = $derived(this.#selectableExecutions.at(-1)?.id ?? null);
  #activeExecutionId = $derived(this.#pinnedExecutionId ?? this.#latestExecutionId);
  #isExecuting = $derived(this.#currentSession?.status === 'running');

  get selectableExecutions(): TrialExecution[] {
    return this.#selectableExecutions;
  }
  get activeExecutionId(): string | null {
    return this.#activeExecutionId;
  }
  get isExecuting(): boolean {
    return this.#isExecuting;
  }

  setSession(session: TrialSession | null): void {
    this.#currentSession = session;
  }
  pinExecution(id: string | null): void {
    this.#pinnedExecutionId = id;
  }
}

describe('store-class reactivity spike ($state/$derived as # class fields)', () => {
  it('chains sibling deriveds through #private fields', () => {
    const store = new TrialPlaygroundStore();
    expect(store.activeExecutionId).toBeNull();

    store.setSession({
      executions: [{ id: 'main-1' }, { id: 'sub-1', isSubflow: true }, { id: 'main-2' }],
      status: 'running'
    });

    expect(store.selectableExecutions.map((e) => e.id)).toEqual(['main-1', 'main-2']);
    expect(store.activeExecutionId).toBe('main-2'); // latest, not the subflow
    expect(store.isExecuting).toBe(true);

    store.pinExecution('main-1');
    expect(store.activeExecutionId).toBe('main-1'); // pin wins over latest
  });

  it('recomputes class-field deriveds across flushes in a reactive root', () => {
    // Note: vitest resolves Svelte's server branch, where $effect bodies never
    // run — so this follows the repo convention (messages/reactivity.svelte.test.ts)
    // of flushSync + closure reads instead of effect-run logging.
    const cleanup = $effect.root(() => {
      const store = new TrialPlaygroundStore();
      const readActive = () => store.activeExecutionId;

      expect(readActive()).toBeNull();

      store.setSession({ executions: [{ id: 'run-1' }], status: 'completed' });
      flushSync();
      expect(readActive()).toBe('run-1');

      store.setSession({
        executions: [{ id: 'run-1' }, { id: 'run-2' }],
        status: 'completed'
      });
      flushSync();
      expect(readActive()).toBe('run-2');

      store.pinExecution('run-1');
      flushSync();
      expect(readActive()).toBe('run-1');
    });
    cleanup();
  });

  it('keeps reactive state isolated between two instances', () => {
    const a = new TrialPlaygroundStore();
    const b = new TrialPlaygroundStore();

    a.setSession({ executions: [{ id: 'a-run' }], status: 'running' });

    expect(a.activeExecutionId).toBe('a-run');
    expect(b.activeExecutionId).toBeNull();
    expect(a.isExecuting).toBe(true);
    expect(b.isExecuting).toBe(false);
  });
});

describe('FlowDropInstance container', () => {
  it('gives each instance its own history service', () => {
    const a = createFlowDropInstance();
    const b = createFlowDropInstance();
    expect(a.history).not.toBe(b.history);

    const workflow = createTestWorkflow();
    a.history.initialize(workflow);
    a.history.push({ ...workflow, name: 'changed' }, { description: 'edit' });

    expect(a.history.canUndo()).toBe(true);
    expect(b.history.canUndo()).toBe(false);
  });

  it('scopes storage prefixes per instance, including the default', () => {
    const a = createFlowDropInstance({ id: 'left' });
    const b = createFlowDropInstance({ id: 'right' });
    expect(a.storagePrefix).toBe(`${DEFAULT_DRAFT_PREFIX}:left`);
    expect(b.storagePrefix).toBe(`${DEFAULT_DRAFT_PREFIX}:right`);

    const def = getDefaultInstance();
    expect(def.storagePrefix).toBe(`${DEFAULT_DRAFT_PREFIX}:default`);
  });

  it('returns the same default instance on repeated access', () => {
    expect(getDefaultInstance()).toBe(getDefaultInstance());
  });

  it('isolates workflow state between two instances', () => {
    const a = createFlowDropInstance();
    const b = createFlowDropInstance();

    a.workflow.initialize(createTestWorkflow({ name: 'Workflow A' }));
    b.workflow.initialize(createTestWorkflow({ name: 'Workflow B' }));

    a.workflow.updateName('Workflow A (renamed)');

    expect(a.workflow.name).toBe('Workflow A (renamed)');
    expect(b.workflow.name).toBe('Workflow B');
    expect(a.workflow.isDirty).toBe(true);
    expect(b.workflow.isDirty).toBe(false);
  });

  it('isolates undo/redo between two instances', () => {
    const a = createFlowDropInstance();
    const b = createFlowDropInstance();

    a.workflow.initialize(createTestWorkflow({ name: 'A' }));
    b.workflow.initialize(createTestWorkflow({ name: 'B' }));

    // Mutate A through an action that records history
    a.workflow.pushHistory('Rename');
    a.workflow.updateName('A2');

    expect(a.historyBindings.actions.canUndo()).toBe(true);
    expect(b.historyBindings.actions.canUndo()).toBe(false);

    // Undo in A restores A's workflow (default container wiring) and leaves B alone
    expect(a.historyBindings.undo()).toBe(true);
    expect(a.workflow.name).toBe('A');
    expect(b.workflow.name).toBe('B');
  });

  it('destroy() detaches one instance without touching its sibling', () => {
    const a = createFlowDropInstance();
    const b = createFlowDropInstance();

    const dirtyChanges: boolean[] = [];
    b.workflow.setOnDirtyStateChange((d) => dirtyChanges.push(d));

    a.workflow.initialize(createTestWorkflow({ name: 'A' }));
    b.workflow.initialize(createTestWorkflow({ name: 'B' }));

    a.destroy();

    // B's callbacks and history keep working after A is destroyed
    b.workflow.updateName('B2');
    expect(dirtyChanges).toContain(true);
    expect(b.workflow.name).toBe('B2');

    // A's history subscription is released; destroy is idempotent
    a.destroy();
  });
});
