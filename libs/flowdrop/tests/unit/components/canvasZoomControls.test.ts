/**
 * `CanvasZoomControls` — the read-only node count beside the zoom buttons
 * (it replaced the editor's status bar), plus the minimap sizing rule.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Host from '$lib/stories/CanvasZoomControlsHost.svelte';
import {
  MINIMAP_WIDTH,
  MINIMAP_HEIGHT,
  MINIMAP_MIN_CANVAS_WIDTH,
  shouldShowMinimap
} from '$lib/utils/minimapVisibility.js';

let target: HTMLElement;
let instance: ReturnType<typeof mount> | null = null;

function render(props: { nodeCount: number; edgeCount: number; hasCycles?: boolean }) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Host, { target, props });
  flushSync();
  return target;
}

afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('CanvasZoomControls node count', () => {
  it('shows the node count with the full tally as title and accessible name', () => {
    const el = render({ nodeCount: 6, edgeCount: 5 }).querySelector('.fd-zoom-status__count');
    expect(el?.textContent?.trim()).toBe('6 nodes');
    expect(el?.getAttribute('title')).toBe('6 nodes · 5 connections');
    expect(el?.getAttribute('aria-label')).toBe('6 nodes · 5 connections');
  });

  it('uses singular forms', () => {
    const el = render({ nodeCount: 1, edgeCount: 1 }).querySelector('.fd-zoom-status__count');
    expect(el?.textContent?.trim()).toBe('1 node');
    expect(el?.getAttribute('aria-label')).toBe('1 node · 1 connection');
  });

  it('sits in the zoom control group, beside the zoom buttons', () => {
    const root = render({ nodeCount: 2, edgeCount: 1 });
    const controls = root.querySelector('.svelte-flow__controls');
    expect(controls?.querySelector('.svelte-flow__controls-zoomin')).not.toBeNull();
    expect(controls?.querySelector('.fd-zoom-status__count')).not.toBeNull();
  });

  it('warns about cycles only when the graph has one', () => {
    expect(
      render({ nodeCount: 2, edgeCount: 2 }).querySelector('.fd-zoom-status__cycles')
    ).toBeNull();
    unmount(instance!);
    target.remove();
    const warn = render({ nodeCount: 2, edgeCount: 2, hasCycles: true }).querySelector(
      '.fd-zoom-status__cycles'
    );
    expect(warn?.textContent?.trim()).toBe('Cycles detected');
  });
});

describe('minimap visibility', () => {
  it('is 120×72', () => {
    expect([MINIMAP_WIDTH, MINIMAP_HEIGHT]).toEqual([120, 72]);
  });

  it('hides on a canvas narrower than 800 px, shows from 800 px up', () => {
    expect(MINIMAP_MIN_CANVAS_WIDTH).toBe(800);
    expect(shouldShowMinimap(true, 799)).toBe(false);
    expect(shouldShowMinimap(true, 800)).toBe(true);
    expect(shouldShowMinimap(true, 1400)).toBe(true);
  });

  it('respects the user setting on a wide canvas', () => {
    expect(shouldShowMinimap(false, 1400)).toBe(false);
    expect(shouldShowMinimap(false, undefined)).toBe(false);
  });

  it('falls back to the setting before the canvas is measured', () => {
    expect(shouldShowMinimap(true, undefined)).toBe(true);
  });
});
