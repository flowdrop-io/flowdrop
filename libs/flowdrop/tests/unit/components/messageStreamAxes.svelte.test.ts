/**
 * MessageStream renders the message `display` and `origin` axes (PLAY-4):
 *   - `display: 'hidden'` rows are not rendered (they stay in the store —
 *     hiding is about noise, never secrecy)
 *   - the log-layout rows of a turn fold into one steps row
 *   - engine / interrupt origins get a badge (not the Playground); user, workflow
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
    props: { autoScroll: false, allowLogs: true, ...props },
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

describe('MessageStream — steps row', () => {
  const log = (content: string, extra: Partial<PlaygroundMessage> = {}) =>
    msg({ role: 'log', content, origin: 'playground', ...extra });

  it('folds the log rows of a turn into one summary row, folded by default', () => {
    const { target } = render([
      msg({ role: 'user', content: 'go' }),
      log('completed in 120µs', { nodeId: 'a', metadata: { nodeLabel: 'Chat Input' } }),
      log('completed in 42ms', { nodeId: 'b', metadata: { nodeLabel: 'Calculator' } }),
      log('completed in 3.5ms', { nodeId: 'c', metadata: { nodeLabel: 'Chat Output' } }),
      msg({ content: 'the reply' })
    ]);
    expect(target.querySelectorAll('.log-row')).toHaveLength(0);
    const summaries = target.querySelectorAll('[data-testid="steps-summary"]');
    expect(summaries).toHaveLength(1);
    expect(summaries[0].textContent).toContain('3 steps · 46 ms');
    const toggle = target.querySelector('[data-testid="steps-summary-toggle"]');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(target.querySelector('table')).toBeNull();
  });

  it('opens the table on click, with node, status, count and ms', () => {
    const { target } = render([
      msg({ role: 'user', content: 'go' }),
      log('completed in 120µs', { nodeId: 'a', metadata: { nodeLabel: 'Chat Input' } }),
      log('completed in 42ms', { nodeId: 'b', metadata: { nodeLabel: 'Calculator' } }),
      log('completed in 2ms', { nodeId: 'b', metadata: { nodeLabel: 'Calculator' } })
    ]);
    const toggle = target.querySelector<HTMLButtonElement>('[data-testid="steps-summary-toggle"]')!;
    toggle.click();
    flushSync();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const rows = Array.from(target.querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim())
    );
    expect(rows).toEqual([
      ['Chat Input', 'Done', '', '0.1 ms'],
      ['Calculator', 'Done', '×2', '44 ms']
    ]);
  });

  it('starts expanded when the setting says so', () => {
    const fd = createFlowDropInstance();
    fd.playground.setExpandSteps(true);
    const target = document.createElement('div');
    document.body.appendChild(target);
    fd.playground.setCurrentSession({
      id: 's-1',
      workflowId: 'wf',
      name: 'Session',
      status: 'idle',
      createdAt: '2026-10-06T10:00:00Z',
      updatedAt: '2026-10-06T10:00:00Z'
    });
    fd.playground.setMessages([log('completed in 1ms', { nodeId: 'a' })]);
    mounted = mount(MessageStream, {
      target,
      props: { autoScroll: false, allowLogs: true },
      context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
    });
    flushSync();
    expect(
      target.querySelector('[data-testid="steps-summary-toggle"]')?.getAttribute('aria-expanded')
    ).toBe('true');
  });

  it('keeps a failed step error visible while folded and counts waiting steps', () => {
    const { target } = render([
      msg({ role: 'user', content: 'go' }),
      log('completed in 1ms', { nodeId: 'a', metadata: { nodeLabel: 'Chat Input' } }),
      log('failed: division by zero', { nodeId: 'b', metadata: { nodeLabel: 'Calculator' } }),
      log('paused after 2ms', { nodeId: 'c', metadata: { nodeLabel: 'Ask Confirmation' } })
    ]);
    const summary = target.querySelector('[data-testid="steps-summary"]')!;
    expect(summary.textContent).toContain('3 steps · 3.0 ms · 1 failed · 1 waiting');
    expect(summary.getAttribute('data-status')).toBe('failed');
    expect(target.querySelector('[data-testid="steps-summary-errors"]')?.textContent).toContain(
      'Calculator: division by zero'
    );
  });

  it('makes one summary per turn', () => {
    const { target } = render([
      msg({ role: 'user', content: 'one' }),
      log('completed in 1ms', { nodeId: 'a' }),
      msg({ role: 'assistant', content: 'r1' }),
      log('completed in 1ms', { nodeId: 'b' }),
      msg({ role: 'user', content: 'two' }),
      log('completed in 1ms', { nodeId: 'a' })
    ]);
    expect(target.querySelectorAll('[data-testid="steps-summary"]')).toHaveLength(2);
  });

  it('folds run-lifecycle notices into the turn, but keeps warnings and errors', () => {
    const notice = (content: string, extra: Partial<PlaygroundMessage> = {}) =>
      msg({ role: 'system', display: 'notice', content, executionId: 'p-1', ...extra });
    const { target } = render([
      msg({ role: 'user', content: 'go' }),
      notice('started', { metadata: { level: 'info' } }),
      log('completed in 1ms', { nodeId: 'a' }),
      notice('completed in 59.1ms', { executionId: 'p-2', metadata: { level: 'info' } }),
      notice('budget nearly spent', { metadata: { level: 'warning' } })
    ]);
    expect(target.textContent).not.toContain('started');
    expect(target.textContent).not.toContain('59.1ms');
    expect(target.textContent).toContain('budget nearly spent');
    const stream = Array.from(
      target.querySelectorAll('[data-testid="steps-summary"], .system-notice')
    );
    expect(stream[0].getAttribute('data-testid')).toBe('steps-summary');
    expect(stream[0].textContent).toContain('1 step');
  });

  it('keeps lifecycle notices when the turn has no steps', () => {
    const { target } = render(
      [
        msg({ role: 'user', content: 'go' }),
        msg({ role: 'system', display: 'notice', content: 'started', executionId: 'p-1' }),
        log('completed in 1ms', { nodeId: 'a' })
      ],
      { allowLogs: false }
    );
    expect(target.textContent).toContain('started');
    expect(target.querySelector('[data-testid="steps-summary"]')).toBeNull();
  });

  it('does not let a hidden row join a turn', () => {
    const { target } = render([
      log('completed in 1ms', { nodeId: 'a' }),
      msg({ display: 'hidden', content: 'h' }),
      log('completed in 1ms', { nodeId: 'b' })
    ]);
    expect(target.querySelector('[data-testid="steps-summary"]')?.textContent).toContain('2 steps');
  });
});

describe('MessageStream — origin badge', () => {
  it('badges engine and interrupt origins, not the Playground', () => {
    const { target } = render([
      msg({ role: 'system', display: 'notice', origin: 'engine', content: 'started' }),
      msg({ role: 'assistant', origin: 'playground', content: 'console' }),
      msg({ role: 'system', display: 'card', origin: 'interrupt', content: 'q' }),
      msg({ role: 'user', display: 'log', origin: 'engine', content: 'trigger' })
    ]);
    const badges = Array.from(target.querySelectorAll('.origin-badge')).map((el) =>
      el.getAttribute('data-origin')
    );
    expect(badges).toEqual(['engine', 'interrupt', 'engine']);
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
