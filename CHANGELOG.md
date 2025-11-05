# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

---

[Unreleased]: https://github.com/d34dman/flowdrop/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/d34dman/flowdrop/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/d34dman/flowdrop/releases/tag/v0.0.2

