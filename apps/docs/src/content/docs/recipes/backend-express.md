---
title: "Backend: Express.js"
description: Build a working FlowDrop backend with Express in 15 minutes.
---

This recipe walks you through building a complete FlowDrop backend using Express.js. By the end, you'll have a working API that FlowDrop can talk to.

:::tip
FlowDrop includes a complete example Express server at `apps/example-server-express/` in the repository. This recipe is based on that implementation.
:::

## Prerequisites

- Node.js 18+
- A FlowDrop frontend (see [Quick Start](/getting-started/quick-start/))

## Step 1: Project Setup

```bash
mkdir flowdrop-backend && cd flowdrop-backend
npm init -y
npm install express cors
npm install -D typescript tsx @types/express @types/cors
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

## Step 2: Health Endpoint

Create `src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const API_BASE = '/api/flowdrop';

// Health check — FlowDrop calls this on mount
app.get(`${API_BASE}/health`, (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`FlowDrop backend running on http://localhost:${PORT}`);
});
```

Run it:
```bash
npx tsx --watch src/index.ts
```

## Step 3: Node Definitions

Create `src/nodes.ts` with your node metadata. Each node describes what appears in FlowDrop's sidebar:

```typescript
export interface NodeMetadata {
  id: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  icon?: string;
  inputs: Array<{
    id: string;
    name: string;
    type: 'input';
    dataType: string;
  }>;
  outputs: Array<{
    id: string;
    name: string;
    type: 'output';
    dataType: string;
  }>;
  configSchema?: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
}

export const nodes: NodeMetadata[] = [
  {
    id: 'text_input',
    name: 'Text Input',
    description: 'Accepts text from the user',
    type: 'simple',
    category: 'inputs',
    icon: 'mdi:text-box-outline',
    inputs: [],
    outputs: [
      { id: 'output', name: 'Text', type: 'output', dataType: 'string' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        placeholder: {
          type: 'string',
          title: 'Placeholder',
          default: 'Enter text...'
        },
        multiline: {
          type: 'boolean',
          title: 'Multi-line',
          default: false
        }
      }
    }
  },
  {
    id: 'chat_model',
    name: 'Chat Model',
    description: 'Send prompts to an LLM',
    type: 'workflowNode',
    category: 'models',
    icon: 'mdi:robot-outline',
    inputs: [
      { id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string' }
    ],
    outputs: [
      { id: 'response', name: 'Response', type: 'output', dataType: 'string' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          title: 'Model',
          oneOf: [
            { const: 'gpt-4', title: 'GPT-4' },
            { const: 'claude-3-sonnet', title: 'Claude 3 Sonnet' }
          ],
          default: 'gpt-4'
        },
        temperature: {
          type: 'number',
          title: 'Temperature',
          minimum: 0,
          maximum: 2,
          default: 0.7
        }
      }
    }
  },
  {
    id: 'text_output',
    name: 'Text Output',
    description: 'Display text results',
    type: 'simple',
    category: 'outputs',
    icon: 'mdi:text',
    inputs: [
      { id: 'input', name: 'Text', type: 'input', dataType: 'string' }
    ],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          title: 'Format',
          enum: ['plain', 'markdown', 'json'],
          default: 'plain'
        }
      }
    }
  }
];
```

Add the nodes route in `src/index.ts`:

```typescript
import { nodes } from './nodes.js';

app.get(`${API_BASE}/nodes`, (req, res) => {
  let result = nodes;

  // Filter by category
  if (req.query.category) {
    result = result.filter(n => n.category === req.query.category);
  }

  // Search
  if (req.query.search) {
    const q = (req.query.search as string).toLowerCase();
    result = result.filter(n =>
      n.name.toLowerCase().includes(q) ||
      n.description?.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, data: result });
});

app.get(`${API_BASE}/nodes/:id`, (req, res) => {
  const node = nodes.find(n => n.id === req.params.id);
  if (!node) {
    return res.status(404).json({ success: false, error: 'Node not found' });
  }
  res.json({ success: true, data: node });
});
```

## Step 4: Workflow CRUD

Create `src/workflows.ts`:

```typescript
import crypto from 'crypto';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  metadata?: {
    created_at: string;
    updated_at: string;
  };
}

// In-memory storage (use a database in production)
const workflows = new Map<string, Workflow>();

export function getAllWorkflows() {
  return Array.from(workflows.values());
}

export function getWorkflowById(id: string) {
  return workflows.get(id);
}

export function createWorkflow(input: Partial<Workflow>): Workflow {
  const now = new Date().toISOString();
  const workflow: Workflow = {
    id: crypto.randomUUID(),
    name: input.name || 'Untitled Workflow',
    description: input.description,
    nodes: input.nodes || [],
    edges: input.edges || [],
    metadata: { created_at: now, updated_at: now }
  };
  workflows.set(workflow.id, workflow);
  return workflow;
}

export function updateWorkflow(id: string, updates: Partial<Workflow>): Workflow | null {
  const existing = workflows.get(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    id, // prevent ID change
    metadata: {
      ...existing.metadata,
      updated_at: new Date().toISOString()
    }
  };
  workflows.set(id, updated as Workflow);
  return updated as Workflow;
}

export function deleteWorkflow(id: string): boolean {
  return workflows.delete(id);
}
```

Add the workflow routes in `src/index.ts`:

```typescript
import {
  getAllWorkflows, getWorkflowById,
  createWorkflow, updateWorkflow, deleteWorkflow
} from './workflows.js';

app.get(`${API_BASE}/workflows`, (req, res) => {
  res.json({ success: true, data: getAllWorkflows() });
});

app.get(`${API_BASE}/workflows/:id`, (req, res) => {
  const workflow = getWorkflowById(req.params.id);
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }
  res.json({ success: true, data: workflow });
});

app.post(`${API_BASE}/workflows`, (req, res) => {
  const workflow = createWorkflow(req.body);
  res.status(201).json({ success: true, data: workflow });
});

app.put(`${API_BASE}/workflows/:id`, (req, res) => {
  const workflow = updateWorkflow(req.params.id, req.body);
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }
  res.json({ success: true, data: workflow });
});

app.delete(`${API_BASE}/workflows/:id`, (req, res) => {
  const deleted = deleteWorkflow(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }
  res.json({ success: true, data: { id: req.params.id } });
});
```

## Step 5: Categories & Port Config

Add these routes for the full sidebar and connection validation experience:

```typescript
app.get(`${API_BASE}/categories`, (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'inputs', name: 'Inputs', icon: 'mdi:import', color: 'var(--fd-node-emerald)', weight: 10 },
      { id: 'models', name: 'Models', icon: 'mdi:robot', color: 'var(--fd-node-purple)', weight: 20 },
      { id: 'outputs', name: 'Outputs', icon: 'mdi:export', color: 'var(--fd-node-blue)', weight: 30 },
      { id: 'processing', name: 'Processing', icon: 'mdi:cog', color: 'var(--fd-node-amber)', weight: 40 },
      { id: 'logic', name: 'Logic', icon: 'mdi:sitemap', color: 'var(--fd-node-indigo)', weight: 50 }
    ]
  });
});

app.get(`${API_BASE}/port-config`, (req, res) => {
  res.json({
    success: true,
    data: {
      version: '1.0.0',
      defaultDataType: 'string',
      dataTypes: [
        { id: 'string', name: 'String', color: '#10b981', category: 'basic' },
        { id: 'number', name: 'Number', color: '#3b82f6', category: 'basic' },
        { id: 'boolean', name: 'Boolean', color: '#8b5cf6', category: 'basic' },
        { id: 'json', name: 'JSON', color: '#f59e0b', category: 'complex' },
        { id: 'trigger', name: 'Trigger', color: '#ef4444', category: 'special' }
      ],
      compatibilityRules: [
        { from: 'string', to: 'json' },
        { from: 'number', to: 'string' },
        { from: 'json', to: 'string' }
      ]
    }
  });
});
```

## Step 6: Connect to FlowDrop

In your frontend, point FlowDrop to your backend:

```typescript
import { mountFlowDropApp } from '@d34dman/flowdrop/editor';
import { createEndpointConfig } from '@d34dman/flowdrop/core';

const app = await mountFlowDropApp(document.getElementById('editor'), {
  endpointConfig: createEndpointConfig('http://localhost:3001/api/flowdrop'),
  eventHandlers: {
    onAfterSave: async (workflow) => {
      console.log('Saved:', workflow.id);
    }
  }
});
```

Start both servers and you should see nodes in the sidebar, be able to drag them onto the canvas, connect them, and save workflows.

## Production Considerations

This recipe uses in-memory storage for simplicity. For production:

- **Database**: Replace the `Map` with PostgreSQL, MongoDB, or any persistent store
- **Validation**: Add request body validation (zod, joi, etc.)
- **Authentication**: Add auth middleware and configure FlowDrop's `authProvider`
- **Rate limiting**: Protect endpoints from abuse
- **Error handling**: Add proper error middleware

## Next Steps

- [Backend Implementation Guide](/guides/integration/backend-implementation/) — full endpoint reference
- [Framework Integration](/guides/integration/) — advanced frontend configuration
- [Authentication Patterns](/guides/integration/) — secure your API
