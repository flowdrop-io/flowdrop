// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'FlowDrop',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/flowdrop-io/flowdrop'
				}
			],
			customCss: [
				'@fontsource-variable/inter',
				'./src/styles/tokens.css',
				'./src/styles/theme.css',
			],
			components: {
				ThemeProvider: './src/components/ThemeProvider.astro',
			},
			expressiveCode: {
				styleOverrides: {
					borderRadius: '0.5rem',
				},
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' }
					]
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Creating Workflows', slug: 'guides/creating-workflows' },
						{ label: 'Node Types', slug: 'guides/node-types' },
						{ label: 'Framework Integration', slug: 'guides/integration' },
						{ label: 'Configuration Forms', slug: 'guides/config-schema' },
						{ label: 'Theming', slug: 'guides/theming' },
						{ label: 'Interactive Playground', slug: 'guides/playground' },
						{ label: 'Human-in-the-Loop', slug: 'guides/interrupts' },
						{ label: 'Custom Nodes', slug: 'guides/custom-nodes' },
						{ label: 'Custom Form Fields', slug: 'guides/custom-form-fields' }
					]
				},
				{
					label: 'Reference',
					items: [
						{ label: 'API Overview', slug: 'reference/api-overview' },
						{ label: 'Mount API', slug: 'reference/mount-api' },
						{ label: 'Core Types', slug: 'reference/types' },
						{ label: 'Components', slug: 'reference/components' },
						{ label: 'Migration Guide', slug: 'reference/migration' }
					]
				}
			]
		}),
		svelte()
	]
});
