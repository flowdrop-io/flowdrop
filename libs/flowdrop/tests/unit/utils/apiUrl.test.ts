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

  it('uses the prefix for a path without a leading slash when there is no base', () => {
    expect(resolveAutocompleteUrl('users/search', '', 'https://api.x')).toBe(
      'https://api.x/users/search'
    );
    expect(resolveAutocompleteUrl('./users/search', undefined, '/api/')).toBe('/api/users/search');
  });

  it('prefers the base over the prefix for a path without a leading slash', () => {
    expect(resolveAutocompleteUrl('users/search', '/api/flowdrop', 'https://api.x')).toBe(
      '/api/flowdrop/users/search'
    );
  });

  it('leaves a relative path alone with neither base nor prefix', () => {
    expect(resolveAutocompleteUrl('secrets/options', '')).toBe('secrets/options');
    expect(resolveAutocompleteUrl('secrets/options', undefined)).toBe('secrets/options');
  });

  it.each(['', '   ', '?q=1', '#frag', '..', '../x', 'a/../b', './../x', 'a/..', 'a/../b?x=1'])(
    'refuses the malformed form %j',
    (url) => {
      expect(resolveAutocompleteUrl(url, '/api/flowdrop', '/p')).toBeNull();
      expect(resolveAutocompleteUrl(url)).toBeNull();
    }
  );

  it.each([
    ['./x', '/api/x'],
    ['a/b', '/api/a/b'],
    ['a..b', '/api/a..b'],
    ['a/b..c/d', '/api/a/b..c/d'],
    ['x?next=../y', '/api/x?next=../y']
  ])('allows %j', (url, expected) => {
    expect(resolveAutocompleteUrl(url, '/api')).toBe(expected);
  });

  it('does not refuse site-relative or absolute URLs', () => {
    expect(resolveAutocompleteUrl('/a/../b', '/api')).toBe('/a/../b');
    expect(resolveAutocompleteUrl('https://x.test/../a', '/api')).toBe('https://x.test/../a');
    expect(resolveAutocompleteUrl('//x.test/a/..', '/api')).toBe('//x.test/a/..');
  });

  it('treats the base as a folder, unlike new URL()', () => {
    expect(resolveAutocompleteUrl('secrets/options', 'https://site/api/flowdrop')).not.toBe(
      new URL('secrets/options', 'https://site/api/flowdrop').href
    );
  });

  it('does not use the base for site-relative paths', () => {
    expect(resolveAutocompleteUrl('/users', '/api/flowdrop', '/prefix')).toBe('/prefix/users');
  });
});
