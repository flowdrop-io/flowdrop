---
title: Core Types
description: Key TypeScript types exported by FlowDrop.
---

All types are exported from `@flowdrop/flowdrop/core` (or the main `@flowdrop/flowdrop` entry point).

## Workflow

```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, any>;
  format?: WorkflowFormat;
}
```

## WorkflowNode

```typescript
interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: Record<string, unknown>;
    metadata?: NodeMetadata;
    branches?: Branch[];
  };
}
```

## WorkflowEdge

```typescript
interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  data?: {
    category?: EdgeCategory;
  };
}
```

## NodeMetadata

```typescript
interface NodeMetadata {
  id: string;
  name: string;
  description?: string;
  type: string;
  supportedTypes?: string[];
  category?: string;
  version?: string;
  icon?: string;
  color?: string;
  badge?: string;
  inputs?: NodePort[];
  outputs?: NodePort[];
  config?: Record<string, unknown>;
  configSchema?: ConfigSchema;
  uiSchema?: UISchemaElement;
  configEdit?: ConfigEditOptions;
  tags?: string[];
  extensions?: NodeExtensions;
}
```

## NodePort

```typescript
interface NodePort {
  id: string;
  name: string;
  type: 'input' | 'output' | 'metadata';
  dataType: string;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
  schema?: OutputSchema | InputSchema;
}
```

## ConfigSchema

Standard JSON Schema with FlowDrop extensions:

```typescript
interface ConfigSchema {
  type: 'object';
  properties?: Record<string, FieldSchema>;
  required?: string[];
}
```

## FieldSchema

```typescript
interface FieldSchema {
  type: FieldType | string;
  title?: string;
  description?: string;
  default?: unknown;
  format?: string;
  enum?: unknown[];
  oneOf?: Array<{ const: any; title: string }>;
  multiple?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  readOnly?: boolean;
  items?: FieldSchema;
  properties?: Record<string, FieldSchema>;
  autocomplete?: AutocompleteConfig;
  variables?: TemplateVariablesConfig;
  'x-display-order'?: number;
  [key: string]: unknown;
}
```

## UISchema Types

```typescript
type UISchemaElement = UISchemaControl | UISchemaVerticalLayout | UISchemaGroup;

interface UISchemaControl {
  type: 'Control';
  scope: string;  // JSON Pointer: "#/properties/fieldName"
  label?: string;
  hidden?: boolean;
}

interface UISchemaVerticalLayout {
  type: 'VerticalLayout';
  elements: UISchemaElement[];
}

interface UISchemaGroup {
  type: 'Group';
  label?: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  elements: UISchemaElement[];
}
```

## Authentication

```typescript
interface AuthProvider {
  getHeaders(): Promise<Record<string, string>>;
  onUnauthorized?(): Promise<void>;
}

class StaticAuthProvider implements AuthProvider {
  constructor(token: string);
}

class CallbackAuthProvider implements AuthProvider {
  constructor(options: {
    getToken: () => string | Promise<string>;
    onUnauthorized?: () => void | Promise<void>;
  });
}

class NoAuthProvider implements AuthProvider {}
```

## EndpointConfig

```typescript
interface EndpointConfig {
  baseUrl: string;
  endpoints: {
    nodes: { list: string; get: string };
    workflows: {
      list: string;
      get: string;
      create: string;
      update: string;
      execute?: string;
    };
    // ... other endpoint groups
  };
  auth?: { type: 'bearer'; token: string };
}

function createEndpointConfig(
  baseUrlOrConfig: string | Partial<EndpointConfig>
): EndpointConfig;
```

## WorkflowChangeType

```typescript
type WorkflowChangeType =
  | 'node_add'
  | 'node_remove'
  | 'node_move'
  | 'node_config'
  | 'edge_add'
  | 'edge_remove'
  | 'metadata'
  | 'name'
  | 'description';
```

## Event Handlers

All 11 event handlers for lifecycle integration. See [Event System](/guides/advanced/event-system/) for usage examples.

```typescript
interface FlowDropEventHandlers {
  /** Called on any workflow modification */
  onWorkflowChange?: (workflow: Workflow, changeType: WorkflowChangeType) => void;

  /** Called when dirty state changes (saved ↔ unsaved) */
  onDirtyStateChange?: (isDirty: boolean) => void;

  /** Called before save — return false to cancel */
  onBeforeSave?: (workflow: Workflow) => Promise<boolean | void>;

  /** Called after successful save */
  onAfterSave?: (workflow: Workflow) => Promise<void>;

  /** Called when save fails */
  onSaveError?: (error: Error, workflow: Workflow) => Promise<void>;

  /** Called after a workflow is loaded */
  onWorkflowLoad?: (workflow: Workflow) => void;

  /** Called before FlowDrop is destroyed */
  onBeforeUnmount?: (workflow: Workflow, isDirty: boolean) => void;

  /** Called on any API error — return true to suppress default toast */
  onApiError?: (error: Error, operation: string) => boolean | void;

  /** Called when Agent Spec execution starts */
  onAgentSpecExecutionStarted?: (executionId: string) => void;

  /** Called when Agent Spec execution completes */
  onAgentSpecExecutionCompleted?: (executionId: string, results: Record<string, unknown>) => void;

  /** Called when Agent Spec execution fails */
  onAgentSpecExecutionFailed?: (executionId: string, error: Error) => void;

  /** Called when a node's execution status updates during Agent Spec execution */
  onAgentSpecNodeStatusUpdate?: (nodeId: string, status: NodeExecutionInfo) => void;
}
```

## Features

```typescript
interface FlowDropFeatures {
  /** Save drafts to localStorage automatically @default true */
  autoSaveDraft?: boolean;

  /** Auto-save interval in ms @default 30000 */
  autoSaveDraftInterval?: number;

  /** Show toast notifications @default true */
  showToasts?: boolean;
}
```

## Port Configuration

```typescript
interface PortConfig {
  dataTypes: PortDataTypeConfig[];
  compatibilityRules: PortCompatibilityRule[];
  defaultDataType: string;
  version?: string;
}

interface PortDataTypeConfig {
  id: string;
  name: string;
  description?: string;
  color: string;
  category?: string;
  aliases?: string[];
  enabled?: boolean;
}

interface PortCompatibilityRule {
  from: string;
  to: string;
  description?: string;
}
```

## Playground Types

```typescript
interface PlaygroundSession {
  id: string;
  name?: string;
  status: PlaygroundSessionStatus;
  created_at: string;
  updated_at: string;
}

interface PlaygroundMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
```

## Interrupt Types

```typescript
interface Interrupt {
  id: string;
  type: InterruptType;
  status: InterruptStatus;
  config: InterruptConfig;
  responseValue?: unknown;
}

type InterruptType = 'confirmation' | 'choice' | 'text_input' | 'form' | 'review';
type InterruptStatus = 'pending' | 'resolved' | 'cancelled' | 'expired';
```
