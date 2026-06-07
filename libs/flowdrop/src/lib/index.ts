/**
 * FlowDrop - Visual Workflow Editor Library
 *
 * A Svelte 5 component library built on @xyflow/svelte for creating node-based
 * workflow editors.
 *
 * ## The main entry is a minimal front door
 *
 * This entry point intentionally exposes only the small surface most apps need
 * to get started: the `App` component, the `mountFlowDropApp` / `unmountFlowDropApp`
 * mount helpers, instance plumbing (`createFlowDropInstance` / `getInstance` /
 * `provideInstance`), endpoint + auth helpers, and the core public types. It does
 * NOT re-export the entire library.
 *
 * Everything else lives in focused sub-modules — import from the one you need:
 *
 * - `@flowdrop/flowdrop/core` - Types, utilities, theme/skin, messages helpers (no heavy deps)
 * - `@flowdrop/flowdrop/editor` - WorkflowEditor, registries, stores, services (adds @xyflow/svelte)
 * - `@flowdrop/flowdrop/form` - SchemaForm with basic fields
 * - `@flowdrop/flowdrop/form/code` - Code editor field (adds CodeMirror)
 * - `@flowdrop/flowdrop/form/markdown` - Markdown editor field (CodeMirror 6)
 * - `@flowdrop/flowdrop/display` - MarkdownDisplay (adds marked)
 * - `@flowdrop/flowdrop/playground` - Playground for interactive workflow testing
 * - `@flowdrop/flowdrop/settings` - Settings stores, services, components
 * - `@flowdrop/flowdrop/styles` - CSS styles
 *
 * @module flowdrop
 */

// ============================================================================
// Values
// ============================================================================

// App component + vanilla-JS mount lifecycle.
export { default as App } from './components/App.svelte';
export { mountFlowDropApp, unmountFlowDropApp } from './svelte-app.js';

// Instance plumbing — per-instance state container + Svelte context helpers.
export { createFlowDropInstance } from './stores/instanceContainer.svelte.js';
export { getInstance, provideInstance } from './stores/getInstance.svelte.js';

// Endpoint configuration helpers.
export { createEndpointConfig, defaultEndpointConfig } from './config/endpoints.js';

// Authentication providers.
export { NoAuthProvider, StaticAuthProvider, CallbackAuthProvider } from './types/auth.js';

// ============================================================================
// Types
// ============================================================================

export type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeMetadata,
  ConfigSchema
} from './types/index.js';

export type { EndpointConfig } from './config/endpoints.js';
export type { AuthProvider } from './types/auth.js';
export type { FlowDropInstance } from './stores/instanceContainer.svelte.js';
export type { FlowDropMountOptions, MountedFlowDropApp } from './svelte-app.js';
export type { FlowDropEventHandlers } from './types/events.js';
export type { Messages, MessagesOverride } from './messages/index.js';
