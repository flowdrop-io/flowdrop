import { describe, it, expect } from 'vitest';
import { portal } from '../../../src/lib/utils/portal.js';

describe('portal', () => {
  it('moves the node to body, copies the nearest scope and marks it', () => {
    const root = document.createElement('div');
    root.setAttribute('data-fd-scope', 's1');
    const inner = document.createElement('div');
    const node = document.createElement('div');
    root.appendChild(inner);
    inner.appendChild(node);
    document.body.appendChild(root);

    const action = portal(node);
    expect(node.parentElement).toBe(document.body);
    expect(node.getAttribute('data-fd-scope')).toBe('s1');
    expect(node.classList.contains('flowdrop-portal')).toBe(true);

    action.destroy();
    expect(node.isConnected).toBe(false);
    root.remove();
  });

  it('keeps the scope when the target changes later', () => {
    const root = document.createElement('div');
    root.setAttribute('data-fd-scope', 's2');
    const node = document.createElement('div');
    root.appendChild(node);
    document.body.appendChild(root);
    const target = document.createElement('div');
    document.body.appendChild(target);

    const action = portal(node);
    action.update(target);
    expect(node.parentElement).toBe(target);
    expect(node.getAttribute('data-fd-scope')).toBe('s2');
    action.destroy();
    root.remove();
    target.remove();
  });

  it('adds no scope when there is no scoped ancestor', () => {
    const wrap = document.createElement('div');
    const node = document.createElement('div');
    wrap.appendChild(node);
    document.body.appendChild(wrap);
    const action = portal(node);
    expect(node.hasAttribute('data-fd-scope')).toBe(false);
    expect(node.classList.contains('flowdrop-portal')).toBe(true);
    action.destroy();
    wrap.remove();
  });
});

describe('portal colour scheme', () => {
  it('gives the overlay its own data-theme, since <html> no longer carries it', () => {
    const node = document.createElement('div');
    document.body.appendChild(node);
    const action = portal(node);
    // The resolved scheme is a store value (light in the test environment).
    expect(node.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    action.destroy();
    expect(node.hasAttribute('data-theme')).toBe(false);
  });
});

describe('portal in a host wrapper', () => {
  it('takes the flowdrop-scope class and the wrapper data-theme, and follows a change', async () => {
    const wrap = document.createElement('div');
    wrap.className = 'flowdrop-scope';
    wrap.setAttribute('data-theme', 'dark');
    const node = document.createElement('div');
    wrap.appendChild(node);
    document.body.appendChild(wrap);

    const action = portal(node);
    expect(node.parentElement).toBe(document.body);
    expect(node.classList.contains('flowdrop-scope')).toBe(true);
    expect(node.classList.contains('flowdrop-portal')).toBe(true);
    expect(node.hasAttribute('data-fd-scope')).toBe(false);
    expect(node.getAttribute('data-theme')).toBe('dark');

    wrap.setAttribute('data-theme', 'light');
    await Promise.resolve();
    expect(node.getAttribute('data-theme')).toBe('light');

    action.destroy();
    expect(node.hasAttribute('data-theme')).toBe(false);
    wrap.setAttribute('data-theme', 'dark');
    await Promise.resolve();
    expect(node.hasAttribute('data-theme')).toBe(false);
    wrap.remove();
  });

  it('leaves the editor case alone: no flowdrop-scope class, theme from the store', () => {
    const root = document.createElement('div');
    root.setAttribute('data-fd-scope', 's3');
    root.className = 'flowdrop-scope';
    root.setAttribute('data-theme', 'dark');
    const node = document.createElement('div');
    root.appendChild(node);
    document.body.appendChild(root);

    const action = portal(node);
    expect(node.getAttribute('data-fd-scope')).toBe('s3');
    expect(node.classList.contains('flowdrop-scope')).toBe(false);
    // The store says light in the test environment, not the ancestor's dark.
    expect(node.getAttribute('data-theme')).toBe('light');
    action.destroy();
    root.remove();
  });

  it('a library scope without data-theme inside the wrapper still follows the store', () => {
    // PlaygroundSurface inside PlaygroundApp, or a standalone SettingsPanel: the
    // nearest .flowdrop-scope sets no data-theme, so the store decides.
    const panel = document.createElement('div');
    panel.className = 'flowdrop-scope';
    const node = document.createElement('div');
    panel.appendChild(node);
    document.body.appendChild(panel);

    const action = portal(node);
    expect(node.classList.contains('flowdrop-scope')).toBe(false);
    expect(node.getAttribute('data-theme')).toBe('light');
    action.destroy();
    panel.remove();
  });

  it('skips an inner library scope and takes the outer host wrapper', () => {
    const wrap = document.createElement('div');
    wrap.className = 'flowdrop-scope';
    wrap.setAttribute('data-theme', 'dark');
    const panel = document.createElement('div');
    panel.className = 'flowdrop-scope';
    const node = document.createElement('div');
    panel.appendChild(node);
    wrap.appendChild(panel);
    document.body.appendChild(wrap);

    const action = portal(node);
    expect(node.getAttribute('data-theme')).toBe('dark');
    action.destroy();
    wrap.remove();
  });
});
