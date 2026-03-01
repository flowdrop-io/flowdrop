/**
 * Unit Tests - HTML Sanitization Utility
 *
 * Tests that sanitizeHtml strips dangerous content while preserving
 * safe HTML elements typically produced by markdown renderers.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '$lib/utils/sanitize.js';

describe('sanitizeHtml', () => {
	// =========================================================================
	// XSS Prevention
	// =========================================================================

	describe('strips dangerous content', () => {
		it('should strip <script> tags', () => {
			const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
			expect(result).not.toContain('<script>');
			expect(result).toContain('<p>Hello</p>');
		});

		it('should strip inline event handlers', () => {
			const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
			expect(result).not.toContain('onerror');
		});

		it('should strip javascript: protocol in href', () => {
			const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
			expect(result).not.toContain('javascript:');
		});

		it('should strip <iframe> tags', () => {
			const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
			expect(result).not.toContain('<iframe');
		});

		it('should strip <object> tags', () => {
			const result = sanitizeHtml('<object data="malicious.swf"></object>');
			expect(result).not.toContain('<object');
		});

		it('should strip <embed> tags', () => {
			const result = sanitizeHtml('<embed src="malicious.swf">');
			expect(result).not.toContain('<embed');
		});

		it('should strip onclick attributes', () => {
			const result = sanitizeHtml('<button onclick="alert(1)">Click</button>');
			expect(result).not.toContain('onclick');
		});

		it('should strip onmouseover attributes', () => {
			const result = sanitizeHtml('<div onmouseover="alert(1)">hover</div>');
			expect(result).not.toContain('onmouseover');
		});
	});

	// =========================================================================
	// Safe Content Preservation
	// =========================================================================

	describe('preserves safe markdown HTML', () => {
		it('should preserve headings', () => {
			const html = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
			expect(sanitizeHtml(html)).toBe(html);
		});

		it('should preserve paragraphs and line breaks', () => {
			const html = '<p>First paragraph</p><p>Second<br>paragraph</p>';
			expect(sanitizeHtml(html)).toBe(html);
		});

		it('should preserve lists', () => {
			const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
			expect(sanitizeHtml(html)).toBe(html);
		});

		it('should preserve ordered lists', () => {
			const html = '<ol><li>First</li><li>Second</li></ol>';
			expect(sanitizeHtml(html)).toBe(html);
		});

		it('should preserve code blocks', () => {
			const html = '<pre><code>const x = 1;</code></pre>';
			expect(sanitizeHtml(html)).toBe(html);
		});

		it('should preserve inline code', () => {
			const html = '<p>Use <code>npm install</code> to install</p>';
			expect(sanitizeHtml(html)).toBe(html);
		});

		it('should preserve safe links', () => {
			const html = '<a href="https://example.com">Example</a>';
			expect(sanitizeHtml(html)).toContain('href="https://example.com"');
			expect(sanitizeHtml(html)).toContain('Example');
		});

		it('should preserve images with safe src', () => {
			const html = '<img src="https://example.com/img.png" alt="photo">';
			const result = sanitizeHtml(html);
			expect(result).toContain('src="https://example.com/img.png"');
			expect(result).toContain('alt="photo"');
		});

		it('should preserve tables', () => {
			const html =
				'<table><thead><tr><th>Col</th></tr></thead><tbody><tr><td>Val</td></tr></tbody></table>';
			expect(sanitizeHtml(html)).toBe(html);
		});

		it('should preserve text formatting', () => {
			const html = '<strong>bold</strong> and <em>italic</em>';
			expect(sanitizeHtml(html)).toBe(html);
		});

		it('should preserve blockquotes', () => {
			const html = '<blockquote><p>A quote</p></blockquote>';
			expect(sanitizeHtml(html)).toBe(html);
		});

		it('should preserve horizontal rules', () => {
			const html = '<hr>';
			expect(sanitizeHtml(html)).toBe(html);
		});
	});

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('should handle empty string', () => {
			expect(sanitizeHtml('')).toBe('');
		});

		it('should handle plain text without HTML', () => {
			expect(sanitizeHtml('Hello, world!')).toBe('Hello, world!');
		});

		it('should handle mixed safe and dangerous content', () => {
			const result = sanitizeHtml(
				'<p>Safe content</p><script>alert("xss")</script><p>More safe</p>'
			);
			expect(result).toContain('<p>Safe content</p>');
			expect(result).toContain('<p>More safe</p>');
			expect(result).not.toContain('<script>');
		});
	});
});
