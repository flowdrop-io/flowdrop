/**
 * LockBanner and LockFence: the banner lists the reasons and the actions of the
 * lock and reports a pressed action; the fence disables form controls while locked.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import LockBanner from '$lib/components/LockBanner.svelte';
import LockFence from '$lib/components/LockFence.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';

let target: HTMLElement;
let mounted: ReturnType<typeof mount> | null = null;

function render(component: typeof LockBanner | typeof LockFence, fd: unknown, props = {}) {
  target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(component as never, {
    target,
    props,
    context: new Map<unknown, unknown>([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  flushSync();
}

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  target?.remove();
});

const lock = {
  reasons: [
    { kind: 'in_use', message: 'Two forms use this workflow.', url: 'https://example.test/usage' },
    { kind: 'managed', message: 'A module provides it.', url: 'javascript:alert(1)' }
  ],
  actions: [
    { id: 'edit', label: 'Edit', primary: true },
    { id: 'later', label: 'Not now' }
  ]
};

describe('LockBanner', () => {
  it('draws nothing while the editor is not locked', () => {
    const fd = createFlowDropInstance({ id: 'banner-none' });
    render(LockBanner, fd);
    expect(target.querySelector('[data-testid="lock-banner"]')).toBeNull();
  });

  it('lists the reasons as text, links only safe addresses, and shows the actions', () => {
    const fd = createFlowDropInstance({ id: 'banner-lock' });
    fd.lock.set(lock);
    render(LockBanner, fd);
    const banner = target.querySelector('[data-testid="lock-banner"]');
    expect(banner?.textContent).toContain('Two forms use this workflow.');
    expect(banner?.textContent).toContain('A module provides it.');
    const links = banner?.querySelectorAll('a') ?? [];
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://example.test/usage');
    expect(target.querySelector('[data-testid="lock-action-edit"]')?.textContent).toContain('Edit');
    expect(target.querySelector('[data-testid="lock-action-later"]')).not.toBeNull();
  });

  it('reports the pressed action, and goes away when the lock is removed', () => {
    const fd = createFlowDropInstance({ id: 'banner-action' });
    const onAction = vi.fn();
    fd.lock.onAction(onAction);
    fd.lock.set(lock);
    render(LockBanner, fd);
    (target.querySelector('[data-testid="lock-action-edit"]') as HTMLElement).click();
    expect(onAction).toHaveBeenCalledWith('edit');
    fd.lock.set(null);
    flushSync();
    expect(target.querySelector('[data-testid="lock-banner"]')).toBeNull();
  });
});

describe('LockFence', () => {
  const children = createRawSnippet(() => ({ render: () => '<input type="text" />' }));

  it('disables the fieldset around the controls while locked and frees them when unlocked', () => {
    const fd = createFlowDropInstance({ id: 'fence' });
    render(LockFence, fd, { children });
    const fence = target.querySelector('fieldset') as HTMLFieldSetElement;
    expect(fence.disabled).toBe(false);
    fd.lock.set(lock);
    flushSync();
    expect(fence.disabled).toBe(true);
    fd.lock.set(null);
    flushSync();
    expect(fence.disabled).toBe(false);
  });
});
