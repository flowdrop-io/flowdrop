import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

import Composer from '$lib/components/primitives/Composer.svelte';

let target: HTMLElement;
let instance: ReturnType<typeof mount> | null = null;
function render(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Composer, { target, props: props as never });
  flushSync();
  return target;
}
const ta = () => target.querySelector('textarea') as HTMLTextAreaElement;
const send = () => target.querySelector('button[aria-label="Send"]') as HTMLButtonElement;
function press(init: KeyboardEventInit & { keyCode?: number }) {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  if (init.keyCode !== undefined) Object.defineProperty(ev, 'keyCode', { value: init.keyCode });
  ta().dispatchEvent(ev);
  return ev;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('Composer', () => {
  it('Enter submits the value and prevents the newline', () => {
    const onsubmit = vi.fn();
    render({ value: 'hello', onsubmit });
    const ev = press({ key: 'Enter' });
    expect(onsubmit).toHaveBeenCalledWith('hello');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('Shift+Enter does not submit', () => {
    const onsubmit = vi.fn();
    render({ value: 'hello', onsubmit });
    expect(press({ key: 'Enter', shiftKey: true }).defaultPrevented).toBe(false);
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it('does not submit while an IME composition is active', () => {
    const onsubmit = vi.fn();
    render({ value: 'にほん', onsubmit });
    press({ key: 'Enter', isComposing: true });
    press({ key: 'Enter', keyCode: 229 });
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it('does not submit blank, disabled or busy', () => {
    const onsubmit = vi.fn();
    render({ value: '   ', onsubmit });
    press({ key: 'Enter' });
    expect(onsubmit).not.toHaveBeenCalled();
    expect(send().disabled).toBe(true);
    unmount(instance!);
    render({ value: 'x', busy: true, onsubmit });
    press({ key: 'Enter' });
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it('send button submits', () => {
    const onsubmit = vi.fn();
    render({ value: 'go', onsubmit });
    send().click();
    expect(onsubmit).toHaveBeenCalledWith('go');
  });

  it('busy swaps send for a stop button that calls onstop', () => {
    const onstop = vi.fn();
    render({ value: 'x', busy: true, onstop });
    expect(send()).toBeNull();
    (target.querySelector('button[aria-label="Stop"]') as HTMLButtonElement).click();
    expect(onstop).toHaveBeenCalledOnce();
  });

  it('shows the default placeholder, hint and attach button', () => {
    const onattach = vi.fn();
    render({ hint: 'Enter to send', onattach });
    expect(ta().placeholder).toBe('Type a message');
    expect(target.textContent).toContain('Enter to send');
    (target.querySelector('button[aria-label="Attach"]') as HTMLButtonElement).click();
    expect(onattach).toHaveBeenCalledOnce();
  });

  it('applies the mono variant and disables the textarea', () => {
    render({ variant: 'mono', disabled: true });
    expect(target.querySelector('.flowdrop-ui-composer--mono')).not.toBeNull();
    expect(ta().disabled).toBe(true);
  });
});
