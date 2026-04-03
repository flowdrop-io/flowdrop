# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
