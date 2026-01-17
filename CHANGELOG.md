# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
import { SchemaForm } from '@d34dman/flowdrop';

// After (0.0.29) - register heavy editors explicitly
import { SchemaForm } from '@d34dman/flowdrop/form';
import { registerCodeEditorField } from '@d34dman/flowdrop/form/code';

registerCodeEditorField(); // Call once at app startup
```

**2. CSS Import Path**

```typescript
// New recommended path
import '@d34dman/flowdrop/styles';

// Still works
import '@d34dman/flowdrop/styles/base.css';
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
import { SchemaForm } from '@d34dman/flowdrop/form';
import '@d34dman/flowdrop/styles';
```

**Form with Code Editor:**

```typescript
import { SchemaForm } from '@d34dman/flowdrop/form';
import { registerCodeEditorField } from '@d34dman/flowdrop/form/code';
registerCodeEditorField();
```

**Workflow Editor Only:**

```typescript
import { WorkflowEditor } from '@d34dman/flowdrop/editor';
import '@d34dman/flowdrop/styles';
```

**Types Only (zero runtime):**

```typescript
import type { Workflow, FieldSchema } from '@d34dman/flowdrop/core';
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
	import { SchemaForm } from '@d34dman/flowdrop';
	import type { SchemaFormProps } from '@d34dman/flowdrop';

	const schema = {
		type: 'object' as const,
		properties: {
			name: { type: 'string', title: 'Name', description: 'Enter your name' },
			age: { type: 'number', title: 'Age', minimum: 0, maximum: 120 },
			active: { type: 'boolean', title: 'Active', default: true },
			role: { type: 'string', title: 'Role', enum: ['admin', 'user', 'guest'] }
		},
		required: ['name']
	};

	let values = $state({ name: '', age: 25, active: true });

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
	onSave={(v) => console.log('Saved:', v)}
	onCancel={() => console.log('Cancelled')}
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
import { getEndpointUrl, type ApiConfig, defaultApiConfig } from '@d34dman/flowdrop';
const config: ApiConfig = { ...defaultApiConfig, baseUrl: '/api' };
const url = getEndpointUrl(config, config.endpoints.workflows.get, { id: '123' });

// After (0.0.19)
import { buildEndpointUrl, type EndpointConfig, defaultEndpointConfig } from '@d34dman/flowdrop';
const config: EndpointConfig = { ...defaultEndpointConfig, baseUrl: '/api' };
const url = buildEndpointUrl(config, config.endpoints.workflows.get, { id: '123' });
```

**2. App Unmount Migration**

```typescript
// Before (0.0.18)
import { unmountWorkflowEditor } from '@d34dman/flowdrop';
unmountWorkflowEditor(app);

// After (0.0.19)
import { unmountFlowDropApp } from '@d34dman/flowdrop';
unmountFlowDropApp(app);
```

**3. Type Alias Migration**

```typescript
// Before (0.0.18)
import type { NodeConfig } from '@d34dman/flowdrop';

// After (0.0.19)
import type { ConfigValues } from '@d34dman/flowdrop';
```

**4. Auth Provider Migration**

```typescript
// Before (0.0.18) - legacy config.auth was auto-converted
const client = new EnhancedFlowDropApiClient(config);

// After (0.0.19) - provide AuthProvider explicitly
import { StaticAuthProvider } from '@d34dman/flowdrop';
const client = new EnhancedFlowDropApiClient(
	config,
	new StaticAuthProvider({ type: 'bearer', token: 'xyz' })
);
```

**5. Data Type Compatibility Check Migration**

```typescript
// Before (0.0.18)
import { areDataTypesCompatible } from '@d34dman/flowdrop';
const compatible = areDataTypesCompatible('string', 'text');

// After (0.0.19)
import { getPortCompatibilityChecker } from '@d34dman/flowdrop';
const checker = getPortCompatibilityChecker();
const compatible = checker.areDataTypesCompatible('string', 'text');
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
import { registerNodeComponent } from '@d34dman/flowdrop';
import MyCustomNode from './MyCustomNode.svelte';

// Register before mounting
registerNodeComponent('mylib:custom', MyCustomNode);

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
import { mountFlowDropApp, CallbackAuthProvider } from '@d34dman/flowdrop';

const app = await mountFlowDropApp(container, {
	workflow: myWorkflow,
	endpointConfig: createEndpointConfig('/api/projects/123/flowdrop'),

	authProvider: new CallbackAuthProvider({
		getToken: () => authService.getAccessToken(),
		onUnauthorized: () => authService.refreshToken()
	}),

	eventHandlers: {
		onDirtyStateChange: (isDirty) => updateSaveButton(isDirty),
		onAfterSave: () => showSuccess('Saved!'),
		onBeforeUnmount: (workflow, isDirty) => {
			if (isDirty) saveDraft(workflow);
		}
	},

	features: {
		autoSaveDraft: true,
		autoSaveDraftInterval: 30000,
		showToasts: true
	}
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
		autoSaveDraft: false // No localStorage drafts
	}
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
import { WorkflowEditor } from '@d34dman/flowdrop';
// Styles are automatically included
```

### Explicit CSS Import

```javascript
import '@d34dman/flowdrop/styles/base.css';
```
