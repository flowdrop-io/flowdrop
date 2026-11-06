/**
 * confirmImpact(): the instance going away settles the question.
 */

import { describe, it, expect, afterEach, beforeAll, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import { confirmImpact, impactPending } from '$lib/services/impactGate.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('confirmImpact and instance teardown', () => {
  it('resolves false, removes the dialog and clears pending when the instance is destroyed', async () => {
    const fd = createFlowDropInstance({ id: 'impact-destroy' });
    const result = confirmImpact({ error: 'check failed', instance: fd });
    flushSync();
    expect(impactPending(fd)).toBe(true);
    expect(document.querySelector('.fd-impact-confirm-host')).not.toBeNull();
    fd.destroy();
    expect(await result).toEqual({ action: 'cancel' });
    expect(impactPending(fd)).toBe(false);
    expect(document.querySelector('.fd-impact-confirm-host')).toBeNull();
  });

  it('forgets the destroy hook once answered, so a later destroy does nothing', async () => {
    const fd = createFlowDropInstance({ id: 'impact-answered' });
    const result = confirmImpact({ error: 'check failed', instance: fd });
    flushSync();
    document.querySelector<HTMLElement>('[data-testid="flowdrop-impact-cancel"]')!.click();
    expect(await result).toEqual({ action: 'cancel' });
    expect(() => fd.destroy()).not.toThrow();
  });
});
