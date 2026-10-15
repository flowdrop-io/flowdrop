import type { StorybookConfig } from '@storybook/sveltekit';
import remarkGfm from 'remark-gfm';
import { componentDescriptions } from './componentDescriptions.ts';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
  addons: [
    '@storybook/addon-svelte-csf',
    '@chromatic-com/storybook',
    {
      // GitHub-style tables in the MDX pages; MDX 3 does not parse them on its own.
      name: '@storybook/addon-docs',
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } }
    },
    '@storybook/addon-vitest',
    '@storybook/addon-themes',
    'storybook-addon-tag-badges'
  ],
  framework: {
    name: '@storybook/sveltekit',
    options: {}
  },
  features: {
    // Storybook's own "Become an expert" checklist; it crowds our sidebar.
    sidebarOnboardingChecklist: false
  },
  async viteFinal(viteConfig) {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), componentDescriptions()];
    return viteConfig;
  }
};
export default config;
