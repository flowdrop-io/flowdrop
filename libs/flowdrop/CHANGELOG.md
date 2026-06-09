# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

- **Heavy dependencies no longer leak into the light entries.** Three exports moved so that `@flowdrop/flowdrop/core` and the light `@flowdrop/flowdrop/form` never statically pull CodeMirror, `marked`, DOMPurify, or `@xyflow/svelte` (enforced by a new CI bundle guard, see below):
  - `sanitizeHtml` moved from `@flowdrop/flowdrop/core` to `@flowdrop/flowdrop/display` (it is DOMPurify-backed; `/core` is the zero-heavy-dep entry).
  - `FormFieldFull` moved from `@flowdrop/flowdrop/form` to `@flowdrop/flowdrop/form/full` — it statically bundles every editor (CodeMirror), so keeping it in the light `/form` entry pulled CodeMirror into every `SchemaForm` import. The `FormField` exported from `/form` remains the registry-based light factory.
  - Service singleton _instances_ (`playgroundService`, `interruptService` from `/playground`; `nodeExecutionService` from `/editor`; `agentSpecExecutionService` from `/core`) are no longer exported — they were constructed eagerly at import time, pulling the service and its dependencies into the entry's static graph. The classes (`PlaygroundService`, `InterruptService`, `NodeExecutionService`, `AgentSpecExecutionService`) remain; call `getInstance()` for the shared instance. See [MIGRATION-2.0.md section 4](./MIGRATION-2.0.md#keeping-heavy-dependencies-out-of-the-light-entries).

### Changed (internal — no API change)

- `SchemaForm`, `ConfigForm`, and the UISchema renderer now use the registry-based light `FormFieldLight` internally, so importing `SchemaForm` no longer statically pulls CodeMirror (heavy editors stay opt-in via `/form/code` and `/form/markdown`).
- Built-in node **type metadata** (aliases, `resolveBuiltinAlias`, `isBuiltinType`) split into a component-free `registry/builtinNodeTypes` module so `/core`'s node-type utilities no longer drag in the node components (and transitively `marked`/DOMPurify).
- `utils/edgeStyling` and the `ConnectionLineType` reference in `types/index.ts` use type-only imports of `@xyflow/svelte`, removing the runtime `@xyflow/svelte` dependency from the headless command DSL reachable from `/core`.

### Added

- **Bundle-size guard (`pnpm run check:bundle`)** and a CI workflow that walk each published entry's static import graph and fail if a heavy dependency (CodeMirror, `@xyflow/svelte`, `marked`, DOMPurify) becomes statically reachable from a light entry (`/core`, `/form`, `/editor`). Dynamic `import()` — how `/form/code` lazy-loads CodeMirror — is intentionally ignored.

## [2.0.0-beta.1] - 2026-06-07

Pre-release of 2.0.0, published under the npm `beta` dist-tag (`npm install @flowdrop/flowdrop@beta`). `latest` remains 1.15.0 until 2.0.0 GA. See [MIGRATION-2.0.md](./MIGRATION-2.0.md) for the upgrade guide.

### Breaking Changes

- **Module-level store APIs removed — instances are the API.** The ~95 module-level functions that delegated to the page-default instance (`getWorkflowStore`, `workflowActions`, `historyService`, `getMessages`, `playgroundActions`, `getCategories`, `getHistoryState`, the whole get*/set*/actions surface of `@flowdrop/flowdrop/editor` and `@flowdrop/flowdrop/playground`) are gone. Every mount handle now exposes its state container: `mountFlowDropApp(...).instance` — so `workflowActions.addNode(...)` becomes `app.instance.workflow.actions.addNode(...)`, `historyService.undo()` becomes `app.instance.history.undo()`. Inside components, `getInstance()` is unchanged (including the browser fallback that makes single-editor embeds work without a provider). The `PlaygroundStore`, `InterruptStore`, and `PortCoordinateStore` classes are newly exported for hosts constructing state manually. Settings remain page-global by design.
- **localStorage keys are instance-scoped.** The page-default instance writes `flowdrop:draft:default:<workflowId>` (was `flowdrop:draft:<workflowId>`) and `fd-pipeline-panel-open:default` (was bare). Existing data migrates automatically on first read — drafts in progress survive the upgrade. Only hosts reading the keys directly need to update; `clearAllDrafts()` still matches everything under `flowdrop:draft:`.
- **v1.8-deprecated message props removed.** `SchemaForm` loses `saveLabel`/`cancelLabel`, `AIChatPanel` loses `placeholder` — use the `messages` mount option (`messages.form.schema.save`/`.cancel`, `messages.chat.placeholder`). The `warnDeprecatedProp` helper is gone. `FormToggle.onLabel`/`offLabel` and `FormArray.addLabel` were **un-deprecated** instead: they express per-instance labels the global messages system cannot (a visibility toggle's "Hidden"/"Visible", a schema-derived "Add Header" button) and are now documented overrides.
- **`ChatPanel` loses `showChatInput`, `showRunButton`, `showLogs`.** ChatPanel is the conversational surface — view-only feeds use the `MessageStream` primitive directly or `ControlPanel` (which keeps both flags as supported config); log visibility is store-managed (`fd.playground.setShowLogs`). The orphaned message keys `playground.states.{viewOnlyTitle,viewOnlyText,readyTitle,readyText}` are removed with the branches that read them.
- **`mountWorkflowEditor` options:** `workflow` now actually loads the workflow (1.x accepted and silently ignored it); `nodes` is removed (it fed a prop the editor never read — use `mountFlowDropApp` to pre-seed node metadata).
- **`mode` prop replaces `readOnly` + `lockWorkflow`** on `<App>`, `<WorkflowEditor>`, and the `mountFlowDropApp` options bag. The new prop/option is `mode?: 'edit' | 'readonly' | 'locked'` (default `'edit'`). In 1.x the two booleans gated the exact same interactions (node drag/connect/select, proximity-connect, node swap, bottom console panel) and were always combined as `!readOnly && !lockWorkflow`, so every combination collapsed to "edit" or "fully disabled" — there was no orthogonal behavior to lose. `'readonly'` and `'locked'` behave identically today; the two names are preserved as distinct intents for future differentiation. Mapping: `readOnly` → `mode="readonly"`, `lockWorkflow` → `mode="locked"`. See [MIGRATION-2.0.md section 6.2](./MIGRATION-2.0.md#62-mode-prop-replaces-readonly--lockworkflow).
- **`<App>` event handlers are flat props.** The `eventHandlers={{ … }}` object prop on the `<App>` _component_ is replaced by individual `on*` props (`onBeforeSave`, `onAfterSave`, `onSaveError`, `onApiError`, `onWorkflowLoad`, `onBeforeSwap`, `onAfterSwap`), consistent with every other component. The `mountFlowDropApp` / `mountPlayground` options bag is **unchanged** — keep passing the grouped `eventHandlers` object; the mount functions wire `onDirtyStateChange`/`onWorkflowChange` into the instance store, call `onBeforeUnmount` on teardown, and forward the rest to `<App>`'s flat props. See [MIGRATION-2.0.md section 6.3](./MIGRATION-2.0.md#63-app-event-handlers-are-flat-props).
- **API access is instance-scoped (`fd.api`).** The module-level API singleton in `services/api.js` is removed: `setEndpointConfig()`, `getEndpointConfig()`, `nodeApi`, `workflowApi`, and the `api` aggregate are gone. Each instance owns an `ApiContext` at `fd.api` holding the endpoint config + auth provider and lazily building an `EnhancedFlowDropApiClient` (`fd.api.client`); `mountFlowDropApp`/`mountPlayground`/`<App>` call `fd.api.configure(config, authProvider)` for you. Services that read the singleton (playground, interrupt, chat, node-execution, dynamic-schema, variable) now take the endpoint config as their first argument — pass `fd.api.config`. See [MIGRATION-2.0.md section 2](./MIGRATION-2.0.md#2-api-access-is-instance-scoped-fdapi).
- **`EndpointConfig.auth` removed — use an `AuthProvider`.** The `auth` block on `EndpointConfig` (and its header-injection branch) is gone; authentication is supplied exclusively through an `AuthProvider` passed to the mount/`<App>` `authProvider` option (or `fd.api.configure(config, provider)`). `StaticAuthProvider` covers the former static-token cases one-to-one (`bearer`/`api_key`/`custom`); `NoAuthProvider` is the `{ type: 'none' }` replacement (or omit `authProvider`).
- **Port compatibility is instance-scoped.** `initializePortCompatibility()`, `getPortCompatibilityChecker()`, and `isPortCompatibilityInitialized()` are removed. Each instance owns a `PortCompatibilityChecker` at `fd.portCompatibility`, seeded with `DEFAULT_PORT_CONFIG` and re-initialized by mount from the backend's port config. The standalone connection helpers (`validateConnection`, `getPossibleConnections`, `getConnectionSuggestions`) now take the checker as their first argument.
- **Registries are instance-scoped — importing the editor registers nothing.** The node/field/format registries move off module singletons onto the instance (`fd.nodes`, `fd.fields`, `fd.formats`), each seeded in its constructor from read-only builtin definitions. The editor barrel's builtin-node side-effect import is gone and `package.json` `sideEffects` is now CSS-only (`["**/*.css"]`). The singleton consts `nodeComponentRegistry`/`fieldComponentRegistry`/`workflowFormatRegistry` and the module functions `registerCustomNode`/`createFlowDropPlugin`/`registerFlowDropPlugin` (and `plugin.ts`) are removed — register against the instance: `fd.nodes.registerCustom(...)`, `fd.fields.register(...)`, `createPlugin().register(fd.nodes)`. The heavy form-field installers (`registerCodeEditorField`, `registerMarkdownEditorField`, template) now take the target registry explicitly and re-check registration after their dynamic import resolves; category color/icon helpers take a `CategoriesStore` parameter. `BaseRegistry` gains a `$state` version counter so `$derived` reads invalidate on late (post-mount) registration. See [MIGRATION-2.0.md section 3](./MIGRATION-2.0.md#3-registries-are-instance-scoped--importing-the-editor-registers-nothing).
- **Barrel de-duplication — one export, one home.** The editor barrel no longer re-exports the playground surface (`Playground`, `PlaygroundModal`, `ChatPanel`, `SessionManager`, `InputCollector`, `ExecutionLogs`, `MessageBubble`, `PlaygroundService`, `playgroundService`, `PlaygroundStore`) — import them from `@flowdrop/flowdrop/playground`. The display barrel no longer re-exports `marked` — depend on `marked` directly (`npm install marked`).
- **The main entry is a minimal front door.** `@flowdrop/flowdrop` no longer `export *`s the whole library; it exposes only the bootstrap surface (`App`, `mountFlowDropApp`, `unmountFlowDropApp`, `createFlowDropInstance`, `getInstance`, `provideInstance`, `createEndpointConfig`, `defaultEndpointConfig`, `NoAuthProvider`, `StaticAuthProvider`, `CallbackAuthProvider`, plus core bootstrap types). Every other name moves to its owning sub-module (`/editor`, `/form`, `/playground`, `/display`, `/core`, `/settings`) — see the import map in [MIGRATION-2.0.md section 4](./MIGRATION-2.0.md#4-barrel-de-duplication-and-the-slim-main-entry). Tightens tree-shaking: importing `App` no longer pulls the form/display/playground/settings barrels into the bundle.
- **Workflow `metadata` is required; `metadata.version` → `metadata.schemaVersion`.** The `metadata` object is now required on the `Workflow` type and its `version` field is renamed to `schemaVersion`, disambiguating the document _format_ version from `NodeMetadata.version` (the node-type version, unchanged) and from any host-tracked revision number. Stored 1.x JSON heals automatically on load — `WorkflowStore.initialize` and `WorkflowAdapter.importWorkflow` populate missing metadata with defaults (`schemaVersion` from `WORKFLOW_SCHEMA_VERSION`) and copy legacy `version` → `schemaVersion` before dropping the old key; healing is idempotent and round-trip stable. The Agent Spec export's namespaced `flowdrop:version` key is unchanged (its source is now `metadata.schemaVersion`). The published JSON Schema (`@flowdrop/flowdrop/schema`) reflects the rename: `WorkflowMetadata.required` is `[schemaVersion, createdAt, updatedAt]`. Hosts reading workflow JSON directly should read `metadata.schemaVersion`. See [MIGRATION-2.0.md section 5](./MIGRATION-2.0.md#5-workflow-metadata-is-required-and-version--schemaversion).

### Deferred to a future release

- **Navbar snippet composition.** Replacing the `showNavbar`/`navbarTitle`/`navbarActions`/`showSettings`/`showStatus`/`showSettingsSyncButton`/`showSettingsResetButton` prop cluster with a single composable navbar snippet is a design exercise rather than a mechanical rename, and is deferred to 2.1/3.0. The individual flags are unchanged in 2.0.

### Changed (2.0)

- `fd.fields.register()` warns in dev when overwriting an existing field type. Overwriting remains supported (replacing a built-in field is legitimate); the warning exists for the accidental-duplicate case.
- Internal `DEV` gates use `esm-env` instead of `import.meta.env`, removing the package's implicit assumption of a Vite host (and the svelte-package build warning).

### Added

- **Multiple FlowDrop instances per page.** Previously all editor state lived in module-level singleton stores — mounting a second editor shared (and clobbered) the first one's workflow, undo/redo history, playground sessions, and callbacks; `destroy()` on one broke the survivor. Every mount now creates an isolated `FlowDropInstance` state container (workflow, history, playground, interrupts, categories, port coordinates, pipeline-panel state) provided to the component tree via Svelte context. The first `mountFlowDropApp`/`mountWorkflowEditor` call without the new `instanceId` option becomes the _page-default instance_ — the one `getInstance()` resolves to for single-editor embeds, with storage under the `default` scope (`flowdrop:draft:default:<workflowId>`; 1.x bare keys migrate on first read — see Breaking Changes). Additional mounts get auto-generated ids (`fd-1`, `fd-2`, …) and their own storage scope (`flowdrop:draft:<instanceId>:<workflowId>`); pass an explicit `instanceId` whenever mounting more than one editor with drafts enabled. The Svelte components (`App`, `WorkflowEditor`, `Playground`, `PlaygroundStudio`, `PlaygroundModal`, `PlaygroundApp`) accept an optional `instance` prop, and `@flowdrop/flowdrop/editor` newly exports `createFlowDropInstance`, `getDefaultInstance`, `getInstance`, `provideInstance`, `FLOWDROP_INSTANCE_KEY`, the `FlowDropInstance`/`CreateInstanceOptions` types, and the `WorkflowStore`/`HistoryStore` classes. The playground mounts take `instanceId` too — session/message _state_ is isolated, though the live-polling timer remains page-global (one active poller; use `pushMessages()` with your own transport for concurrent live updates). Still page-global by design: theme and settings (including the console/sidebar/bottom-panel UI toggles). Port-compatibility config and API endpoint config, page-global when this feature was first built, are instance-scoped as of 2.0 (`fd.portCompatibility`, `fd.api` — see Breaking Changes). As part of this work, modal/listbox/settings-tab DOM ids are generated per component instance (`$props.id()`), fixing duplicate-id a11y violations — plus a pre-existing `aria-labelledby` that pointed at a nonexistent settings-tab id. SSR note for SvelteKit consumers: the default instance is browser-only (server renders get a fresh per-render instance via the provider components), which also eliminates a cross-request state-leak hazard the old module-level stores carried.
- **Configurable draft storage backend — `draftStorage` mount option**: workflow drafts (which include node configuration values, potentially secrets) previously always landed in `localStorage`, where they persist on the device even after the tab or browser is closed. The new `draftStorage` option on `mountFlowDropApp` accepts `'local'` (default, unchanged behavior), `'session'` (tab-scoped `sessionStorage` — cleared on tab close, at the cost of crash-and-reopen recovery), or a custom `DraftStorageAdapter` (`getItem`/`setItem`/`removeItem`/`keys`). The adapter interface is **synchronous** — it suits in-memory stores and write-through caches; async backends (IndexedDB, network) need a sync cache in front. The resolved adapter is **captured per mount** (and per `DraftAutoSaveManager`), so multiple FlowDrop instances on one page can use different backends without interfering; the standalone helpers (`saveDraft`, `loadDraft`, `clearAllDrafts`, …) default to the most recent mount's backend and now accept an explicit adapter argument. `setDraftStorage`/`getDraftStorage`/`resolveDraftStorage` and the adapter types are exported from `@flowdrop/flowdrop/editor`. Note neither built-in backend protects against same-origin script access (XSS) — for secrets, prefer `features.autoSaveDraft: false` or an in-memory adapter.
- **End-user draft opt-out — "Store Drafts in Browser" behavior setting** (`behavior.storeDraftsInBrowser`, default `true`): a user-facing toggle in the settings panel's Behavior tab that gates all draft writes at runtime — including the key migration after a workflow's first save — and removes the current draft when switched off. The setting description warns that drafts may stay stored on the device even after the tab or browser is closed. Applies per tab: already-open tabs read settings at load time and keep writing drafts until reloaded. Hosts can pre-seed it via the `settings` mount option like any other setting.
- **`NavbarAction.group` — clustered flyout dropdown items**: an optional `group?: string` on `NavbarAction`. Items sharing a group cluster under a labeled header (preceded by a divider) inside the flyout dropdown; ungrouped items render first, and group order follows first occurrence in the source array. Ignored in split mode (the inline button row).
- **Playground session-UI config flags — `showNewSessionButton`, `showSessionList`**: added to `PlaygroundConfig`, and the previously orphaned `showSessionHeader` (lost in the 3-pane refactor) is re-wired to the current `ControlPanel` header. Defaults preserve existing behavior; combine the flags to lock a playground embed to a single session without exposing session-switching UI.
- **Microsecond-precision job durations across pipeline views.** A new `formatMicroseconds` helper (`src/lib/utils/duration.ts`) mirrors the backend `Duration::formatMicroseconds()` tiers (`150µs`, `2.5ms`, `1.23s`, `2m 30s`, `1h 30m`) so the playground and the Drupal admin pages render identical values. All pipeline views prefer the orchestrator-stamped `execution_time_us` from job payloads and fall back to the legacy second-granularity timestamps for jobs that predate the metadata stamp: the table view gains a right-aligned Duration column, kanban cards show a duration chip, and the canvas node-status overlay (current run + history) upgrades to µs when available. `NodeJobExecution.executionTimeUs` and `NodeExecutionInfo.lastExecutionDurationUs` are added as optional fields (additive, non-breaking).
- **Pipeline table rows expand into full job details.** The per-job detail panel now shows the completed timestamp, retry count (`retryCount` / `maxRetries`, shown only when retries occurred), and collapsible pretty-printed **Input data** / **Output data** sections (`input_data` / `output_data` from the job payload; empty objects and arrays are treated as "nothing to show").

### Changed

- **Playground `ControlPanel` starts at minimum height**: the initial `controlPanelHeight` drops from 280 to 140 (the floor of the existing clamp), giving the `ExecutionConsole` more room by default. The draggable resizer is unchanged — users can still expand the pane.
- **i18n: "Sessions" label renamed to "Session"**: singular reads more naturally given that most playground configurations focus on a single active session. Hosts overriding `messages` should update the corresponding key.
- **Dead interaction plumbing removed (internal).** Sidebar node items no longer carry `role="button"`/`tabindex` and no-op click/keydown handlers — they are drag-only and now present as plain list items (`role="list"`/`listitem`) to assistive tech. The internal `SwapMappingEditor` loses its accepted-but-ignored `checker` prop. The port coordinate store mutates a single `SvelteMap` in place (fine-grained per-key reactivity) instead of replacing the whole map per update. None of these are part of the documented API.

### Fixed

- **The theme light/dark preference is no longer reset on every page load.** Hosts passing a `settings` mount option (`mountFlowDropApp({ settings: { theme: { preference: … } } })`) reported that a user's light/dark choice "never persisted" — it reverted to the host default on each reload. `initializeSettings({ defaults })` merged the host defaults _over_ the user's saved snapshot and re-wrote it, so the host default always won. Precedence is now `DEFAULT_SETTINGS < host defaults < persisted snapshot`: host defaults seed only the values a user has never saved, and seeding no longer eagerly writes to storage (it stays user-driven, written by real changes). `initializeTheme()` is idempotent, now subscribes to the system `prefers-color-scheme` so `'auto'` tracks the OS live, and `<App>` applies the persisted `data-theme` on mount — restoring it for hosts rendering `<App>` directly, where previously only the mount helpers did.
- **Backspace-deleting a node no longer navigates the page back in embedded WebKit.** SvelteFlow's key handler deletes selected elements on Backspace but doesn't `preventDefault()`, and raw WebKit (unlike desktop Safari's UI layer) still ships the legacy "Backspace = history back" default action — so deleting a node in a WebKit-embedded host navigated away from the editor mid-delete. `WorkflowEditor` now suppresses the default for Backspace/Delete keydowns originating inside the flow canvas (inputs and contenteditable are exempt, and host-page keystrokes outside the editor are untouched). Also resolves the five long-standing webkit e2e failures, which were this bug: the test browser navigated to `about:blank` and every subsequent assertion timed out.
- **`SchemaForm` and `ConfigForm` work standalone and under SSR.** Both are documented as standalone-capable containers, but their leaf `<FormField>`s resolve the FlowDrop instance from context — a bare embed outside `<App>`/`<WorkflowEditor>` worked only via the browser's page-default fallback, and server-side rendering threw. Both forms now self-provide an instance (`provideInstance()`): nested usage reuses the ancestor's instance, bare browser usage gets the shared page-default, and a server render gets a fresh per-render instance with no cross-request leakage.
- **The documented `height`/`width` mount options now actually size the editor.** `mountFlowDropApp({ height: '600px' })` (and the same props on `App`) were accepted, forwarded, and ignored — the layout root was hardcoded to `height: 100vh; width: 100%` in CSS, which happens to match the prop defaults, so default usage never revealed the gap. `MainLayout` now exposes `height`/`width` props (CSS length strings, or numbers treated as pixels) applied via `--layout-height`/`--layout-width` custom properties, and `App` passes them through. Consumers who worked around this by sizing a wrapper element are unaffected — `height: '100%'` resolves against the wrapper as before.
- **`WorkflowEditor` drops six props it never read: `nodes`, `height`, `width`, `isConfigSidebarOpen`, `selectedNodeForConfig`, `closeConfigSidebar`.** All six were accepted and silently ignored — node metadata flows through the instance store, sizing belongs to `App`/`MainLayout` (see above), and the config sidebar is owned by `App` (`openConfigSidebar`, which `WorkflowEditor` does use, is kept). Passing the removed props was always a no-op, so runtime behavior is unchanged; TypeScript consumers passing them will now get a compile error naming the prop instead of silence. `NodeStatusOverlay`'s previously-unused `nodeId` prop is now rendered as a `data-node-id` attribute on the overlay root, giving tests and host pages a stable per-node selector.
- **Documented form props that were silently ignored now work.** Three `ConfigProperty` options documented in the OpenAPI schema (and 1.14.0 changelog) were accepted by their components and never used: `spellChecker` now toggles browser spellcheck on the markdown editor's CodeMirror content, `required` is now set on the range field's input, and `placeholder` is now shown inside the template editor while the document is empty (the separate `placeholderExample` block below the editor is unchanged).
- **Command Console `swap` no longer produces a node whose edges vanish from the canvas.** `executeSwap` hand-assembled the replacement node's `data` without `nodeId` — but node components derive their handle IDs from `data.nodeId`, so the swapped node rendered with zero handles and SvelteFlow silently dropped every edge anchored to it. The entity, status bar count, and pipeline execution all stayed correct, making an intact graph look corrupted. The replacement node now carries `data.nodeId` like palette-added nodes, and `WorkflowStore.initialize()` heals any legacy node missing it (`nodeId = node.id`) on load, so previously-swapped workflows repair themselves on next open.
- **Swap preserves every edge on multi-connection ports (e.g. tool fan-ins).** Port matching claimed a new-node port per _edge_ instead of per _old port_, so on a port with N edges (a `tools` fan-in, an output fan-out) only the first survived — the rest found the port "used" and were dropped or fuzzily rewired. Matches are now memoized per old port: all edges sharing an old port map to the same new port, while two _different_ old ports still can't claim the same new port. Applies to `computeSwapPreview` and `computeSwapPreviewWithOptions` (including the strategy/override cascade).
- **Swap port matching is exact-only — the fuzzy dataType fallback is removed.** The third matching pass ("first available port with compatible dataType") silently rewired edges to the wrong port when the right one was taken (e.g. a `text` output edge coming back as `assistant_message`). Matching is now exact port-ID, then exact name (case-insensitive); an edge whose port has no exact counterpart is dropped and reported rather than mis-wired.
- **`swap` command output names each dropped edge.** The summary now reads `(2 edge(s) dropped: node.1:text → node.2:message, …)` instead of a bare count. The inline list caps at 5 (`… and N more`); the full list is always available on `SwapNodeResultData.droppedEdgeDetails` for programmatic consumers. Internally, `computeSwapPreview` is now a thin wrapper over `computeSwapPreviewWithOptions` — one matching algorithm instead of two parallel copies.
- **Skipped node status preserved on the playground canvas overlay**: skipped nodes rendered as "Completed" and flickered between the two labels as fetches resolved, because two paths wrote node `executionInfo.status` — `WorkflowEditor`'s own fetcher (correct) and a parallel `nodeStatuses` prop through `App` that collapsed skipped/paused/interrupted into a 4-value enum. The parallel channel is removed; `WorkflowEditor.loadNodeExecutionInfo()` is now the single writer (signaled via `refreshTrigger`) and is self-canceling so the `pipelineId`-change and `refreshTrigger`-bump callers can't race.
- **AI Assistant batch no longer discarded wholesale on a single bad command.** Since 1.10.0, if _any_ command in an approved batch failed to parse (e.g. a low-quality model emitting a multiline `set` without a closing `"""`), the entire batch was refused upfront and auto-retry was skipped — so nothing applied and the assistant never tried to correct itself, even when most commands were valid. `handleApproveCommands` now **isolates** unparseable commands and executes the healthy subset, restoring the long-standing "applied to a certain extent" behavior. The atomic rollback on _execution_ failure (1.5.0) is unchanged.
- **Parse failures now feed specific, actionable feedback back to the assistant.** A new `buildRetryFeedback` (extracted to `src/lib/chat/batchFeedback.ts`) reports _which_ command failed and _why_ — the exact parser reason and offending text — alongside the live workflow state. Auto-retry on parse errors is re-enabled because the model now gets a concrete, different correction target; the original "retry reproduces the same malformed shape" cascade only happened because the old generic ask never named the failing line. Still bounded by `MAX_AUTO_RETRIES` and gated by the `chatAutoRetry` setting.

## [1.15.0] - 2026-05-28

### Fixed

- **Dependent autocomplete preserves values on undo, redo, and external config replacement (#33)**: `FormAutocomplete`'s `params`-driven `$effect` used to fire `onChange('')` whenever a mapped dependency field changed, regardless of _who_ changed it. The child couldn't tell "user picked a new account" from "undo restored the old account" — so undoing a parent-field change cascaded a value-clear on the dependents, corrupting an otherwise valid snapshot. The clearing policy now lives in the parent form: `ConfigForm`/`SchemaForm` apply the cascade in `handleFieldChange`, which only runs on user-driven edits. Undo, redo, programmatic value replacement, and collaborative edits flow through `initialConfig` / `values` and bypass it. The reverted snapshot stays intact.
- **Dependent autocomplete preserves preloaded values on form load (#31)**: `SchemaForm` and `ConfigForm` previously initialised their internal values as `$state({})` and populated them from props via a post-mount `$effect`. A dependent `FormAutocomplete` (one declaring `autocomplete.params`) captured an empty form-values snapshot at mount, then saw the fingerprint flip from empty to populated when the parent effect ran, and fired `onChange('')` — wiping the dependent field's preloaded value. Form values are now a `$derived` over the `values` / `initialConfig` prop plus a separate `edits` `$state` map; children mount with the correct values already in place, so the spurious clear can't fire. The most visible symptom — opening a saved Jira `create_issue` node and losing the `issue_type` — is gone.
- **Undo/redo restored for committed config edits**: `ConfigForm.handleFormBlur` now discharges its `edits` buffer after the commit fires. Without this, the `edits` overlay would shadow the reverted `initialConfig` value after `historyService.undo()`, leaving the form showing the user's edit while the store held the undone value; the next field-blur then re-committed the stale edit, undoing the undo. The four-character fix (`edits = {}` after `onChange`) lets prop changes — from undo, redo, or any external source — flow through cleanly.

### Changed

- **`AutocompleteConfig.params` doc contract narrowed (technically behavioral, not API).** The TypeScript surface is unchanged — same type, same fields. What changes is _who_ clears the dependent value when a dependency moves: the parent form, only on user-driven edits via `handleFieldChange`. The component continues to abort in-flight fetches and invalidate cached suggestions on any dependency change. Consumers using `ConfigForm` or `SchemaForm` (the documented happy path) see no observable change on user-driven edits, only the bug fix on undo/redo. Consumers using `FormAutocomplete` standalone outside a FlowDrop form — already warned at mount when `params` is set without `flowdrop:getFormValues` context — need to handle dependent-value clearing themselves.
- **Behavior change: `values` prop reassignment no longer wipes in-flight edits.** The old merge-via-effect re-ran on every `values` reference change and overwrote any keys the user had edited. Edits are now preserved per-key across parent re-renders; only a `schema` reference change resets them. Consumers that relied on "reset the form by passing a new `values`" should instead change the `schema` reference or remount via `{#key resetCounter}<ConfigForm ... />{/key}`.
- **Behavior change: mid-typing undo shows the user's keystroke, not the reverted value.** Previously the merge effect wholesale-wiped `formValues` on every prop change, including reverts that arrived while the user was still typing — yanking the keystroke out from under them. The new design keeps the user's in-flight edit visible until they commit (blur) or discard focus. The store is correct either way; only the displayed value differs while focus is held.

## [1.14.0] - 2026-05-27

### Added

- **OpenAPI spec ships with the package** (`@flowdrop/flowdrop/openapi`): The full backend API spec is copied into `dist/openapi/v1/openapi.yaml` during packaging and exposed via the `@flowdrop/flowdrop/openapi` (and `/openapi/v1`) export, version-matched to the installed release. Consumers — and their AI assistants — can read the node-config (`ConfigProperty`), playground-message, and endpoint schemas without needing the monorepo or api.flowdrop.io. Still browsable at [api.flowdrop.io](https://api.flowdrop.io).
- **Editor-tuning properties documented in `ConfigProperty`**: `readOnly`, `height`, `darkTheme`, `autoFormat`, `showToolbar`, `showStatusBar`, `spellChecker`, and `placeholderExample` are read by the form renderer for the code/JSON, markdown, and template editor fields but were never declared in the OpenAPI schema. They are now documented, so consumers validating node config against the published spec no longer see them as unknown properties.
- **Pipeline nesting fields on playground messages — `parentPipelineId`, `rootPipelineId`**: `PlaygroundMessage` now carries authoritative lineage fields so clients can distinguish main-pipeline messages from nested sub-flow messages (the display-only `hierarchy` is not a reliable nesting signal). `parentPipelineId` is `null` for top-level messages; `rootPipelineId` equals the message's own `executionId` for main runs. A session's `executions` list is documented as containing main runs only.
- **Backward pagination for playground messages**:
  - API: `GET /playground/sessions/{sessionId}/messages` gains optional `before` (backward cursor) and `latest` (fetch the tail) query params plus a `hasOlder` response field. Additive and non-breaking — omitting them preserves the legacy oldest-first behavior.
  - Client: `getMessages` takes an options object (`since` / `before` / `latest` / `limit`), the messages response type gains `hasOlder`, and a `messagePageSize` config option is added.
  - UI: the chat loads the most recent page first and seeds polling from the newest sequence, then pages older messages on scroll-up via an IntersectionObserver sentinel that anchors the viewport so prepends don't shift the reading position.

### Changed

- **Main pipeline kept in focus; sub-flows excluded from the run-switcher**: Runs are classified from their messages' `parentPipelineId`; the sidebar stays on the most recent main run and sub-flow executions are excluded from the run-switcher (selecting one can't render its own graph, so listing them was dead UI). A new main run auto-follows by clearing the pin. All still-running executions are marked terminal when the session ends, since sub-flows mean a session can track more than one execution at once.

### Fixed

- **Playground message-load races**: `loadSession` is guarded against stale concurrent loads, an older-message page is dropped if the session changed mid-fetch, and autoscroll no longer fights the scroll-up anchor.
- **Run/session dropdown height**: session and run dropdowns are capped in height so the controls below them stay reachable.

## [1.13.0] - 2026-05-23

### Added

- **Server-driven playground message annotations — `hierarchy`, `tags`, `display`**: `PlaygroundMessage` now carries three optional server-emitted fields that let the server fully control message presentation without any client-side derivation:
  - `hierarchy: MessageHierarchyItem[]` — ordered path (e.g. workflow > sub-workflow > iteration), rendered as a chevron-separated trail. Display-only — this is not a navigation breadcrumb.
  - `tags: MessageTag[]` — classification chips with a closed-enum `color` (`muted | primary | success | warning | error | info`) and `variant` (`subtle | solid | outline`). When the server emits tags, the client renders exactly those — no merge with client-side defaults.
  - `display: PlaygroundMessageDisplay` — layout hint (`bubble | log | notice | card`). When omitted, the client picks a default from the role.
  - Pure `resolveMessageDisplay(message, options)` helper is exported alongside the types so consumers can mirror the dispatch.
  - Full contract documented in `api/README.md`.

- **`m().playground.messageAnnotations.hierarchyOf({ path })` i18n function**: Names a message's hierarchy trail by the path itself (e.g. `"From: ForEach Loop / Greeter"`). Hosts overriding `messages` should provide a localised function that accepts the joined path string. The tag strip has no aria-label — each chip self-labels and a generic group label was noise.

- **`awaiting_input` added to `PlaygroundSessionStatus` OpenAPI enum**: The TypeScript type already accepted this value; the schema is now in sync.

- **Dependent autocomplete fields via `autocomplete.params`**: `AutocompleteConfig` gains an optional `params` map (`{ paramName: fieldName }`) that wires sibling form values into the suggestion-fetch URL as query parameters. `FormAutocomplete` reactively clears the selected value and invalidates the suggestion cache when any dependency changes, guarded against firing on initial mount so restored config values are preserved. Added to the OpenAPI YAML schema and regenerated JSON Schema.

- **`FORM_VALUES_KEY` context key and `FormValuesGetter` type**: Both are now exported from `@flowdrop/flowdrop/form`. Custom field components registered via `fieldComponentRegistry` can call `getContext(FORM_VALUES_KEY)` to receive a `() => Record<string, unknown>` getter that always returns the current values of all sibling fields in the form. The context is set by both `ConfigForm` and `SchemaForm`. This is the stable public API for building cross-field interactions such as dependent autocomplete fields.

- **`schema` prop on registered autocomplete components**: Custom components registered to handle `format: "autocomplete"` fields (via `fieldComponentRegistry`) now receive the full `FieldSchema` object as a `schema` prop. This gives access to any custom property on the schema definition — for example a `dependencies` map — without FlowDrop needing to anticipate and forward each one individually.

- **`FormAutocomplete` exposed via `@flowdrop/flowdrop/form/autocomplete` subpath**: Consumers can now import and wrap `FormAutocomplete` directly to build custom autocomplete UIs without reimplementing type-ahead, debounce, and abort logic. `FormField` and `FormFieldLight` also consult `fieldComponentRegistry` for autocomplete fields, rendering registered overrides with the full prop set (including `node`, `edges`, and the resolved `autocomplete` config) before falling through to the built-in component.

- **Mobile responsiveness for the playground**: At ≤768 px viewports, `PlaygroundStudio` switches from side-by-side panes to one-at-a-time fullscreen. The pipeline panel takes the full viewport when open and exposes a "Back to chat" affordance; the drag resizer is hidden. Message bubbles, log rows, system notices, cards, and interrupt footers now flex-wrap and tighten padding at small widths; hierarchy labels truncate to 5 rem and log timestamps hide to recover horizontal space.

- **Container-query log layout**: `.message-stream` is now a CSS container (`container-name: fd-message-stream`). When the stream is ≤480 px wide, log rows stack onto three lines — meta/hierarchy on row 1, message body on row 2, tags on row 3 (indented to align with the body); timestamps hide. Triggered by container size, not viewport, so it fires correctly in narrow embedded mounts regardless of window size. A medium 2-row variant is also available.

- **Accessibility pass on the message stream**: Message bubbles and cards are `<article>` with role-named aria-labels; log rows carry `role="listitem"` + level/source aria-labels; system notices use `role="status"`. Tag groups are `role="group" aria-label="tags"`, individual chips include any `tag.type` in their aria-label, hierarchy trails wrap their `<ol>` in `<nav aria-label="message hierarchy">` and mark the last crumb with `aria-current`. Timestamps are `<time datetime=…>` with natural-language aria-labels. All decorative Iconify icons are `aria-hidden`. `prefers-reduced-motion` is respected on bubble/card fade-in and `InterruptBubble`'s slide-in.

### Fixed

- **Auth headers on `fetchCategories` and `fetchPortConfig`** (#27): Both functions hardcoded only `Content-Type` and ignored both the legacy `endpointConfig.auth` and the `AuthProvider` path. They now accept an optional `AuthProvider`, merge its headers on top of `getEndpointHeaders`, and `mountWorkflowEditor` exposes the same option.

- **`FormAutocomplete` correctness pass**: Four issues fixed —
  - Dependency-change guard replaced with value-comparison (`prevDepFingerprint`) so it works reliably on deferred and SSR mounts.
  - `AbortController` timeout race: the 5 s timeout closure now captures the controller in a local const and `clearTimeout` runs in `finally`, so the right request is always aborted regardless of exit path.
  - Suggestions cleared on blur when `params` is configured, so `fetchOnFocus` always re-fetches with current dependency values instead of showing stale results.
  - Warns via logger when `params` is non-empty but the `flowdrop:getFormValues` context is absent (silent failure in standalone usage).

- **Compact log rows in narrow panes**: Log rows no longer crammed together in narrow chat panes / embedded mounts — driven by the new container-query layout above.

### Changed

- **`MessageBubble` internals split into per-layout components**: `MessageBubble.svelte` is now a thin dispatcher (~50 lines) over `ChatBubble`, `LogRow`, `MessageNotice`, and `MessageCard`. Shared primitives `HierarchyTrail`, `MessageTagStrip`, and `MessageMarkdown` deduplicate the markup. `MessageTagChip` is driven by CSS custom properties. Public props on `MessageBubble` are unchanged, so this is internal-only.

## [1.12.0] - 2026-05-16

### Added

- **Kanban pipeline view**: A new `kanban` view in `PipelinePanel` renders a board where columns are driven by the server's `kanban_config` field on the pipeline response. Each column maps one or more execution statuses via `KanbanColumnDef.statuses`, so the board layout is entirely server-configurable without a client-side code change.
- **`KanbanColumnDef` and `KanbanConfig` types**: New exported types that model a server-defined kanban column (`key`, `label`, `statuses[]`, optional `color`) and the top-level `kanban_config` object (`columns[]`) returned by the pipeline API.
- **`paused` and `interrupted` execution statuses**: `NodeExecutionStatus` and `ExecutionStatus` now include `'paused'` (orange) and `'interrupted'` (cyan). Both statuses have dedicated icons, color tokens, and labels across the table, graph, and kanban views.
- **`status_summary` extensions**: `JobStatusSummary` gains `skipped`, `paused`, and `interrupted` count fields, mirroring the API schema update.
- **Pipeline table accordion rows**: Clicking a row in the pipeline table expands an inline accordion panel showing per-node execution details (start/end times, status, output). A second click collapses it.
- **`PipelineViewDef` extensibility**: `mountPlaygroundStudio()` now accepts a `pipelineViews` option and `PlaygroundStudio` accepts an `extraPipelineViews` prop. Each entry defines a `key`, `icon`, `label`, and a Svelte component that receives `PipelineViewProps`. The view key is persisted in `localStorage` and validated against built-ins + injected views on restore. `PipelineViewDef` and `PipelineViewProps` are exported from `@flowdrop/flowdrop/playground`.
- **New playground sub-components exported**: `MessageStream`, `ChatInput`, `ExecutionConsole`, and `ControlPanel` are now exported from `@flowdrop/flowdrop/playground` for hosts that need to compose custom playground layouts.
- **`getShowLogs()` store helper**: Exposed from `@flowdrop/flowdrop/playground` to read the playground log-panel visibility state.
- **Locked workflow graph in playground**: When no pipeline execution is running the playground now renders the workflow graph in read-only mode instead of a blank panel, giving users a visual reference of the workflow structure at all times.
- **Create session button**: When a playground has no sessions at all a prominent "Create session" button is shown directly in the empty state instead of an uninformative blank screen.
- **Full status coverage in table and graph views**: The pipeline table and execution graph now render distinct icons and color badges for every `NodeExecutionStatus` value, including the new `paused` and `interrupted` states.

### Fixed

- **Polling survives interrupts and terminal statuses**: The playground polling loop was silently cancelled when a pipeline reached a terminal status or transitioned through `awaiting_input`. Polling now resumes correctly after an interrupt is resolved and continues until the session is genuinely idle.
- **Unreported nodes no longer default to `pending`**: Nodes not mentioned in a pipeline response were being shown as `pending`. They are now left in their previous state (typically `idle`) until the server explicitly reports them.
- **Panel size re-clamp on container resize**: Draggable panel widths were not re-clamped when the viewport resized, causing the pipeline panel to overflow or jump. A `ResizeObserver` now re-applies the min/max constraints whenever the container dimensions change.
- **Node type label shows `metadata.id`**: The pipeline table was displaying the internal `universalNode` discriminator instead of the human-readable `metadata.id` value as the node type.
- **Node interaction disabled when workflow is locked or read-only**: Clicking or dragging nodes in the editor graph is now prevented when the workflow is in a locked or read-only state.
- **`showLogs` prop syncs reactively**: The log panel visibility was reading a stale prop value; it is now driven by a `$effect` that tracks the prop correctly.
- **Keyboard accessibility — interrupt prompts**: HITL interrupt dialogs can now be dismissed and confirmed with the keyboard.
- **Keyboard accessibility — session and pipeline chip dropdowns**: Both dropdowns are now fully navigable via keyboard (Arrow keys, Enter, Escape).
- **Port handles removed from keyboard tab order**: Port handles on workflow nodes are no longer reachable via Tab, reducing noise for keyboard-only users navigating the editor.
- **Keyboard-controlled horizontal resizer**: The `PlaygroundStudio` split-pane resizer responds to `ArrowLeft` / `ArrowRight` keys (10 px increments) in addition to mouse drag.

### Changed

- **Playground `i18n` — all UI strings are now message-keyed**: Every hardcoded string in the playground (button labels, status text, empty-state messages) has been extracted into the FlowDrop message map. Hosts that supply a custom `messages` object can now translate or override playground copy.
- **Playground internals refactored into `PlaygroundStudio`**: The demo `+page.svelte` and the `Playground` component have been restructured around the `PlaygroundStudio` 3-pane layout. This is an internal change with no public API impact.

## [1.11.0] - 2026-05-11

### Added

- **`PlaygroundApp` component**: A full-page playground wrapper that pairs the FlowDrop `Navbar` with `PlaygroundStudio`. Callers build their own `primaryActions` array (no hardcoded back/edit URLs), so the component can be embedded in any host that wants the standard FlowDrop chrome around the playground. The Navbar settings modal is wired through (`showSettings`, `settingsCategories`, `showSettingsSyncButton`, `showSettingsResetButton`) so hosts can restrict which tabs appear or hide the gear entirely.
- **`mountPlaygroundApp()`**: Vanilla JS / framework-agnostic mount function for `PlaygroundApp`, alongside a matching `PlaygroundAppMountOptions` type. Mirrors `mountPlaygroundStudio` so non-Svelte hosts (e.g. Drupal) can embed the full chrome.
- **`settings` option on all playground mount functions**: `mountPlayground`, `mountPlaygroundStudio`, and `mountPlaygroundApp` now accept a deep-merged `PartialSettings` value, mirroring `mountFlowDropApp`. Theme is re-initialized on every mount, after validation, so failed calls do not mutate global theme state.
- **Shared `NavbarAction` type**: Extracted to `types/navbar.ts` as the single source of truth and re-exported from the package entry points.

### Fixed

- **Mount runtime validation for `mode: 'modal'`**: `mountPlaygroundStudio` and `mountPlaygroundApp` now reject `mode: 'modal'` at runtime with a clear error, so JS hosts (Drupal SDC, where TS narrowing does not apply) get a useful message instead of a silent miscast.
- **`Playground` standalone height**: Switched from `height: 100vh` to `height: 100%` so the chat input is not clipped when a host wraps `Playground` with a navbar.

### Changed

- **No implicit `height`/`width: '100%'` default on playground mounts**: The previous default did not resolve inside parents that only set `min-height` (e.g. Drupal admin chrome under `.fd-fullscreen-layout`), collapsing the playground to zero. Hosts that need an inline size must now pass one explicitly via the `height` / `width` options; hosts that already size the container via CSS no longer have it overwritten. If you previously relied on the implicit cascade, pass `height: '100vh'` (or your desired value) when calling `mountPlayground` / `mountPlaygroundStudio` / `mountPlaygroundApp`.

## [1.10.0] - 2026-05-10

### Added

- **`PlaygroundStudio` component**: A drop-in split-pane component that combines `PipelinePanel` and `Playground` side by side — the same layout as the demo app, available as a single import. Accepts a `minChatWidth` prop (CSS-var backed, default 760 px).
- **`mountPlaygroundStudio()`**: Vanilla JS / framework-agnostic mount function for the split-pane layout, alongside a matching `PlaygroundStudioMountOptions` type. Mirrors `mountPlayground` so host apps can embed the integrated experience without Svelte.
- **Missing pipeline exports from 1.9.0**: `PipelinePanel`, `ExecutionList`, `PlaygroundExecution`, `getActiveExecutionId`, `getPinnedExecutionId`, `getLatestExecutionId`, `getPipelinePanelOpen`, and `pipelinePanelActions` are now all exported from the `@flowdrop/flowdrop` and `@flowdrop/flowdrop/playground` entry points.
- **`source` field on playground messages**: `PlaygroundMessageMetadata` gains an optional `source?: string` property so the subsystem that produced a message (e.g. `'pipeline'`, `'job'`, `'cron'`) can be identified. Rendered as a small pill badge before the node label in log rows and before the text in compact system notices.
- **Refresh button and `flowdrop:refresh-status` DOM event**: A Refresh button in the playground header triggers an immediate fetch of the latest messages and resumes polling if it had stopped. Host applications can also dispatch `flowdrop:refresh-status` on the mount container to trigger the same action programmatically.
- **Sequence-number polling cursor**: Incremental message fetches now use `?since=<sequenceNumber>` instead of a timestamp, matching the `PlaygroundMessage.sequenceNumber` field in the OpenAPI spec. `getLastSequenceNumber()` is exposed from `playgroundService`; `getLatestSequenceNumber()` and `getLastPollSequenceNumber()` from `playgroundStore`. `startPolling` accepts an optional `initialSequenceNumber` seed to avoid a full re-fetch on restart.
- **Automatic pipeline panel refresh**: When following the latest run (not pinned to a historical execution), the pipeline panel re-fetches pipeline data from the server on every incoming message batch. Pinned historical runs are unaffected. The panel also auto-clears the pin when a new execution is detected in incoming messages, or when the user sends a new message.
- **`PlaygroundMessagesPagination` type**: Exported from both `@flowdrop/flowdrop/playground` and the core index.
- **`getCanSendMessage()`**: New store helper that combines `isExecuting`, `awaitingInput`, and no-active-session guards into a single predicate for the send button and `handleSend`.

### Fixed

- **Automatic pagination of `getMessages`**: `playgroundService.getMessages` now follows pagination automatically — it fetches pages of 100 until `pagination.has_more` is false, then returns all messages merged. Previously only the first page was returned when a session had many messages. Also corrects `PlaygroundMessagesApiResponse` to match the actual server shape where pagination is nested under `pagination: { has_more, total, limit, offset }` rather than a top-level `hasMore` field.
- **Pipeline run picker status icon after completion**: Execution entries were stuck at `'running'` indefinitely because `updateSessionStatus()` only promoted them to `'completed'` on `'completed'` or `'failed'` — but the server returns `'idle'` when a pipeline finishes normally. `'idle'` is now mapped to `'completed'` in the `PlaygroundExecution` entry.
- **Node statuses in pipeline panel after HITL resolution**: `WorkflowEditor` accepted a `nodeStatuses` prop but never applied it, so Confirmation and Chat Output nodes remained in their pre-interrupt visual state after an interrupt resolved (since `loadNodeExecutionInfo` only fires on `pipelineId` change). A new `$effect` watches `props.nodeStatuses` and maps values onto `flowNodes[*].data.executionInfo` directly from the data already fetched by `PipelineStatus.fetchPipelineData()`.
- **Execution ID detection from interrupt metadata**: The server no longer stamps `executionId` on user messages — it now arrives only as `metadata.execution_id` (snake_case) inside interrupt messages. `syncExecutionsFromMessages` falls back to that field so new runs are correctly detected and the pipeline panel switches to the right run.
- **`PlaygroundStudio` refresh trigger**: `PlaygroundStudio` was passing `refreshTrigger={getMessages().length}` (a stale approach) instead of `getPipelineRefreshTrigger()`, which applies the pinned-vs-latest guard. Aligned with the fix already in `+page.svelte`.
- **`isExecuting` / `isPolling` desync**: `isExecuting()` was reading `playgroundService.isPolling()`, which returns `true` whenever a polling loop is active — including during `awaiting_input` when `_isExecuting` is `false`. It now reads `getIsExecuting()` from the store, which is derived from `_currentSession.status === 'running'`, so the two cannot desync. The stop button and send button guards are updated accordingly.
- **State machine edge cases**: `loadSession` seeds the polling timestamp and uses `applyServerResponse`; `handleSelectSession` resets status to `idle` before loading the next session; `handleSendMessage` guards with `getIsExecuting()` and resets to `idle` on error; `handleStopExecution` resets status in the catch block; `handleInterruptResolved` restarts polling and sets executing if the server resumed. A `visibilitychange` listener triggers an immediate catch-up fetch when the user returns to the tab.
- **Concurrent session loads**: `loadedInitialSessionId` is assigned before the first `await` in `loadInitialSession`, making the `$effect` guard visible synchronously and preventing a second concurrent load when reactive dependencies change mid-load.
- **Intra-batch message duplicates**: `addMessages` now deduplicates against the incoming batch itself (not only existing messages), preventing `each_key_duplicate` errors when the server returns the same message ID twice in one response.
- **Scroll to bottom on new messages**: Scroll anchor now fires reliably when new messages arrive, fixing cases where the message list did not scroll to the latest entry.
- **Log row icon alignment**: Icons in playground log rows are now vertically centered.

### Changed

- **Pipeline selector shows execution ID, not "Run #N"**: The pipeline chip and run picker popover now display the raw execution ID in a monospace truncated format. The `runLabel` prop is removed from `PipelineStatus`; it receives `pipelineId` directly as its label. `PlaygroundStudio` and the page component no longer need to compute a run label.
- **Pipeline refresh trigger moved into the store**: `applyServerResponse` now owns the `_pipelineRefreshTrigger` counter and increments it whenever a message batch arrives while following latest. Consumer pages call `getPipelineRefreshTrigger()` and pass it to `PipelinePanel`.

## [1.9.0] - 2026-05-09

### Added

- **Integrated pipeline view in the playground**: A toggleable side panel displays a live embedded pipeline canvas alongside the chat. The panel can be shown or hidden via a pipeline toggle in the session header, without leaving the playground.
- **Resizable pipeline panel**: Users can drag the separator between the pipeline panel and the chat panel to adjust the split to their preference.
- **Run picker and "latest" toggle in the pipeline panel header**: Select a specific run to inspect directly from the panel, or pin to the latest run automatically.
- **Session chip dropdown in standalone playground**: Replaces the previous sidebar with a compact chip that opens a dropdown for switching sessions, reducing visual clutter.
- **Global skin token propagation**: Skin design tokens are now applied from the top-level app layout so all embedded views inherit the correct theme.

### Fixed

- **Pipeline panel canvas height**: The embedded canvas now fills the panel correctly instead of expanding to `100vh`, which previously caused the panel to overflow the viewport.
- **Pipeline toggle icon**: Corrected to `mdi:source-branch` to match the icon used in the Pipelines navigation item.

### Changed

- **Session routing**: Playground sessions now navigate via dedicated URL segments for cleaner, bookmarkable URLs.
- **Pipeline and Logs toggles moved to session header**: Both controls now live beside the session title rather than being split across the navbar and chat panel.
- **Edit workflow link moved to navbar**: Relocated from the chat header for more consistent top-level navigation.
- **Playground layout**: Pipeline panel is now in the middle column; chat panel is on the right.
- **Log display**: Log entries replaced with compact terminal-style rows for denser, more readable output.
- **Chat bubble design**: Modernized visual treatment with updated typography and spacing.
- **Pipeline run chip label**: The current run label is always visible in the pipeline chip regardless of pin state.
- **Design tokens**: Hardcoded colour and sizing values in the playground replaced with `--fd-*` design tokens. Pipeline panel and embedded canvas use `--fd-muted` background.

## [1.8.1] - 2026-04-28

### Fixed

- **AI Assistant freeze on corrupted batches with unclosed `"""`**: When a low-quality LLM emitted a multiline `set` value that opened `"""` without a matching closing `"""` on its own line, `extractCommands` silently swallowed everything from the opener through end-of-input. Surviving commands referenced nodes whose `add` had been eaten, failing with `NODE_NOT_FOUND` and triggering up to three auto-retry round-trips that locked the chat input behind `isLoading`. The dangling buffer is now flushed as a (broken) command at end-of-input, the parser flags it with a clear `Unclosed """ block` error, and `handleApproveCommands` skips the auto-retry cascade when the batch already contained a parse error.

## [1.8.0] - 2026-04-28

### Added

- **`clearAllDrafts()` API**: New method on the mounted `MountedFlowDropApp` instance and as a standalone export from `@flowdrop/flowdrop/editor`. Removes every `localStorage` key beginning with `flowdrop:draft:` (plus the configured `draftStorageKey`, when called via the instance). Intended for host applications to call from their logout handler so workflow drafts do not persist across user sessions on shared browser profiles.
- **Typed, overridable messages system (i18n)**: Every user-facing label, tooltip, placeholder, and notice in the library is now rendered from a single typed `Messages` tree. Pass `messages` to `<FlowDrop>` (a `DeepPartial<Messages>` value or a callback returning one) to override any subset; missing keys fall through to the English defaults. Reactive overrides (paraglide-js, sveltekit-i18n, or any reactive store) propagate locale changes into FlowDrop without a subscription. New public exports from `@flowdrop/flowdrop`: `defaultMessages`, `mergeMessages`, `setMessages`, `getMessages`, `m`, plus the `Messages` and `MessagesOverride` types. Components used outside the `<FlowDrop>` provider fall back silently to English.

### Changed

- **"AI Chat" renamed to "AI Assistant"**: The bottom-panel tab label, panel notice, settings entry ("AI Assistant Auto-retry"), and aria-label now read "AI Assistant" to better reflect the panel's role as a workflow-building assistant rather than a generic chat. Internal component names, CSS classes, and the underlying `chat` settings/storage keys are unchanged, so no host-side migration is required.

### Deprecated

- **Per-component label props in favour of `messages`**: `SchemaForm`'s `saveLabel` / `cancelLabel`, `FormToggle`'s `onLabel` / `offLabel`, `FormArray`'s `addLabel`, and `AIChatPanel`'s `placeholder` keep working but emit a one-shot dev-mode `console.warn`. They will be removed in v2.0. Replace each with the corresponding key under `messages` (see the i18n guide for the mapping table). Workflow-level overrides on interrupt configs (`config.confirmLabel`, `config.acceptAllLabel`, etc.) are **not** deprecated — those are runtime data from the workflow author, not component-prop API.

### Fixed

- **Minimap visually distinct from canvas**: The MiniMap defaulted to `--fd-card`, which is identical to `--fd-background` in light mode, causing users to click and drag on it mistaking it for the canvas. The minimap background now uses `--fd-muted`, node fill uses `--fd-muted-foreground` for contrast in both light and dark modes, and the panel renders with a border, rounded corners, and a shadow so it reads as a floating overlay.
- **Markdown editor strings reconfigure on locale change**: `FormMarkdownEditor`'s placeholder and content `aria-label` live inside CodeMirror, which sits outside Svelte's reactivity graph. They now reconfigure via dedicated `Compartment`s when the consumer's locale changes, so translated copy reaches the editor without a remount.

### Performance

- **Identity-preserving message merge**: `mergeMessages` now lazy-allocates — when override leaves are `===` to the corresponding base values (the common case for paraglide-style overrides where `p.save()` returns the same `'Save'` string each call thanks to JS string interning), the base reference is returned unchanged at every level it applies. Stops downstream `$derived(m().branch)` reads in components from invalidating on every parent re-render when the consumer passes an inline `messages={{...}}` literal whose contents are stable but whose outer identity churns.
- **Hoisted `m()` branch reads**: Components that read the same `m().branch.*` repeatedly per render now pull the branch into a single `$derived` at the top of the script — one getter walk per render instead of N×M. Covers Navbar, NodeStatusOverlay, FormArray, all interrupt prompts, AIChatPanel, CommandPreview, ChatPanel, SessionManager, NotesNode, and the per-port `aria-label`s inside `WorkflowNode` / `GatewayNode` `{#each}` loops, plus FormAutocomplete and FormPrompt.

### Documentation

- **Logout integration recipe**: `auto-save-and-drafts.md` now documents that drafts persist in `localStorage` until explicitly cleared and shows the recommended `clearAllDrafts()` integration pattern.
- **i18n & Custom Messages guide**: New `apps/docs` page covering the `messages` prop, the `Messages` shape by domain, the paraglide-js wiring recipe, and the migration table from deprecated label props.

## [1.7.0] - 2026-04-10

### Added

- **`workflowSettingsSchema` prop**: Pass a `ConfigSchema` to the `App` component to inject additional fields into the Workflow Settings panel. Values are persisted in a new `workflow.config` field and round-trip correctly through load/save.

### Fixed

- **CodeEditor JSON string preservation**: External value updates to a `CodeEditor` field no longer strip quotes from JSON string values.
- **`workflowSettingsSchema` reserved name collision**: Consumer-supplied schema properties that shadowed built-in workflow fields (`name`, `description`, `format`) would silently overwrite the schema definition and produce a broken settings panel. Colliding keys are now filtered out and a warning is logged.
- **Port preservation on mount**: `App` no longer reinitialises the port compatibility checker when one has already been set, preserving custom port configs in SvelteKit route usage.
- **SimpleNode description fallback removed**: Nodes without a description no longer render a placeholder `"A configurable simple node"` paragraph.

### Refactored

- **Port compatibility init check**: Replaced try/catch-as-sentinel pattern with an explicit `isPortCompatibilityInitialized()` predicate, making the intent clear and reserving exceptions for genuinely unexpected conditions.

## [1.6.0] - 2026-04-08

### Added

- **Progressive command execution**: AI chat apply flow executes each command with a 100 ms inter-command delay so canvas updates are visually distinct. `executeBatch` is now async with an optional `delayBetweenMs` option; undo still covers the entire batch as a single transaction.
- **Command preview feedback states**: After clicking Apply, preview buttons are replaced with "Applying…" (spinning) then "Applied" (green). After Cancel, replaced with "Dismissed" (muted). The preview block stays mounted in both cases so chat history shows what was actioned.
- **AI response markdown rendering**: Assistant messages in the AI Chat panel are rendered as sanitised markdown instead of plain text.
- **Auto-retry on batch command failure**: When AI-generated commands fail, the panel automatically sends a structured error report back to the LLM (up to 3 attempts) so it can self-correct. Retry notices render as muted "Auto-retrying (attempt N/3)…" spinners, keeping raw error context out of the visible conversation. Controlled by a new `chatAutoRetry` setting in `BehaviorSettings` (default: `true`).

### Fixed

- **Triple-quote multiline parsing**: `chatResponseParser` and the commands parser now correctly handle triple-quoted (`"""`) multi-line strings in DSL blocks, preventing premature block truncation.

## [1.5.0] - 2026-04-03

### Added

- **Node swap**: Users can replace a node with a different node type while preserving connections and configuration. A three-pass port matching algorithm maps ports by name, type, and direction, carrying over compatible config values automatically.
- **Swap UI components**: New `NodeSwapPicker`, `SwapMappingEditor`, and `SwapConfirmBar` components with full skin-aware theming support for both default and minimal themes.
- **Swap store integration**: `workflowStore.swapNode()` action with `onBeforeSwap` and `onAfterSwap` event hooks, plus JSON schema support for swap configuration validation.
- **Interrupt prompt previews**: Human-in-the-Loop documentation now includes live interrupt prompt previews.
- **Command console**: A DSL-driven command console lets users control the canvas via typed commands — add/delete nodes, connect ports, rename, get/set config, undo/redo, select, move, swap, and auto-layout. Toggle with a toolbar button or keyboard shortcut.
- **Command autocomplete**: Context-aware autocomplete suggests command verbs, node type IDs, live node IDs, port names, and config keys as the user types.
- **Command history**: Up/Down arrow keys navigate previously executed commands within the session.
- **Multi-line paste execution**: Pasting multiple lines into the console executes each line as a separate command in sequence.
- **Rich console output**: Command results are formatted with colour-coded status, structured tables for `list`, and inline node/port detail for `info`.
- **Canvas commands**: `canvas fitview`, `canvas zoom <level>`, `canvas pan <x> <y>`, and `canvas reset` control the viewport from the command line.
- **Layout command**: `layout beautify` normalises node spacing across the canvas using dimension-aware auto-layout with increased horizontal distance (120 px).
- **AI Chat panel**: A bottom-panel chat UI sends natural-language prompts to a configurable backend chat endpoint. The assistant's response is parsed for embedded FlowDrop DSL command blocks, which are previewed and can be applied to the canvas in one click.
- **CommandPreview component**: Displays extracted DSL commands from an AI response with accept/cancel controls before they are executed.
- **Bottom panel tab system**: Extensible tab bar at the bottom of the canvas hosts the AI Chat panel and future panels.
- **Chat API service**: Typed `chatService` wraps the chat endpoint; `chatResponseParser` and `commandClassifier` are independently unit-tested.
- **MSW mock handlers**: Development and test mock handlers for the chat API endpoints ship with the library.
- **OpenAPI spec for chat endpoints**: `libs/flowdrop/api/v1/paths/chat.yaml` documents the chat request/response contract.
- **`COMMAND_HELP` export**: Machine-readable command help is exported for use by backend LLM prompts.
- **DSL prompts**: `dsl-system-prompt.md` and `dsl-llm-prompt.md` ship as reference material for integrating the FlowDrop DSL with LLM backends.

### Fixed

- **Reactive derivations**: Replaced `$derived(() => { ... })` block-style pattern with `$derived.by(() => { ... })` across components, fixing Svelte 5 reactivity warnings.
- **Sidebar search**: Eliminated duplicate filter pass in node sidebar search; now uses a plain `Set` for deduplication.
- **Cycle detection**: Cycle detection in the graph editor is cached as a `$derived` with an FSM guard, preventing redundant recomputation on unrelated state changes.

### Performance

- **Version counter dirty detection**: Replaced JSON snapshot comparison in workflow stores with an integer version counter, eliminating per-keystroke serialisation overhead.
- **`structuredClone` for history snapshots**: History snapshots now use `structuredClone` instead of `JSON.parse(JSON.stringify(...))`, cutting snapshot time roughly in half.
- **Proximity type cache**: Compatible-types lookup in the proximity connection helper is cached per `dataType` for the duration of a drag, avoiding repeated linear scans.
- **Insertion sort for playground messages**: Single-message additions to the playground message list use insertion sort rather than a full re-sort.
- **Pending interrupt count**: Pending interrupt count is derived with a counter loop rather than `.filter().length`, avoiding an intermediate array allocation.
- **Bezier path deduplication**: Redundant bezier path calculation on the edge renderer is eliminated; the result computed for rendering is reused for arrowhead positioning.
- **Edge style node lookup**: Edge style helper uses a `Map` lookup instead of `.find()` on every render, reducing per-edge cost from O(n) to O(1).
- **Port coordinate batch updates**: `portCoordinateStore` batches `SvelteMap` writes so subscribers receive a single notification per layout pass instead of one per port.

## [1.4.0] - 2026-03-16

### Added

- **Settings modal customization**: `mountFlowDropApp` now accepts `settingsTitle`, `settingsDescription`, and `settingsFields` options, allowing vanilla JS consumers to customize the settings modal without Svelte.
- **Themeable logo**: Logo colors are now driven by skin tokens (`--fd-logo-*`), adapting automatically to light/dark themes.
- **Themeable xyflow controls**: SvelteFlow Controls and MiniMap components now inherit colors from skin tokens instead of using hardcoded defaults.
- **Sidebar collapse**: Sidebar collapses fully to zero width with a floating canvas toggle button, freeing more canvas space.
- **Dynamic ports for all node types**: SimpleNode and SquareNode now support `config.dynamicInputs` and `config.dynamicOutputs`, allowing users to add custom input/output ports at runtime via the config form. Previously only WorkflowNode rendered dynamic ports.

### Fixed

- **Arrowhead alignment**: Edge arrowheads now use the exact bezier derivative at the endpoint for rotation, eliminating subtle misalignment on curved edges.
- **Navbar overflow**: Action buttons remain accessible on small screens; breadcrumbs compact to icon-only at narrow widths.
- **Storybook warnings**: Resolved `svelte-check` warnings in EdgeDecorator story and fixed incorrect `iconName` prop usage in CanvasBanner story.

### Changed

- **Sidebar header**: Removed redundant "Components" header from the node sidebar.
- **Navbar layout**: Responsive navbar now uses icon-only breadcrumbs and a compact logo on smaller viewports.

### Internal

- Converted codebase from tabs to 2-space indentation.
- Regenerated workflow JSON schema.
- Documented `SettingsPanel` and `SettingsModal` component props with vanilla JS usage examples.

## [1.3.0] - 2026-03-15

### Added

- **Port ordering**: `portOrder` field on `NodeUIExtensions` lets consumers define a custom display order for ports on WorkflowNode, SimpleNode, and SquareNode.
- **Manual port hiding**: `hiddenPorts` field on `NodeUIExtensions` allows specific ports to be explicitly hidden by ID, complementing the existing "hide unconnected ports" setting.
- **All-ports display**: SimpleNode and SquareNode now render all ports by default. The previous heuristic that limited display to at most one data port and one trigger port per side has been removed.
- **Shared port utilities**: `getPortTop` and `isPortVisible` extracted as pure, tested utilities in `portUtils.ts`, eliminating duplicated positioning and visibility logic across node components.

### Changed

- **SimpleNode**: Port rendering now uses `applyPortOrder` and iterates the full port list, matching the behavior already present in WorkflowNode and GatewayNode.
- **SquareNode**: Port rendering aligned with SimpleNode — all ports are visible by default, `portOrder` and `hiddenPorts` are respected, and node height is derived dynamically from the visible port count.

### Internal

- Replaced `$derived(() => fn())` getter anti-pattern with `$derived(fn())` across WorkflowNode, SimpleNode, and SquareNode.
- Added unit tests for `getPortTop` and `isPortVisible` (34 tests passing).

## [1.2.2] - 2026-03-13

### Fixed

- **Drag freeze**: Dragging a node caused the browser to freeze when proximity connect was enabled. A reactive `SvelteMap` was being iterated inside a Svelte 5 `$effect`, then mutated in the same call — creating an infinite reactive loop. Both `updateNodePortCoordinates` and `removeNodePortCoordinates` in the port coordinate store now wrap the read with `untrack()` to break the dependency.

## [1.2.1] - 2026-03-13

### Fixed

- **Icon theming**: Canvas banner icon color now uses `muted-foreground` so it adapts correctly in both light and dark themes instead of rendering as a fixed dark color.
- **Sidebar empty state**: Replaced emoji characters in the "No node types available" message with inline SVGs, fixing rendering inconsistencies across platforms. Loading spinner now correctly clears when the node types fetch returns an empty result (was already fixed for failed fetches in 1.2.0, this patch covers the empty-response path too).

## [1.2.0] - 2026-03-13

### Changed

- **`theme` in mount API**: `mountFlowDropApp` now accepts a `theme` field in `FlowDropMountOptions`, exposing the theme system introduced in 1.1.0 through the JS embed API. Callers can pass a named theme (`'default'` | `'minimal'`) or a custom `FlowDropTheme` object without relying on persisted user settings.

### Fixed

- **Empty canvas banner on mobile**: The "Drag components here" banner was hidden behind the sidebar on screens ≤ 768 px (where the sidebar overlays the canvas). The banner now offsets left by the sidebar width so it centers within the visible canvas area.
- **Persistent loading spinner**: The sidebar spinner continued spinning indefinitely when the node types fetch failed or returned an empty result. It now clears once the request completes, showing the "No node types available" message instead.

## [1.1.0] - 2026-03-12

### Added

- **Theme system**: New `theme` prop on `<App>` accepts a built-in theme name (`'default'` | `'minimal'`) or a custom `FlowDropTheme` object. Themes bundle a visual skin (CSS tokens) with behavioral UI config defaults.
- **Skin system**: New `FlowDropSkin` type with `tokens` (light/base) and `darkTokens` (dark mode overrides), enabling full light/dark palette control per theme. Built-in skins: `'default'` and `'slate'`.
- **Built-in themes**: `'default'` (preserves original behavior) and `'minimal'` (dark slate palette with flat sidebar layout, matching the flowdrop.io demo).
- **CSS display tokens**: New `--fd-*` tokens to toggle UI variants without custom CSS — `sidebar-header-display`, `sidebar-search-display`, `sidebar-card-display`, `sidebar-flat-display`, `node-icon-display`, `node-circle-display`.
- **Flat sidebar layout**: Sidebar can now render nodes as a compact dot+name list (controlled via `--fd-sidebar-flat-display` / `--fd-sidebar-card-display` tokens).
- **`UISettings.theme` field**: Persisted user preference for the active theme (`'default'` | `'minimal'`). Existing settings without this field default to `'default'`.
- **`NodeSidebar.categoriesDefaultOpen` prop**: Controls whether category accordions start expanded in card mode.
- **New exported types**: `FlowDropTheme`, `FlowDropThemeName`, `FlowDropSkin`, `FlowDropSkinTokens`, `FlowDropSkinName`.

### Changed

- **Navbar action rendering**: `primaryActions` are now rendered exclusively through a split-button/dropdown. Previously the first action was rendered as a separate standalone button — consumers who relied on that distinct visual treatment will see a layout change.
- **Sidebar default layout**: The minimal/slate theme uses a flat list layout instead of the accordion card layout. The default theme is unchanged.

### Internal

- Removed JavaScript-based skin logic from `NodeSidebar` in favour of CSS token control.
- Theme resolution handles named base + inline token merging (e.g. `{ name: 'minimal', skin: { tokens: { primary: '#e11d48' } } }`).

## [1.0.1] - 2026-03-11

### Fixed

- **Edge rendering**: Shortened edge paths to terminate at the arrow base instead of the tip, preventing visual overshoot at connection points
- **Duplicate workflow saves**: Fixed a bug where backends using UUIDs as primary keys would always receive `POST` instead of `PUT` on save, causing duplicate workflows to be created on every save. The fix detects existing workflows by the presence of an `id` field rather than matching a UUID regex pattern ([#26](https://github.com/flowdrop-io/flowdrop/issues/26))

### Internal

- Added unit tests for `globalSaveWorkflow` covering both legacy and enhanced client paths
- Added E2E regression test for the UUID-based workflow save behavior

## [1.0.0] - 2026-03-11

First stable release of `@flowdrop/flowdrop`. This marks the library as production-ready after extensive development during the 0.0.x series under the `@d34dman/flowdrop` namespace. See [previous changelog](CHANGELOG-pre-1.0.0.md) entries for detailed history of features, fixes, and breaking changes.
