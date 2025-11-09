# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

---

[Unreleased]: https://github.com/d34dman/flowdrop/compare/v0.0.6...HEAD
[0.0.6]: https://github.com/d34dman/flowdrop/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/d34dman/flowdrop/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/d34dman/flowdrop/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/d34dman/flowdrop/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/d34dman/flowdrop/releases/tag/v0.0.2
