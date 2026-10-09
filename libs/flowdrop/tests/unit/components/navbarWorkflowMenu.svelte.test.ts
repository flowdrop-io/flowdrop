/**
 * Navbar: the ghost Workflow button (pressed while the panel is open, runs the
 * toggle) and the wordmark menu that holds `navigation` actions, which then
 * leave the Save menu.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Navbar from '$lib/components/Navbar.svelte';
import type { NavbarAction } from '$lib/types/navbar.js';

let app: ReturnType<typeof mount> | null = null;
let target: HTMLElement;

afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function render(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(Navbar, { target, props: { showSettings: false, showStatus: false, ...props } });
  flushSync();
}

const actions: NavbarAction[] = [
  { label: 'Save', href: '#save' },
  { label: 'Doctor', href: '#doctor' },
  { label: 'Dashboard', href: '#dash', navigation: true },
  { label: 'Back to workflows', href: '#back', navigation: true }
];

const workflowButton = () =>
  target.querySelector<HTMLButtonElement>('[data-testid="navbar-workflow-button"]');

describe('Navbar Workflow button', () => {
  it('is absent without a handler', () => {
    render({});
    expect(workflowButton()).toBeNull();
  });

  it('toggles through the handler and reads as pressed while the panel is open', () => {
    const onWorkflowSettings = vi.fn();
    render({ onWorkflowSettings, workflowSettingsOpen: false });
    const button = workflowButton();
    expect(button?.textContent?.trim()).toBe('Workflow');
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    button?.click();
    expect(onWorkflowSettings).toHaveBeenCalledTimes(1);

    unmount(app!);
    document.body.innerHTML = '';
    render({ onWorkflowSettings, workflowSettingsOpen: true });
    expect(workflowButton()?.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Navbar wordmark navigation', () => {
  it('opens a menu of the navigation actions from the wordmark', () => {
    render({ primaryActions: actions });
    const trigger = target.querySelector<HTMLButtonElement>('[data-testid="navbar-wordmark-menu"]');
    expect(trigger).not.toBeNull();
    trigger?.click();
    flushSync();
    const items = Array.from(target.querySelectorAll('[role="menuitem"]')).map((el) =>
      el.textContent?.trim()
    );
    expect(items).toEqual(['Dashboard', 'Back to workflows']);
  });

  it('keeps navigation actions out of the Save menu', () => {
    render({ primaryActions: actions });
    target.querySelector<HTMLButtonElement>('.flowdrop-navbar__dropdown-trigger')?.click();
    flushSync();
    const items = Array.from(target.querySelectorAll('[role="menuitem"]')).map((el) =>
      el.textContent?.trim()
    );
    expect(items).toEqual(['Doctor']);
  });

  it('leaves the wordmark plain, and the actions where they were, when there is no navigation', () => {
    render({ primaryActions: actions.filter((a) => !a.navigation) });
    expect(target.querySelector('[data-testid="navbar-wordmark-menu"]')).toBeNull();
  });
});
