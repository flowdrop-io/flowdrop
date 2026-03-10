---
title: Error Reference
description: Mount API exceptions, API error handling, HTTP status codes, and Agent Spec validation errors in FlowDrop.
---

This page covers all error conditions you may encounter when integrating FlowDrop: mount exceptions, API errors during operation, and Agent Spec validation failures.

## Mount API Exceptions

`mountFlowDropApp()` throws synchronously if the mount cannot proceed.

| Error message | Cause | Fix |
|---------------|-------|-----|
| `Container element not found` | The selector or element passed to `container` does not exist in the DOM | Ensure the container element exists before calling `mountFlowDropApp()` |
| `Container has no dimensions` | The container element has zero width or height | Apply `width` and `height` (or `min-height`) to the container via CSS before mounting |
| `FlowDrop CSS not imported` | The base styles from `@flowdrop/flowdrop/styles` were not loaded | Import `@flowdrop/flowdrop/styles` before mounting |
| `Cannot mount in server-side context` | `mountFlowDropApp()` was called during SSR (no `window` object) | Guard the call with `if (typeof window !== 'undefined')` — see [Framework Integration](/guides/integration/) |

```javascript
// Safe mount pattern
if (typeof window !== 'undefined') {
  const app = mountFlowDropApp({
    container: document.getElementById('editor'),
    // ...
  });
}
```

## API Error Handling

FlowDrop calls your REST API during normal operation. Use the `onApiError` event handler to intercept these errors.

```javascript
mountFlowDropApp({
  container: document.getElementById('editor'),
  endpoints: createEndpointConfig('/api/flowdrop'),
  onApiError: (error) => {
    // error.status    — HTTP status code (0 for network errors)
    // error.operation — what FlowDrop was doing when the error occurred
    // error.message   — error description
    // error.response  — raw Response object (if available)

    if (error.status === 401) {
      // Redirect to login
      window.location.href = '/login';
      return true; // return true to suppress the default toast notification
    }

    // Return false (or nothing) to show the default error toast
    return false;
  }
});
```

### HTTP Status Codes

| Status | Cause | Recommended action |
|--------|-------|--------------------|
| `0` | Network error — no response received | Check server is running; show connectivity warning |
| `401` | Unauthorized — missing or expired credentials | Redirect to login or refresh token |
| `403` | Forbidden — authenticated but not allowed | Show permission error; do not redirect |
| `404` | Endpoint not found — wrong URL configured | Verify your `endpoints` configuration |
| `422` | Validation error — malformed workflow JSON | Log `error.response` body for details |
| `500` | Server error | Log and surface to user; offer retry |

### `operation` Values

The `error.operation` field tells you what FlowDrop was doing when the error occurred:

| Value | Trigger |
|-------|---------|
| `loadNodes` | Initial `GET /nodes` request on mount |
| `loadWorkflow` | `GET /workflows/:id` on mount |
| `saveWorkflow` | `POST /workflows` or `PUT /workflows/:id` on save |
| `loadPortConfig` | `GET /port-config` for dynamic port compatibility |
| `executeWorkflow` | `POST /execute` (if using the playground) |

## Save Errors

`onSaveError` is a separate handler called when a save operation fails. It receives the workflow object that failed to save, allowing you to recover or retry.

```javascript
mountFlowDropApp({
  container: document.getElementById('editor'),
  onSaveError: async (error, workflow) => {
    console.error('Save failed:', error);
    // workflow is the StandardWorkflow object that failed to persist
    // You can store it locally or retry:
    localStorage.setItem('flowdrop-save-fallback', JSON.stringify(workflow));
  }
});
```

## Agent Spec Validation Errors

When exporting a workflow to Agent Spec format via `WorkflowOperationsHelper.exportAsAgentSpec()`, the result object indicates success or failure:

```javascript
const result = WorkflowOperationsHelper.exportAsAgentSpec(workflow);
// result: { valid: boolean, errors: string[], warnings: string[] }

if (!result.valid) {
  console.error('Export failed:', result.errors);
}
```

### Common validation errors

| Error message | Cause | Fix |
|---------------|-------|-----|
| `Workflow has no nodes` | The workflow is empty | Add at least one node before exporting |
| `Cycle detected` | The workflow graph contains a loop | Remove cyclic connections; Agent Spec requires a DAG |
| `Node type not mappable: <type>` | A custom node type has no Agent Spec equivalent | Map custom types to Agent Spec actions in your export config |
| `Disconnected node: <id>` | A node has no edges | Connect all nodes or remove unused ones |
| `Missing required port: <port>` | A required input port has no incoming edge | Connect the required port before exporting |

Warnings (non-fatal) indicate information that may be lost in the export, such as FlowDrop-specific configuration fields that have no Agent Spec equivalent.
