/**
 * Resolve a URL from node metadata (autocomplete, dynamic schema, variables)
 * against the editor's endpoint base.
 *
 * - `http(s)://…` is used as given.
 * - A path that already starts with the base is used as given, so backends
 *   that emit base-including paths (`/api/flowdrop/secrets/options` under the
 *   base `/api/flowdrop`) keep working.
 * - Any other `/`-relative path is resolved against the base, so a backend
 *   that emits base-relative paths (`/secrets/options`) works behind any API
 *   base, including a proxy mount.
 */
export function resolveApiUrl(url: string, baseUrl: string | undefined): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (baseUrl ?? '').replace(/\/+$/, '');
  if (!base || !url.startsWith('/')) return url;
  if (url === base || url.startsWith(`${base}/`) || url.startsWith(`${base}?`)) return url;
  return `${base}${url}`;
}
