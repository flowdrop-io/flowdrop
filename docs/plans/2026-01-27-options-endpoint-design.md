# Design: REST Endpoint for Dynamic Enum Options

**Issue:** https://github.com/flowdrop-io/flowdrop/issues/5  
**Date:** 2026-01-27  
**Status:** Approved

## Summary

Add support for fetching enum/select options from a REST endpoint at runtime, without requiring a full dynamic schema. Individual fields in a `configSchema` can specify an `optionsEndpoint` to populate their options dynamically.

## Use Case

An LLM node has an `api_key` field that should show a dropdown of available tenant secrets. The schema is static, but the options need to be fetched at runtime based on the current tenant.

Currently, the only way to achieve this is via `configEdit.dynamicSchema`, which replaces the entire schema. This is overkill when only one field needs dynamic options.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Fetch strategy | Auto-fetch on render | Simplest UX, predictable behavior |
| Static vs fetched options | Fetched replaces static | Clear mental model; static serves as fallback on error |
| Configuration location | Field-level (`optionsEndpoint` on each field) | Consistent with existing `enum`, `options`, `format` patterns |
| Fetch timing | Pre-fetch in ConfigForm before rendering | Keeps FormField synchronous and simple |

## Data Model

### New Type: `OptionsEndpoint`

Location: `src/lib/types/index.ts`

```typescript
export interface OptionsEndpoint {
  /** URL to fetch options from. Supports {nodeTypeId}, {instanceId}, {workflowId} variables */
  url: string;
  /** HTTP method (default: GET) */
  method?: HttpMethod;
  /** Custom headers for the request */
  headers?: Record<string, string>;
  /** Maps URL variables to node context paths */
  parameterMapping?: Record<string, string>;
  /** JSON path to extract option value from each item (default: "value") */
  valuePath?: string;
  /** JSON path to extract option label from each item (default: "label") */
  labelPath?: string;
  /** Cache TTL in milliseconds (default: 300000 = 5 minutes) */
  cacheTtl?: number;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}
```

### Extended `FieldSchema`

Location: `src/lib/components/form/types.ts`

```typescript
export interface FieldSchema {
  // ... existing properties ...
  
  /** REST endpoint to fetch options dynamically at runtime */
  optionsEndpoint?: OptionsEndpoint;
}
```

### Usage Example

```json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "api_key": {
        "type": "string",
        "title": "API Key",
        "optionsEndpoint": {
          "url": "/api/flowdrop/secrets",
          "valuePath": "name",
          "labelPath": "label"
        }
      },
      "model": {
        "type": "string",
        "title": "Model",
        "enum": ["gpt-4o", "gpt-4", "gpt-3.5-turbo"]
      }
    }
  }
}
```

## Service Layer

### New File: `src/lib/services/optionsService.ts`

Follows the pattern established by `dynamicSchemaService.ts`.

```typescript
import type { FieldOption } from '../components/form/types.js';
import type { OptionsEndpoint, ConfigSchema, WorkflowNode } from '../types/index.js';

interface OptionsResult {
  success: boolean;
  options?: FieldOption[];
  error?: string;
  fromCache?: boolean;
}

interface AllOptionsResult {
  options: Map<string, FieldOption[]>;
  errors: Map<string, string>;
}

// Fetch options for a single field
export async function fetchFieldOptions(
  endpoint: OptionsEndpoint,
  node: WorkflowNode,
  workflowId?: string
): Promise<OptionsResult>;

// Fetch options for all fields with optionsEndpoint in a schema (parallel)
export async function fetchAllFieldOptions(
  schema: ConfigSchema,
  node: WorkflowNode,
  workflowId?: string
): Promise<AllOptionsResult>;

// Check if schema has any fields with optionsEndpoint
export function hasFieldsWithOptionsEndpoint(schema: ConfigSchema): boolean;

// Merge fetched options into schema (returns new schema)
export function mergeOptionsIntoSchema(
  schema: ConfigSchema,
  options: Map<string, FieldOption[]>
): ConfigSchema;

// Cache management
export function invalidateOptionsCache(pattern?: string): void;
```

### Key Behaviors

1. **URL Resolution**: Reuse `resolveTemplate()` from shared utils for `{nodeTypeId}`, `{instanceId}`, `{workflowId}` variables
2. **Caching**: Cache by resolved URL with configurable TTL (default 5 minutes)
3. **Response Normalization**: Extract values using `valuePath`/`labelPath`, handle both array and wrapped responses
4. **Parallel Fetching**: `fetchAllFieldOptions` fetches all endpoints concurrently

### Response Format Support

The endpoint can return:

**Direct array:**
```json
[
  { "name": "OPENAI_KEY", "label": "OpenAI Production" },
  { "name": "ANTHROPIC_KEY", "label": "Anthropic Claude" }
]
```

**Wrapped in object:**
```json
{
  "options": [
    { "value": "OPENAI_KEY", "label": "OpenAI Production" }
  ]
}
```

With `valuePath: "name"` and `labelPath: "label"`, the service normalizes to:
```typescript
[
  { value: "OPENAI_KEY", label: "OpenAI Production" },
  { value: "ANTHROPIC_KEY", label: "Anthropic Claude" }
]
```

## Integration: ConfigForm.svelte

### New State

```typescript
let optionsLoading = $state(false);
let optionsErrors = $state<Map<string, string>>(new Map());
let fetchedOptions = $state<Map<string, FieldOption[]>>(new Map());
```

### Loading Flow

```typescript
async function loadFieldOptions(schema: ConfigSchema): Promise<void> {
  if (!node) return;
  
  optionsLoading = true;
  optionsErrors = new Map();
  
  try {
    const results = await fetchAllFieldOptions(schema, node, workflowId);
    fetchedOptions = results.options;
    optionsErrors = results.errors;
  } finally {
    optionsLoading = false;
  }
}

// Trigger loading when schema is ready
$effect(() => {
  const schema = effectiveSchema;
  if (schema && hasFieldsWithOptionsEndpoint(schema)) {
    loadFieldOptions(schema);
  }
});
```

### Schema Enrichment

```typescript
const enrichedSchema = $derived.by(() => {
  if (!effectiveSchema || fetchedOptions.size === 0) return effectiveSchema;
  return mergeOptionsIntoSchema(effectiveSchema, fetchedOptions);
});
```

### Data Flow

```
Schema ready 
  → scan for optionsEndpoint fields 
  → fetch all in parallel 
  → merge into schema 
  → render form with populated options
```

## Shared Utilities

### New File: `src/lib/utils/templateResolver.ts`

Extract from `dynamicSchemaService.ts` for reuse:

```typescript
export interface NodeContext {
  id: string;
  type: string;
  metadata: WorkflowNode['data']['metadata'];
  config: Record<string, unknown>;
  extensions?: WorkflowNode['data']['extensions'];
  workflowId?: string;
}

export function resolveVariablePath(context: NodeContext, path: string): string | undefined;

export function resolveTemplate(
  template: string,
  parameterMapping: Record<string, string> | undefined,
  context: NodeContext
): string;

export function buildNodeContext(node: WorkflowNode, workflowId?: string): NodeContext;
```

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/lib/services/optionsService.ts` | Options fetching, caching, response normalization |
| `src/lib/utils/templateResolver.ts` | Shared URL template resolution utilities |
| `tests/unit/services/optionsService.test.ts` | Unit tests for options service |
| `tests/integration/optionsEndpoint.test.ts` | Integration test with mock API |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/types/index.ts` | Add `OptionsEndpoint` interface |
| `src/lib/components/form/types.ts` | Add `optionsEndpoint` to `FieldSchema` |
| `src/lib/components/ConfigForm.svelte` | Add options loading, schema enrichment, loading/error UI |
| `src/lib/services/dynamicSchemaService.ts` | Import shared utils from `templateResolver.ts` |
| `src/lib/core/index.ts` | Export `OptionsEndpoint` type |
| `api/components/schemas/config.yaml` | Add `optionsEndpoint` to OpenAPI spec |

## UI Behavior

1. **Loading**: Show spinner/skeleton in the form while options are being fetched
2. **Success**: Populate select fields with fetched options
3. **Partial Failure**: Show per-field error message if specific endpoint fails; other fields still work
4. **Complete Failure**: Fall back to static `enum`/`options` if defined, otherwise show error

## Out of Scope

- Lazy loading on field focus (decided: auto-fetch on render)
- Merging fetched with static options (decided: fetched replaces static)
- Node-level optionsEndpoints configuration (decided: field-level only)
- Refresh button per field (can be added later if needed)

## Testing Strategy

1. **Unit tests** for `optionsService.ts`:
   - URL template resolution
   - Response normalization with various `valuePath`/`labelPath` combinations
   - Cache hit/miss/expiry
   - Error handling (timeout, HTTP errors, malformed response)

2. **Integration tests**:
   - Mock API with MSW
   - ConfigForm renders with fetched options
   - Fallback to static options on error
   - Parallel fetching of multiple fields
