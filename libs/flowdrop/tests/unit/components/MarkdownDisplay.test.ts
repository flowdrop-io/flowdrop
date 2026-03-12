/**
 * Unit Tests - MarkdownDisplay sanitization
 *
 * Tests the sanitizeHtml utility that MarkdownDisplay depends on.
 */

import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "$lib/utils/sanitize.js";

describe("sanitizeHtml", () => {
  it("should allow safe HTML tags", () => {
    const result = sanitizeHtml("<p>Hello <strong>world</strong></p>");
    expect(result).toContain("<p>");
    expect(result).toContain("<strong>");
    expect(result).toContain("world");
  });

  it("should strip script tags", () => {
    const result = sanitizeHtml('<script>alert("xss")</script><p>Safe</p>');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("Safe");
  });

  it("should strip onerror attributes", () => {
    const result = sanitizeHtml('<img onerror="alert(1)" src="x">');
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("alert");
  });

  it("should handle empty string", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("should preserve code blocks", () => {
    const result = sanitizeHtml("<pre><code>const x = 1;</code></pre>");
    expect(result).toContain("<pre>");
    expect(result).toContain("<code>");
    expect(result).toContain("const x = 1;");
  });

  it("should preserve links", () => {
    const result = sanitizeHtml('<a href="https://example.com">Link</a>');
    expect(result).toContain("href");
    expect(result).toContain("Link");
  });
});
