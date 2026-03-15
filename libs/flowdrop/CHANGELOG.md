# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
