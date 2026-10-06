/**
 * The interface editor's Chat turn selector (`WorkflowInterfaceEntry.turn`).
 * Mounted for real (client build, happy-dom) so the select's change reaches
 * `onChange` through the editor's patch path, which is where the round-trip
 * rules live:
 *   - the selector offers only the values valid for the entry's direction,
 *     plus "None"
 *   - choosing "None" removes the `turn` key, it never writes an empty one
 *   - `history` adds a limit field that writes `meta.limit`
 *   - a second input with the same turn gets an inline warning
 *   - an unknown stored turn is listed, and survives an edit to another field
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

function render(workflowInterface: WorkflowInterface) {
  const onChange = vi.fn<(next: WorkflowInterface | undefined) => void>();
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(WorkflowInterfaceEditor, {
    target,
    props: { workflow: makeWorkflow(workflowInterface), onChange }
  });
  flushSync();
  return { target, onChange };
}

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

describe('Chat turn selector', () => {
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
    const unknown = 'entity_context' as WorkflowInterfaceEntry['turn'];
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
