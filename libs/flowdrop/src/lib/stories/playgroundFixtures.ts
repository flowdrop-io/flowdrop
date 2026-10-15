/**
 * Typed Playground fixtures: messages, sessions and a seeder that puts a
 * conversation into an instance's playground store.
 *
 * Use with `InstanceDecorator`: `setup={(fd) => seedPlayground(fd, { messages })}`.
 */

import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import type {
  MessageHierarchyItem,
  MessageTag,
  PlaygroundMessage,
  PlaygroundSession,
  PlaygroundSessionStatus
} from '../types/playground.js';
import { createEndpointConfig } from '../config/endpoints.js';
import { chatWorkflow } from './fixtures.js';
import { STORY_API_BASE } from './InstanceDecorator.svelte';

const T0 = Date.parse('2026-10-12T14:30:00Z');
let counter = 0;

/** One message, numbered and timestamped in order of creation. */
export function msg(
  role: PlaygroundMessage['role'],
  content: string,
  extra: Partial<PlaygroundMessage> = {}
): PlaygroundMessage {
  counter += 1;
  return {
    id: `msg-${counter}`,
    sessionId: 'session-1',
    role,
    content,
    timestamp: new Date(T0 + counter * 4000).toISOString(),
    sequenceNumber: counter,
    ...extra
  };
}

export const hierarchy: MessageHierarchyItem[] = [
  { id: 'support-chat', label: 'Support chat', icon: 'mdi:graph' },
  { id: 'lookup', label: 'Order lookup', icon: 'mdi:magnify' }
];

export const runTag: MessageTag = {
  id: 'run',
  label: 'Run #142',
  icon: 'mdi:play-circle',
  color: 'info',
  variant: 'subtle'
};

/** A finished turn: question, steps, an answer. Rebuilt on each call so ids stay unique. */
export function conversation(): PlaygroundMessage[] {
  const exec = 'run-142';
  return [
    msg('user', 'Where is my order 4711?'),
    msg('system', 'Support chat started', { executionId: exec, origin: 'engine' }),
    msg('log', 'completed in 4ms', {
      executionId: exec,
      nodeId: 'chat_input.1',
      metadata: { nodeLabel: 'Chat Input' }
    }),
    msg('log', 'completed in 12ms', {
      executionId: exec,
      nodeId: 'prompt_template.1',
      metadata: { nodeLabel: 'Prompt Template' }
    }),
    msg('log', 'completed in 1.2s', {
      executionId: exec,
      nodeId: 'chat_model.1',
      metadata: { nodeLabel: 'Chat Model' }
    }),
    msg(
      'assistant',
      'Order **4711** left the warehouse yesterday.\n\n- Carrier: DHL\n- Expected: Thursday\n\nI can send you the tracking link if you like.',
      { executionId: exec, nodeId: 'chat_output.1', tags: [runTag] }
    ),
    msg('user', 'Yes please.'),
    msg('assistant', 'Here it is: https://tracking.example.com/4711', { executionId: 'run-143' })
  ];
}

export const session: PlaygroundSession = {
  id: 'session-1',
  workflowId: chatWorkflow.id,
  name: 'Order question',
  status: 'idle',
  createdAt: '2026-10-12T14:29:00Z',
  updatedAt: '2026-10-12T14:31:00Z'
};

export function sessions(): PlaygroundSession[] {
  return [
    session,
    {
      ...session,
      id: 'session-2',
      name: 'Refund request',
      status: 'completed',
      createdAt: '2026-10-11T09:10:00Z',
      updatedAt: '2026-10-11T09:14:00Z'
    },
    {
      ...session,
      id: 'session-3',
      name: 'Broken link',
      status: 'failed',
      createdAt: '2026-10-10T16:00:00Z',
      updatedAt: '2026-10-10T16:02:00Z'
    }
  ];
}

export interface PlaygroundSeed {
  messages?: PlaygroundMessage[];
  status?: PlaygroundSessionStatus;
  /** Put sessions in the list (the first one is open). */
  withSessions?: boolean;
  /** Open no session. */
  noSession?: boolean;
}

/** Open a conversation in the instance's playground. */
export function seedPlayground(fd: FlowDropInstance, seed: PlaygroundSeed = {}): void {
  fd.playground.setWorkflow(chatWorkflow);
  const list = seed.withSessions ? sessions() : [session];
  fd.playground.setSessions(list);
  if (!seed.noSession) {
    fd.playground.setCurrentSession({ ...list[0], status: seed.status ?? 'idle' });
    fd.playground.setMessages(seed.messages ?? []);
  }
}

/** The runs of the open conversation, as the history menu lists them. */
export function seedRuns(fd: FlowDropInstance): void {
  fd.playground.setSessionRuns(session.id, {
    workflowVersion: 'v3',
    runs: [
      {
        id: 'run-142',
        startedAt: '2026-10-12T14:30:00Z',
        completedAt: '2026-10-12T14:30:02Z',
        status: 'completed',
        workflowVersion: 'v2',
        message: 'Where is my order 4711?',
        inputs: {},
        inputsTruncated: false
      },
      {
        id: 'run-143',
        startedAt: '2026-10-12T14:31:00Z',
        completedAt: '2026-10-12T14:31:01Z',
        status: 'failed',
        workflowVersion: 'v3',
        message: 'Yes please.',
        inputs: {},
        inputsTruncated: false
      }
    ]
  });
}

/**
 * Point the instance at a fake backend that knows the conversations list and
 * the workflow, so a surface that loads them on mount (the Test panel) has
 * something to read. Other requests get a 404 answer. The browser's `fetch` is
 * put back when the instance is destroyed.
 */
export function fakePlaygroundBackend(fd: FlowDropInstance, list: PlaygroundSession[]): void {
  fd.api.configure(createEndpointConfig(STORY_API_BASE));
  const realFetch = window.fetch;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(STORY_API_BASE)) return realFetch(input, init);
    const path = url.slice(STORY_API_BASE.length).split('?')[0];
    if (path.endsWith('/playground/sessions'))
      return Promise.resolve(json({ success: true, data: list }));
    if (path === `/workflows/${chatWorkflow.id}`) {
      return Promise.resolve(json({ success: true, data: chatWorkflow }));
    }
    return Promise.resolve(json({ success: false, error: 'Not part of this story.' }, 404));
  };
  fd.onDestroy(() => {
    window.fetch = realFetch;
  });
}
