/**
 * A toast that carries an action never auto-dismisses and can always be
 * closed: the user may still be reading, or reaching for, the next step.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writable } from 'svelte/store';

const toastFn = vi.fn((..._args: unknown[]) => 'id');
vi.mock('svelte-5-french-toast', () => ({
  toast: Object.assign((...args: unknown[]) => toastFn(...args), { dismiss: vi.fn() }),
  useToasterStore: () => ({ toasts: writable([]) })
}));

import { showSuccess, showInfo } from '$lib/services/toastService.js';

function lastCall(): { duration: number; props: { dismissible: boolean } } {
  return toastFn.mock.calls.at(-1)![1] as { duration: number; props: { dismissible: boolean } };
}

describe('toasts with an action', () => {
  beforeEach(() => toastFn.mockClear());

  it('a plain success still goes by itself', () => {
    showSuccess('Saved');
    expect(lastCall().duration).toBe(4000);
    expect(lastCall().props.dismissible).toBe(false);
  });

  it('a success with an action stays and can be closed', () => {
    showSuccess({ title: 'Deleted', action: { label: 'Undo', onClick: () => {} } });
    expect(lastCall().duration).toBe(Infinity);
    expect(lastCall().props.dismissible).toBe(true);
  });

  it('an info toast with an action stays even when a duration is asked for', () => {
    showInfo('Moved', { duration: 1000, action: { label: 'Undo', onClick: () => {} } });
    expect(lastCall().duration).toBe(Infinity);
    expect(lastCall().props.dismissible).toBe(true);
  });
});
