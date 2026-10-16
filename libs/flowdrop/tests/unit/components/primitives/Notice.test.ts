import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';

import Notice from '$lib/components/primitives/Notice.svelte';

let target: HTMLElement;
let instance: ReturnType<typeof mount> | null = null;
const snip = (html: string) => createRawSnippet(() => ({ render: () => html }));
function render(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Notice, { target, props: props as never });
  flushSync();
  return target.querySelector('.flowdrop-ui-notice') as HTMLElement;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('Notice', () => {
  it.each([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'alert'],
    ['error', 'alert']
  ])('%s uses role=%s', (tone, role) => {
    expect(render({ tone }).getAttribute('role')).toBe(role);
    unmount(instance!);
  });

  it('allows a role override', () => {
    expect(render({ tone: 'error', role: 'status' }).getAttribute('role')).toBe('status');
  });

  it('renders title, body and actions', () => {
    const el = render({
      title: 'T',
      children: snip('<span>Body</span>'),
      actions: snip('<button id="a">a</button>')
    });
    expect(el.querySelector('.flowdrop-ui-notice__title')?.textContent).toBe('T');
    expect(el.querySelector('.flowdrop-ui-notice__body')?.textContent).toBe('Body');
    expect(el.querySelector('#a')).not.toBeNull();
  });

  it('shows a labelled dismiss button only with ondismiss, and calls it', () => {
    expect(render({}).querySelector('button')).toBeNull();
    unmount(instance!);
    const ondismiss = vi.fn();
    const el = render({ ondismiss });
    const btn = el.querySelector('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Dismiss');
    btn.click();
    expect(ondismiss).toHaveBeenCalledOnce();
  });
});
