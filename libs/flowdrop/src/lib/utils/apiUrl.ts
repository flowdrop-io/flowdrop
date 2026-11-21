const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * Text the URL parser does not read as written: tab or newline anywhere (it
 * drops them), a control character or space at either end (it trims them), or
 * a backslash in the path (it reads `\` as `/`). With them, ` //host`, `/\host`
 * and `/\t/host` are other hosts and `a\..\x` climbs out of the base.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const PARSER_REWRITES = /[\t\n\r]|^[\u0000-\u0020]|[\u0000-\u0020]$/;

/** A path segment the URL parser treats as `..`, including `%2e` spellings. */
function isDoubleDot(segment: string): boolean {
  return segment.replace(/%2e/gi, '.') === '..';
}

/**
 * Whether a URL is refused in any form: its text is not what the parser reads
 * (see PARSER_REWRITES).
 */
function isAmbiguous(url: string): boolean {
  return PARSER_REWRITES.test(url) || url.split(/[?#]/, 1)[0].includes('\\');
}

/**
 * Whether a no-slash URL is refused: empty, starting with `?` or `#`, or with
 * a `..` path segment (the part before any `?` or `#`; `%2e%2e` counts). `./x`,
 * `a/b` and `a..b` are fine.
 */
function isMalformedBaseRelative(url: string): boolean {
  if (url === '' || url.startsWith('?') || url.startsWith('#')) return true;
  const path = url.split(/[?#]/, 1)[0];
  return path.split('/').some(isDoubleDot);
}

/**
 * Resolve an autocomplete callback URL from node metadata.
 *
 * The URL's own form says what it is relative to:
 *
 * - `https://host/…` or `//host/…` names its own origin and is used as given.
 * - `/path` is relative to the site and is used as given. A `prefix` (the
 *   `baseUrl` prop of `SchemaForm`) is put in front of it, as it always was.
 * - `path` (no leading slash, optionally `./path`) is relative to the API
 *   base, so a backend can name its own endpoints without knowing where the
 *   editor reaches it, e.g. behind a hub's proxy mount
 *   (`secrets/options` under `/api/flowdrop/remotes/r1` →
 *   `/api/flowdrop/remotes/r1/secrets/options`). A `prefix` (a `SchemaForm`
 *   given a `baseUrl` prop) takes precedence: what the form was given beats
 *   the editor's base. With neither it is used as given.
 *
 * The base is treated as a folder: its last segment is kept, so
 * `secrets/options` under `https://site/api/flowdrop` is
 * `https://site/api/flowdrop/secrets/options`. This differs on purpose from
 * `new URL()` and HTML resolution, which would drop `flowdrop`.
 *
 * Refused, the result is `null`: any URL with a tab or newline, a control
 * character or space at either end, or a backslash in its path (the browser
 * would fetch something other than its text says), and a no-slash URL that is
 * empty, starts with `?` or `#`, or contains a `..` path segment (`%2e%2e`
 * included).
 *
 * @param url - The URL from the schema's `autocomplete.url`
 * @param base - The API base (`endpointConfig.baseUrl`), relative or absolute
 * @param prefix - SchemaForm's `baseUrl` prop: goes in front of `/path` URLs,
 *   and, when set, is the base for no-slash URLs instead of `base`
 * @returns The URL to fetch, or `null` when the URL is refused
 */
export function resolveAutocompleteUrl(url: string, base?: string, prefix = ''): string | null {
  if (isAmbiguous(url)) return null;
  if (isAbsoluteUrl(url)) return url;
  if (url.startsWith('/')) return `${prefix}${url}`;
  if (isMalformedBaseRelative(url)) return null;
  const root = (prefix || base || '').replace(/\/+$/, '');
  if (!root) return url;
  return `${root}/${url.replace(/^\.\//, '')}`;
}

/**
 * Whether `url` is written relative to the API base: no scheme, no `//host`,
 * no leading slash (`secrets/options`, `./secrets/options`).
 */
export function isBaseRelative(url: string): boolean {
  return !HAS_SCHEME.test(url) && !url.startsWith('/');
}

/**
 * Whether `url` names its own origin: it has a scheme (`https://…`) or is
 * `//host/…`.
 */
export function isAbsoluteUrl(url: string): boolean {
  return HAS_SCHEME.test(url) || url.startsWith('//');
}

/**
 * Whether a request may carry the instance's auth: it goes to the page's own
 * origin, or to the API base's origin under the base path. Decided on the URL
 * the browser actually fetches, not on its text.
 *
 * Two inputs name "the page", because they are two things: relative URLs
 * resolve against the document's base (which a `<base>` element moves, and
 * which `fetch` follows), while the page's origin is the address bar's.
 *
 * @param requestUrl - The URL that is fetched
 * @param apiBase - The API base (`endpointConfig.baseUrl`), relative or absolute
 * @param baseUrl - What a relative URL resolves against (`document.baseURI`);
 *   without one (SSR) only an absolute URL under an absolute API base qualifies
 * @param pageOrigin - The page's origin (`location.origin`). Left out, it is
 *   the origin of `baseUrl`. An opaque origin (`"null"`: file:, data:,
 *   sandboxed pages, `about:srcdoc` frames) or `null` means the page has none,
 *   and no URL counts as being on it.
 */
export function mayCarryInstanceAuth(
  requestUrl: string,
  apiBase: string,
  baseUrl: string | undefined,
  pageOrigin?: string | null
): boolean {
  try {
    const target = new URL(requestUrl, baseUrl);
    // An opaque origin ("null": file:, data:, sandboxed pages) equals no other.
    if (target.origin === 'null') return false;
    const origin = pageOrigin === undefined && baseUrl ? new URL(baseUrl).origin : pageOrigin;
    if (origin && origin !== 'null' && target.origin === origin) return true;
    if (!apiBase) return false;
    // The base's own query and fragment are not part of the path prefix.
    const root = new URL(`${apiBase.replace(/[?#].*$/s, '').replace(/\/+$/, '')}/`, baseUrl);
    return target.origin === root.origin && target.pathname.startsWith(root.pathname);
  } catch {
    // Not parseable against the base (or no base at all): no instance auth.
    return false;
  }
}
