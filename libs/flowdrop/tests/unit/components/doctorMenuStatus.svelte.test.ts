/**
 * DoctorMenu status: a slow check shows 'Checking...', a failed one shows
 * 'Check unavailable' with Retry, and 'off' stays quiet.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import DoctorMenu from '$lib/components/DoctorMenu.svelte';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';

let app: ReturnType<typeof mount> | null = null;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function render(initial: string) {
  const state = $state({ status: initial });
  const diagnoseNow = vi.fn();
  const fd = {
    doctor: {
      supported: true,
      problems: [],
      openRequest: 0,
      notice: null,
      applyingId: null,
      dismissNotice: () => {},
      diagnoseNow,
      get status() {
        return state.status;
      }
    },
    workflow: { nodes: [] }
  };
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(DoctorMenu, { target, context: new Map([[FLOWDROP_INSTANCE_KEY, fd]]) });
  flushSync();
  return { target, state, diagnoseNow };
}

describe('DoctorMenu status', () => {
  it('shows nothing for a check shorter than 600 ms', () => {
    const { target, state } = render('checking');
    vi.advanceTimersByTime(500);
    flushSync();
    expect(target.textContent).not.toContain('Checking...');
    state.status = 'ready';
    flushSync();
    vi.advanceTimersByTime(1000);
    flushSync();
    expect(target.textContent?.trim()).toBe('');
  });

  it('shows Checking... once the check has run for 600 ms', () => {
    const { target } = render('checking');
    vi.advanceTimersByTime(600);
    flushSync();
    expect(target.querySelector('[role="status"]')?.textContent).toContain('Checking...');
  });

  it('keeps one live region mounted and changes its text', () => {
    const { target, state } = render('checking');
    vi.advanceTimersByTime(600);
    flushSync();
    const region = target.querySelector('[role="status"]');
    expect(region?.textContent).toBe('Checking...');
    state.status = 'error';
    flushSync();
    expect(target.querySelector('[role="status"]')).toBe(region);
    expect(region?.textContent).toBe('Check unavailable');
    state.status = 'ready';
    flushSync();
    expect(region?.textContent).toBe('');
  });

  it('has the live region mounted before the indicator appears and says Checking... in it', () => {
    const { target, state } = render('ready');
    const region = target.querySelector('[role="status"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe('');
    state.status = 'checking';
    flushSync();
    vi.advanceTimersByTime(600);
    flushSync();
    expect(target.querySelector('[role="status"]')).toBe(region);
    expect(region?.textContent).toBe('Checking...');
  });

  it('shows Check unavailable with a Retry that diagnoses again', () => {
    const { target, diagnoseNow } = render('error');
    expect(target.textContent).toContain('Check unavailable');
    target.querySelector<HTMLButtonElement>('[data-testid="doctor-retry"]')?.click();
    expect(diagnoseNow).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when the backend has no Doctor', () => {
    const { target } = render('off');
    vi.advanceTimersByTime(2000);
    flushSync();
    expect(target.textContent?.trim()).toBe('');
  });
});
