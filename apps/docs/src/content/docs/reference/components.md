---
title: Components
description: Key Svelte components exported by FlowDrop.
---

## Editor Components

### `App`

Full-featured application wrapper with sidebar, editor, navbar, and config panel.

```svelte
<script>
  import { App } from '@d34dman/flowdrop/editor';
</script>

<App
  workflow={myWorkflow}
  nodes={nodeMetadataList}
  endpointConfig={config}
  authProvider={auth}
  showNavbar={true}
/>
```

### `WorkflowEditor`

Core canvas component using SvelteFlow. Renders nodes and edges with drag-and-drop, zoom, pan, and minimap.

```svelte
<script>
  import { WorkflowEditor } from '@d34dman/flowdrop/editor';
</script>

<WorkflowEditor {nodes} />
```

### `NodeSidebar`

Left sidebar displaying available node types organized by category. Supports search and drag-and-drop to canvas.

```svelte
<script>
  import { NodeSidebar } from '@d34dman/flowdrop/editor';
</script>

<NodeSidebar {nodes} />
```

### `UniversalNode`

Dynamic node wrapper that resolves and renders the correct node component based on type. Automatically injects `NodeStatusOverlay`. Used internally by the editor.

## Node Components

All node components accept `NodeComponentProps`:

| Component | Type | Description |
|-----------|------|-------------|
| `WorkflowNodeComponent` | `workflowNode` | Full-featured node with port lists |
| `SimpleNode` | `simple` | Compact layout with icon |
| `SquareNode` | `square` | Minimal icon-only design |
| `ToolNode` | `tool` | Agent tool with badge |
| `GatewayNode` | `gateway` | Branching with multiple outputs |
| `TerminalNode` | `terminal` | Circular start/end node |
| `NotesNode` | `note` | Markdown documentation block |

## Form Components

### `SchemaForm`

Renders a form from JSON Schema definition.

```svelte
<script>
  import { SchemaForm } from '@d34dman/flowdrop/form';
</script>

<SchemaForm
  schema={jsonSchema}
  values={formValues}
  onChange={(values) => { /* handle change */ }}
/>
```

### `ConfigForm`

Configuration form that supports both static schemas and dynamic schema fetching. Used in the node config panel.

| Prop | Type | Description |
|------|------|-------------|
| `node` | `WorkflowNode` | Derive schema/values from a node |
| `schema` | `ConfigSchema` | Direct schema (alternative to `node`) |
| `uiSchema` | `UISchemaElement` | Layout definition |
| `values` | `Record<string, unknown>` | Config values |
| `workflowId` | `string` | For dynamic schema requests |
| `authProvider` | `AuthProvider` | Auth for API requests |
| `onChange` | `function` | Called on field change |
| `onSave` | `function` | Called on save |
| `onCancel` | `function` | Called on cancel |

### Field Components

| Component | Schema Match | Description |
|-----------|-------------|-------------|
| `FormTextField` | `type: "string"` | Text input |
| `FormTextarea` | `format: "multiline"` | Multi-line text |
| `FormNumberField` | `type: "number"` | Number input |
| `FormToggle` | `type: "boolean"` | Toggle switch |
| `FormSelect` | `enum` or `oneOf` | Select dropdown |
| `FormCheckboxGroup` | `enum` + `multiple` | Checkbox group |
| `FormRangeField` | `format: "range"` | Range slider |
| `FormArray` | `type: "array"` | Dynamic list |

## Display Components

### `MarkdownDisplay`

Renders markdown content using the `marked` library.

```svelte
<script>
  import { MarkdownDisplay } from '@d34dman/flowdrop/display';
</script>

<MarkdownDisplay content="**Hello** world" />
```

## Playground Components

### `Playground`

Full interactive playground with chat interface and session management.

```svelte
<script>
  import { Playground } from '@d34dman/flowdrop/playground';
</script>

<Playground workflowId="my-workflow" />
```

### Interrupt Components

| Component | Interrupt Type | Description |
|-----------|---------------|-------------|
| `InterruptBubble` | All | Container that renders the correct prompt |
| `ConfirmationPrompt` | `confirmation` | Yes/No approval |
| `ChoicePrompt` | `choice` | Selection from options |
| `TextInputPrompt` | `text_input` | Text entry |
| `FormPrompt` | `form` | JSON Schema form |
| `ReviewPrompt` | `review` | Field change review with diffs |

## Settings Components

### `ThemeToggle`

Button to cycle through light/dark/auto themes.

```svelte
<script>
  import { ThemeToggle } from '@d34dman/flowdrop/settings';
</script>

<ThemeToggle />
```

### `SettingsPanel` / `SettingsModal`

UI for managing all user settings categories (theme, editor, UI, behavior, API).

## Status Components

| Component | Description |
|-----------|-------------|
| `NodeStatusOverlay` | Displays execution status on nodes |
| `StatusIcon` | Color-coded status icon |
| `PipelineStatus` | Full pipeline execution view with logs |

## Component Hierarchy

```
App
├── Navbar (Logo, save/export buttons)
├── NodeSidebar (node type cards, search)
├── WorkflowEditor (SvelteFlow canvas)
│   └── UniversalNode
│       ├── NodeStatusOverlay
│       └── [Node Component] (WorkflowNode, SimpleNode, etc.)
└── ConfigSidebar
    └── ConfigForm (dynamic JSON Schema form)
```
