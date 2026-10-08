import { describe, it, expect } from 'vitest';
import {
  buildScopedSkinCss,
  displayTokens,
  effectiveSkinTokens
} from '../../../src/lib/themes/scopedSkinCss.js';
import { resolveTheme } from '../../../src/lib/themes/index.js';

describe('displayTokens', () => {
  it('translates every switch to its token pair', () => {
    expect(
      displayTokens({
        nodeIcon: 'dot',
        sidebarList: 'flat',
        sidebarSearch: false,
        sidebarHeader: true,
        navbarActions: 'split'
      })
    ).toEqual({
      'node-icon-display': 'none',
      'node-circle-display': 'flex',
      'sidebar-card-display': 'none',
      'sidebar-flat-display': 'block',
      'sidebar-search-display': 'none',
      'sidebar-header-display': 'flex',
      'navbar-split-display': 'flex',
      'navbar-dropdown-display': 'none'
    });
  });

  it('messages: document sets the conversation tokens, bubbles sets none', () => {
    const doc = displayTokens({ messages: 'document' });
    expect(doc['msg-avatar-display']).toBe('none');
    expect(doc['msg-header-display']).toBe('none');
    expect(doc['msg-meta-display']).toBe('flex');
    expect(doc['msg-user-max']).toBe('85%');
    expect(doc['msg-reply-max']).toBe('100%');
    expect(doc['interrupt-card-shadow']).toBe('none');
    expect(Object.keys(doc).every((k) => /^(msg|interrupt-card|composer)-/.test(k))).toBe(true);
    expect(displayTokens({ messages: 'bubbles' })).toEqual({});
  });

  it('graphite asks for the document layout, the other themes do not', () => {
    expect(resolveTheme('graphite').config?.display?.messages).toBe('document');
    for (const name of ['default', 'minimal', 'drafter'] as const) {
      expect(resolveTheme(name).config?.display?.messages).toBeUndefined();
    }
  });

  it('maps the default variants back to the tokens.css defaults', () => {
    expect(
      displayTokens({ nodeIcon: 'squircle', sidebarList: 'cards', navbarActions: 'dropdown' })
    ).toEqual({
      'node-icon-display': 'flex',
      'node-circle-display': 'none',
      'sidebar-card-display': 'block',
      'sidebar-flat-display': 'none',
      'navbar-split-display': 'none',
      'navbar-dropdown-display': 'flex'
    });
  });

  it('emits nothing for unset fields', () => {
    expect(displayTokens(undefined)).toEqual({});
    expect(displayTokens({})).toEqual({});
  });
});

describe('display fallback order', () => {
  it('config wins over the deprecated skin token', () => {
    const css = buildScopedSkinCss(
      'a',
      { tokens: { 'node-icon-display': 'none', 'node-circle-display': 'flex' } },
      { nodeIcon: 'squircle' }
    );
    expect(css).toContain('--fd-node-icon-display: flex;');
    expect(css).toContain('--fd-node-circle-display: none;');
    expect(css).not.toContain('--fd-node-icon-display: none;');
  });

  it('uses the skin token when the config does not set that switch', () => {
    const css = buildScopedSkinCss(
      'a',
      { tokens: { 'sidebar-search-display': 'none' } },
      { nodeIcon: 'dot' }
    );
    expect(css).toContain('--fd-sidebar-search-display: none;');
    expect(css).toContain('--fd-node-circle-display: flex;');
  });

  it('uses the skin token alone when there is no display config', () => {
    const css = buildScopedSkinCss('a', { tokens: { 'node-circle-display': 'flex' } });
    expect(css).toContain('--fd-node-circle-display: flex;');
  });

  it('emits nothing when neither is set, so tokens.css defaults apply', () => {
    expect(buildScopedSkinCss('a', { tokens: {} }, {})).toBe('');
    expect(buildScopedSkinCss('a', undefined, undefined)).toBe('');
  });

  it('display alone still produces a scoped rule', () => {
    const css = buildScopedSkinCss('a', undefined, { sidebarList: 'flat' });
    expect(css).toContain('[data-fd-scope="a"] {');
    expect(css).toContain('--fd-sidebar-flat-display: block;');
  });
});

describe('skin font', () => {
  it('sets --fd-font-sans and applies it to the scope', () => {
    const css = buildScopedSkinCss('a', { font: "'Inter Variable', system-ui, sans-serif" });
    expect(css).toContain("--fd-font-sans: 'Inter Variable', system-ui, sans-serif;");
    expect(css).toContain('font-family: var(--fd-font-sans);');
  });

  it('leaves the host font alone when the skin names none', () => {
    const css = buildScopedSkinCss('a', { tokens: { primary: '#e11d48' } });
    expect(css).not.toContain('font-family');
    expect(css).not.toContain('--fd-font-sans');
  });

  it('a font-sans token alone still does not change the editor font (unchanged behaviour)', () => {
    const css = buildScopedSkinCss('a', { tokens: { 'font-sans': 'Georgia' } });
    expect(css).not.toContain('font-family');
  });

  it('effectiveSkinTokens folds font in', () => {
    expect(effectiveSkinTokens({ font: 'X' })).toEqual({ 'font-sans': 'X' });
  });
});

describe('resolveTheme + display', () => {
  it('the minimal theme carries the switches slate used to set', () => {
    const t = resolveTheme('minimal');
    expect(t.config?.display).toMatchObject({ nodeIcon: 'dot', sidebarList: 'flat' });
    // slate keeps the deprecated token until 3.0 for sites using slateSkin directly; config wins.
    expect(t.skin?.tokens?.['node-icon-display']).toBe('none');
  });

  it('merges inline display over the named base', () => {
    const t = resolveTheme({ name: 'minimal', config: { display: { sidebarSearch: true } } });
    expect(t.config?.display).toMatchObject({
      nodeIcon: 'dot',
      sidebarList: 'flat',
      sidebarSearch: true
    });
  });

  it('keeps a skin font through a named-base merge', () => {
    const t = resolveTheme({ name: 'minimal', skin: { font: 'Inter' } });
    expect(t.skin?.font).toBe('Inter');
  });
});
