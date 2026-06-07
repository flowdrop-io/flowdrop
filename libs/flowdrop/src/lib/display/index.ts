/**
 * FlowDrop Display Module
 *
 * Provides display components for rendering content.
 *
 * @module display
 *
 * @example
 * ```typescript
 * import { MarkdownDisplay } from "@flowdrop/flowdrop/display";
 * ```
 *
 * @example In Svelte:
 * ```svelte
 * <script>
 *   import { MarkdownDisplay } from "@flowdrop/flowdrop/display";
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
