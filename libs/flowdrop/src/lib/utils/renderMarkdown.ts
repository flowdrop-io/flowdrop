/**
 * Markdown to HTML for host pages
 *
 * Renders Markdown with the same `marked` + `sanitizeHtml()` (DOMPurify) pair that the display
 * components use, for pages that place the result with `innerHTML` outside a
 * Svelte component (for example a Drupal behavior).
 *
 * - HTML written in the source is shown as text.
 * - Links and images keep only http(s), root-relative and fragment targets;
 *   for any other target the label is shown as text. Images are shown as a
 *   link to their source.
 * - Links carry `rel="noopener noreferrer"`.
 * - `headingOffset` moves headings down, up to h6, for pages that already own
 *   the upper levels.
 *
 * @module utils/renderMarkdown
 */
import { Marked, type Tokens } from 'marked';
import { sanitizeHtml } from './sanitize.js';

/** Options for {@link renderMarkdown}. */
export interface RenderMarkdownOptions {
  /** Added to each heading level; the result is capped at 6. Default: 0. */
  headingOffset?: number;
}

/** Link targets that are kept: http(s), root-relative and fragment. */
const ALLOWED_TARGET = /^(?:https?:\/\/|\/(?![/\\])|#)/i;

const escapeText = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (s: string): string =>
  escapeText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * The link rule of {@link renderMarkdown}, for host pages that build their own
 * links: returns the trimmed target when it is http(s), root-relative or a
 * fragment, otherwise null.
 *
 * @param href - The candidate target.
 * @returns The trimmed target, or null.
 *
 * @example
 * ```typescript
 * import { allowedLinkTarget } from '@flowdrop/flowdrop/display';
 *
 * const href = allowedLinkTarget(url);
 * if (href !== null) anchor.href = href;
 * ```
 */
export function allowedLinkTarget(href: string | null | undefined): string | null {
  const target = String(href ?? '').trim();
  return ALLOWED_TARGET.test(target) ? target : null;
}

/**
 * Builds a parser for one heading offset. Each call gets its own `Marked`
 * instance, so the shared `marked` export keeps its defaults.
 */
function createParser(headingOffset: number): Marked {
  const parser = new Marked({ gfm: true, breaks: false, async: false });
  parser.use({
    renderer: {
      html(token: Tokens.HTML | Tokens.Tag): string {
        return escapeText(token.text);
      },
      heading(token: Tokens.Heading): string {
        const level = Math.min(Math.max(token.depth + headingOffset, 1), 6);
        return `<h${level}>${this.parser.parseInline(token.tokens)}</h${level}>\n`;
      },
      link(token: Tokens.Link): string {
        const label = this.parser.parseInline(token.tokens);
        const target = allowedLinkTarget(token.href);
        if (target === null) {
          return label;
        }
        return `<a href="${escapeAttribute(target)}" rel="noopener noreferrer">${label}</a>`;
      },
      image(token: Tokens.Image): string {
        const label = escapeText(token.text);
        const target = allowedLinkTarget(token.href);
        if (target === null) {
          return label;
        }
        return `<a href="${escapeAttribute(target)}" rel="noopener noreferrer">${label}</a>`;
      }
    }
  });
  return parser;
}

const parsers = new Map<number, Marked>();

/**
 * Renders Markdown to sanitized HTML.
 *
 * @param source - The Markdown text.
 * @param options - Rendering options.
 * @returns HTML that can be assigned to `innerHTML`.
 *
 * @example
 * ```typescript
 * import { renderMarkdown } from '@flowdrop/flowdrop/display';
 *
 * element.innerHTML = renderMarkdown(text, { headingOffset: 3 });
 * ```
 */
export function renderMarkdown(source: string, options: RenderMarkdownOptions = {}): string {
  const text = String(source ?? '');
  if (text === '') {
    return '';
  }
  const offset = Math.max(0, Math.trunc(options.headingOffset ?? 0));
  let parser = parsers.get(offset);
  if (!parser) {
    parser = createParser(offset);
    parsers.set(offset, parser);
  }
  const html = parser.parse(text) as string;
  return sanitizeHtml(html);
}
