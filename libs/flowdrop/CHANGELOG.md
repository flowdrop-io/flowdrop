# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
