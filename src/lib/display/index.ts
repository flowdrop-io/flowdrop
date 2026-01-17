/**
 * FlowDrop Display Module
 *
 * Provides display components for rendering content.
 * This module includes the marked library for markdown rendering.
 *
 * @module display
 *
 * @example
 * ```typescript
 * import { MarkdownDisplay } from "@d34dman/flowdrop/display";
 * ```
 *
 * @example In Svelte:
 * ```svelte
 * <script>
 *   import { MarkdownDisplay } from "@d34dman/flowdrop/display";
 *
 *   const markdown = `
 *   # Hello World
 *   This is **markdown** content.
 *   `;
 * </script>
 *
 * <MarkdownDisplay content={markdown} />
 * ```
 */

// ============================================================================
// Display Components
// ============================================================================

export { default as MarkdownDisplay } from '../components/MarkdownDisplay.svelte';

// ============================================================================
// Re-export marked for advanced usage
// ============================================================================

// Users can use marked directly if they need more control
export { marked } from 'marked';
