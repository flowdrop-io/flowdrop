/**
 * The interface editor's deprecated `turn` marks (`WorkflowInterfaceEntry.turn`).
 * With Playground settings (a workflow carrying `playground`, FlowDrop 2.7.0
 * on) the Chat turn selector is gone: the chat is set up in the Playground
 * settings, and an entry that still carries a `turn` shows it read-only.
 * Without them (an older server) the selector is still offered, since `turn`
 * is the only way to set the chat up there.
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
import type {
  Workflow,
  WorkflowInterface,
  WorkflowInterfaceEntry,
  WorkflowPlayground
} from '$lib/types/index.js';
import type { InterfaceInputEdit } from '$lib/utils/playgroundChat.js';

let mounted: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

function makeWorkflow(
  workflowInterface: WorkflowInterface,
  /** `null` = no `playground` key (a server before FlowDrop 2.7.0). */
  playground: WorkflowPlayground | null = { chat: null }
): Workflow {
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
    interface: workflowInterface,
    ...(playground !== null && { playground })
  };
}

function entry(overrides: Partial<WorkflowInterfaceEntry>): WorkflowInterfaceEntry {
  return { id: 'e', dataType: 'string', bindings: [], ...overrides };
}

function render(
  workflowInterface: WorkflowInterface,
  onOpenPlaygroundSettings?: () => void,
  playground: WorkflowPlayground | null = { chat: null }
) {
  const onChange =
    vi.fn<(next: WorkflowInterface | undefined, edit?: InterfaceInputEdit) => void>();
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(WorkflowInterfaceEditor, {
    target,
    props: {
      workflow: makeWorkflow(workflowInterface, playground),
      onChange,
      onOpenPlaygroundSettings
    }
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

/** The Chat turn select of the n-th card in the document. */
function turnSelect(target: HTMLElement, card = 0): HTMLSelectElement {
  const cards = target.querySelectorAll('.wf-interface__entry');
  const label = Array.from(cards[card].querySelectorAll('label')).find((l) =>
    l.textContent?.includes('Chat turn')
  );
  const select = label?.querySelector('select');
  if (!select) throw new Error('no Chat turn select');
  return select;
}

function choose(select: HTMLSelectElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  flushSync();
}

function optionValues(select: HTMLSelectElement): string[] {
  return Array.from(select.options).map((option) => option.value);
}

function renderWithout(workflowInterface: WorkflowInterface) {
  return render(workflowInterface, undefined, null);
}

describe('Chat turn selector, for a workflow without Playground settings', () => {
  // A server before FlowDrop 2.7.0: no `playground` key on the workflow.
  const render = (workflowInterface: WorkflowInterface) => renderWithout(workflowInterface);

  it('offers the input vocabulary on inputs and reply on outputs', () => {
    const { target } = render({
      inputs: [entry({ id: 'in' })],
      outputs: [entry({ id: 'out' })]
    });
    expect(optionValues(turnSelect(target, 0))).toEqual([
      '',
      'message',
      'history',
      'session_id',
      'message_id'
    ]);
    expect(optionValues(turnSelect(target, 1))).toEqual(['', 'reply']);
  });

  it('writes the chosen turn', () => {
    const { target, onChange } = render({ inputs: [entry({ id: 'in' })] });
    choose(turnSelect(target), 'message');
    expect(onChange).toHaveBeenLastCalledWith({
      inputs: [{ id: 'in', dataType: 'string', bindings: [], turn: 'message' }],
      outputs: undefined
    });
  });

  it('removes the turn key when set back to None', () => {
    const { target, onChange } = render({ outputs: [entry({ id: 'out', turn: 'reply' })] });
    choose(turnSelect(target), '');
    const next = onChange.mock.lastCall?.[0];
    expect(next?.outputs?.[0]).toEqual({ id: 'out', dataType: 'string', bindings: [] });
    expect(next?.outputs?.[0] && 'turn' in next.outputs[0]).toBe(false);
  });

  it('shows a limit field for history that writes meta.limit', () => {
    const { target, onChange } = render({ inputs: [entry({ id: 'h', turn: 'history' })] });
    const input = target.querySelector<HTMLInputElement>('input[type="number"]');
    expect(input).not.toBeNull();
    expect(input?.placeholder).toContain('10');
    if (!input) return;
    input.value = '25';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
    expect(onChange.mock.lastCall?.[0]?.inputs?.[0]).toEqual({
      id: 'h',
      dataType: 'string',
      bindings: [],
      turn: 'history',
      meta: { limit: 25 }
    });
  });

  it('has no limit field for other turns', () => {
    const { target } = render({ inputs: [entry({ id: 'm', turn: 'message' })] });
    expect(target.querySelector('input[type="number"]')).toBeNull();
  });

  it('warns inline on the second input with the same turn', () => {
    const { target } = render({
      inputs: [entry({ id: 'first', turn: 'message' }), entry({ id: 'second', turn: 'message' })]
    });
    const cards = target.querySelectorAll('.wf-interface__entry');
    expect(cards[0].textContent).not.toContain('already has this chat turn');
    expect(cards[1].textContent).toContain('Input "first" already has this chat turn');
  });

  it('lists an unknown stored turn and keeps it through an edit to another field', () => {
    const unknown = 'entity_context';
    const { target, onChange } = render({
      inputs: [entry({ id: 'ctx', turn: unknown, meta: { limit: 3 } })]
    });
    const select = turnSelect(target);
    expect(optionValues(select)).toContain('entity_context');
    expect(select.value).toBe('entity_context');

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
});

describe('deprecated chat turn, once Playground settings are stored', () => {
  it('does not warn about two inputs with the same turn (the server ignores turn then)', () => {
    const { target } = render(
      {
        inputs: [entry({ id: 'first', turn: 'message' }), entry({ id: 'second', turn: 'message' })]
      },
      undefined,
      {
        chat: {
          message: 'first',
          history: null,
          session_id: null,
          message_id: null,
          replies: [],
          sub_workflow_replies: false
        }
      }
    );
    expect(target.textContent).not.toContain('already has this chat turn');
  });
});

describe('input id edits reported for the chat binding', () => {
  function idField(target: HTMLElement, card = 0): HTMLInputElement {
    const cards = target.querySelectorAll('.wf-interface__entry');
    const label = Array.from(cards[card].querySelectorAll('label')).find((l) =>
      l.textContent?.trim().startsWith('ID')
    );
    const input = label?.querySelector('input');
    if (!input) throw new Error('no ID field');
    return input;
  }

  function removeButton(target: HTMLElement, card = 0): HTMLButtonElement {
    const cards = target.querySelectorAll('.wf-interface__entry');
    const button = cards[card].querySelector<HTMLButtonElement>('button[aria-label^="Remove"]');
    if (!button) throw new Error('no Remove button');
    return button;
  }

  function rename(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
  }

  it('reports a renamed input', () => {
    const { target, onChange } = render({ inputs: [entry({ id: 'q' })] });
    rename(idField(target), 'prompt');
    expect(onChange.mock.lastCall?.[1]).toEqual({ kind: 'rename', id: 'q', to: 'prompt' });
  });

  it('reports a removed input', () => {
    const { target, onChange } = render({ inputs: [entry({ id: 'q' }), entry({ id: 'topic' })] });
    removeButton(target, 0).click();
    flushSync();
    expect(onChange.mock.lastCall?.[1]).toEqual({ kind: 'remove', id: 'q' });
  });

  it('reports nothing when another input still has the old id', () => {
    const { target, onChange } = render({ inputs: [entry({ id: 'q' }), entry({ id: 'q' })] });
    rename(idField(target, 0), 'prompt');
    expect(onChange.mock.lastCall).toHaveLength(1);
  });

  it('reports nothing for outputs', () => {
    const { target, onChange } = render({ outputs: [entry({ id: 'out' })] });
    rename(idField(target), 'answer');
    expect(onChange.mock.lastCall).toHaveLength(1);
  });
});
