import type { FlowDropTheme, FlowDropThemeName } from '../types/theme.js';
import { classicTheme, defaultTheme } from './classic.js';
import { minimalTheme } from './minimal.js';
import { drafterTheme } from './drafter.js';
import { graphiteTheme } from './graphite.js';

const builtinThemes: Record<FlowDropThemeName, FlowDropTheme> = {
  classic: classicTheme,
  default: classicTheme,
  minimal: minimalTheme,
  drafter: drafterTheme,
  graphite: graphiteTheme
};

/**
 * The current name of a built-in theme: `'default'` (its name until 2.14)
 * becomes `'classic'`. Any other name is returned as it is.
 */
export function normalizeThemeName(name: string): string {
  return name === 'default' ? 'classic' : name;
}

/**
 * Resolve a theme prop to a complete FlowDropTheme object.
 *
 * When an object with a named base is provided, the named theme is used as a
 * base and the inline overrides are merged on top:
 *   resolveTheme({ name: 'minimal', skin: { tokens: { primary: '#e11d48' } } })
 *   → minimal theme + { skin.tokens.primary: '#e11d48' }
 */
export function resolveTheme(theme: FlowDropTheme | FlowDropThemeName | undefined): FlowDropTheme {
  if (!theme) return classicTheme;
  if (typeof theme === 'string') {
    return builtinThemes[normalizeThemeName(theme) as FlowDropThemeName] ?? classicTheme;
  }

  // Object form — check for a named base to merge on top of
  const baseName = theme.name ? (normalizeThemeName(theme.name) as FlowDropThemeName) : undefined;
  if (baseName && baseName !== 'classic' && builtinThemes[baseName]) {
    const base = builtinThemes[baseName];
    return {
      name: baseName,
      skin: theme.skin
        ? {
            ...(base.skin?.font || theme.skin.font
              ? { font: theme.skin.font ?? base.skin?.font }
              : {}),
            tokens: {
              ...(base.skin?.tokens ?? {}),
              ...(theme.skin.tokens ?? {})
            },
            // The base's dark palette must survive an inline skin that only
            // sets light tokens; inline dark tokens win over it.
            ...(base.skin?.darkTokens || theme.skin.darkTokens
              ? {
                  darkTokens: {
                    ...(base.skin?.darkTokens ?? {}),
                    ...(theme.skin.darkTokens ?? {})
                  }
                }
              : {})
          }
        : base.skin,
      config: {
        display: {
          ...base.config?.display,
          ...theme.config?.display
        },
        sidebar: {
          ...base.config?.sidebar,
          ...theme.config?.sidebar
        },
        canvas: {
          ...base.config?.canvas,
          ...theme.config?.canvas
        }
      }
    };
  }

  // Classic has no skin to merge; only its old name is brought up to date.
  return baseName === 'classic' ? { ...theme, name: 'classic' } : theme;
}

export { classicTheme, defaultTheme, minimalTheme, drafterTheme, graphiteTheme };
