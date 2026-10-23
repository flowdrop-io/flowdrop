import { describe, it, expect } from 'vitest';
import { resolveAutocompleteUrl } from '$lib/utils/apiUrl.js';

describe('resolveAutocompleteUrl', () => {
  it('keeps URLs that name their own origin', () => {
    expect(resolveAutocompleteUrl('https://x.test/a', '/api/flowdrop')).toBe('https://x.test/a');
    expect(resolveAutocompleteUrl('HTTP://x.test/a', '/api/flowdrop')).toBe('HTTP://x.test/a');
    expect(resolveAutocompleteUrl('//cdn.test/a', '/api/flowdrop', '/prefix')).toBe('//cdn.test/a');
  });

  it('keeps site-relative paths, whatever the base', () => {
    expect(resolveAutocompleteUrl('/api/users/search', '/api/flowdrop')).toBe('/api/users/search');
    expect(
      resolveAutocompleteUrl('/api/flowdrop/secrets/options', 'https://site/api/flowdrop')
    ).toBe('/api/flowdrop/secrets/options');
  });

  it('puts the prefix in front of site-relative paths', () => {
    expect(resolveAutocompleteUrl('/users', '/api', '/api')).toBe('/api/users');
    expect(resolveAutocompleteUrl('/users', 'https://h/api', 'https://h/api')).toBe(
      'https://h/api/users'
    );
  });

  it('resolves paths without a leading slash against the base', () => {
    expect(resolveAutocompleteUrl('secrets/options', '/api/flowdrop')).toBe(
      '/api/flowdrop/secrets/options'
    );
    expect(resolveAutocompleteUrl('./secrets/options?type=env', '/api/flowdrop/remotes/r1/')).toBe(
      '/api/flowdrop/remotes/r1/secrets/options?type=env'
    );
    expect(resolveAutocompleteUrl('workflows/options', 'https://site/api/flowdrop')).toBe(
      'https://site/api/flowdrop/workflows/options'
    );
  });

  it('leaves a relative path alone without a base', () => {
    expect(resolveAutocompleteUrl('secrets/options', '')).toBe('secrets/options');
    expect(resolveAutocompleteUrl('secrets/options', undefined)).toBe('secrets/options');
  });
});
