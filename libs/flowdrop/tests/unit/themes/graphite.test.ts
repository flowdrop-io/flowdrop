import { describe, it, expect } from 'vitest';
import { resolveTheme, graphiteTheme } from '../../../src/lib/themes/index.js';
import { resolveSkin, graphiteSkin } from '../../../src/lib/skins/index.js';
import { defaultSkin } from '../../../src/lib/skins/index.js';
import { buildScopedSkinCss } from '../../../src/lib/themes/scopedSkinCss.js';

describe('graphite theme', () => {
  it('is registered by name as a theme and a skin', () => {
    expect(resolveTheme('graphite')).toBe(graphiteTheme);
    expect(resolveSkin('graphite')).toBe(graphiteSkin);
    expect(graphiteTheme.skin).toBe(graphiteSkin);
  });

  it('is opt-in: the default theme does not change', () => {
    expect(resolveTheme(undefined).skin).toBeUndefined();
    expect(resolveTheme('default').skin).toBeUndefined();
    expect(defaultSkin.tokens).toBeUndefined();
  });

  it('names Inter with a system-ui fallback', () => {
    expect(graphiteSkin.font).toMatch(/^'Inter Variable', Inter, system-ui/);
  });

  it('sets every colour role in both modes, so nothing falls back to the default blue', () => {
    const roles = [
      'background',
      'foreground',
      'muted',
      'muted-foreground',
      'card',
      'header',
      'canvas-bg',
      'border',
      'border-strong',
      'ring',
      'primary',
      'primary-foreground',
      'secondary',
      'accent',
      'info',
      'success',
      'warning',
      'error',
      'node-border',
      'edge-data-selected'
    ];
    for (const role of roles) {
      expect(graphiteSkin.tokens, role).toHaveProperty(role);
      expect(graphiteSkin.darkTokens, role).toHaveProperty(role);
    }
  });

  it('every light colour token has a dark counterpart', () => {
    const shared = new Set([
      'radius-sm',
      'radius-md',
      'radius-lg',
      'radius-xl',
      'control-radius',
      'radius-surface',
      'radius-bubble',
      'text-body',
      'text-meta',
      'scrollbar-size'
    ]);
    const structural = (k: string) =>
      shared.has(k) ||
      /^(node-radius|node-border-width|node-shadow|node-shadow-hover|scrollbar-radius)$/.test(k);
    const missing = Object.keys(graphiteSkin.tokens ?? {}).filter(
      (k) => !structural(k) && !(k in (graphiteSkin.darkTokens ?? {}))
    );
    expect(missing).toEqual([]);
  });

  it('writes a dark rule and the font to the scoped css', () => {
    const css = buildScopedSkinCss('g1', graphiteSkin);
    expect(css).toContain('--fd-font-sans: ');
    expect(css).toContain('font-family: var(--fd-font-sans)');
    expect(css).toContain(`[data-theme='dark'] [data-fd-scope="g1"] {`);
  });
});

describe('resolveTheme with an inline skin on a named base', () => {
  it('keeps the base skin dark tokens when the inline skin sets only light tokens', () => {
    const t = resolveTheme({ name: 'graphite', skin: { tokens: { primary: '#e11d48' } } });
    expect(t.skin?.tokens?.primary).toBe('#e11d48');
    expect(t.skin?.darkTokens?.primary).toBe(graphiteSkin.darkTokens?.primary);
    expect(t.skin?.darkTokens?.background).toBe(graphiteSkin.darkTokens?.background);
  });

  it('lets inline dark tokens win over the base', () => {
    const t = resolveTheme({
      name: 'graphite',
      skin: { darkTokens: { primary: '#fff000' } }
    });
    expect(t.skin?.darkTokens?.primary).toBe('#fff000');
    expect(t.skin?.darkTokens?.background).toBe(graphiteSkin.darkTokens?.background);
    // light tokens of the base survive too
    expect(t.skin?.tokens?.background).toBe(graphiteSkin.tokens?.background);
  });

  it('keeps the base font unless the inline skin names one', () => {
    expect(resolveTheme({ name: 'graphite', skin: { tokens: {} } }).skin?.font).toBe(
      graphiteSkin.font
    );
    expect(resolveTheme({ name: 'graphite', skin: { font: 'serif' } }).skin?.font).toBe('serif');
  });
});
