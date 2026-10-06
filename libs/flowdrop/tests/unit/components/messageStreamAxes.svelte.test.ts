/**
 * MessageStream renders the message `display` and `origin` axes (PLAY-4):
 *   - `display: 'hidden'` rows are not rendered (they stay in the store —
 *     hiding is about noise, never secrecy)
 *   - runs of three or more adjacent log-layout rows fold into one
 *     collapsible group
 *   - engine / playground / interrupt origins get a badge; user, workflow
 *     and absent (older servers) origins do not
 * Mounted for real (client build, happy-dom).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import MessageStream from '$lib/components/playground/MessageStream.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { PlaygroundMessage } from '$lib/types/playground.js';

let mounted: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

let seq = 0;
function msg(overrides: Partial<PlaygroundMessage>): PlaygroundMessage {
  seq += 1;
  return {
    id: `m-${seq}`,
    sessionId: 's-1',
    role: 'assistant',
    content: `content ${seq}`,
    timestamp: '2026-10-06T10:00:00Z',
    sequenceNumber: seq,
    ...overrides
  };
}

function render(messages: PlaygroundMessage[], props: Record<string, unknown> = {}) {
  const fd = createFlowDropInstance();
  fd.playground.setCurrentSession({
    id: 's-1',
    workflowId: 'wf',
    name: 'Session',
    status: 'idle',
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z'
  });
  fd.playground.setMessages(messages);
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(MessageStream, {
    target,
    props: { autoScroll: false, ...props },
    context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  flushSync();
  return { target, fd };
}

describe('MessageStream — display: hidden', () => {
  it('does not render hidden rows but keeps them in the store', () => {
    const { target, fd } = render([
      msg({ content: 'visible reply', origin: 'workflow' }),
      msg({ content: 'secret-looking noise', display: 'hidden', origin: 'engine' })
    ]);
    expect(target.textContent).toContain('visible reply');
    expect(target.textContent).not.toContain('secret-looking noise');
    expect(fd.playground.messages).toHaveLength(2);
  });

  it('shows the empty-session state when every row is hidden', () => {
    const { target } = render([msg({ content: 'only noise', display: 'hidden' })]);
    expect(target.textContent).not.toContain('only noise');
    expect(target.querySelector('.message-bubble')).toBeNull();
  });

  it('treats display: default as no hint (role-based layout)', () => {
    const { target } = render([msg({ role: 'assistant', display: 'default', content: 'hi' })]);
    expect(target.querySelector('.message-bubble')).not.toBeNull();
  });
});

describe('MessageStream — log groups', () => {
  it('folds three or more adjacent log-layout rows into one collapsible group', () => {
    const { target } = render([
      msg({ content: 'reply' }),
      msg({ role: 'system', display: 'log', content: 'l1' }),
      msg({ role: 'system', display: 'log', content: 'l2' }),
      msg({ role: 'assistant', display: 'log', content: 'l3' }),
      msg({ content: 'after' })
    ]);
    const groups = target.querySelectorAll('details.message-stream__log-group');
    expect(groups).toHaveLength(1);
    expect(groups[0].querySelectorAll('.log-row')).toHaveLength(3);
    expect(groups[0].querySelector('summary')?.textContent).toContain('3 log lines');
    expect((groups[0] as HTMLDetailsElement).open).toBe(true);
  });

  it('leaves a run of two log rows ungrouped', () => {
    const { target } = render([
      msg({ role: 'system', display: 'log', content: 'l1' }),
      msg({ role: 'system', display: 'log', content: 'l2' })
    ]);
    expect(target.querySelector('details.message-stream__log-group')).toBeNull();
    expect(target.querySelectorAll('.log-row')).toHaveLength(2);
  });

  it('does not let a hidden row break or join a run', () => {
    const { target } = render([
      msg({ role: 'system', display: 'log', content: 'l1' }),
      msg({ display: 'hidden', content: 'h' }),
      msg({ role: 'system', display: 'log', content: 'l2' }),
      msg({ role: 'system', display: 'log', content: 'l3' })
    ]);
    const group = target.querySelector('details.message-stream__log-group');
    expect(group?.querySelectorAll('.log-row')).toHaveLength(3);
  });
});

describe('MessageStream — origin badge', () => {
  it('badges engine, playground and interrupt origins', () => {
    const { target } = render([
      msg({ role: 'system', display: 'notice', origin: 'engine', content: 'started' }),
      msg({ role: 'assistant', origin: 'playground', content: 'console' }),
      msg({ role: 'system', display: 'card', origin: 'interrupt', content: 'q' }),
      msg({ role: 'user', display: 'log', origin: 'engine', content: 'trigger' })
    ]);
    const badges = Array.from(target.querySelectorAll('.origin-badge')).map((el) =>
      el.getAttribute('data-origin')
    );
    expect(badges).toEqual(['engine', 'playground', 'interrupt', 'engine']);
  });

  it('does not badge user, workflow or absent origins', () => {
    const { target } = render([
      msg({ role: 'user', origin: 'user', content: 'hi' }),
      msg({ role: 'assistant', origin: 'workflow', content: 'hello' }),
      msg({ role: 'assistant', content: 'from an older server' })
    ]);
    expect(target.querySelector('.origin-badge')).toBeNull();
  });
});
