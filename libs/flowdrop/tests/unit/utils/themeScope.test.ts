import { describe, it, expect, afterEach } from 'vitest';
import { themeScope } from '../../../src/lib/utils/themeScope.svelte.js';

const html = document.documentElement;

describe('themeScope', () => {
  afterEach(() => {
    html.removeAttribute('data-theme');
  });

  it('sets data-theme on the scope element and leaves <html> alone by default', () => {
    const node = document.createElement('div');
    const action = themeScope(node);
    expect(node.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(html.hasAttribute('data-theme')).toBe(false);
    action.destroy();
    expect(node.hasAttribute('data-theme')).toBe(false);
  });

  it('mirrors onto <html> (deprecated 2.11.0 behaviour) and removes it on last unmount', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const first = themeScope(a, { mirror: true });
    expect(html.getAttribute('data-theme')).toBe(a.getAttribute('data-theme'));
    const second = themeScope(b, { mirror: true });
    first.destroy();
    expect(html.hasAttribute('data-theme')).toBe(true);
    second.destroy();
    expect(html.hasAttribute('data-theme')).toBe(false);
  });

  it('restores a host-set value and never clobbers a changed one', () => {
    html.setAttribute('data-theme', 'host-value');
    const a = document.createElement('div');
    const action = themeScope(a, { mirror: true });
    action.destroy();
    expect(html.getAttribute('data-theme')).toBe('host-value');

    const b = document.createElement('div');
    const action2 = themeScope(b, { mirror: true });
    html.setAttribute('data-theme', 'changed-by-host');
    action2.destroy();
    expect(html.getAttribute('data-theme')).toBe('changed-by-host');
  });
});
