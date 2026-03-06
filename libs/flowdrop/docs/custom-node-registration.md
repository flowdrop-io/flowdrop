# Custom Node Registration

FlowDrop ships with 8 built-in node types, but you can register your own custom node components to extend the editor. Custom nodes are Svelte 5 components that receive standardized props and integrate seamlessly with the editor's selection, execution, and configuration systems.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Writing a Custom Node Component](#writing-a-custom-node-component)
- [Registration Methods](#registration-methods)
  - [registerCustomNode — Single Node](#registercustomnode--single-node)
  - [registerFlowDropPlugin — Multi-Node Plugin](#registerflowdropplugin--multi-node-plugin)
  - [createPlugin — Fluent Builder](#createplugin--fluent-builder)
- [Making Nodes Available in the Sidebar](#making-nodes-available-in-the-sidebar)
- [Built-in Node Types Reference](#built-in-node-types-reference)
- [Plugin Management](#plugin-management)
- [API Reference](#api-reference)

---

## Overview

There are three ways to register custom nodes, depending on your use case:

| Approach                       | When to use                                 |
| ------------------------------ | ------------------------------------------- |
| **`registerCustomNode()`**     | One-off project-specific nodes              |
| **`registerFlowDropPlugin()`** | Libraries providing multiple node types     |
| **`createPlugin()`**           | Same as above, with a chainable builder API |

All approaches register a Svelte component in the global `nodeComponentRegistry`. The editor's `UniversalNode` resolver looks up components from this registry at render time.

Custom node types are **namespaced** (e.g., `"mylib:code-editor"`) to prevent conflicts with built-in types or other plugins.

---

## Quick Start

**1. Write a Svelte component:**

```svelte
<!-- CodeEditorNode.svelte -->
<script lang="ts">
	import type { NodeComponentProps } from '@d34dman/flowdrop/editor';

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
import { registerCustomNode } from '@d34dman/flowdrop/editor';
import CodeEditorNode from './CodeEditorNode.svelte';

registerCustomNode('myapp:code-editor', 'Code Editor', CodeEditorNode, {
	icon: 'mdi:code-braces',
	description: 'A custom code editor node',
	category: 'custom'
});
```

**3. Mount the editor with node metadata:**

```typescript
import { mountFlowDropApp } from '@d34dman/flowdrop/editor';
import '@d34dman/flowdrop/styles';

const app = await mountFlowDropApp(document.getElementById('editor')!, {
	nodes: [
		{
			id: 'myapp:code-editor',
			name: 'Code Editor',
			type: 'myapp:code-editor',
			description: 'Write and edit code',
			category: 'processing',
			version: '1.0.0',
			icon: 'mdi:code-braces',
			inputs: [{ id: 'input', name: 'Input', type: 'input', dataType: 'string' }],
			outputs: [{ id: 'output', name: 'Output', type: 'output', dataType: 'string' }],
			configSchema: {
				type: 'object',
				properties: {
					language: {
						type: 'string',
						title: 'Language',
						enum: ['javascript', 'python', 'rust'],
						default: 'javascript'
					},
					code: {
						type: 'string',
						title: 'Code',
						format: 'multiline',
						default: ''
					}
				}
			}
		}
	]
});
```

Registration can happen **before or after** calling `mountFlowDropApp` — the registry is a singleton that persists for the lifetime of the page.

---

## Writing a Custom Node Component

All custom node components must accept `NodeComponentProps`:

```typescript
interface NodeComponentProps {
	/** Node data containing label, config, metadata, and execution info */
	data: {
		label: string;
		config: Record<string, unknown>;
		metadata: NodeMetadata;
		nodeId?: string;
		executionInfo?: NodeExecutionInfo;
		extensions?: NodeExtensions;
		onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
	};

	/** Whether the node is currently selected on the canvas */
	selected?: boolean;

	/** Whether the node is currently executing */
	isProcessing?: boolean;

	/** Whether the node has encountered an error */
	isError?: boolean;
}
```

### Accessing configuration values

User-configured values are available under `data.config`. These correspond to the fields defined in your `configSchema`:

```svelte
<script lang="ts">
	import type { NodeComponentProps } from '@d34dman/flowdrop/editor';

	let {
		data,
		selected = false,
		isProcessing = false,
		isError = false
	}: NodeComponentProps = $props();

	const language = $derived(data.config?.language ?? 'javascript');
	const code = $derived(data.config?.code ?? '');
</script>

<div class="node" class:selected class:processing={isProcessing} class:error={isError}>
	<header>{data.label}</header>
	<span class="badge">{language}</span>
	<pre><code>{code}</code></pre>
</div>
```

### Opening the config panel

If you want a button that opens the node's configuration panel:

```svelte
<button onclick={() => data.onConfigOpen?.({ id: data.nodeId!, type: data.metadata.id, data })}>
  Configure
</button>
```

---

## Registration Methods

### `registerCustomNode` — Single Node

The simplest API. Registers one component with an explicit type string.

```typescript
import { registerCustomNode } from '@d34dman/flowdrop/editor';
import MyNode from './MyNode.svelte';

registerCustomNode('myproject:special', 'Special Node', MyNode, {
	description: 'A special node for my project',
	icon: 'mdi:star',
	category: 'custom'
});
```

**Signature:**

```typescript
function registerCustomNode(
	type: string,
	displayName: string,
	component: Component<NodeComponentProps>,
	options?: {
		description?: string;
		icon?: string; // Iconify format (e.g., "mdi:star")
		category?: NodeComponentCategory; // "visual" | "functional" | "layout" | "custom"
		source?: string; // Defaults to "custom"
		statusPosition?: StatusPosition; // "top-left" | "top-right" | "bottom-left" | "bottom-right"
		statusSize?: StatusSize; // "sm" | "md" | "lg"
	}
): void;
```

### `registerFlowDropPlugin` — Multi-Node Plugin

Registers multiple node types under a shared namespace. All type identifiers are automatically prefixed with the namespace (e.g., `"awesome"` + `"fancy"` becomes `"awesome:fancy"`).

```typescript
import { registerFlowDropPlugin } from '@d34dman/flowdrop/editor';
import FancyNode from './FancyNode.svelte';
import GlowNode from './GlowNode.svelte';

const result = registerFlowDropPlugin({
	namespace: 'awesome',
	name: 'Awesome Nodes',
	version: '1.0.0',
	nodes: [
		{
			type: 'fancy',
			displayName: 'Fancy Node',
			component: FancyNode,
			icon: 'mdi:sparkles',
			category: 'custom'
		},
		{
			type: 'glow',
			displayName: 'Glowing Node',
			component: GlowNode,
			icon: 'mdi:lightbulb'
		}
	]
});

// result:
// {
//   success: true,
//   namespace: "awesome",
//   registeredTypes: ["awesome:fancy", "awesome:glow"],
//   errors: []
// }
```

**Namespace rules:** Must match `/^[a-z][a-z0-9-]*$/` — lowercase letters, digits, and hyphens. Must start with a letter.

### `createPlugin` — Fluent Builder

A chainable API that builds and registers a plugin in one expression:

```typescript
import { createPlugin } from '@d34dman/flowdrop/editor';
import FancyNode from './FancyNode.svelte';
import GlowNode from './GlowNode.svelte';

createPlugin('awesome', 'Awesome Nodes')
	.version('1.0.0')
	.description('A collection of awesome nodes')
	.node('fancy', 'Fancy Node', FancyNode, { icon: 'mdi:sparkles' })
	.node('glow', 'Glowing Node', GlowNode, { icon: 'mdi:lightbulb' })
	.register();
```

**Builder methods:**

| Method                                          | Description                                                    |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `.version(v)`                                   | Set plugin version                                             |
| `.description(desc)`                            | Set plugin description                                         |
| `.node(type, displayName, component, options?)` | Add a node definition                                          |
| `.register()`                                   | Register the plugin, returns `PluginRegistrationResult`        |
| `.getConfig()`                                  | Get the config object without registering (useful for testing) |

---

## Making Nodes Available in the Sidebar

Registering a component tells FlowDrop _how to render_ a node type. To make the node **appear in the sidebar** for users to drag onto the canvas, pass `NodeMetadata` entries in the `nodes` option when mounting:

```typescript
const app = await mountFlowDropApp(container, {
	nodes: [
		{
			id: 'myapp:code-editor',
			name: 'Code Editor',
			type: 'myapp:code-editor', // Must match the registered component type
			description: 'Write and edit code',
			category: 'processing',
			version: '1.0.0',
			icon: 'mdi:code-braces',
			inputs: [{ id: 'input', name: 'Input', type: 'input', dataType: 'string', required: true }],
			outputs: [{ id: 'output', name: 'Output', type: 'output', dataType: 'string' }],
			configSchema: {
				type: 'object',
				properties: {
					language: {
						type: 'string',
						title: 'Language',
						enum: ['javascript', 'python'],
						default: 'javascript'
					}
				},
				required: ['language']
			}
		}
	]
});
```

The `type` field in `NodeMetadata` is the key link — it must match the type string you used during component registration. If no custom component is registered for a given type, FlowDrop falls back to its built-in node types.

### NodeMetadata fields

| Field            | Type              | Description                                                       |
| ---------------- | ----------------- | ----------------------------------------------------------------- |
| `id`             | `string`          | Unique identifier                                                 |
| `name`           | `string`          | Display name                                                      |
| `type`           | `string`          | Visual component type (matches registered type)                   |
| `supportedTypes` | `string[]`        | Alternative visual types the node can switch to                   |
| `description`    | `string`          | Description shown in sidebar and tooltips                         |
| `category`       | `string`          | Sidebar grouping (`"triggers"`, `"models"`, `"processing"`, etc.) |
| `version`        | `string`          | Version string                                                    |
| `icon`           | `string`          | Iconify icon (e.g., `"mdi:code-braces"`)                          |
| `color`          | `string`          | CSS color for node accent                                         |
| `badge`          | `string`          | Label badge (e.g., `"TOOL"`, `"API"`, `"LLM"`)                    |
| `inputs`         | `NodePort[]`      | Input port definitions                                            |
| `outputs`        | `NodePort[]`      | Output port definitions                                           |
| `configSchema`   | `ConfigSchema`    | JSON Schema for the node's configuration form                     |
| `uiSchema`       | `UISchemaElement` | Layout hints for the config form                                  |
| `config`         | `object`          | Default config values                                             |
| `tags`           | `string[]`        | Searchable tags                                                   |

### NodePort fields

| Field          | Type      | Description                                                     |
| -------------- | --------- | --------------------------------------------------------------- |
| `id`           | `string`  | Unique port identifier                                          |
| `name`         | `string`  | Display name                                                    |
| `type`         | `string`  | `"input"`, `"output"`, or `"metadata"`                          |
| `dataType`     | `string`  | Data type (e.g., `"string"`, `"number"`, `"tool"`, `"trigger"`) |
| `required`     | `boolean` | Whether a connection is required                                |
| `description`  | `string`  | Port description                                                |
| `defaultValue` | `unknown` | Default value                                                   |

---

## Built-in Node Types Reference

These are the visual types that ship with FlowDrop. When a `NodeMetadata` entry has a `type` field matching one of these, FlowDrop uses the corresponding built-in component instead of requiring a custom registration.

| Type           | Display Name | Description                                       | Icon                    |
| -------------- | ------------ | ------------------------------------------------- | ----------------------- |
| `workflowNode` | Default      | Full-featured node with inputs/outputs display    | `mdi:vector-square`     |
| `simple`       | Simple       | Compact layout with header, icon, and description | `mdi:card-outline`      |
| `square`       | Square       | Minimal icon-only design                          | `mdi:square`            |
| `tool`         | Tool         | Agent tools with tool metadata                    | `mdi:tools`             |
| `gateway`      | Gateway      | Branching control flow with multiple outputs      | `mdi:source-branch`     |
| `note`         | Note         | Sticky note with markdown support                 | `mdi:note-text`         |
| `terminal`     | Terminal     | Circular nodes for start/end/exit points          | `mdi:circle-double`     |
| `idea`         | Idea         | Conceptual flow for BPMN-like diagrams            | `mdi:lightbulb-outline` |

If your `NodeMetadata.type` doesn't match any registered type (built-in or custom), FlowDrop falls back to `workflowNode`.

You can also use `supportedTypes` on `NodeMetadata` to allow users to switch between visual types at runtime via the node's config panel.

---

## Plugin Management

```typescript
import {
	unregisterFlowDropPlugin,
	getRegisteredPlugins,
	getPluginNodeCount,
	isValidNamespace
} from '@d34dman/flowdrop/editor';

// Remove all nodes from a plugin
const removed = unregisterFlowDropPlugin('awesome');
// Returns ["awesome:fancy", "awesome:glow"]

// List all registered plugin namespaces
const plugins = getRegisteredPlugins();
// Returns ["awesome", "mylib"]

// Count nodes registered by a plugin
const count = getPluginNodeCount('awesome');
// Returns 2

// Validate a namespace before registration
isValidNamespace('my-lib'); // true
isValidNamespace('MyLib'); // false — uppercase not allowed
isValidNamespace('123lib'); // false — must start with a letter
```

---

## API Reference

### `FlowDropPluginConfig`

```typescript
interface FlowDropPluginConfig {
	namespace: string; // Unique namespace (lowercase alphanumeric + hyphens)
	name: string; // Display name
	version?: string; // Plugin version
	description?: string; // Plugin description
	nodes: PluginNodeDefinition[]; // Node definitions
}
```

### `PluginNodeDefinition`

```typescript
interface PluginNodeDefinition {
	type: string; // Type identifier (auto-prefixed with namespace)
	displayName: string; // Display name shown in UI
	description?: string; // Node description
	component: Component<NodeComponentProps>; // Svelte component
	icon?: string; // Iconify icon
	category?: NodeComponentCategory; // "visual" | "functional" | "layout" | "custom"
	statusPosition?: StatusPosition; // "top-left" | "top-right" | "bottom-left" | "bottom-right"
	statusSize?: StatusSize; // "sm" | "md" | "lg"
}
```

### `PluginRegistrationResult`

```typescript
interface PluginRegistrationResult {
	success: boolean; // Whether all nodes registered successfully
	namespace: string; // The plugin namespace
	registeredTypes: string[]; // Successfully registered namespaced types
	errors: string[]; // Error messages for failed registrations
}
```

### `NodeComponentProps`

```typescript
interface NodeComponentProps {
	data: WorkflowNode['data'] & {
		nodeId?: string;
		onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
	};
	selected?: boolean;
	isProcessing?: boolean;
	isError?: boolean;
}
```

### `NodeComponentRegistration`

```typescript
interface NodeComponentRegistration {
	type: string;
	displayName: string;
	description?: string;
	icon?: string;
	category?: NodeComponentCategory;
	source?: string;
	statusPosition?: StatusPosition;
	statusSize?: StatusSize;
	component: Component<NodeComponentProps>;
}
```
