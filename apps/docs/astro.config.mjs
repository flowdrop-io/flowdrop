// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';
import { remarkMermaid } from './src/plugins/remark-mermaid.mjs';

// Stub module path for optional CodeMirror peer deps (not needed in docs demos)
const cmStub = new URL('./src/stubs/codemirror.ts', import.meta.url).pathname;

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [remarkMermaid],
	},
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
				},
				{
					icon: 'github',
					label: 'Discussions',
					href: 'https://github.com/flowdrop-io/flowdrop/discussions'
				}
			],
			customCss: [
				'@fontsource-variable/inter',
				'./src/styles/tokens.css',
				'./src/styles/theme.css',
				'./src/styles/demo.css',
				'./src/styles/diagrams.css',
			],
			components: {
				ThemeProvider: './src/components/ThemeProvider.astro',
				Head: './src/components/Head.astro',
			},
			expressiveCode: {
				styleOverrides: {
					borderRadius: '0.5rem',
				},
			},
			sidebar: [
				{
					label: 'Concepts',
					items: [
						{ label: 'What is a Workflow?', slug: 'concepts/what-is-a-workflow' },
						{ label: 'Architecture Overview', slug: 'concepts/architecture-overview' },
						{ label: 'Glossary', slug: 'concepts/glossary' }
					]
				},
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
						{
							label: 'Editor',
							items: [
								{ label: 'Creating Workflows', slug: 'guides/creating-workflows' },
								{ label: 'Node Types', slug: 'guides/node-types' },
								{ label: 'Theming', slug: 'guides/theming' },
								{ label: 'Interactive Playground', slug: 'guides/playground' },
								{ label: 'Human-in-the-Loop', slug: 'guides/interrupts' }
							]
						},
						{
							label: 'Extending',
							items: [
								{ label: 'Custom Nodes', slug: 'guides/custom-nodes' },
								{ label: 'Custom Form Fields', slug: 'guides/custom-form-fields' }
							]
						},
						{
							label: 'Integration',
							items: [
								{ label: 'Framework Integration', slug: 'guides/integration' },
								{ label: 'Backend Implementation', slug: 'guides/integration/backend-implementation' },
								{ label: 'Authentication Patterns', slug: 'guides/integration/authentication-patterns' },
								{ label: 'Deployment', slug: 'guides/integration/deployment' }
							]
						},
						{
							label: 'Advanced',
							items: [
								{ label: 'Event System', slug: 'guides/advanced/event-system' },
								{ label: 'Store System', slug: 'guides/advanced/store-system' },
								{ label: 'Programmatic API', slug: 'guides/advanced/programmatic-api' },
								{ label: 'Template Variables', slug: 'guides/advanced/template-variables' },
								{ label: 'Agent Spec', slug: 'guides/advanced/agent-spec' },
								{ label: 'Performance', slug: 'guides/performance' },
								{ label: 'Testing', slug: 'guides/testing' }
							]
						},
						{
							label: 'Data Model',
							items: [
								{ label: 'Workflow Structure', slug: 'guides/workflow-json' },
								{ label: 'Node Structure', slug: 'guides/node-json' },
								{ label: 'Edge Structure', slug: 'guides/edge-json' },
								{ label: 'Port System & Data Types', slug: 'guides/port-system' },
								{ label: 'Configuration Schema', slug: 'guides/config-schema' }
							]
						}
					]
				},
				{
					label: 'Recipes',
					items: [
						{ label: 'Backend: Express.js', slug: 'recipes/backend-express' },
						{ label: 'AI Agent Workflow', slug: 'recipes/ai-agent-workflow' },
						{ label: 'Conditional Branching', slug: 'recipes/conditional-branching' },
						{ label: 'Auto-Save & Drafts', slug: 'recipes/auto-save-and-drafts' },
						{ label: 'Undo & Redo', slug: 'recipes/undo-redo' }
					]
				},
				{
					label: 'Reference',
					items: [
						{ label: 'API Overview', slug: 'reference/api-overview' },
						{ label: 'Mount API', slug: 'reference/mount-api' },
						{ label: 'Core Types', slug: 'reference/types' },
						{ label: 'Components', slug: 'reference/components' },
						{ label: 'Event Handlers', slug: 'reference/event-handlers' },
						{ label: 'Stores', slug: 'reference/stores' },
						{ label: 'CSS Design Tokens', slug: 'reference/css-tokens' },
						{ label: 'Icons', slug: 'reference/icons' },
						{ label: 'Error Reference', slug: 'reference/errors' },
						{ label: 'OpenAPI Spec', slug: 'reference/openapi' },
						{ label: 'Changelog & Migration', slug: 'reference/migration' }
					]
				},
				{
					label: 'Troubleshooting',
					items: [
						{ label: 'Common Issues & FAQ', slug: 'troubleshooting/common-issues' }
					]
				}
			]
		}),
		svelte()
	]
});
