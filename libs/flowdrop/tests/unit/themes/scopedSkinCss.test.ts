import { describe, it, expect } from 'vitest';
import {
  aliasClosure,
  buildScopedSkinCss,
  scopeSelector,
  toScopeId
} from '../../../src/lib/themes/scopedSkinCss.js';

describe('buildScopedSkinCss', () => {
  it('returns nothing for an empty skin', () => {
    expect(buildScopedSkinCss('a', undefined)).toBe('');
    expect(buildScopedSkinCss('a', { tokens: {}, darkTokens: {} })).toBe('');
  });

  it('scopes light tokens to the instance, never to :root', () => {
    const css = buildScopedSkinCss('a1', { tokens: { primary: '#e11d48' } });
    expect(css).toContain('[data-fd-scope="a1"] {');
    expect(css).toContain('--fd-primary: #e11d48;');
    expect(css).not.toContain(':root');
  });

  it('scopes dark tokens under data-theme (on <html> or any ancestor)', () => {
    const css = buildScopedSkinCss('a1', { darkTokens: { background: '#000' } });
    expect(css).toContain(`[data-theme='dark'] [data-fd-scope="a1"] {`);
    expect(css).toContain('--fd-background: #000;');
    expect(css).not.toMatch(/^\[data-fd-scope/m);
  });

  it('redeclares aliases that follow a token the skin sets, transitively', () => {
    const css = buildScopedSkinCss('a1', { tokens: { background: '#fff8f0', card: '#fff' } });
    // direct aliases
    expect(css).toContain('--fd-panel-bg: var(--fd-background);');
    expect(css).toContain('--fd-node-bg: var(--fd-card);');
  });

  it('follows chains (node-border -> note-border)', () => {
    const closure = aliasClosure(['node-border'], { 'note-border': 'var(--fd-node-border)' });
    expect(closure).toEqual({ 'note-border': 'var(--fd-node-border)' });
    const chain = aliasClosure(['a'], { c: 'var(--fd-b)', b: 'var(--fd-a)' });
    expect(Object.keys(chain).sort()).toEqual(['b', 'c']);
    const css = buildScopedSkinCss('a1', { tokens: { 'node-border': 'red' } });
    expect(css).toContain('--fd-note-border: var(--fd-node-border);');
  });

  it('does not redeclare an alias the skin sets itself', () => {
    const css = buildScopedSkinCss('a1', {
      tokens: { background: '#fff8f0', 'panel-bg': '#123456' }
    });
    expect(css).toContain('--fd-panel-bg: #123456;');
    expect(css).not.toContain('--fd-panel-bg: var(--fd-background);');
  });

  it('leaves aliases of untouched tokens alone', () => {
    const css = buildScopedSkinCss('a1', { tokens: { 'radius-sm': '2px' } });
    expect(css).not.toContain('--fd-panel-bg');
  });

  it('uses the dark expression for aliases in dark mode', () => {
    const css = buildScopedSkinCss('a1', { tokens: { foreground: '#111' } });
    const dark = css.slice(css.indexOf(`[data-theme='dark']`));
    // dark block redeclares caption-node-bg as var(--fd-foreground) too, and
    // the light one is repeated so dark mode keeps following the skin
    expect(dark).toContain('--fd-caption-node-bg: var(--fd-foreground);');
  });

  it('drops aliases the dark block turns into literal values', () => {
    const css = buildScopedSkinCss('a1', { darkTokens: { 'decline-bg': 'x', danger: '#f00' } });
    expect(css).not.toContain('--fd-interrupt-selected-decline-bg: var(');
  });

  it('restores a literal dark value for an alias the light rule redeclares', () => {
    // decline-bg is var(--fd-error-muted) in light and a literal in dark; the
    // light rule redeclares it on the scope, which would shadow the :root dark
    // literal unless the dark rule puts it back.
    const css = buildScopedSkinCss('a1', { tokens: { 'error-muted': '#fee' } });
    const [light, dark] = css.split(`[data-theme='dark']`);
    expect(light).toContain('--fd-interrupt-selected-decline-bg: var(--fd-error-muted);');
    expect(dark).toContain('--fd-interrupt-selected-decline-bg: rgba(248, 113, 113, 0.15);');
  });

  it('keeps two instances apart', () => {
    const a = buildScopedSkinCss('a', { tokens: { primary: 'red' } });
    const b = buildScopedSkinCss('b', { tokens: { primary: 'blue' } });
    expect(a).toContain('[data-fd-scope="a"]');
    expect(a).not.toContain('[data-fd-scope="b"]');
    expect(b).toContain('[data-fd-scope="b"]');
    expect(b).not.toContain('red');
  });

  it('keeps the id safe inside a selector', () => {
    expect(scopeSelector('x"] , body {')).toBe('[data-fd-scope="x_____body__"]');
  });

  it('cleans a scope id once, the same way the selector does', () => {
    const id = toScopeId('x"] , body {');
    expect(id).toBe('x_____body__');
    expect(toScopeId(id)).toBe(id);
    expect(scopeSelector(id)).toBe(`[data-fd-scope="${id}"]`);
  });
});
