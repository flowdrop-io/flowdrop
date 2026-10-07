/**
 * LogsSidebar locks the body's scroll while open; closing or unmounting it
 * must give the host page its scroll back.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import LogsSidebar from '$lib/components/LogsSidebar.svelte';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

let mounted: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

function render(isOpen: boolean): { props: { isOpen: boolean; logs: [] } } {
  const props = $state({ isOpen, logs: [] as [] });
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(LogsSidebar, { target, props });
  flushSync();
  return { props };
}

describe('LogsSidebar body scroll', () => {
  it('locks the body while open and restores it on close', () => {
    document.body.style.overflow = 'auto';
    const { props } = render(true);
    expect(document.body.style.overflow).toBe('hidden');
    props.isOpen = false;
    flushSync();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restores the body when unmounted while open', () => {
    render(true);
    expect(document.body.style.overflow).toBe('hidden');
    unmount(mounted!);
    mounted = null;
    expect(document.body.style.overflow).toBe('');
  });

  it('leaves the body alone while closed', () => {
    document.body.style.overflow = 'scroll';
    render(false);
    expect(document.body.style.overflow).toBe('scroll');
  });
});
