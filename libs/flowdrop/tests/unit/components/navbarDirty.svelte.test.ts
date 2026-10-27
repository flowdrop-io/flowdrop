/**
 * Navbar dirty marker: the first task action (Save) shows a dot and an
 * "Unsaved changes" accessible name while the workflow has unsaved changes.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Navbar from '$lib/components/Navbar.svelte';

let app: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function render(dirty: boolean | undefined, label = 'Save') {
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(Navbar, {
    target,
    props: {
      dirty,
      showSettings: false,
      showStatus: false,
      primaryActions: [
        { label, href: '#', variant: 'primary' as const },
        { label: 'Export', href: '#', variant: 'secondary' as const }
      ]
    }
  });
  flushSync();
  return target;
}

describe('Navbar dirty marker', () => {
  it('shows no dot and no data-dirty when clean', () => {
    const target = render(false);
    expect(target.querySelector('.flowdrop-navbar__dirty-dot')).toBeNull();
    expect(target.querySelector('[data-dirty]')).toBeNull();
  });

  it('shows no dot when the prop is omitted', () => {
    const target = render(undefined);
    expect(target.querySelector('.flowdrop-navbar__dirty-dot')).toBeNull();
  });

  it('marks the main button with a dot and an accessible name when dirty', () => {
    const target = render(true);
    const main = target.querySelector('.flowdrop-navbar__primary-action') as HTMLElement;
    expect(main.getAttribute('data-dirty')).toBe('true');
    expect(main.querySelector('.flowdrop-navbar__dirty-dot')?.getAttribute('aria-hidden')).toBe(
      'true'
    );
    expect(main.textContent).toContain('Unsaved changes');
    expect(main.getAttribute('title')).toContain('Unsaved changes');
  });

  it('marks only the first split-mode action', () => {
    const target = render(true);
    const split = target.querySelectorAll('.flowdrop-navbar__split-actions a');
    expect(split[0].getAttribute('data-dirty')).toBe('true');
    expect(split[1].getAttribute('data-dirty')).toBeNull();
  });

  it('works with a host-supplied first action', () => {
    const target = render(true, 'Publish');
    const main = target.querySelector('.flowdrop-navbar__primary-action') as HTMLElement;
    expect(main.textContent).toContain('Publish');
    expect(main.textContent).toContain('Unsaved changes');
    expect(main.getAttribute('data-dirty')).toBe('true');
  });
});
