---
title: Testing
description: Unit testing workflows with WorkflowAdapter, MSW handler setup, and Playwright E2E tests for FlowDrop.
---

FlowDrop provides several testing layers: pure unit tests via `WorkflowAdapter` (no DOM required), integration tests using Mock Service Worker, and end-to-end tests with Playwright.

## Unit Testing with WorkflowAdapter

`WorkflowAdapter` works in Node.js without a browser — ideal for testing your workflow logic in Vitest or Jest.

```typescript
import { WorkflowAdapter } from '@flowdrop/flowdrop/core';
import { describe, it, expect } from 'vitest';

describe('WorkflowAdapter', () => {
  const nodeTypes = [
    {
      id: 'text_input',
      name: 'Text Input',
      ports: { outputs: [{ id: 'output', type: 'string' }] }
    },
    {
      id: 'chat_model',
      name: 'Chat Model',
      ports: {
        inputs: [{ id: 'prompt', type: 'string' }],
        outputs: [{ id: 'response', type: 'string' }]
      }
    },
    { id: 'text_output', name: 'Text Output', ports: { inputs: [{ id: 'input', type: 'string' }] } }
  ];

  it('creates a valid workflow', () => {
    const adapter = new WorkflowAdapter(nodeTypes);
    const workflow = adapter.createWorkflow('Test Pipeline', 'A test workflow');

    const input = adapter.addNode(workflow, 'text_input', { x: 100, y: 200 });
    const model = adapter.addNode(workflow, 'chat_model', { x: 400, y: 200 });
    const output = adapter.addNode(workflow, 'text_output', { x: 700, y: 200 });

    adapter.addEdge(workflow, input.id, model.id, 'output', 'prompt');
    adapter.addEdge(workflow, model.id, output.id, 'response', 'input');

    const result = adapter.validateWorkflow(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('counts nodes by type', () => {
    const adapter = new WorkflowAdapter(nodeTypes);
    const workflow = adapter.createWorkflow('Stats Test');
    adapter.addNode(workflow, 'chat_model', { x: 0, y: 0 });
    adapter.addNode(workflow, 'chat_model', { x: 200, y: 0 });

    const stats = adapter.getWorkflowStats(workflow);
    expect(stats.totalNodes).toBe(2);
    expect(stats.nodeTypeCounts['chat_model']).toBe(2);
  });

  it('serializes and deserializes correctly', () => {
    const adapter = new WorkflowAdapter(nodeTypes);
    const workflow = adapter.createWorkflow('Roundtrip Test');
    adapter.addNode(workflow, 'text_input', { x: 0, y: 0 });

    const json = adapter.exportWorkflow(workflow);
    const imported = adapter.importWorkflow(json);

    expect(imported.name).toBe('Roundtrip Test');
    expect(imported.nodes).toHaveLength(1);
  });
});
```

## MSW Handler Setup

Use [Mock Service Worker](https://mswjs.io/) to mock the FlowDrop REST API in integration tests.

### Handler definitions

```typescript
// src/test/handlers.ts
import { http, HttpResponse } from 'msw';

const mockNodes = [
  {
    id: 'text_input',
    name: 'Text Input',
    category: 'Input',
    ports: { outputs: [{ id: 'output', type: 'string', label: 'Output' }] },
    configSchema: {}
  }
];

const mockWorkflow = {
  id: 'wf-1',
  name: 'Test Workflow',
  nodes: [],
  edges: []
};

export const handlers = [
  http.get('/api/flowdrop/nodes', () => HttpResponse.json(mockNodes)),
  http.get('/api/flowdrop/workflows/:id', () => HttpResponse.json(mockWorkflow)),
  http.post('/api/flowdrop/workflows', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: 'wf-new' }, { status: 201 });
  }),
  http.put('/api/flowdrop/workflows/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  })
];
```

### Server setup (Vitest)

```typescript
// src/test/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Mount API Integration Test

Test that FlowDrop mounts and loads correctly in JSDOM:

```typescript
import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import { createEndpointConfig } from '@flowdrop/flowdrop/core';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('FlowDrop mount', () => {
  let container: HTMLElement;
  let app: ReturnType<typeof mountFlowDropApp>;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    app?.destroy();
    container.remove();
  });

  it('mounts without throwing', async () => {
    app = mountFlowDropApp({
      container,
      endpoints: createEndpointConfig('/api/flowdrop'),
      features: {
        autoSaveDraft: false, // avoid localStorage side effects in tests
        showToasts: false // suppress toast notifications
      }
    });

    expect(app).toBeDefined();
    expect(app.destroy).toBeTypeOf('function');
  });
});
```

## Playwright E2E Tests

Test the full editor experience in a real browser:

```typescript
// tests/editor.spec.ts
import { test, expect } from '@playwright/test';

test('loads the editor and saves a workflow', async ({ page }) => {
  await page.goto('/app/editor');

  // Wait for the Svelte Flow canvas to render
  await page.waitForSelector('.svelte-flow__pane');

  // Verify node sidebar is visible
  await expect(page.locator('[data-testid="node-sidebar"]')).toBeVisible();

  // Click the save button
  await page.click('[data-testid="save-button"]');

  // Assert save succeeded (toast or network request)
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
});

test('can drag a node onto the canvas', async ({ page }) => {
  await page.goto('/app/editor');
  await page.waitForSelector('.svelte-flow__pane');

  // Drag from the node palette to the canvas
  const nodeItem = page.locator('[data-node-type="text_input"]').first();
  const canvas = page.locator('.svelte-flow__pane');
  const canvasBox = await canvas.boundingBox();

  await nodeItem.dragTo(canvas, {
    targetPosition: { x: canvasBox!.width / 2, y: canvasBox!.height / 2 }
  });

  // Verify node appears on canvas
  await expect(page.locator('.svelte-flow__node')).toHaveCount(1);
});
```

## Testing Custom Nodes

Validate your node metadata structure using `WorkflowAdapter`:

```typescript
import { WorkflowAdapter } from '@flowdrop/flowdrop/core';
import { myCustomNode } from '../src/nodes/my-custom-node';

describe('Custom node metadata', () => {
  it('can be added to a workflow', () => {
    const adapter = new WorkflowAdapter([myCustomNode]);
    const workflow = adapter.createWorkflow('Custom Node Test');

    expect(() => {
      adapter.addNode(workflow, myCustomNode.id, { x: 0, y: 0 });
    }).not.toThrow();
  });

  it('has valid port definitions', () => {
    expect(myCustomNode.ports).toBeDefined();
    // All port IDs must be unique within a node
    const allPorts = [
      ...(myCustomNode.ports?.inputs ?? []),
      ...(myCustomNode.ports?.outputs ?? [])
    ];
    const ids = allPorts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```
