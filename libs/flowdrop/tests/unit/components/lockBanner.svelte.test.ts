/**
 * LockBanner and LockFence: the banner lists the reasons and the actions of the
 * lock and reports a pressed action; the fence makes the value-changing controls
 * read-only while locked and leaves the ones that only look (open, close) alone.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import LockBanner from '$lib/components/LockBanner.svelte';
import LockFence from '$lib/components/LockFence.svelte';
import FormField from '$lib/components/form/FormFieldLight.svelte';
import { FORM_READ_ONLY_KEY } from '$lib/components/form/readOnly.js';
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
    { kind: 'managed', message: 'A module provides it.', url: 'javascript:alert(1)' },
    { kind: 'a', message: 'Backslash.', url: '/\\example.test' },
    { kind: 'b', message: 'Tab.', url: '/\tfoo' },
    { kind: 'c', message: 'Newline.', url: 'https://example.test/\nfoo' },
    { kind: 'd', message: 'Protocol relative.', url: '//example.test' },
    { kind: 'e', message: 'Site path.', url: '/docs/lock' }
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
    expect(Array.from(links).map((a) => a.getAttribute('href'))).toEqual([
      'https://example.test/usage',
      '/docs/lock'
    ]);
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
  const children = createRawSnippet(() => ({
    render: () =>
      '<div><input type="text" /><button type="button" data-testid="toggle" aria-expanded="false">More</button></div>'
  }));

  it('sets the read-only context while locked and clears it when unlocked', () => {
    const fd = createFlowDropInstance({ id: 'fence' });
    render(LockFence, fd, { children });
    const fence = target.querySelector('.flowdrop-lock-fence') as HTMLElement;
    expect(fence.hasAttribute('data-locked')).toBe(false);
    fd.lock.set(lock);
    flushSync();
    expect(fence.hasAttribute('data-locked')).toBe(true);
    fd.lock.set(null);
    flushSync();
    expect(fence.hasAttribute('data-locked')).toBe(false);
  });

  it('does not disable a plain button inside it', () => {
    const fd = createFlowDropInstance({ id: 'fence-plain' });
    fd.lock.set(lock);
    render(LockFence, fd, { children });
    expect((target.querySelector('[data-testid="toggle"]') as HTMLButtonElement).disabled).toBe(
      false
    );
  });
});

describe('a form that is read-only', () => {
  const title = { type: 'string', title: 'Title' };
  const headers = {
    type: 'array',
    title: 'Headers',
    items: {
      type: 'object',
      title: 'Header',
      properties: {
        name: { type: 'string', title: 'Name' },
        value: { type: 'string', title: 'Value' },
        note: { type: 'string', title: 'Note' }
      }
    }
  };

  function mountForm(readOnly: boolean) {
    target = document.createElement('div');
    document.body.appendChild(target);
    const fd = createFlowDropInstance({ id: `ro-${readOnly}` });
    const host = document.createElement('div');
    target.appendChild(host);
    const field = (fieldKey: string, schema: unknown, value: unknown) =>
      mount(FormField as never, {
        target: host,
        props: { fieldKey, schema, value, onChange: () => {} },
        context: new Map<unknown, unknown>([
          [FLOWDROP_INSTANCE_KEY, fd],
          [FORM_READ_ONLY_KEY, () => readOnly]
        ])
      });
    const first = field('title', title, 'Hello');
    const second = field('headers', headers, [{ name: 'a', value: 'b', note: 'c' }]);
    flushSync();
    return () => {
      unmount(first);
      unmount(second);
    };
  }

  it('makes the inputs and the add button read-only but keeps the array toggle usable', () => {
    const stop = mountForm(true);
    // Read-only, not disabled: the value can still be focused, selected and copied.
    const input = target.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);
    const toggle = target.querySelector('.form-array__item-toggle') as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    expect(toggle.disabled).toBe(false);
    const add = target.querySelector('.form-array__footer button') as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    flushSync();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    stop();
  });

  it('leaves the inputs alone when the form is not read-only', () => {
    const stop = mountForm(false);
    expect((target.querySelector('input[type="text"]') as HTMLInputElement).disabled).toBe(false);
    stop();
  });
});
