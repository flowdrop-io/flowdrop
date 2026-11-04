/**
 * `DismissibleToast` — the body of an error or warning toast. Mounted for
 * real (happy-dom) so the reason list and the close button are exercised on
 * the DOM. The duplicate-reason case is the point: a keyed each would throw
 * here, in production too, and the toast meant to explain a failure would be
 * the failure.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import type { Toast } from 'svelte-5-french-toast';
import DismissibleToast from '$lib/components/toast/DismissibleToast.svelte';

const dismiss = vi.fn();
vi.mock('svelte-5-french-toast', () => ({
  toast: { dismiss: (...args: unknown[]) => dismiss(...args) }
}));

const toast = { id: 'error:x', type: 'error', visible: true } as unknown as Toast;

let target: HTMLElement;
let instance: ReturnType<typeof mount> | null = null;

function render(props: {
  text: string;
  body?: string;
  details?: readonly string[];
  action?: { label: string; onClick: () => void; keepOpen?: boolean };
  actions?: { label: string; onClick: () => void; primary?: boolean; keepOpen?: boolean }[];
  kind?: 'success' | 'error' | 'warning' | 'info';
  dismissible?: boolean;
}) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(DismissibleToast, { target, props: { toast, ...props } });
  flushSync();
  return target;
}

afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
  dismiss.mockReset();
});

describe('DismissibleToast', () => {
  it('renders the headline alone when there are no reasons', () => {
    const el = render({ text: 'Save workflow failed: Workflow validation failed' });
    expect(el.querySelector('.flowdrop-toast-headline')?.textContent).toBe(
      'Save workflow failed: Workflow validation failed'
    );
    expect(el.querySelector('.flowdrop-toast-details')).toBeNull();
  });

  it('lists every reason, including two with the same wording', () => {
    const el = render({
      text: 'Workflow validation failed',
      details: ['Required input is not connected', 'Required input is not connected', 'No model']
    });
    const items = [...el.querySelectorAll('.flowdrop-toast-details li')].map(
      (li) => li.textContent
    );
    expect(items).toEqual([
      'Required input is not connected',
      'Required input is not connected',
      'No model'
    ]);
  });

  it('dismisses its own toast from the close button', () => {
    const el = render({ text: 'x' });
    const button = el.querySelector<HTMLButtonElement>('.flowdrop-toast-close');
    expect(button?.getAttribute('aria-label')).toBe('Dismiss');
    button?.click();
    expect(dismiss).toHaveBeenCalledWith('error:x');
  });

  it('renders the body under the headline and the glyph for its kind', () => {
    const el = render({ text: "Couldn't save", body: 'The workflow is not valid', kind: 'error' });
    expect(el.querySelector('.flowdrop-toast-body')?.textContent).toBe('The workflow is not valid');
    expect(el.querySelector('.flowdrop-toast-row')?.getAttribute('data-kind')).toBe('error');
    expect(el.querySelector('.flowdrop-toast-glyph svg')).not.toBeNull();
  });

  it('runs the action, then dismisses the toast', () => {
    const onClick = vi.fn();
    const el = render({ text: 'x', action: { label: 'Show problems', onClick } });
    const button = el.querySelector<HTMLButtonElement>('.flowdrop-toast-actions button');
    expect(button?.textContent?.trim()).toBe('Show problems');
    button?.click();
    expect(onClick).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledWith('error:x');
  });

  it('renders several actions in order; each runs once and dismisses', () => {
    const first = vi.fn();
    const second = vi.fn();
    const el = render({
      text: 'x',
      actions: [
        { label: 'Reload', onClick: first },
        { label: 'Keep mine', onClick: second }
      ]
    });
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('.flowdrop-toast-actions button')];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Reload', 'Keep mine']);
    expect(buttons[0].className).toContain('--primary');
    expect(buttons[1].className).toContain('--secondary');
    buttons[1].click();
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
    expect(dismiss).toHaveBeenCalledWith('error:x');
    buttons[0].click();
    expect(first).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledTimes(2);
  });

  it('leaves the toast up after an action marked keepOpen', () => {
    const keep = vi.fn();
    const other = vi.fn();
    const el = render({
      text: 'x',
      actions: [
        { label: 'Compare', onClick: keep, keepOpen: true },
        { label: 'Reload', onClick: other }
      ]
    });
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('.flowdrop-toast-actions button')];
    buttons[0].click();
    expect(keep).toHaveBeenCalledOnce();
    expect(dismiss).not.toHaveBeenCalled();
    buttons[1].click();
    expect(dismiss).toHaveBeenCalledWith('error:x');
  });

  it('draws the action marked primary as the main one', () => {
    const el = render({
      text: 'x',
      actions: [
        { label: 'A', onClick: () => {} },
        { label: 'B', onClick: () => {}, primary: true }
      ]
    });
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('.flowdrop-toast-actions button')];
    expect(buttons[0].className).toContain('--secondary');
    expect(buttons[1].className).toContain('--primary');
  });

  it('puts the single action before the list', () => {
    const el = render({
      text: 'x',
      action: { label: 'One', onClick: () => {} },
      actions: [{ label: 'Two', onClick: () => {} }]
    });
    const labels = [...el.querySelectorAll('.flowdrop-toast-actions button')].map((b) =>
      b.textContent?.trim()
    );
    expect(labels).toEqual(['One', 'Two']);
  });

  it('has no close button when it is not dismissible (a success)', () => {
    const el = render({ text: 'Saved', kind: 'success', dismissible: false });
    expect(el.querySelector('.flowdrop-toast-close')).toBeNull();
  });
});
