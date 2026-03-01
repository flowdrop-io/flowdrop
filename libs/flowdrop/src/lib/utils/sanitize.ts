/**
 * HTML Sanitization Utility
 *
 * Provides XSS protection for rendered HTML content using DOMPurify.
 * Used internally by components that render user-provided or API-provided HTML
 * (e.g., markdown output, interrupt review diffs).
 *
 * @module utils/sanitize
 */
import DOMPurify from 'dompurify';

/**
 * Sanitize an HTML string to prevent XSS attacks.
 *
 * Uses DOMPurify defaults which strip dangerous elements (script, iframe, object)
 * and event handler attributes (onerror, onclick, etc.) while preserving safe HTML
 * elements typically produced by markdown renderers.
 *
 * @param dirty - The untrusted HTML string to sanitize
 * @returns Sanitized HTML string safe for use with {@html}
 *
 * @example
 * ```typescript
 * import { sanitizeHtml } from '@d34dman/flowdrop/core';
 * import { marked } from 'marked';
 *
 * const safeHtml = sanitizeHtml(marked.parse(userInput) as string);
 * ```
 */
export function sanitizeHtml(dirty: string): string {
	return DOMPurify.sanitize(dirty);
}
