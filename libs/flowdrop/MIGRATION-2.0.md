# Migrating to FlowDrop 2.0

2.0's theme is **the explicit-instance era**: every compatibility shim the 1.x
multi-instance refactor and the 1.8 message migration carried is gone. If your
1.x code ran without deprecation warnings in the console, most of this guide
does not apply to you.

## 1. Module-level store APIs are removed (the big one)

All ~95 module-level functions that operated on "the" editor are gone:
`getWorkflowStore()`, `workflowActions`, `historyService`, `getMessages()`,
`playgroundActions`, `getCategories()`, `getHistoryState()`, and the rest of
the get*/set*/actions surface from `@flowdrop/flowdrop/editor` and
`@flowdrop/flowdrop/playground`.

**Replacement:** every mount handle exposes its state container.

```js
// 1.x
import { workflowActions, historyService, getMessages } from '@flowdrop/flowdrop/editor';
const app = await mountFlowDropApp(el, options);
workflowActions.addNode(node);
historyService.undo();
const messages = getMessages();

// 2.0
const app = await mountFlowDropApp(el, options);
app.instance.workflow.actions.addNode(node);
app.instance.history.undo();
const messages = app.instance.playground.messages;
```

Inside Svelte components rendered under `<App>`/`<WorkflowEditor>`, resolve the
owning instance with `getInstance()` (unchanged — including the browser
fallback to the page-default instance for single-editor embeds):

```svelte
<script>
  import { getInstance } from '@flowdrop/flowdrop/editor';
  const fd = getInstance();
  // fd.workflow, fd.history, fd.playground, fd.interrupts, fd.categories, …
</script>
```

For hosts that construct state manually, the store classes are now exported:
`WorkflowStore`, `HistoryStore`, `HistoryService`, `PlaygroundStore`,
`InterruptStore`, `PortCoordinateStore`, plus `createFlowDropInstance()`.

Settings remain page-global by design — `getSettings()` etc. are unchanged.

## 2. localStorage keys are instance-scoped

The page-default instance no longer writes bare keys:

| 1.x                           | 2.0                                   |
| ----------------------------- | ------------------------------------- |
| `flowdrop:draft:<workflowId>` | `flowdrop:draft:default:<workflowId>` |
| `fd-pipeline-panel-open`      | `fd-pipeline-panel-open:default`      |

Existing user data migrates automatically on first read (copy to the scoped
key, remove the legacy key). Only hosts reading these keys directly need to
update. `clearAllDrafts()` still removes everything under `flowdrop:draft:`.

## 3. Removed component props

| Component        | Removed                                                                                          | Use instead                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `SchemaForm`     | `saveLabel`, `cancelLabel`                                                                       | `messages.form.schema.save` / `.cancel`                                                                                            |
| `AIChatPanel`    | `placeholder`                                                                                    | `messages.chat.placeholder`                                                                                                        |
| `ChatPanel`      | `showChatInput`, `showRunButton`                                                                 | `MessageStream` directly, or `ControlPanel` (keeps both flags)                                                                     |
| `ChatPanel`      | `showLogs`                                                                                       | `fd.playground.setShowLogs(...)`                                                                                                   |
| `WorkflowEditor` | `nodes`, `height`, `width`, `isConfigSidebarOpen`, `selectedNodeForConfig`, `closeConfigSidebar` | These never did anything in 1.x. Size via `App`'s `height`/`width` (working since 1.16); node metadata flows through the instance. |

`FormToggle.onLabel`/`offLabel` and `FormArray.addLabel` were _un_-deprecated:
they express per-instance labels the global messages system cannot, and are
now documented overrides.

Removed message keys (only the removed ChatPanel branches read them):
`playground.states.viewOnlyTitle`, `.viewOnlyText`, `.readyTitle`, `.readyText`.

## 4. mountWorkflowEditor option changes

- `workflow` now actually loads the workflow (1.x accepted and ignored it).
- `nodes` is removed (it fed a prop the editor never read). Use
  `mountFlowDropApp` if you need to pre-seed node metadata.

## 5. API access is instance-scoped (`fd.api`)

The module-level API singleton in `services/api.js` is gone:
`setEndpointConfig()`, `getEndpointConfig()`, `nodeApi`, `workflowApi`, and the
`api` aggregate are removed. Each instance now owns an `ApiContext` at
`fd.api`, which holds the endpoint config + auth provider and lazily builds an
`EnhancedFlowDropApiClient`.

```js
// 1.x
import { setEndpointConfig, workflowApi, nodeApi } from '@flowdrop/flowdrop/editor';
setEndpointConfig(createEndpointConfig('/api/flowdrop'));
const nodes = await nodeApi.getNodes();
const wf = await workflowApi.getWorkflow(id);

// 2.0 — mount configures fd.api automatically; inside components resolve it:
import { getInstance } from '@flowdrop/flowdrop/editor';
const fd = getInstance();
const nodes = await fd.api.client.getAvailableNodes();
const wf = await fd.api.client.loadWorkflow(id);
```

`mountFlowDropApp` / `mountPlayground` / `<App>` call `fd.api.configure(config,
authProvider)` for you. Services that previously read the singleton (playground,
interrupt, chat, node-execution, dynamic-schema, variable) now take the endpoint
config as their first argument — pass `fd.api.config`.

### `EndpointConfig.auth` is removed — use an `AuthProvider`

The `auth` block on `EndpointConfig` (and its header-injection branch) is gone.
Authentication is supplied exclusively through an `AuthProvider`, passed to the
mount/`<App>` `authProvider` option (or `fd.api.configure(config, provider)`).
`StaticAuthProvider` covers the former static-token cases one-to-one:

```js
// 1.x
createEndpointConfig('/api/flowdrop', {
  auth: { type: 'bearer', token: TOKEN }
});

// 2.0
import { StaticAuthProvider } from '@flowdrop/flowdrop';
mountFlowDropApp(el, {
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  authProvider: new StaticAuthProvider({ type: 'bearer', token: TOKEN })
});
```

| 1.x `auth`                    | 2.0 `AuthProvider`                                    |
| ----------------------------- | ----------------------------------------------------- |
| `{ type: 'none' }`            | `new NoAuthProvider()` (or omit `authProvider`)       |
| `{ type: 'bearer', token }`   | `new StaticAuthProvider({ type: 'bearer', token })`   |
| `{ type: 'api_key', apiKey }` | `new StaticAuthProvider({ type: 'api_key', apiKey })` |
| `{ type: 'custom', headers }` | `new StaticAuthProvider({ type: 'custom', headers })` |

### Instance-scoped port compatibility

`initializePortCompatibility()`, `getPortCompatibilityChecker()`, and
`isPortCompatibilityInitialized()` are removed. Each instance owns a
`PortCompatibilityChecker` at `fd.portCompatibility`, seeded with
`DEFAULT_PORT_CONFIG` and re-initialized by mount from the backend's port
config. The standalone connection helpers (`validateConnection`,
`getPossibleConnections`, `getConnectionSuggestions`) now take the checker as
their first argument.

## 6. Barrel de-duplication

The editor barrel no longer re-exports playground internals, and the display
barrel no longer re-exports `marked`. Each export keeps a single canonical home.

- **Playground exports** (`Playground`, `PlaygroundModal`, `ChatPanel`,
  `SessionManager`, `InputCollector`, `ExecutionLogs`, `MessageBubble`,
  `PlaygroundService`, `playgroundService`, `PlaygroundStore`) are removed from
  `@flowdrop/flowdrop/editor`. Import them from `@flowdrop/flowdrop/playground`
  instead.

  ```js
  // 1.x
  import { Playground, playgroundService } from '@flowdrop/flowdrop/editor';

  // 2.0
  import { Playground, playgroundService } from '@flowdrop/flowdrop/playground';
  ```

- **`marked`** is no longer re-exported from `@flowdrop/flowdrop/display`. If you
  need `marked` directly, install it as a dependency and import it from the
  package:

  ```js
  // 1.x
  import { marked } from '@flowdrop/flowdrop/display';

  // 2.0 — `npm install marked`
  import { marked } from 'marked';
  ```

## 7. Workflow `metadata` is required and `version` → `schemaVersion`

The workflow document's `metadata` object is now **required** on the `Workflow`
type, and its `version` field has been renamed to `schemaVersion`. The rename
disambiguates the document's _format_ version from any per-workflow revision
number you may track yourself (and from `NodeMetadata.version`, the node-type
version, which is **unchanged**).

```ts
// 1.x
interface Workflow {
  /* … */
  metadata?: {
    version: string; // ambiguous
    createdAt: string;
    updatedAt: string;
    /* … */
  };
}

// 2.0
interface Workflow {
  /* … */
  metadata: {
    schemaVersion: string; // the workflow schema format version
    createdAt: string;
    updatedAt: string;
    /* … */
  };
}
```

### Load-time healing (automatic)

You do **not** need to migrate stored workflow JSON by hand. Every workflow
entry point — `WorkflowStore.initialize` (which backs `mountFlowDropApp`'s
`workflow` option, drag-and-drop file import, and draft load) and
`WorkflowAdapter.importWorkflow` — normalizes metadata on the way in:

- **Missing `metadata`** → populated with required defaults (`schemaVersion`
  from `WORKFLOW_SCHEMA_VERSION`, fresh `createdAt`/`updatedAt`).
- **Legacy `metadata.version`** → copied into `schemaVersion` (when
  `schemaVersion` is absent), then the legacy `version` key is dropped.

Healing is idempotent: re-running it on an already-healed workflow is a no-op
(round-trip stable). This mirrors the localStorage key migration in §2 — the
runtime heals 1.x data on first read so existing documents keep loading.

### What hosts reading workflow JSON need to know

If your application reads or writes FlowDrop workflow JSON directly (outside the
editor), update your code to read `metadata.schemaVersion` instead of
`metadata.version`. Documents still on disk with the old `version` key continue
to load through the editor unchanged, but newly serialized workflows will carry
`schemaVersion`. The Agent Spec export still uses the namespaced
`flowdrop:version` key (its source is now `metadata.schemaVersion`); that
external key name is unchanged.

The JSON Schema published at `@flowdrop/flowdrop/schema` reflects the rename —
`WorkflowMetadata.required` is now `[schemaVersion, createdAt, updatedAt]`.

## 8. Behavioral notes

- `fieldRegistry.register()` warns in dev when overwriting an existing field
  type. Overwriting still works; the warning flags accidents.
- Internal `DEV` gates use `esm-env` instead of `import.meta.env`, so the
  package no longer assumes a Vite host.
