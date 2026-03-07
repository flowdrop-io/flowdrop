---
title: API Overview
description: Module structure and exports of the FlowDrop library.
---

FlowDrop is organized as tree-shakable sub-modules. Import only what you need to minimize bundle size.

## Module Structure

### `@d34dman/flowdrop/core`

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

### `@d34dman/flowdrop/editor`

Visual workflow editor with `@xyflow/svelte`.

**Key exports:**
- Components: `WorkflowEditor`, `App`, `NodeSidebar`, `ConfigForm`, `ConfigPanel`
- Node components: `WorkflowNodeComponent`, `SimpleNode`, `ToolNode`, `NotesNode`, `GatewayNode`, `SquareNode`, `TerminalNode`, `UniversalNode`
- Mount functions: `mountFlowDropApp`, `mountWorkflowEditor`, `unmountFlowDropApp`
- Helpers: `WorkflowOperationsHelper`, `NodeOperationsHelper`, `EdgeStylingHelper`, `ConfigurationHelper`
- Stores: workflow store, port coordinates, history
- Services: API client, toast service, node execution
- Registration: `registerCustomNode`, `registerFlowDropPlugin`, `createPlugin`

### `@d34dman/flowdrop/form`

Dynamic form generation from JSON Schema.

**Key exports:**
- Components: `SchemaForm`, `FormField`, `FormFieldWrapper`
- Field types: `FormTextField`, `FormTextarea`, `FormNumberField`, `FormToggle`, `FormSelect`, `FormArray`, `FormCheckboxGroup`, `FormRangeField`
- UISchema: `FormFieldset`, `FormUISchemaRenderer`
- Registry: `registerFieldComponent`, `fieldComponentRegistry`, matchers

### `@d34dman/flowdrop/form/code`

Code and JSON editor support (adds ~300KB, requires CodeMirror).

**Key exports:**
- Components: `FormCodeEditor`, `FormTemplateEditor`
- Registration: `registerCodeEditorField()`, `registerTemplateEditorField()`

### `@d34dman/flowdrop/form/markdown`

Markdown editor support (requires CodeMirror + `@codemirror/lang-markdown`).

**Key exports:**
- Component: `FormMarkdownEditor`
- Registration: `registerMarkdownEditorField()`

### `@d34dman/flowdrop/display`

Content rendering components.

**Key exports:**
- `MarkdownDisplay` — renders markdown content using the `marked` library

### `@d34dman/flowdrop/playground`

Interactive workflow testing and human-in-the-loop.

**Key exports:**
- Components: `Playground`, `PlaygroundModal`, `ChatPanel`, `SessionManager`, `ExecutionLogs`, `MessageBubble`
- Interrupts: `InterruptBubble`, `ConfirmationPrompt`, `ChoicePrompt`, `TextInputPrompt`, `FormPrompt`, `ReviewPrompt`
- Services: `PlaygroundService`, `InterruptService`
- Store: playground state, interrupt management
- Mount functions: `mountPlayground`, `unmountPlayground`
- Types: `PlaygroundSession`, `PlaygroundMessage`, `Interrupt`, `InterruptType`

### `@d34dman/flowdrop/settings`

User preferences with hybrid persistence.

**Key exports:**
- Components: `ThemeToggle`, `SettingsPanel`, `SettingsModal`
- Store: settings state (theme, editor, UI, behavior, API categories)
- Types: `FlowDropSettings`, `ThemeSettings`, `EditorSettings`, `UISettings`

### `@d34dman/flowdrop/styles`

CSS styling with design tokens.

**Exports:** CSS files with `--fd-*` custom properties for theming.

### `@d34dman/flowdrop`

Full bundle — re-exports from all sub-modules for convenience. Use this when bundle size is not a concern.

## REST API

FlowDrop expects a backend implementing these endpoint groups:

| Group | Base Path | Purpose |
|-------|-----------|---------|
| Health | `/health` | Health check |
| System | `/system/config`, `/system/version` | System configuration |
| Nodes | `/nodes` | Node type discovery and metadata |
| Categories | `/categories` | Category definitions |
| Port Config | `/port-config` | Port configuration |
| Workflows | `/workflows` | CRUD operations |
| Execution | `/workflows/{id}/execute` | Workflow execution |
| Pipelines | `/pipeline/{id}` | Pipeline status |
| Playground | `/playground/sessions` | Interactive testing sessions |
| Interrupts | `/interrupts` | Human-in-the-loop management |
| Agent Spec | `/agentspec` | Agent Spec import/export |

See the [OpenAPI specification](https://flowdrop-io.github.io/flowdrop/) for full endpoint documentation.
