# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.55] - 2026-02-11

### Fixed

- **Proximity connect for already-connected ports**: Allow proximity connect to consider input ports that already have existing connections, enabling multiple edges to the same port

## [0.0.54] - 2026-02-11

### Added

- **Port Coordinate Store**: New port coordinate store enables port-to-port proximity connect, replacing node-center-based distance calculations with precise port position tracking

### Fixed

- **Port compatibility checker initialization**: Initialize port compatibility checker in App.svelte for SvelteKit routes, ensuring compatibility checks work on first load

### Performance

- **Optimized proximity connect**: Skip incompatible port pairs early during proximity connect, reducing unnecessary distance calculations
- **Debounced port coordinate rebuilds**: Debounce full port coordinate rebuilds during bulk position updates (e.g. layout changes), preventing redundant recalculations

### Chore

- Removed stale "Removed" comments from component files
- Removed unused deprecated code from interrupt store and port config

## [0.0.53] - 2026-02-10

### Added

- **Configurable portDataType for ToolNode**: ToolNode can now expose a port type other than `"tool"` via `metadata.portDataType`, enabling repurposing with a custom badge and matching port type (e.g. `"trigger"`)
- **hideUnconnectedHandles for TerminalNode**: TerminalNode now supports filtering port visibility via `extensions.ui.hideUnconnectedHandles`, matching existing behavior in WorkflowNode/SimpleNode/SquareNode

### Fixed

- **Unified theme management**: Removed deprecated `themeStore` and unified all theme state through `settingsStore`, fixing SvelteFlow and form components not reflecting theme changes
- **Auth provider propagation** (issue #21): Both ConfigForm instances in App.svelte (workflow settings and node config) now receive the `authProvider` prop, fixing unauthenticated autocomplete requests
- **ConfigForm toggle propagation**: The `hideUnconnectedHandles` toggle now calls `handleFormBlur()` on change, ensuring immediate propagation to node data

## [0.0.52] - 2026-02-07

### Added

- **Extensible Category System**: `NodeCategory` is now an open string type, allowing custom categories beyond the built-in set
  - Built-in categories remain available as typed suggestions via `BuiltinNodeCategory`
  - New `/categories` API endpoint returns category metadata (name, label, icon, color, weight)
  - Categories are fetched at initialization and stored in a Svelte store with built-in defaults as fallbacks
  - New `defaultCategories` config provides built-in category definitions with icons, colors, and sort weights
  - `NodeSidebar` now derives grouping from the categories store instead of hardcoded logic

## [0.0.51] - 2026-02-06

### Added

- **Proximity Connect**: Auto-connect compatible ports when dragging nodes near each other
  - Adds `proximityConnect` and `proximityConnectDistance` editor settings
  - Shows preview edges with animated dashed styling before connection is made
  - Dynamic port lookup for proper edge styling on newly created connections
- **Configurable Tool Node Badge**: The "TOOL" header badge on tool nodes can now be customized per node type or per instance
  - Add `instanceBadge` config and `metadata.badge` support for custom badge labels
- **Settings Sub-module**: New `@d34dman/flowdrop/settings` sub-module exporting settings stores, services, types, and components (`ThemeToggle`, `SettingsPanel`, `SettingsModal`)

### Changed

- **Remove Duplicate Theme Exports**: Removed theme re-exports (`theme`, `resolvedTheme`, `setTheme`, `toggleTheme`, `cycleTheme`, `initializeTheme`) from `settingsStore` to eliminate build warnings — these are already exported from core via `themeStore`

## [0.0.50] - 2026-02-06

### Fixed

- **Programmatic Store Sync**: Programmatic calls like `addEdge()`, `updateEdges()`, and `updateNode()` now immediately re-render in SvelteFlow
  - Previously, these calls updated the workflow store but SvelteFlow did not re-render because the sync effect only triggered on workflow ID changes
  - Now tracks editor-originated writes via reference equality so external store mutations are detected and propagated to SvelteFlow's local state

---

- [Changelog 0.0.1 -- 0.0.49](CHANGELOG-0.0.1--0.0.49.md)
