import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Toolbar from '$lib/components/primitives/Toolbar.svelte';
import ToolbarSeparator from '$lib/components/primitives/ToolbarSeparator.svelte';

let instance: ReturnType<typeof mount> | null = null;
function render(props: Record<string, unknown> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Toolbar, {
    target,
    props: {
      ariaLabel: 'Canvas',
      children: createRawSnippet(() => ({
        render: () =>
          '<span><button id="a">A</button><button id="b">B</button><button id="c" disabled>C</button><button id="d">D</button></span>'
      })),
      ...props
    } as never
  });
  flushSync();
  return target.querySelector('[role="toolbar"]') as HTMLElement;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  document.body.innerHTML = '';
});
const key = (el: HTMLElement, k: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const $ = (id: string) => document.getElementById(id) as HTMLElement;

describe('primitives/Toolbar', () => {
  it('exposes role, label and orientation', () => {
    const t = render({ orientation: 'vertical' });
    expect(t.getAttribute('aria-label')).toBe('Canvas');
    expect(t.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('moves focus with arrows, skipping disabled, wrapping, Home/End', () => {
    render();
    $('a').focus();
    key($('a'), 'ArrowRight');
    expect(document.activeElement).toBe($('b'));
    key($('b'), 'ArrowRight');
    expect(document.activeElement).toBe($('d'));
    key($('d'), 'ArrowRight');
    expect(document.activeElement).toBe($('a'));
    key($('a'), 'ArrowLeft');
    expect(document.activeElement).toBe($('d'));
    key($('d'), 'Home');
    expect(document.activeElement).toBe($('a'));
    key($('a'), 'End');
    expect(document.activeElement).toBe($('d'));
  });

  it('vertical uses Up/Down and ignores Left/Right', () => {
    render({ orientation: 'vertical' });
    $('a').focus();
    key($('a'), 'ArrowRight');
    expect(document.activeElement).toBe($('a'));
    key($('a'), 'ArrowDown');
    expect(document.activeElement).toBe($('b'));
  });
});

describe('primitives/ToolbarSeparator', () => {
  it('renders a separator', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(ToolbarSeparator, { target });
    flushSync();
    const s = target.querySelector('[role="separator"]');
    expect(s?.getAttribute('aria-orientation')).toBe('vertical');
  });
});
