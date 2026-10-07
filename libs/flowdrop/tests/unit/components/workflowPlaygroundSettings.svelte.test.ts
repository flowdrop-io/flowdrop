/**
 * The Playground settings panel (`WorkflowPlaygroundSettings.svelte`): a
 * workflow's chat binding. Mounted for real (client build, happy-dom); the
 * panel is stateless, so every edit is asserted on the `playground` value
 * it reports through `onChange`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import WorkflowPlaygroundSettings from '$lib/components/WorkflowPlaygroundSettings.svelte';
import type {
  NodePort,
  PlaygroundChatBinding,
  Workflow,
  WorkflowInterfaceEntry,
  WorkflowNode,
  WorkflowPlayground
} from '$lib/types/index.js';

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
});

const emptyChat = (): PlaygroundChatBinding => ({
  message: null,
  history: null,
  session_id: null,
  message_id: null,
  replies: [],
  sub_workflow_replies: false
});

function entry(id: string, extra: Partial<WorkflowInterfaceEntry> = {}): WorkflowInterfaceEntry {
  return { id, dataType: 'string', bindings: [], ...extra };
}

function outPort(id: string, name = id): NodePort {
  return { id, name, type: 'output', dataType: 'string' };
}

function node(id: string, label: string, outputs: NodePort[]): WorkflowNode {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label,
      config: {},
      metadata: {
        node_type_id: 'test',
        name: 'Test',
        description: '',
        category: 'processing',
        version: '1.0.0',
        type: 'default',
        inputs: [],
        outputs
      }
    }
  };
}

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'wf-1',
    name: 'Test Workflow',
    nodes: [node('n1', 'Writer', [outPort('text', 'Text'), outPort('summary', 'Summary')])],
    edges: [],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString()
    },
    interface: { inputs: [entry('msg'), entry('hist', { name: 'History' }), entry('sid')] },
    ...overrides
  };
}

function render(
  workflow: Workflow,
  withMoveTurns = true
): {
  target: HTMLElement;
  onChange: ReturnType<typeof vi.fn<(next: WorkflowPlayground) => void>>;
  onMoveTurns: ReturnType<typeof vi.fn<(chat: PlaygroundChatBinding) => void>>;
} {
  const onChange = vi.fn<(next: WorkflowPlayground) => void>();
  const onMoveTurns = vi.fn<(chat: PlaygroundChatBinding) => void>();
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(WorkflowPlaygroundSettings, {
    target,
    props: { workflow, onChange, ...(withMoveTurns && { onMoveTurns }) }
  });
  flushSync();
  return { target, onChange, onMoveTurns };
}

/** The select inside the label whose text starts with `text`. */
function selectFor(target: HTMLElement, text: string): HTMLSelectElement {
  const label = Array.from(target.querySelectorAll('label')).find((l) =>
    l.textContent?.trim().startsWith(text)
  );
  const select = label?.querySelector('select');
  if (!select) throw new Error(`no select labelled "${text}"`);
  return select;
}

function choose(select: HTMLSelectElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  flushSync();
}

function checkboxFor(target: HTMLElement, text: string): HTMLInputElement {
  const label = Array.from(target.querySelectorAll('label')).find((l) =>
    l.textContent?.includes(text)
  );
  const box = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!box) throw new Error(`no checkbox "${text}"`);
  return box;
}

function toggle(box: HTMLInputElement, checked: boolean): void {
  box.checked = checked;
  box.dispatchEvent(new Event('change', { bubbles: true }));
  flushSync();
}

function lastChat(onChange: { mock: { lastCall?: [WorkflowPlayground] } }) {
  const next = onChange.mock.lastCall?.[0];
  if (!next) throw new Error('onChange was not called');
  return next.chat;
}

describe('WorkflowPlaygroundSettings: not set up', () => {
  it('says so when chat is null and no entry carries a turn', () => {
    const { target } = render(makeWorkflow({ playground: { chat: null } }));
    const note = target.querySelector('[role="note"]');
    expect(note?.textContent).toContain('Not set up');
    expect(note?.textContent).toContain('No chat until someone sets it up');
    expect(Array.from(target.querySelectorAll('button'))).toHaveLength(0);
  });

  it('also says so for a workflow without a playground key', () => {
    const { target } = render(makeWorkflow());
    expect(target.querySelector('[role="note"]')?.textContent).toContain('Not set up');
  });

  it('shows the controls with nothing chosen', () => {
    const { target } = render(makeWorkflow({ playground: { chat: null } }));
    expect(selectFor(target, 'Message goes to').value).toBe('');
    expect(selectFor(target, 'History goes to').value).toBe('');
    expect(target.querySelector('input[type="number"]')).toBeNull();
  });

  it('hints that the interface has no inputs yet', () => {
    const { target } = render(makeWorkflow({ interface: {}, playground: { chat: null } }));
    expect(target.textContent).toContain('The workflow interface has no inputs yet');
  });

  it('shows no not-set-up note once a binding is stored', () => {
    const { target } = render(
      makeWorkflow({ playground: { chat: { ...emptyChat(), message: 'msg' } } })
    );
    expect(target.textContent).not.toContain('Not set up');
  });
});

describe('WorkflowPlaygroundSettings: deprecated interface turns', () => {
  const withTurns = () =>
    makeWorkflow({
      interface: {
        inputs: [
          entry('m', { turn: 'message' }),
          entry('h', { turn: 'history', meta: { limit: 4 } })
        ],
        outputs: [entry('r', { turn: 'reply', bindings: [{ nodeId: 'n1', portId: 'text' }] })]
      },
      playground: { chat: null }
    });

  it('shows the deprecated-turn note instead of the not-set-up note', () => {
    const { target } = render(withTurns());
    const note = target.querySelector('[role="note"]');
    expect(note?.textContent).toContain('"Chat turn" marks on its interface, which are deprecated');
    expect(target.textContent).not.toContain('Not set up');
  });

  it('"Move them here" calls onMoveTurns with the binding the turns declare', () => {
    const { target, onMoveTurns, onChange } = render(withTurns());
    const button = Array.from(target.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Move them here')
    );
    expect(button).toBeDefined();
    button?.click();
    flushSync();
    expect(onMoveTurns).toHaveBeenCalledTimes(1);
    expect(onMoveTurns).toHaveBeenCalledWith({
      message: 'm',
      history: { input: 'h', limit: 4 },
      session_id: null,
      message_id: null,
      replies: [{ node_id: 'n1', port: 'text' }],
      sub_workflow_replies: false
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hides the action when the caller passes no onMoveTurns', () => {
    const { target } = render(withTurns(), false);
    expect(target.querySelectorAll('button')).toHaveLength(0);
    expect(target.textContent).toContain('deprecated');
  });

  it('shows what the turns set up in the controls, not an empty binding', () => {
    const { target } = render(withTurns());
    expect(selectFor(target, 'Message goes to').value).toBe('m');
    expect(selectFor(target, 'History goes to').value).toBe('h');
    expect(target.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('4');
    expect(checkboxFor(target, 'Writer · Text').checked).toBe(true);
  });

  it('a first edit moves the turns with it, so the chat is not switched off', () => {
    const { target, onMoveTurns, onChange } = render(withTurns());
    toggle(checkboxFor(target, 'Writer · Summary'), true);
    expect(onChange).not.toHaveBeenCalled();
    expect(onMoveTurns).toHaveBeenCalledWith({
      message: 'm',
      history: { input: 'h', limit: 4 },
      session_id: null,
      message_id: null,
      replies: [
        { node_id: 'n1', port: 'text' },
        { node_id: 'n1', port: 'summary' }
      ],
      sub_workflow_replies: false
    });
  });

  it('clearing the last field moves the turns as an empty binding (no chat, no fallback)', () => {
    const wf = makeWorkflow({
      interface: { inputs: [entry('m', { turn: 'message' })] },
      playground: { chat: null }
    });
    const { target, onMoveTurns } = render(wf);
    choose(selectFor(target, 'Message goes to'), '');
    expect(onMoveTurns).toHaveBeenCalledWith(emptyChat());
  });

  it('without onMoveTurns, a first edit stores the full binding the turns declare', () => {
    const { target, onChange } = render(withTurns(), false);
    toggle(checkboxFor(target, 'sub-workflows'), true);
    expect(lastChat(onChange)).toEqual({
      message: 'm',
      history: { input: 'h', limit: 4 },
      session_id: null,
      message_id: null,
      replies: [{ node_id: 'n1', port: 'text' }],
      sub_workflow_replies: true
    });
  });

  it('offers no move for turn values this library does not know', () => {
    const wf = makeWorkflow({
      interface: { inputs: [entry('m', { turn: 'from_the_future' })] },
      playground: { chat: null }
    });
    const { target } = render(wf);
    expect(target.textContent).toContain('deprecated');
    expect(target.querySelectorAll('button')).toHaveLength(0);
  });

  it('does not show the note once settings are stored', () => {
    const wf = withTurns();
    wf.playground = { chat: { ...emptyChat(), message: 'm' } };
    const { target } = render(wf);
    expect(target.textContent).not.toContain('Move them here');
  });
});

describe('WorkflowPlaygroundSettings: editing', () => {
  it('choosing a message input reports the binding', () => {
    const { target, onChange } = render(makeWorkflow({ playground: { chat: null } }));
    choose(selectFor(target, 'Message goes to'), 'msg');
    expect(lastChat(onChange)).toEqual({ ...emptyChat(), message: 'msg' });
  });

  it('lists the interface inputs, with the name when it differs from the id', () => {
    const { target } = render(makeWorkflow({ playground: { chat: null } }));
    const options = Array.from(selectFor(target, 'History goes to').options).map((o) => [
      o.value,
      o.textContent?.trim()
    ]);
    expect(options).toContainEqual(['hist', 'History (hist)']);
    expect(options).toContainEqual(['msg', 'msg']);
  });

  it('keeps other parts of the binding and drops resolved and source on an edit', () => {
    const { target, onChange } = render(
      makeWorkflow({
        playground: {
          chat: { ...emptyChat(), message: 'msg', replies: [{ node_id: 'n1', port: 'text' }] },
          resolved: emptyChat(),
          source: 'settings'
        }
      })
    );
    choose(selectFor(target, 'History goes to'), 'hist');
    const next = onChange.mock.lastCall?.[0];
    expect(next).toEqual({
      chat: {
        ...emptyChat(),
        message: 'msg',
        history: { input: 'hist', limit: 10 },
        replies: [{ node_id: 'n1', port: 'text' }]
      }
    });
  });

  it('choosing "Nothing" for the only bound part clears the chat to null', () => {
    const { target, onChange } = render(
      makeWorkflow({ playground: { chat: { ...emptyChat(), message: 'msg' } } })
    );
    choose(selectFor(target, 'Message goes to'), '');
    expect(lastChat(onChange)).toBeNull();
  });

  it('toggling a reply on adds it', () => {
    const { target, onChange } = render(
      makeWorkflow({ playground: { chat: { ...emptyChat(), message: 'msg' } } })
    );
    toggle(checkboxFor(target, 'Writer · Text'), true);
    expect(lastChat(onChange)?.replies).toEqual([{ node_id: 'n1', port: 'text' }]);
  });

  it('toggling a second reply on appends it after the stored one', () => {
    const { target, onChange } = render(
      makeWorkflow({
        playground: {
          chat: { ...emptyChat(), message: 'msg', replies: [{ node_id: 'n1', port: 'text' }] }
        }
      })
    );
    toggle(checkboxFor(target, 'Writer · Summary'), true);
    expect(lastChat(onChange)?.replies).toEqual([
      { node_id: 'n1', port: 'text' },
      { node_id: 'n1', port: 'summary' }
    ]);
  });

  it('toggling a checked reply off removes only that reply', () => {
    const { target, onChange } = render(
      makeWorkflow({
        playground: {
          chat: {
            ...emptyChat(),
            message: 'msg',
            replies: [
              { node_id: 'n1', port: 'text' },
              { node_id: 'n1', port: 'summary' }
            ]
          }
        }
      })
    );
    expect(checkboxFor(target, 'Writer · Text').checked).toBe(true);
    toggle(checkboxFor(target, 'Writer · Text'), false);
    expect(lastChat(onChange)?.replies).toEqual([{ node_id: 'n1', port: 'summary' }]);
  });

  it('says so when no node exposes an output port', () => {
    const { target } = render(makeWorkflow({ nodes: [], playground: { chat: null } }));
    expect(target.textContent).toContain('No node has an exposed output port yet');
  });

  it('toggles sub-workflow replies', () => {
    const { target, onChange } = render(makeWorkflow({ playground: { chat: null } }));
    toggle(checkboxFor(target, 'sub-workflows'), true);
    expect(lastChat(onChange)).toEqual({ ...emptyChat(), sub_workflow_replies: true });
  });

  it('choosing a session id input reports it', () => {
    const { target, onChange } = render(makeWorkflow({ playground: { chat: null } }));
    choose(selectFor(target, 'Session ID goes to'), 'sid');
    expect(lastChat(onChange)?.session_id).toBe('sid');
  });
});

describe('WorkflowPlaygroundSettings: history limit', () => {
  const withHistory = (limit = 6) =>
    makeWorkflow({
      playground: {
        chat: {
          ...emptyChat(),
          message: 'msg',
          history: { input: 'hist', limit },
          replies: [{ node_id: 'n1', port: 'text' }]
        }
      }
    });

  function limitInput(target: HTMLElement): HTMLInputElement {
    const input = target.querySelector<HTMLInputElement>('input[type="number"]');
    if (!input) throw new Error('no limit input');
    return input;
  }

  function setLimit(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
  }

  it('shows the stored limit once a history input is chosen', () => {
    const { target } = render(withHistory(6));
    expect(limitInput(target).value).toBe('6');
  });

  it('writes a new limit', () => {
    const { target, onChange } = render(withHistory());
    setLimit(limitInput(target), '25');
    expect(lastChat(onChange)?.history).toEqual({ input: 'hist', limit: 25 });
  });

  it('refuses a blank, zero or fractional limit: says why, keeps the field and the stored limit', () => {
    const { target, onChange } = render(withHistory(6));
    for (const bad of ['', '0', '-3', '2.5', 'abc']) {
      setLimit(limitInput(target), bad);
      expect(onChange).not.toHaveBeenCalled();
      expect(limitInput(target).value).toBe(bad === 'abc' ? '' : bad);
      expect(limitInput(target).classList).toContain('flowdrop-input--invalid');
      expect(target.textContent).toContain('A whole number, 1 or more.');
    }
  });

  it('clears the refusal once a valid limit is written', () => {
    const { target, onChange } = render(withHistory(6));
    setLimit(limitInput(target), '0');
    setLimit(limitInput(target), '8');
    expect(lastChat(onChange)?.history).toEqual({ input: 'hist', limit: 8 });
    expect(limitInput(target).classList).not.toContain('flowdrop-input--invalid');
    expect(target.textContent).not.toContain('A whole number, 1 or more.');
  });

  it('takes the default limit when a history input is first chosen', () => {
    const { target, onChange } = render(
      makeWorkflow({ playground: { chat: { ...emptyChat(), message: 'msg' } } })
    );
    choose(selectFor(target, 'History goes to'), 'hist');
    expect(lastChat(onChange)?.history).toEqual({ input: 'hist', limit: 10 });
  });

  it('removes the history, and the limit field, when set back to Nothing', () => {
    const { target, onChange } = render(withHistory());
    choose(selectFor(target, 'History goes to'), '');
    expect(lastChat(onChange)?.history).toBeNull();
  });
});

describe('WorkflowPlaygroundSettings: problems', () => {
  it('warns when a message input is bound and no reply is', () => {
    const { target } = render(
      makeWorkflow({ playground: { chat: { ...emptyChat(), message: 'msg' } } })
    );
    const alert = target.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Nothing will print');
    expect(alert?.textContent).toContain('Pick at least one reply');
  });

  it('does not warn once a reply is chosen, or without a message', () => {
    const replied = render(
      makeWorkflow({
        playground: {
          chat: { ...emptyChat(), message: 'msg', replies: [{ node_id: 'n1', port: 'text' }] }
        }
      })
    );
    expect(replied.target.querySelector('[role="alert"]')).toBeNull();
    unmount(mounted!);
    mounted = null;
    document.body.innerHTML = '';
    const bare = render(makeWorkflow({ playground: { chat: null } }));
    expect(bare.target.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an error for an input name that is not on the interface, and keeps it selectable', () => {
    const { target } = render(
      makeWorkflow({
        playground: {
          chat: { ...emptyChat(), message: 'gone', replies: [{ node_id: 'n1', port: 'text' }] }
        }
      })
    );
    expect(target.textContent).toContain(
      'Message goes to: the input "gone" is not on the workflow interface.'
    );
    const select = selectFor(target, 'Message goes to');
    expect(select.value).toBe('gone');
    expect(
      Array.from(select.options)
        .find((o) => o.value === 'gone')
        ?.textContent?.trim()
    ).toBe('gone (not on the interface)');
  });

  it('shows an error for an input bound twice', () => {
    const { target } = render(
      makeWorkflow({
        playground: {
          chat: {
            ...emptyChat(),
            message: 'msg',
            session_id: 'msg',
            replies: [{ node_id: 'n1', port: 'text' }]
          }
        }
      })
    );
    expect(target.textContent).toContain(
      'Session ID goes to: the input "msg" is already picked under "Message goes to".'
    );
  });

  it('shows an error under a stored reply whose node is gone, and lists it', () => {
    const { target } = render(
      makeWorkflow({
        playground: { chat: { ...emptyChat(), replies: [{ node_id: 'ghost', port: 'text' }] } }
      })
    );
    expect(target.textContent).toContain('ghost · text');
    expect(target.textContent).toContain(
      'The reply "ghost · text" is on a node that is no longer in the workflow.'
    );
    expect(checkboxFor(target, 'ghost · text').checked).toBe(true);
  });

  it('shows an error under a stored reply whose port is gone', () => {
    const { target } = render(
      makeWorkflow({
        playground: { chat: { ...emptyChat(), replies: [{ node_id: 'n1', port: 'nope' }] } }
      })
    );
    expect(target.textContent).toContain(
      'The reply "n1 · nope" is on an output the node no longer has.'
    );
  });
});

describe('WorkflowPlaygroundSettings: session and message ids', () => {
  function details(target: HTMLElement): HTMLDetailsElement {
    const el = target.querySelector<HTMLDetailsElement>('details');
    if (!el) throw new Error('no ids disclosure');
    return el;
  }

  it('is closed when neither id is bound', () => {
    const { target } = render(makeWorkflow({ playground: { chat: null } }));
    expect(details(target).open).toBe(false);
  });

  it('opens when a new workflow value binds an id (undo, load, move)', () => {
    const props = $state({
      workflow: makeWorkflow({ playground: { chat: null } }),
      onChange: vi.fn()
    });
    const target = document.createElement('div');
    document.body.appendChild(target);
    mounted = mount(WorkflowPlaygroundSettings, { target, props });
    flushSync();
    expect(details(target).open).toBe(false);
    props.workflow = makeWorkflow({ playground: { chat: { ...emptyChat(), session_id: 'sid' } } });
    flushSync();
    expect(details(target).open).toBe(true);
  });
});

describe('WorkflowPlaygroundSettings: leftover turn marks', () => {
  const stored = (): PlaygroundChatBinding => ({
    ...emptyChat(),
    message: 'msg',
    replies: [{ node_id: 'n1', port: 'text' }]
  });
  const withLeftovers = () =>
    makeWorkflow({
      interface: {
        inputs: [entry('msg', { turn: 'message' }), entry('hist')],
        outputs: [entry('r', { turn: 'reply', bindings: [{ nodeId: 'n1', portId: 'text' }] })]
      },
      playground: { chat: stored() }
    });

  it('says they are ignored, and "Remove them" hands the stored binding to onMoveTurns', () => {
    const { target, onMoveTurns, onChange } = render(withLeftovers());
    expect(target.textContent).toContain('They are ignored while these settings are set.');
    const button = Array.from(target.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Remove them')
    );
    button?.click();
    flushSync();
    expect(onMoveTurns).toHaveBeenCalledWith(stored());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is not shown without marks, or for marks this library does not know', () => {
    const { target } = render(makeWorkflow({ playground: { chat: stored() } }));
    expect(target.textContent).not.toContain('Remove them');
    unmount(mounted!);
    mounted = null;
    document.body.innerHTML = '';
    const unknown = render(
      makeWorkflow({
        interface: { inputs: [entry('msg', { turn: 'from_the_future' })] },
        playground: { chat: stored() }
      })
    );
    expect(unknown.target.textContent).not.toContain('Remove them');
  });
});

describe('WorkflowPlaygroundSettings: a reply on an output not exposed on the canvas', () => {
  it('reads like any other reply, with its node label and port name, not as missing', () => {
    const writer = node('n1', 'Writer', [outPort('text', 'Text'), outPort('secret', 'Secret')]);
    writer.data.config = { ports: { outputs: [{ id: 'secret', exposed: false }] } };
    const { target } = render(
      makeWorkflow({
        nodes: [writer],
        playground: { chat: { ...emptyChat(), replies: [{ node_id: 'n1', port: 'secret' }] } }
      })
    );
    const label = Array.from(target.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Writer · Secret')
    );
    expect(label).toBeDefined();
    expect(label?.classList).not.toContain('wf-playground__check--missing');
    expect(checkboxFor(target, 'Writer · Secret').checked).toBe(true);
  });
});
