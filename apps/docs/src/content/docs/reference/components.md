---
title: Components
description: Key Svelte components exported by FlowDrop.
---

## Editor Components

### `App`

Full-featured application wrapper with sidebar, editor, navbar, and config panel.

```svelte
<script>
  import { App } from '@flowdrop/flowdrop/editor';
</script>

<App
  workflow={myWorkflow}
  nodes={nodeMetadataList}
  endpointConfig={config}
  authProvider={auth}
  showNavbar={true}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `workflow` | `Workflow` | — | Initial workflow to load |
| `nodes` | `NodeMetadata[]` | — | Available node types (overrides API fetch) |
| `endpointConfig` | `EndpointConfig` | — | API endpoint configuration |
| `authProvider` | `AuthProvider` | — | Authentication provider |
| `height` | `string \| number` | — | Editor height |
| `width` | `string \| number` | — | Editor width |
| `showNavbar` | `boolean` | `true` | Show the top navbar |
| `disableSidebar` | `boolean` | `false` | Hide the node sidebar |
| `readOnly` | `boolean` | `false` | Disable all editing |
| `lockWorkflow` | `boolean` | `false` | Prevent structural changes (add/remove nodes/edges) |
| `showSettings` | `boolean` | `false` | Show settings gear in navbar |
| `navbarTitle` | `string` | — | Custom title in navbar |
| `navbarActions` | `NavbarAction[]` | — | Custom action buttons in navbar |
| `pipelineId` | `string` | — | Pipeline ID for execution status display |
| `nodeStatuses` | `Record<string, string>` | — | Node execution statuses for overlay |
| `eventHandlers` | `FlowDropEventHandlers` | — | Lifecycle event handlers |
| `features` | `FlowDropFeatures` | — | Feature flags |

### `WorkflowEditor`

Core canvas component using SvelteFlow. Renders nodes and edges with drag-and-drop, zoom, pan, and minimap.

```svelte
<script>
  import { WorkflowEditor } from '@flowdrop/flowdrop/editor';
</script>

<WorkflowEditor {nodes} {endpointConfig} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `NodeMetadata[]` | — | Node type definitions |
| `endpointConfig` | `EndpointConfig` | — | API configuration |
| `height` | `string \| number` | — | Canvas height |
| `width` | `string \| number` | — | Canvas width |
| `readOnly` | `boolean` | `false` | Disable editing |
| `lockWorkflow` | `boolean` | `false` | Prevent structural changes |
| `nodeStatuses` | `Record<string, string>` | — | Execution status overlay |
| `pipelineId` | `string` | — | Pipeline ID for status |

### `NodeSidebar`

Left sidebar displaying available node types organized by category.

```svelte
<script>
  import { NodeSidebar } from '@flowdrop/flowdrop/editor';
</script>

<NodeSidebar {nodes} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `NodeMetadata[]` | `[]` | Node types to display |
| `selectedCategory` | `NodeCategory` | — | Pre-select a category filter |
| `activeFormat` | `WorkflowFormat` | — | Filter nodes by workflow format compatibility |

### `UniversalNode`

Dynamic node wrapper that resolves and renders the correct node component based on type. Automatically injects `NodeStatusOverlay`. Used internally by the editor.

## Node Components

All node components accept `NodeComponentProps` from the registry:

| Component | Type | Description |
|-----------|------|-------------|
| `WorkflowNodeComponent` | `workflowNode` | Full-featured node with input/output port lists |
| `SimpleNode` | `simple` | Compact layout with header, icon, description |
| `SquareNode` | `square` | Minimal icon-only square design |
| `ToolNode` | `tool` | Agent tool node with badge indicator |
| `GatewayNode` | `gateway` | Conditional branching with multiple output ports |
| `TerminalNode` | `terminal` | Circular start/end node |
| `NotesNode` | `note` | Sticky note with markdown content |

See [Node Types](/guides/node-types/) for visual examples.

## Form Components

### `SchemaForm`

Renders a form from JSON Schema definition.

```svelte
<script>
  import { SchemaForm } from '@flowdrop/flowdrop/form';
</script>

<SchemaForm
  schema={jsonSchema}
  values={formValues}
  onChange={(values) => { /* handle change */ }}
/>
```

### `ConfigForm`

Configuration form with support for dynamic schemas, template variables, and external edit links.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `node` | `WorkflowNode` | — | Node to configure (derives schema/values) |
| `schema` | `ConfigSchema` | — | Direct JSON Schema (alternative to `node`) |
| `uiSchema` | `UISchemaElement` | — | Layout definition for the form |
| `values` | `Record<string, unknown>` | — | Configuration values |
| `showUIExtensions` | `boolean` | `false` | Show UI extension fields |
| `workflowId` | `string` | — | For dynamic schema and variable API requests |
| `workflowNodes` | `WorkflowNode[]` | — | All nodes (for template variable resolution) |
| `workflowEdges` | `WorkflowEdge[]` | — | All edges (for template variable resolution) |
| `authProvider` | `AuthProvider` | — | Auth for API requests |
| `onChange` | `function` | — | Called on any field change |
| `onSave` | `function` | — | Called when form is saved |
| `onCancel` | `function` | — | Called when form is cancelled |

### `ConfigPanel`

Generic panel wrapper for displaying details and a configuration form.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Panel title |
| `id` | `string` | — | Entity identifier |
| `description` | `string` | — | Description text |
| `details` | `DetailItem[]` | — | Key-value detail rows |
| `configTitle` | `string` | — | Config section title |
| `onClose` | `function` | — | Close callback |
| `children` | `Snippet` | — | Slot for form content |

### Field Components

| Component | Schema Match | Description |
|-----------|-------------|-------------|
| `FormTextField` | `type: "string"` | Text input |
| `FormTextarea` | `format: "multiline"` | Multi-line text |
| `FormNumberField` | `type: "number"` / `"integer"` | Number input |
| `FormToggle` | `type: "boolean"` | Toggle switch |
| `FormSelect` | `enum` or `oneOf` | Select dropdown |
| `FormCheckboxGroup` | `enum` + `multiple: true` | Checkbox group |
| `FormRangeField` | `format: "range"` | Range slider |
| `FormArray` | `type: "array"` | Dynamic array editor |
| `FormCodeEditor` | `format: "json"` | JSON/code editor (requires `form/code`) |
| `FormTemplateEditor` | `format: "template"` | Template editor with variables (requires `form/code`) |
| `FormMarkdownEditor` | `format: "markdown"` | Markdown editor (requires `form/markdown`) |

## Display Components

### `MarkdownDisplay`

Renders markdown content using the `marked` library.

```svelte
<script>
  import { MarkdownDisplay } from '@flowdrop/flowdrop/display';
</script>

<MarkdownDisplay content="**Hello** world" />
```

## Playground Components

### `Playground`

Full interactive playground with chat interface and session management.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `workflowId` | `string` | — | Workflow to test (required) |
| `workflow` | `Workflow` | — | Pre-loaded workflow data |
| `mode` | `PlaygroundMode` | `'standalone'` | `'standalone'` or `'embedded'` |
| `initialSessionId` | `string` | — | Resume a previous session |
| `endpointConfig` | `EndpointConfig` | — | API configuration |
| `config` | `PlaygroundConfig` | — | Playground options |
| `onClose` | `function` | — | Close callback (for embedded mode) |

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
  import { ThemeToggle } from '@flowdrop/flowdrop/settings';
</script>

<ThemeToggle />
```

### `SettingsPanel` / `SettingsModal`

UI for managing all user settings categories (theme, editor, UI, behavior, API).

## Status Components

| Component | Description |
|-----------|-------------|
| `NodeStatusOverlay` | Displays execution status on nodes (pending, running, completed, error) |
| `StatusIcon` | Color-coded status icon |
| `PipelineStatus` | Full pipeline execution view with logs sidebar |

## Component Hierarchy

```
App
├── Navbar (Logo, workflow name, save/export, custom actions)
├── NodeSidebar (search, category groups, draggable node cards)
├── WorkflowEditor (SvelteFlow canvas)
│   └── UniversalNode
│       ├── NodeStatusOverlay
│       └── [Node Component] (WorkflowNode, SimpleNode, etc.)
└── ConfigSidebar
    └── ConfigForm (JSON Schema form with template variables)
```
