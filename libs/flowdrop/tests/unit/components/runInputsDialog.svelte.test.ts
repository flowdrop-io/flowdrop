/**
 * RunInputsDialog: one field per input, Run reports, an error stays visible, Cancel closes.
 */

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import RunInputsDialog from '$lib/components/RunInputsDialog.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { WorkflowInterfaceEntry } from '$lib/types/index.js';

let app: ReturnType<typeof mount> | null = null;

// jsdom has no modal dialogs: stand in for the two methods the component calls.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

const entries: WorkflowInterfaceEntry[] = [
  { id: 'topic', dataType: 'string', required: true, bindings: [] },
  { id: 'tone', dataType: 'string', bindings: [] }
];

function render(props: Record<string, unknown> = {}) {
  const fd = createFlowDropInstance({ id: 'run-inputs' });
  const target = document.createElement('div');
  document.body.appendChild(target);
  const callbacks = { onChange: vi.fn(), onRun: vi.fn(), onClose: vi.fn() };
  app = mount(RunInputsDialog, {
    target,
    props: {
      open: true,
      workflowName: 'Greeter',
      entries,
      values: {},
      ...callbacks,
      ...props
    },
    context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  flushSync();
  return { target, ...callbacks };
}

describe('RunInputsDialog', () => {
  it('is titled with the workflow name and draws one field per entry', () => {
    const { target } = render();
    expect(target.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    expect(target.textContent).toContain('Run Greeter');
    expect(target.querySelectorAll('input, textarea, select')).toHaveLength(entries.length);
  });

  it('shows the given values in the fields', () => {
    const { target } = render({ values: { topic: 'Ada' } });
    const fields = [...target.querySelectorAll<HTMLInputElement>('input, textarea')];
    expect(fields.some((field) => field.value === 'Ada')).toBe(true);
  });

  it('calls onRun from the Run button', () => {
    const { target, onRun } = render();
    const run = [...target.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.trim().startsWith('Run')
    );
    run!.click();
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('keeps the error visible under the button', () => {
    const { target } = render({ error: 'The workflow is turned off.' });
    expect(target.querySelector('[role="alert"]')?.textContent).toContain(
      'The workflow is turned off.'
    );
  });

  it('closes from Cancel', () => {
    const { target, onClose } = render();
    target.querySelector<HTMLButtonElement>('[data-testid="run-inputs-cancel"]')!.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a backdrop click that also began on the backdrop', () => {
    const { target, onClose } = render();
    const dialog = target.querySelector('dialog')!;
    dialog.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    dialog.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when a selection began in a field and ended over the backdrop', () => {
    const { target, onClose } = render();
    const dialog = target.querySelector('dialog')!;
    target
      .querySelector('input, textarea')!
      .dispatchEvent(new Event('pointerdown', { bubbles: true }));
    dialog.click();
    expect(onClose).not.toHaveBeenCalled();
  });
});
