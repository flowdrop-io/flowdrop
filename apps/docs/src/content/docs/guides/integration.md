---
title: Framework Integration
description: Use FlowDrop with Svelte, vanilla JS, React, Vue, Angular, or any framework.
---

FlowDrop is built with Svelte 5, but can be mounted into any framework via the mount API.

## Svelte (Native)

Use FlowDrop components directly in Svelte:

```svelte
<script>
  import { App } from '@flowdrop/flowdrop/editor';
  import { createEndpointConfig } from '@flowdrop/flowdrop/core';
  import '@flowdrop/flowdrop/styles';

  const endpointConfig = createEndpointConfig('/api/flowdrop');
</script>

<App
  {endpointConfig}
  showNavbar={true}
  eventHandlers={{
    onAfterSave: async (workflow) => console.log('Saved:', workflow.id)
  }}
/>
```

For SvelteKit, ensure FlowDrop runs only on the client:

```svelte
<script>
  import { browser } from '$app/environment';
  import { App } from '@flowdrop/flowdrop/editor';
</script>

{#if browser}
  <App {endpointConfig} />
{/if}
```

## Vanilla JS / React / Vue / Angular

Use the mount API to embed FlowDrop in any container element:

```javascript
import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import { createEndpointConfig } from '@flowdrop/flowdrop/core';
import '@flowdrop/flowdrop/styles';

const app = await mountFlowDropApp(document.getElementById('editor'), {
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  eventHandlers: {
    onDirtyStateChange: (isDirty) => console.log('Unsaved:', isDirty),
    onAfterSave: async (workflow) => console.log('Saved!', workflow)
  }
});

// Programmatic control
app.save();
app.getWorkflow();
app.isDirty();
app.destroy();
```

See [Mount API](/reference/mount-api/) for the complete options and return value.

## API Configuration

Connect to your backend by configuring endpoints:

```typescript
import { createEndpointConfig } from '@flowdrop/flowdrop/core';

// Simple: just a base URL (all endpoints use defaults)
const config = createEndpointConfig('/api/flowdrop');

// Custom: override specific endpoint paths
const config = createEndpointConfig({
  baseUrl: 'https://api.example.com',
  endpoints: {
    nodes: { list: '/nodes', get: '/nodes/{id}' },
    workflows: {
      list: '/workflows',
      get: '/workflows/{id}',
      create: '/workflows',
      update: '/workflows/{id}'
    }
  }
});
```

See [Backend Implementation](/guides/integration/backend-implementation/) for which endpoints to implement.

## Authentication

FlowDrop supports three auth providers. Quick examples:

```typescript
import { NoAuthProvider, StaticAuthProvider, CallbackAuthProvider } from '@flowdrop/flowdrop/core';

// No auth (development)
authProvider: new NoAuthProvider();

// Static bearer token
authProvider: new StaticAuthProvider({ type: 'bearer', token: 'your-jwt' });

// Dynamic token with refresh (enterprise)
authProvider: new CallbackAuthProvider({
  getToken: async () => authService.getAccessToken(),
  onUnauthorized: async () => authService.refreshToken()
});
```

For full details on each provider, token refresh patterns, and OAuth2 integration, see [Authentication Patterns](/guides/integration/authentication-patterns/).

## Event Handlers

React to all 11 editor lifecycle events:

```typescript
const app = await mountFlowDropApp(container, {
  eventHandlers: {
    onWorkflowChange: (workflow, changeType) => {
      analytics.track('workflow_modified', { changeType });
    },
    onDirtyStateChange: (isDirty) => {
      saveButton.disabled = !isDirty;
    },
    onBeforeSave: async (workflow) => {
      // Return false to cancel save
    },
    onAfterSave: async (workflow) => {
      showNotification('Saved!');
    },
    onApiError: (error, operation) => {
      if (error.message.includes('401')) {
        redirectToLogin();
        return true; // suppress default toast
      }
    }
  }
});
```

For the complete event reference, see [Event System](/guides/advanced/event-system/).

## Feature Flags

Enable optional editor features:

```typescript
const app = await mountFlowDropApp(container, {
  features: {
    autoSaveDraft: true, // default: true
    autoSaveDraftInterval: 30000, // default: 30 seconds
    showToasts: true // default: true
  }
});
```

## Read-Only & Lock Modes

```typescript
// Read-only: no editing at all
const app = await mountFlowDropApp(container, {
  readOnly: true
});

// Locked: can view and configure nodes, but not add/remove/connect
const app = await mountFlowDropApp(container, {
  lockWorkflow: true
});
```

## Next Steps

- [Mount API](/reference/mount-api/) — complete mount options and return values
- [Backend Implementation](/guides/integration/backend-implementation/) — build the API
- [Authentication Patterns](/guides/integration/authentication-patterns/) — secure your integration
- [Deployment](/guides/integration/deployment/) — production deployment patterns
- [Event System](/guides/advanced/event-system/) — all 11 event handlers
