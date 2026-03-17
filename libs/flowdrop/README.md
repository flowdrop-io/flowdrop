<p align="center">
  <img src="https://raw.githubusercontent.com/flowdrop-io/flowdrop/main/libs/flowdrop/static/logo.svg" alt="FlowDrop" width="120" />
</p>

<h1 align="center">FlowDrop™</h1>

<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/flowdrop-io/flowdrop/docker-publish.yml?style=flat-square&label=Build" alt="GitHub build status" />
  <a href="https://www.npmjs.com/package/@flowdrop/flowdrop"><img src="https://img.shields.io/npm/v/@flowdrop/flowdrop?style=flat-square" alt="npm" /></a>
  <img src="https://img.shields.io/npm/unpacked-size/%40flowdrop%2Fflowdrop?style=flat-square" alt="NPM Unpacked Size" />
  <img src="https://img.shields.io/npm/types/@flowdrop/flowdrop?style=flat-square" alt="npm type definitions" />
  <a href="http://npmjs.com/package/@flowdrop/flowdrop"><img alt="NPM Downloads" src="https://img.shields.io/npm/d18m/%40flowdrop%2Fflowdrop"></a>
  

</p>

<p align="center">
  <strong>Build beautiful workflow editors in minutes, not months.</strong>
</p>

<p align="center">
  An awesome workflow editor built with Svelte 5 and @xyflow/svelte.<br/>
  You own the backend. You own the data. You own the orchestration.
</p>

<p align="center">
  <a href="https://docs.flowdrop.io/getting-started/installation">Quickstart</a> •
  <a href="#features">Features</a> •
  <a href="#integration">Integration</a> •
  <a href="https://docs.flowdrop.io">Docs</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/flowdrop-io/flowdrop/main/libs/flowdrop/static/FlowDrop-Screenshot.jpg" alt="FlowDrop Screenshot" width="800" />
</p>
<p align="center">
  <em>Build AI-powered workflows with drag-and-drop simplicity. Connect nodes, configure inputs/outputs, and visualize your entire pipeline.</em>
</p>

## Why FlowDrop?

Most workflow tools are SaaS platforms that lock you in. Your data lives on their servers. Your execution logic runs in their cloud. You pay per workflow, per user, per run.

**FlowDrop is different.**

FlowDrop is a pure visual editor. You implement the backend. You control the orchestration. Your workflows run on your infrastructure, with your security policies, at your scale.

No vendor lock-in. No data leaving your walls. No surprise bills.

```bash
npm install @flowdrop/flowdrop
```

> **Note:** FlowDrop supports **one editor instance per page** (module-level singleton stores). See [Architecture Notes](#architecture-notes) for details.

You get a production-ready workflow UI. You keep full control of everything else.

## Quickstart

```svelte
<script lang="ts">
  import { WorkflowEditor } from "@flowdrop/flowdrop";
  import "@flowdrop/flowdrop/styles/base.css";
</script>

<WorkflowEditor />
```

**5 lines. One fully-functional workflow editor.**

## Features

|                              |                                                                           |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Visual Editor Only**    | Pure UI component. No hidden backend, no external dependencies            |
| **You Own Everything**    | Your data, your servers, your orchestration logic, your security policies |
| **Backend Agnostic**      | Connect to any API: Drupal, Laravel, Express, FastAPI, or your own        |
| **8 Built-in Node Types** | From simple icons to complex gateway logic                                |
| **Framework Flexible**    | Use as Svelte component or mount into React, Vue, Angular, or vanilla JS  |
| **Deploy Anywhere**       | Runtime config means build once, deploy everywhere                        |

## Architecture Notes

- **Single instance per page.** FlowDrop uses module-level singleton stores for state management. Only one FlowDrop editor instance can exist on a page at a time.
- **Svelte 5 required.** FlowDrop uses Svelte 5 runes (`$state`, `$derived`, `$effect`) throughout. Svelte 4 is not supported.
- **Modern browsers only.** The library targets ES2020+ and does not include polyfills for older browsers.

## Node Types

FlowDrop ships with 8 beautifully designed node types:

| Type       | Purpose                                 |
| ---------- | --------------------------------------- |
| `default`  | Full-featured nodes with inputs/outputs |
| `simple`   | Compact, space-efficient layout         |
| `square`   | Icon-only minimal design                |
| `tool`     | AI agent tool nodes                     |
| `gateway`  | Conditional branching logic             |
| `terminal` | Start/end workflow points               |
| `note`     | Markdown documentation blocks           |
| `idea`     | Conceptual BPMN-like flow nodes         |

<p align="center">
  <img src="https://raw.githubusercontent.com/flowdrop-io/flowdrop/main/libs/flowdrop/static/Node-Types.jpg" alt="FlowDrop Node Types" width="800" />
</p>
<p align="center">
  <em>From simple triggers to complex branching logic, each node type is designed for specific workflow patterns.</em>
</p>

## Themes

FlowDrop includes a theme system with built-in light/dark support:

```svelte
<script lang="ts">
  import { WorkflowEditor } from "@flowdrop/flowdrop";
  import "@flowdrop/flowdrop/styles";
</script>

<!-- Built-in themes: 'default' or 'minimal' -->
<WorkflowEditor theme="minimal" />
```

Themes bundle a visual skin (CSS token palette) with behavioral UI defaults. You can also pass a custom theme object with your own skin tokens for full control over the light and dark palettes.

```javascript
// Via the mount API
const app = await mountFlowDropApp(container, {
  theme: "minimal",
  // or a custom theme object:
  // theme: { name: 'minimal', skin: { tokens: { primary: '#e11d48' } } }
});
```

## Sub-Module Exports

FlowDrop provides tree-shakeable sub-module exports so you can import only what you need:

| Export Path | Contents |
| --- | --- |
| `@flowdrop/flowdrop` | Full library (components, stores, services, types) |
| `@flowdrop/flowdrop/core` | Types and utilities only (no heavy dependencies) |
| `@flowdrop/flowdrop/editor` | WorkflowEditor, stores, services |
| `@flowdrop/flowdrop/form` | SchemaForm, form fields, registry |
| `@flowdrop/flowdrop/form/code` | Code editor field (CodeMirror) |
| `@flowdrop/flowdrop/form/markdown` | Markdown editor field |
| `@flowdrop/flowdrop/display` | MarkdownDisplay component |
| `@flowdrop/flowdrop/playground` | Playground components and services |
| `@flowdrop/flowdrop/settings` | SettingsPanel, stores, services |
| `@flowdrop/flowdrop/styles` | Base CSS stylesheet |
| `@flowdrop/flowdrop/schema` | Workflow JSON schema |

## Integration

### Svelte (Native)

```svelte
<script>
  import { WorkflowEditor, NodeSidebar } from "@flowdrop/flowdrop";
</script>

<div class="flex h-screen">
  <NodeSidebar {nodes} />
  <WorkflowEditor {nodes} />
</div>
```

### Vanilla JS / React / Vue / Angular

```javascript
import { mountFlowDropApp, createEndpointConfig } from "@flowdrop/flowdrop";

const app = await mountFlowDropApp(document.getElementById("editor"), {
  workflow: myWorkflow,
  endpointConfig: createEndpointConfig("/api/flowdrop"),
  eventHandlers: {
    onDirtyStateChange: (isDirty) => console.log("Unsaved changes:", isDirty),
    onAfterSave: (workflow) => console.log("Saved!", workflow),
  },
});

// Full control over the editor
app.save();
app.getWorkflow();
app.destroy();
```

### Enterprise Integration

```javascript
import { mountFlowDropApp, CallbackAuthProvider } from "@flowdrop/flowdrop";

const app = await mountFlowDropApp(container, {
  // Dynamic token refresh
  authProvider: new CallbackAuthProvider({
    getToken: () => authService.getAccessToken(),
    onUnauthorized: () => authService.refreshToken(),
  }),

  // Lifecycle hooks
  eventHandlers: {
    onBeforeUnmount: (workflow, isDirty) => {
      if (isDirty) saveDraft(workflow);
    },
  },

  // Auto-save, toasts, and more
  features: {
    autoSaveDraft: true,
    autoSaveDraftInterval: 30000,
  },
});
```

## API Configuration

Connect to any backend in seconds:

```typescript
import { createEndpointConfig } from "@flowdrop/flowdrop";

const config = createEndpointConfig("https://api.example.com", {
  endpoints: {
    nodes: { list: "/nodes", get: "/nodes/{id}" },
    workflows: {
      list: "/workflows",
      get: "/workflows/{id}",
      create: "/workflows",
      update: "/workflows/{id}",
      execute: "/workflows/{id}/execute",
    },
  },
});
```

## Customization

The recommended way to customize FlowDrop's appearance is through the [theme system](#themes). For fine-grained control, you can also override individual CSS custom properties:

```css
:root {
  --fd-background: #0a0a0a;
  --fd-primary: #6366f1;
  --fd-border: #27272a;
  --fd-foreground: #fafafa;
}
```

## Deploy

### Docker (Recommended)

```bash
cd ../../apps/example-client-docker
cp env.example .env
docker-compose up -d
```

### Node.js

```bash
npm run build
FLOWDROP_API_BASE_URL=http://your-backend/api node build
```

Runtime configuration means you build once and deploy to staging, production, or anywhere else with just environment variables.

## Documentation

| Resource                                                     | Description              |
| ------------------------------------------------------------ | ------------------------ |
| [QUICK_START.md](https://docs.flowdrop.io/getting-started/installation/)                           | Get running in 5 minutes |
| [API Documentation](https://api.flowdrop.io/v1/) | REST API specification   |
| [CHANGELOG.md](https://github.com/flowdrop-io/flowdrop/blob/main/libs/flowdrop/CHANGELOG.md) | Version history          |

## Development

```bash
pnpm install         # Install dependencies
pnpm dev             # Start dev server
pnpm build           # Build library
pnpm test            # Run all tests
pnpm storybook       # Launch Storybook
```

## Contributing

FlowDrop is stabilizing. Contributions will open soon. Star the repo to stay updated.

<p align="center">
  <strong>FlowDrop</strong> - The visual workflow editor you own completely
</p>

<p align="center">
  Built with ❤️ Svelte 5 and @xyflow/svelte
</p>
