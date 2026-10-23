import { describe, it, expect } from 'vitest';
import { mayCarryInstanceAuth, resolveAutocompleteUrl } from '$lib/utils/apiUrl.js';

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

  it('prefers the prefix over the base for a path without a leading slash', () => {
    expect(resolveAutocompleteUrl('users/search', '/api/flowdrop', 'https://api.x')).toBe(
      'https://api.x/users/search'
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

  it.each(['%2e%2e/x', '.%2E/x', '%2E./x', 'a/%2e%2e/%2e%2e/b'])(
    'refuses the percent-encoded parent segment in %j',
    (url) => {
      expect(resolveAutocompleteUrl(url, '/api/flowdrop')).toBeNull();
    }
  );

  // The browser reads each of these as another host or a climb out of the base.
  it.each([
    '/\\other.test/opts',
    '/\t/other.test/opts',
    ' //other.test/opts',
    '\t//other.test/opts',
    '//other.test/opts\n',
    'a\\..\\..\\x',
    'sec\nrets/options',
    'https://x.test/a\\b'
  ])('refuses %j in any form', (url) => {
    expect(resolveAutocompleteUrl(url, '/api/flowdrop', '/p')).toBeNull();
    expect(resolveAutocompleteUrl(url)).toBeNull();
  });

  it('keeps a backslash in the query string', () => {
    expect(resolveAutocompleteUrl('x?q=a\\b', '/api')).toBe('/api/x?q=a\\b');
  });

  it('reads host:port without a scheme as a scheme, so the URL is used as given', () => {
    // `localhost:` parses as a scheme; the fetch fails rather than going anywhere.
    expect(resolveAutocompleteUrl('localhost:8080/opts', '/api')).toBe('localhost:8080/opts');
  });

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

describe('mayCarryInstanceAuth', () => {
  const page = 'https://site.test/admin/editor';

  it.each([
    ['/api/users', '/api/flowdrop'],
    ['secrets/options', '/api/flowdrop'],
    ['https://site.test/other', 'https://api.test/flowdrop'],
    ['https://api.test/flowdrop/users', 'https://api.test/flowdrop/'],
    ['//api.test/flowdrop/users', 'https://api.test/flowdrop']
  ])('allows %j (API base %j)', (url, base) => {
    expect(mayCarryInstanceAuth(url, base, page)).toBe(true);
  });

  it.each([
    ['https://other.test/users', '/api/flowdrop'],
    ['//other.test/users', '/api/flowdrop'],
    ['/\\other.test/users', '/api/flowdrop'],
    ['/\t/other.test/users', '/api/flowdrop'],
    [' //other.test/users', ''],
    ['https://api.test/flowdropX/users', 'https://api.test/flowdrop'],
    ['https://api.test/flowdrop/../admin', 'https://api.test/flowdrop'],
    ['https://api.test/flowdrop/%2e%2e/admin', 'https://api.test/flowdrop'],
    ['data:text/plain,x', '/api']
  ])('refuses %j (API base %j)', (url, base) => {
    expect(mayCarryInstanceAuth(url, base, page)).toBe(false);
  });

  it('without a page, allows only an absolute URL under an absolute API base', () => {
    expect(mayCarryInstanceAuth('/api/users', '/api', undefined)).toBe(false);
    expect(mayCarryInstanceAuth('https://api.test/f/x', 'https://api.test/f', undefined)).toBe(
      true
    );
  });
});
