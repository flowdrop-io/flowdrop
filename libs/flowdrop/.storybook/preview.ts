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
 * <body>. The skin's dark rule is `[data-fd-scope][data-theme='dark']`, so
 * <body> carries the light/dark switch too, as the editor's scope element does;
 * <html data-theme> alone would leave a skin's light palette in dark mode.
 */
function applySkin(skin: FlowDropThemeName, scheme: string): void {
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
  document.body.setAttribute('data-theme', scheme);
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        // Whole-word only: `showBackground` is a boolean, not a colour.
        color: /^(background|color)$|Color$/,
        date: /Date$/i
      }
    },
    layout: 'centered',
    options: {
      // Groups and pages in a fixed order, everything else A–Z. Stories inside one
      // component keep their file order (the first one shows real editor usage).
      // Storybook serialises this function, so it must not use outside names.
      storySort: (a, b) => {
        // Plain JavaScript only: Storybook evaluates this source without TypeScript.
        const order = new Map([
          ['', ['Start here', 'Foundations', 'Components', 'Editor', 'Legacy']],
          ['Start here', ['Welcome', 'How theming works', 'Writing stories']],
          [
            'Foundations',
            [
              'Colour',
              'Typography',
              'Spacing and sizes',
              'Radius and shadow',
              'Run status',
              'All tokens'
            ]
          ],
          ['Editor', ['Canvas', 'Nodes', 'Edges', 'Runs', 'Playground', 'Forms']]
        ]);
        const pa = a.title.split('/');
        const pb = b.title.split('/');
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
          if (pa[i] === pb[i]) continue;
          if (pa[i] === undefined) return -1;
          if (pb[i] === undefined) return 1;
          const list = order.get(i === 0 ? '' : pa.slice(0, i).join('/')) ?? [];
          const ra = list.indexOf(pa[i]);
          const rb = list.indexOf(pb[i]);
          if (ra !== rb) return (ra < 0 ? 999 : ra) - (rb < 0 ? 999 : rb);
          return pa[i].localeCompare(pb[i]);
        }
        if (a.type !== b.type) return a.type === 'docs' ? -1 : 1;
        return 0;
      }
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
          { value: 'graphite', title: 'Graphite (editor default)' },
          { value: 'classic', title: 'Classic' },
          { value: 'minimal', title: 'Minimal' },
          { value: 'drafter', title: 'Drafter' }
        ]
      }
    }
  },
  // Graphite is what the editor opens in (DEFAULT_UI_SETTINGS.theme).
  initialGlobals: { skin: 'graphite' },
  decorators: [
    (story, context) => {
      applySkin(
        (context.globals.skin as FlowDropThemeName | undefined) ?? 'graphite',
        (context.globals.theme as string | undefined) || 'light'
      );
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
