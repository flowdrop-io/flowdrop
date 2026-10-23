const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * Whether a no-slash URL is refused: empty, starting with `?` or `#`, or with
 * a `..` path segment (the part before any `?` or `#`). `./x`, `a/b` and
 * `a..b` are fine.
 */
function isMalformedBaseRelative(url: string): boolean {
  if (url.trim() === '' || url.startsWith('?') || url.startsWith('#')) return true;
  const path = url.split(/[?#]/, 1)[0];
  return path.split('/').includes('..');
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
 * A no-slash URL that is empty, starts with `?` or `#`, or contains a `..`
 * path segment is refused: the result is `null`.
 *
 * @param url - The URL from the schema's `autocomplete.url`
 * @param base - The API base (`endpointConfig.baseUrl`), relative or absolute
 * @param prefix - SchemaForm's `baseUrl` prop: goes in front of `/path` URLs,
 *   and stands in for `base` for no-slash URLs when there is no `base`
 * @returns The URL to fetch, or `null` when the URL is refused
 */
export function resolveAutocompleteUrl(url: string, base?: string, prefix = ''): string | null {
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
