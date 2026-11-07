/**
 * Links a backend or host hands the editor: which ones it may draw, follow or
 * send a request to.
 *
 * One set of rules for every place that takes such a link (the lock banner,
 * the save dialog, a saved copy's editor URL, the copy endpoint), so they
 * cannot drift apart.
 *
 * @module utils/links
 */

/** Browsers drop tabs and line breaks inside a URL, so a link that holds one reads differently. */
function hasLineBreakOrTab(url: string): boolean {
  return /[\t\r\n]/.test(url);
}

/**
 * Whether `url` is a path on this site: it starts with one `/`. `//host` and
 * `/\host` are not paths, browsers read both as another site.
 */
export function isSitePath(url: string): boolean {
  return !hasLineBreakOrTab(url) && /^\/(?![/\\])/.test(url);
}

/**
 * The link as given when it may be drawn or followed (a site path or an
 * `http(s)` address), otherwise `null`.
 */
export function safeLinkUrl(url: string | null | undefined): string | null {
  if (!url || hasLineBreakOrTab(url)) return null;
  if (isSitePath(url)) return url;
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'https:' || protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Where a request may go when it carries the editor's draft and auth headers:
 * a path on this site, or an `http(s)` address on this site's origin or on the
 * API's origin. Answers the full address, or `null` when it may not go there.
 *
 * @param url - The address as the backend gave it
 * @param apiBaseUrl - The API base URL (may itself be a path on this site)
 */
export function resolveRequestUrl(url: string, apiBaseUrl: string): string | null {
  if (!url || hasLineBreakOrTab(url) || typeof window === 'undefined') return null;
  const here = window.location.href;
  try {
    if (isSitePath(url)) return new URL(url, here).href;
    const target = new URL(url);
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return null;
    const allowed = [new URL(here).origin, new URL(apiBaseUrl, here).origin];
    return allowed.includes(target.origin) ? target.href : null;
  } catch {
    return null;
  }
}
