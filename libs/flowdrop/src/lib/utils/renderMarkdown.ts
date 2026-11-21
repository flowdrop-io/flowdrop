/**
 * Markdown to HTML for host pages
 *
 * Renders Markdown with the same `marked` + `sanitizeHtml()` (DOMPurify) pair that the display
 * components use, for pages that place the result with `innerHTML` outside a
 * Svelte component (for example a Drupal behavior).
 *
 * - HTML written in the source is shown as text.
 * - Links and images keep only http(s), root-relative and fragment targets;
 *   for any other target the label is shown as text. Relative paths
 *   (`docs/page`, `./x`, `?q=1`), protocol-relative `//host` and other schemes
 *   such as `mailto:` are not kept. Images are shown as a link to their source;
 *   an image inside a link shows its alt text within that link.
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
  /** Added to each heading level; the result is capped at 6. Non-numbers count as 0. Default: 0. */
  headingOffset?: number;
}

/** Link targets that are kept: http(s), root-relative and fragment. */
const ALLOWED_TARGET = /^(?:https?:\/\/|\/(?![/\\])|#)/i;

/**
 * Control characters. The browser's URL parser drops tab, CR and LF inside a
 * URL, so a target with any of them is not the target the rule sees.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

const escapeText = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (s: string): string =>
  escapeText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * The link rule of {@link renderMarkdown}, for host pages that build their own
 * links: returns the trimmed target when it is http(s), root-relative or a
 * fragment and holds no control character, otherwise null. Relative paths
 * (`docs/page`, `./x`, `?q=1`), protocol-relative `//host` and other schemes
 * such as `mailto:` are not kept; the label shows as text.
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
  return ALLOWED_TARGET.test(target) && !CONTROL_CHARACTER.test(target) ? target : null;
}

/**
 * Builds a parser for one heading offset. Each call gets its own `Marked`
 * instance, so the shared `marked` export keeps its defaults.
 */
function createParser(headingOffset: number): Marked {
  const parser = new Marked({ gfm: true, breaks: false, async: false });
  /** Greater than 0 while the label of a link is being rendered. */
  let linkDepth = 0;
  const anchor = (target: string, label: string, title: string | null | undefined): string => {
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : '';
    const text = label === '' ? escapeText(target) : label;
    return `<a href="${escapeAttribute(target)}"${titleAttribute} rel="noopener noreferrer">${text}</a>`;
  };
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
        let label: string;
        linkDepth++;
        try {
          label = this.parser.parseInline(token.tokens);
        } finally {
          linkDepth--;
        }
        const target = allowedLinkTarget(token.href);
        if (target === null) {
          return label;
        }
        return anchor(target, label, token.title);
      },
      image(token: Tokens.Image): string {
        const label = escapeText(token.text);
        if (linkDepth > 0) {
          return label;
        }
        const target = allowedLinkTarget(token.href);
        if (target === null) {
          return label;
        }
        return anchor(target, label, token.title);
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
  const n = Number(options.headingOffset ?? 0);
  const offset = Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 0), 5) : 0;
  let parser = parsers.get(offset);
  if (!parser) {
    parser = createParser(offset);
    parsers.set(offset, parser);
  }
  const html = parser.parse(text) as string;
  return sanitizeHtml(html);
}
