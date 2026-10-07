/**
 * The MSW workflow save handler's check of `playground.chat`: judged against
 * the workflow as the save leaves it (the body's interface and nodes), with
 * the same checks the editor shows (`playgroundChatIssues`), and the saved
 * interface is stored.
 */

import { describe, it, expect } from 'vitest';
import { updateWorkflowHandler } from '../../../src/mocks/handlers/workflows.js';
import { createWorkflow, getWorkflowById } from '../../../src/mocks/data/workflows.js';
import type { PlaygroundChatBinding, WorkflowNode } from '$lib/types/index.js';

const chat = (overrides: Partial<PlaygroundChatBinding>): PlaygroundChatBinding => ({
  message: null,
  history: null,
  session_id: null,
  message_id: null,
  replies: [],
  sub_workflow_replies: false,
  ...overrides
});

const writer: WorkflowNode = {
  id: 'n1',
  type: 'default',
  position: { x: 0, y: 0 },
  data: {
    label: 'Writer',
    config: {},
    metadata: {
      node_type_id: 'test',
      name: 'Test',
      description: '',
      category: 'processing',
      version: '1.0.0',
      type: 'default',
      inputs: [],
      outputs: [{ id: 'text', name: 'Text', type: 'output', dataType: 'string' }]
    }
  }
};

async function save(id: string, body: Record<string, unknown>) {
  const request = new Request(`http://localhost/api/flowdrop/workflows/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await updateWorkflowHandler.run({
    request,
    requestId: crypto.randomUUID(),
    resolutionContext: { baseUrl: 'http://localhost' }
  });
  if (!result?.response) throw new Error('handler did not answer');
  return result.response;
}

function seed(): string {
  return createWorkflow({ name: 'Save check', nodes: [writer], edges: [] }).id;
}

describe('mock workflow save: playground.chat', () => {
  it('accepts a binding to an input added in the same save, and stores the interface', async () => {
    const id = seed();
    const response = await save(id, {
      nodes: [writer],
      interface: { inputs: [{ id: 'prompt', dataType: 'string', bindings: [] }] },
      playground: { chat: chat({ message: 'prompt', replies: [{ node_id: 'n1', port: 'text' }] }) }
    });
    expect(response.status).toBe(200);
    expect(getWorkflowById(id)?.interface?.inputs?.map((entry) => entry.id)).toEqual(['prompt']);
  });

  it('refuses a reply on a node the save does not have', async () => {
    const id = seed();
    const response = await save(id, {
      nodes: [writer],
      playground: { chat: chat({ replies: [{ node_id: 'ghost', port: 'text' }] }) }
    });
    expect(response.status).toBe(422);
    const body = (await response.json()) as { problems: string[] };
    expect(body.problems.join(' ')).toContain('"ghost"');
  });

  it('refuses an input the interface does not have', async () => {
    const id = seed();
    const response = await save(id, {
      interface: { inputs: [] },
      playground: { chat: chat({ message: 'gone' }) }
    });
    expect(response.status).toBe(422);
  });
});
