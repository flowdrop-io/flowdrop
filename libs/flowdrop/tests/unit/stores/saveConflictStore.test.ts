/**
 * Unit Test - SaveConflictStore
 *
 * Keep mine needs the server's revision: when the refusal did not name it, it
 * is read from the saved version, and without one nothing is sent.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveConflictStore } from '$lib/stores/saveConflictStore.svelte.js';
import { defaultMessages } from '$lib/messages/defaults.js';
import { showError } from '$lib/services/toastService.js';
import { createTestWorkflow } from '../../utils/index.js';

vi.mock('$lib/services/toastService.js', () => ({
  apiToasts: { error: vi.fn() },
  dismissToast: vi.fn(),
  showError: vi.fn()
}));

function setup(loaded: () => Promise<unknown>) {
  const acknowledgeServer = vi.fn();
  const retry = vi.fn().mockResolvedValue(true);
  const loadWorkflow = vi.fn(loaded);
  const store = new SaveConflictStore({
    workflow: {
      current: createTestWorkflow({ id: 'wf-1' }),
      initialize: vi.fn(),
      acknowledgeServer
    },
    loadWorkflow,
    schedule: vi.fn(),
    messages: () => defaultMessages
  } as never);
  return { store, acknowledgeServer, retry, loadWorkflow };
}

describe('SaveConflictStore keepMine', () => {
  beforeEach(() => vi.mocked(showError).mockClear());

  it('uses the revision the refusal named, without loading anything', async () => {
    const { store, acknowledgeServer, retry, loadWorkflow } = setup(async () => null);
    store.report({ currentRevision: '200', retry });
    await store.keepMine();
    expect(loadWorkflow).not.toHaveBeenCalled();
    expect(acknowledgeServer).toHaveBeenCalledWith({ revision: '200' });
    expect(retry).toHaveBeenCalled();
  });

  it('reads the revision from the saved version when the refusal has none', async () => {
    const { store, acknowledgeServer, retry } = setup(async () => ({
      ...createTestWorkflow({ id: 'wf-1' }),
      revision: 300
    }));
    store.report({ currentRevision: null, retry });
    await store.keepMine();
    expect(acknowledgeServer).toHaveBeenCalledWith({ revision: '300' });
    expect(retry).toHaveBeenCalled();
  });

  it('sends nothing and keeps the choice open when the saved version has no revision', async () => {
    const { store, acknowledgeServer, retry } = setup(async () =>
      createTestWorkflow({ id: 'wf-1' })
    );
    store.report({ currentRevision: null, retry });
    vi.mocked(showError).mockClear();
    await store.keepMine();
    expect(acknowledgeServer).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalledWith(defaultMessages.saveConflict.noRevision);
    // Still pending: a later try with a loadable revision works.
    await store.keepMine();
    expect(retry).not.toHaveBeenCalled();
  });

  it('sends nothing when the saved version cannot be loaded', async () => {
    const { store, acknowledgeServer, retry } = setup(async () => {
      throw new Error('down');
    });
    store.report({ currentRevision: null, retry });
    await store.keepMine();
    expect(acknowledgeServer).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
  });

  it('shows no toast when told not to, and keepMine still works', async () => {
    const { store, acknowledgeServer, retry } = setup(async () => null);
    vi.mocked(showError).mockClear();
    store.report({ currentRevision: '5', retry }, false);
    expect(showError).not.toHaveBeenCalled();
    await store.keepMine();
    expect(acknowledgeServer).toHaveBeenCalledWith({ revision: '5' });
  });
});
