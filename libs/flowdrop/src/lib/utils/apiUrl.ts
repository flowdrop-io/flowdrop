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
 *   `/api/flowdrop/remotes/r1/secrets/options`). Without an API base the
 *   `prefix` takes its place (a standalone `SchemaForm` with a `baseUrl`);
 *   with neither it is used as given.
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
 *   and stands in for `base` for no-slash URLs when there is no `base`
 * @returns The URL to fetch, or `null` when the URL is refused
 */
export function resolveAutocompleteUrl(url: string, base?: string, prefix = ''): string | null {
  if (isAmbiguous(url)) return null;
  if (isAbsoluteUrl(url)) return url;
  if (url.startsWith('/')) return `${prefix}${url}`;
  if (isMalformedBaseRelative(url)) return null;
  const root = (base || prefix).replace(/\/+$/, '');
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
 * @param requestUrl - The URL that is fetched
 * @param apiBase - The API base (`endpointConfig.baseUrl`), relative or absolute
 * @param pageUrl - The page's URL (`location.href`); without one (SSR) only an
 *   absolute URL under an absolute API base qualifies
 */
export function mayCarryInstanceAuth(
  requestUrl: string,
  apiBase: string,
  pageUrl: string | undefined
): boolean {
  try {
    const target = new URL(requestUrl, pageUrl);
    if (pageUrl && target.origin === new URL(pageUrl).origin) return true;
    if (!apiBase) return false;
    const root = new URL(`${apiBase.replace(/\/+$/, '')}/`, pageUrl);
    return target.origin === root.origin && target.pathname.startsWith(root.pathname);
  } catch {
    // Not parseable against the page (or no page at all): no instance auth.
    return false;
  }
}
