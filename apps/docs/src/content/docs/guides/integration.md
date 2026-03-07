---
title: Framework Integration
description: Use FlowDrop with Svelte, vanilla JS, React, Vue, Angular, or any framework.
---

FlowDrop is built with Svelte 5, but can be mounted into any framework via the mount API.

## Svelte (Native)

Use FlowDrop components directly in Svelte:

```svelte
<script>
  import { WorkflowEditor, NodeSidebar } from '@d34dman/flowdrop';
  import '@d34dman/flowdrop/styles/base.css';
</script>

<div class="flex h-screen">
  <NodeSidebar {nodes} />
  <WorkflowEditor {nodes} />
</div>
```

## Vanilla JS / React / Vue / Angular

Use the mount API to embed FlowDrop in any container element:

```javascript
import { mountFlowDropApp, createEndpointConfig } from '@d34dman/flowdrop';
import '@d34dman/flowdrop/styles';

const app = await mountFlowDropApp(document.getElementById('editor'), {
  workflow: myWorkflow,
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  eventHandlers: {
    onDirtyStateChange: (isDirty) => console.log('Unsaved changes:', isDirty),
    onAfterSave: (workflow) => console.log('Saved!', workflow)
  }
});

// Full control over the editor
app.save();
app.getWorkflow();
app.destroy();
```

## API Configuration

Connect to any backend by configuring endpoints:

```typescript
import { createEndpointConfig } from '@d34dman/flowdrop';

const config = createEndpointConfig({
  baseUrl: 'https://api.example.com',
  endpoints: {
    nodes: { list: '/nodes', get: '/nodes/{id}' },
    workflows: {
      list: '/workflows',
      get: '/workflows/{id}',
      create: '/workflows',
      update: '/workflows/{id}',
      execute: '/workflows/{id}/execute'
    }
  },
  auth: { type: 'bearer', token: 'your-token' }
});
```

## Authentication

FlowDrop supports three authentication providers:

### No Authentication

```typescript
import { NoAuthProvider } from '@d34dman/flowdrop';

const app = await mountFlowDropApp(container, {
  authProvider: new NoAuthProvider()
});
```

### Static Token

```typescript
import { StaticAuthProvider } from '@d34dman/flowdrop';

const app = await mountFlowDropApp(container, {
  authProvider: new StaticAuthProvider('your-bearer-token')
});
```

### Dynamic Token (Enterprise)

```typescript
import { CallbackAuthProvider } from '@d34dman/flowdrop';

const app = await mountFlowDropApp(container, {
  authProvider: new CallbackAuthProvider({
    getToken: () => authService.getAccessToken(),
    onUnauthorized: () => authService.refreshToken()
  })
});
```

## Event Handlers

React to editor lifecycle events:

```typescript
const app = await mountFlowDropApp(container, {
  eventHandlers: {
    onBeforeSave: (workflow) => {
      // Validate or transform before saving
      return workflow;
    },
    onAfterSave: (workflow) => {
      // Post-save actions
    },
    onDirtyStateChange: (isDirty) => {
      // Update UI to show unsaved changes
    },
    onBeforeUnmount: (workflow, isDirty) => {
      if (isDirty) saveDraft(workflow);
    }
  }
});
```

## Features

Enable optional editor features:

```typescript
const app = await mountFlowDropApp(container, {
  features: {
    autoSaveDraft: true,
    autoSaveDraftInterval: 30000, // 30 seconds
    proximityConnect: true,
    proximityConnectDistance: 50
  }
});
```

## Deployment

### Docker

```bash
cd apps/example-client-docker
cp env.example .env
docker-compose up -d
```

### Node.js

```bash
npm run build
FLOWDROP_API_BASE_URL=http://your-backend/api node build
```

Runtime configuration means you build once and deploy to staging, production, or anywhere else with just environment variables.
