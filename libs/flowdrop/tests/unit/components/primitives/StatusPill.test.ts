import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

import StatusPill, { counterScale } from '$lib/components/primitives/StatusPill.svelte';

let target: HTMLElement;
let instance: ReturnType<typeof mount> | null = null;
function render(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(StatusPill, { target, props: props as never });
  flushSync();
  return target.querySelector('.flowdrop-ui-status-pill') as HTMLElement;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('StatusPill', () => {
  it.each([
    ['running', 'Running'],
    ['completed', 'Completed'],
    ['waiting', 'Waiting for you'],
    ['failed', 'Failed'],
    ['skipped', 'Skipped']
  ])('defaults the %s label', (status, label) => {
    const el = render({ status });
    expect(el.textContent).toContain(label);
    expect(el.dataset.status).toBe(status);
  });

  it('uses a custom label and has no live region', () => {
    const el = render({ status: 'failed', label: 'Boom' });
    expect(el.textContent).toContain('Boom');
    expect(el.getAttribute('role')).toBeNull();
  });

  it('shows the count only when greater than 1', () => {
    expect(
      render({ status: 'failed', count: 1 }).querySelector('.flowdrop-ui-status-pill__count')
    ).toBeNull();
    unmount(instance!);
    const el = render({ status: 'failed', count: 3 });
    expect(el.querySelector('.flowdrop-ui-status-pill__count')?.textContent).toBe('3');
  });

  it('counter-scales only with screenSize', () => {
    expect(render({ status: 'running', zoom: 0.5 }).getAttribute('style')).toBeNull();
    unmount(instance!);
    const el = render({ status: 'running', zoom: 0.5, screenSize: true });
    expect(el.style.transform).toBe('scale(2)');
    expect(el.style.transformOrigin).toBe('center bottom');
  });

  it('clamps the counter-scale to [1, 2.2]', () => {
    expect(counterScale(2)).toBe(1);
    expect(counterScale(1)).toBe(1);
    expect(counterScale(0.5)).toBe(2);
    expect(counterScale(0.1)).toBe(2.2);
    expect(counterScale(0)).toBe(1);
    expect(counterScale(NaN)).toBe(1);
  });
});
