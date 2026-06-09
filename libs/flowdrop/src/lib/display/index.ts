/**
 * FlowDrop Display Module
 *
 * Provides display components for rendering content.
 *
 * @module display
 *
 * This entry renders user/API-provided HTML, so it pulls in the HTML sanitizer
 * (DOMPurify). `sanitizeHtml` is exposed here — rather than from
 * `@flowdrop/flowdrop/core` — to keep `core` free of that heavier dependency.
 *
 * @example
 * ```typescript
 * import { MarkdownDisplay, sanitizeHtml } from "@flowdrop/flowdrop/display";
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

// ============================================================================
// HTML Sanitization (DOMPurify-backed — lives here, not in core)
// ============================================================================

export { sanitizeHtml } from '../utils/sanitize.js';
