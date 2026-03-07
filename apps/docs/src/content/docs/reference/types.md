---
title: Core Types
description: Key TypeScript types exported by FlowDrop.
---

All types are exported from `@d34dman/flowdrop/core` (or the main `@d34dman/flowdrop` entry point).

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

## Event Handlers

```typescript
interface FlowDropEventHandlers {
  onBeforeSave?: (workflow: Workflow) => Workflow | void;
  onAfterSave?: (workflow: Workflow) => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
  onBeforeUnmount?: (workflow: Workflow, isDirty: boolean) => void;
}
```

## Features

```typescript
interface FlowDropFeatures {
  autoSaveDraft?: boolean;
  autoSaveDraftInterval?: number;
  proximityConnect?: boolean;
  proximityConnectDistance?: number;
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
