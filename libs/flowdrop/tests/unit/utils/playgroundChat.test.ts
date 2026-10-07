/**
 * Unit Tests - Playground chat binding
 *
 * The pure functions behind a workflow's Playground settings: how a stored
 * binding is normalised, which binding is in effect (stored settings, the
 * deprecated interface `turn`, or none), and how the binding is edited,
 * saved and moved off the interface.
 */

import { describe, it, expect } from 'vitest';
import {
  emptyPlaygroundChat,
  normalizePlaygroundChat,
  interfaceTurnChat,
  resolvePlaygroundChat,
  playgroundBoundInputs,
  isPlaygroundChatSet,
  isPlaygroundChatHalfSet,
  withPlaygroundChat,
  playgroundForSave,
  withoutInterfaceTurns
} from '$lib/utils/playgroundChat.js';
import {
  DEFAULT_HISTORY_TURN_LIMIT,
  type PlaygroundChatBinding,
  type WorkflowInterface,
  type WorkflowInterfaceEntry
} from '$lib/types/index.js';

function entry(id: string, extra: Partial<WorkflowInterfaceEntry> = {}): WorkflowInterfaceEntry {
  return { id, dataType: 'string', bindings: [], ...extra };
}

function binding(overrides: Partial<PlaygroundChatBinding> = {}): PlaygroundChatBinding {
  return { ...emptyPlaygroundChat(), ...overrides };
}

describe('emptyPlaygroundChat', () => {
  it('binds nothing, every key present', () => {
    expect(emptyPlaygroundChat()).toEqual({
      message: null,
      history: null,
      session_id: null,
      message_id: null,
      replies: [],
      sub_workflow_replies: false
    });
  });

  it('returns a fresh object each time', () => {
    expect(emptyPlaygroundChat()).not.toBe(emptyPlaygroundChat());
    expect(emptyPlaygroundChat().replies).not.toBe(emptyPlaygroundChat().replies);
  });
});

describe('normalizePlaygroundChat', () => {
  it('gives the empty binding for anything that is not an object', () => {
    for (const value of [null, undefined, 'x', 3, [], true]) {
      expect(normalizePlaygroundChat(value)).toEqual(emptyPlaygroundChat());
    }
  });

  it('keeps a well-formed binding as it is', () => {
    const full = binding({
      message: 'msg',
      history: { input: 'hist', limit: 4 },
      session_id: 's',
      message_id: 'm',
      replies: [{ node_id: 'n1', port: 'text' }],
      sub_workflow_replies: true
    });
    expect(normalizePlaygroundChat(full)).toEqual(full);
  });

  it('drops malformed replies and keeps the good ones in order', () => {
    const result = normalizePlaygroundChat({
      replies: [
        { node_id: 'a', port: 'x' },
        { node_id: 'b' },
        { port: 'y' },
        { node_id: '', port: 'y' },
        { node_id: 3, port: 'y' },
        null,
        'str',
        { node_id: 'c', port: 'z' }
      ]
    });
    expect(result.replies).toEqual([
      { node_id: 'a', port: 'x' },
      { node_id: 'c', port: 'z' }
    ]);
  });

  it('treats a non-array replies value as no replies', () => {
    expect(normalizePlaygroundChat({ replies: 'a' }).replies).toEqual([]);
  });

  it('defaults a bad history limit to the default limit', () => {
    for (const limit of [0, -2, 1.5, '5', null, undefined, NaN]) {
      expect(normalizePlaygroundChat({ history: { input: 'h', limit } }).history).toEqual({
        input: 'h',
        limit: DEFAULT_HISTORY_TURN_LIMIT
      });
    }
    expect(normalizePlaygroundChat({ history: { input: 'h', limit: 1 } }).history?.limit).toBe(1);
  });

  it('drops a history without an input name', () => {
    expect(normalizePlaygroundChat({ history: { limit: 5 } }).history).toBeNull();
    expect(normalizePlaygroundChat({ history: { input: '', limit: 5 } }).history).toBeNull();
    expect(normalizePlaygroundChat({ history: 'h' }).history).toBeNull();
  });

  it('turns empty or non-string input names into null', () => {
    const result = normalizePlaygroundChat({ message: '', session_id: 4, message_id: {} });
    expect(result.message).toBeNull();
    expect(result.session_id).toBeNull();
    expect(result.message_id).toBeNull();
  });

  it('only a literal true enables sub-workflow replies', () => {
    expect(normalizePlaygroundChat({ sub_workflow_replies: true }).sub_workflow_replies).toBe(true);
    expect(normalizePlaygroundChat({ sub_workflow_replies: 'yes' }).sub_workflow_replies).toBe(
      false
    );
  });

  it('does not mutate its argument', () => {
    const input = { message: 'm', replies: [{ node_id: 'a', port: 'b' }, { node_id: 'x' }] };
    const copy = structuredClone(input);
    normalizePlaygroundChat(input);
    expect(input).toEqual(copy);
  });
});

describe('interfaceTurnChat', () => {
  it('is null without an interface or without any turn', () => {
    expect(interfaceTurnChat(undefined)).toBeNull();
    expect(interfaceTurnChat({})).toBeNull();
    expect(interfaceTurnChat({ inputs: [entry('a')], outputs: [entry('o')] })).toBeNull();
  });

  it('reads the binding the turns declare', () => {
    const iface: WorkflowInterface = {
      inputs: [
        entry('m', { turn: 'message' }),
        entry('h', { turn: 'history', meta: { limit: 7 } }),
        entry('s', { turn: 'session_id' }),
        entry('i', { turn: 'message_id' }),
        entry('topic')
      ],
      outputs: [
        entry('r1', { turn: 'reply', bindings: [{ nodeId: 'n1', portId: 'text' }] }),
        entry('r2', { turn: 'reply', bindings: [{ nodeId: 'n2', portId: 'out' }] }),
        entry('plain', { bindings: [{ nodeId: 'n3', portId: 'x' }] })
      ]
    };
    expect(interfaceTurnChat(iface)).toEqual({
      message: 'm',
      history: { input: 'h', limit: 7 },
      session_id: 's',
      message_id: 'i',
      replies: [
        { node_id: 'n1', port: 'text' },
        { node_id: 'n2', port: 'out' }
      ],
      sub_workflow_replies: false
    });
  });

  it('lets the first input per turn win', () => {
    const result = interfaceTurnChat({
      inputs: [entry('first', { turn: 'message' }), entry('second', { turn: 'message' })]
    });
    expect(result?.message).toBe('first');
  });

  it('uses the default limit when the history has no valid meta.limit', () => {
    for (const meta of [undefined, {}, { limit: 0 }, { limit: 2.5 }, { limit: '3' }]) {
      expect(
        interfaceTurnChat({ inputs: [entry('h', { turn: 'history', meta })] })?.history
      ).toEqual({ input: 'h', limit: DEFAULT_HISTORY_TURN_LIMIT });
    }
  });

  it('skips a reply output that is bound to nothing', () => {
    const result = interfaceTurnChat({ outputs: [entry('r', { turn: 'reply', bindings: [] })] });
    expect(result?.replies).toEqual([]);
  });

  it('ignores an unknown turn value but still reports a binding for it', () => {
    const result = interfaceTurnChat({ inputs: [entry('x', { turn: 'entity_context' })] });
    expect(result).toEqual(emptyPlaygroundChat());
  });
});

describe('resolvePlaygroundChat', () => {
  const iface: WorkflowInterface = {
    inputs: [entry('msg'), entry('hist'), entry('sid'), entry('mid'), entry('topic')]
  };

  it('is null for a workflow without a playground key (old server)', () => {
    expect(resolvePlaygroundChat({ interface: iface })).toBeNull();
    expect(resolvePlaygroundChat(null)).toBeNull();
    expect(resolvePlaygroundChat(undefined)).toBeNull();
  });

  it('is an empty binding with source none when nothing is stored or marked', () => {
    expect(resolvePlaygroundChat({ interface: iface, playground: { chat: null } })).toEqual({
      binding: emptyPlaygroundChat(),
      source: 'none'
    });
    expect(resolvePlaygroundChat({ playground: { chat: null } })?.source).toBe('none');
  });

  it('stored settings win over the interface turn', () => {
    const resolved = resolvePlaygroundChat({
      interface: {
        inputs: [entry('msg'), entry('other', { turn: 'message' })]
      },
      playground: { chat: binding({ message: 'msg' }) }
    });
    expect(resolved?.source).toBe('settings');
    expect(resolved?.binding.message).toBe('msg');
  });

  it('uses the interface turn when chat is null, with source interface_turn', () => {
    const resolved = resolvePlaygroundChat({
      interface: { inputs: [entry('other', { turn: 'message' })] },
      playground: { chat: null }
    });
    expect(resolved?.source).toBe('interface_turn');
    expect(resolved?.binding.message).toBe('other');
  });

  it('ignores the stale server-computed resolved and source', () => {
    const resolved = resolvePlaygroundChat({
      interface: iface,
      playground: {
        chat: binding({ message: 'msg' }),
        resolved: binding({ message: 'old' }),
        source: 'none'
      }
    });
    expect(resolved?.binding.message).toBe('msg');
    expect(resolved?.source).toBe('settings');
  });

  it('binds nothing for names that are not on the interface', () => {
    const resolved = resolvePlaygroundChat({
      interface: iface,
      playground: {
        chat: binding({
          message: 'gone',
          history: { input: 'gone', limit: 5 },
          session_id: 'sid',
          message_id: 'gone',
          replies: [{ node_id: 'n', port: 'p' }]
        })
      }
    });
    expect(resolved?.binding).toEqual(
      binding({ session_id: 'sid', replies: [{ node_id: 'n', port: 'p' }] })
    );
  });

  it('keeps a history whose input is on the interface, with its limit', () => {
    const resolved = resolvePlaygroundChat({
      interface: iface,
      playground: { chat: binding({ history: { input: 'hist', limit: 3 } }) }
    });
    expect(resolved?.binding.history).toEqual({ input: 'hist', limit: 3 });
  });

  it('binds nothing at all when the workflow has no interface', () => {
    const resolved = resolvePlaygroundChat({
      playground: { chat: binding({ message: 'msg' }) }
    });
    expect(resolved?.binding.message).toBeNull();
    expect(resolved?.source).toBe('settings');
  });

  it('normalises a malformed stored chat', () => {
    const resolved = resolvePlaygroundChat({
      interface: iface,
      playground: { chat: { message: 'msg', replies: [{ node_id: 'x' }] } as never }
    });
    expect(resolved?.binding.replies).toEqual([]);
    expect(resolved?.binding.message).toBe('msg');
  });
});

describe('playgroundBoundInputs', () => {
  it('collects the four input names that are bound', () => {
    const ids = playgroundBoundInputs(
      binding({
        message: 'a',
        history: { input: 'b', limit: 2 },
        session_id: 'c',
        message_id: 'd',
        replies: [{ node_id: 'n', port: 'p' }]
      })
    );
    expect([...ids].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('is empty for an empty binding', () => {
    expect(playgroundBoundInputs(emptyPlaygroundChat()).size).toBe(0);
  });
});

describe('isPlaygroundChatSet', () => {
  it('is false for an empty binding', () => {
    expect(isPlaygroundChatSet(emptyPlaygroundChat())).toBe(false);
  });

  it('is true when any part states something', () => {
    expect(isPlaygroundChatSet(binding({ message: 'a' }))).toBe(true);
    expect(isPlaygroundChatSet(binding({ history: { input: 'h', limit: 1 } }))).toBe(true);
    expect(isPlaygroundChatSet(binding({ session_id: 's' }))).toBe(true);
    expect(isPlaygroundChatSet(binding({ message_id: 'm' }))).toBe(true);
    expect(isPlaygroundChatSet(binding({ replies: [{ node_id: 'n', port: 'p' }] }))).toBe(true);
    expect(isPlaygroundChatSet(binding({ sub_workflow_replies: true }))).toBe(true);
  });
});

describe('isPlaygroundChatHalfSet', () => {
  it('is true for a message without replies', () => {
    expect(isPlaygroundChatHalfSet(binding({ message: 'a' }))).toBe(true);
  });

  it('is false with a reply, or without a message', () => {
    expect(
      isPlaygroundChatHalfSet(binding({ message: 'a', replies: [{ node_id: 'n', port: 'p' }] }))
    ).toBe(false);
    expect(isPlaygroundChatHalfSet(binding({ replies: [] }))).toBe(false);
    expect(isPlaygroundChatHalfSet(emptyPlaygroundChat())).toBe(false);
  });
});

describe('withPlaygroundChat', () => {
  it('stores a normalised binding', () => {
    const result = withPlaygroundChat(undefined, binding({ message: 'a' }));
    expect(result).toEqual({ chat: binding({ message: 'a' }) });
  });

  it('clears to null for null or an empty binding', () => {
    expect(withPlaygroundChat({ chat: binding({ message: 'a' }) }, null).chat).toBeNull();
    expect(
      withPlaygroundChat({ chat: binding({ message: 'a' }) }, emptyPlaygroundChat()).chat
    ).toBeNull();
  });

  it('drops resolved and source, which no longer describe the workflow', () => {
    const result = withPlaygroundChat(
      { chat: null, resolved: binding({ message: 'x' }), source: 'interface_turn' },
      binding({ message: 'a' })
    );
    expect(result).not.toHaveProperty('resolved');
    expect(result).not.toHaveProperty('source');
    expect(result.chat?.message).toBe('a');
  });

  it('drops resolved and source when clearing too', () => {
    const result = withPlaygroundChat(
      { chat: null, resolved: emptyPlaygroundChat(), source: 'none' },
      null
    );
    expect(result).toEqual({ chat: null });
  });

  it('does not mutate the previous playground', () => {
    const previous = { chat: null, resolved: emptyPlaygroundChat(), source: 'none' };
    withPlaygroundChat(previous, binding({ message: 'a' }));
    expect(previous.resolved).toEqual(emptyPlaygroundChat());
    expect(previous.source).toBe('none');
    expect(previous.chat).toBeNull();
  });
});

describe('playgroundForSave', () => {
  it('is undefined when the workflow has no playground key', () => {
    expect(playgroundForSave(undefined)).toBeUndefined();
  });

  it('sends only chat', () => {
    const sent = playgroundForSave({
      chat: binding({ message: 'a' }),
      resolved: binding({ message: 'zzz' }),
      source: 'settings'
    });
    expect(sent).toEqual({ chat: binding({ message: 'a' }) });
    expect(Object.keys(sent ?? {})).toEqual(['chat']);
  });

  it('sends chat null when nothing is stored', () => {
    expect(playgroundForSave({ chat: null, resolved: emptyPlaygroundChat() })).toEqual({
      chat: null
    });
  });

  it('normalises the stored binding', () => {
    expect(
      playgroundForSave({
        chat: { message: 'a', replies: [{ node_id: 'x' }] } as never
      })?.chat?.replies
    ).toEqual([]);
  });
});

describe('withoutInterfaceTurns', () => {
  it('keeps a turn value this library does not know (from a newer server)', () => {
    const newer = entry('x', { turn: 'from_the_future' });
    const result = withoutInterfaceTurns({ inputs: [newer, entry('m', { turn: 'message' })] });
    expect(result?.inputs?.[0]).toBe(newer);
    expect(result?.inputs?.[1]).toEqual(entry('m'));
  });

  it('is undefined for no interface', () => {
    expect(withoutInterfaceTurns(undefined)).toBeUndefined();
  });

  it('strips turn from inputs and outputs', () => {
    const result = withoutInterfaceTurns({
      inputs: [entry('m', { turn: 'message' }), entry('topic')],
      outputs: [entry('r', { turn: 'reply' })]
    });
    expect(result?.inputs?.[0]).toEqual(entry('m'));
    expect('turn' in (result?.inputs?.[0] ?? {})).toBe(false);
    expect('turn' in (result?.outputs?.[0] ?? {})).toBe(false);
    expect(result?.inputs?.[1]).toEqual(entry('topic'));
  });

  it('strips a history entry limit but keeps other meta keys', () => {
    const result = withoutInterfaceTurns({
      inputs: [entry('h', { turn: 'history', meta: { limit: 5, note: 'keep' } })]
    });
    expect(result?.inputs?.[0]).toEqual(entry('h', { meta: { note: 'keep' } }));
  });

  it('drops an emptied meta', () => {
    const result = withoutInterfaceTurns({
      inputs: [entry('h', { turn: 'history', meta: { limit: 5 } })]
    });
    expect('meta' in (result?.inputs?.[0] ?? {})).toBe(false);
  });

  it('keeps meta.limit on an entry whose turn is not history', () => {
    const result = withoutInterfaceTurns({
      inputs: [entry('x', { turn: 'message', meta: { limit: 5 } })]
    });
    expect(result?.inputs?.[0]).toEqual(entry('x', { meta: { limit: 5 } }));
  });

  it('leaves an entry without a turn untouched, meta included', () => {
    const plain = entry('p', { meta: { limit: 3 } });
    const result = withoutInterfaceTurns({ inputs: [plain] });
    expect(result?.inputs?.[0]).toBe(plain);
  });

  it('omits a side the interface lacks and does not mutate', () => {
    const source: WorkflowInterface = {
      inputs: [entry('h', { turn: 'history', meta: { limit: 5, a: 1 } })]
    };
    const copy = structuredClone(source);
    const result = withoutInterfaceTurns(source);
    expect(source).toEqual(copy);
    expect(result).not.toHaveProperty('outputs');
  });
});
