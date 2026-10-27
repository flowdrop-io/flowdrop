/**
 * The Run button in the canvas toolbar: Edit mode only, needs `onRun`, hides
 * while a run is live, and clicking it calls `onRun`. Plus the pure gate
 * `canOfferRun`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import CanvasToolbar from '$lib/components/CanvasToolbar.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import { canOfferRun } from '$lib/utils/runOffer.js';
import type { HostHooks } from '$lib/webmcp/types.js';

let app: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function render(
  fd: ReturnType<typeof createFlowDropInstance>,
  props: Record<string, unknown> = {}
) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(CanvasToolbar, {
    target,
    props,
    context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  flushSync();
  return target;
}

const runButton = (t: HTMLElement) =>
  t.querySelector<HTMLButtonElement>('[data-testid="canvas-run"]');

describe('CanvasToolbar Run button', () => {
  it('is drawn in edit mode with onRun, even without the mode switch', () => {
    const fd = createFlowDropInstance({ id: 'run-1' });
    const t = render(fd, { editorMode: 'edit', onRun: () => {} });
    expect(runButton(t)).not.toBeNull();
    expect(runButton(t)?.textContent).toContain('Run');
  });

  it('is not drawn in test mode', () => {
    const fd = createFlowDropInstance({ id: 'run-2' });
    const t = render(fd, { editorMode: 'test', onEditorModeChange: () => {}, onRun: () => {} });
    expect(runButton(t)).toBeNull();
  });

  it('is not drawn without onRun', () => {
    const fd = createFlowDropInstance({ id: 'run-3' });
    const t = render(fd, { editorMode: 'edit', onEditorModeChange: () => {} });
    expect(runButton(t)).toBeNull();
  });

  it('is hidden while a run is live', async () => {
    const fd = createFlowDropInstance({ id: 'run-4' });
    vi.spyOn(fd.runs, 'loadNodeStatuses').mockResolvedValue();
    const t = render(fd, { editorMode: 'edit', onRun: () => {} });
    expect(runButton(t)).not.toBeNull();
    const hooks = fd.runs.wrapHostHooks({
      onRun: async () => ({ ok: true, data: { runId: 'r1', status: 'running' } }),
      onRunStatus: async (runId: string) => ({ ok: true, data: { runId, status: 'running' } })
    } as HostHooks);
    await hooks.onRun!({});
    flushSync();
    expect(runButton(t)).toBeNull();
  });

  it('calls onRun on click and blocks while busy', () => {
    const fd = createFlowDropInstance({ id: 'run-5' });
    const onRun = vi.fn();
    const t = render(fd, { editorMode: 'edit', onRun });
    runButton(t)!.click();
    expect(onRun).toHaveBeenCalledTimes(1);
    unmount(app!);
    app = null;
    document.body.innerHTML = '';
    const busy = render(fd, { editorMode: 'edit', onRun, runBusy: true });
    runButton(busy)!.click();
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(runButton(busy)?.getAttribute('aria-busy')).toBe('true');
  });
});

describe('canOfferRun', () => {
  const base = {
    runButton: undefined,
    canvasEditable: true,
    pipelineId: undefined,
    workflowId: 'wf',
    hostCanRun: false,
    backendCanRun: true
  };

  it('offers the run for a saved, editable workflow with a backend', () => {
    expect(canOfferRun(base)).toBe(true);
    expect(canOfferRun({ ...base, backendCanRun: false, hostCanRun: true })).toBe(true);
  });

  it('refuses when switched off, read-only, a pipeline view, unsaved, or nothing can run', () => {
    expect(canOfferRun({ ...base, runButton: false })).toBe(false);
    expect(canOfferRun({ ...base, canvasEditable: false })).toBe(false);
    expect(canOfferRun({ ...base, pipelineId: 'p1' })).toBe(false);
    expect(canOfferRun({ ...base, workflowId: undefined })).toBe(false);
    expect(canOfferRun({ ...base, backendCanRun: false })).toBe(false);
  });
});
