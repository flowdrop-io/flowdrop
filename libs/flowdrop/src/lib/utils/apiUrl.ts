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
 *   `/api/flowdrop/remotes/r1/secrets/options`). Without a base it is used as
 *   given.
 *
 * The API base is treated as a folder: its last segment is kept, so
 * `secrets/options` under `https://site/api/flowdrop` is
 * `https://site/api/flowdrop/secrets/options`. This differs on purpose from
 * `new URL()` and HTML resolution, which would drop `flowdrop`.
 *
 * @param url - The URL from the schema's `autocomplete.url`
 * @param base - The API base (`endpointConfig.baseUrl`), relative or absolute
 * @param prefix - Put in front of `/path` URLs (SchemaForm's `baseUrl` prop)
 */
export function resolveAutocompleteUrl(url: string, base?: string, prefix = ''): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) return url;
  if (url.startsWith('/')) return `${prefix}${url}`;
  const root = (base ?? '').replace(/\/+$/, '');
  if (!root) return url;
  return `${root}/${url.replace(/^\.\//, '')}`;
}
