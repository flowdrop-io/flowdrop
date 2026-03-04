import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
	addons: [
		'@storybook/addon-svelte-csf',
		'@chromatic-com/storybook',
		'@storybook/addon-docs',
		'@storybook/addon-vitest',
		'storybook-addon-tag-badges'
	],
	framework: {
		name: '@storybook/sveltekit',
		options: {}
	}
};
export default config;
