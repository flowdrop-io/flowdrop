---
title: Custom Nodes
description: Register custom Svelte components as workflow node types.
---

FlowDrop ships with 7 built-in node types, but you can register your own custom node components to extend the editor.

## Overview

There are three registration methods:

| Approach | When to use |
|----------|-------------|
| **`registerCustomNode()`** | One-off project-specific nodes |
| **`registerFlowDropPlugin()`** | Libraries providing multiple node types |
| **`createPlugin()`** | Same as above, with a chainable builder API |

Custom node types are **namespaced** (e.g., `"mylib:code-editor"`) to prevent conflicts.

## Quick Start

**1. Write a Svelte component:**

```svelte
<!-- CodeEditorNode.svelte -->
<script lang="ts">
  import type { NodeComponentProps } from '@flowdrop/flowdrop/editor';

  let { data, selected = false }: NodeComponentProps = $props();
</script>

<div class="code-editor-node" class:selected>
  <h4>{data.label}</h4>
  <pre>{data.config?.code ?? ''}</pre>
</div>

<style>
  .code-editor-node {
    padding: 12px;
    border: 1px solid var(--fd-border);
    border-radius: 6px;
    background: var(--fd-surface);
    min-width: 200px;
  }
  .code-editor-node.selected {
    border-color: var(--fd-primary);
  }
</style>
```

**2. Register it:**

```typescript
import { registerCustomNode } from '@flowdrop/flowdrop/editor';
import CodeEditorNode from './CodeEditorNode.svelte';

registerCustomNode('myapp:code-editor', 'Code Editor', CodeEditorNode, {
  icon: 'mdi:code-braces',
  description: 'A custom code editor node',
  category: 'custom'
});
```

**3. Make it available in the sidebar** by passing `NodeMetadata` with a matching `type`:

```typescript
const app = await mountFlowDropApp(container, {
  nodes: [{
    id: 'myapp:code-editor',
    name: 'Code Editor',
    type: 'myapp:code-editor', // Must match registered type
    description: 'Write and edit code',
    category: 'processing',
    inputs: [{ id: 'input', name: 'Input', type: 'input', dataType: 'string' }],
    outputs: [{ id: 'output', name: 'Output', type: 'output', dataType: 'string' }]
  }]
});
```

## NodeComponentProps

All custom node components must accept:

```typescript
interface NodeComponentProps {
  data: {
    label: string;
    config: Record<string, unknown>;
    metadata: NodeMetadata;
    nodeId?: string;
    executionInfo?: NodeExecutionInfo;
    onConfigOpen?: (node) => void;
  };
  selected?: boolean;
  isProcessing?: boolean;
  isError?: boolean;
}
```

## Plugin Registration

Register multiple nodes under a shared namespace:

```typescript
import { registerFlowDropPlugin } from '@flowdrop/flowdrop/editor';

const result = registerFlowDropPlugin({
  namespace: 'awesome',
  name: 'Awesome Nodes',
  version: '1.0.0',
  nodes: [
    {
      type: 'fancy',
      displayName: 'Fancy Node',
      component: FancyNode,
      icon: 'mdi:sparkles'
    },
    {
      type: 'glow',
      displayName: 'Glowing Node',
      component: GlowNode,
      icon: 'mdi:lightbulb'
    }
  ]
});

// result.registeredTypes: ["awesome:fancy", "awesome:glow"]
```

### Fluent Builder

```typescript
import { createPlugin } from '@flowdrop/flowdrop/editor';

createPlugin('awesome', 'Awesome Nodes')
  .version('1.0.0')
  .node('fancy', 'Fancy Node', FancyNode, { icon: 'mdi:sparkles' })
  .node('glow', 'Glowing Node', GlowNode, { icon: 'mdi:lightbulb' })
  .register();
```

## Plugin Management

```typescript
import {
  unregisterFlowDropPlugin,
  getRegisteredPlugins,
  getPluginNodeCount,
  isValidNamespace
} from '@flowdrop/flowdrop/editor';

unregisterFlowDropPlugin('awesome');  // Remove all nodes from a plugin
getRegisteredPlugins();               // List registered namespaces
getPluginNodeCount('awesome');        // Count nodes in a plugin
isValidNamespace('my-lib');           // Validate namespace format
```

Namespace rules: Must match `/^[a-z][a-z0-9-]*$/` — lowercase letters, digits, and hyphens, starting with a letter.

## Built-in Node Types

If no custom component is registered for a `type`, FlowDrop falls back to built-in types:

| Type | Description |
|------|-------------|
| `workflowNode` | Full-featured node with inputs/outputs |
| `simple` | Compact layout |
| `square` | Minimal icon-only design |
| `tool` | Agent tool nodes |
| `gateway` | Branching control flow |
| `note` | Markdown sticky notes |
| `terminal` | Circular start/end nodes |

Use `supportedTypes` on `NodeMetadata` to let users switch between visual types at runtime.
