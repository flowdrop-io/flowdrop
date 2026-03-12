# Changelog pre 1.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

---

## [1.0.0] - 2026-03-07

First stable release of `@d34dman/flowdrop`. This marks the library as production-ready after extensive development during the 0.0.x series. See previous changelog entries for detailed history of features, fixes, and breaking changes.

## [0.0.65] - 2026-03-07

### Fixed

- **Svelte 5 migration**: Migrated `ConfigModal` and `LogsSidebar` from `createEventDispatcher` to callback props
- **Type error**: Removed unused snippet causing `svelte-check` type error
- **Reactivity bug**: `NodeStatusOverlay` and `StatusIcon` now use `$derived` for props-derived values (`position`, `size`, `showDetails`, `config`) so they correctly update when props change
- **Svelte warnings**: Suppressed 25 intentional `state_referenced_locally` warnings for component-owned state initialized from props (form defaults, draggable dimensions, one-time config, SvelteKit page data)

### Changed

- Regenerated workflow JSON schema

### Security

- Updated dependencies and added `cookie` override to address known vulnerability

---

## [0.0.64] - 2026-03-06

### Breaking Changes :warning:

- **Removed `variableSchema` prop**: FormTemplateEditor no longer accepts the deprecated `variableSchema` prop. Use `variables.schema` instead.
- **Removed `options` field from FieldSchema**: The deprecated `options` property on field schemas has been removed. Use JSON Schema `oneOf` with `const`/`title` for labeled select options.
- **CodeMirror moved to optional peer dependencies**: `@codemirror/*` packages are now optional peer dependencies. If you use `form/code` or `form/markdown` modules, install CodeMirror packages in your project.

### Upgrade Notes

> If you are upgrading from **0.0.x**, please review the following:
>
> 1. **`variableSchema` to `variables.schema`** -- Replace `variableSchema={schema}` with `variables={{ schema }}` on FormTemplateEditor.
> 2. **`options` to `oneOf`** -- Replace `options: [{ value: "x", label: "X" }]` with `oneOf: [{ const: "x", title: "X" }]` in your field schemas.
> 3. **CodeMirror installation** -- If you import from `@d34dman/flowdrop/form/code` or `@d34dman/flowdrop/form/markdown`, add CodeMirror to your dependencies: `npm install codemirror @codemirror/state @codemirror/view @codemirror/commands @codemirror/language @codemirror/theme-one-dark @codemirror/autocomplete @codemirror/lang-json @codemirror/lang-markdown @codemirror/lint`

### Added

- Unit tests for historyService, autoSaveService, interruptService, playgroundService, nodeExecutionService, dynamicSchemaService, variableService, agentSpecExecutionService
- Prominent single-instance warning in README quickstart section

### Changed

- Wildcard exports in core, editor, and form modules replaced with explicit named exports for better documentation tooling
- Deprecated API cleanup: removed `variableSchema` prop and legacy `options` field

### Fixed

- **`@xyflow/svelte` dependency classification**: Moved from `dependencies` to `peerDependencies` and `devDependencies` — consumers must now install it directly, avoiding version conflicts
- **App component lifecycle**: Added error handling to `onMount` and removed a dead workflow reactive effect that could cause unnecessary re-runs
- **Navbar and PipelineStatus lifecycle**: Replaced Svelte 4 `onDestroy` patterns with `$effect` cleanup for correct Svelte 5 lifecycle management

### Docs

- Removed `console.log` statements from JSDoc code examples

---

## [0.0.63] - 2026-03-04

### Fixed

- **SquareNode stories**: Use only square type in SquareNode stories to render the correct component
- **TerminalNode double border**: Remove double border on TerminalNode handle ports
- **Edge marker arrow colors**: Use CSS custom properties for edge marker arrow colors

---

## [0.0.62] - 2026-03-04

### Breaking Changes :warning:

- **Svelte 5 runes store migration**: All stores migrated from Svelte 4 `writable` to Svelte 5 runes (`$state`/`$derived`), including `categoriesStore` and the main workflow stores
- **3-layer to 2-layer store sync**: Simplified store synchronization architecture by removing the intermediate layer
- **Node component naming normalized**: Renamed node components with consistent conventions and documented limitations
- **Window globals removed**: Removed `window` global assignments and consolidated save/export logic into explicit API
- **`@sveltejs/kit` removed from peer dependencies**: Library no longer requires SvelteKit as a peer dependency
- **TypeScript strict mode enabled**: All source files now compile under `strict: true`

### Upgrade Notes

> If you are upgrading from **0.0.61**, please review the following:
>
> 1. **Store subscriptions** — Replace `$storeVariable` (Svelte 4 store syntax) with the new runes-based reactive access. Any code using `subscribe()` or `get()` from `svelte/store` on FlowDrop stores must be updated.
> 2. **Node component imports** — Component names have been normalized. Check your imports if you reference node components directly (e.g. `GatewayNode`, `ToolNode`).
> 3. **Window globals removed** — If your integration relied on `window.flowdrop` or similar globals for save/export, switch to the explicit `WorkflowOperationsHelper` API.
> 4. **SvelteKit no longer required** — `@sveltejs/kit` was removed from peer dependencies. If you were relying on this transitive dependency, add it to your own `package.json`.
> 5. **CSS custom properties** — Old numbered spacing aliases (e.g. `--fd-space-1`) have been removed. Use the new named tokens (e.g. `--fd-space-xs`, `--fd-space-sm`).

### Added

- **Review interrupt type**: New `review` interrupt with visual diff for field changes, HTML view toggle, and redesigned `InterruptBubble` layout
- **Dark mode support**: FlowDrop logo, `CanvasBanner`, `NodeDecorator`, and design tokens now support dark mode; Storybook also gained dark mode toggle
- **Configurable playground sidebar width**: `playgroundSidebarWidth` mount option lets consumers set the sidebar width
- **Workflow JSON validation**: Validates workflow JSON on import/paste with user-friendly error feedback
- **Accessibility improvements**: Improved keyboard navigation and hidden unimplemented pipeline UI elements
- **Configurable logger utility**: Replaced bare `console` calls with a pluggable logger, enabling consumers to intercept or silence log output
- **Configurable Drupal hook**: Extracted Drupal-specific API code into a configurable hook for cleaner decoupling
- **Comprehensive E2E tests**: Added Playwright end-to-end tests for the workflow editor
- **Storybook 10 upgrade**: Upgraded to Storybook 10 with `storybook-addon-tag-badges` for component status tracking

### Changed

- **Named design token scale**: Introduced a semantic design token system (`--fd-*` CSS custom properties) and migrated all components — base styles, nodes, forms, interrupts, playground, and remaining pages — from raw values to named tokens
- **Handle offset via CSS variable**: Replaced hardcoded `-10px` handle offsets with a `--fd-handle-offset` CSS variable and increased specificity to override xyflow defaults
- **Strict type annotations**: Replaced `any` types with proper type annotations across the codebase
- **Magic numbers extracted**: Replaced inline numeric constants with named constants
- **Deprecated spacing aliases removed**: Removed old numbered spacing aliases and fixed radius token comments
- **Cycle detection optimized**: Improved cycle detection algorithm from O(V·E) to O(V+E)

### Fixed

- **ToolNode handle z-index**: Handles now render above the node body so they are always clickable
- **Undo/redo restored**: Corrected default `undoHistoryLimit` value that was preventing undo/redo from working
- **Reactive loop causing UI freeze on node drag**: Resolved a reactive dependency cycle that froze the canvas when dragging nodes
- **Sidebar close on canvas click**: Fixed CSS selector in `handleCanvasClick` so clicking the canvas correctly closes the config panel
- **XSS prevention**: Sanitized HTML output in markdown and review components to prevent cross-site scripting
- **Handle CSS selectors**: Removed invalid `:global()` wrappers from handle selectors
- **SchemaForm binding**: Switched to `bind:this` in `SchemaForm` and added `svelte-ignore` justifications
- **StatusIcon styling**: Fixed background-mode color and icon sizing in `StatusIcon`
- **Dark mode tokens**: Added missing `--fd-info-hover` token and dark-mode overrides for edge-selected and tool-hover tokens
- **Playground sidebar UX**: Replaced confusing double-click delete with an explicit dropdown menu

---

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

## [0.0.49] - 2026-02-05

### Added

- **Interrupts Node Category**: New `'interrupts'` category in `NodeCategory` for human-in-the-loop nodes, enabling dedicated sidebar grouping for interrupt-based workflow nodes

- **Twig Syntax Highlighting**: Template editor now features proper Twig syntax highlighting with distinct styling for `{{ variables }}`, `{% tags %}`, and `{# comments #}` blocks

### Fixed

- **Tool Node Border Color**: Tool nodes now use their configured theme color for the header border instead of a generic color, and removed duplicate header border styling

- **Autocomplete Tooltip Clipping**: Fixed autocomplete suggestion tooltip being clipped by editor container overflow constraints

- **JSON Editor Cursor Jump**: Fixed cursor jumping to the start of the field when editing JSON in the code editor

- **Dark Mode Code Editors in FormField**: Fixed dark mode theme not being applied to code editors rendered within FormField components

- **Dark Mode JSON Syntax Highlighting**: Fixed syntax highlighting colors not applying correctly in JSON code editor when using dark mode

- **JSON Code Editor Responsiveness**: Improved JSON code editor layout responsiveness to properly adapt to container size changes

- **Form Save Data Loss**: Fixed pending form changes being lost on save by flushing uncommitted field values before triggering the save operation

---

## [0.0.48] - 2026-02-05

### Added

- **Settings Toggle in Mount API**: Expose `showSettings` option in `mountFlowDropApp` API to control settings panel visibility from external consumers

- **Terminal Node Handle Distribution**: Terminal node handles are now distributed evenly along the circle arc for better visual layout when multiple ports are present

### Fixed

- **Autocomplete Auth Provider**: Fixed autocomplete callback ignoring `authProvider` settings (#14)

- **Dynamic Schema Fetching**: Fixed dynamic schema not being fetched when a static `configSchema` exists, even with `preferDynamicSchema: true` (#4)

- **Pico-math Resolution**: Fixed pico-math module resolution issue

- **Terminal Node Handle Radius**: Adjusted radius calculation for terminal node handle positioning

- **Template Variable Suggestions**: Resolved API variable suggestions integration issues in the template editor

### Changed

- **Template Editor**: Removed deprecated `variableHints` property in favor of API-driven variable suggestions

---

## [0.0.47] - 2026-02-02

### Added

- **Template Variable Autocomplete**: Template editor fields now provide variable autocompletion
  - Type `{{` to trigger autocomplete popup with available variables
  - Variables are derived from the node's input ports and upstream node outputs
  - Improves authoring experience for Twig/Liquid-style templates

### Changed

- **Form Schema Migration to oneOf Pattern**: Migrated enum field handling from `enumNames`/`enumLabels` to JSON Schema `oneOf` pattern
  - More standards-compliant enum representation
  - Clearer schema structure with explicit `const`/`title` pairs
  - Internal refactor: `getEnumOptions()` → `getOneOfOptions()`

### Fixed

- **NodeType Config Sync**: Changing a node's `nodeType` config property now immediately updates the visual representation
  - Previously required deselecting and reselecting the node to see the change
  - Node type changes (e.g., `default` → `simple`) now reflect instantly

- **Form oneOf Detection**: Fixed field type detection to prioritize `oneOf` pattern before basic type checks
  - Ensures enum fields with `oneOf` schema render as select dropdowns instead of text inputs

- **Dark Theme for Registered Fields**: Heavy editor fields (code, markdown, template) now correctly derive dark theme from resolved system theme
  - Previously could show light editor in dark mode when using auto theme detection

### Documentation

- **Config Schema oneOf Pattern**: Updated `config-schema-special-properties.md` with oneOf pattern examples and migration guidance

---

## [0.0.46] - 2026-02-01

### Added

- **Undo/Redo Support**: Full undo/redo functionality for workflow editing
  - Keyboard shortcuts: `Ctrl+Z` / `Cmd+Z` (undo), `Ctrl+Shift+Z` / `Cmd+Shift+Z` (redo)
  - Tracks node additions, deletions, moves, and edge connections

- **Readonly Mode**: Support for `readonly` property on WorkflowEditor

### Fixed

- **Simple Node Height**: Simple nodes now allow variable height for longer descriptions instead of truncating

### Changed

- **Navbar Connected Indicator**: Aligned "Connected" status indicator styling with design tokens and badge pattern

---

## [0.0.45] - 2026-01-31

### Changed

- **Workflow Grid**: Refactored nodes to align with 10x10 grid for better layouting capabilities

## [0.0.44] - 2026-01-31

### Added

- **Dark mode**: CSS design tokens and color utilities; components and markdown editor updated for theme-aware styling

- **Settings system**: Settings types, store, and service; settings UI with navbar integration; settings integration guide

- **Theme-based node icon color**: Node icons use dark color in light theme and white in dark theme for better contrast

- **Themed toasts**: svelte-5-french-toast uses FlowDrop design tokens (`--fd-*`) for consistent look with the editor

- **Color utilities**: CSS token-based color helpers exported from the library

### Changed

- **Design tokens**: Token system and base styles modernized; node and component styling aligned to design patterns

- **Config panel**: Config panel position setting removed (refactor)

### Fixed

- **Edges**: Theme-aware edge marker colors for correct appearance in light and dark themes

- **Playground sidebar**: Layout and copy updates; confusing left-sidebar resize handle removed

### Documentation

- **API**: Documentation consolidated and published to GitHub Pages

- **Settings**: Settings integration guide added

---

## [0.0.43] - 2026-01-27

### Fixed

- **Interrupt Metadata Passthrough**: `metadataToInterrupt()` now correctly passes `resolvedByUserName` and `resolvedByUserId` to the interrupt's `metadata` property

---

## [0.0.42] - 2026-01-27

### Added

- **Interrupt Resolver Attribution**: Resolved interrupt badges now display who submitted the response
  - Shows "Response submitted by {userName}" when `resolvedByUserName` is available in interrupt metadata
  - Falls back to "Response submitted" when no username is provided (backwards compatible)
  - Supported in all prompt types: `ConfirmationPrompt`, `ChoicePrompt`, `TextInputPrompt`, `FormPrompt`
  - Backend provides `resolvedByUserName` in message metadata (e.g., `metadata: { resolvedByUserName: "admin" }`)

---

## [0.0.41] - 2026-01-27

### Added

- **Compact System Messages**: System messages in playground chat now display in a minimal inline format
  - Reduces visual noise by avoiding full chat bubbles for system messages
  - Enabled by default (`compactSystemMessages: true`)
  - Configurable via `compactSystemMessages` prop on `ChatPanel` and `MessageBubble`

- **Smart Auto-Scroll**: Improved chat panel scrolling behavior
  - Only auto-scrolls when new messages are added (not on updates)
  - Respects user scroll position - won't jump if user has scrolled up to read history
  - Pauses auto-scroll when user is interacting with forms (e.g., interrupt prompts)

- **User Display Name in Chat**: User messages now show the actual user's name instead of "You"
  - Backend can include `userName` in message metadata (e.g., `metadata: { userName: "John Smith" }`)
  - Falls back to "You" when `userName` is not provided (backwards compatible)
  - Added `userName` property to `PlaygroundMessageMetadata` type

---

## [0.0.40] - 2026-01-27

### Added

- **Playground Chat Input Configuration**: New options for flexible playground initialization
  - `showChatInput`: Hide text input to show only Run button (default: `true`)
  - `showRunButton`: Hide Run button for view-only mode (default: `true`)
  - `predefinedMessage`: Custom message sent when Run is clicked
  - `autoRun`: Auto-execute workflow on load without user interaction

- **Backend-Controlled Run Button**: Run button state can be managed by backend
  - Disabled after clicking until backend sends `enableRun: true` in message metadata
  - Resets to enabled when switching sessions

### Fixed

- **Playground Initial Session**: `initialSessionId` prop now works reactively
  - Previously the prop was ignored after component mount
  - Now validates session exists before loading with proper error handling

---

## [0.0.39] - 2026-01-24

### Fixed

- **Interrupt Auto-Resolution**: Interrupts are now automatically marked as resolved when their associated message has status `'completed'`
  - Previously, interrupts could remain in pending state even after the backend marked the message complete
  - Ensures UI consistency between message status and interrupt state

---

## [0.0.38] - 2026-01-24

### Added

- **Human-in-the-Loop (HITL) Interrupts**: Workflows can pause execution and request user input
  - Four interrupt types: `confirmation`, `choice`, `text`, `form`
  - `InterruptService` for API operations (resolve, cancel, polling)
  - `interruptStore` for state management
  - UI components: `InterruptBubble`, `ConfirmationPrompt`, `ChoicePrompt`, `TextInputPrompt`, `FormPrompt`
  - State machine for safe transitions (`idle` → `submitting` → `resolved`/`cancelled`/`error`)
  - Integrated into Playground with inline rendering in chat flow
  - MSW mock handlers for testing
  - Documentation: `docs/interrupt-feature.md`

- **Triggers Category**: Added `'triggers'` to `NodeCategory` type

### Changed

- **Interrupt UI Theme**: Neutral blue theme with design tokens for all prompt components

### Fixed

- **Interrupt Reactivity**: Fixed `InterruptBubble` not tracking store updates
- **Text Input Validation**: Fixed validation not updating reactively
- **Playground State Mutation**: Resolved `state_unsafe_mutation` error
- **Message Refresh**: Messages now refresh after interrupt resolution
- **Input Focus**: Chat input auto-focuses when user can type again

---

## [0.0.37] - 2026-01-24

### Fixed

- **Instance Title/Description Across All Node Types**: Harmonized `instanceTitle` and `instanceDescription` config property support across all node types
  - Previously only `workflowNode` (Default) and `simple` (Simple) supported these properties
  - Now supported in: `gateway`, `idea`, `terminal`, and `tool` node types
  - Enables consistent per-instance customization across all workflow nodes

### Added

- **AGENTS.md**: Added AI coding agent guidelines documentation for working with the FlowDrop codebase

---

## [0.0.36] - 2026-01-21

### Added

- **Editable Node Title & Description**: Nodes can now have per-instance custom titles and descriptions
  - `instanceTitle` config property overrides the default node label
  - `instanceDescription` config property overrides the node type description
  - Supported in `workflowNode` (Default) and `simple` (Simple) node types
  - Falls back to original values when not set

- **Idea Node**: New BPMN-like conceptual flow diagram node
  - Rounded diamond shape for decision/idea visualization
  - Customizable title and description via config
  - Supports trigger input/output ports

- **Auto-Save on Config Save**: New `saveWorkflowWhenSavingConfig` option in ConfigForm
  - When enabled, automatically saves the workflow when saving node configuration
  - Configurable per-form instance

- **Config Schema Documentation**: New `config-schema-special-properties.md` documenting all magic config properties
  - Reserved property names (`instanceTitle`, `instanceDescription`, `nodeType`, `dynamicInputs`, `dynamicOutputs`, `branches`)
  - Schema format types (`hidden`, `multiline`, `range`, `json`, `code`, `markdown`, `template`)
  - Dynamic port properties and gateway branches

### Changed

- **CodeMirror Performance**: Optimized editors using minimal setup for faster load times

---

## [0.0.35] - 2026-01-19

### Added

- **Message Ordering**: Added `sequenceNumber` and `parentMessageId` to `PlaygroundMessage` for proper message ordering and reply tracking

### Fixed

- **Playground Chat Scroll**: Fixed chat input staying visible at bottom with many messages
- **Message Sorting**: Messages now sort chronologically by timestamp and ID

### Removed

- **Image Attachment Button**: Removed non-functional image attachment button from playground chat input

---

## [0.0.34] - 2026-01-19

### Added

#### Loopback Edge Support

- **Loopback Edge Detection**: New utility functions for detecting and validating loopback edges
  - `isLoopbackEdge(edge)` - Detects if an edge targets the `loop_back` input port
  - `isValidLoopbackCycle(cycleEdges)` - Checks if a cycle consists entirely of loopback edges
  - `hasInvalidCycles(nodes, edges)` - Detects invalid cycles while allowing valid loopback cycles
  - Functions exported from `@d34dman/flowdrop/core`

- **Loopback Edge Category**: New edge category for loop iteration connections
  - `EdgeCategory` type now includes `'loopback'` alongside `'trigger'`, `'tool'`, and `'data'`
  - Loopback edges are styled with dashed gray lines (no animation)
  - Visual distinction from regular data edges without being distracting

- **CSS Variables for Loopback Edges**: Customizable theming via CSS custom properties
  - `--flowdrop-edge-loopback-color` (default: gray-500)
  - `--flowdrop-edge-loopback-color-hover` (default: gray-600)
  - `--flowdrop-edge-loopback-color-selected` (default: violet-600)
  - `--flowdrop-edge-loopback-width` (default: 1.5px)
  - `--flowdrop-edge-loopback-dasharray` (default: 5 5)
  - `--flowdrop-edge-loopback-opacity` (default: 0.85)

- **ForEach Loop Node**: New demo node for testing loopback functionality
  - **Inputs**: `items` (array, required), `loop_back` (mixed), `trigger` (trigger)
  - **Outputs**: `item` (mixed), `index` (number), `total` (number), `is_first` (boolean), `is_last` (boolean), `completed` (trigger)
  - The `loop_back` port accepts any data type, allowing flexible loop iteration patterns

- **Demo Workflow**: New "Demo: ForEach Loop" workflow showcasing loopback edges
  - Demonstrates JSON Loader → ForEach Loop → Process Item → loopback cycle
  - Includes explanatory notes about loopback edge usage

### Changed

- **Cycle Detection**: `checkWorkflowCycles()` now excludes valid loopback cycles from warnings
  - Only invalid (non-loopback) cycles trigger cycle detection warnings
  - New `checkAllCycles()` method available when detecting ALL cycles is needed

### Technical Details

- Loopback edges target ports named `loop_back` (constant: `LOOPBACK_PORT_NAME`)
- Edge styling uses `getEdgeCategoryWithLoopback()` for full edge categorization
- Animation reserved for future use (execution visualization)
- Zero linter errors introduced

---

## [0.0.33] - 2026-01-18

### Added

- **Markdown Support in Playground Chat**: Messages now render markdown content
  - Full markdown rendering using `marked` library
  - Supports headings, paragraphs, lists, code blocks, inline code, blockquotes, tables, links, and emphasis
  - Code blocks styled with dark theme for readability
  - Configurable via `enableMarkdown` option in `PlaygroundConfig` (default: `true`)
  - Log messages retain plain text formatting

### Changed

- **Neutral Chat Theme**: Updated playground message styling to a more professional neutral palette
  - User messages: Light gray background (`#f1f5f9`) instead of blue gradient
  - Assistant messages: White background with subtle border
  - System messages: Light neutral gray
  - Avatar icons: Neutral gray tones instead of colored backgrounds
  - Role labels: Dark gray text for better readability

### Fixed

- **Playground Processing State**: Fixed issue where "Processing..." indicator remained visible after workflow execution completed
  - Polling now correctly stops when `sessionStatus` is `'idle'` (in addition to `'completed'` and `'failed'`)
  - Executing state is now cleared when session returns to `'idle'` status
  - Previously, responses with `{success: true, data: [], hasMore: false, sessionStatus: "idle"}` would not clear the processing indicator

---

## [0.0.32] - 2026-01-18

### Added

#### PlaygroundModal Component

- **PlaygroundModal Component**: New modal wrapper for the Playground component
  - Centered modal dialog with semi-transparent backdrop
  - Closes via backdrop click, Escape key, or close button
  - Responsive design with mobile-first breakpoints
  - Full accessibility support with ARIA attributes (`role="dialog"`, `aria-modal`, `aria-labelledby`)
  - Consistent styling with FlowDrop design system

#### Modal Mode for mountPlayground

- **Modal Mode Support**: `mountPlayground()` now supports `mode: "modal"` for dialog-based playground
  - Mounts `PlaygroundModal` component with proper backdrop handling
  - Requires `onClose` callback for modal mode (throws error if not provided)
  - Automatic body-level mounting for proper z-index stacking
  - Clean unmount and state reset on close

#### Playground Module Exports

- **New Component Exports**: Added `PlaygroundModal` to `@d34dman/flowdrop/playground` module
- **Editor Module Export**: `Playground` component now also exported from `@d34dman/flowdrop/editor`

#### API Specification Enhancements

- **PlaygroundMessageStatus Enum**: New enum for tracking message processing status
  - `pending`: Message created, waiting to be processed
  - `processing`: Message is currently being processed
  - `completed`: Message processing completed successfully
  - `failed`: Message processing failed
  - `cancelled`: Message processing was cancelled

- **Enhanced PlaygroundMessage Schema**: Additional fields for conversation tracking
  - `status`: Processing status of the message
  - `sequenceNumber`: Sequential ordering within a session
  - `parentMessageId`: Links user messages to assistant responses
  - `executionId`: Workflow execution ID that generated the message

- **New API Endpoints**:
  - `GET /playground/sessions/{sessionId}/messages/{messageId}`: Retrieve a specific message with full details
  - `GET /playground/sessions/{sessionId}/messages/{messageId}/status`: Lightweight polling endpoint for message status

### Usage Examples

**PlaygroundModal in Svelte:**

```svelte
<script>
  import { PlaygroundModal } from "@d34dman/flowdrop/playground";
  let showPlayground = false;
</script>

<button onclick={() => (showPlayground = true)}>Open Playground</button>

<PlaygroundModal
  isOpen={showPlayground}
  workflowId="wf-123"
  onClose={() => (showPlayground = false)}
/>
```

**Modal Mode with mountPlayground:**

```typescript
import {
  mountPlayground,
  createEndpointConfig,
} from "@d34dman/flowdrop/playground";

const app = await mountPlayground(
  document.getElementById("playground-container"),
  {
    workflowId: "wf-123",
    endpointConfig: createEndpointConfig("/api/flowdrop"),
    mode: "modal",
    onClose: () => {
      app.destroy();
    },
  },
);
```

---

## [0.0.31] - 2026-01-18

### Added

- **Playground Feature**: Interactive workflow testing with chat interface
  - `Playground` component with standalone and embedded modes
  - Session management (create, list, delete, resume)
  - Real-time message polling with exponential backoff
  - `ChatPanel`, `SessionManager`, `InputCollector`, `ExecutionLogs`, `MessageBubble` components
  - `PlaygroundService` for API integration
  - Playground store with full state management
  - New module export: `@d34dman/flowdrop/playground`

- **Playground Mount Function**: `mountPlayground()` for vanilla JS, Drupal, and IIFE integration
  - Mount the Playground component into any DOM container
  - Full TypeScript support with `PlaygroundMountOptions` and `MountedPlayground` types
  - Re-exports `createEndpointConfig` from playground module for convenience

- **Playground API Endpoints**: Configuration for playground backend integration
  - `listSessions`, `createSession`, `getSession`, `deleteSession`
  - `getMessages`, `sendMessage`, `stopExecution`

### Fixed

- **AuthProvider**: Fixed `authProvider` prop not being used for API calls (#3)

---

## [0.0.30] - 2026-01-15

### Added

- **ToolNode Theme Colors**: Configurable theme colors via CSS custom properties (`--flowdrop-tool-node-color`, `--flowdrop-tool-node-background`, `--flowdrop-tool-node-border`) or per-node `metadata.color` hex value
- **Color Utilities**: New `hexToRgb()`, `generateLightTint()`, `generateBorderTint()` functions in `colors.ts`
- **Toast Notifications**: WorkflowEditor now includes Toaster component for automatic toast display

### Changed

- **NodeSidebar**: Removed client-side sorting; sidebar now respects API display order

---

## [0.0.29] - 2026-01-13

### Added

#### Tree-Shakable Module Architecture

Major refactoring to enable proper tree-shaking and reduce bundle sizes for library consumers.

- **New Entry Points**: Library now provides multiple entry points for optimal bundle sizes:

  | Import Path                       | Description               | Bundle Impact |
  | --------------------------------- | ------------------------- | ------------- |
  | `@d34dman/flowdrop/core`          | Types & utilities only    | ~5KB          |
  | `@d34dman/flowdrop/form`          | SchemaForm + basic fields | ~20KB         |
  | `@d34dman/flowdrop/form/code`     | Code editor (CodeMirror)  | +300KB        |
  | `@d34dman/flowdrop/form/markdown` | Markdown editor (EasyMDE) | +200KB        |
  | `@d34dman/flowdrop/form/full`     | All form fields           | +500KB        |
  | `@d34dman/flowdrop/display`       | MarkdownDisplay (marked)  | +50KB         |
  | `@d34dman/flowdrop/editor`        | WorkflowEditor (@xyflow)  | +300KB        |
  | `@d34dman/flowdrop/styles`        | CSS styles                | -             |

- **Field Registry System**: Dynamic field registration for heavy editors
  - `registerFieldComponent()` - Register custom or heavy field components
  - `registerCodeEditorField()` - Enable code/JSON editor support
  - `registerMarkdownEditorField()` - Enable markdown editor support
  - `registerTemplateEditorField()` - Enable template editor support
  - `initializeAllFieldTypes()` - Convenience function to register all editors

- **New Components**:
  - `FormFieldLight` - Light version of FormField using the registry (no heavy deps)
  - Fallback UI with helpful messages when heavy editors aren't registered

- **New Exports**:
  - `FieldComponent` type - Generic component type for field registration
  - `FieldMatcher` type - Function type for field schema matching
  - `FieldComponentRegistration` interface - Registration entry type

### Changed

- **Module Structure**: Reorganized source into `core/`, `editor/`, `form/`, `display/` directories
- **Main Entry Point**: Now re-exports from sub-modules for backward compatibility
- **Side Effects**: Only `editor/index.js` and CSS files have side effects (auto-registers nodes)
- **Peer Dependencies**: `@iconify/svelte` is now a peer dependency

### Breaking Changes

**1. Heavy Editors Require Registration**

When importing from `@d34dman/flowdrop/form`, heavy editors (code, markdown, template) are NOT automatically available:

```typescript
// Before (0.0.28) - everything auto-included
import { SchemaForm } from "@d34dman/flowdrop";

// After (0.0.29) - register heavy editors explicitly
import { SchemaForm } from "@d34dman/flowdrop/form";
import { registerCodeEditorField } from "@d34dman/flowdrop/form/code";

registerCodeEditorField(); // Call once at app startup
```

**2. CSS Import Path**

```typescript
// New recommended path
import "@d34dman/flowdrop/styles";

// Still works
import "@d34dman/flowdrop/styles/base.css";
```

**3. Install Peer Dependency**

```bash
npm install @iconify/svelte
```

### Backward Compatibility

The main entry point (`@d34dman/flowdrop`) still exports everything for backward compatibility. Existing code will continue to work but will bundle all dependencies.

### Usage Examples

**Minimal Form (small bundle):**

```typescript
import { SchemaForm } from "@d34dman/flowdrop/form";
import "@d34dman/flowdrop/styles";
```

**Form with Code Editor:**

```typescript
import { SchemaForm } from "@d34dman/flowdrop/form";
import { registerCodeEditorField } from "@d34dman/flowdrop/form/code";
registerCodeEditorField();
```

**Workflow Editor Only:**

```typescript
import { WorkflowEditor } from "@d34dman/flowdrop/editor";
import "@d34dman/flowdrop/styles";
```

**Types Only (zero runtime):**

```typescript
import type { Workflow, FieldSchema } from "@d34dman/flowdrop/core";
```

---

## [0.0.28] - 2026-01-12

### Added

#### SchemaForm Component

A standalone form generator component that creates dynamic forms from JSON Schema definitions without requiring FlowDrop workflow nodes.

- **SchemaForm Component**: New standalone form generator exported from the library
  - Takes JSON Schema and config values to dynamically render form fields
  - Works independently without coupling to workflow nodes
  - Supports all standard JSON Schema field types (string, number, boolean, array, object)
  - Real-time value updates via `onChange` callback
  - Optional save/cancel action buttons with customizable labels
  - Loading and disabled states for form control
  - Custom CSS class support for styling flexibility

- **New Types Exported**: Added form-related types for external consumers
  - `SchemaFormProps`: Props interface for the SchemaForm component
  - `FieldSchema`: Schema definition for individual form fields
  - `FieldType`: Supported field types (`string`, `number`, `boolean`, `array`, `object`)
  - `FieldFormat`: Field format hints (`multiline`, `hidden`, `json`, `markdown`, `template`, etc.)
  - `FieldOption`: Option type for select and checkbox fields

### Usage Example

```svelte
<script lang="ts">
  import { SchemaForm } from "@d34dman/flowdrop";
  import type { SchemaFormProps } from "@d34dman/flowdrop";

  const schema = {
    type: "object" as const,
    properties: {
      name: { type: "string", title: "Name", description: "Enter your name" },
      age: { type: "number", title: "Age", minimum: 0, maximum: 120 },
      active: { type: "boolean", title: "Active", default: true },
      role: { type: "string", title: "Role", enum: ["admin", "user", "guest"] },
    },
    required: ["name"],
  };

  let values = $state({ name: "", age: 25, active: true });

  function handleChange(newValues: Record<string, unknown>) {
    values = newValues;
  }
</script>

<!-- Inline mode (no buttons) -->
<SchemaForm {schema} {values} onChange={handleChange} />

<!-- With action buttons -->
<SchemaForm
  {schema}
  {values}
  onChange={handleChange}
  showActions={true}
  saveLabel="Submit"
  onSave={(v) => console.log("Saved:", v)}
  onCancel={() => console.log("Cancelled")}
/>
```

## [0.0.27] - 2026-01-09

### Added

#### Dynamic Configuration (configEdit) Feature

A new feature allowing nodes to have their configuration schemas fetched dynamically at runtime or configured via external third-party applications.

- **ConfigEditOptions Types**: New type system for dynamic configuration
  - `DynamicSchemaEndpoint`: Configure REST endpoints to fetch config schemas at runtime
  - `ExternalEditLink`: Configure links to external configuration forms (opens in new tab)
  - `ConfigEditOptions`: Combines both options with preference settings
  - `HttpMethod`: Type for REST methods (GET, POST, PUT, PATCH, DELETE)
  - Added `configEdit` property to `NodeMetadata` and `NodeExtensions`

- **Dynamic Schema Service**: New service for runtime schema management
  - `fetchDynamicSchema()`: Fetch config schemas from REST endpoints with built-in caching
  - `resolveExternalEditUrl()`: Resolve URL template variables for external links
  - `getEffectiveConfigEditOptions()`: Merge type-level and instance-level configs
  - `invalidateSchemaCache()` / `clearSchemaCache()`: Cache management utilities
  - Helper functions: `hasConfigEditOptions`, `shouldShowExternalEdit`, `shouldUseDynamicSchema`

- **ConfigForm Enhancements**: UI support for configEdit feature
  - Automatic dynamic schema loading when `dynamicSchema` is configured
  - Loading spinner and error states for schema fetching
  - "Refresh Schema" button to manually reload dynamic schemas
  - "External Editor" button when `externalEditLink` is configured
  - Support for both options simultaneously with `preferDynamicSchema` toggle

- **MSW Mock Handlers**: Mock endpoints for dynamic schema testing
  - `GET /api/flowdrop/nodes/:nodeTypeId/schema`: Returns mock config schemas
  - `POST /api/flowdrop/nodes/:nodeTypeId/config`: Mock config save endpoint
  - `GET /api/flowdrop/nodes/:nodeTypeId/config`: Mock config retrieval endpoint

- **Demo Nodes**: Three new demo nodes showcasing the configEdit feature
  - `dynamic_config_demo`: Demonstrates both external link and dynamic schema
  - `external_only_config_demo`: External edit link only (3rd party managed config)
  - `dynamic_schema_only_demo`: Dynamic schema fetching only

### Fixed

- **Simple/Square Node Ports**: Port behavior now correctly updates when ports are hidden or made visible dynamically
- **Markdown Editor Toolbar**: Removed confusing toolbar items from FormMarkdownEditor
- **Docker Builds**: Added `--ignore-scripts` to `npm ci` for QEMU cross-platform builds

### Technical Details

- URL template variables support: `{nodeTypeId}`, `{instanceId}`, `{workflowId}` with custom parameter mapping
- Schema caching with configurable TTL (default 5 minutes)
- Full TypeScript type safety with comprehensive JSDoc documentation
- Zero linter errors introduced

## [0.0.26] - 2026-01-04

### Fixed

- **Gateway Node Branch Reordering**: Switch/gateway node branch reordering now correctly updates edge positions
  - Previously edges would remain connected to old positions after reordering branches
  - Now edge connections update automatically when branches are reordered
- **ConfigModal**: Fixed ConfigModal component after recent ConfigForm refactor
- **FormRangeField Accessibility**: Removed redundant `aria-required` attribute from FormRangeField component

### Changed

- **UniversalNode Svelte 5 Migration**: Migrated UniversalNode to Svelte 5 dynamic component syntax
  - Uses modern `{@const}` and `{#snippet}` patterns
  - Improved reactivity and performance
- **Test Infrastructure**: Modernized test infrastructure with improved patterns and organization

### Added

#### Test Coverage Expansion

- **Utility Function Tests**: Added 67 comprehensive tests for utility functions
- **Storage Service Tests**: Added 76 tests for storage service functionality
- **API Service Tests**: Added 32 comprehensive tests for API service layer

## [0.0.25] - 2026-01-03

### Added

#### Rich Form Editors

- **FormCodeEditor**: CodeMirror-based JSON editor component for structured data
  - JSON syntax highlighting with CodeMirror 6
  - Real-time JSON validation with inline error display
  - Auto-formatting on blur (optional)
  - Dark/light theme support
  - Use with schema `format: "json"` or `format: "code"`

- **FormMarkdownEditor**: EasyMDE-based Markdown editor for rich text content
  - Full Markdown editing with live preview
  - Toolbar with common formatting options (bold, italic, headers, lists, etc.)
  - Autosave support (optional)
  - Spell checking enabled
  - SSR-safe: Only loads editor on the client side
  - Use with schema `format: "markdown"`

- **FormTemplateEditor**: CodeMirror-based template editor for Twig/Liquid-style templates
  - Custom syntax highlighting for `{{ variable }}` placeholders
  - Variable hints display showing available placeholders
  - Line wrapping for better template readability
  - Dark/light theme support
  - Use with schema `format: "template"`

#### Demo Node Types

- **JSON Validator Node**: New demo node for validating JSON data against JSON Schema
  - Validates input data against configurable JSON Schema (Draft 7)
  - Outputs validation result (boolean), original data, errors array, and schema used
  - Strict mode option to fail on additional properties
  - Demonstrates usage of `FormCodeEditor` with `format: "json"`

- **Prompt Template Node**: New demo node for rendering dynamic templates
  - Twig-style `{{ variable }}` placeholder substitution
  - Outputs rendered text, original template, variables used, and missing variables list
  - Strict mode option to error on missing variables
  - Demonstrates usage of `FormTemplateEditor` with `format: "template"`

### Changed

- **FieldFormat Type**: Extended to include new format types: `"json"`, `"code"`, `"markdown"`, `"template"`

### Technical Details

- All new editors maintain consistent styling with existing form components
- Proper ARIA attributes for accessibility
- Full TypeScript type safety with JSDoc documentation
- Zero linter errors introduced

## [0.0.24] - 2025-12-31

### Added

- **FormRangeField**: Range slider component for numeric fields with `format: "range"`
  - Custom styled track and thumb with progress visualization
  - Min/max/step configuration support
  - Real-time value display with tabular numeric formatting
- **FieldSchema.step**: Step increment property for number/range inputs
- **NodeMetadata.config**: Default configuration values at node type level

## [0.0.23] - 2025-12-31

### Added

- **Dynamic Ports**: WorkflowNode supports runtime-defined ports via `config.dynamicInputs` and `config.dynamicOutputs`
- **Node Extensions**: New `NodeExtensions` interface for 3rd party settings at type and instance level
- **Hide Unconnected Handles**: Display setting to hide unconnected ports, reducing visual clutter
- **connectedHandles Store**: Derived store tracking connected handle IDs for reactive visibility
- **FormArray Component**: Array field handling with add/remove/reorder for configuration forms
- **Gateway Switch Pattern**: Gateway node supports configurable branches via `config.branches`

### Changed

- Extracted form fields into modular components (FormField, FormFieldWrapper, FormToggle)
- Moved `@types/uuid` to devDependencies
- Removed sample data fallback, relies solely on API data

### Fixed

- GatewayNode branch label fallback now handles empty strings correctly
- GatewayNode respects hideUnconnectedHandles for branch outputs

## [0.0.22] - 2025-12-30

### Removed

- **ConfigSidebar Component**: Removed deprecated ConfigSidebar in favor of ConfigPanel
- **Notes Node Inline Editing**: Removed redundant inline editing feature from Notes node
  - Editing now handled through standard configuration panel
- **Misleading .env.example**: Removed file that could cause confusion with runtime configuration

### Fixed

- **Node Handle z-index**: Fixed issue where workflow node handles were clipped/cut off
  - Increased z-index from 10 to 20 to ensure handles display above other elements

## [0.0.21] - 2025-12-30

### Fixed

- **Workflow FitView**: Fixed issue where `fitView` did not recalculate correctly when switching between workflows
  - Added `{#key}` block with workflow ID to force SvelteFlow remount
  - Ensures viewport properly adjusts to new workflow bounds

## [0.0.20] - 2025-12-29

### Changed

#### Documentation Overhaul

- **Clarified Product Positioning**: FlowDrop is a visual editor only. You own the backend, data, and orchestration
- **Emphasized Data Ownership**: Highlighted the benefits of self-hosted workflows vs SaaS lock-in:
  - No vendor lock-in
  - No data leaving your infrastructure
  - No per-workflow or per-user pricing

## [0.0.19] - 2025-12-28

### Removed

This release removes all deprecated code and backward compatibility support to clean up the codebase for maintainability.

#### Deprecated API Removal

| Removed                             | Replacement                                         |
| ----------------------------------- | --------------------------------------------------- |
| `ApiConfig` interface               | `EndpointConfig`                                    |
| `getEndpointUrl()`                  | `buildEndpointUrl()`                                |
| `defaultApiConfig`                  | `defaultEndpointConfig`                             |
| `setApiBaseUrl()`                   | Configure via `EndpointConfig.baseUrl`              |
| `areDataTypesCompatible()` function | `PortCompatibilityChecker.areDataTypesCompatible()` |
| `DATA_TYPE_COLOR_TOKENS` constant   | `getDataTypeColorToken()` function                  |
| `NodeType` type alias               | `NodeMetadata`                                      |
| Edge `isToolConnection` property    | `metadata.edgeType`                                 |

#### Backward Compatibility Removal

| Removed                                       | Replacement                                 |
| --------------------------------------------- | ------------------------------------------- |
| `unmountWorkflowEditor()`                     | `unmountFlowDropApp()`                      |
| `NodeConfig` type alias                       | `ConfigValues`                              |
| `createAuthProviderFromLegacyConfig()`        | Use `AuthProvider` implementations directly |
| Legacy node type mappings in `WorkflowEditor` | All nodes use `universalNode` type          |
| `NODE_TYPE_TO_COMPONENT_MAP` static mapping   | Node component registry                     |
| Fallback component switch in `UniversalNode`  | Node component registry                     |

### Changed

- **EnhancedFlowDropApiClient**: Now defaults to `NoAuthProvider` when no `AuthProvider` is specified (previously created provider from legacy `config.auth`)
- **UniversalNode**: Now relies entirely on the node component registry for component resolution
- **getComponentNameForNodeType()**: Uses only the registry (no static fallback map)
- **Edge data format**: All edges now use `metadata.edgeType` instead of `isToolConnection`

### Breaking Changes

**1. API Configuration Migration**

```typescript
// Before (0.0.18)
import {
  getEndpointUrl,
  type ApiConfig,
  defaultApiConfig,
} from "@d34dman/flowdrop";
const config: ApiConfig = { ...defaultApiConfig, baseUrl: "/api" };
const url = getEndpointUrl(config, config.endpoints.workflows.get, {
  id: "123",
});

// After (0.0.19)
import {
  buildEndpointUrl,
  type EndpointConfig,
  defaultEndpointConfig,
} from "@d34dman/flowdrop";
const config: EndpointConfig = { ...defaultEndpointConfig, baseUrl: "/api" };
const url = buildEndpointUrl(config, config.endpoints.workflows.get, {
  id: "123",
});
```

**2. App Unmount Migration**

```typescript
// Before (0.0.18)
import { unmountWorkflowEditor } from "@d34dman/flowdrop";
unmountWorkflowEditor(app);

// After (0.0.19)
import { unmountFlowDropApp } from "@d34dman/flowdrop";
unmountFlowDropApp(app);
```

**3. Type Alias Migration**

```typescript
// Before (0.0.18)
import type { NodeConfig } from "@d34dman/flowdrop";

// After (0.0.19)
import type { ConfigValues } from "@d34dman/flowdrop";
```

**4. Auth Provider Migration**

```typescript
// Before (0.0.18) - legacy config.auth was auto-converted
const client = new EnhancedFlowDropApiClient(config);

// After (0.0.19) - provide AuthProvider explicitly
import { StaticAuthProvider } from "@d34dman/flowdrop";
const client = new EnhancedFlowDropApiClient(
  config,
  new StaticAuthProvider({ type: "bearer", token: "xyz" }),
);
```

**5. Data Type Compatibility Check Migration**

```typescript
// Before (0.0.18)
import { areDataTypesCompatible } from "@d34dman/flowdrop";
const compatible = areDataTypesCompatible("string", "text");

// After (0.0.19)
import { getPortCompatibilityChecker } from "@d34dman/flowdrop";
const checker = getPortCompatibilityChecker();
const compatible = checker.areDataTypesCompatible("string", "text");
```

## [0.0.18] - 2025-12-04

### Added

#### Terminal Node Type

- **New Built-in Node Type**: `terminal` - A circular node for workflow terminal points (start, end, exit/abort)
  - Configurable variants: `start`, `end`, `exit`
  - Automatic variant detection from metadata (id, name, tags)
  - Manual variant override via `config.variant`

- **Variant Configurations**:
  | Variant | Icon | Color | Default Ports |
  | ------- | ----------- | --------------- | --------------------- |
  | `start` | Play circle | Green (#10b981) | Output only (trigger) |
  | `end` | Stop circle | Gray (#6b7280) | Input only (trigger) |
  | `exit` | X circle | Red (#ef4444) | Input only (trigger) |

- **API-Controlled Ports**: Terminal nodes now fully respect the `inputs` and `outputs` arrays from metadata
  - `undefined` → Uses variant default ports
  - `[]` (empty array) → Explicitly no ports
  - `[{...}]` → Uses provided custom ports
  - Allows API to create passthrough terminals (both input and output) or decorative terminals (no ports)

- **Visual Enhancements**:
  - Circular design with variant-colored border
  - Config button positioned above the node
  - Ports vertically centered on the circle
  - Variant-specific glow effects on hover

### Changed

- **Built-in Node Types**: FlowDrop now ships with 7 built-in node types:
  - `workflowNode` (alias: `default`) - Standard workflow node
  - `simple` - Compact layout
  - `square` - Minimal icon node
  - `tool` - Agent tool node
  - `gateway` - Branching control flow
  - `note` - Sticky note with markdown
  - `terminal` - Start/end/exit points (NEW)

### Usage Examples

**Start Node (API Payload):**

```json
{
  "id": "workflow-start",
  "name": "Start",
  "type": "terminal",
  "tags": ["start"],
  "inputs": [],
  "outputs": [{ "id": "trigger", "name": "Go", "dataType": "trigger" }]
}
```

**End Node (API Payload):**

```json
{
  "id": "workflow-end",
  "name": "End",
  "type": "terminal",
  "tags": ["end"],
  "inputs": [{ "id": "done", "name": "Done", "dataType": "trigger" }],
  "outputs": []
}
```

**Passthrough Terminal (both ports):**

```json
{
  "id": "checkpoint",
  "name": "Checkpoint",
  "type": "terminal",
  "inputs": [{ "id": "in", "name": "In", "dataType": "trigger" }],
  "outputs": [{ "id": "out", "name": "Out", "dataType": "trigger" }]
}
```

**Decorative Terminal (no ports):**

```json
{
  "id": "milestone",
  "name": "Milestone",
  "type": "terminal",
  "inputs": [],
  "outputs": []
}
```

## [0.0.17] - 2025-12-04

### Added

#### Edge Styling Based on Port Data Type

- **Port-Based Edge Styling**: Edges are now styled based on the source output port's `dataType`
  - `trigger` ports → Solid dark line (control flow)
  - `tool` ports → Dashed amber line (tool connections)
  - All other ports → Normal gray line (data flow)
- **Dynamic Gateway Branch Detection**: Gateway node branches are automatically detected as trigger ports
  - Branches defined in `config.branches` are treated as control flow outputs
  - Edge styling correctly applies to dynamic gateway outputs (e.g., True/False)

- **Edge Metadata**: Edges now include metadata for API and persistence

  ```json
  {
    "data": {
      "metadata": {
        "edgeType": "trigger" | "tool" | "data",
        "sourcePortDataType": "trigger" | "tool" | "string" | ...
      }
    }
  }
  ```

- **CSS Tokens for Edge Styling**: Customizable edge colors via CSS variables
  - `--flowdrop-edge-trigger-color` (default: gray-900)
  - `--flowdrop-edge-tool-color` (default: amber-500)
  - `--flowdrop-edge-data-color` (default: gray-400)
  - Plus hover and selected state variants

- **EdgeStylingHelper Utilities**:
  - `extractPortIdFromHandle()` - Parse handle ID to get port ID
  - `getPortDataType()` - Get port's dataType from node metadata
  - `isGatewayBranch()` - Check if port is a dynamic gateway branch
  - `getEdgeCategory()` - Determine edge category from port type

#### Node Component Registry

- **Extensible Node Registry**: Register custom node components at runtime
  - `registerNodeComponent(typeId, component)` - Register a custom node type
  - `getNodeComponent(typeId)` - Retrieve a registered component
  - `hasNodeComponent(typeId)` - Check if a component is registered
  - `getRegisteredNodeTypes()` - List all registered type IDs

- **Custom Node Type Support**: `NodeType` now accepts custom strings beyond built-in types
  - Built-in types: `note`, `simple`, `square`, `tool`, `gateway`, `default`
  - Custom types: Any string registered via `registerNodeComponent()`

### Changed

**Customize Edge Colors (Theming):**

```css
:root {
  /* Override edge colors for dark theme */
  --flowdrop-edge-trigger-color: #ffffff;
  --flowdrop-edge-trigger-color-hover: #e5e5e5;
  --flowdrop-edge-tool-color: #fbbf24;
  --flowdrop-edge-data-color: #6b7280;
}
```

**Register Custom Node Component:**

```typescript
import { registerNodeComponent } from "@d34dman/flowdrop";
import MyCustomNode from "./MyCustomNode.svelte";

// Register before mounting
registerNodeComponent("mylib:custom", MyCustomNode);

// Now nodes with type: "mylib:custom" will use MyCustomNode
```

## [0.0.16] - 2025-12-02

### Added

#### Authentication System

- **AuthProvider Interface**: Pluggable authentication system for enterprise integration
  - `AuthProvider` interface for custom authentication implementations
  - `StaticAuthProvider` for backward-compatible static token authentication
  - `CallbackAuthProvider` for dynamic token management (enterprise use cases)
  - `NoAuthProvider` for unauthenticated scenarios
  - `createAuthProviderFromLegacyConfig()` for seamless migration from `config.auth`

#### Event Handlers

- **FlowDropEventHandlers**: Comprehensive workflow lifecycle event system
  - `onWorkflowChange(workflow, changeType)` - Notified on any workflow modification
  - `onDirtyStateChange(isDirty)` - Track unsaved changes state
  - `onBeforeSave(workflow)` - Hook before save, return `false` to cancel
  - `onAfterSave(workflow)` - Hook after successful save
  - `onSaveError(error, workflow)` - Handle save failures
  - `onWorkflowLoad(workflow)` - Called when workflow initializes
  - `onBeforeUnmount(workflow, isDirty)` - Called before FlowDrop destroys
  - `onApiError(error, operation)` - Global API error handler, return `true` to suppress toast

#### Dirty State Tracking

- **Workflow Store Enhancements**:
  - `isDirtyStore` - Svelte store for reactive dirty state
  - `isDirty()` - Check if there are unsaved changes
  - `markAsSaved()` - Clear dirty state after custom save operations
  - `getWorkflowFromStore()` - Get current workflow data
  - `setOnDirtyStateChange()` / `setOnWorkflowChange()` - Register callbacks

#### Draft Auto-Save

- **DraftAutoSaveManager**: Automatic draft saving to localStorage
  - Configurable interval-based saving (default: 30 seconds)
  - Can be disabled for security-conscious deployments
  - Change detection to avoid unnecessary saves
  - `saveDraft()`, `loadDraft()`, `deleteDraft()`, `hasDraft()` utilities
  - `getDraftStorageKey()` with sensible defaults

#### Features Configuration

- **FlowDropFeatures**: Configurable feature flags
  - `autoSaveDraft` (default: `true`) - Enable/disable draft auto-save
  - `autoSaveDraftInterval` (default: `30000`) - Auto-save interval in ms
  - `showToasts` (default: `true`) - Enable/disable toast notifications

#### Mount Options

- **Enhanced mountFlowDropApp**:
  - `authProvider` - Pass custom authentication provider
  - `eventHandlers` - Pass workflow lifecycle event handlers
  - `features` - Configure feature flags
  - `draftStorageKey` - Custom localStorage key for drafts
  - `nodes` - Pre-loaded node types (skips API fetch)

#### MountedFlowDropApp Interface

- Enhanced return type with new methods:
  - `isDirty()` - Check for unsaved changes
  - `markAsSaved()` - Clear dirty state
  - `getWorkflow()` - Get current workflow data
  - `save()` - Trigger save operation
  - `export()` - Trigger export operation
  - `destroy()` - Clean up with `onBeforeUnmount` event

#### API Improvements

- **EnhancedFlowDropApiClient**:
  - AuthProvider integration for dynamic authentication
  - 401 Unauthorized handling with automatic token refresh retry
  - 403 Forbidden handling with callback support
  - `ApiError` class with `status`, `operation`, and `errorData` context

### Changed

- **OpenAI Models**: Updated to newer and more cost-effective models (via PR #1)

### Fixed

- **Nodes Prop Bug**: Fixed bug where `nodes` prop passed to `mountFlowDropApp()` was ignored
  - Now correctly skips API fetch when nodes are provided

### Usage Examples

**Enterprise Integration:**

```typescript
import { mountFlowDropApp, CallbackAuthProvider } from "@d34dman/flowdrop";

const app = await mountFlowDropApp(container, {
  workflow: myWorkflow,
  endpointConfig: createEndpointConfig("/api/projects/123/flowdrop"),

  authProvider: new CallbackAuthProvider({
    getToken: () => authService.getAccessToken(),
    onUnauthorized: () => authService.refreshToken(),
  }),

  eventHandlers: {
    onDirtyStateChange: (isDirty) => updateSaveButton(isDirty),
    onAfterSave: () => showSuccess("Saved!"),
    onBeforeUnmount: (workflow, isDirty) => {
      if (isDirty) saveDraft(workflow);
    },
  },

  features: {
    autoSaveDraft: true,
    autoSaveDraftInterval: 30000,
    showToasts: true,
  },
});

// Check dirty state
if (app.isDirty()) {
  await app.save();
}

// Cleanup
app.destroy();
```

**Disable Draft Storage (Security):**

```typescript
const app = await mountFlowDropApp(container, {
  features: {
    autoSaveDraft: false, // No localStorage drafts
  },
});
```

## [0.0.15] - 2025-11-19

### Added

- **Runtime Configuration**: Application now supports runtime environment variables, enabling "build once, deploy anywhere"
  - Set `FLOWDROP_API_BASE_URL` (and other `FLOWDROP_*` variables) at runtime instead of build time
  - New `/api/config` endpoint serves configuration from server
  - New exports: `fetchRuntimeConfig()`, `getRuntimeConfig()`, `initRuntimeConfig()`, `RuntimeConfig` type
- **Docker Support**: Production-ready Dockerfile and docker-compose.yml included
  - Multi-stage build with optimized image size
  - Health checks and non-root user security
  - See `DOCKER.md` for quick start
- **Documentation**: Added deployment guides (`DEPLOYMENT.md`, `DOCKER.md`, `QUICK_START.md`, `MIGRATION_GUIDE.md`)

### Changed

- **Environment Variables**: Production now uses `FLOWDROP_*` prefix instead of `VITE_*`
  - `FLOWDROP_API_BASE_URL`: Your backend API URL
  - `FLOWDROP_THEME`: UI theme (light/dark/auto)
  - `FLOWDROP_TIMEOUT`: Request timeout in milliseconds
  - `FLOWDROP_AUTH_TYPE`: Authentication type
  - `FLOWDROP_AUTH_TOKEN`: Authentication token
  - Development mode still supports `VITE_*` variables for backward compatibility

### Fixed

- **Critical**: Fixed race condition where API requests used wrong URL (localhost instead of configured URL)
  - Configuration now loads on server before page render
  - All API requests now use correct configured URL from first request

### Breaking Changes

- If using `getDevConfig()` or `getDevApiConfig()` directly, these are now async functions
- Update environment variables from `VITE_*` to `FLOWDROP_*` for production deployments
- See `MIGRATION_GUIDE.md` for detailed migration steps

### Usage

**Docker (Recommended):**

```bash
docker run -p 3000:3000 \
  -e FLOWDROP_API_BASE_URL=https://your-api.com/api/flowdrop \
  flowdrop-ui:latest
```

**Environment Variables:**

```bash
export FLOWDROP_API_BASE_URL=https://your-api.com/api/flowdrop
npm run build
node build
```

## [0.0.14] - 2025-11-12

### Fixed

- **SvelteFlow Event Handler**: Updated node deletion handler from deprecated `onnodesdelete` to `ondelete` for proper SvelteFlow compatibility
- **Drag and Drop Positioning**: Fixed node drop positioning to correctly account for zoom and pan transformations using `screenToFlowPosition` API

### Added

- **FlowDropZone Component**: New component to handle drag and drop events with proper coordinate transformation within SvelteFlow context

## [0.0.13] - 2025-11-11

### Changed

- **Node ID Format**: Changed node ID generation from UUID to `<node_type>.<number>` format (e.g., `boolean_gateway.1`, `calculator.2`)

### Added

- **Node ID Display**: Added Node ID field with copy button in config sidebar for easy ID reference

### Fixed

- **Edge Cleanup**: Edges are now automatically removed when their connected nodes are deleted

## [0.0.12] - 2025-11-10

### Fix

- **Fix Global CSS**: Avoid output base styles for html and body tag.

## [0.0.11] - 2025-11-09

### Changed

- **Breadcrumb Navigation Enhancement**: Improved breadcrumb navigation for better user orientation

### Performance

- **WorkflowEditor Performance Optimization**: Performance optimizations implemented to fix sluggish behavior during node drag.

## [0.0.10] - 2025-11-09

### Performance

- **WorkflowEditor Performance Optimization**: Eliminated browser performance violations (setTimeout handler took 100ms+)
  - Implemented conditional execution info loading (only when pipelineId exists and workflow/pipeline changes)
  - Added requestIdleCallback scheduling for non-blocking updates (falls back to setTimeout with 300ms delay)
  - Implemented AbortController for request cancellation to prevent overlapping API calls
  - Optimized node mapping from double-pass to single-pass operation (50% faster processing)
  - Reduced processing time from ~100ms to ~10-20ms for large workflows (80% improvement)
  - Reduced API call frequency by ~90% in pipeline status view
  - See docs/performance-improvements-workfloweditor.md for detailed analysis

## [0.0.9] - 2025-11-09

### Changed

- Reduced number of console.log which was used mostly for debugging.

## [0.0.8] - 2025-11-09

### Fixed

- **mountFlowDropApp Endpoint Configuration**: Fixed critical bug where `mountFlowDropApp` was not passing full `endpointConfig` to the App component
  - Previously only passed `apiBaseUrl`, which meant custom endpoint paths, authentication, retry logic, and timeout settings were ignored
  - Now passes the complete `endpointConfig` object including:
    - Custom endpoint paths (for tenant-specific or environment-specific URLs)
    - Authentication configuration (Bearer tokens, API keys, custom headers)
    - Retry logic (max attempts, delays, backoff strategies)
    - Timeout settings
  - Updated `App.svelte` to accept and prioritize `endpointConfig` prop over `apiBaseUrl`
  - Enables full runtime configuration for multi-tenant applications and different API environments
  - Impact: All endpoint customizations now work correctly at runtime
- **PipelineStatus Runtime Configuration**: Fixed pipeline components not receiving full endpoint configuration
  - Updated `PipelineStatus` component to accept and pass `endpointConfig` to child components
  - Updated pipeline page to pass complete `endpointConfig` instead of just `baseUrl`
  - Ensures pipeline monitoring uses all custom endpoint settings including auth and retry logic

### Added

- **Tests**: Added comprehensive unit tests for `mountFlowDropApp` and `mountWorkflowEditor` functions (`svelte-app.test.ts`)
  - Verifies that custom `endpointConfig` is properly passed to components
  - Tests default configuration behavior
  - Tests configuration merging logic
- **Examples**: Added practical examples for custom endpoint configuration (`custom-endpoint-usage.ts`)
  - Multi-tenant application integration
  - Environment-based endpoint switching
  - Custom authentication patterns
  - Integration with React/Vue applications

## [0.0.7] - 2025-11-09

### Fixed

- **API Client Consistency**: Fixed inconsistent endpoint paths in `FlowDropApiClient` where some methods incorrectly used `/api/` prefix
  - Updated 10 methods to use relative paths without prefix (`/nodes`, `/workflows`, `/executions` instead of `/api/nodes`, etc.)
  - Fixed `PipelineStatus` component to use correct default baseUrl
  - Fixed hardcoded API endpoints in pipeline pages and App component
  - All endpoints now consistently match the endpoint configuration schema
- **Architecture**: baseUrl always includes `/api/flowdrop`, endpoint paths are relative, resulting in correct URLs like `/api/flowdrop/nodes`

### Technical Details

- Zero linter errors introduced
- No breaking changes to public API
- Internal consistency improvements for better maintainability

## [0.0.6] - 2025-11-09

### Added

#### Stores and State Management

- **Workflow Store**: Exposed `workflowStore` and `workflowActions` for direct workflow state manipulation
- **Derived Stores**: Added exports for `workflowId`, `workflowName`, `workflowNodes`, `workflowEdges`, `workflowMetadata`
- **Change Tracking**: Exposed `workflowChanged`, `workflowValidation`, `workflowMetadataChanged` for reactive updates

#### Toast Notification Service

- **Core Functions**: `showSuccess`, `showError`, `showWarning`, `showInfo`, `showLoading`
- **Management**: `dismissToast`, `dismissAllToasts`, `showPromise`, `showConfirmation`
- **Domain Helpers**: `apiToasts`, `workflowToasts`, `pipelineToasts` with pre-configured messages
- **Types**: `ToastType` and `ToastOptions` for type-safe usage

#### Services

- **Node Execution Service**: Exposed `NodeExecutionService` class and `nodeExecutionService` singleton for tracking node execution states
- **Workflow Storage**: Added `saveWorkflow`, `updateWorkflow`, `getWorkflow`, `getWorkflows`, `deleteWorkflow`, `getWorkflowCount`, `initializeSampleWorkflows`
- **Global Actions**: Exposed `globalSaveWorkflow`, `globalExportWorkflow`, `initializeGlobalSave` for app-wide workflow operations
- **Port Configuration**: Added `fetchPortConfig` and `validatePortConfig` for dynamic port configuration

#### Utilities

- **Node Status**: Exported status display utilities including `getStatusColor`, `getStatusIcon`, `getStatusLabel`, `getStatusBackgroundColor`, `getStatusTextColor`
- **Execution Tracking**: Added `createDefaultExecutionInfo`, `updateExecutionStart`, `updateExecutionComplete`, `updateExecutionFailed`, `resetExecutionInfo`
- **Formatting**: Exposed `formatExecutionDuration` and `formatLastExecuted` for user-friendly time displays
- **Node Wrapper**: Added `createNodeWrapperConfig`, `shouldShowNodeStatus`, `getOptimalStatusPosition`, `getOptimalStatusSize`, `DEFAULT_NODE_STATUS_CONFIG`
- **Types**: Exported `NodeStatusConfig` type

#### Workflow Editor Helpers

- **EdgeStylingHelper**: For applying custom edge styling and connection rules
- **NodeOperationsHelper**: For node loading, creation, and execution info management
- **WorkflowOperationsHelper**: For workflow CRUD operations and metadata management
- **ConfigurationHelper**: For API endpoint configuration

#### Components (16 new exports)

- **Node Types**: `UniversalNode`, `GatewayNode`, `SquareNode`
- **UI Elements**: `LoadingSpinner`, `StatusIcon`, `StatusLabel`, `NodeStatusOverlay`
- **Display**: `MarkdownDisplay`
- **Configuration**: `ConfigForm`, `ConfigModal`, `ConfigSidebar`
- **Layout**: `ConnectionLine`, `LogsSidebar`, `PipelineStatus`, `Navbar`, `Logo`

#### Configuration

- **API Config**: Exposed `defaultApiConfig`, `getEndpointUrl`, and `ApiConfig` type
- **Port Config**: Added `DEFAULT_PORT_CONFIG` for default port configuration

### Benefits

- **Enhanced Developer Experience**: Direct access to internal state management and utilities
- **Better Extensibility**: Easier to build custom UIs and integrations on top of FlowDrop
- **Improved Reusability**: All utility functions and UI components are now reusable
- **Complete State Control**: Full programmatic access to workflow state and actions
- **Consistent Notifications**: Unified toast notification system across all implementations
- **Node Execution Tracking**: Complete node status tracking and display capabilities

### Technical Details

- All new exports maintain full TypeScript type safety
- No breaking changes to existing API
- Zero linter errors introduced
- All utilities follow consistent naming conventions
- Services use singleton patterns where appropriate for optimal performance

## [0.0.5] - 2025-11-05

### Changed

- **Breaking**: Removed environment variable support - library now uses runtime configuration only
- All configuration must be provided at runtime via props/parameters instead of build-time environment variables
- Updated `svelte.config.js` to use `csrf.trustedOrigins` instead of deprecated `checkOrigin`
- Marked `createConfigFromEnv()` as deprecated in favor of `createDefaultConfig()` with runtime parameters

### Added

- Added `@sveltejs/kit` to `peerDependencies` to resolve packaging warnings

### Removed

- Removed all `import.meta.env` usage for better cross-bundler compatibility
- Removed `esm-env` dependency (no longer needed)
- Removed `getEnvVar()` helper functions from all library files

### Fixed

- Fixed SvelteKit CSRF configuration deprecation warning
- Fixed `@sveltejs/package` warnings about environment variable usage
- Library now passes `publint` validation with zero warnings

### Technical Details

- Library is now truly framework-agnostic and works with all bundlers
- Configuration should be provided programmatically at runtime
- Example: `createEndpointConfig("/custom/api/url", { auth: { type: "bearer" } })`

## [0.0.4]

### Changed

- Updated documentation to accurately reflect FlowDrop as a framework-agnostic Svelte 5 component library
- Synchronized README.md, API.md, and code comments for consistency

## [0.0.3] - 2025-11-05

### Fixed

- CSS styles are now properly exported and accessible to package consumers
- Fixed CSS import path in main entry point from `../app.css` to `./styles/base.css`
- Removed empty `src/lib/app.css` file (0 bytes)

### Changed

- Updated `package.json` exports to include CSS file path: `./styles/base.css`
- Updated `sideEffects` configuration to explicitly include CSS files
- Centralized all styles in `dist/styles/base.css` (26KB)

### Added

- Added explicit CSS export path in package.json: `"./styles/base.css": "./dist/styles/base.css"`
- Added `default` export option for better compatibility
- Added documentation files: `CSS-EXPORT-GUIDE.md` and `CSS-EXPORT-SUMMARY.md`

### Technical Details

- Package now passes `publint` validation without errors
- Consumers can import styles using: `import "@d34dman/flowdrop/styles/base.css"`
- Styles are automatically included when importing the main package
- Compatible with all modern bundlers (Vite, Webpack, Rollup, esbuild, Parcel)

## [0.0.2] - Previous Release

### Initial Release

- FlowDrop workflow editor component library
- Svelte 5 based components
- API client integration
- Workflow management and execution
- Node system with multiple node types
- Configuration and storage services

## How to Import

### Automatic (Recommended)

```javascript
import { WorkflowEditor } from "@d34dman/flowdrop";
// Styles are automatically included
```

### Explicit CSS Import

```javascript
import "@d34dman/flowdrop/styles/base.css";
```
