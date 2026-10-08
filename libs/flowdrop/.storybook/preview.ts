import type { Preview } from '@storybook/sveltekit';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import './storybook.css';
import { resolveTheme } from '../src/lib/themes/index.js';
import { buildScopedSkinCss, SCOPE_ATTR } from '../src/lib/themes/scopedSkinCss.js';
import type { FlowDropThemeName } from '../src/lib/types/theme.js';

const SKIN_SCOPE = 'storybook-skin';
const SKIN_STYLE_ID = 'storybook-skin-tokens';

/**
 * Applies the toolbar's skin to the page through the same scoped-skin CSS the
 * editor injects (`resolveTheme` + `buildScopedSkinCss`). The scope sits on
 * <body>, below the <html data-theme> the light/dark switch sets, so the
 * skin's dark tokens follow the theme switch.
 */
function applySkin(skin: FlowDropThemeName): void {
  const theme = resolveTheme(skin);
  const css = buildScopedSkinCss(SKIN_SCOPE, theme.skin, theme.config?.display);
  let style = document.getElementById(SKIN_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = SKIN_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
  document.body.setAttribute(SCOPE_ATTR, SKIN_SCOPE);
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    layout: 'centered',
    options: {
      storySort: { order: ['Tokens', 'Primitives', 'Patterns', '*'] }
    }
  },
  globalTypes: {
    skin: {
      description: 'FlowDrop skin',
      toolbar: {
        title: 'Skin',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: [
          { value: 'default', title: 'Default' },
          { value: 'minimal', title: 'Minimal' },
          { value: 'drafter', title: 'Drafter' },
          { value: 'graphite', title: 'Graphite' }
        ]
      }
    }
  },
  initialGlobals: { skin: 'default' },
  decorators: [
    (story, context) => {
      applySkin((context.globals.skin as FlowDropThemeName | undefined) ?? 'default');
      return story();
    },
    withThemeByDataAttribute({
      themes: {
        light: 'light',
        dark: 'dark'
      },
      defaultTheme: 'light',
      attributeName: 'data-theme'
    })
  ]
};

export default preview;
