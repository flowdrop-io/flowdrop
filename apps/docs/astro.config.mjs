// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';

// Stub module path for optional CodeMirror peer deps (not needed in docs demos)
const cmStub = new URL('./src/stubs/codemirror.ts', import.meta.url).pathname;

// https://astro.build/config
export default defineConfig({
	vite: {
		resolve: {
			alias: {
				'@codemirror/lang-markdown': cmStub,
				'@codemirror/lang-json': cmStub,
				'@codemirror/autocomplete': cmStub,
				'@codemirror/commands': cmStub,
				'@codemirror/language': cmStub,
				'@codemirror/lint': cmStub,
				'@codemirror/state': cmStub,
				'@codemirror/theme-one-dark': cmStub,
				'@codemirror/view': cmStub,
				'codemirror': cmStub,
			}
		}
	},
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
				'./src/styles/demo.css',
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
					label: 'Tutorial',
					items: [
						{ label: '1. Embedding the Editor', slug: 'tutorial/01-embedding-the-editor' },
						{ label: '2. Configuring Endpoints', slug: 'tutorial/02-configuring-endpoints' },
						{ label: '3. Your First Node', slug: 'tutorial/03-your-first-node' },
						{ label: '4. Nodes & Categories', slug: 'tutorial/04-multiple-nodes-and-categories' },
						{ label: '5. Saving Workflows', slug: 'tutorial/05-saving-workflows' }
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
						{ label: 'Icons', slug: 'reference/icons' },
						{ label: 'Migration Guide', slug: 'reference/migration' }
					]
				}
			]
		}),
		svelte()
	]
});
