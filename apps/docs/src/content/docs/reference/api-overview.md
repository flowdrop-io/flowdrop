---
title: API Overview
description: Module structure and exports of the FlowDrop library.
---

FlowDrop is organized as tree-shakable sub-modules. Import only what you need to minimize bundle size.

## Module Structure

### `@flowdrop/flowdrop/core`

Types and utilities with zero heavy dependencies. Safe to import anywhere without pulling in Svelte components or CodeMirror.

**Key exports:**
- Core types: `Workflow`, `WorkflowNode`, `WorkflowEdge`, `NodeMetadata`, `NodePort`
- Node types: `BuiltinNodeType`, `NodeCategory`
- Auth providers: `AuthProvider`, `StaticAuthProvider`, `CallbackAuthProvider`, `NoAuthProvider`
- Configuration: `FlowDropConfig`, `EndpointConfig`, `createEndpointConfig`
- Event handlers: `FlowDropEventHandlers`, `FlowDropFeatures`
- Port system: `PortConfig`, `PortDataTypeConfig`, `PortCompatibilityRule`
- UI Schema: `UISchemaElement`, `UISchemaControl`, `UISchemaGroup`
- Form types: `FieldSchema`, `FieldType`, `SchemaFormProps`
- Agent Spec types and adapters
- Theme: `theme`, `resolvedTheme`, `setTheme`, `toggleTheme`
- Utilities: colors, icons, node types, connections, cycle detection

### `@flowdrop/flowdrop/editor`

Visual workflow editor with `@xyflow/svelte`.

**Key exports:**
- Components: `WorkflowEditor`, `App`, `NodeSidebar`, `ConfigForm`, `ConfigPanel`
- Node components: `WorkflowNodeComponent`, `SimpleNode`, `ToolNode`, `NotesNode`, `GatewayNode`, `SquareNode`, `TerminalNode`, `UniversalNode`
- Mount functions: `mountFlowDropApp`, `mountWorkflowEditor`, `unmountFlowDropApp`
- Helpers: `WorkflowOperationsHelper`, `NodeOperationsHelper`, `EdgeStylingHelper`, `ConfigurationHelper`
- Stores: workflow store, port coordinates, history
- Services: API client, toast service, node execution
- Registration: `registerCustomNode`, `registerFlowDropPlugin`, `createPlugin`

### `@flowdrop/flowdrop/form`

Dynamic form generation from JSON Schema.

**Key exports:**
- Components: `SchemaForm`, `FormField`, `FormFieldWrapper`
- Field types: `FormTextField`, `FormTextarea`, `FormNumberField`, `FormToggle`, `FormSelect`, `FormArray`, `FormCheckboxGroup`, `FormRangeField`
- UISchema: `FormFieldset`, `FormUISchemaRenderer`
- Registry: `registerFieldComponent`, `fieldComponentRegistry`, matchers

### `@flowdrop/flowdrop/form/code`

Code and JSON editor support (adds ~300KB, requires CodeMirror).

**Key exports:**
- Components: `FormCodeEditor`, `FormTemplateEditor`
- Registration: `registerCodeEditorField()`, `registerTemplateEditorField()`

### `@flowdrop/flowdrop/form/markdown`

Markdown editor support (requires CodeMirror + `@codemirror/lang-markdown`).

**Key exports:**
- Component: `FormMarkdownEditor`
- Registration: `registerMarkdownEditorField()`

### `@flowdrop/flowdrop/display`

Content rendering components.

**Key exports:**
- `MarkdownDisplay` — renders markdown content using the `marked` library

### `@flowdrop/flowdrop/playground`

Interactive workflow testing and human-in-the-loop.

**Key exports:**
- Components: `Playground`, `PlaygroundModal`, `ChatPanel`, `SessionManager`, `ExecutionLogs`, `MessageBubble`
- Interrupts: `InterruptBubble`, `ConfirmationPrompt`, `ChoicePrompt`, `TextInputPrompt`, `FormPrompt`, `ReviewPrompt`
- Services: `PlaygroundService`, `InterruptService`
- Store: playground state, interrupt management
- Mount functions: `mountPlayground`, `unmountPlayground`
- Types: `PlaygroundSession`, `PlaygroundMessage`, `Interrupt`, `InterruptType`

### `@flowdrop/flowdrop/settings`

User preferences with hybrid persistence.

**Key exports:**
- Components: `ThemeToggle`, `SettingsPanel`, `SettingsModal`
- Store: settings state (theme, editor, UI, behavior, API categories)
- Types: `FlowDropSettings`, `ThemeSettings`, `EditorSettings`, `UISettings`

### `@flowdrop/flowdrop/styles`

CSS styling with design tokens.

**Exports:** CSS files with `--fd-*` custom properties for theming.

### `@flowdrop/flowdrop`

Full bundle — re-exports from all sub-modules for convenience. Use this when bundle size is not a concern.

## REST API

FlowDrop expects a backend implementing these endpoint groups. Not all are required — see [Backend Implementation](/guides/integration/backend-implementation/) for which tier each belongs to.

### Required (Tier 1 — Minimum Viable Backend)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check (called on mount) |
| `GET` | `/nodes` | List available node types |
| `GET` | `/workflows/:id` | Load a workflow |
| `POST` | `/workflows` | Create a new workflow |
| `PUT` | `/workflows/:id` | Update a workflow |

### Recommended (Tier 2 — Full Editor)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/categories` | Category definitions for sidebar groups |
| `GET` | `/port-config` | Port data types and compatibility rules |
| `GET` | `/nodes/:id` | Get single node metadata |
| `GET` | `/workflows` | List all workflows |
| `DELETE` | `/workflows/:id` | Delete a workflow |
| `GET` | `/system/config` | Runtime configuration |

### Optional (Tier 3 — Advanced Features)

| Group | Paths | Purpose |
|-------|-------|---------|
| Execution | `/workflows/{id}/execute`, `/executions/{id}/status` | Workflow execution |
| Pipelines | `/pipeline/{id}` | Pipeline status & logs |
| Playground | `/playground/sessions`, `/playground/sessions/{id}/messages` | Interactive testing |
| Interrupts | `/interrupts/{id}`, `/interrupts/{id}/resolve` | Human-in-the-loop |
| Settings | `/settings` | User preferences |
| Agent Spec | `/agentspec` | Agent Spec import/export |

See the [OpenAPI specification](https://api.flowdrop.io/) for full endpoint documentation, or follow the [Backend: Express.js](/recipes/backend-express/) recipe to get started quickly.
