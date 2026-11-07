import { describe, it, expect } from 'vitest';
import { isSitePath, resolveRequestUrl, safeLinkUrl } from '$lib/utils/links.js';

describe('links', () => {
  it('a site path starts with one slash and holds no tab or line break', () => {
    expect(isSitePath('/admin/flowdrop')).toBe(true);
    expect(isSitePath('//other.example.com')).toBe(false);
    expect(isSitePath('/\\other.example.com')).toBe(false);
    expect(isSitePath('/\t/other.example.com')).toBe(false);
    expect(isSitePath('admin')).toBe(false);
  });

  it('draws site paths and http(s) links, nothing else', () => {
    expect(safeLinkUrl('/usage')).toBe('/usage');
    expect(safeLinkUrl('https://cms.example.com/a')).toBe('https://cms.example.com/a');
    expect(safeLinkUrl('http://cms.example.com/a')).toBe('http://cms.example.com/a');
    expect(safeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(safeLinkUrl('data:text/html,hi')).toBeNull();
    expect(safeLinkUrl('//other.example.com')).toBeNull();
    expect(safeLinkUrl('/a\nb')).toBeNull();
    expect(safeLinkUrl(null)).toBeNull();
    expect(safeLinkUrl('')).toBeNull();
  });

  it('resolves a site path against this site, not the API base', () => {
    const origin = window.location.origin;
    expect(resolveRequestUrl('/api/flowdrop/workflows/5/copy', '/api/flowdrop')).toBe(
      `${origin}/api/flowdrop/workflows/5/copy`
    );
    expect(resolveRequestUrl('/x', 'https://api.example.com/v1')).toBe(`${origin}/x`);
  });

  it('sends a full address only to this site or the API origin', () => {
    expect(resolveRequestUrl('https://api.example.com/c', 'https://api.example.com/v1')).toBe(
      'https://api.example.com/c'
    );
    expect(resolveRequestUrl(`${window.location.origin}/c`, '/api')).toBe(
      `${window.location.origin}/c`
    );
    expect(
      resolveRequestUrl('https://other.example.com/c', 'https://api.example.com/v1')
    ).toBeNull();
    expect(resolveRequestUrl('//other.example.com/c', '/api')).toBeNull();
    expect(resolveRequestUrl('/\t/other.example.com/c', '/api')).toBeNull();
    expect(resolveRequestUrl('javascript:alert(1)', '/api')).toBeNull();
    expect(resolveRequestUrl('relative/path', '/api')).toBeNull();
  });
});
