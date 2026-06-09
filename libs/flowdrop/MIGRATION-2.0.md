# Migrating to FlowDrop 2.0

2.0's theme is **the explicit-instance era**: every compatibility shim the 1.x
multi-instance refactor and the 1.8 message migration carried is gone. If your
1.x code ran without deprecation warnings in the console, most of this guide
does not apply to you.

The sections are ordered by the shape of the change, from the deepest
architectural moves (instances, the API client, registries) outward to module
layout, data formats, component props, and storage. Each has a 1.x → 2.0 code
example.

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

## 2. API access is instance-scoped (`fd.api`)

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

These services also accept the instance's `AuthProvider` as an **optional
trailing argument** so every request they make is authenticated consistently
with `fd.api.client` (the typed workflow/node API). The built-in components and
mount helpers pass `fd.api.authProvider` for you — no action is needed for the
normal mounted flow. Only direct callers of the service singletons need to
forward it:

```js
import { playgroundService } from '@flowdrop/flowdrop/playground';

// 2.0 — authenticate playground requests by forwarding the provider
await playgroundService.listSessions(fd.api.config, workflowId, undefined, fd.api.authProvider);
await playgroundService.sendMessage(fd.api.config, sessionId, text, undefined, fd.api.authProvider);
```

The settings-sync entry points gained the same optional provider:
`setSettingsEndpointConfig(config, authProvider?)` and
`createSettingsService(config, authProvider?)` — pass an `AuthProvider` if your
backend's preferences endpoint requires auth.

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

`StaticAuthProvider`'s `api_key` type now accepts an optional `apiKeyHeader` to
override the header name (defaults to `X-API-Key`):

```js
new StaticAuthProvider({ type: 'api_key', apiKey: KEY, apiKeyHeader: 'X-Tenant-Key' });
```

### `AuthProvider.isAuthenticated()` is removed

The `isAuthenticated()` method has been dropped from the `AuthProvider`
interface and all built-in providers. It was never consulted by the library —
request authentication is driven entirely by `getAuthHeaders()` and the optional
`onUnauthorized()` / `onForbidden()` hooks. If you implemented a **custom**
`AuthProvider`, you can delete the method; no replacement is needed.

```ts
// 1.x — required
const provider: AuthProvider = {
  getAuthHeaders: async () => ({ Authorization: `Bearer ${token}` }),
  isAuthenticated: () => Boolean(token) // ← remove this
};

// 2.0
const provider: AuthProvider = {
  getAuthHeaders: async () => ({ Authorization: `Bearer ${token}` })
};
```

### Auth refresh (`401`) now applies to every request

Previously only the typed workflow/node API (`fd.api.client`) refreshed and
retried on `401`. The per-instance services (playground, chat, interrupt,
settings, port config, categories) and form autocomplete attached auth headers
but did **not** invoke `onUnauthorized()`. They now all route through one
authenticated-fetch path, so a configured `onUnauthorized()` fires — and the
request retries once with a refreshed token — uniformly across the library.

This is not a source change for consumers, but if your `onUnauthorized()` had
side effects (analytics, redirects) it may now be called from request paths
where it previously was not. Make it idempotent.

### Swap the auth provider at runtime — `fd.api.setAuthProvider()`

The `AuthProvider` is still supplied at mount time, but you no longer have to
remount to change it (e.g. on login/logout). `ApiContext` gained
`setAuthProvider()`, which updates the live client and is picked up by services
on their next request:

```js
import { getInstance } from '@flowdrop/flowdrop/editor';
const fd = getInstance();

// after the user logs in / refreshes their session
fd.api.setAuthProvider(new StaticAuthProvider({ type: 'bearer', token: newToken }));

// on logout
fd.api.setAuthProvider(new NoAuthProvider());
```

### Instance-scoped port compatibility

`initializePortCompatibility()`, `getPortCompatibilityChecker()`, and
`isPortCompatibilityInitialized()` are removed. Each instance owns a
`PortCompatibilityChecker` at `fd.portCompatibility`, seeded with
`DEFAULT_PORT_CONFIG` and re-initialized by mount from the backend's port
config. The standalone connection helpers (`validateConnection`,
`getPossibleConnections`, `getConnectionSuggestions`) now take the checker as
their first argument.

```js
// 1.x
import { initializePortCompatibility, validateConnection } from '@flowdrop/flowdrop/editor';
initializePortCompatibility(portConfig);
const ok = validateConnection(source, target);

// 2.0
import { getInstance } from '@flowdrop/flowdrop/editor';
const fd = getInstance();
const ok = validateConnection(fd.portCompatibility, source, target);
```

## 3. Registries are instance-scoped — importing the editor registers nothing

In 1.x the node, field, and format registries were module singletons, and the
editor barrel ran a side-effecting import that registered every builtin node the
moment you imported it. In 2.0 each registry lives on the instance —
`fd.nodes`, `fd.fields`, `fd.formats` — seeded in the constructor from read-only
builtin definitions. There is no longer any import-time registration, and
`package.json` `sideEffects` is now CSS-only (`["**/*.css"]`).

The module-level registration functions and the singleton registry constants are
removed:

- `registerCustomNode()`, `createFlowDropPlugin()` / `registerFlowDropPlugin()`,
  and `plugin.ts` are gone. Registration is now a registry method:
  `fd.nodes.registerCustom(...)`, `fd.nodes.registerPlugin(...)`,
  `fd.nodes.unregisterPlugin(...)`. `createPlugin().register(fd.nodes)` replaces
  the module plugin functions.
- The exported singleton consts `nodeComponentRegistry`, `fieldComponentRegistry`,
  and `workflowFormatRegistry` are removed. Resolve the instance registry instead.

```js
// 1.x — module singletons + import-time side effects
import { registerCustomNode, fieldComponentRegistry } from '@flowdrop/flowdrop/editor';
registerCustomNode('myapp:color', 'Color Node', ColorNode);
fieldComponentRegistry.register('color', {
  component: MyColorField,
  matcher: (schema) => schema.format === 'color'
});

// 2.0 — register against the instance after mount
import { getInstance } from '@flowdrop/flowdrop/editor';
const fd = getInstance();
fd.nodes.registerCustom('myapp:color', 'Color Node', ColorNode);
fd.fields.register('color', {
  component: MyColorField,
  matcher: (schema) => schema.format === 'color'
});
```

Because registration is now post-mount by construction, late registrations have
to invalidate `$derived` reads that already ran. `BaseRegistry` carries a
`$state` version counter (the `editVersion` pattern) so dependent reads
re-run when you register after the first paint — no host action required.

The heavy form-field installers (`registerCodeEditorField`,
`registerMarkdownEditorField`, and the template field) now take the **target
registry explicitly** and re-check registration after their dynamic import
resolves:

```js
// 1.x
import { registerCodeEditorField } from '@flowdrop/flowdrop/form/code';
registerCodeEditorField();

// 2.0
import { registerCodeEditorField } from '@flowdrop/flowdrop/form/code';
import { getInstance } from '@flowdrop/flowdrop/editor';
registerCodeEditorField(getInstance().fields);
```

Category color/icon helpers likewise take a `CategoriesStore` as an explicit
parameter — the last global-instance fallback in `utils` is gone.

`fd.fields.register()` warns in dev when it overwrites an existing field type.
Overwriting still works (replacing a built-in field is legitimate); the warning
flags accidental duplicates.

## 4. Barrel de-duplication and the slim main entry

### Each export keeps a single canonical home

The editor barrel no longer re-exports playground internals, and the display
barrel no longer re-exports `marked`.

- **Playground exports** (`Playground`, `PlaygroundModal`, `ChatPanel`,
  `SessionManager`, `InputCollector`, `ExecutionLogs`, `MessageBubble`,
  `PlaygroundService`, `PlaygroundStore`) are removed from
  `@flowdrop/flowdrop/editor`. Import them from `@flowdrop/flowdrop/playground`
  instead.

  ```js
  // 1.x
  import { Playground, PlaygroundStore } from '@flowdrop/flowdrop/editor';

  // 2.0
  import { Playground, PlaygroundStore } from '@flowdrop/flowdrop/playground';
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

### The main entry is now a minimal front door

`@flowdrop/flowdrop` (the main entry) no longer re-exports the entire library.
In 1.x it bundled every sub-module via `export *`; in 2.0 it exposes only the
small surface most apps need to bootstrap:

- **Values:** `App`, `mountFlowDropApp`, `unmountFlowDropApp`,
  `createFlowDropInstance`, `getInstance`, `provideInstance`,
  `createEndpointConfig`, `defaultEndpointConfig`, `NoAuthProvider`,
  `StaticAuthProvider`, `CallbackAuthProvider`.
- **Types:** `Workflow`, `WorkflowNode`, `WorkflowEdge`, `NodeMetadata`,
  `ConfigSchema`, `EndpointConfig`, `AuthProvider`, `FlowDropInstance`,
  `FlowDropMountOptions`, `MountedFlowDropApp`, `FlowDropEventHandlers`,
  `Messages`, `MessagesOverride`.

Everything else moves to a sub-module. If you imported a name from
`@flowdrop/flowdrop` that is not in the list above, switch to the sub-module
that owns it:

| Name (1.x main entry)                                                                                                                        | 2.0 sub-module                         |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `WorkflowEditor`, `ConfigForm`, `ConfigModal`, `ConfigPanel`, `Navbar`, `NodeSidebar`, node components                                       | `@flowdrop/flowdrop/editor`            |
| `mountWorkflowEditor`, editor helper classes, `EnhancedFlowDropApiClient`, `ApiContext`                                                      | `@flowdrop/flowdrop/editor`            |
| `WorkflowStore`, `HistoryStore`, `HistoryService`, `PortCoordinateStore`                                                                     | `@flowdrop/flowdrop/editor`            |
| `globalSaveWorkflow`, `globalExportWorkflow`, `saveWorkflow`, `getWorkflow`, draft-storage helpers                                           | `@flowdrop/flowdrop/editor`            |
| `fetchPortConfig`, `fetchCategories`, dynamic-schema helpers                                                                                 | `@flowdrop/flowdrop/editor`            |
| `NodeExecutionService`, connection utilities, `PortCompatibilityChecker`                                                                     | `@flowdrop/flowdrop/editor`            |
| Toast functions (`showSuccess`, `showError`, `showWarning`, `showInfo`, `showLoading`, `dismissToast`, `showPromise`, `showConfirmation`, …) | `@flowdrop/flowdrop/editor`            |
| `SchemaForm`, `FormField`, `FormSelect`, `FormToggle`, `FormArray`, …, `AutocompleteConfig`                                                  | `@flowdrop/flowdrop/form`              |
| `FormAutocomplete`                                                                                                                           | `@flowdrop/flowdrop/form/autocomplete` |
| `registerCodeEditorField`                                                                                                                    | `@flowdrop/flowdrop/form/code`         |
| `registerMarkdownEditorField`                                                                                                                | `@flowdrop/flowdrop/form/markdown`     |
| `Playground`, `PlaygroundModal`, `ChatPanel`, `mountPlayground`, `PlaygroundService`                                                         | `@flowdrop/flowdrop/playground`        |
| `MarkdownDisplay`                                                                                                                            | `@flowdrop/flowdrop/display`           |
| `setMessages`, `mergeMessages`, `defaultMessages`                                                                                            | `@flowdrop/flowdrop/core`              |
| Theme/skin exports (`defaultTheme`, `minimalTheme`, `resolveTheme`, `defaultSkin`, `slateSkin`)                                              | `@flowdrop/flowdrop/core`              |
| Color-preference helpers (`theme`, `resolvedTheme`, `setTheme`, `toggleTheme`, …)                                                            | `@flowdrop/flowdrop/core`              |
| `WorkflowAdapter`, `AgentSpecAdapter`, command DSL, color/icon utilities, all remaining types                                                | `@flowdrop/flowdrop/core`              |
| Settings stores/services/components                                                                                                          | `@flowdrop/flowdrop/settings`          |

```js
// 1.x — everything from the main entry
import { WorkflowEditor, SchemaForm, showSuccess, defaultTheme } from '@flowdrop/flowdrop';

// 2.0 — import from the owning sub-module
import { WorkflowEditor, showSuccess } from '@flowdrop/flowdrop/editor';
import { SchemaForm } from '@flowdrop/flowdrop/form';
import { defaultTheme } from '@flowdrop/flowdrop/core';
```

This also tightens tree-shaking: importing `App` and a couple of types from the
main entry no longer pulls the form, display, playground, and settings barrels
into your bundle.

### Keeping heavy dependencies out of the light entries

A few more exports moved so that the lightweight entries (`/core`, the light
`/form`) never statically pull a heavy dependency (CodeMirror, `marked`,
DOMPurify, `@xyflow/svelte`). These are enforced by a bundle guard in CI, so
they cannot silently regress.

- **`sanitizeHtml` moved from `@flowdrop/flowdrop/core` to
  `@flowdrop/flowdrop/display`.** It is DOMPurify-backed, and `/core` is the
  "zero heavy dependencies" entry, so it now lives alongside `MarkdownDisplay`.

  ```js
  // before
  import { sanitizeHtml } from '@flowdrop/flowdrop/core';
  // 2.0
  import { sanitizeHtml } from '@flowdrop/flowdrop/display';
  ```

- **`FormFieldFull` moved from `@flowdrop/flowdrop/form` to
  `@flowdrop/flowdrop/form/full`.** `FormFieldFull` statically bundles every
  editor (including CodeMirror); keeping it in the light `/form` entry pulled
  CodeMirror into every `SchemaForm` import. The default `FormField` exported
  from `/form` is the registry-based light field factory — register heavy
  editors via `/form/code` / `/form/markdown` (unchanged). Use `/form/full`
  only if you specifically want every editor statically bundled.

  ```js
  // before
  import { FormFieldFull } from '@flowdrop/flowdrop/form';
  // 2.0
  import { FormFieldFull } from '@flowdrop/flowdrop/form/full';
  ```

- **Service singleton _instances_ are no longer exported.**
  `playgroundService` and `interruptService` (`@flowdrop/flowdrop/playground`),
  `nodeExecutionService` (`@flowdrop/flowdrop/editor`), and
  `agentSpecExecutionService` (`@flowdrop/flowdrop/core`) are removed. They were
  module-level instances constructed at import time, which forced the service
  (and its dependencies) to be built the moment the entry was imported. The
  **classes** remain exported (`PlaygroundService`, `InterruptService`,
  `NodeExecutionService`, `AgentSpecExecutionService`). Most apps never touched
  these directly (use `fd.playground` / `fd.interrupts`); if you did, call
  `getInstance()` to obtain the shared instance:

  ```js
  // before
  import { playgroundService } from '@flowdrop/flowdrop/playground';
  // 2.0
  import { PlaygroundService } from '@flowdrop/flowdrop/playground';
  const playgroundService = PlaygroundService.getInstance();
  ```

## 5. Workflow `metadata` is required and `version` → `schemaVersion`

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
(round-trip stable). This mirrors the localStorage key migration in §8 — the
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

## 6. Removed component props

| Component                | Removed                                                                                          | Use instead                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `SchemaForm`             | `saveLabel`, `cancelLabel`                                                                       | `messages.form.schema.save` / `.cancel`                                                                                            |
| `AIChatPanel`            | `placeholder`                                                                                    | `messages.chat.placeholder`                                                                                                        |
| `ChatPanel`              | `showChatInput`, `showRunButton`                                                                 | `MessageStream` directly, or `ControlPanel` (keeps both flags)                                                                     |
| `ChatPanel`              | `showLogs`                                                                                       | `fd.playground.setShowLogs(...)`                                                                                                   |
| `WorkflowEditor`         | `nodes`, `height`, `width`, `isConfigSidebarOpen`, `selectedNodeForConfig`, `closeConfigSidebar` | These never did anything in 1.x. Size via `App`'s `height`/`width` (working since 1.16); node metadata flows through the instance. |
| `App` / `WorkflowEditor` | `readOnly`, `lockWorkflow`                                                                       | A single `mode` prop — see [section 6.2](#62-mode-prop-replaces-readonly--lockworkflow).                                           |
| `App`                    | `eventHandlers` (object)                                                                         | Flat `on*` props — see [section 6.3](#63-app-event-handlers-are-flat-props).                                                       |

`FormToggle.onLabel`/`offLabel` and `FormArray.addLabel` were _un_-deprecated:
they express per-instance labels the global messages system cannot, and are
now documented overrides.

Removed message keys (only the removed ChatPanel branches read them):
`playground.states.viewOnlyTitle`, `.viewOnlyText`, `.readyTitle`, `.readyText`.

### 6.1 `mountWorkflowEditor` option changes

- `workflow` now actually loads the workflow (1.x accepted and ignored it).
- `nodes` is removed (it fed a prop the editor never read). Use
  `mountFlowDropApp` if you need to pre-seed node metadata.
- `readOnly` / `lockWorkflow` mount options become a single `mode` option
  (`'edit' | 'readonly' | 'locked'`) — see
  [section 6.2](#62-mode-prop-replaces-readonly--lockworkflow). The grouped
  `eventHandlers` mount option is **unchanged** (an options bag is fine in a JS
  mount API); only the `<App>` _component_ prop is flattened.

### 6.2 `mode` prop replaces `readOnly` + `lockWorkflow`

`<App>`, `<WorkflowEditor>`, and the `mountFlowDropApp` options bag no longer
take the `readOnly` and `lockWorkflow` booleans. They are replaced by a single
`mode` prop/option:

```ts
mode?: 'edit' | 'readonly' | 'locked'; // default: 'edit'
```

**Behavior matrix** (what each mode gates):

| mode         | node drag / connect / select | proximity-connect | node swap | bottom console panel + toggle |
| ------------ | ---------------------------- | ----------------- | --------- | ----------------------------- |
| `'edit'`     | enabled                      | enabled           | enabled   | available                     |
| `'readonly'` | disabled                     | disabled          | disabled  | hidden                        |
| `'locked'`   | disabled                     | disabled          | disabled  | hidden                        |

In 1.x, `readOnly` and `lockWorkflow` gated the **exact same** interactions and
were always combined as `!readOnly && !lockWorkflow`. Any combination of the two
booleans therefore collapsed to either "edit" (both `false`) or "fully disabled"
(either `true`) — there was no orthogonal behavior to lose. `'readonly'` and
`'locked'` behave identically today; the two names are preserved as distinct
intents so a future release can differentiate them without another breaking
change.

**Old → new mapping** (component prop and mount option are identical):

| 1.x                                                        | 2.0                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `readOnly` unset / `false`, `lockWorkflow` unset / `false` | `mode="edit"` (or omit)                                |
| `readOnly={true}`                                          | `mode="readonly"`                                      |
| `lockWorkflow={true}`                                      | `mode="locked"`                                        |
| both `true`                                                | `mode="readonly"` _or_ `mode="locked"` (same behavior) |

```svelte
<!-- 1.x -->
<App readOnly={true} />
<App lockWorkflow={true} />

<!-- 2.0 -->
<App mode="readonly" />
<App mode="locked" />
```

```js
// 1.x
mountFlowDropApp(el, { readOnly: true });
// 2.0
mountFlowDropApp(el, { mode: 'readonly' });
```

### 6.3 `<App>` event handlers are flat props

The `<App>` component no longer takes a grouped `eventHandlers={{ … }}` object.
The handlers `<App>` consumes are now individual `on*` props, consistent with
every other component:

```svelte
<!-- 1.x -->
<App eventHandlers={{ onApiError, onAfterSave, onWorkflowLoad, onBeforeSwap }} />

<!-- 2.0 -->
<App {onApiError} {onAfterSave} {onWorkflowLoad} {onBeforeSwap} />
```

Available `<App>` callback props: `onBeforeSave`, `onAfterSave`, `onSaveError`,
`onApiError`, `onWorkflowLoad`, `onBeforeSwap`, `onAfterSwap`.

The **`mountFlowDropApp` / `mountPlayground` options bag is unchanged** — keep
passing the grouped `eventHandlers` object there. The mount functions wire
`onDirtyStateChange` / `onWorkflowChange` into the instance store, call
`onBeforeUnmount` on teardown, and forward the remaining handlers to `<App>`'s
flat props for you. The `FlowDropEventHandlers` type is still exported for use
with the mount option.

## 7. localStorage keys are instance-scoped

The page-default instance no longer writes bare keys:

| 1.x                           | 2.0                                   |
| ----------------------------- | ------------------------------------- |
| `flowdrop:draft:<workflowId>` | `flowdrop:draft:default:<workflowId>` |
| `fd-pipeline-panel-open`      | `fd-pipeline-panel-open:default`      |

Existing user data migrates automatically on first read (copy to the scoped
key, remove the legacy key). Only hosts reading these keys directly need to
update. `clearAllDrafts()` still removes everything under `flowdrop:draft:`.

## 8. Behavioral notes

- `fd.fields.register()` warns in dev when overwriting an existing field type.
  Overwriting still works; the warning flags accidents.
- Internal `DEV` gates use `esm-env` instead of `import.meta.env`, so the
  package no longer assumes a Vite host.
