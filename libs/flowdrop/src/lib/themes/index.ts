import type { FlowDropTheme, FlowDropThemeName } from '../types/theme.js';
import { defaultTheme } from './default.js';
import { minimalTheme } from './minimal.js';
import { drafterTheme } from './drafter.js';
import { graphiteTheme } from './graphite.js';

const builtinThemes: Record<FlowDropThemeName, FlowDropTheme> = {
  default: defaultTheme,
  minimal: minimalTheme,
  drafter: drafterTheme,
  graphite: graphiteTheme
};

/**
 * Resolve a theme prop to a complete FlowDropTheme object.
 *
 * When an object with a named base is provided, the named theme is used as a
 * base and the inline overrides are merged on top:
 *   resolveTheme({ name: 'minimal', skin: { tokens: { primary: '#e11d48' } } })
 *   → minimal theme + { skin.tokens.primary: '#e11d48' }
 */
export function resolveTheme(theme: FlowDropTheme | FlowDropThemeName | undefined): FlowDropTheme {
  if (!theme || theme === 'default') return defaultTheme;
  if (typeof theme === 'string') return builtinThemes[theme as FlowDropThemeName] ?? defaultTheme;

  // Object form — check for a named base to merge on top of
  const baseName = theme.name as FlowDropThemeName | undefined;
  if (baseName && baseName !== 'default' && builtinThemes[baseName]) {
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

  return theme;
}

export { defaultTheme, minimalTheme, drafterTheme, graphiteTheme };
