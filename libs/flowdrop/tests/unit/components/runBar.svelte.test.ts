/**
 * The Edit-mode run bar: absent at rest, tracks `fd.runs.activeRun`, Stop and
 * Open are buttons, and it fades (taking the node badges with it) after the
 * run ends.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import RunBar from '$lib/components/RunBar.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { HostHooks } from '$lib/webmcp/types.js';

let app: ReturnType<typeof mount> | null = null;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function render(
  fd: ReturnType<typeof createFlowDropInstance>,
  props: Record<string, unknown> = {}
) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(RunBar, {
    target,
    props,
    context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  flushSync();
  return target;
}

/** An instance with a host run in the given status, ready to be shown. */
async function withHostRun(id: string, status: string) {
  const fd = createFlowDropInstance({ id });
  // Node status loads need a backend; this suite has none.
  vi.spyOn(fd.runs, 'loadNodeStatuses').mockResolvedValue();
  let current = status;
  const hooks = fd.runs.wrapHostHooks({
    onRun: async () => ({ ok: true, data: { runId: 'r1', status: current } }),
    onRunStatus: async (runId) => ({ ok: true, data: { runId, status: current } })
  } as HostHooks);
  await hooks.onRun!({});
  return {
    fd,
    set: async (next: string) => {
      current = next;
      await hooks.onRunStatus!('r1');
      flushSync();
    }
  };
}

const bar = (t: HTMLElement) => t.querySelector('.flowdrop-run-bar');

describe('RunBar', () => {
  it('shows nothing at rest, and keeps a polite live region ready', () => {
    const fd = createFlowDropInstance({ id: 'bar-rest' });
    const target = render(fd);
    expect(bar(target)).toBeNull();
    const live = target.querySelector('[role="status"]');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    fd.destroy();
  });

  it('appears with a run, offering Stop while it runs and no Open', async () => {
    const { fd } = await withHostRun('bar-running', 'running');
    const target = render(fd, { onOpen: () => {} });
    expect(bar(target)?.textContent).toContain('Running');
    const buttons = [...target.querySelectorAll('button')];
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Stop the run']);
    fd.destroy();
  });

  it('announces a change of status in the live region', async () => {
    const { fd, set } = await withHostRun('bar-announce', 'running');
    const target = render(fd);
    const live = target.querySelector('[role="status"]')!;
    expect(live.textContent?.trim()).toBe('Run started.');
    await set('failed');
    expect(live.textContent?.trim()).toBe('Run failed.');
    fd.destroy();
  });

  it('offers Open when the run waits, and calls onOpen', async () => {
    const { fd } = await withHostRun('bar-waiting', 'paused');
    const onOpen = vi.fn();
    const target = render(fd, { onOpen });
    expect(bar(target)?.textContent).toContain('Waiting');
    target.querySelector<HTMLButtonElement>('button[aria-label^="Open"]')!.click();
    expect(onOpen).toHaveBeenCalledTimes(1);
    fd.destroy();
  });

  it('leaves Open out when there is nowhere to open', async () => {
    const { fd } = await withHostRun('bar-no-open', 'paused');
    const target = render(fd);
    expect(target.querySelector('button[aria-label^="Open"]')).toBeNull();
    fd.destroy();
  });

  it('Stop stops the run', async () => {
    const { fd } = await withHostRun('bar-stop', 'running');
    const stop = vi.spyOn(fd.runs, 'stopRun').mockResolvedValue();
    const target = render(fd);
    target.querySelector<HTMLButtonElement>('button[aria-label="Stop the run"]')!.click();
    expect(stop).toHaveBeenCalledTimes(1);
    fd.destroy();
  });

  it('fades after the run ends and drops the node statuses with it', async () => {
    const { fd, set } = await withHostRun('bar-fade', 'running');
    fd.playground.setNodeStatuses({}, { workflowId: 'w', pipelineId: 'r1' });
    const clear = vi.spyOn(fd.runs, 'clearNodeStatuses');
    const target = render(fd, { fadeMs: 1000 });
    await set('completed');
    expect(bar(target)?.textContent).toContain('Done');
    expect(target.querySelector('button')).toBeNull();

    await vi.advanceTimersByTimeAsync(800);
    flushSync();
    expect(bar(target)?.classList.contains('flowdrop-run-bar--fading')).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    flushSync();
    expect(bar(target)).toBeNull();
    expect(fd.runs.activeRun).toBeNull();
    expect(clear).toHaveBeenCalled();
    fd.destroy();
  });

  it('does not fade while it is hovered', async () => {
    const { fd } = await withHostRun('bar-hold', 'completed');
    const target = render(fd, { fadeMs: 1000 });
    bar(target)!.dispatchEvent(new MouseEvent('mouseenter'));
    flushSync();
    await vi.advanceTimersByTimeAsync(5000);
    flushSync();
    expect(bar(target)).not.toBeNull();

    bar(target)!.dispatchEvent(new MouseEvent('mouseleave'));
    flushSync();
    await vi.advanceTimersByTimeAsync(1100);
    flushSync();
    expect(bar(target)).toBeNull();
    fd.destroy();
  });

  it('leaves loading node statuses to App: the bar never asks for them', async () => {
    const { fd, set } = await withHostRun('bar-refresh', 'running');
    const load = fd.runs.loadNodeStatuses as ReturnType<typeof vi.fn>;
    const request = vi.spyOn(fd.runs, 'requestNodeStatuses');
    render(fd);
    load.mockClear();
    await vi.advanceTimersByTimeAsync(3000);
    await set('completed');
    expect(load).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    fd.destroy();
  });
});

describe('RunBar: Ask the Assistant', () => {
  it('offers it on a failed run with a known pipeline, and hands over the run id', async () => {
    const { fd } = await withHostRun('ask-failed', 'failed');
    const onAsk = vi.fn();
    const t = render(fd, { onAskAssistant: onAsk });
    const button = t.querySelector<HTMLButtonElement>('[data-testid="run-bar-ask-assistant"]');
    expect(button).not.toBeNull();
    button!.click();
    expect(onAsk).toHaveBeenCalledWith('r1');
  });

  it('is absent on a run that did not fail, and without a handler', async () => {
    const running = await withHostRun('ask-running', 'running');
    const t = render(running.fd, { onAskAssistant: vi.fn() });
    expect(t.querySelector('[data-testid="run-bar-ask-assistant"]')).toBeNull();
    if (app) unmount(app);
    app = null;
    document.body.innerHTML = '';

    const failed = await withHostRun('ask-nohandler', 'failed');
    const t2 = render(failed.fd);
    expect(t2.querySelector('[data-testid="run-bar-ask-assistant"]')).toBeNull();
  });
});
