---
title: Glossary
description: Definitions of key terms used throughout FlowDrop documentation.
---

**Agent Spec**
An open standard for defining AI agent workflows ([oracle/agent-spec](https://github.com/oracle/agent-spec)). FlowDrop can import and export this format via the `AgentSpecAdapter`.

**Branch**
A conditional output path on a [Gateway](#gateway) node. Each branch has a label and condition that determines which downstream path to follow.

**Category**
A grouping for node types in the sidebar (e.g., `inputs`, `models`, `processing`, `logic`). Categories have an icon, color, and display order.

**ConfigSchema**
A JSON Schema object (`{ type: 'object', properties: {...} }`) that defines what configuration fields a node has. FlowDrop renders this as an editable form. — see [Configuration Schema](/guides/config-schema/)

**ConfigValues**
The actual key-value pairs set by a user for a node's configuration. Stored in `node.data.config`.

**Data Type**
A type identifier for a port (e.g., `string`, `json`, `trigger`, `file`). FlowDrop uses data types to enforce type-safe connections between ports.

**Draft**
An auto-saved copy of the current workflow stored in `localStorage`. Drafts prevent data loss when the browser closes unexpectedly.

**Dynamic Port**
A port created at runtime by the user (not defined in node metadata). Used for nodes that accept a variable number of inputs or outputs.

**Dynamic Schema**
A `configSchema` fetched from an API endpoint at runtime instead of being defined statically in node metadata. Allows config forms to change based on context. — see [Configuration Schema](/guides/config-schema/)

**Edge**
A connection between two nodes. Edges have a source node/port and target node/port, and are categorized as `data`, `trigger`, `tool`, or `loopback`.

**Edge Category**
The semantic type of an edge: `data` (standard flow), `trigger` (control flow), `tool` (agent tool invocation), or `loopback` (feedback loop).

**Endpoint Config**
An object mapping FlowDrop's API operations to your backend URLs. Created with `createEndpointConfig('/api/flowdrop')`. — see [Mount API](/reference/mount-api/)

**Gateway**
A node type (`gateway`) used for conditional branching. It has multiple output ports (branches), each with a condition that routes execution. — see [Conditional Branching](/recipes/conditional-branching/)

**Handle ID**
The internal identifier for a port connection point, formatted as `{nodeId}-{direction}-{portId}` (e.g., `node-1-output-result`).

**Interrupt**
A human-in-the-loop event where workflow execution pauses to request user input. Types: `confirmation`, `choice`, `text_input`, `form`, `review`. — see [Human-in-the-Loop](/guides/interrupts/)

**Mount API**
Functions (`mountFlowDropApp`, `mountWorkflowEditor`, `mountPlayground`) that embed FlowDrop into any HTML container element. — see [Mount API Reference](/reference/mount-api/)

**Namespace**
A prefix for custom node types to avoid naming collisions (e.g., `mycompany:special-node`). Created with `createNamespacedType()`.

**Node**
A single step in a workflow. Each node has a type, position, metadata, ports, and configuration.

**NodeMetadata**
The definition of a node type — its name, description, icon, category, ports, and config schema. Served by your backend at `GET /nodes`.

**Node Type**
The visual representation of a node: `workflowNode` (full-featured), `simple` (compact), `square` (icon only), `tool`, `gateway`, `terminal`, `idea`, or `note`.

**Plugin**
A package of custom node types registered together via `registerFlowDropPlugin()`. Plugins have a namespace and can define multiple node components. — see [Custom Nodes](/guides/custom-nodes/)

**Playground**
An interactive testing interface where users can execute workflows, send messages, and see results in a chat-like UI.

**Port**
A typed connection point on a node. Input ports receive data; output ports send data. Each port has a data type that determines compatibility.

**Port Config**
The global configuration of available data types and compatibility rules. Served by your backend at `GET /port-config`.

**Registry**
A singleton that stores custom node components (`nodeComponentRegistry`) or custom form fields (`fieldComponentRegistry`). — see [Custom Nodes](/guides/custom-nodes/)

**Session**
A playground execution session. Each session has messages, status, and can be resumed.

**Store**
A Svelte 5 rune-based reactive state container. FlowDrop has stores for workflow, history, settings, playground, interrupts, and categories.

**Template Variable**
A placeholder in the form `{{ variable.path }}` that resolves to data from upstream nodes. Used in template editor fields. — see [Template Variables](/guides/advanced/template-variables/)

**UISchema**
A layout definition (`VerticalLayout`, `Group`, `Control`) that controls how config schema fields are arranged in the form UI. — see [Configuration Schema](/guides/config-schema/)

**Workflow**
A directed graph of nodes connected by edges. The top-level data structure containing `id`, `name`, `nodes`, `edges`, and `metadata`.

**WorkflowAdapter**
A programmatic API for creating and manipulating workflows in code, without the visual editor.
