# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.61] - 2026-02-22

### Added

- **`awaiting_input` session status**: New `awaiting_input` value in `PlaygroundSessionStatus` for human-in-the-loop flows where the runtime is waiting for user input
- **Configurable polling lifecycle hooks**: `shouldStopPolling` and `isTerminalStatus` hooks on `PlaygroundConfig` let consumers customize which statuses stop polling and clear the executing state, with exported defaults (`defaultShouldStopPolling`, `defaultIsTerminalStatus`)
- **`startPolling()` on MountedPlayground**: Resume polling after it stops (e.g., on `awaiting_input`), without needing to re-execute the workflow
- **`pushMessages()` on MountedPlayground**: Push poll responses directly into the store pipeline, enabling custom transports (WebSocket/SSE) as an alternative to built-in polling
- **`onSessionStatusChange` callback**: New mount option that fires whenever the session status changes, providing both new and previous status values

### Changed

- **`createPollingCallback` factory**: Extracted a single `createPollingCallback()` factory in `playgroundStore` as the source of truth for poll response processing (addMessages, updateSessionStatus, setExecuting), replacing duplicated callback logic across `mount.ts`, `Playground.svelte`, and the store

## [0.0.60] - 2026-02-22

### Fixed

- **App component standalone usage**: Removed `$page` store dependency from the library `App` component, making it usable outside SvelteKit route contexts (e.g. embedded in external apps)
- **Empty editor state**: App now initializes a default empty workflow when none is provided, ensuring drag-and-drop and other editor features work without an explicit `initialWorkflow` prop
- **Header visibility in edit page**: Simplified `showHeader` logic in `App` by removing URL-based check; edit page now passes `showNavbar=false` directly to avoid redundant header rendering

## [0.0.59] - 2026-02-21

### Fixed

- **Schema import paths in dist output**: Moved `schemas/` into `src/lib/` so svelte-package correctly rewrites `$lib` alias to relative paths — previously dist output escaped the package boundary
- **README images on npmjs.com**: Replaced relative image paths with absolute `raw.githubusercontent.com` URLs so images render on the npm package page

## [0.0.58] - 2026-02-19

### Added

- **CodeMirror 6 Markdown Editor**: Replaced EasyMDE with CodeMirror 6 for the markdown form editor, bringing improved performance and modern editing capabilities
- **Versioned JSON Schema**: Added JSON Schema for the workflow format with generation script (`schema:generate`, `schema:check`) and published under `@d34dman/flowdrop/schema`
- **Pluggable Workflow Format System**: New `WorkflowFormatRegistry` enabling third-party workflow format plugins with sidebar filtering support
- **Example Apps**: Added example Svelte client and Express server demonstrating FlowDrop integration

### Changed

- **Monorepo Conversion**: Restructured project as a pnpm monorepo with `libs/flowdrop` as the core library and separate `apps/` for examples, docs, and API docs
- **`nodeTypeRegistry` renamed to `defaultNodeTypes`** (breaking): Clearer naming for the default node type definitions; removed Agent Spec deprecation shims
- **Class-based Registries**: Introduced `BaseRegistry` base class and migrated `FieldComponentRegistry`, node component registry, and workflow format registry to class-based pattern
- **Decoupled Agent Spec Adapter**: Extracted hardcoded node definitions into `componentTypeDefaults`, making the adapter configurable

## [0.0.57] - 2026-02-15

### Added

- **Agent Spec Integration**: Full support for [Oracle Open Agent Spec](https://github.com/oracle/agent-spec) import/export
  - TypeScript types mirroring the Agent Spec format (nodes, edges, flows, tools, agents, LLM configs)
  - Node type registry mapping all 9 Agent Spec node types to FlowDrop node metadata with visual type, category, ports, config schemas, and icons
  - Bidirectional adapter converting between FlowDrop's unified edge format and Agent Spec's control-flow/data-flow split
  - Auto-layout for imported flows (Agent Spec has no position data)
  - Agent Spec constraint validation
  - Runtime execution service for connecting to WayFlow/PyAgentSpec runtimes with status polling, result retrieval, and cancellation
  - Endpoint configuration and auth headers for Agent Spec runtimes
  - `exportAsAgentSpec()` and `importFromAgentSpec()` on WorkflowOperationsHelper
  - OpenAPI 3.0.3 definitions for Agent Spec schemas and 12 new endpoints
- **Collapsible Fieldset and Field Group via UISchema**: New UISchema system (inspired by JSON Forms) for controlling form field layout and grouping in ConfigForm and SchemaForm
  - Separates presentation concerns from the data schema
  - New element types: `VerticalLayout`, `Group` (with collapsible support), and `Control` (with JSON Pointer scope)
  - Groups render as collapsible fieldsets using the existing `.flowdrop-details` CSS pattern

## [0.0.56] - 2026-02-11

### Fixed

- **Proximity connect ignoring tool ports**: Added missing `tool` dataType to the default port configuration, enabling proximity connect to match tool-to-tool port pairs

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
