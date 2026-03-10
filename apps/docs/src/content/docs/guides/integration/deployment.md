---
title: Deployment
description: Deploy FlowDrop in production with Docker, Node.js, or static hosting.
---

FlowDrop is a frontend library — how you deploy depends on your application architecture.

## Bundle Size & Tree-Shaking

Import from the most specific module to minimize bundle size:

| Module | Added size (approx.) |
|--------|---------------------|
| `@flowdrop/flowdrop/core` | ~15KB (types & utils only) |
| `@flowdrop/flowdrop/form` | ~40KB |
| `@flowdrop/flowdrop/editor` | ~200KB (includes @xyflow/svelte) |
| `@flowdrop/flowdrop/form/code` | ~300KB (CodeMirror) |
| `@flowdrop/flowdrop/playground` | ~250KB (editor + chat) |
| `@flowdrop/flowdrop` (full) | ~500KB+ |

Only import `form/code` and `form/markdown` if you actually need code/template editing.

## CSS Import

Always import FlowDrop styles. Without this, the editor renders blank:

```typescript
import '@flowdrop/flowdrop/styles';
```

Or in CSS:
```css
@import '@flowdrop/flowdrop/styles';
```

## Svelte / SvelteKit

FlowDrop is a Svelte 5 library, so it integrates natively:

```svelte
<script>
  import { App } from '@flowdrop/flowdrop/editor';
  import '@flowdrop/flowdrop/styles';
</script>

<App
  endpointConfig={createEndpointConfig('/api/flowdrop')}
  showNavbar={true}
/>
```

For SvelteKit, ensure FlowDrop runs only on the client (it requires DOM):

```svelte
<script>
  import { browser } from '$app/environment';
</script>

{#if browser}
  <App {endpointConfig} />
{/if}
```

## React / Vue / Angular / Vanilla JS

Use the [Mount API](/reference/mount-api/) to embed FlowDrop in any container:

```typescript
import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import '@flowdrop/flowdrop/styles';

const app = await mountFlowDropApp(document.getElementById('editor'), {
  endpointConfig: createEndpointConfig('/api/flowdrop'),
});

// Cleanup on page unmount
app.destroy();
```

### React Example

```tsx
import { useEffect, useRef } from 'react';
import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import '@flowdrop/flowdrop/styles';

function FlowDropEditor({ apiUrl }) {
  const containerRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    mountFlowDropApp(containerRef.current, {
      endpointConfig: createEndpointConfig(apiUrl)
    }).then(app => { appRef.current = app; });

    return () => appRef.current?.destroy();
  }, [apiUrl]);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
```

## Docker

Package your frontend and backend together:

```dockerfile
# Build frontend
FROM node:20 AS frontend
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Serve with backend
FROM node:20
WORKDIR /app
COPY --from=frontend /app/dist ./public
COPY backend/ ./backend
RUN cd backend && npm install
EXPOSE 3000
CMD ["node", "backend/index.js"]
```

Configure the API base URL via environment variable:

```typescript
const apiUrl = import.meta.env.VITE_API_URL || '/api/flowdrop';
const endpointConfig = createEndpointConfig(apiUrl);
```

## Static Hosting

If your frontend is a static SPA (Vite, SvelteKit adapter-static, etc.):

1. Build your app: `npm run build`
2. Deploy the `dist/` folder to any static host (Vercel, Netlify, S3, etc.)
3. Configure CORS on your backend to allow the static host's origin

```typescript
// Backend CORS configuration
app.use(cors({
  origin: ['https://your-app.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Environment Variables

Common configuration to externalize:

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API base URL | `/api/flowdrop` |
| `VITE_AUTH_TOKEN` | Static auth token (dev) | `dev-token-123` |

```typescript
const endpointConfig = createEndpointConfig(
  import.meta.env.VITE_API_URL || '/api/flowdrop'
);
```

## Next Steps

- [Framework Integration](/guides/integration/) — framework-specific setup
- [Authentication Patterns](/guides/integration/authentication-patterns/) — secure your deployment
- [Backend Implementation](/guides/integration/backend-implementation/) — build your API
