/**
 * The interface editor's deprecated `turn` marks (`WorkflowInterfaceEntry.turn`).
 * The Chat turn selector is gone: the chat is set up in the Playground
 * settings, and an entry that still carries a `turn` shows it read-only.
 * Mounted for real (client build, happy-dom), so the editor's patch path is
 * what the round-trip assertions go through:
 *   - an entry with a turn shows a deprecated chip and a note naming it
 *   - a history entry's limit is shown in the note
 *   - "Open Playground settings" appears only when the host passes the
 *     callback, and calls it
 *   - an unknown stored turn survives an edit to another field
 *   - there is no turn select any more
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import WorkflowInterfaceEditor from '$lib/components/WorkflowInterfaceEditor.svelte';
import type { Workflow, WorkflowInterface, WorkflowInterfaceEntry } from '$lib/types/index.js';

let mounted: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

function makeWorkflow(workflowInterface: WorkflowInterface): Workflow {
  return {
    id: 'wf-1',
    name: 'Test Workflow',
    nodes: [],
    edges: [],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString()
    },
    interface: workflowInterface
  };
}

function entry(overrides: Partial<WorkflowInterfaceEntry>): WorkflowInterfaceEntry {
  return { id: 'e', dataType: 'string', bindings: [], ...overrides };
}

function render(workflowInterface: WorkflowInterface, onOpenPlaygroundSettings?: () => void) {
  const onChange = vi.fn<(next: WorkflowInterface | undefined) => void>();
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(WorkflowInterfaceEditor, {
    target,
    props: { workflow: makeWorkflow(workflowInterface), onChange, onOpenPlaygroundSettings }
  });
  flushSync();
  return { target, onChange };
}

function notes(target: HTMLElement): HTMLElement[] {
  return Array.from(target.querySelectorAll<HTMLElement>('.wf-interface__turn-deprecated'));
}

function openButton(target: HTMLElement): HTMLButtonElement | undefined {
  return Array.from(target.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes('Open Playground settings')
  );
}

describe('deprecated chat turn', () => {
  it('has no Chat turn select any more', () => {
    const { target } = render({
      inputs: [entry({ id: 'in', turn: 'message' })],
      outputs: [entry({ id: 'out', turn: 'reply' })]
    });
    // Other selects remain (the data type); none offers the turn vocabulary.
    const values = Array.from(target.querySelectorAll('select option')).map(
      (option) => (option as HTMLOptionElement).value
    );
    for (const turn of ['message', 'history', 'session_id', 'message_id', 'reply']) {
      expect(values).not.toContain(turn);
    }
    const labels = Array.from(target.querySelectorAll('label')).map((l) => l.textContent ?? '');
    expect(labels.some((text) => text.includes('Chat turn'))).toBe(false);
  });

  it('shows a deprecated chip and a note for an entry with a turn', () => {
    const { target } = render({ inputs: [entry({ id: 'in', turn: 'message' })] });
    const chip = target.querySelector('.wf-interface__turn-chip--deprecated');
    expect(chip).not.toBeNull();
    expect(chip?.textContent?.trim()).toBe('User message');
    const [note] = notes(target);
    expect(note.getAttribute('role')).toBe('note');
    expect(note.textContent).toContain('Chat turn "User message"');
    expect(note.textContent).toContain('deprecated');
    expect(note.textContent).toContain('Playground settings');
  });

  it('shows the raw value for a turn the library does not know', () => {
    const { target } = render({ inputs: [entry({ id: 'ctx', turn: 'entity_context' })] });
    expect(target.querySelector('.wf-interface__turn-chip--deprecated')?.textContent?.trim()).toBe(
      'entity_context'
    );
    expect(notes(target)[0].textContent).toContain('"entity_context"');
  });

  it('shows no chip and no note for an entry without a turn', () => {
    const { target } = render({ inputs: [entry({ id: 'in' })] });
    expect(target.querySelector('.wf-interface__turn-chip--deprecated')).toBeNull();
    expect(notes(target)).toHaveLength(0);
  });

  it("shows a history entry's limit in the note, and only for history", () => {
    const { target } = render({
      inputs: [
        entry({ id: 'h', turn: 'history', meta: { limit: 25 } }),
        entry({ id: 'm', turn: 'message', meta: { limit: 99 } })
      ]
    });
    const [history, message] = notes(target);
    expect(history.textContent).toContain('(25 messages)');
    expect(message.textContent).not.toContain('messages)');
    expect(message.textContent).not.toContain('99');
  });

  it('has no number field for the limit any more', () => {
    const { target } = render({ inputs: [entry({ id: 'h', turn: 'history' })] });
    expect(target.querySelector('input[type="number"]')).toBeNull();
  });

  it('offers "Open Playground settings" only when the host passes the callback', () => {
    const without = render({ inputs: [entry({ id: 'in', turn: 'message' })] });
    expect(openButton(without.target)).toBeUndefined();
  });

  it('calls the callback from "Open Playground settings"', () => {
    const onOpen = vi.fn();
    const { target, onChange } = render({ inputs: [entry({ id: 'in', turn: 'message' })] }, onOpen);
    const button = openButton(target);
    expect(button).toBeDefined();
    button?.click();
    flushSync();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows no button on an entry without a turn, even with the callback', () => {
    const { target } = render({ inputs: [entry({ id: 'in' })] }, vi.fn());
    expect(openButton(target)).toBeUndefined();
  });

  it('warns on the second input with the same turn, inside the note', () => {
    const { target } = render({
      inputs: [entry({ id: 'first', turn: 'message' }), entry({ id: 'second', turn: 'message' })]
    });
    const [first, second] = notes(target);
    expect(first.textContent).not.toContain('already has this chat turn');
    expect(second.textContent).toContain('Input "first" already has this chat turn');
  });

  it('keeps an unknown stored turn and its meta through an edit to another field', () => {
    const { target, onChange } = render({
      inputs: [entry({ id: 'ctx', turn: 'entity_context', meta: { limit: 3 } })]
    });
    const required = target.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!required) throw new Error('no Required checkbox');
    required.checked = true;
    required.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
    expect(onChange.mock.lastCall?.[0]?.inputs?.[0]).toEqual({
      id: 'ctx',
      dataType: 'string',
      bindings: [],
      turn: 'entity_context',
      meta: { limit: 3 },
      required: true
    });
  });

  it('keeps a known turn through an edit to another field too', () => {
    const { target, onChange } = render({
      inputs: [entry({ id: 'in', turn: 'message' })]
    });
    const required = target.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!required) throw new Error('no checkbox');
    required.checked = true;
    required.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
    expect(onChange.mock.lastCall?.[0]?.inputs?.[0]).toMatchObject({ id: 'in', turn: 'message' });
  });
});
