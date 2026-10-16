/**
 * MainLayout reports the final width / height when a resize ends (arrow keys
 * and drag), clamps to the ratio cap, and keeps the divider's ARIA in step.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import MainLayout from '$lib/components/layouts/MainLayout.svelte';

let mounted: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

const snip = (t: string) => createRawSnippet(() => ({ render: () => `<div>${t}</div>` }));

function render(extra: Record<string, unknown> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(MainLayout, {
    target,
    props: {
      showHeader: false,
      showRightSidebar: false,
      leftSidebar: snip('left'),
      leftSidebarWidth: 280,
      leftSidebarMinWidth: 220,
      leftSidebarMaxWidth: 560,
      children: snip('main'),
      ...extra
    }
  });
  flushSync();
  return target;
}

const key = (el: Element, k: string, shiftKey = false) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true }));
  flushSync();
};

describe('MainLayout left divider', () => {
  it('saves the width on each arrow-key step and keeps aria-valuenow in step', () => {
    const onLeftSidebarResize = vi.fn();
    const target = render({ onLeftSidebarResize });
    const sep = target.querySelector('[role="separator"]')!;
    expect(sep.getAttribute('aria-valuenow')).toBe('280');
    key(sep, 'ArrowRight');
    expect(onLeftSidebarResize).toHaveBeenLastCalledWith(290);
    key(sep, 'ArrowLeft', true);
    expect(onLeftSidebarResize).toHaveBeenLastCalledWith(240);
    expect(sep.getAttribute('aria-valuenow')).toBe('240');
  });

  it('stops at the floor and at the maximum', () => {
    const onLeftSidebarResize = vi.fn();
    const target = render({ onLeftSidebarResize, leftSidebarWidth: 230, leftSidebarMaxWidth: 250 });
    const sep = target.querySelector('[role="separator"]')!;
    key(sep, 'ArrowLeft', true);
    expect(onLeftSidebarResize).toHaveBeenLastCalledWith(220);
    key(sep, 'ArrowRight', true);
    key(sep, 'ArrowRight', true);
    expect(onLeftSidebarResize).toHaveBeenLastCalledWith(250);
  });

  it('saves on pointer-up after a drag, not before', () => {
    const onLeftSidebarResize = vi.fn();
    const target = render({ onLeftSidebarResize });
    const sep = target.querySelector('[role="separator"]')!;
    sep.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 280 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));
    flushSync();
    expect(onLeftSidebarResize).not.toHaveBeenCalled();
    window.dispatchEvent(new MouseEvent('mouseup'));
    flushSync();
    expect(onLeftSidebarResize).toHaveBeenCalledTimes(1);
    expect(onLeftSidebarResize).toHaveBeenCalledWith(400);
  });

  it('has no divider when split panes are off', () => {
    const target = render({ enableLeftSplitPane: false });
    expect(target.querySelector('[role="separator"]')).toBeNull();
  });
});

describe('MainLayout bottom strip', () => {
  it('draws the strip as the last row when no panel is open', () => {
    const target = render({ bottomStrip: snip('strip') });
    expect(target.querySelector('.flowdrop-main-layout__strip')?.textContent).toBe('strip');
  });

  it('puts the strip above the open panel when it is its header', () => {
    const target = render({
      bottomStrip: snip('strip'),
      bottomStripIsHeader: true,
      showBottomPanel: true,
      bottomPanel: snip('panel')
    });
    const strip = target.querySelector('.flowdrop-main-layout__strip')!;
    expect(
      strip.nextElementSibling?.classList.contains('flowdrop-main-layout__panel--bottom')
    ).toBe(true);
  });

  it('saves the panel height on arrow keys', () => {
    const onBottomPanelResize = vi.fn();
    const target = render({
      showBottomPanel: true,
      bottomPanel: snip('panel'),
      bottomPanelHeight: 220,
      onBottomPanelResize
    });
    const sep = target.querySelector('[aria-orientation="horizontal"]')!;
    key(sep, 'ArrowUp');
    expect(onBottomPanelResize).toHaveBeenLastCalledWith(230);
  });
});
