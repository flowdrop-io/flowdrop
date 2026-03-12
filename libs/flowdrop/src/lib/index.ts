/**
 * FlowDrop - Visual Workflow Editor Library
 *
 * A Svelte 5 component library built on @xyflow/svelte for creating node-based workflow editors.
 *
 * ## Module Structure (Tree-Shakable)
 *
 * For optimal bundle size, import from specific sub-modules:
 *
 * - `@flowdrop/flowdrop/core` - Types and utilities only (no heavy deps)
 * - `@flowdrop/flowdrop/editor` - WorkflowEditor with @xyflow/svelte
 * - `@flowdrop/flowdrop/form` - SchemaForm with basic fields
 * - `@flowdrop/flowdrop/form/code` - Code editor support (adds CodeMirror)
 * - `@flowdrop/flowdrop/form/markdown` - Markdown editor support (CodeMirror 6)
 * - `@flowdrop/flowdrop/display` - MarkdownDisplay (adds marked)
 * - `@flowdrop/flowdrop/playground` - Playground for interactive workflow testing
 * - `@flowdrop/flowdrop/styles` - CSS styles
 *
 * ## Legacy Import (Full Bundle)
 *
 * Importing from the main entry point includes everything:
 *
 * ```typescript
 * import { WorkflowEditor, SchemaForm } from "@flowdrop/flowdrop";
 * ```
 *
 * **Note**: This will bundle ALL dependencies including @xyflow/svelte,
 * CodeMirror and marked. For smaller bundles, use sub-modules.
 *
 * @module flowdrop
 */

// ============================================================================
// IMPORTANT: This module re-exports from sub-modules for backward compatibility.
// New code should import directly from sub-modules for better tree-shaking.
//
// The wildcard re-exports below are intentional: each sub-module barrel uses
// explicit named exports, so the public API surface is fully controlled there.
// ============================================================================

// ============================================================================
// Core Exports (Types & Utilities - No Heavy Dependencies)
// ============================================================================

export * from "./core/index.js";

// ============================================================================
// Form Exports
// ============================================================================

export * from "./form/index.js";

// Note: Heavy form fields (code, markdown) are NOT auto-registered.
// Users must import from form/code or form/markdown and register explicitly.

// ============================================================================
// Display Exports
// ============================================================================

export * from "./display/index.js";

// ============================================================================
// Playground Exports
// ============================================================================

export * from "./playground/index.js";

// ============================================================================
// Editor Exports (includes @xyflow/svelte and auto-registers builtin nodes)
// ============================================================================

export * from "./editor/index.js";

// ============================================================================
// Settings Exports (stores, services, components, types)
// ============================================================================

export * from "./settings/index.js";
