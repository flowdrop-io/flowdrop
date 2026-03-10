---
title: Common Issues & FAQ
description: Solutions to frequently encountered problems when integrating FlowDrop.
---

## Nodes Don't Appear in the Sidebar

**Symptoms:** The sidebar is empty or shows "No nodes available."

**Causes & fixes:**

1. **Endpoint config is wrong.** Verify your `endpointConfig` base URL is correct and your backend is running:
   ```typescript
   const endpointConfig = createEndpointConfig('http://localhost:3001/api/flowdrop');
   ```
   Open `http://localhost:3001/api/flowdrop/nodes` in your browser — you should see JSON.

2. **CORS is blocking requests.** Check the browser console for CORS errors. Your backend must allow the frontend's origin:
   ```typescript
   app.use(cors({ origin: 'http://localhost:5173' }));
   ```

3. **Node metadata is malformed.** Each node needs at minimum `id`, `name`, and `type`:
   ```json
   { "id": "my-node", "name": "My Node", "type": "simple" }
   ```

4. **Response format is wrong.** FlowDrop expects `{ success: true, data: [...] }`, not a bare array.

## Editor Is Blank (White Screen)

**Symptoms:** The container is mounted but nothing renders.

**Causes & fixes:**

1. **CSS is not imported.** You must import FlowDrop styles:
   ```typescript
   import '@flowdrop/flowdrop/styles';
   ```

2. **Container has no height.** The editor needs a container with explicit dimensions:
   ```css
   #editor { width: 100%; height: 100vh; }
   ```

3. **Mount failed silently.** Wrap in try/catch and check the console:
   ```typescript
   try {
     const app = await mountFlowDropApp(container, options);
   } catch (error) {
     console.error('Mount failed:', error);
   }
   ```

## Connections Won't Snap

**Symptoms:** Dragging from an output port to an input port doesn't create a connection.

**Causes & fixes:**

1. **Port data types are incompatible.** FlowDrop enforces type-safe connections. A `trigger` port cannot connect to a `string` port unless you define a compatibility rule. Check your [port config](/guides/port-system/).

2. **Port IDs are missing.** Both source and target ports must have `id` fields in the node metadata:
   ```json
   {
     "outputs": [{ "id": "output", "name": "Result", "type": "output", "dataType": "string" }]
   }
   ```

3. **No port-config endpoint.** If you don't serve `/port-config`, FlowDrop uses defaults which may not match your data types.

## CodeMirror Fields Don't Render

**Symptoms:** Config fields with `format: "json"` or `format: "template"` show as plain text inputs.

**Fix:** You must explicitly register CodeMirror fields. They're in a separate module to avoid the ~300KB bundle cost:

```typescript
import { registerCodeEditorField } from '@flowdrop/flowdrop/form/code';
registerCodeEditorField();

// For template fields with variable autocomplete:
import { registerTemplateEditorField } from '@flowdrop/flowdrop/form/code';
registerTemplateEditorField();

// For markdown:
import { registerMarkdownEditorField } from '@flowdrop/flowdrop/form/markdown';
registerMarkdownEditorField();
```

Register these **before** mounting the editor.

## Multiple Editors Conflict

**Symptoms:** Two FlowDrop instances share state, or the second instance breaks the first.

**Cause:** FlowDrop uses module-level singleton stores. Only **one editor** can exist per page.

**Workaround:** If you need multiple editors, use iframes to isolate each instance in its own JavaScript context.

## Save Fails Silently

**Symptoms:** Clicking Save does nothing visible, or changes are lost.

**Causes & fixes:**

1. **No save endpoint.** FlowDrop needs `POST /workflows` (create) and `PUT /workflows/:id` (update) endpoints.

2. **No error handler.** Add `onSaveError` and `onApiError` to see what's happening:
   ```typescript
   eventHandlers: {
     onSaveError: async (error, workflow) => {
       console.error('Save failed:', error);
     },
     onApiError: (error, operation) => {
       console.error(`API error during ${operation}:`, error);
     }
   }
   ```

3. **Response format is wrong.** The save endpoint must return the saved workflow with an `id` field. If creating a new workflow, the response must include the server-generated ID.

## Draft Recovery Not Working

**Symptoms:** Auto-saved drafts don't appear when reopening the editor.

**Causes & fixes:**

1. **Feature is disabled.** Auto-save drafts are enabled by default, but verify:
   ```typescript
   features: { autoSaveDraft: true, autoSaveDraftInterval: 30000 }
   ```

2. **localStorage is full.** Browsers limit localStorage to ~5-10MB. Check `localStorage` usage in DevTools.

3. **Different storage key.** Drafts are keyed by workflow ID. If the workflow ID changes between sessions, the draft won't match.

## Agent Spec Import Drops Data

**Symptoms:** Importing an Agent Spec document loses some nodes or connections.

**Cause:** Not all Agent Spec features have FlowDrop equivalents. The adapter does best-effort conversion.

**Fix:** Check the console for warnings during import. Review the `AgentSpecAdapter` conversion for specific limitations.

## "Cannot read properties of undefined"

**Symptoms:** Runtime error in the console when interacting with nodes.

**Common cause:** Node metadata is missing required fields. Ensure your nodes have:

```json
{
  "id": "unique-id",
  "name": "Display Name",
  "type": "simple",
  "inputs": [],
  "outputs": []
}
```

The `inputs` and `outputs` arrays must always be present, even if empty.

## Toast Notifications Are Annoying

**Fix:** Disable them via features:

```typescript
features: { showToasts: false }
```

Or handle errors yourself via `onApiError` (return `true` to suppress the toast for that error).

## FAQ

### Can I use FlowDrop without a backend?

Yes, for prototyping. Pass `nodes` directly and omit `endpointConfig`:

```typescript
const app = await mountFlowDropApp(container, {
  nodes: [{ id: 'my-node', name: 'My Node', type: 'simple', inputs: [], outputs: [] }]
});
```

Saving won't work without a backend, but you can use `app.getWorkflow()` to extract the JSON.

### Can I have multiple editors on one page?

No. FlowDrop uses singleton stores. Use iframes for multiple instances.

### What browsers are supported?

FlowDrop targets modern evergreen browsers (Chrome, Firefox, Safari, Edge). It requires ES2020+ support.

### How do I update the node palette after mounting?

Currently, FlowDrop fetches nodes on mount. To refresh the palette, destroy and remount the editor.

### Can I use FlowDrop with React/Vue/Angular?

Yes, via the [Mount API](/reference/mount-api/). FlowDrop mounts into any HTML container element, regardless of your framework.

## Getting Help

If none of the above resolves your issue:

- **[GitHub Issues](https://github.com/flowdrop-io/flowdrop/issues)** — Bug reports and reproducible problems
- **[GitHub Discussions](https://github.com/flowdrop-io/flowdrop/discussions)** — Questions, ideas, and community support

When reporting a bug, include:
1. FlowDrop version (`npm list @flowdrop/flowdrop`)
2. Browser and version
3. The error message from the browser console
4. Minimal reproduction: your node metadata JSON and mount options
