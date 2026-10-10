import { describe, it, expect } from 'vitest';
import { resolveApiUrl } from '$lib/utils/apiUrl.js';

describe('resolveApiUrl', () => {
  it('keeps absolute URLs', () => {
    expect(resolveApiUrl('https://x.test/a', '/api/flowdrop')).toBe('https://x.test/a');
  });

  it('resolves base-relative paths against the base', () => {
    expect(resolveApiUrl('/secrets/options', '/api/flowdrop')).toBe(
      '/api/flowdrop/secrets/options'
    );
    expect(resolveApiUrl('/secrets/options?type=env', '/api/flowdrop/remotes/r1/')).toBe(
      '/api/flowdrop/remotes/r1/secrets/options?type=env'
    );
  });

  it('keeps paths that already include the base', () => {
    expect(resolveApiUrl('/api/flowdrop/secrets/options', '/api/flowdrop')).toBe(
      '/api/flowdrop/secrets/options'
    );
  });

  it('does not treat a shared prefix as the base', () => {
    expect(resolveApiUrl('/api/flowdropx/a', '/api/flowdrop')).toBe(
      '/api/flowdrop/api/flowdropx/a'
    );
  });

  it('leaves the URL alone without a base', () => {
    expect(resolveApiUrl('/secrets/options', '')).toBe('/secrets/options');
    expect(resolveApiUrl('/secrets/options', undefined)).toBe('/secrets/options');
  });
});
