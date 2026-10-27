import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import WorkflowCompareDialog from '$lib/components/WorkflowCompareDialog.svelte';
import type { WorkflowComparison } from '$lib/utils/workflowCompare.js';

const base: WorkflowComparison = {
  nodesOnlyMine: [{ id: 'a', label: 'Mine only' }],
  nodesOnlyTheirs: [{ id: 'b', label: 'Theirs only' }],
  nodesChanged: [{ id: 'c', label: 'Summarise', what: ['settings'] }],
  edgesOnlyMine: 0,
  edgesOnlyTheirs: 2,
  interfaceChanged: false,
  chatChanged: false,
  same: false
};

let target: HTMLElement;
let instance: ReturnType<typeof mount> | null = null;

function render(comparison: WorkflowComparison) {
  const cb = { onKeepMine: vi.fn(), onLoadTheirs: vi.fn(), onClose: vi.fn() };
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(WorkflowCompareDialog, { target, props: { comparison, ...cb } });
  flushSync();
  return cb;
}

afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('WorkflowCompareDialog', () => {
  it('lists the differences in words', () => {
    render(base);
    const text = target.textContent ?? '';
    expect(text).toContain('Your version and the saved version');
    expect(text).toContain('Only in yours');
    expect(text).toContain('Step "Mine only"');
    expect(text).toContain('Only in the saved version');
    expect(text).toContain('2 wires');
    expect(text).toContain('Step "Summarise": settings changed');
  });

  it('says so when nothing differs', () => {
    render({
      ...base,
      nodesOnlyMine: [],
      nodesOnlyTheirs: [],
      nodesChanged: [],
      edgesOnlyTheirs: 0,
      same: true
    });
    expect(target.textContent).toContain('No differences in the workflow itself');
  });

  it('calls the callbacks from the buttons', () => {
    const cb = render(base);
    const buttons = [...target.querySelectorAll('button')];
    buttons.find((b) => b.textContent?.includes('Keep mine'))!.click();
    buttons.find((b) => b.textContent?.includes('Load the saved version'))!.click();
    buttons.find((b) => b.textContent?.includes('Cancel'))!.click();
    expect(cb.onKeepMine).toHaveBeenCalledOnce();
    expect(cb.onLoadTheirs).toHaveBeenCalledOnce();
    expect(cb.onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape', () => {
    const cb = render(base);
    target
      .querySelector('dialog')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cb.onClose).toHaveBeenCalledOnce();
  });
});
