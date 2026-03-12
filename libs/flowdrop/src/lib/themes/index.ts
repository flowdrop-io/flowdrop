import type { FlowDropTheme, FlowDropThemeName } from "../types/theme.js";
import { defaultTheme } from "./default.js";
import { minimalTheme } from "./minimal.js";

const builtinThemes: Record<FlowDropThemeName, FlowDropTheme> = {
  default: defaultTheme,
  minimal: minimalTheme,
};

/**
 * Resolve a theme prop to a complete FlowDropTheme object.
 *
 * When an object with a named base is provided, the named theme is used as a
 * base and the inline overrides are merged on top:
 *   resolveTheme({ name: 'minimal', skin: { tokens: { primary: '#e11d48' } } })
 *   → minimal theme + { skin.tokens.primary: '#e11d48' }
 */
export function resolveTheme(
  theme: FlowDropTheme | FlowDropThemeName | undefined,
): FlowDropTheme {
  if (!theme || theme === "default") return defaultTheme;
  if (typeof theme === "string")
    return builtinThemes[theme as FlowDropThemeName] ?? defaultTheme;

  // Object form — check for a named base to merge on top of
  const baseName = theme.name as FlowDropThemeName | undefined;
  if (baseName && baseName !== "default" && builtinThemes[baseName]) {
    const base = builtinThemes[baseName];
    return {
      name: baseName,
      skin: theme.skin
        ? {
            tokens: {
              ...(base.skin?.tokens ?? {}),
              ...(theme.skin.tokens ?? {}),
            },
          }
        : base.skin,
      config: {
        sidebar: {
          ...base.config?.sidebar,
          ...theme.config?.sidebar,
        },
      },
    };
  }

  return theme;
}

export { defaultTheme, minimalTheme };
