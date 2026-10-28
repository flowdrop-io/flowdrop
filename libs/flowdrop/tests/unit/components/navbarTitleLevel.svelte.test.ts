/**
 * `Navbar` — the title renders as an h2 unless `titleLevel` is 1 (the page's H1).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Navbar from '$lib/components/Navbar.svelte';

let target: HTMLElement;
let instance: ReturnType<typeof mount> | null = null;

function render(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Navbar, { target, props: { showSettings: false, showStatus: false, ...props } });
  flushSync();
  return target;
}

afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('Navbar title level', () => {
  it('renders the title as an h2 by default', () => {
    const el = render({ title: 'My workflow' });
    expect(el.querySelector('h2.flowdrop-navbar__title-text')?.textContent).toBe('My workflow');
    expect(el.querySelector('h1')).toBeNull();
  });

  it('renders the title as an h1 with titleLevel 1', () => {
    const el = render({ title: 'My workflow', titleLevel: 1 });
    expect(el.querySelector('h1.flowdrop-navbar__title-text')?.textContent).toBe('My workflow');
    expect(el.querySelector('h2')).toBeNull();
  });
});
